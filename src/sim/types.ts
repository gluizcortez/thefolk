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
  /** visitas não usam (cama, chuveiro) */
  residentOnly?: boolean;
  /** efeito especial ao terminar: 'invite' = convida o vizinho `otherId` da ação */
  special?: 'invite';
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
  /** quantos folks usam ao mesmo tempo (padrão: 1) */
  slots?: number;
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
  /** chave de texto com a descrição curta */
  hint?: string;
  /** traços dos outros que este folk acha simpáticos */
  likes?: string[];
  /** traços dos outros que dão atrito */
  dislikes?: string[];
  /** gosto por cada tipo de interação social (1 = neutro) */
  social?: Partial<Record<SocialCategory, number>>;
  /** multiplica o peso que a IA dá a cada necessidade */
  needWeight?: Partial<Needs>;
  /** multiplica o decaimento de cada necessidade */
  decay?: Partial<Needs>;
}

// ---------- Relações ----------

export type SocialCategory = 'friendly' | 'romantic' | 'professional' | 'mean';
export type RelAxis = 'friendship' | 'romance' | 'respect';
export type RelDelta = Partial<Record<RelAxis, number>>;

export type SocialAnim = 'talk' | 'laugh' | 'wave' | 'hug' | 'kiss' | 'argue';

/** Lembranças guardadas por quem viveu o momento (chave em `memories` de data/). */
export interface MemoryDef {
  id: string;
  /** chave de texto; recebe {name} */
  label: string;
  /** quanto a lembrança pesa a favor (ou contra) quando o outro puxa conversa */
  weight: number;
  /** guarda só a primeira vez */
  once?: boolean;
  /** chave de texto de aviso quando a lembrança nasce (recebe {name} e {other}) */
  log?: string;
}

export interface SocialRequires {
  /** amizade mínima de quem puxa a conversa pelo outro */
  friendship?: number;
  /** amizade máxima */
  maxFriendship?: number;
  romance?: number;
  /** false = só para quem ainda não se conhece; 'any' = tanto faz (padrão: já se conhecem) */
  known?: boolean | 'any';
  dating?: boolean;
  /** o alvo precisa ser visita (true) ou morador (false) */
  visitor?: boolean;
  /** quem puxa precisa morar na casa */
  resident?: boolean;
}

export interface SocialDef {
  id: string;
  label: string;
  category: SocialCategory;
  /** minutos quando o outro topa */
  duration: number;
  /** efeito por minuto em quem puxa a conversa */
  effects: Partial<Needs>;
  /** efeito por minuto no outro (padrão: o mesmo de `effects`) */
  targetEffects?: Partial<Needs>;
  /** chance base de o outro topar, de 0 a 1 */
  accept: number;
  /** soma à chance quando o outro tem o traço */
  traitAccept?: Record<string, number>;
  requires?: SocialRequires;
  /** como o outro passa a ver quem puxou (topou / recusou) */
  toTarget: RelDelta;
  toSelf: RelDelta;
  rejectTarget?: RelDelta;
  rejectSelf?: RelDelta;
  /** lembranças marcadas quando topa / quando recusa */
  memory?: { self?: string; target?: string };
  rejectMemory?: { self?: string; target?: string };
  /** a IA pode escolher sozinha (padrão: true) */
  autonomous?: boolean;
  special?: 'date' | 'moveIn' | 'sendHome';
  skill?: { id: string; xpPerMinute: number };
  /** animação de quem puxa e de quem ouve */
  anim: SocialAnim;
  targetAnim?: SocialAnim;
  /** respeito sobe com o nível de lábia de quem fala */
  respectFromCharisma?: boolean;
}

export interface Memory {
  tick: number;
  kind: string;
}

/** Como um folk vê outro (as relações têm direção: A pode gostar de B sem volta). */
export interface Relation {
  /** -100 a 100 */
  friendship: number;
  romance: number;
  respect: number;
  /** namorando (vale para os dois lados) */
  dating: boolean;
  /** tick do último contato */
  last: number;
  /** cansaço de repetir interações em pouco tempo (reduz o ganho) */
  tired: number;
  memories: Memory[];
}

export interface Neighbor {
  id: number;
  name: string;
  traits: string[];
  look: Folk['look'];
  skills: Record<string, number>;
  /** onde trabalha (só para conversa e respeito; o turno dele não é simulado) */
  career: { id: string; level: number } | null;
}

export interface Visit {
  /** tick em que vai embora */
  until: number;
  /** já está indo embora */
  leaving: boolean;
  /** quem convidou (0 = apareceu sem avisar) */
  hostId: number;
}

export interface PendingVisit {
  neighborId: number;
  at: number;
  hostId: number;
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
  socials: Record<string, SocialDef>;
  memories: Record<string, MemoryDef>;
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

/**
 * 'work' = ir até a calçada pegar a condução para o trabalho;
 * 'social' = puxar conversa com `otherId`; 'listen' = dar atenção a quem puxou;
 * 'leave' = visita indo embora.
 */
export type ActionKind = 'use' | 'goto' | 'work' | 'social' | 'listen' | 'leave';

export interface Action {
  id: number;
  kind: ActionKind;
  source: 'player' | 'auto';
  objectId?: number;
  interactionId?: string;
  target?: Vec;
  /** o outro folk (social, listen) ou o vizinho convidado (use com 'invite') */
  otherId?: number;
  socialId?: string;
  /** resultado da conversa, sorteado quando ela começa */
  accepted?: boolean;
  /** minutos esperando um objeto ou alguém ficar livre */
  waited?: number;
  /** lugar no objeto (sofá de dois lugares, por exemplo) */
  slot?: number;
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
  /** null = mora na casa; senão é uma visita */
  visit: Visit | null;
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
  /** tile na calçada de onde a condução sai (e por onde as visitas chegam) */
  exit: Vec;
  log: LogEntry[];
  /** quem mora na vizinhança e pode aparecer */
  neighbors: Neighbor[];
  /** relações por par dirigido: chave "de>para" (ids) */
  relations: Record<string, Relation>;
  /** visitas combinadas por telefone */
  pendingVisits: PendingVisit[];
  /** tick da última visita sem aviso */
  lastDropIn: number;
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
  | { type: 'queueSocial'; folkId: number; otherId: number; socialId: string }
  | { type: 'invite'; folkId: number; neighborId: number }
  | { type: 'takeJob'; folkId: number; careerId: string }
  | { type: 'quitJob'; folkId: number };
