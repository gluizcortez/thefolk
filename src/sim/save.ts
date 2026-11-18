import { relKey } from './relations';
import type { Catalog, Grid, Neighbor, Vec, World, WorldObject } from './types';
import { checkPlacement } from './economy';
import { savingsOf } from './marriage';
import { footprint, objectSize, storied } from './grid';
import { computeRooms, lightsIn } from './rooms';
import { START_PANTRY } from './services';
import type { NeighborSeed, RelationSeed } from './world';
import { freshState } from './upkeep';
import { freshPlant } from './garden';
import { NEUTRAL_TEMPER, fullLook, monthFor, temperFromTraits } from './temper';
import { seedInterests } from './topics';
import { foundTown } from './town';
import type { TownPlan } from './town';
import { firstBillAfter, freshHousehold, seedNeighbors, seedRelations, seedWorkplaceTies } from './world';

/** Aumente ao mudar o formato do World e registre a migração abaixo. */
export const SAVE_VERSION = 21;

/** Dados de fora do núcleo que uma migração pode precisar (vêm de data/). */
export interface MigrationContext {
  /** vizinhos que passam a existir em saves antigos */
  neighbors: NeighborSeed[];
  /** quem já se conhece na vizinhança (só entra onde ainda não há relação) */
  ties?: RelationSeed[];
  /** catálogo, para a migração achar lugar para objetos novos (caixa de correio) */
  catalog?: Catalog;
  /** bloco 15: planta do bairro (sem ela, o save antigo segue só com a casa) */
  town?: TownPlan;
}

/** Dinheiro e saída da casa para saves da fatia 1 (só existia a casa pronta). */
export const V1_DEFAULTS = { funds: 1500, exit: { x: 7, y: 13 } };

export interface SaveFile {
  version: number;
  savedAt: number;
  world: World;
}

type Migration = (data: Record<string, unknown>, ctx: MigrationContext) => Record<string, unknown>;

type Obj = Record<string, unknown>;

