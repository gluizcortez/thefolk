// Tipos do núcleo de simulação. Nada aqui (nem em sim/) pode importar Three.js ou DOM.
// Todo o estado (`World`) é um objeto puro e serializável em JSON.

export const NEED_IDS = [
  'hunger',
  'energy',
  'hygiene',
  'bladder',
  'comfort',
  'fun',
  'social',
  'ambience',
] as const;

export type NeedId = (typeof NEED_IDS)[number];
export type Needs = Record<NeedId, number>;

export interface Vec {
  x: number;
  y: number;
}

// ---------- Definições (conteúdo, vem de data/) ----------

export type Side = 'N' | 'E' | 'S' | 'W';

export type Pose = 'stand' | 'sit' | 'lie' | 'dance';

export interface InteractionDef {
  id: string;
  /** chave de texto (i18n) */
  label: string;
  /** duração máxima, em minutos de jogo */
  duration: number;
  /** efeito por minuto em cada necessidade */
  effects: Partial<Needs>;
  /** termina antes se esta necessidade encher */
  until?: NeedId;
  /** multiplicador do decaimento natural enquanto dura (ex.: dormir = 0.5) */
  decayScale?: number;
  /** a IA só considera isto quando a necessidade `until` está abaixo deste valor */
  autoBelow?: number;
  /** se a IA autônoma pode escolher (padrão: true) */
  autonomous?: boolean;
  /** custo em tostões, cobrado quando o folk começa a usar */
  cost?: number;
  /** habilidade treinada enquanto dura */
  skill?: SkillGain;
  /** dicas só para a renderização */
  pose?: Pose;
  onObject?: boolean;
}

export interface SkillGain {
  id: string;
  /** pontos de experiência por minuto de uso */
  xpPerMinute: number;
  /**
   * necessidade cujo efeito melhora com o nível da habilidade
   * (ex.: quem cozinha melhor mata mais a fome)
   */
  boosts?: NeedId;
}

export type ObjectCategory =
  | 'seating'
  | 'beds'
  | 'surfaces'
  | 'appliances'
  | 'plumbing'
  | 'electronics'
  | 'decor'
  | 'lighting'
  | 'hobbies';

export interface ObjectDef {
  id: string;
  /** chave de texto (i18n) */
  name: string;
  /** id do desenho, resolvido em game/art */
  art: string;
  size: { w: number; h: number };
  /** lados de onde dá para usar (padrão: todos). N = y menor, E = x maior */
  useSides?: Side[];
  /** quanto o objeto melhora (ou piora) o ambiente ao redor */
  ambience: number;
  interactions: InteractionDef[];
  /** preço no modo compra, em tostões */
  price: number;
  category: ObjectCategory;
  /** false = não aparece no catálogo (mas ainda pode ser vendido) */
  buyable?: boolean;
}

export interface SkillDef {
  id: string;
  name: string;
}

export interface CareerLevel {
  /** chave de texto do cargo */
  title: string;
  /** pagamento por turno, em tostões */
  pay: number;
  /** hora de início (0..23) */
  startHour: number;
  /** duração do turno, em horas */
  hours: number;
  /** dias da semana em que trabalha (0 = segunda) */
  days: number[];
  /** níveis de habilidade exigidos para chegar a este cargo */
  requires: Record<string, number>;
}

export interface CareerDef {
  id: string;
  name: string;
  /** habilidades que contam no desempenho */
  skills: string[];
  /** efeito por minuto nas necessidades durante o turno (além do decaimento) */
  shiftEffects: Partial<Needs>;
  levels: CareerLevel[];
}

export interface TraitDef {
  id: string;
  name: string;
  /** multiplica o peso que a IA dá a cada necessidade */
  needWeight?: Partial<Needs>;
  /** multiplica o decaimento de cada necessidade */
  decay?: Partial<Needs>;
}

export interface NeedDef {
  id: NeedId;
  decayPerMinute: number;
  moodWeight: number;
}

export interface Catalog {
  needs: Record<NeedId, NeedDef>;
  objects: Record<string, ObjectDef>;
  traits: Record<string, TraitDef>;
  skills: Record<string, SkillDef>;
  careers: Record<string, CareerDef>;
}

