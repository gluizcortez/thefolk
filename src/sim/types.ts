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
  special?: 'invite' | 'services' | 'payBills' | 'fair' | 'call' | 'answer' | 'party' | 'buffet';
  /** bloco 9: petisco da mesa de festa (só com petisco na mesa) */
  snacks?: 'eat';
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
  /** bloco 7: botão do som ('on' liga, 'next' troca de estação, 'off' desliga) */
  tune?: 'on' | 'next' | 'off';
  /**
   * bloco 4: atividade a dois. Com outro folk usando a mesma interação no
   * mesmo objeto ao mesmo tempo, cada um ganha estes efeitos a mais por minuto
   * e a amizade sobe (por minuto) entre os dois.
   */
  duo?: DuoDef;
  /** bloco 4: comida que se come sentado à mesa, se houver lugar livre */
  atTable?: boolean;
  /** bloco 4: só dá com o céu escuro (luneta) */
  night?: boolean;
  /** bloco 5: troca a roupa de sempre do folk (guarda-roupa) */
  dress?: Outfit;
  /** bloco 5: roupa só enquanto dura (pijama na cama, roupão no chuveiro) */
  wear?: Wear;
  /** bloco 5: o que o folk segura na mão enquanto dura (só visual) */
  hold?: HeldProp;
  /** dicas só para a renderização */
  pose?: Pose;
  onObject?: boolean;
}

// ---------- Bloco 5: temperamento, nascimento, corpo e roupa ----------

/** Os cinco eixos do temperamento, de 0 a 10. */
export type TemperAxis = 'order' | 'outgoing' | 'pep' | 'wit' | 'warmth';
export type Temper = Record<TemperAxis, number>;

/** Roupa de sempre, escolhida no guarda-roupa. */
export type Outfit = 'day' | 'formal' | 'sleep' | 'swim' | 'work';
/** O que o folk pode estar vestindo: a roupa de sempre ou o roupão do banho. */
export type Wear = Outfit | 'bath';
/** Coisa que aparece na mão do folk. */
export type HeldProp = 'plate' | 'book' | 'phone' | 'rag' | 'cup';

/** Mês de nascimento: temperamento sugerido e com quem combina. */
export interface MonthDef {
  id: number;
  name: string;
  /** chave de texto com a descrição curta */
  hint: string;
  temper: Temper;
  /** meses com quem se dá bem logo de cara */
  likes: number[];
  /** meses com quem tem atrito */
  dislikes: number[];
}

// ---------- Bloco 6: vontade própria, balões e desejos ----------

/**
 * O que aparece no balão sobre a cabeça: 'want' = uma necessidade pedindo;
 * 'refuse' = recusou uma ordem (o ícone diz por quê); 'mess' = reclama da
 * sujeira; 'miss' = saudade de alguém (`other`); 'chat' = o que acha da
 * conversa; 'wish' = cumpriu um desejo; 'alarm' = o despertador tocou.
 */
export type ThoughtKind = 'want' | 'refuse' | 'mess' | 'miss' | 'chat' | 'wish' | 'alarm' | 'topic';

export interface Thought {
  kind: ThoughtKind;
  /** id do ícone (necessidade, categoria de conversa, 'yes', 'no', 'mood'...) */
  icon: string;
  /** tick em que nasceu */
  at: number;
  /** tick em que some */
  until: number;
  /** de quem sente saudade, com quem conversa */
  other?: number;
}

/**
 * Tipos de desejo: 'talk' = conversa aceita com alguém; 'use' = minutos numa
 * das interações da lista; 'skill' = minutos treinando uma habilidade; 'buy' =
 * comprar um objeto da categoria; 'tidy' = arrumar ou limpar algumas coisas;
 * 'host' = receber uma visita convidada.
 */
export type WishKind = 'talk' | 'use' | 'skill' | 'buy' | 'tidy' | 'host';