/** migrations[n] leva um save da versão n para a n+1. */
const migrations: Record<number, Migration> = {
  // fatia 2: dinheiro, contas, habilidades, emprego e objetos girados
  1: (save) => {
    const world = { ...(save.world as Obj) };
    const tick = typeof world.tick === 'number' ? world.tick : 0;
    world.objects = ((world.objects as Obj[]) ?? []).map((o) => ({ rot: 0, paid: 0, ...o }));
    world.folks = ((world.folks as Obj[]) ?? []).map((f) => ({ skills: {}, job: null, away: null, ...f }));
    world.household = { funds: V1_DEFAULTS.funds, nextBills: firstBillAfter(tick), lastBill: 0 };
    world.exit = { ...V1_DEFAULTS.exit };
    return { ...save, world };
  },
  // fatia 3: visitas, vizinhança e relações. A casa continua com os moradores
  // que tinha; os vizinhos chegam com ids novos.
  2: (save, ctx) => {
    const world = { ...(save.world as Obj) };
    const tick = typeof world.tick === 'number' ? world.tick : 0;
    const nextId = typeof world.nextId === 'number' ? world.nextId : 1000;
    world.folks = ((world.folks as Obj[]) ?? []).map((f) => ({ visit: null, ...f }));
    world.neighbors = seedNeighbors(ctx.neighbors, nextId);
    world.nextId = nextId + ctx.neighbors.length;
    world.relations = {};
    world.pendingVisits = [];
    world.lastDropIn = tick;
    return { ...save, world };
  },
  // fatia 4: modo construção. Janelas passam a ser bordas de verdade (antes
  // eram só enfeite, desenhadas pela tela em parte das paredes de fora) e as
  // faces de parede ganham revestimento próprio.
  3: (save) => {
    const world = { ...(save.world as Obj) };
    const grid = { ...(world.grid as Obj) } as unknown as Grid;
    grid.edges = { ...grid.edges };
    for (const key of legacyWindows(grid)) grid.edges[key] = 'window';
    grid.coverings = {};
    world.grid = grid;
    return { ...save, world };
  },
  // fatia 5: chefes e colegas de verdade, eventos do expediente, aumento,
  // frilas, negócio próprio, fofoca e reputação. Quem já existia continua
  // igual; os vizinhos novos (chefes) chegam com ids novos.
  4: (save, ctx) => {
    const world = { ...(save.world as Obj) } as unknown as World;
    world.folks = (world.folks ?? []).map((f) => ({
      ...f,
      gig: f.gig ?? null,
      business: f.business ?? null,
      job: f.job
        ? { ...f.job, raise: f.job.raise ?? 0, raisePending: f.job.raisePending ?? false, lastRaiseDay: f.job.lastRaiseDay ?? -99 }
        : null,
      away: f.away ? { ...f.away, event: f.away.event ?? null, nextEvent: f.away.nextEvent ?? -1 } : null,
    }));
    const neighbors: Neighbor[] = [...(world.neighbors ?? [])];
    const missing = ctx.neighbors.filter(
      (seed) => !neighbors.some((n) => n.name === seed.name) && !world.folks.some((f) => f.name === seed.name),
    );
    neighbors.push(...seedNeighbors(missing, world.nextId));
    world.nextId += missing.length;
    world.neighbors = neighbors;
    world.relations = { ...(world.relations ?? {}) };
    world.news = [];
    world.reputation = {};
    world.gigBoard = [];
    // laços da vizinhança só onde ainda não havia relação
    const nameToId = (name: string) =>
      world.folks.find((f) => f.name === name)?.id ?? world.neighbors.find((n) => n.name === name)?.id;
    const fresh = (ctx.ties ?? []).filter((t) => {
      const a = nameToId(t.a);
      const b = nameToId(t.b);
      return a !== undefined && b !== undefined && !(relKey(a, b) in world.relations);
    });
    seedRelations(world, fresh);
    seedWorkplaceTies(world);
    return { ...save, world: world as unknown as Obj };
  },
  // bloco 1, casa viva: objetos ganham sujeira, desgaste e conserto; a casa
  // ganha bagunça solta. Tudo começa limpo e inteiro.
  5: (save) => {
    const world = { ...(save.world as Obj) };
    world.objects = ((world.objects as Obj[]) ?? []).map((o) => ({ ...o, state: (o.state as object) ?? freshState() }));
    world.mess = [];
    return { ...save, world };
  },
  // bloco 2: despensa, correio, contas em carta, pedidos por telefone,
  // jornal e campainha. Quem já está de visita conta como já tendo entrado;
  // os prestadores de serviço chegam como vizinhos novos; a caixa de correio
  // aparece na calçada se houver lugar.
  6: (save, ctx) => {
    const world = { ...(save.world as Obj) } as unknown as World;
    const old = world.household as unknown as Record<string, unknown>;
    world.household = { ...freshHousehold(START_PANTRY), ...(old as object), ...pickHousehold(old) } as World['household'];
    world.folks = (world.folks ?? []).map((f) =>
      f.visit ? { ...f, visit: { ...f.visit, admitted: true, rang: -1, service: null } } : f,
    );
    world.mess = [...(world.mess ?? [])];
    addMissingNeighbors(world, ctx);
    if (ctx.catalog) placeMailbox(world, ctx.catalog);
    return { ...save, world: world as unknown as Obj };
  },
  // bloco 3: cômodos, luz e enfeites. As luminárias começam apagadas; os
  // quadros e o relógio que a tela pendurava sozinha viram objetos nos mesmos
  // lugares, o tapete da frente do sofá também, e cada cômodo sem nenhuma
  // luminária ganha uma luz de teto (para a casa antiga não ficar no breu).
  7: (save, ctx) => {
    const world = { ...(save.world as Obj) } as unknown as World;
    world.household = { ...world.household, lightMinutes: 0 };
    world.objects = [...(world.objects ?? [])];
    if (ctx.catalog) {
      hangLegacyPictures(world, ctx.catalog);
      laySofaRugs(world, ctx.catalog);
      lightDarkRooms(world, ctx.catalog);
    }
    return { ...save, world: world as unknown as Obj };
  },
  // bloco 4: depreciação e objetos queridos. O que já estava na casa conta
  // como usado (sem data de compra) e começa sem histórico de uso; cores
  // ficam na padrão de cada objeto.
  8: (save) => {
    const world = { ...(save.world as Obj) } as unknown as World;
    world.objects = (world.objects ?? []).map((o) => ({ used: 0, uses: {}, ...o }));
    return { ...save, world: world as unknown as Obj };
  },
  // bloco 5: temperamento em cinco eixos (coerente com os traços), mês de
  // nascimento, corpo, rosto, corte de cabelo e roupas por ocasião
  9: (save, ctx) => {
    const world = { ...(save.world as Obj) } as unknown as World;
    const born = (traits: string[] | undefined) => {
      const temper = ctx.catalog ? temperFromTraits(ctx.catalog, traits ?? []) : { ...NEUTRAL_TEMPER };
      return { temper, month: ctx.catalog ? monthFor(ctx.catalog, temper) : 0 };
    };
    world.folks = (world.folks ?? []).map((f) => Object.assign({ ...born(f.traits), outfit: 'day', habits: {} }, f, { look: fullLook(f.look) }));
    world.neighbors = (world.neighbors ?? []).map((n) => ({ ...born(n.traits), ...n, look: fullLook(n.look) }));
    return { ...save, world: world as unknown as Obj };
  },
  // bloco 6: balão, desejos do dia (sorteados no primeiro minuto), ânimo,
  // dia inspirado e despertador (ligado para quem mora na casa)
  10: (save) => {
    const world = { ...(save.world as Obj) };
    world.folks = ((world.folks as Obj[]) ?? []).map((f) => ({
      thought: null,
      wishes: [],
      wishDay: -1,
      spark: 0,
      inspired: 0,
      alarm: f.visit === null || f.visit === undefined,
      ...f,
    }));
    return { ...save, world };
  },
  // bloco 8: carreiras de 10 cargos (o cargo antigo n vira 2n), recompensas
  // de carreira, chefes das carreiras novas e consequências do expediente
  11: (save, ctx) => {
    const world = { ...(save.world as Obj) } as unknown as World;
    const twice = (level: number) => Math.min(CAREER_LEVELS_V12 - 1, Math.max(0, Math.round(level)) * 2);
    world.household = { ...world.household, unlocked: [...(world.household?.unlocked ?? [])] };
    world.folks = (world.folks ?? []).map((f) => (f.job ? { ...f, job: { ...f.job, level: twice(f.job.level), chain: null } } : f));
    world.neighbors = (world.neighbors ?? []).map((n) => (n.career ? { ...n, career: { ...n.career, level: twice(n.career.level) } } : n));
    const before = new Set(world.neighbors.map((n) => n.career?.id).filter((x): x is string => !!x));
    addMissingNeighbors(world, ctx);
    const fresh = new Set(world.neighbors.map((n) => n.career?.id).filter((x): x is string => !!x && !before.has(x)));
    seedWorkplaceTies(world, fresh);
    return { ...save, world: world as unknown as Obj };
  },
  // bloco 9: gosto por assunto de cada pessoa (pelo temperamento, traços e
  // habilidades), rodas de conversa, festa, telefone tocando
  12: (save, ctx) => {
    const world = { ...(save.world as Obj) } as unknown as World;
    const seed = <T extends Parameters<typeof seedInterests>[1]>(p: T): T =>
      p.interests || !ctx.catalog ? p : { ...p, interests: seedInterests(ctx.catalog, p) };
    world.folks = (world.folks ?? []).map((f) => seed(f));
    world.neighbors = (world.neighbors ?? []).map((n) => seed(n));
    world.circles = [];
    world.party = null;
    world.lastParty = null;
    world.call = null;
    return { ...save, world: world as unknown as Obj };
  },
  // bloco 10: noivado, casamento e mudanças. Os vizinhos ganham economias
  // (que entram no caixa quando alguém se muda); namoros continuam namoros.
  13: (save) => {
    const world = { ...(save.world as Obj) } as unknown as World;
    world.neighbors = (world.neighbors ?? []).map((n) => ({ ...n, funds: savingsOf(n) }));
    return { ...save, world: world as unknown as Obj };
  },
  // bloco 11: bebês, crianças e escola. Ninguém da casa vira criança; a casa
  // ganha o campo do bebê a caminho e o bairro, a visitadora social.
  14: (save, ctx) => {
    const world = { ...(save.world as Obj) } as unknown as World;
    world.household = { ...world.household, expecting: world.household?.expecting ?? null };
    addMissingNeighbors(world, ctx);
    return { ...save, world: world as unknown as Obj };
  },
  // bloco 12: andares, escadas, colunas e telhado. O térreo fica igual (as
  // linhas dele não mudam); os andares de cima chegam sem piso e o telhado,
  // de quatro águas e telha de barro.
  15: (save) => {
    const world = { ...(save.world as Obj) } as unknown as World;
    world.grid = storied(world.grid);
    return { ...save, world: world as unknown as Obj };
  },
  // bloco 13: quintal. A casa ganha o campo do jardineiro (não contratado) e
  // o bairro, o Tião; os vasos que já existiam viram plantas vivas, adultas e
  // regadas; o dia começa sem chuva marcada.
  16: (save, ctx) => {
    const world = { ...(save.world as Obj) } as unknown as World;
    world.household = { ...world.household, gardener: world.household?.gardener ?? false };
    world.rain = world.rain ?? null;
    world.objects = (world.objects ?? []).map((o) => {
      const def = ctx.catalog?.objects[o.defId];
      return def?.plant && !o.plant ? { ...o, plant: freshPlant(def.plant, true) } : o;
    });
    addMissingNeighbors(world, ctx);
    return { ...save, world: world as unknown as Obj };
  },
  // bloco 14: perigos. Nada pegando fogo, ninguém caído nem assombrando; o
  // jogo antigo segue com morte ligada (como no jogo novo padrão) e o bairro
  // ganha os bombeiros, o policial, o gatuno e o Seu Sereno.
  17: (save, ctx) => {
    const world = { ...(save.world as Obj) } as unknown as World;
    world.fires = world.fires ?? [];
    world.help = world.help ?? { fire: 0, police: 0 };
    world.passings = world.passings ?? [];
    world.lastBargain = world.lastBargain ?? null;
    world.departed = world.departed ?? [];
    world.spirits = world.spirits ?? [];
    world.rules = world.rules ?? { death: true };
    world.lastBurglary = world.lastBurglary ?? world.tick;
    addMissingNeighbors(world, ctx);
    return { ...save, world: world as unknown as Obj };
  },
  // bloco 15: bairro. A casa de agora vira um lote da rua (o da família em
  // jogo) e os vizinhos passam a morar nas casas prontas em volta; quem já se
  // mudou para a casa fica onde está.
  18: (save, ctx) => {
    const world = { ...(save.world as Obj) } as unknown as World;
    world.town = null;
    if (ctx.town && ctx.catalog) foundTown(world, ctx.catalog, ctx.town);
    return { ...save, world: world as unknown as Obj };
  },
  // bloco 16: centro da cidade. Ninguém está passeando, não houve encontro
  // ainda e a cidade ganha a gente do centro e o garçom da cantina.
  19: (save, ctx) => {
    const world = { ...(save.world as Obj) } as unknown as World;
    world.outing = null;
    world.lastDate = null;
    addMissingNeighbors(world, ctx);
    return { ...save, world: world as unknown as Obj };
  },
  // bloco 17: gerações. O relógio da vida fica desligado nos saves antigos
  // (ninguém começa a envelhecer de surpresa); os pais dos bebês e crianças
  // passam a ficar para sempre, quem está na escola fica marcado como tal
  // e a casa ganha o álbum (vazio).
  20: (save) => {
    const world = { ...(save.world as Obj) } as unknown as World;
    world.rules = { ...(world.rules ?? { death: true }), life: 'off' };
    const fix = (f: World['folks'][number]) => {
      const parents = f.kid?.parents ?? [];
      const out = { ...f };
      if (parents.length && !out.parents) out.parents = [...parents];
      if (out.away && out.age === 'child') out.away = { ...out.away, school: true };
      return out;
    };
    world.folks = (world.folks ?? []).map(fix);
    if (world.outing?.home) world.outing = { ...world.outing, home: { ...world.outing.home, folks: world.outing.home.folks.map(fix) } };
    world.household = { ...world.household, album: world.household.album ?? [] };
    if (world.town) {
      world.town = {
        ...world.town,
        families: world.town.families.map((fam) =>
          fam.stash ? { ...fam, stash: { ...fam.stash, folks: fam.stash.folks.map(fix), household: { ...fam.stash.household, album: fam.stash.household.album ?? [] } } } : fam,
        ),
      };
    }
    return { ...save, world: world as unknown as Obj };
  },
};

