import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { starterHouse } from '../src/data/house';
import { NEIGHBORS, NEIGHBOR_TIES } from '../src/data/neighbors';
import { TOWN } from '../src/data/town';
import {
  NEW_FAMILY_FUNDS,
  Sim,
  TOWN_HOUR,
  activeFamily,
  activeLot,
  buildHome,
  buildNav,
  createWorld,
  deserialize,
  familyById,
  foundTown,
  hasHouse,
  leaveProblem,
  lotPrice,
  lotStatus,
  makeFolk,
  membersOf,
  relationOf,
  salePrice,
  serialize,
  useTiles,
} from '../src/sim';
import type { FamilyDraft, World } from '../src/sim';
import { reachable } from '../src/sim/economy';
import { run } from './helpers';
import { play } from './helpers/player';

const CTX = { neighbors: NEIGHBORS, ties: NEIGHBOR_TIES, catalog: CATALOG, town: TOWN };

function townSim(seed = 3): Sim {
  const world = createWorld(starterHouse(seed));
  foundTown(world, CATALOG, TOWN);
  return new Sim(CATALOG, world);
}

const byName = (w: World, name: string) => w.neighbors.find((n) => n.name === name) ?? w.folks.find((f) => f.name === name);

function lotOfFamily(w: World, name: string) {
  const fam = w.town!.families.find((f) => f.name === name)!;
  return { fam, lot: w.town!.lots.find((l) => l.id === fam.lotId)! };
}

