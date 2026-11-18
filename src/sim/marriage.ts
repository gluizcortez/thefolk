import { checkPlacement } from './economy';
import { relKey, relationOf, ensureRelation } from './relations';
import type { Bond, Catalog, Folk, Neighbor, Rotation, SurnameChoice, Vec, World, WorldObject } from './types';
import { freshState } from './upkeep';

// Bloco 10: vida a dois. Estágios do casal (namoro, noivado, casamento),
// aliança, sobrenome, economias de quem se muda e os móveis que vêm junto.
// Tudo puro: a Sim chama daqui e cuida do resto (fila, notícias, log).

/** Romance mínimo para pedir em casamento. */
export const PROPOSE_ROMANCE = 70;
/** Minutos depois do começo da festa em que a cerimônia começa. */
export const VOWS_AT = 40;
/** Até quantos minutos antes do fim da festa ainda dá para casar. */
export const VOWS_LAST_CALL = 30;
/** Pontos a mais na nota da festa de casamento que teve cerimônia (e com arco). */
export const WEDDING_BONUS = 10;
export const ARCH_BONUS = 6;
/** Parte do dinheiro da casa que vai com quem sai no divórcio. */
export const DIVORCE_SHARE = 0.5;
/** Romance esfria assim (fração do namoro) para quem é casado. */
export const MARRIED_COOL = 0.6;

/** Estágio do casal `a`-`b`, ou null se não namoram. */
export function bondOf(world: World, a: number, b: number): Bond | null {
  const rel = relationOf(world, a, b);
  if (!rel?.dating) return null;
  return rel.bond ?? 'dating';
}

/** Muda o estágio nos dois sentidos (o namoro continua valendo). */
export function setBond(world: World, a: number, b: number, bond: 'engaged' | 'married' | null): void {
  ensureRelation(world, a, b);
  for (const k of [relKey(a, b), relKey(b, a)]) {
    const rel = world.relations[k];
    if (bond) {
      rel.dating = true;
      rel.bond = bond;
    } else delete rel.bond;
  }
}

/** Com quem `id` está casado (0 = ninguém). */
export function spouseOf(world: World, id: number): number {
  return partnerWith(world, id, 'married');
}

/** Com quem `id` está noivo (0 = ninguém). */
export function fianceOf(world: World, id: number): number {
  return partnerWith(world, id, 'engaged');
}

function partnerWith(world: World, id: number, bond: 'engaged' | 'married'): number {
  const prefix = `${id}>`;
  for (const [k, rel] of Object.entries(world.relations)) {
    if (rel.dating && rel.bond === bond && k.startsWith(prefix)) return Number(k.slice(prefix.length));
  }
  return 0;
}

/** Usa aliança (noivo ou casado com alguém)? */
export function wearsRing(world: World, id: number): boolean {
  return spouseOf(world, id) !== 0 || fianceOf(world, id) !== 0;
}

/** Algum estojo de aliança na casa? */
export function ringOnLot(world: World, catalog: Catalog): WorldObject | undefined {
  return world.objects.find((o) => catalog.objects[o.defId]?.ring);
}

/** Primeiro nome. */
export function firstName(name: string): string {
  return name.split(' ')[0];
}

/** Sobrenome (tudo depois do primeiro nome; vazio se não tem). */
export function surname(name: string): string {
  const i = name.indexOf(' ');
  return i < 0 ? '' : name.slice(i + 1);
}

/** Nomes do casal depois do casamento, pela escolha de sobrenome. */
export function weddingNames(host: string, partner: string, choice: SurnameChoice): [string, string] {
  const sh = surname(host);
  const sp = surname(partner);
  const named = (n: string, s: string) => (s ? `${firstName(n)} ${s}` : firstName(n));
  if (choice === 'host') return [host, named(partner, sh)];
  if (choice === 'partner') return [named(host, sp), partner];
  if (choice === 'both') {
    // os dois sobrenomes juntos (sem repetir quando já são iguais)
    const both = sh === sp ? sh : [sh, sp].filter(Boolean).join(' ');
    return [named(host, both), named(partner, both)];
  }
  return [host, partner];
}