/** Cargos por carreira a partir do save v12. */
const CAREER_LEVELS_V12 = 10;

function addFree(world: World, defId: string, x: number, y: number, rot: WorldObject['rot']): void {
  world.objects.push({ id: world.nextId++, defId, x, y, rot, paid: 0, state: freshState() });
}

/**
 * Onde a tela até o bloco 2 pendurava quadros: paredes (sem porta nem janela)
 * em que (5x + 3y + 2 se for borda oeste) é múltiplo de 4, do lado de dentro
 * sem móvel encostado. Na cozinha ia um relógio.
 */
export function legacyPictures(world: World, catalog: Catalog): { defId: string; x: number; y: number; rot: WorldObject['rot'] }[] {
  const grid = world.grid;
  const taken = new Set<string>();
  for (const o of world.objects) {
    const def = catalog.objects[o.defId];
    if (!def || def.layer) continue;
    for (const t of footprint(o, def)) taken.add(`${t.x},${t.y}`);
  }
  const indoor = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < grid.w && y < grid.h && catalog.floors[grid.floor[y * grid.w + x]]?.outdoor !== true;
  const out: { defId: string; x: number; y: number; rot: WorldObject['rot'] }[] = [];
  for (const [key, kind] of Object.entries(grid.edges)) {
    if (kind !== 'wall') continue;
    const [xs, ys, side] = key.split(',');
    const x = Number(xs);
    const y = Number(ys);
    const north = side === 'N';
    if ((x * 5 + y * 3 + (north ? 0 : 2)) % 4 !== 0) continue;
    const sides: [number, number, WorldObject['rot']][] = north
      ? [
          [x, y, 0],
          [x, y - 1, 2],
        ]
      : [
          [x, y, 1],
          [x - 1, y, 3],
        ];
    for (const [tx, ty, rot] of sides) {
      if (!indoor(tx, ty) || taken.has(`${tx},${ty}`)) continue;
      const kitchen = grid.floor[ty * grid.w + tx] === 'kitchen';
      out.push({ defId: kitchen ? 'wallclock' : 'painting', x: tx, y: ty, rot });
      break;
    }
  }
  return out;
}

