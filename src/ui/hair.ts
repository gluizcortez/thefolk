import { toneGradient } from '../game/art/palette';
import type { GameController } from '../game/controller';
import { t } from '../i18n';
import { ensembleOf } from '../sim/clothes';
import { LOOK_LIMITS, TONE_MAX } from '../sim/temper';
import type { Folk } from '../sim/types';
import type { Portraiter } from './wardrobe';

// Plano 2, bloco 10 (o que ficou do bloco 9): no espelho, mudar o corte e a
// cor do cabelo. Prévia ao lado; nada muda no jogo até confirmar.

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export class HairPanel {
  readonly el = el('div', 'card wardrobe hair-panel');
  private folkId = -1;
  private style = 0;
  private hair = 0;
  portraiter: Portraiter | null = null;

  constructor(private ctrl: GameController) {
    this.el.hidden = true;
  }

  get open(): boolean {
    return !this.el.hidden;
  }

  show(folkId: number): void {
    const folk = this.ctrl.world.folks.find((f) => f.id === folkId);
    if (!folk) return;
    this.folkId = folkId;
    this.style = folk.look.style;
    this.hair = folk.look.hair;
    this.el.hidden = false;
    this.render();
  }

  close(): void {
    this.el.hidden = true;
  }

  private folk(): Folk | undefined {
    return this.ctrl.world.folks.find((f) => f.id === this.folkId && !f.visit && f.age !== 'baby');
  }

  private shot(folk: Folk): string {
    if (!this.portraiter) return '';
    const look = { ...folk.look, style: this.style, hair: this.hair };
    return this.portraiter(look, 'day', { age: folk.age, dress: ensembleOf(folk, 'day') });
  }

  private render(): void {
    const folk = this.folk();
    if (!folk) return this.close();
    this.el.replaceChildren();
    const head = el('div', 'style-head');
    head.append(el('div', 'style-title', t('hair.title', { name: folk.name.split(' ')[0] })));
    const x = el('button', 'style-close', '×');
    x.addEventListener('click', () => this.close());
    head.append(x);
    const body = el('div', 'wardrobe-body');
    const left = el('div', 'wardrobe-left');
    const img = el('img', 'wardrobe-shot');
    img.alt = '';
    img.src = this.shot(folk);
    left.append(img);
    const right = el('div', 'wardrobe-right');
    right.append(el('div', 'style-section', t('look.style')));
    const chips = el('div', 'style-chips');
    for (let i = 0; i < LOOK_LIMITS.style; i++) {
      const b = el('button', 'chip', t(`style.${i}`));
      b.classList.toggle('on', i === this.style);
      b.addEventListener('click', () => {
        this.style = i;
        this.render();
      });
      chips.append(b);
    }
    right.append(chips, el('div', 'style-section', t('look.hair')));
    const range = el('input', 'creator-slider');
    range.type = 'range';
    range.min = '0';
    range.max = String(TONE_MAX);
    range.value = String(this.hair);
    range.style.background = toneGradient('hair');
    range.addEventListener('input', () => {
      this.hair = Number(range.value);
      img.src = this.shot(folk);
    });
    right.append(range);
    body.append(left, right);
    const foot = el('div', 'style-foot');
    const ok = el('button', 'chip go', t('hair.apply'));
    ok.addEventListener('click', () => {
      if (this.ctrl.commandOrExplain({ type: 'restyleHair', folkId: folk.id, style: this.style, hair: this.hair })) {
        this.ctrl.toast(t('hair.done', { name: folk.name.split(' ')[0] }));
        this.close();
      }
    });
    foot.append(ok);
    this.el.append(head, body, foot);
  }
}
