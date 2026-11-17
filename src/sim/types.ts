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
  /**
   * efeito especial: 'invite' = convida o vizinho `otherId` da ação;
   * 'services' = liga para um serviço (`serviceId` da ação); 'payBills' =
   * paga as contas da caixa de correio; 'fair' = compra na feira da rua.
   */
  special?: 'invite' | 'services' | 'payBills' | 'fair';
  /** bloco 2: porções que tira da despensa ao começar (sem estoque, não dá) */
  portions?: number;
  /** bloco 2: come da comida pronta que chegou pela entrega */
  takeout?: boolean;
  /**
   * trabalho por conta própria feito neste objeto: 'gig' = adianta o frila
   * do folk; 'business' = cuida do negócio próprio. Só vale com um frila ou
   * negócio que aceite este objeto (veja data/gigs.ts e data/businesses.ts).
   */
  task?: 'gig' | 'business';
  /**
   * bloco 1: cuidado com o próprio objeto. 'clean' tira a sujeira, 'repair'
   * conserta o que quebrou, 'service' faz revisão (tira desgaste), 'empty'
   * esvazia a lixeira, 'dishes' lava a louça e 'dump' joga o saco fora.
   * Só aparecem quando há o que fazer (veja sim/upkeep.ts).
   */
  care?: CareKind;
  /** não aparece no menu nem para a IA: só vem encadeada de outra ação */
  hidden?: boolean;
  /** o que fica para trás quando termina (prato, poça), com a chance */
  leaves?: { kind: MessKind; chance: number };
  /** quanto lixo vai para a lixeira da cozinha ao terminar (0..100) */
  trash?: number;
  /** bloco 3: interruptor da luminária ('on' acende, 'off' apaga) */
  light?: 'on' | 'off';
  /** dicas só para a renderização */
  pose?: Pose;
  onObject?: boolean;
}

export type CareKind = 'clean' | 'repair' | 'service' | 'empty' | 'dishes' | 'dump';

/** Bagunça solta: prato sujo, poça, lixo no chão. */
export type MessKind = 'plate' | 'puddle' | 'trash' | 'paper';

/** Como um objeto se suja e se gasta com o uso (por minuto de uso). */
export interface UpkeepDef {
  /** sujeira por minuto de uso */
  dirt?: number;
  /** desgaste por minuto de uso */
  wear?: number;
  /** quebra com o desgaste */
  breaks?: boolean;
  /** lixeira: guarda até 100 de lixo e fede quando enche */
  bin?: boolean;
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
  /** bloco 1: como suja, gasta e quebra */
  upkeep?: UpkeepDef;
  /** bloco 2: quantas porções de comida guarda (geladeira) */
  pantry?: number;
  /** bloco 2: o oficial de penhora não leva (caixa de correio, latão) */
  fixture?: boolean;
  /**
   * bloco 3: camada fora do chão. 'wall' = pendurado na parede atrás do tile
   * (quadro, relógio); 'floor' = rente ao chão (tapete); 'ceiling' = no teto
   * (luminária). Nenhuma delas fecha passagem; só se chocam com a mesma camada.
   */
  layer?: ObjectLayer;
  /** bloco 3: quanto ilumina o cômodo quando acesa (1 = um cômodo médio inteiro) */
  light?: number;
  /** bloco 3: que cômodo este objeto sugere (dá nome ao cômodo: 'kitchen', 'bath'...) */
  room?: string;
}

export type ObjectLayer = 'wall' | 'floor' | 'ceiling';

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
  /** chave de texto com o nome do lugar de trabalho */
  workplace?: string;
}

// ---------- Fatia 5: dia de trabalho, frilas, negócio, fofoca ----------

/** Quem aparece num evento do expediente. */
export type WorkActor = 'boss' | 'coworker' | 'none';