function hangLegacyPictures(world: World, catalog: Catalog): void {
  for (const p of legacyPictures(world, catalog)) {
    if (!catalog.objects[p.defId]) continue;
    if (checkPlacement(world, catalog, p.defId, p.x, p.y, p.rot).ok) addFree(world, p.defId, p.x, p.y, p.rot);
  }
}

/** O tapete que vinha desenhado na frente de cada sofá vira um tapete grande. */
function laySofaRugs(world: World, catalog: Catalog): void {
  if (!catalog.objects.bigrug) return;
  const fronts: Vec[] = [
    { x: 0, y: 1 },
    { x: 1, y: 0 },
    { x: 0, y: -1 },
    { x: -1, y: 0 },
  ];
  for (const sofa of world.objects.filter((o) => o.defId === 'sofa')) {
    const f = fronts[sofa.rot];
    const rot: WorldObject['rot'] = sofa.rot % 2 === 0 ? 0 : 1;
    const size = objectSize(catalog.objects.bigrug, rot);
    // encostado na frente do sofá, centrado nele quando der
    const ax = f.x > 0 ? sofa.x + 1 : f.x < 0 ? sofa.x - size.w : sofa.x;
    const ay = f.y > 0 ? sofa.y + 1 : f.y < 0 ? sofa.y - size.h : sofa.y;
    const tries: Vec[] = f.x === 0 ? [{ x: ax, y: ay }, { x: ax - 1, y: ay }] : [{ x: ax, y: ay }, { x: ax, y: ay - 1 }];
    const spot = tries.find((p) => checkPlacement(world, catalog, 'bigrug', p.x, p.y, rot).ok);
    if (spot) addFree(world, 'bigrug', spot.x, spot.y, rot);
  }
}