export interface WishDef {
  id: string;
  /** chave de texto; recebe {other}, {skill} e {category} */
  label: string;
  /** ícone do desejo (os mesmos do balão) */
  icon: string;
  kind: WishKind;
  /** peso no sorteio */
  weight: number;
  /** quanto cada eixo do temperamento puxa (peso x (1 + valor x eixo)) */
  temper?: Partial<Temper>;
  /** quanto cada traço multiplica o peso */
  traits?: Record<string, number>;
  /** 'use': interações que contam */
  interactions?: string[];
  /** 'talk': categorias de conversa que contam (padrão: amigável) */
  socials?: SocialCategory[];
  /** 'talk' romântico: só com quem já tem romance */
  romance?: boolean;
  /** 'buy': categoria do objeto */
  category?: ObjectCategory;
  /** minutos (use, skill) ou vezes (talk, tidy, buy, host) para cumprir */
  amount: number;
}

/** Um desejo do dia de um folk. */
export interface Wish {
  id: number;
  defId: string;
  /** com quem ('talk') */
  other?: number;
  /** qual habilidade ('skill') */
  skill?: string;
  progress: number;
  done: boolean;
}

/** Bloco 4: o que uma atividade a dois dá a mais quando tem parceiro. */
export interface DuoDef {
  /** efeitos extras por minuto, para cada um */
  effects: Partial<Needs>;
  /** amizade por minuto entre os dois (antes da afinidade e do cansaço) */
  friendship: number;
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
  | 'hobbies'
  | 'games';

/** Bloco 4: faixa de preço (0 = barato, 1 = médio, 2 = caro). */
export type Tier = 0 | 1 | 2;

/** Bloco 4: papel do objeto numa refeição à mesa. */
export type Dining = 'table' | 'seat' | 'both';

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
  /** bloco 4: faixa de preço (padrão 1, médio) */
  tier?: Tier;
  /** bloco 4: função que agrupa as faixas (cama, sofá, geladeira...) */
  line?: string;
  /** bloco 4: cores que dá para escolher na compra (a primeira é a padrão) */
  colors?: string[];
  /** bloco 4: mesa, lugar para sentar à mesa, ou os dois (mesa com cadeiras) */
  dining?: Dining;
  /** bloco 8: só entra no catálogo quando alguém da casa chega a este cargo */
  reward?: { career: string; level: number };
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
  /** bloco 8: amigos da família exigidos para chegar a este cargo */
  friends: number;
}

/** Bloco 8: forma do veículo da carona. */
export type VehicleKind = 'compact' | 'sedan' | 'wagon' | 'van' | 'minibus' | 'pickup' | 'jeep' | 'limo' | 'truck' | 'sport';

/** Bloco 8: a carona de uma faixa de cargos. */
export interface VehicleDef {
  kind: VehicleKind;
  /** cor da lataria e da faixa */
  color: number;
  stripe: number;
  /** o que vai no teto */
  roof?: 'lights' | 'rack' | 'ladder' | 'sign' | 'horn';
}

/** Bloco 8: modelo do uniforme. */
export type UniformStyle = 'shirt' | 'coat' | 'overall' | 'apron' | 'jacket' | 'track' | 'sash';

