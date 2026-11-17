// Tipos do núcleo de simulação. Nada aqui (nem em sim/) pode importar Phaser ou DOM.
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
  /** dicas só para a renderização */
  pose?: Pose;
  onObject?: boolean;
}

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

export interface WorldObject {
  id: number;
  defId: string;
  x: number;
  y: number;
}

export type ActionPhase = 'queued' | 'walking' | 'using';

export interface Action {
  id: number;
  kind: 'use' | 'goto';
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
  log: LogEntry[];
}

// ---------- Comandos (única porta de entrada do jogador) ----------

export type Command =
  | { type: 'queueUse'; folkId: number; objectId: number; interactionId: string }
  | { type: 'queueGoto'; folkId: number; x: number; y: number }
  | { type: 'cancel'; folkId: number; actionId: number }
  | { type: 'setAutonomy'; folkId: number; on: boolean }
  | { type: 'setSpeed'; speed: Speed };