/** Cômodo fechado sem nenhuma luminária ganha uma luz de teto perto do meio. */
function lightDarkRooms(world: World, catalog: Catalog): void {
  if (!catalog.objects.ceilinglamp) return;
  const map = computeRooms(world.grid, catalog);
  for (const room of map.rooms) {
    if (room.outdoor) continue;
    if (lightsIn(world, catalog, map, room).length > 0) continue;
    let sx = 0;
    let sy = 0;
    const tiles: Vec[] = [];
    for (let i = 0; i < map.of.length; i++) {
      if (map.of[i] !== room.id) continue;
      const t = { x: i % map.w, y: Math.floor(i / map.w) };
      tiles.push(t);
      sx += t.x;
      sy += t.y;
    }
    const cx = sx / tiles.length;
    const cy = sy / tiles.length;
    tiles.sort((a, b) => Math.hypot(a.x - cx, a.y - cy) - Math.hypot(b.x - cx, b.y - cy));
    const spot = tiles.find((t) => checkPlacement(world, catalog, 'ceilinglamp', t.x, t.y, 0).ok);
    if (spot) addFree(world, 'ceilinglamp', spot.x, spot.y, 0);
  }
}

/** Campos do bloco 2 que um save antigo não tem (os que já existem ficam). */
function pickHousehold(old: Record<string, unknown>): Partial<World['household']> {
  const fresh = freshHousehold(START_PANTRY);
  const out: Record<string, unknown> = {};
  for (const k of Object.keys(fresh)) out[k] = old[k] ?? (fresh as Record<string, unknown>)[k];
  return out as Partial<World['household']>;
}

