import { t } from '../i18n';
import { TRAVEL_MODES, formatMoney, travelCost, travelMinutes, travelProblem } from '../sim';
import type { Folk, TravelMode, World } from '../sim';

// Plano 2, bloco 12: escolher como ir pela cidade (a pé, de bicicleta, de
// carro ou de táxi), com o tempo e o preço de cada jeito. Serve para o passeio
// ao centro (menu da HUD) e para a visita a um vizinho (cartão do lote).

function el<K extends keyof HTMLElementTagNameMap>(tag: K, className?: string, text?: string): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

/** Botões de jeito de ir; `round` dobra o preço (visita: ida e volta). */
export function travelPicker(world: World, goers: Folk[], length: number, mode: TravelMode, pick: (m: TravelMode) => void, round = false): HTMLElement {
  const box = el('div', 'travel-modes');
  for (const m of TRAVEL_MODES) {
    const why = goers.length ? travelProblem(world, goers, m, length * (round ? 2 : 1)) : null;
    const b = el('button', `travel-mode${m === mode ? ' on' : ''}`);
    const cost = travelCost(length, m) * (round ? 2 : 1);
    b.append(el('b', '', t(`travel.${m}`)), el('span', '', t('travel.minutes', { n: travelMinutes(length, m) })), el('span', '', cost ? formatMoney(cost) : t('travel.free')));
    b.disabled = !!why;
    if (why) b.title = t(`problem.${why}`);
    b.addEventListener('click', () => pick(m));
    box.append(b);
  }
  return box;
}

/** O jeito que fica escolhido: o pedido, se der; senão o primeiro que der (a pé sempre dá). */
export function usableMode(world: World, goers: Folk[], length: number, mode: TravelMode, round = false): TravelMode {
  if (!travelProblem(world, goers, mode, length * (round ? 2 : 1))) return mode;
  return TRAVEL_MODES.find((m) => !travelProblem(world, goers, m, length * (round ? 2 : 1))) ?? 'walk';
}
