// Plano 2, bloco 3: modos de vista da casa. Quatro modos num controle só,
// do mais alto para o mais baixo: telhado à vista (a casa inteira, como da
// rua), paredes inteiras (sem telhado, as paredes sobem até o forro), paredes
// recortadas (o corte que deixa ver dentro dos cômodos, o padrão para jogar)
// e paredes baixas (meia canela). O telhado some sozinho ao entrar no modo
// construção ou ao aproximar a câmera de um cômodo, e volta ao afastar, a
// não ser que o jogador fixe o modo. Puro: a tela e os testes usam.

export type WallMode = 'roof' | 'up' | 'cutaway' | 'down';

/** Do mais baixo para o mais alto (Home sobe, End desce). */
export const WALL_MODES: WallMode[] = ['down', 'cutaway', 'up', 'roof'];

/** Abaixo desta altura de vista (em metros na tela) a câmera está "dentro de um cômodo". */
export const ROOM_ZOOM = 8;

export interface ViewContext {
  /** modo construção aberto */
  building: boolean;
  /** ferramenta do telhado ou da laje na mão: o telhado aparece sempre */
  roofTool: boolean;
  /** altura de vista da câmera (menor = mais perto) */
  viewHeight: number;
}

/** O modo que a tela mostra agora, a partir do escolhido. */
export function shownWallMode(mode: WallMode, pinned: boolean, ctx: ViewContext): WallMode {
  if (ctx.roofTool) return 'roof';
  if (mode !== 'roof' || pinned) return mode;
  if (ctx.building || ctx.viewHeight < ROOM_ZOOM) return 'cutaway';
  return 'roof';
}

/** Um degrau acima (dir 1) ou abaixo (dir -1), parando nas pontas. */
export function stepWallMode(mode: WallMode, dir: number): WallMode {
  const i = WALL_MODES.indexOf(mode);
  return WALL_MODES[Math.max(0, Math.min(WALL_MODES.length - 1, (i < 0 ? 1 : i) + Math.sign(dir)))];
}

export function isWallMode(v: unknown): v is WallMode {
  return typeof v === 'string' && (WALL_MODES as string[]).includes(v);
}