/** Bloco 8: uniforme de uma faixa de cargos. */
export interface UniformDef {
  style: UniformStyle;
  top: number;
  bottom: number;
  accent: number;
  hat?: 'cap' | 'toque' | 'helmet' | 'beret' | 'band' | 'top';
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
  /** bloco 8: carona e uniforme por faixa de cargos (veja `tierOfLevel`) */
  vehicles: VehicleDef[];
  uniforms: UniformDef[];
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
  /** bloco 8: evento que volta dias depois como consequência */
  chain?: { event: string; days: number };
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
  /** bloco 8: só acontece como consequência de outro evento (nunca no sorteio) */
  chained?: boolean;
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
  /** bloco 5: para que lado o traço puxa o temperamento sugerido */
  temper?: Partial<Temper>;
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
  /** bloco 9: a conversa tem assunto (quem ouve reage ao gosto dele) */
  topic?: boolean;
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
  /** bloco 5 */
  temper: Temper;
  month: number;
  skills: Record<string, number>;
  /** bloco 2: presta serviço para as casas do bairro */
  service?: ServiceKind;
  /** onde trabalha (o turno dele não é simulado, mas ele é colega de verdade) */
  career: { id: string; level: number } | null;
  /** manda no lugar onde trabalha */
  boss?: boolean;
  /** bloco 8: perdeu o emprego e procura outro */
  wasFired?: boolean;
  /** bloco 9: gosto por assunto (-5 a 5); veja sim/topics.ts */
  interests?: Record<string, number>;
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
  /** bloco 9: convidado da festa (fica até a festa acabar) */
  party?: boolean;
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
  /** bloco 9: vem para a festa */
  party?: boolean;
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
  /** bloco 5 */
  months: MonthDef[];
  /** bloco 6 */
  wishes: Record<string, WishDef>;
  /** bloco 9 */
  topics: Record<string, TopicDef>;
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
  /** bloco 4: cor escolhida na compra (padrão: a primeira de `colors`) */
  color?: string;
  /** bloco 4: tick da compra (sem isso, veio com a casa) */
  bought?: number;
  /** bloco 4: minutos de uso desde que chegou (desvaloriza) */
  used?: number;
  /** bloco 4: minutos de uso por morador (id) */
  uses?: Record<string, number>;
  /** bloco 4: de quem é o objeto querido (id do morador) */
  beloved?: number;
  /** bloco 7: estação tocando no som (sem isso, desligado) */
  tune?: string;
  /** bloco 9: petiscos na mesa de festa */
  snacks?: number;
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
export type ActionKind = 'use' | 'goto' | 'work' | 'social' | 'listen' | 'leave' | 'tidy' | 'door' | 'circle';

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
  /** bloco 4: comida já servida, levada para comer neste lugar à mesa */
  eatAt?: number;
  /** bloco 9: roda de conversa de que participa (circle) */
  circleId?: number;
  /** bloco 9: assunto escolhido (papo e telefone) */
  topic?: string;
  /** bloco 9: convidados chamados para a festa (use com 'party') */
  guests?: number[];
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
  look: Look;
  /** bloco 5: temperamento em cinco eixos (soma TEMPER_BUDGET) */
  temper: Temper;
  /** bloco 5: mês de nascimento (0 a 11) */
  month: number;
  /** bloco 5: roupa de sempre */
  outfit: Outfit;
  /** bloco 5: minutos de hábito por eixo desde a última virada (sinal = para que lado puxa) */
  habits: Partial<Temper>;
  /** bloco 6: o que está no balão agora */
  thought: Thought | null;
  /** bloco 6: desejos do dia (até 3) */
  wishes: Wish[];
  /** bloco 6: dia (índice) em que os desejos foram sorteados (-1 = nunca) */
  wishDay: number;
  /** bloco 6: ânimo guardado (desejos cumpridos), gasto num dia inspirado */
  spark: number;
  /** bloco 6: tick até quando está inspirado (treino em dobro) */
  inspired: number;
  /** bloco 6: despertador ligado (acorda antes do turno) */
  alarm: boolean;
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
  /** bloco 9: gosto por assunto (-5 a 5); veja sim/topics.ts */
  interests?: Record<string, number>;
  /** bloco 9: minutos parado esperando alguém sair da frente */
  blocked?: number;
}

/** Aparência: índices nas paletas da arte. */
export interface Look {
  skin: number;
  /** cor do cabelo */
  hair: number;
  shirt: number;
  pants: number;
  /** bloco 5: corte de cabelo (0 a 3) */
  style: number;
  /** bloco 5: traços do rosto (0 a 2) */
  face: number;
  /** bloco 5: corpo 0 = magro, 1 = médio, 2 = forte */
  body: number;
  /** bloco 5: cores da roupa formal, do pijama e do traje de banho */
  formal: number;
  sleepwear: number;
  swimwear: number;
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
  /** bloco 8: consequência marcada para um turno futuro */
  chain?: { defId: string; actorId: number; day: number } | null;
  /** bloco 8: a carona buzinou de novo (dia) */
  honkDay?: number;
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
  /** bloco 8: recompensas de carreira liberadas no catálogo (ids de objeto) */
  unlocked: string[];
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
  /** bloco 9: rodas de conversa em andamento */
  circles: Circle[];
  /** bloco 9: festa marcada ou acontecendo */
  party: Party | null;
  /** bloco 9: como foi a última festa */
  lastParty: PartyResult | null;
  /** bloco 9: telefone tocando (ou em ligação recebida) */
  call: PhoneCall | null;
}

