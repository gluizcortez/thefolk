import type { GameController } from '../game/controller';
import { t } from '../i18n';
import type { Command } from '../sim';

/**
 * Plano 2, bloco 15: primeiros passos. Um cartão pequeno e opcional que
 * ensina o básico do jogo sem jogo sozinho: escolher quem comanda, dar uma
 * ordem, pôr outra na fila com Shift, mudar a velocidade, comprar um objeto e
 * sair de casa. Cada dica some quando o jogador faz o que ela pede (em
 * qualquer ordem); "Pular" esconde tudo. Fica fora do save, no navegador,
 * como as outras preferências da HUD.
 */
export const TOUR_STEPS = ['select', 'order', 'queue', 'speed', 'buy', 'leave'] as const;
export type TourStep = (typeof TOUR_STEPS)[number];

export interface TourState {
  done: TourStep[];
  off: boolean;
}

const KEY = 'thefolk.tour';

/** Ordens que contam como "mandar o folk fazer algo". */
const ORDERS = new Set<Command['type']>(['queueUse', 'queueSocial', 'queueGoto', 'queueTidy', 'mealAct', 'callService']);

/** Qual passo um comando aceito completa (puro, para os testes). */
export function stepOfCommand(cmd: Command): TourStep[] {
  const out: TourStep[] = [];
  if (ORDERS.has(cmd.type)) {
    out.push('order');
    if ('append' in cmd && cmd.append) out.push('queue');
  }
  if (cmd.type === 'setSpeed' && cmd.speed >= 2) out.push('speed');
  if (cmd.type === 'buy') out.push('buy');
  if (cmd.type === 'goDowntown' || cmd.type === 'visitLot') out.push('leave');
  return out;
}

/** O próximo passo a mostrar (o primeiro que falta), ou null se acabou. */
export function nextTourStep(state: TourState): TourStep | null {
  if (state.off) return null;
  return TOUR_STEPS.find((s) => !state.done.includes(s)) ?? null;
}

export function loadTour(): TourState {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '{}') as Partial<TourState>;
    const done = Array.isArray(raw.done) ? raw.done.filter((s): s is TourStep => (TOUR_STEPS as readonly string[]).includes(s)) : [];
    return { done, off: raw.off === true };
  } catch {
    return { done: [], off: false };
  }
}

function saveTour(state: TourState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // sem armazenamento: vale só nesta sessão
  }
}

export class Tour {
  readonly el = document.createElement('div');
  private state = loadTour();
  private shown: TourStep | 'end' | null = null;
  private selected: number;
  private endAt = 0;

  constructor(private readonly ctrl: GameController) {
    this.el.className = 'tour';
    this.el.hidden = true;
    this.selected = ctrl.selectedFolkId;
    ctrl.onCommand((cmd, ok) => {
      if (ok) for (const s of stepOfCommand(cmd)) this.mark(s);
    });
  }

  /** Recomeça as dicas (botão nas opções). */
  restart(): void {
    this.state = { done: [], off: false };
    this.selected = this.ctrl.selectedFolkId;
    saveTour(this.state);
    this.shown = null;
    this.update();
  }

  private mark(step: TourStep): void {
    if (this.state.off || this.state.done.includes(step)) return;
    this.state.done.push(step);
    if (!nextTourStep(this.state)) this.endAt = performance.now() + 6000;
    saveTour(this.state);
  }

  /** Chamado junto com a HUD (umas dez vezes por segundo). */
  update(): void {
    const ctrl = this.ctrl;
    if (ctrl.selectedFolkId !== this.selected) {
      this.selected = ctrl.selectedFolkId;
      this.mark('select');
    }
    if (ctrl.world.outing) this.mark('leave');
    // não atrapalha o criador nem o mapa
    const busy = !!document.querySelector('.creator:not([hidden])') || ctrl.screen === 'town';
    const step = nextTourStep(this.state);
    const want: TourStep | 'end' | null = this.state.off || busy ? null : (step ?? (performance.now() < this.endAt ? 'end' : null));
    if (want === this.shown) return;
    this.shown = want;
    this.el.hidden = want === null;
    if (want === null) return;
    this.el.replaceChildren();
    const head = document.createElement('div');
    head.className = 'tour-head';
    const title = document.createElement('b');
    title.textContent = t('tour.title');
    const count = document.createElement('span');
    count.textContent = want === 'end' ? '' : t('tour.count', { n: this.state.done.length + 1, total: TOUR_STEPS.length });
    head.append(title, count);
    const body = document.createElement('p');
    body.textContent = t(`tour.${want}`);
    const dots = document.createElement('div');
    dots.className = 'tour-dots';
    for (const s of TOUR_STEPS) {
      const d = document.createElement('i');
      d.className = this.state.done.includes(s) ? 'on' : s === want ? 'now' : '';
      d.title = t(`tour.short.${s}`);
      dots.append(d);
    }
    const skip = document.createElement('button');
    skip.className = 'btn btn-small btn-quiet';
    skip.textContent = t(want === 'end' ? 'tour.close' : 'tour.skip');
    skip.addEventListener('click', () => {
      this.state.off = true;
      saveTour(this.state);
      this.update();
    });
    this.el.append(head, body, dots, skip);
  }
}
