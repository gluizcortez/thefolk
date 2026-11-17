import type { Catalog, Folk, InteractionDef, Look, NeedId, SocialCategory, Temper, TemperAxis } from './types';

// Bloco 5: temperamento em cinco eixos de 0 a 10 que somam sempre o mesmo
// orçamento. Ordem (arruma, sente a bagunça), Expansão (precisa de gente),
// Pique (gosta de se mexer, liga menos para conforto), Graça (brincadeira e
// criatividade; com pouca Graça, o folk é sério e bom de lógica) e Afeto
// (gentil; com pouco Afeto, provoca e briga). Cinco em tudo é neutro: não
// muda nada do jogo de antes.

export const TEMPER_AXES: readonly TemperAxis[] = ['order', 'outgoing', 'pep', 'wit', 'warmth'];
export const TEMPER_MAX = 10;
/** pontos para distribuir entre os cinco eixos */
export const TEMPER_BUDGET = 25;
export const NEUTRAL_TEMPER: Temper = { order: 5, outgoing: 5, pep: 5, wit: 5, warmth: 5 };

/** -1 (eixo em 0) a 1 (eixo em 10); 0 no meio. */
export function axisPull(temper: Temper | undefined, axis: TemperAxis): number {
  const v = temper?.[axis] ?? 5;
  return (Math.max(0, Math.min(TEMPER_MAX, v)) - 5) / 5;
}

export function temperSum(t: Temper): number {
  return TEMPER_AXES.reduce((s, a) => s + t[a], 0);
}

/** Temperamento válido: inteiros de 0 a 10 que somam o orçamento. */
export function validTemper(t: Partial<Temper> | undefined): t is Temper {
  if (!t) return false;
  for (const a of TEMPER_AXES) {
    const v = t[a];
    if (typeof v !== 'number' || !Number.isInteger(v) || v < 0 || v > TEMPER_MAX) return false;
  }
  return temperSum(t as Temper) === TEMPER_BUDGET;
}

/**
 * Leva um temperamento qualquer para o orçamento, mexendo primeiro nos eixos
 * mais perto do meio (os que o jogador ou os traços menos marcaram).
 */
export function fitTemper(raw: Partial<Temper>): Temper {
  const t = {} as Temper;
  for (const a of TEMPER_AXES) t[a] = Math.max(0, Math.min(TEMPER_MAX, Math.round(raw[a] ?? 5)));
  // o quanto cada eixo foi marcado no pedido (fixo durante o acerto)
  const mark = (a: TemperAxis) => Math.abs((raw[a] ?? 5) - 5);
  let guard = 200;
  while (temperSum(t) !== TEMPER_BUDGET && guard-- > 0) {
    const down = temperSum(t) > TEMPER_BUDGET;
    const pick = TEMPER_AXES.filter((a) => (down ? t[a] > 0 : t[a] < TEMPER_MAX)).sort(
      (a, b) => mark(a) - mark(b) || (down ? t[b] - t[a] : t[a] - t[b]),
    )[0];
    t[pick] += down ? -1 : 1;
  }
  return t;
}

/** Temperamento coerente com os traços (para quem nasceu antes do bloco 5). */
export function temperFromTraits(catalog: Pick<Catalog, 'traits'>, traits: readonly string[]): Temper {
  const raw: Temper = { ...NEUTRAL_TEMPER };
  for (const id of traits) {
    const d = catalog.traits[id]?.temper;
    if (!d) continue;
    for (const a of TEMPER_AXES) raw[a] += d[a] ?? 0;
  }
  return fitTemper(raw);
}

/** Distância entre dois temperamentos (soma das diferenças). */
export function temperDistance(a: Temper, b: Temper): number {
  return TEMPER_AXES.reduce((s, x) => s + Math.abs(a[x] - b[x]), 0);
}