/** O que uma escolha faz acontecer. */
export interface WorkOutcome {
  /** chave de texto do resultado; recebe {name} e {actor} */
  text: string;
  /** soma direto no desempenho */
  performance?: number;
  /** como o ator do evento passa a ver o folk */
  actor?: RelDelta;
  /** como o folk passa a ver o ator */
  self?: RelDelta;
  /** como o chefe passa a ver o folk (quando o ator é um colega) */
  boss?: RelDelta;
  /** como cada colega passa a ver o folk */
  coworkers?: RelDelta;
  /** efeito imediato nas necessidades */
  needs?: Partial<Needs>;
  /** tostões que entram (ou saem) na hora */
  money?: number;
  /** experiência ganha numa habilidade */
  xp?: { id: string; amount: number };
  /** lembranças: do folk sobre o ator e do ator sobre o folk */
  memory?: { self?: string; actor?: string };
  /** notícia que nasce sobre o folk e corre pela vizinhança */
  news?: string;
  /** a notícia é sobre o ator, não sobre o folk */
  newsAboutActor?: boolean;
  /** é um gesto romântico com o ator (vale ciúme e traição) */
  romantic?: boolean;
}

export interface WorkChoiceDef {
  /** chave de texto do botão */
  label: string;
  /** quanto cada traço puxa para esta escolha quando o folk decide sozinho */
  traits?: Record<string, number>;
  /**
   * teste de sorte: chance = base + perLevel x nível da habilidade (+ humor e
   * respeito do ator, quando marcados). Sem teste, sempre dá `success`.
   */
  check?: { skill?: string; base: number; perLevel?: number; mood?: boolean; actorRespect?: boolean };
  success: WorkOutcome;
  fail?: WorkOutcome;
}

/** Um acontecimento do expediente, com escolhas. */
export interface WorkEventDef {
  id: string;
  /** chave de texto; recebe {name} e {actor} */
  text: string;
  /** carreiras onde pode acontecer (padrão: todas) */
  careers?: string[];
  actor: WorkActor;
  /** cargo mínimo (índice) */
  minLevel?: number;
  /** peso no sorteio (padrão 1) */
  weight?: number;
  /** só sai quando o folk vê o ator dentro destes limites de amizade */
  requires?: { friendshipBelow?: number; friendshipAbove?: number };
  choices: WorkChoiceDef[];
}

/** Um trabalho avulso do mural de frilas. */
export interface GigDef {
  id: string;
  name: string;
  skill: string;
  /** nível mínimo da habilidade para pegar */
  minLevel: number;
  /** minutos de trabalho (no nível 0) para entregar */
  work: number;
  /** pagamento base, em tostões */
  pay: number;
  /** dias de prazo */
  days: number;
  /** objetos onde dá para fazer */
  objects: string[];
}

/** Negócio próprio que um folk pode abrir em casa. */
export interface BusinessDef {
  id: string;
  name: string;
  /** custo para abrir */
  cost: number;
  skill: string;
  /** objetos onde se trabalha nele */
  objects: string[];
  /** despesa por dia */
  upkeep: number;
  /** quanto cada freguês deixa */
  price: number;
  /** fregueses por dia com qualidade média */
  customers: number;
}

/** Notícia que corre de boca em boca. */
export interface NewsDef {
  id: string;
  /** chave de texto; recebe {name} (de quem se fala) e {other} */
  label: string;
  /** quanto a reputação de quem é o assunto muda a cada pessoa que fica sabendo */
  reputation: number;
  /** como quem ouve passa a ver o assunto (só se já o conhece) */
  opinion?: RelDelta;
  /** de 0 a 1: vontade de passar adiante */
  juicy: number;
  /** quem namora o assunto e fica sabendo sente ciúme de {other} */
  jealousy?: boolean;
  /** dias até cair no esquecimento */
  days: number;
}