/** Economias de um vizinho: o que guardou, ou um palpite pelo cargo. */
export function savingsOf(n: Pick<Neighbor, 'id' | 'career' | 'funds'>): number {
  if (n.funds !== undefined) return n.funds;
  const level = n.career?.level ?? 0;
  return 300 + level * 140 + ((n.id * 37) % 5) * 80;
}

/** Habilidade com mais experiência (ou null se não treinou nada). */
function topSkill(skills: Record<string, number>): string | null {
  let best: string | null = null;
  let most = 0;
  for (const [id, xp] of Object.entries(skills)) {
    if (xp > most) {
      most = xp;
      best = id;
    }
  }
  return best;
}

/** O que cada um traz de casa, pela habilidade de que mais gosta. */
const BELONGINGS: Record<string, string> = {
  creativity: 'easel',
  logic: 'chessboard',
  fitness: 'punchbag',
  charisma: 'mirror',
  cooking: 'radio',
  handiness: 'workbench',
  tidiness: 'lamp',
};

/** Móveis que vêm na mudança (um pelo gosto, mais uma planta). */
export function belongingsOf(catalog: Catalog, n: Pick<Neighbor, 'skills' | 'traits'>): string[] {
  const top = topSkill(n.skills ?? {});
  const main = (top && BELONGINGS[top]) || (n.traits.includes('caseiro') ? 'armchaircheap' : 'bookcrate');
  return [main, 'plant'].filter((id) => !!catalog.objects[id]);
}

/**
 * Lugar livre perto de `near` para um objeto (tenta os quatro giros, de
 * dentro de casa para fora). Devolve null se não coube em lugar nenhum.
 */
export function spotNear(world: World, catalog: Catalog, defId: string, near: Vec, maxDist = 8): { x: number; y: number; rot: Rotation } | null {
  const grid = world.grid;
  const tiles: (Vec & { d: number })[] = [];
  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      const d = Math.abs(x - near.x) + Math.abs(y - near.y);
      if (d > maxDist) continue;
      const outdoor = catalog.floors[grid.floor[y * grid.w + x]]?.outdoor === true;
      tiles.push({ x, y, d: d + (outdoor ? 6 : 0) });
    }
  }
  tiles.sort((a, b) => a.d - b.d || a.y - b.y || a.x - b.x);
  for (const t of tiles) {
    for (const rot of [0, 1, 2, 3] as Rotation[]) {
      if (checkPlacement(world, catalog, defId, t.x, t.y, rot).ok) return { x: t.x, y: t.y, rot };
    }
  }
  return null;
}

/** Põe um objeto de graça (mudança, mala) num lugar livre perto; null se não coube. */
export function placeFree(world: World, catalog: Catalog, defId: string, near: Vec): WorldObject | null {
  const spot = spotNear(world, catalog, defId, near);
  if (!spot) return null;
  const obj: WorldObject = { id: world.nextId++, defId, x: spot.x, y: spot.y, rot: spot.rot, paid: 0, state: freshState(), bought: world.tick, used: 0, uses: {} };
  world.objects.push(obj);
  return obj;
}

/** Troca o nome de alguém, morador ou vizinho, guardando o de solteiro. */
export function rename(world: World, id: number, name: string): void {
  const people: (Folk | Neighbor | undefined)[] = [world.folks.find((f) => f.id === id), world.neighbors.find((n) => n.id === id)];
  for (const p of people) {
    if (!p || p.name === name) continue;
    p.bornName ??= p.name;
    p.name = name;
  }
}

/** Volta ao nome de solteiro (divórcio). */
export function restoreName(world: World, id: number): void {
  const people: (Folk | Neighbor | undefined)[] = [world.folks.find((f) => f.id === id), world.neighbors.find((n) => n.id === id)];
  for (const p of people) {
    if (!p?.bornName) continue;
    p.name = p.bornName;
    delete p.bornName;
  }
}