/** Mês cujo temperamento sugerido mais se parece com este. */
export function monthFor(catalog: Pick<Catalog, 'months'>, temper: Temper): number {
  let best = 0;
  let dist = Infinity;
  for (const m of catalog.months) {
    const d = temperDistance(m.temper, temper);
    if (d < dist) {
      dist = d;
      best = m.id;
    }
  }
  return best;
}

/** +1 quando os meses combinam, -1 quando dão atrito, 0 no resto. */
export function monthChemistry(catalog: Pick<Catalog, 'months'>, a: number | undefined, b: number | undefined): number {
  if (a === undefined || b === undefined) return 0;
  const def = catalog.months[a];
  if (!def) return 0;
  if (def.likes.includes(b)) return 1;
  if (def.dislikes.includes(b)) return -1;
  return 0;
}

// ---------- efeitos ----------

/** Quanto cada eixo mexe no decaimento das necessidades. */
export function temperDecay(temper: Temper | undefined, need: NeedId): number {
  switch (need) {
    case 'social':
      return 1 + 0.35 * axisPull(temper, 'outgoing');
    case 'fun':
      return 1 + 0.25 * axisPull(temper, 'wit');
    case 'comfort':
      return 1 - 0.2 * axisPull(temper, 'pep');
    case 'energy':
      return 1 - 0.1 * axisPull(temper, 'pep');
    default:
      return 1;
  }
}

/** Quanto cada eixo mexe no peso que a IA dá às necessidades. */
export function temperWeight(temper: Temper | undefined, need: NeedId): number {
  switch (need) {
    case 'social':
      return 1 + 0.35 * axisPull(temper, 'outgoing');
    case 'fun':
      return 1 + 0.25 * axisPull(temper, 'wit');
    case 'hygiene':
      return 1 + 0.3 * axisPull(temper, 'order');
    case 'ambience':
      return 1 + 0.2 * axisPull(temper, 'order');
    case 'comfort':
      return 1 - 0.25 * axisPull(temper, 'pep');
    default:
      return 1;
  }
}

/** Vontade de arrumar a casa (multiplica a dos traços). */
export function temperTidy(temper: Temper | undefined): number {
  return Math.max(0.25, 1 + 0.65 * axisPull(temper, 'order'));
}

/** Quanto a bagunça incomoda (multiplica a dos traços). */
export function temperMessSense(temper: Temper | undefined): number {
  return Math.max(0.3, 1 + 0.5 * axisPull(temper, 'order'));
}

/** Gosto por tipo de conversa (multiplica o dos traços). */
export function temperSocial(temper: Temper | undefined, cat: SocialCategory): number {
  const warm = axisPull(temper, 'warmth');
  const out = axisPull(temper, 'outgoing');
  switch (cat) {
    case 'friendly':
      return (1 + 0.25 * warm) * (1 + 0.2 * out);
    case 'romantic':
      return 1 + 0.2 * warm;
    case 'mean':
      // pouco Afeto chega a 1,6 (o bastante para provocar sozinho)
      return Math.max(0.2, 1 - 0.6 * warm);
    default:
      return 1;
  }
}

/** Eixo que cada habilidade puxa (e para que lado). */
export const SKILL_AXIS: Record<string, { axis: TemperAxis; sign: 1 | -1 }> = {
  cooking: { axis: 'order', sign: 1 },
  tidiness: { axis: 'order', sign: 1 },
  handiness: { axis: 'pep', sign: 1 },
  charisma: { axis: 'outgoing', sign: 1 },
  fitness: { axis: 'pep', sign: 1 },
  creativity: { axis: 'wit', sign: 1 },
  // quem é sério (pouca Graça) aprende lógica mais rápido
  logic: { axis: 'wit', sign: -1 },
};

/** Multiplicador do treino de uma habilidade (0,7 a 1,3). */
export function temperTraining(temper: Temper | undefined, skill: string): number {
  const link = SKILL_AXIS[skill];
  if (!link) return 1;
  return 1 + 0.3 * link.sign * axisPull(temper, link.axis);
}

/**
 * Atração da IA por uma interação que treina habilidade: quem tem o eixo
 * alto procura mais (Pique alto vai malhar, Graça alta vai pintar).
 */