/** Jeitos de cômodo de que um traço gosta ou desgosta. */
export type RoomTaste = 'small' | 'large' | 'full' | 'bare' | 'cozy' | 'bright';

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
  /** quanto sente ciúme (1 = normal) */
  jealousy?: number;
  /** quanto gosta de passar fofoca adiante (1 = normal) */
  gossip?: number;
  /** bloco 1: vontade de limpar e consertar (1 = normal) */
  tidy?: number;
  /** quanto a bagunça incomoda (1 = normal) */
  messSense?: number;
  /** bloco 3: gosto por tipo de cômodo (pontos de ambiente a mais ou a menos) */
  roomTaste?: Partial<Record<RoomTaste, number>>;
  /** bloco 3: chance de apagar a luz ao sair de um cômodo vazio (padrão 0.4) */
  saver?: number;
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
  /** o outro guarda mágoa de quem puxa (lembranças somando -3 ou menos) */
  grudge?: boolean;
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
  special?: 'date' | 'moveIn' | 'sendHome' | 'breakUp' | 'gossip';
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
  /** bloco 2: presta serviço para as casas do bairro */
  service?: ServiceKind;
  /** onde trabalha (o turno dele não é simulado, mas ele é colega de verdade) */
  career: { id: string; level: number } | null;
  /** manda no lugar onde trabalha */
  boss?: boolean;
}

export interface Visit {
  /** tick em que vai embora */
  until: number;
  /** já está indo embora */
  leaving: boolean;
  /** quem convidou (0 = apareceu sem avisar) */
  hostId: number;
  /** bloco 2: já entrou (antes disso espera na porta) */
  admitted: boolean;
  /** tick em que tocou a campainha (-1 = ainda não tocou) */
  rang: number;
  /** veio trabalhar na casa */
  service: ServiceVisit | null;
}

// ---------- Bloco 2: despensa, correio e serviços ----------

/** Quem trabalha para a casa: entregador, faxineira, técnico, oficial de penhora. */
export type ServiceKind = 'courier' | 'maid' | 'repair' | 'bailiff';

/** O que dá para pedir pelo telefone. */
export type ServiceOrder = 'groceries' | 'takeout' | 'maid' | 'repair';

export interface ServiceVisit {
  kind: ServiceKind;
  /** o que trouxe (entregas) */
  order: ServiceOrder | null;
  /** quanto cobra quando entrega ou vai embora */
  fee: number;
  /** tick em que começou a trabalhar dentro da casa */
  started: number;
  /** tarefas feitas (bagunças, limpezas, consertos) */
  done: number;
  /** objeto que o oficial de penhora vai levar */
  target: number;
  /** quem mais deixou bagunça (para a fofoca da faxineira) */
  blame: number;
}

/** Pedido feito por telefone, a caminho. */
export interface Order {
  id: number;
  kind: ServiceOrder;
  /** tick em que chega */
  at: number;
  /** tick prometido (comida pronta: atrasou, sai pela metade) */
  promised: number;
  /** quem pediu */
  by: number;
  /** quanto custa (mercado já foi pago no telefone) */
  price: number;
}

/** Uma conta que chegou pelo correio. */
export interface Bill {
  id: number;
  /** tick em que chegou */
  tick: number;
  /** tick do vencimento */
  due: number;
  power: number;
  water: number;
  furniture: number;
  /** quanto já foi coberto (pago ou penhorado) */
  covered: number;
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

// ---------- Construção ----------

/** Piso que dá para pôr num tile pelo modo construção. */
export interface FloorDef {
  id: string;
  /** chave de texto */
  name: string;
  /** tostões por tile */
  price: number;
  /** piso de fora (grama): o tile conta como quintal, não como cômodo */
  outdoor?: boolean;
  /** bloco 3: quanto o piso soma à nota do cômodo */
  ambience?: number;
  /** bloco 3: revestimento que a parede usa quando o jogador não escolheu */
  cover?: string;
}

/** Revestimento de uma face de parede (papel, azulejo, tijolo...). */
export interface CoveringDef {
  id: string;
  name: string;
  /** tostões por face de parede (um lado de um trecho de 1 m) */
  price: number;
  /** bloco 3: quanto o revestimento soma à nota do cômodo */
  ambience?: number;
}

/** Peças de parede: preço por trecho de parede, porta e janela. */
export interface BuildParts {
  wall: { price: number };
  door: { price: number };
  window: {
    price: number;
    /** quanto cada janela por perto soma ao ambiente */
    ambience: number;
  };
}

export interface Catalog {
  needs: Record<NeedId, NeedDef>;
  floors: Record<string, FloorDef>;
  coverings: Record<string, CoveringDef>;
  parts: BuildParts;
  objects: Record<string, ObjectDef>;
  traits: Record<string, TraitDef>;
  socials: Record<string, SocialDef>;
  memories: Record<string, MemoryDef>;
  skills: Record<string, SkillDef>;
  careers: Record<string, CareerDef>;
  workEvents: Record<string, WorkEventDef>;
  gigs: Record<string, GigDef>;
  businesses: Record<string, BusinessDef>;
  news: Record<string, NewsDef>;
}

// ---------- Estado ----------

/** Janela fecha a passagem como parede; porta deixa passar. */
export type EdgeKind = 'wall' | 'door' | 'window';

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
  /**
   * Revestimento de cada face de parede, por tile e lado: "x,y,S" é a face
   * da parede ao sul do tile (x,y), vista de dentro dele. Face sem entrada
   * usa o acabamento padrão (pelo piso do tile, ou tijolo do lado de fora).
   */
  coverings: Record<string, string>;
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
  /** bloco 1: sujeira, desgaste e conserto */
  state: ObjectState;
  /** bloco 3: luminária acesa */
  lit?: boolean;
}