// ---------- Bloco 9: assuntos, rodas, telefone e festas ----------

/** Um assunto de conversa. */
export interface TopicDef {
  id: string;
  /** chave de texto */
  name: string;
  /** quanto cada eixo do temperamento puxa o gosto (por ponto acima de 5) */
  axes: Partial<Record<TemperAxis, number>>;
  /** traços que gostam (+) ou não suportam (-) */
  traits?: Record<string, number>;
  /** habilidade que faz gostar do assunto */
  skill?: string;
}

/** Roda de conversa: até 4 pessoas em volta de um tile vazio, falando por turnos. */
export interface Circle {
  id: number;
  /** tile do meio (fica vazio) */
  center: Vec;
  /** quem está na roda e em que lado do meio fica (0 N, 1 E, 2 S, 3 W) */
  members: { id: number; spot: number }[];
  /** quem está com a palavra (0 = ninguém chegou ainda) */
  speaker: number;
  topic: string;
  /** tick em que a vez passa */
  turnEnds: number;
  /** tick em que a roda se desfaz */
  until: number;
  started: number;
}

/** Festa: convidados chamados por telefone, nota pela animação deles. */
export interface Party {
  host: number;
  /** tick em que começa (os convidados chegam por volta disso) */
  start: number;
  /** tick em que acaba */
  end: number;
  /** quem confirmou */
  guests: number[];
  /** soma das médias de animação medidas */
  score: number;
  samples: number;
  /** brigas de rivais durante a festa */
  brawls: number;
  /** reclamações de barulho */
  complaints: number;
  /** a mesa de petiscos foi montada */
  buffet: boolean;
}

export interface PartyResult {
  tick: number;
  host: number;
  guests: number;
  /** animação média (0 a 100), já com descontos */
  score: number;
  /** estrelas, de 1 a 5 */
  grade: number;
  brawls: number;
  complaints: number;
}

/** Ligação recebida. */
export interface PhoneCall {
  /** vizinho que ligou */
  from: number;
  /** tick em que começou a tocar */
  rang: number;
  /** por que ligou: papo, fofoca ou chamar para uma visita */
  reason: 'chat' | 'gossip' | 'visit';
  /** quem atendeu (0 = ninguém ainda) */
  answeredBy: number;
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
  | { type: 'buy'; defId: string; x: number; y: number; rot: Rotation; color?: string }
  | { type: 'undoBuy' }
  | { type: 'closeBuy' }
  | { type: 'sell'; objectId: number }
  | { type: 'move'; objectId: number; x: number; y: number; rot: Rotation }
  | { type: 'queueSocial'; folkId: number; otherId: number; socialId: string; topic?: string }
  | { type: 'invite'; folkId: number; neighborId: number }
  | { type: 'takeJob'; folkId: number; careerId: string }
  | { type: 'quitJob'; folkId: number }
  | { type: 'workChoice'; folkId: number; choice: number }
  | { type: 'askRaise'; folkId: number }
  | { type: 'takeGig'; folkId: number; offerId: number }
  | { type: 'dropGig'; folkId: number }
  | { type: 'openBusiness'; folkId: number; businessId: string }
  | { type: 'closeBusiness'; folkId: number }
  // bloco 6
  | { type: 'inspire'; folkId: number }
  | { type: 'setAlarm'; folkId: number; on: boolean }
  // bloco 9
  | { type: 'startCircle'; folkId: number; otherIds: number[] }
  | { type: 'joinCircle'; folkId: number; circleId: number }
  | { type: 'phoneFriend'; folkId: number; neighborId: number }
  | { type: 'throwParty'; folkId: number; guestIds: number[] }
  | { type: 'answerPhone'; folkId: number }
  // modo construção: linhas de paredes vão de vértice a vértice do grid
  | { type: 'buildWalls'; x0: number; y0: number; x1: number; y1: number }
  | { type: 'eraseWalls'; x0: number; y0: number; x1: number; y1: number }
  | { type: 'placeOpening'; edge: string; kind: 'door' | 'window' }
  | { type: 'paintFloor'; x0: number; y0: number; x1: number; y1: number; floorId: string }
  | { type: 'paintWalls'; faces: string[]; coveringId: string }
  | { type: 'undoBuild' };