export function temperPull(folk: Pick<Folk, 'temper'>, it: Pick<InteractionDef, 'skill' | 'care'>): number {
  if (it.care) return 1;
  const id = it.skill?.id;
  if (!id) return 1;
  const link = SKILL_AXIS[id];
  if (!link) return 1;
  return 1 + 0.35 * link.sign * axisPull(folk.temper, link.axis);
}

// ---------- hábito: o temperamento muda devagar ----------

/** De quantos em quantos dias o hábito acumulado mexe no temperamento. */
export const HABIT_PERIOD_DAYS = 14;
/** minutos de hábito (no período) para o eixo andar um ponto */
export const HABIT_SHIFT = 900;

/** Um minuto de hábito num eixo (sinal = para que lado). */
export function countHabit(folk: Pick<Folk, 'habits' | 'visit'>, axis: TemperAxis, sign: number): void {
  if (folk.visit) return;
  folk.habits[axis] = (folk.habits[axis] ?? 0) + sign;
}

/** Hábito do minuto de treino de uma habilidade. */
export function habitOfSkill(folk: Pick<Folk, 'habits' | 'visit'>, skill: string): void {
  const link = SKILL_AXIS[skill];
  if (link) countHabit(folk, link.axis, link.sign);
}

/**
 * Fecha o período: o eixo com mais hábito acumulado anda um ponto para o
 * lado do hábito e outro eixo devolve o ponto (o orçamento não muda). Devolve
 * o eixo que mudou e o sentido, ou null. Zera o hábito.
 */
export function settleHabits(folk: Pick<Folk, 'habits' | 'temper'>): { axis: TemperAxis; dir: 1 | -1; other: TemperAxis } | null {
  const h = folk.habits;
  folk.habits = {};
  let axis: TemperAxis | null = null;
  for (const a of TEMPER_AXES) {
    const v = h[a] ?? 0;
    if (Math.abs(v) < HABIT_SHIFT) continue;
    if (!axis || Math.abs(v) > Math.abs(h[axis] ?? 0)) axis = a;
  }
  if (!axis) return null;
  const dir: 1 | -1 = (h[axis] ?? 0) > 0 ? 1 : -1;
  const t = folk.temper;
  if ((dir > 0 && t[axis] >= TEMPER_MAX) || (dir < 0 && t[axis] <= 0)) return null;
  // quem devolve o ponto: o eixo menos exercitado que ainda tem para dar
  const others = TEMPER_AXES.filter((a) => a !== axis && (dir > 0 ? t[a] > 0 : t[a] < TEMPER_MAX)).sort(
    (a, b) => dir * ((h[a] ?? 0) - (h[b] ?? 0)) || (dir > 0 ? t[b] - t[a] : t[a] - t[b]),
  );
  const other = others[0];
  if (!other) return null;
  t[axis] += dir;
  t[other] -= dir;
  return { axis, dir, other };
}

// ---------- aparência ----------

export const LOOK_LIMITS: Record<keyof Look, number> = {
  skin: 4,
  hair: 5,
  shirt: 6,
  pants: 4,
  style: 4,
  face: 3,
  body: 3,
  formal: 4,
  sleepwear: 4,
  swimwear: 4,
};

/** Aparência completa a partir da antiga (só pele, cabelo, camisa e calça). */
export function fullLook(look: Partial<Look> | undefined): Look {
  const l = look ?? {};
  const hair = l.hair ?? 0;
  const shirt = l.shirt ?? 0;
  return {
    skin: l.skin ?? 0,
    hair,
    shirt,
    pants: l.pants ?? 0,
    // o corte antigo vinha da paridade da cor do cabelo
    style: l.style ?? hair % 2,
    face: l.face ?? 0,
    body: l.body ?? 1,
    formal: l.formal ?? 0,
    sleepwear: l.sleepwear ?? shirt % 4,
    swimwear: l.swimwear ?? (shirt + 1) % 4,
  };
}