export interface ObjectState {
  /** 0 a 100 */
  dirt: number;
  /** 0 a 100: quanto mais gasto, mais fácil quebrar */
  wear: number;
  broken: boolean;
  /** consertado na gambiarra: quebra de novo mais cedo */
  patched: boolean;
  /** quanto do conserto já foi feito (0 a 100) */
  repair: number;
  /** lixeira: quanto lixo tem (0 a 100) */
  fill: number;
}

/** Bagunça no chão (ou em cima de uma mesa). */
export interface Mess {
  id: number;
  kind: MessKind;
  x: number;
  y: number;
  tick: number;
  /** quem deixou (0 = ninguém em especial) */
  by: number;
}

export type ActionPhase = 'queued' | 'walking' | 'using';

/**
 * 'work' = ir até a calçada pegar a condução para o trabalho;
 * 'social' = puxar conversa com `otherId`; 'listen' = dar atenção a quem puxou;
 * 'leave' = visita indo embora.
 */
export type ActionKind = 'use' | 'goto' | 'work' | 'social' | 'listen' | 'leave' | 'tidy' | 'door';

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
  /** bagunça que vai recolher (tidy) */
  messId?: number;
  /** serviço pedido no telefone */
  serviceId?: ServiceOrder;
  /** atender a porta: deixa entrar (true) ou dispensa (false) */
  welcome?: boolean;
  /** resultado da conversa, sorteado quando ela começa */
  accepted?: boolean;
  /** minutos esperando um objeto ou alguém ficar livre */
  waited?: number;
  /** lugar no objeto (sofá de dois lugares, por exemplo) */
  slot?: number;
  /** bloco 3: já viu se precisava acender a luz antes de começar */
  lightChecked?: boolean;
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
  /** frila em andamento */
  gig: Gig | null;
  /** negócio próprio aberto */
  business: Business | null;
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
  /** aumento conquistado sobre o salário do cargo (0,1 = +10%) */
  raise: number;
  /** vai pedir aumento ao chefe no fim do próximo turno */
  raisePending: boolean;
  /** último dia em que pediu aumento (-99 = nunca) */
  lastRaiseDay: number;
}

/** Acontecimento do expediente esperando uma escolha. */
export interface PendingWorkEvent {
  defId: string;
  /** quem aparece no evento (0 = ninguém) */
  actorId: number;
  /** tick em que o folk decide sozinho, se o jogador não escolher */
  deadline: number;
}

export interface Gig {
  defId: string;
  /** pagamento combinado */
  pay: number;
  /** minutos de trabalho feitos (já com o bônus da habilidade) */
  progress: number;
  /** tick do prazo */
  deadline: number;
}

export interface GigOffer {
  id: number;
  defId: string;
  pay: number;
}