describe('bloco 15: bairro', () => {
  it('o jogo novo vira um bairro de dez lotes com a casa em jogo no número 5', () => {
    const w = townSim().world;
    const town = w.town!;
    expect(town.lots).toHaveLength(10);
    expect(activeLot(w)?.number).toBe(5);
    expect(activeFamily(w)?.name).toBe('Varanda');
    const status = town.lots.map((l) => lotStatus(w, l));
    expect(status.filter((s) => s === 'active')).toHaveLength(1);
    expect(status.filter((s) => s === 'family')).toHaveLength(6);
    expect(status.filter((s) => s === 'forSale')).toHaveLength(1);
    expect(status.filter((s) => s === 'vacant')).toHaveLength(2);
    // vizinhos de verdade moram nas casas; chefes e prestadores, fora do bairro
    expect(byName(w, 'Dora Alpendre')).toMatchObject({ home: lotOfFamily(w, 'Alpendre').fam.id });
    expect((byName(w, 'Hermínia Cumeeira') as { home?: number }).home).toBeUndefined();
    expect((byName(w, 'Zeca Soleira') as { home?: number }).home).toBeUndefined();
    // quem mora junto já é amigo
    const dora = byName(w, 'Dora Alpendre')!;
    const rita = byName(w, 'Rita Vidraça')!;
    expect(relationOf(w, dora.id, rita.id)!.friendship).toBeGreaterThanOrEqual(35);
  });

  it('as casas prontas têm cada móvel no lugar da planta e todos alcançáveis da calçada', () => {
    const w = createWorld(starterHouse(1));
    for (const [id, plan] of Object.entries(TOWN.houses)) {
      const { home, misplaced } = buildHome(w, CATALOG, plan);
      expect(misplaced, id).toEqual([]);
      const probe = makeFolk(-1, { name: '', traits: [], x: plan.exit.x, y: plan.exit.y });
      const room: World = { ...w, grid: home.grid, objects: home.objects, folks: [probe], exit: plan.exit };
      const nav = buildNav(room, CATALOG);
      const reach = reachable(nav, probe);
      for (const o of home.objects) {
        const def = CATALOG.objects[o.defId];
        if (!def.interactions.length) continue;
        const uses = useTiles(room, nav, o, def);
        expect(
          uses.some((u) => reach.has(u.y * home.grid.w + u.x)),
          `${id}: ${o.defId} em ${o.x},${o.y}`,
        ).toBe(true);
      }
    }
  });

  it('troca de família e volta: cada uma guarda casa, dinheiro e gente', () => {
    const sim = townSim();
    const w = sim.world;
    const tome = w.folks.find((f) => f.name === 'Tomé Varanda')!;
    tome.skills.cooking = 777;
    const funds = w.household.funds;
    const home = w.grid;
    const { fam: alp, lot } = lotOfFamily(w, 'Alpendre');
    expect(sim.dispatch({ type: 'playFamily', familyId: alp.id })).toBe(true);
    expect(w.town!.active).toBe(alp.id);
    expect(w.folks.map((f) => f.name).sort()).toEqual(['Dora Alpendre', 'Rita Vidraça']);
    expect(w.folks.every((f) => !f.visit)).toBe(true);
    expect(w.household.funds).toBe(1800);
    expect(activeLot(w)?.id).toBe(lot.id);
    // a Dora trouxe o emprego
    expect(w.folks.find((f) => f.name === 'Dora Alpendre')!.job?.careerId).toBe('kitchen');
    // os Varanda viraram vizinhos com casa no bairro
    const tomeN = w.neighbors.find((n) => n.id === tome.id)!;
    expect(tomeN.home).toBe(1);
    expect(tomeN.skills.cooking).toBe(777);
    expect(lotStatus(w, w.town!.lots[2])).toBe('family');
    // anda um pouco e volta
    run(sim, 120);
    w.household.funds = 999;
    expect(sim.dispatch({ type: 'playFamily', familyId: 1 })).toBe(true);
    expect(w.grid).toBe(home);
    expect(w.household.funds).toBe(funds);
    expect(w.folks.some((f) => f.id === tome.id && f.skills.cooking === 777)).toBe(true);
    expect(familyById(w, alp.id)!.funds).toBe(999);
    expect(w.neighbors.find((n) => n.name === 'Dora Alpendre')?.home).toBe(alp.id);
    // mesma família de novo: recusa
    expect(sim.dispatch({ type: 'playFamily', familyId: 1 })).toBe(false);
    expect(sim.lastProblem).toBe('sameFamily');
  });

  it('com fogo no lote não dá para trocar de família', () => {
    const sim = townSim();
    sim.world.fires.push({ id: 1, x: 5, y: 5, started: sim.world.tick, heat: 50 } as never);
    expect(sim.dispatch({ type: 'playFamily', familyId: 2 })).toBe(false);
    expect(sim.lastProblem).toBe('busyLot');
  });

  it('mudança: vende a casa, compra o terreno vago e a casa velha fica à venda', () => {
    const sim = townSim();
    const w = sim.world;
    const vacant = w.town!.lots.find((l) => l.number === 9)!;
    const old = activeLot(w)!;
    const sale = salePrice(w, CATALOG);
    const price = lotPrice(w, CATALOG, vacant);
    const funds = w.household.funds;
    expect(price).toBe(vacant.land);
    expect(sim.dispatch({ type: 'moveHouse', lotId: vacant.id })).toBe(true);
    expect(activeLot(w)?.id).toBe(vacant.id);
    expect(w.household.funds).toBe(funds + sale - price);
    expect(hasHouse({ grid: w.grid, objects: w.objects, exit: w.exit })).toBe(false);
    expect(lotStatus(w, old)).toBe('forSale');
    expect(old.home!.objects.every((o) => CATALOG.objects[o.defId].price === 0)).toBe(true);
    // todo mundo em pé num tile livre do terreno novo
    const nav = buildNav(w, CATALOG);
    for (const f of w.folks) expect(nav.isFree(f.x, f.y)).toBe(true);
    run(sim, 60);
    // e dá para voltar a comprar a casa velha (agora vazia)
    expect(sim.dispatch({ type: 'moveHouse', lotId: old.id })).toBe(true);
    expect(hasHouse({ grid: w.grid, objects: w.objects, exit: w.exit })).toBe(true);
  });

  it('mudança sem dinheiro é recusada; lote ocupado também', () => {
    const sim = townSim();
    const w = sim.world;
    w.household.funds = -50_000;
    const forSale = w.town!.lots.find((l) => l.number === 6)!;
    expect(sim.dispatch({ type: 'moveHouse', lotId: forSale.id })).toBe(false);
    expect(sim.lastProblem).toBe('cantAfford');
    w.household.funds = 50_000;
    expect(sim.dispatch({ type: 'moveHouse', lotId: lotOfFamily(w, 'Alpendre').lot.id })).toBe(false);
    expect(sim.lastProblem).toBe('lotTaken');
  });

  it('família nova chega num lote vago e vira a jogada', () => {
    const sim = townSim();
    const w = sim.world;
    const lot = w.town!.lots.find((l) => l.number === 4)!;
    const draft: FamilyDraft = {
      surname: 'Goiabeira',
      members: [
        { name: 'Iara', look: { ...w.folks[0].look }, traits: ['gentil', 'caseiro', 'tagarela', 'romantico', 'ambicioso'], temper: { ...w.folks[0].temper }, month: w.folks[0].month },
        { name: 'Davi', look: { ...w.folks[1].look }, traits: ['agitado', 'artistico', 'coruja', 'festeiro', 'atletico'], temper: { ...w.folks[1].temper }, month: w.folks[1].month },
      ],
    };
    expect(sim.dispatch({ type: 'foundFamily', lotId: lot.id, draft })).toBe(true);
    const fam = activeFamily(w)!;
    expect(fam.name).toBe('Goiabeira');
    expect(fam.lotId).toBe(lot.id);
    expect(w.household.funds).toBe(NEW_FAMILY_FUNDS - lot.land);
    expect(w.folks.map((f) => f.name).sort()).toEqual(['Davi Goiabeira', 'Iara Goiabeira']);
    expect(membersOf(w, 1).map((m) => m.name).sort()).toEqual(['Lia Sacada', 'Tomé Varanda']);
    const [a, b] = w.folks;
    expect(relationOf(w, a.id, b.id)!.friendship).toBe(35);
    // a família de antes continua no bairro e dá para voltar a ela
    run(sim, 30);
    expect(sim.dispatch({ type: 'playFamily', familyId: 1 })).toBe(true);
    expect(w.folks.some((f) => f.name === 'Tomé Varanda')).toBe(true);
    // rascunho ruim é recusado
    expect(sim.dispatch({ type: 'foundFamily', lotId: w.town!.lots.find((l) => l.number === 9)!.id, draft: { surname: '', members: [] } })).toBe(false);
    expect(sim.lastProblem).toBe('badDraft');
  });

  it('vida resumida: salário nos dias de turno, gasto todo dia, amizade de casa sobe', () => {
    const sim = townSim();
    const w = sim.world;
    const { fam } = lotOfFamily(w, 'Pilastra');
    const joaquim = w.neighbors.find((n) => n.name === 'Joaquim Pilastra')!;
    const level = CATALOG.careers[joaquim.career!.id].levels[joaquim.career!.level];
    const { fam: tel } = lotOfFamily(w, 'Telhado');
    const caio = w.neighbors.find((n) => n.name === 'Caio Telhado')!;
    const nina = w.neighbors.find((n) => n.name === 'Nina Varal')!;
    const before = relationOf(w, caio.id, nina.id)!.friendship;
    const start = fam.funds;
    // dia 1 começa às 7h: roda até as 3h de sete dias depois
    const days = 7;
    play(sim, days * 1440 - 4 * 60 + TOWN_HOUR * 60 - w.tick % 1440 + 1);
    expect(fam.funds).not.toBe(start);
    // ganhou em cinco dos sete dias (no mínimo uma vez) e gastou
    const worked = level.days.length;
    expect(fam.funds).toBeGreaterThan(start + level.pay * Math.min(worked, 3) - 7 * 200);
    expect(relationOf(w, caio.id, nina.id)!.friendship).toBeGreaterThan(before);
    expect(tel.id).toBeGreaterThan(1);
    // ninguém da casa em jogo caiu por causa disso
    expect(w.folks.filter((f) => !f.visit).length).toBe(2);
  });

  it('visita do bairro chega pela calçada do lado da casa dela e volta para lá', () => {
    const sim = townSim();
    const w = sim.world;
    const dora = w.neighbors.find((n) => n.name === 'Dora Alpendre')!;
    const otto = w.neighbors.find((n) => n.name === 'Rosa Cancela')!;
    w.tick = Math.floor(w.tick / 1440) * 1440 + 10 * 60;
    w.pendingVisits.push({ neighborId: dora.id, at: w.tick + 1, hostId: w.folks[0].id });
    w.pendingVisits.push({ neighborId: otto.id, at: w.tick + 1, hostId: w.folks[0].id });
    sim.step();
    const d = w.folks.find((f) => f.id === dora.id)!;
    const r = w.folks.find((f) => f.id === otto.id)!;
    // número 1 fica a oeste (ponta x = 0); o 8, do outro lado da rua e a leste
    expect(d.x).toBe(0);
    expect(d.y).toBe(w.exit.y);
    expect(r.x).toBe(w.grid.w - 1);
    expect(sim.streetDoor(dora.id)).toEqual({ x: 0, y: w.exit.y });
  });

  it('quem casa e se muda leva a parte do dinheiro; a casa vazia fica à venda', () => {
    const sim = townSim();
    const w = sim.world;
    const { fam, lot } = lotOfFamily(w, 'Pilastra');
    const joaquim = w.neighbors.find((n) => n.name === 'Joaquim Pilastra')!;
    // chega de visita e se muda (como no "morar junto")
    w.pendingVisits.push({ neighborId: joaquim.id, at: w.tick + 1, hostId: w.folks[0].id });
    sim.step();
    const visitor = w.folks.find((f) => f.id === joaquim.id)!;
    const funds = w.household.funds;
    (sim as unknown as { moveIn(o: unknown, h: unknown): boolean }).moveIn(visitor, w.folks[0]);
    expect(w.household.funds).toBe(funds + 4200);
    expect(w.town!.families.some((f) => f.id === fam.id)).toBe(false);
    expect(lotStatus(w, lot)).toBe('forSale');
    expect(w.town!.feed.at(-1)?.key).toBe('feed.emptyHouse');
  });

  it('save antigo (v18) vira um bairro com a casa de agora; ida e volta guarda tudo', () => {
    const old = createWorld(starterHouse(9));
    const raw = JSON.parse(JSON.stringify({ version: 18, savedAt: 1, world: old })) as { world: Record<string, unknown> };
    delete raw.world.town;
    const loaded = deserialize(raw, CTX).world;
    expect(loaded.town?.lots).toHaveLength(10);
    expect(activeLot(loaded)?.number).toBe(5);
    expect(loaded.folks.map((f) => f.name)).toEqual(old.folks.map((f) => f.name));
    // sem a planta, o save segue só com a casa
    expect(deserialize(JSON.parse(JSON.stringify(raw)), { neighbors: [] }).world.town).toBeNull();
    // trocar, salvar e carregar mantém as duas famílias
    const sim = new Sim(CATALOG, loaded);
    expect(sim.dispatch({ type: 'playFamily', familyId: lotOfFamily(loaded, 'Mirante').fam.id })).toBe(true);
    const back = new Sim(CATALOG, deserialize(serialize(sim.world, 2), CTX).world);
    expect(activeFamily(back.world)?.name).toBe('Mirante');
    expect(familyById(back.world, 1)?.stash?.folks.map((f) => f.name).sort()).toEqual(['Lia Sacada', 'Tomé Varanda']);
    expect(back.dispatch({ type: 'playFamily', familyId: 1 })).toBe(true);
    expect(back.world.folks.map((f) => f.name).sort()).toEqual(['Lia Sacada', 'Tomé Varanda']);
  });

  it('sete dias no bairro, trocando de família no meio, sem colapso', () => {
    const sim = townSim(11);
    const w = sim.world;
    play(sim, 3 * 1440);
    for (let i = 0; i < 480 && leaveProblem(w); i++) play(sim, 1);
    const other = lotOfFamily(w, 'Telhado').fam;
    expect(sim.dispatch({ type: 'playFamily', familyId: other.id })).toBe(true);
    play(sim, 2 * 1440);
    // com fogo, festa ou alguém caído, a troca espera o lote acalmar (como na tela)
    for (let i = 0; i < 480 && leaveProblem(w); i++) play(sim, 1);
    expect(sim.dispatch({ type: 'playFamily', familyId: 1 })).toBe(true);
    play(sim, 2 * 1440);
    const home = w.folks.filter((f) => !f.visit);
    expect(home.length).toBeGreaterThan(0);
    for (const f of home) expect(f.needs.hunger).toBeGreaterThan(0);
    expect(w.town!.families.length).toBeGreaterThanOrEqual(7);
  });
});