/** Vizinhos da lista que o save ainda não conhece entram com ids novos. */
function addMissingNeighbors(world: World, ctx: MigrationContext): void {
  const neighbors: Neighbor[] = [...(world.neighbors ?? [])];
  const missing = ctx.neighbors.filter(
    (seed) => !neighbors.some((n) => n.name === seed.name) && !world.folks.some((f) => f.name === seed.name),
  );
  neighbors.push(...seedNeighbors(missing, world.nextId));
  world.nextId += missing.length;
  world.neighbors = neighbors;
  world.relations = { ...(world.relations ?? {}) };
  const nameToId = (name: string) => neighbors.find((n) => n.name === name)?.id;
  const names = new Set(missing.map((m) => m.name));
  const fresh = (ctx.ties ?? []).filter((t) => {
    if (!names.has(t.a) && !names.has(t.b)) return false;
    const a = nameToId(t.a);
    const b = nameToId(t.b);
    return a !== undefined && b !== undefined && !(relKey(a, b) in world.relations);
  });
  seedRelations(world, fresh);
}

/** Põe uma caixa de correio num tile livre perto da calçada (se couber). */
function placeMailbox(world: World, catalog: Catalog): void {
  if (!catalog.objects.mailbox || world.objects.some((o) => o.defId === 'mailbox')) return;
  const taken = new Set<string>();
  for (const o of world.objects) {
    const def = catalog.objects[o.defId];
    if (!def) continue;
    for (const t of footprint(o, def)) taken.add(`${t.x},${t.y}`);
  }
  const { x: ex, y: ey } = world.exit;
  const grid = world.grid;
  for (let r = 2; r <= 4; r++) {
    for (const [dx, dy] of [
      [-r, 0],
      [r, 0],
      [-r, -1],
      [r, -1],
    ]) {
      const x = ex + dx;
      const y = ey + dy;
      if (x < 0 || y < 0 || x >= grid.w || y >= grid.h || taken.has(`${x},${y}`)) continue;
      if (catalog.floors[grid.floor[y * grid.w + x]]?.outdoor !== true) continue;
      if (world.folks.some((f) => f.x === x && f.y === y)) continue;
      world.objects.push({
        id: world.nextId++,
        defId: 'mailbox',
        x,
        y,
        rot: 0,
        paid: 0,
        state: freshState(),
      });
      return;
    }
  }
}

