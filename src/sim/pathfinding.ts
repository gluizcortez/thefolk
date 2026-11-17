import type { Nav } from './grid';
import type { Vec } from './types';

const DX = [0, 1, 0, -1];
const DY = [-1, 0, 1, 0];

/**
 * A* em grid de 4 direções. Devolve o caminho sem o tile inicial e com o
 * destino, [] se já está lá, ou null se não há caminho.
 * O desempate é fixo (f, depois h, depois ordem de inserção) para ser
 * determinístico.
 */
export function findPath(nav: Nav, from: Vec, to: Vec): Vec[] | null {
  if (from.x === to.x && from.y === to.y) return [];
  if (!nav.isFree(to.x, to.y)) return null;

  const size = nav.w * nav.h;
  const g = new Float64Array(size).fill(Infinity);
  const came = new Int32Array(size).fill(-1);
  const closed = new Uint8Array(size);
  const start = from.y * nav.w + from.x;
  const goal = to.y * nav.w + to.x;
  const h = (i: number) => Math.abs((i % nav.w) - to.x) + Math.abs(Math.floor(i / nav.w) - to.y);

  // lista aberta simples: o grid é pequeno, então uma busca linear basta
  const open: { i: number; f: number; h: number; n: number }[] = [];
  let counter = 0;
  g[start] = 0;
  open.push({ i: start, f: h(start), h: h(start), n: counter++ });

  while (open.length > 0) {
    let bi = 0;
    for (let k = 1; k < open.length; k++) {
      const a = open[k];
      const b = open[bi];
      if (a.f < b.f || (a.f === b.f && (a.h < b.h || (a.h === b.h && a.n < b.n)))) bi = k;
    }
    const cur = open.splice(bi, 1)[0];
    if (closed[cur.i]) continue;
    closed[cur.i] = 1;

    if (cur.i === goal) {
      const path: Vec[] = [];
      let i = goal;
      while (i !== start) {
        path.push({ x: i % nav.w, y: Math.floor(i / nav.w) });
        i = came[i];
      }
      return path.reverse();
    }

    const cx = cur.i % nav.w;
    const cy = Math.floor(cur.i / nav.w);
    for (let d = 0; d < 4; d++) {
      const nx = cx + DX[d];
      const ny = cy + DY[d];
      if (nx < 0 || ny < 0 || nx >= nav.w || ny >= nav.h) continue;
      if (!nav.canStep(cx, cy, nx, ny)) continue;
      const ni = ny * nav.w + nx;
      if (closed[ni]) continue;
      const ng = g[cur.i] + 1;
      if (ng < g[ni]) {
        g[ni] = ng;
        came[ni] = cur.i;
        const hh = h(ni);
        open.push({ i: ni, f: ng + hh, h: hh, n: counter++ });
      }
    }
  }
  return null;
}

/** Menor caminho até qualquer um dos destinos. */
export function findPathToAny(nav: Nav, from: Vec, targets: Vec[]): Vec[] | null {
  let best: Vec[] | null = null;
  for (const t of targets) {
    const p = findPath(nav, from, t);
    if (p && (!best || p.length < best.length)) best = p;
  }
  return best;
}