// ---------- Estado ----------

export type EdgeKind = 'wall' | 'door';

export interface Grid {
  w: number;
  h: number;
  /** piso de cada tile, em ordem de linha (y * w + x) */
  floor: string[];
  /**
   * Paredes e portas ficam nas bordas entre tiles.
   * "x,y,N" = borda norte do tile (x,y); "x,y,W" = borda oeste.
   */
  edges: Record<string, EdgeKind>;
}

/** 0 = frente para o sul; cada passo gira um quarto de volta (S → E → N → W). */
export type Rotation = 0 | 1 | 2 | 3;

export interface WorldObject {
  id: number;
  defId: string;
  /** canto noroeste da área ocupada (já girada) */
  x: number;
  y: number;
  rot: Rotation;
  /** quanto foi pago (o valor de revenda sai daqui) */
  paid: number;
}

export type ActionPhase = 'queued' | 'walking' | 'using';

export interface Action {
  id: number;
  /** 'work' = ir até a calçada pegar a condução para o trabalho */
  kind: 'use' | 'goto' | 'work';
  source: 'player' | 'auto';
  objectId?: number;
  interactionId?: string;
  target?: Vec;
  phase: ActionPhase;
  elapsed: number;
}

export interface Folk {
  id: number;
  name: string;
  traits: string[];
  x: number;
  y: number;
  /** tile anterior, para a renderização interpolar o passo */
  px: number;
  py: number;
  facing: Vec;
  needs: Needs;
  /** queue[0] é a ação em andamento */
  queue: Action[];
  path: Vec[];
  autonomy: boolean;
  idleTicks: number;
  /** minutos restantes desmaiado de sono (0 = acordado) */
  collapsed: number;
  look: { skin: number; hair: number; shirt: number; pants: number };
  /** experiência acumulada por habilidade (o nível sai daqui) */
  skills: Record<string, number>;
  job: Job | null;
  /** fora de casa, no turno de trabalho */
  away: Away | null;
}

export interface Job {
  careerId: string;
  /** índice em CareerDef.levels */
  level: number;
  /** -100 a 100 */
  performance: number;
  /** último dia (índice, a partir de 0) em que foi chamado para o turno */
  calledDay: number;
  /** último dia em que o turno foi resolvido (trabalhado ou perdido) */
  doneDay: number;
  shifts: number;
}

export interface Away {
  /** tick em que volta para casa */
  until: number;
  /** minutos de atraso na saída */
  late: number;
  /** humor na hora de sair */
  mood: number;
}

export interface Household {
  /** tostões em caixa; pode ficar negativo (dívida) */
  funds: number;
  /** próximo tick em que as contas chegam */
  nextBills: number;
  /** valor da última conta paga */
  lastBill: number;
}

export interface LogEntry {
  tick: number;
  key: string;
  params?: Record<string, string | number>;
}

export type Speed = 0 | 1 | 2 | 3;

export interface World {
  /** 1 tick = 1 minuto de jogo */
  tick: number;
  speed: Speed;
  rngState: number;
  nextId: number;
  grid: Grid;
  objects: WorldObject[];
  folks: Folk[];
  household: Household;
  /** tile na calçada de onde a condução sai */
  exit: Vec;
  log: LogEntry[];
}

// ---------- Comandos (única porta de entrada do jogador) ----------

export type Command =
  | { type: 'queueUse'; folkId: number; objectId: number; interactionId: string }
  | { type: 'queueGoto'; folkId: number; x: number; y: number }
  | { type: 'cancel'; folkId: number; actionId: number }
  | { type: 'setAutonomy'; folkId: number; on: boolean }
  | { type: 'setSpeed'; speed: Speed }
  | { type: 'buy'; defId: string; x: number; y: number; rot: Rotation }
  | { type: 'sell'; objectId: number }
  | { type: 'move'; objectId: number; x: number; y: number; rot: Rotation }
  | { type: 'takeJob'; folkId: number; careerId: string }
  | { type: 'quitJob'; folkId: number };
