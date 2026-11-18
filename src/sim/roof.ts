// Bloco 12: telhado automático. Plano 2, bloco 3: todo prédio tem telhado.
// O telhado cobre toda a área construída de cada andar: os cômodos fechados
// com piso de dentro (o pátio cercado de paredes, de grama ou deck, fica a
// céu aberto) e, no térreo, a varanda coberta (piso de dentro, sem paredes em volta,
// grudada num cômodo). Não cobre o que tem piso logo em cima (a laje do
// andar de cima já é o teto). O jogador escolhe a forma (duas águas, quatro
// águas ou uma água), a cor, a inclinação, e pode marcar trechos como laje
// (plana, com platibanda). As alturas saem de `roofHeights`, função pura
// usada pela tela e pelos testes.

import { levelsOf, rowOn } from './grid';
import { computeRooms } from './rooms';
import type { Catalog, Grid, RoofPitch, RoofStyle } from './types';

/** Valor da máscara: tile com telha. */
export const ROOF_SLOPE = 1;
/** Valor da máscara: tile com laje. */
export const ROOF_FLAT = 2;

/**
 * Tiles cobertos por andar (índice local: y * w + x, y dentro do andar):
 * 0 = nada, 1 = telha, 2 = laje.
 */
export function roofMask(grid: Grid, catalog: Catalog): Uint8Array[] {
  const map = computeRooms(grid, catalog);
  const levels = levelsOf(grid);
  const { w, h } = grid;
  const floorAt = (level: number, x: number, y: number) => grid.floor[rowOn(grid, level, y) * w + x];
  const room = (level: number, x: number, y: number) => {
    const id = map.of[rowOn(grid, level, y) * w + x];
    return id >= 0 && map.rooms[id].outdoor === false;
  };
  const indoorFloor = (level: number, x: number, y: number) => {
    const def = catalog.floors[floorAt(level, x, y)];
    return !!def && def.outdoor !== true;
  };
  const flat = new Set(grid.roof?.flat ?? []);
  const out: Uint8Array[] = [];
  for (let level = 0; level < levels; level++) {
    const built = new Uint8Array(w * h);
    const queue: number[] = [];
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        // cômodo fechado com chão de fora (grama, deck) é pátio: fica a céu aberto
        if (!room(level, x, y) || !indoorFloor(level, x, y)) continue;
        built[y * w + x] = 1;
        queue.push(y * w + x);
      }
    }
    // varanda coberta: piso de dentro ligado a um cômodo (só no térreo; em
    // cima, piso aberto é terraço)
    if (level === 0) {
      for (let qi = 0; qi < queue.length; qi++) {
        const i = queue[qi];
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
          if (built[j] || !indoorFloor(level, nx, ny)) continue;
          built[j] = 1;
          queue.push(j);
        }
      }
    }
    const mask = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (!built[y * w + x]) continue;
        // piso no andar de cima: a laje dele é o teto daqui
        if (level + 1 < levels && floorAt(level + 1, x, y) !== 'void') continue;
        mask[y * w + x] = flat.has(`${x},${rowOn(grid, level, y)}`) ? ROOF_FLAT : ROOF_SLOPE;
      }
    }
    out.push(mask);
  }
  return out;
}

/** Quantos tiles o telhado cobre (o preço de trocar estilo ou cor sai daqui). */
export function roofArea(grid: Grid, catalog: Catalog): number {
  let n = 0;
  for (const m of roofMask(grid, catalog)) for (const v of m) if (v) n++;
  return n;
}

/** Inclinação: quanto o telhado sobe (em metros) por metro de distância da beira. */
export const ROOF_PITCH = 0.55;
/** Altura máxima da cumeeira (casas largas ganham um topo plano). */
export const ROOF_MAX = 2.6;
/** Plano 2, bloco 3: as três inclinações que o jogador escolhe. */
export const PITCH: Record<RoofPitch, number> = { low: 0.35, mid: ROOF_PITCH, steep: 0.8 };

/**
 * Altura de cada vértice (w + 1) x (h + 1) do telhado sobre uma máscara, em
 * metros acima do topo das paredes. Só os tiles de telha (1) contam; laje
 * fica de fora. Quatro águas: distância (em quadrados) até a beira mais
 * perto. Duas águas: distância só no sentido curto de cada parte da casa, de
 * modo que as pontas viram oitões (paredes em triângulo). Uma água: sobe da
 * beira da frente (sul, ou leste) até a de trás, que vira um oitão alto.
 * Vértice fora do telhado fica com -1.
 */