export interface Business {
  defId: string;
  /** 0 a 100: capricho do negócio; cai todo dia e sobe com trabalho */
  quality: number;
  /** dias aberto */
  days: number;
  /** lucro (ou prejuízo) do último dia */
  lastProfit: number;
  /** fregueses do último dia */
  lastCustomers: number;
  total: number;
}

export interface News {
  id: number;
  kind: string;
  /** de quem se fala */
  about: number;
  /** a outra pessoa da história (0 = ninguém) */
  other: number;
  tick: number;
  /** quem já sabe */
  knownBy: number[];
}

export interface Away {
  /** tick em que volta para casa */
  until: number;
  /** minutos de atraso na saída */
  late: number;
  /** humor na hora de sair */
  mood: number;
  /** evento do expediente esperando escolha */
  event: PendingWorkEvent | null;
  /** tick do próximo evento do expediente (-1 = não tem mais) */
  nextEvent: number;
}

export interface Household {
  /** tostões em caixa; pode ficar negativo (dívida) */
  funds: number;
  /** próximo tick em que as contas chegam */
  nextBills: number;
  /** valor da última conta que chegou */
  lastBill: number;
  /** bloco 2: porções de comida na despensa (geladeira) */
  pantry: number;
  /** porções de comida pronta que chegaram pela entrega */
  takeout: number;
  /** contas na caixa de correio, ainda não pagas */
  bills: Bill[];
  /** pedidos a caminho */
  orders: Order[];
  /** faxineira contratada (vem todo dia de manhã) */
  maid: boolean;
  /** último dia (índice) em que o jornal chegou */
  paperDay: number;
  /** dia em que alguém da casa leu o jornal (classificados abertos) */
  readDay: number;
  /** bloco 3: minutos de lâmpada acesa desde a última conta */
  lightMinutes: number;
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
  /** o que anda correndo de boca em boca */
  news: News[];
  /** reputação de cada pessoa na vizinhança, por id (-100 a 100) */
  reputation: Record<string, number>;
  /** mural de frilas do dia */
  gigBoard: GigOffer[];
  /** bloco 1: pratos sujos, poças e lixo pela casa */
  mess: Mess[];
}

// ---------- Comandos (única porta de entrada do jogador) ----------

export type Command =
  | { type: 'queueUse'; folkId: number; objectId: number; interactionId: string }
  | { type: 'queueGoto'; folkId: number; x: number; y: number }
  | { type: 'queueTidy'; folkId: number; messId: number }
  | { type: 'callService'; folkId: number; service: ServiceOrder }
  | { type: 'dismissService'; service: 'maid' }
  | { type: 'answerDoor'; folkId: number; otherId: number; welcome: boolean }
  | { type: 'cancel'; folkId: number; actionId: number }
  | { type: 'setAutonomy'; folkId: number; on: boolean }
  | { type: 'setSpeed'; speed: Speed }
  | { type: 'buy'; defId: string; x: number; y: number; rot: Rotation }
  | { type: 'sell'; objectId: number }
  | { type: 'move'; objectId: number; x: number; y: number; rot: Rotation }
  | { type: 'queueSocial'; folkId: number; otherId: number; socialId: string }
  | { type: 'invite'; folkId: number; neighborId: number }
  | { type: 'takeJob'; folkId: number; careerId: string }
  | { type: 'quitJob'; folkId: number }
  | { type: 'workChoice'; folkId: number; choice: number }
  | { type: 'askRaise'; folkId: number }
  | { type: 'takeGig'; folkId: number; offerId: number }
  | { type: 'dropGig'; folkId: number }
  | { type: 'openBusiness'; folkId: number; businessId: string }
  | { type: 'closeBusiness'; folkId: number }
  // modo construção: linhas de paredes vão de vértice a vértice do grid
  | { type: 'buildWalls'; x0: number; y0: number; x1: number; y1: number }
  | { type: 'eraseWalls'; x0: number; y0: number; x1: number; y1: number }
  | { type: 'placeOpening'; edge: string; kind: 'door' | 'window' }
  | { type: 'paintFloor'; x0: number; y0: number; x1: number; y1: number; floorId: string }
  | { type: 'paintWalls'; faces: string[]; coveringId: string }
  | { type: 'undoBuild' };