/**
 * Onde a tela da fatia 3 desenhava janelas: paredes entre dentro e fora em
 * que (2x + y) é múltiplo de 3. A migração vira essas paredes em janelas para
 * a casa continuar com a mesma cara.
 */
export function legacyWindows(grid: Grid): string[] {
  const indoor = (x: number, y: number) =>
    x >= 0 && y >= 0 && x < grid.w && y < grid.h && grid.floor[y * grid.w + x] !== 'grass';
  const out: string[] = [];
  for (const [key, kind] of Object.entries(grid.edges)) {
    if (kind !== 'wall') continue;
    const [xs, ys, side] = key.split(',');
    const x = Number(xs);
    const y = Number(ys);
    const back = side === 'N' ? indoor(x, y - 1) : indoor(x - 1, y);
    if (indoor(x, y) !== back && (x * 2 + y) % 3 === 0) out.push(key);
  }
  return out;
}

export class SaveError extends Error {}

export function serialize(world: World, savedAt: number): SaveFile {
  return { version: SAVE_VERSION, savedAt, world: JSON.parse(JSON.stringify(world)) as World };
}

export function deserialize(raw: unknown, ctx: MigrationContext = { neighbors: [] }): SaveFile {
  if (typeof raw !== 'object' || raw === null) throw new SaveError('save inválido');
  let data = raw as Record<string, unknown>;
  let version = data.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    throw new SaveError('save sem versão');
  }
  if (version > SAVE_VERSION) throw new SaveError('save de uma versão mais nova do jogo');
  while (version < SAVE_VERSION) {
    const migrate = migrations[version];
    if (!migrate) throw new SaveError(`sem migração a partir da versão ${version}`);
    data = migrate(data, ctx);
    version++;
    data.version = version;
  }
  const world = data.world as World | undefined;
  if (
    !world ||
    typeof world.tick !== 'number' ||
    !world.grid ||
    !Array.isArray(world.objects) ||
    !Array.isArray(world.folks)
  ) {
    throw new SaveError('save corrompido');
  }
  return {
    version,
    savedAt: typeof data.savedAt === 'number' ? data.savedAt : 0,
    world: JSON.parse(JSON.stringify(world)) as World,
  };
}
