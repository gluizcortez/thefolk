import type { Nav } from './grid';
import { blocksStep, edgeKey, footprint } from './grid';
import type { Catalog, Circle, Folk, Vec, World } from './types';

// Bloco 9: roda de conversa. Até quatro pessoas em pé em volta de um tile
// vazio (norte, leste, sul e oeste dele), falando por turnos: quem está com a
// palavra puxa um assunto, os outros reagem pelo gosto de cada um.

export const CIRCLE_MAX = 4;
/** minutos de cada vez de falar */
export const CIRCLE_TURN = 5;
/** quanto dura uma roda (mais um tanto sorteado) */
export const CIRCLE_MINUTES = 40;
export const CIRCLE_EXTRA = 30;
/** tempo para a turma chegar antes de a roda desistir de existir */
export const CIRCLE_GRACE = 25;
/** distância (tiles) até onde alguém se anima a entrar numa roda */
export const CIRCLE_REACH = 14;
/** efeito por minuto em quem está na roda */
export const CIRCLE_EFFECTS = { social: 1.1, fun: 0.25 };

/** Lados do tile do meio, na ordem dos lugares (0 N, 1 E, 2 S, 3 W). */
export const SPOTS: Vec[] = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

export function spotTile(c: Circle, spot: number): Vec {
  return { x: c.center.x + SPOTS[spot].x, y: c.center.y + SPOTS[spot].y };
}

export function circleById(world: World, id: number | undefined): Circle | undefined {
  return id === undefined ? undefined : world.circles.find((c) => c.id === id);
}

/** A roda em que o folk está (ou está indo para). */
export function circleOfFolk(world: World, folkId: number): Circle | undefined {
  return world.circles.find((c) => c.members.some((m) => m.id === folkId));
}

/** Tiles que outras rodas já usam (meio e lugares) e os que têm móvel em cima (cama, tapete fica de fora). */
function circleTiles(world: World, except?: Circle, catalog?: Catalog): Set<string> {
  const out = new Set<string>();
  if (catalog) {
    for (const o of world.objects) {
      const def = catalog.objects[o.defId];
      if (!def || def.layer) continue;
      if (def.id.includes('rug')) continue;
      for (const t of footprint(o, def)) out.add(`${t.x},${t.y}`);
    }
  }
  for (const c of world.circles) {
    if (c === except) continue;
    out.add(`${c.center.x},${c.center.y}`);
    for (let s = 0; s < SPOTS.length; s++) {
      const t = spotTile(c, s);
      out.add(`${t.x},${t.y}`);
    }
  }
  return out;
}

/** Dá para ficar em pé neste lugar da roda (livre, sem parede para o meio, sem ninguém parado)? */
function spotUsable(world: World, nav: Nav, center: Vec, spot: number, ok: Set<number>, taken: Set<string>): boolean {
  const x = center.x + SPOTS[spot].x;
  const y = center.y + SPOTS[spot].y;
  if (!nav.isFree(x, y) || taken.has(`${x},${y}`)) return false;
  if (blocksStep(world.grid.edges[edgeKey(center.x, center.y, x, y)])) return false;
  return !world.folks.some((f) => !ok.has(f.id) && !f.away && f.x === x && f.y === y && f.path.length === 0);
}

/**
 * Procura, a partir de `near`, um tile do meio com pelo menos `need` lugares
 * em volta. `ok` = quem pode estar em pé num lugar (vai entrar na roda).
 * Devolve o meio e os lugares que dá para usar, ou null.
 */
export function findCircleCenter(
  world: World,
  nav: Nav,
  near: Vec,
  need: number,
  ok: Set<number>,
  catalog?: Catalog,
  maxSteps = 10,
): { center: Vec; spots: number[] } | null {
  const taken = circleTiles(world, undefined, catalog);
  const seen = new Set<string>([`${near.x},${near.y}`]);
  let frontier: Vec[] = [near];
  for (let step = 0; step <= maxSteps && frontier.length; step++) {
    const next: Vec[] = [];
    for (const t of frontier) {
      if (nav.isFree(t.x, t.y) && !taken.has(`${t.x},${t.y}`)) {
        const standing = world.folks.some((f) => !ok.has(f.id) && !f.away && f.x === t.x && f.y === t.y);
        if (!standing) {
          const spots = [0, 1, 2, 3].filter((s) => spotUsable(world, nav, t, s, ok, taken));
          if (spots.length >= need) return { center: { ...t }, spots };
        }
      }
      for (const d of SPOTS) {
        const nx = t.x + d.x;
        const ny = t.y + d.y;
        const key = `${nx},${ny}`;
        if (seen.has(key) || !nav.canStep(t.x, t.y, nx, ny)) continue;
        seen.add(key);
        next.push({ x: nx, y: ny });
      }
    }
    frontier = next;
  }
  return null;
}

/** Um lugar livre na roda (ou -1). */
export function freeSpot(world: World, nav: Nav, c: Circle, joining: number, catalog?: Catalog): number {
  if (c.members.length >= CIRCLE_MAX) return -1;
  const used = new Set(c.members.map((m) => m.spot));
  const taken = circleTiles(world, c, catalog);
  const ok = new Set([joining, ...c.members.map((m) => m.id)]);
  for (let s = 0; s < SPOTS.length; s++) {
    if (!used.has(s) && spotUsable(world, nav, c.center, s, ok, taken)) return s;
  }
  return -1;
}

/** O folk está em pé no lugar dele e já de papo? */
export function inCircle(folk: Folk, c: Circle): boolean {
  const a = folk.queue[0];
  return !!a && a.kind === 'circle' && a.circleId === c.id && a.phase === 'using';
}

/** Lado (vetor unitário) do folk para o meio da roda. */
export function faceCenter(folk: Folk, c: Circle): Vec {
  return { x: Math.sign(c.center.x - folk.x), y: Math.sign(c.center.y - folk.y) };
}
