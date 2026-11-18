// Bloco 12: telhado automático. O telhado cobre cada tile de cômodo fechado
// que não tem cômodo fechado logo em cima (o térreo debaixo de um quarto não
// ganha telhado; a varanda do térreo ao lado do sobrado, sim). A forma (duas
// ou quatro águas) e a altura de cada canto saem de `roofHeights`, função pura
// usada pela tela e pelos testes.

import { levelsOf, rowOn } from './grid';
import { computeRooms } from './rooms';
import type { Catalog, Grid, RoofStyle } from './types';

/** Tiles cobertos por andar (índice local: y * w + x, y dentro do andar). */
export function roofMask(grid: Grid, catalog: Catalog): Uint8Array[] {
  const map = computeRooms(grid, catalog);
  const levels = levelsOf(grid);
  const enclosed = (level: number, x: number, y: number) => {
    if (level >= levels) return false;
    const id = map.of[rowOn(grid, level, y) * grid.w + x];
    return id >= 0 && map.rooms[id].outdoor === false;
  };
  const out: Uint8Array[] = [];
  for (let level = 0; level < levels; level++) {
    const mask = new Uint8Array(grid.w * grid.h);
    for (let y = 0; y < grid.h; y++) {
      for (let x = 0; x < grid.w; x++) {
        if (enclosed(level, x, y) && !enclosed(level + 1, x, y)) mask[y * grid.w + x] = 1;
      }
    }
    out.push(mask);
  }
  return out;
}

/** Quantos tiles o telhado cobre (o preço de trocar estilo ou cor sai daqui). */
export function roofArea(grid: Grid, catalog: Catalog): number {
  let n = 0;
  for (const m of roofMask(grid, catalog)) for (const v of m) n += v;
  return n;
}

/** Inclinação: quanto o telhado sobe (em metros) por metro de distância da beira. */
export const ROOF_PITCH = 0.55;
/** Altura máxima da cumeeira (casas largas ganham um topo plano). */
export const ROOF_MAX = 2.6;

/**
 * Altura de cada vértice (w + 1) x (h + 1) do telhado sobre uma máscara, em
 * metros acima do topo das paredes. Quatro águas: distância (em quadrados) até
 * a beira mais perto. Duas águas: distância só no sentido curto de cada parte
 * da casa, de modo que as pontas viram oitões (paredes em triângulo).
 * Vértice fora do telhado fica com -1.
 */
export function roofHeights(mask: Uint8Array, w: number, h: number, style: RoofStyle): Float32Array {
  const W = w + 1;
  const out = new Float32Array(W * (h + 1)).fill(-1);
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === 1;
  // vértice é de telhado se algum dos 4 tiles em volta é coberto
  const touches = (vx: number, vy: number) => at(vx - 1, vy - 1) || at(vx, vy - 1) || at(vx - 1, vy) || at(vx, vy);
  const inner = (vx: number, vy: number) => at(vx - 1, vy - 1) && at(vx, vy - 1) && at(vx - 1, vy) && at(vx, vy);

  if (style === 'hip') {
    // busca em largura em 8 direções a partir da beira: distância de Chebyshev
    const queue: number[] = [];
    for (let vy = 0; vy <= h; vy++) {
      for (let vx = 0; vx <= w; vx++) {
        if (!touches(vx, vy)) continue;
        if (!inner(vx, vy)) {
          out[vy * W + vx] = 0;
          queue.push(vy * W + vx);
        }
      }
    }
    for (let qi = 0; qi < queue.length; qi++) {
      const i = queue[qi];
      const vx = i % W;
      const vy = Math.floor(i / W);
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const nx = vx + dx;
          const ny = vy + dy;
          if (nx < 0 || ny < 0 || nx > w || ny > h) continue;
          const j = ny * W + nx;
          if (out[j] !== -1 || !inner(nx, ny)) continue;
          out[j] = out[i] + 1;
          queue.push(j);
        }
      }
    }
  } else {
    // duas águas: a cumeeira corre no sentido mais comprido de cada parte
    const comps = components(mask, w, h);
    for (const comp of comps) {
      let x0 = w;
      let x1 = 0;
      let y0 = h;
      let y1 = 0;
      for (const i of comp) {
        const x = i % w;
        const y = Math.floor(i / w);
        x0 = Math.min(x0, x);
        x1 = Math.max(x1, x + 1);
        y0 = Math.min(y0, y);
        y1 = Math.max(y1, y + 1);
      }
      const alongX = x1 - x0 >= y1 - y0;
      const inComp = new Set(comp);
      const covered = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && inComp.has(y * w + x);
      for (let vy = y0; vy <= y1; vy++) {
        for (let vx = x0; vx <= x1; vx++) {
          let best = -1;
          // cada coluna (ou linha) de tiles vizinha ao vértice dá a distância até a beira dela
          for (const c of alongX ? [vx - 1, vx] : [vy - 1, vy]) {
            const has = (k: number) => (alongX ? covered(c, k) : covered(k, c));
            const pos = alongX ? vy : vx;
            if (!has(pos - 1) && !has(pos)) continue;
            let a = pos;
            while (has(a - 1)) a--;
            let b = pos;
            while (has(b)) b++;
            best = Math.max(best, Math.min(pos - a, b - pos));
          }
          if (best >= 0) out[vy * W + vx] = Math.max(out[vy * W + vx], best);
        }
      }
    }
  }
  for (let i = 0; i < out.length; i++) if (out[i] > 0) out[i] = Math.min(ROOF_MAX, out[i] * ROOF_PITCH);
  return out;
}

/** Partes ligadas (4 direções) da máscara. */
function components(mask: Uint8Array, w: number, h: number): number[][] {
  const seen = new Uint8Array(w * h);
  const out: number[][] = [];
  for (let s = 0; s < w * h; s++) {
    if (!mask[s] || seen[s]) continue;
    const comp = [s];
    seen[s] = 1;
    for (let qi = 0; qi < comp.length; qi++) {
      const i = comp[qi];
      const x = i % w;
      const y = Math.floor(i / w);
      for (const [nx, ny] of [
        [x + 1, y],
        [x - 1, y],
        [x, y + 1],
        [x, y - 1],
      ]) {
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (!mask[j] || seen[j]) continue;
        seen[j] = 1;
        comp.push(j);
      }
    }
    out.push(comp);
  }
  return out;
}