export function roofHeights(mask: Uint8Array, w: number, h: number, style: RoofStyle, pitch = ROOF_PITCH): Float32Array {
  const W = w + 1;
  const out = new Float32Array(W * (h + 1)).fill(-1);
  const at = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] === ROOF_SLOPE;
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
    // duas águas: a cumeeira corre no sentido mais comprido de cada parte;
    // uma água: o mesmo corte, mas a altura só cresce de uma beira para a outra
    const slopeMask = mask.map((v) => (v === ROOF_SLOPE ? 1 : 0));
    for (const comp of components(slopeMask, w, h)) {
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
            // uma água: a beira baixa é a do fim (sul ou leste), metade da inclinação
            const d = style === 'shed' ? (b - pos) / 2 : Math.min(pos - a, b - pos);
            best = Math.max(best, d);
          }
          if (best >= 0) out[vy * W + vx] = Math.max(out[vy * W + vx], best);
        }
      }
    }
  }
  const max = (ROOF_MAX * pitch) / ROOF_PITCH;
  for (let i = 0; i < out.length; i++) if (out[i] > 0) out[i] = Math.min(max, out[i] * pitch);
  return out;
}

/** Um trecho reto entre dois vértices do grid (coordenadas de vértice, dentro do andar). */
export interface RoofSegment {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/**
 * Plano 2, bloco 3: onde vai a cumeeira (a peça que tampa o encontro das
 * águas): arestas de um quadrado em que as duas pontas estão na mesma altura
 * e os vértices dos dois lados ficam mais baixos (ou fora do telhado).
 */
export function roofRidges(heights: Float32Array, w: number, h: number): RoofSegment[] {
  const W = w + 1;
  const hv = (x: number, y: number) => (x < 0 || y < 0 || x > w || y > h ? -1 : heights[y * W + x]);
  const out: RoofSegment[] = [];
  for (let vy = 0; vy <= h; vy++) {
    for (let vx = 0; vx <= w; vx++) {
      const a = hv(vx, vy);
      if (a <= 0) continue;
      // ao longo de x: vizinhos de cima e de baixo mais baixos
      const b = hv(vx + 1, vy);
      if (b === a && hv(vx, vy - 1) < a && hv(vx, vy + 1) < a && hv(vx + 1, vy - 1) < a && hv(vx + 1, vy + 1) < a) {
        out.push({ x0: vx, y0: vy, x1: vx + 1, y1: vy });
      }
      const c = hv(vx, vy + 1);
      if (c === a && hv(vx - 1, vy) < a && hv(vx + 1, vy) < a && hv(vx - 1, vy + 1) < a && hv(vx + 1, vy + 1) < a) {
        out.push({ x0: vx, y0: vy, x1: vx, y1: vy + 1 });
      }
    }
  }
  return out;
}

/**
 * Plano 2, bloco 3: beiras baixas do telhado (onde corre a calha): lados de
 * tile de telha virados para fora do telhado com as duas pontas no chão do
 * telhado (altura 0). Cada trecho vem com o lado de fora (dx, dy).
 */
export function roofEaves(mask: Uint8Array, heights: Float32Array, w: number, h: number): (RoofSegment & { dx: number; dy: number })[] {
  const W = w + 1;
  const slope = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && mask[y * w + x] !== 0;
  const low = (vx: number, vy: number) => heights[vy * W + vx] <= 0;
  const out: (RoofSegment & { dx: number; dy: number })[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (mask[y * w + x] !== ROOF_SLOPE) continue;
      if (!slope(x, y - 1) && low(x, y) && low(x + 1, y)) out.push({ x0: x, y0: y, x1: x + 1, y1: y, dx: 0, dy: -1 });
      if (!slope(x, y + 1) && low(x, y + 1) && low(x + 1, y + 1)) out.push({ x0: x, y0: y + 1, x1: x + 1, y1: y + 1, dx: 0, dy: 1 });
      if (!slope(x - 1, y) && low(x, y) && low(x, y + 1)) out.push({ x0: x, y0: y, x1: x, y1: y + 1, dx: -1, dy: 0 });
      if (!slope(x + 1, y) && low(x + 1, y) && low(x + 1, y + 1)) out.push({ x0: x + 1, y0: y, x1: x + 1, y1: y + 1, dx: 1, dy: 0 });
    }
  }
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
