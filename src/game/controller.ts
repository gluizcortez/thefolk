import type { KitParts } from '../sim/parts';
import type { ObjStyle } from '../sim/style';
import { styleFromColor } from '../sim/style';
import { LIFT_MAX, LIFT_MIN, cleanLook, priceWith, zonesOf } from '../sim/modular';
import { CATALOG } from '../data/catalog';
import { starterHouse } from '../data/house';
import { familyWorld } from '../data/family';
import { NEIGHBORS, NEIGHBOR_TIES } from '../data/neighbors';
import { TOWN } from '../data/town';
import { hasText, t } from '../i18n';
import { idbBackend } from '../platform/saveStore';
import type { SaveBackend, SlotId, SlotMeta } from '../platform/slots';
import {
  SLOT_IDS,
  adoptLegacy,
  currentSlot,
  defaultSlotName,
  deleteSlot,
  exportFileName,
  exportSave,
  freeSlot,
  importSave,
  listSlots,
  readSlot,
  renameSlot,
  setCurrentSlot,
  writeSlot,
} from '../platform/slots';
import { Sim, createWorld, isBuildCommand } from '../sim';
import type { Catalog, Command, LogEntry, FamilyDraft, LifePace, FenceKind, Folk, OpeningKind, Rotation, Side, Speed, World } from '../sim';
import { MAX_LEVELS, levelOfRow } from '../sim';
import { cleanName, familyProblem, foundTown, skipBlocker } from '../sim';

/** Comandos que dão ordem a um folk (Shift na tela põe na fila em vez de substituir). */
const ORDER_TYPES = new Set<Command['type']>([
  'queueUse',
  'queueGoto',
  'queueTidy',
  'mealAct',
  'callService',
  'answerDoor',
  'queueSocial',
  'invite',
  'joinCircle',
  'startCircle',
  'phoneFriend',
  'throwParty',
  'answerPhone',
  'planWedding',
  'seated',
  'watchTogether',
  'lookOut',
]);

export type Mode = 'live' | 'buy' | 'build';

/** Bloco 15: tela do lote (o jogo) ou do bairro (vista de cima com todos os lotes). */
export type Screen = 'lot' | 'town';

/**
 * Ferramenta do modo construção. Bloco 12: meia parede, coluna, escada,
 * telhado e os estilos de porta e janela (cada um é uma ferramenta).
 */
export type BuildTool = 'wall' | 'half' | 'erase' | 'column' | 'stairs' | OpeningKind | 'floor' | 'paint' | 'roof' | 'slab' | 'unslab' | FenceKind | 'yard';

/** Bloco 13: ferramentas que se arrastam de vértice a vértice (paredes, cercas, derrubar). */
export function isLineTool(tool: BuildTool): boolean {
  return tool === 'wall' || tool === 'half' || tool === 'erase' || tool === 'fence' || tool === 'lowwall';
}

/** Bloco 12: ferramentas que abrem vão numa parede. */
export const OPENING_TOOLS: OpeningKind[] = ['door', 'doorGlass', 'doorDouble', 'arch', 'window', 'windowTall', 'windowHigh'];

export function isOpeningTool(tool: BuildTool): tool is OpeningKind {
  return (OPENING_TOOLS as string[]).includes(tool) || tool === 'gate';
}

/** O que está sendo posto no chão no modo compra. */
export interface Placing {
  defId: string;
  rot: Rotation;
  /** quando é um objeto que já existe sendo movido */
  moveId?: number;
  /** bloco 4: cor escolhida no catálogo */
  color?: string;
  /** plano 2, bloco 8: peças e estilo escolhidos no editor */
  parts?: KitParts;
  style?: ObjStyle;
  /** plano 2, bloco 8: enfeite solto no tampo (deslocamento e giro em oitavos) */
  nudge?: { dx: number; dy: number };
  turn8?: number;
  /** plano 2, bloco 8: altura do objeto de parede (degraus) */
  lift?: number;
  /** plano 2, bloco 8: ainda não girou à mão (encosta sozinho na parede) */
  autoRot?: boolean;
  /** plano 2, bloco 11: objeto que sai do inventário da família (já é dela, não paga) */
  storedId?: number;
}
import type { WallMode } from './viewMode';
import { stepWallMode } from './viewMode';

/** Dados de fora do núcleo que as migrações de save usam. */
const MIGRATION = { neighbors: NEIGHBORS, ties: NEIGHBOR_TIES, catalog: CATALOG, town: TOWN };

/** Bloco 7: o que aconteceu com um comando (a camada de som escuta). */
export type CommandListener = (cmd: Command, ok: boolean) => void;

/**
 * Bloco 6: fatos importantes do log viram cartão de aviso (que fica na tela)
 * em vez do aviso passageiro. Chave (ou começo da chave) e ícone do cartão.
 */
const NOTICES: [string, string][] = [
  ['log.broke', 'no'],
  ['log.billArrived', 'coin'],
  ['log.billsDebt', 'coin'],
  ['log.bailiffComing', 'coin'],
  ['log.ring', 'house'],
  ['log.dropIn', 'house'],
  ['log.fired', 'no'],
  ['log.promoted', 'spark'],
  ['log.collapse', 'energy'],
  ['log.accident', 'bladder'],
  ['log.allWishes', 'spark'],
  ['log.missedWork', 'alarm'],
  // bloco 10: vida a dois
  ['log.engaged', 'spark'],
  ['log.married', 'spark'],
  ['log.divorce', 'no'],
  ['log.proposalRefused', 'no'],
  ['log.movedOut', 'house'],
  ['log.movedOutMoney', 'house'],
  // bloco 11: bebês, crianças e escola
  ['log.babyComing', 'heart'],
  ['log.babyBorn', 'heart'],
  ['log.babyAdopted', 'heart'],
  ['log.babyWaiting', 'no'],
  ['log.babyCries', 'social'],
  ['log.grewUp', 'spark'],
  ['log.missedSchool', 'alarm'],
  ['log.reportCard', 'book'],
  ['log.honorRoll', 'spark'],
  ['log.gradeWarn', 'book'],
  ['log.toBoarding', 'no'],
  ['log.socialComing', 'house'],
  ['log.socialWarned', 'no'],
  ['log.socialTook', 'no'],
  // bloco 14: perigos
  ['log.fireStarted', 'fire'],
  ['log.cookFire', 'fire'],
  ['log.hearthFire', 'fire'],
  ['log.shockFire', 'fire'],
  ['log.smokeAlarm', 'alarm'],
  ['log.fireOut', 'yes'],
  ['log.firefightersDone', 'yes'],
  ['log.burglarAlarm', 'burglar'],
  ['log.stolen', 'burglar'],
  ['log.burglarCaught', 'coin'],
  ['log.burglarEscaped', 'burglar'],
  ['log.starving', 'hunger'],
  ['log.starvingLast', 'hunger'],
  ['log.adrift', 'swim'],
  ['log.nearMiss', 'heart'],
  ['log.fell', 'grave'],
  ['log.reaperArrived', 'grave'],
  ['log.bargainWon', 'heart'],
  ['log.bargainLost', 'grave'],
  ['log.died', 'grave'],
  ['log.kidsToRelatives', 'house'],
  ['log.spiritRises', 'ghost'],
  ['log.restInPeace', 'heart'],
  ['log.restInPeaceAlone', 'heart'],
];

/** Plano 2, bloco 2: para onde a câmera vai ao clicar num aviso. */
export type FocusTarget = { folkId: number } | { x: number; y: number };

/**
 * Plano 2, bloco 2: onde aconteceu o que o aviso conta. Procura, nos
 * parâmetros da linha do log, alguém que está no lote (pelo nome) ou um
 * objeto (pelo nome do modelo, o quebrado primeiro); fogo vai até as chamas e
 * contas até a caixa de correio. null = o aviso não tem lugar.
 */
export function noticeTarget(world: World, catalog: Catalog, entry: LogEntry): FocusTarget | null {
  const values = Object.values(entry.params ?? {}).filter((v): v is string => typeof v === 'string');
  if (entry.key.includes('Fire') || entry.key.includes('fire') || entry.key === 'log.smokeAlarm') {
    const fire = world.fires?.[0];
    if (fire) return { x: fire.x, y: fire.y };
  }
  for (const v of values) {
    const obj =
      world.objects.find((o) => catalog.objects[o.defId]?.name === v && o.state?.broken) ??
      world.objects.find((o) => catalog.objects[o.defId]?.name === v);
    if (obj) return { x: obj.x, y: obj.y };
  }
  for (const v of values) {
    const folk = world.folks.find((f) => f.name === v && !f.away);
    if (folk) return { folkId: folk.id };
  }
  if (entry.key.startsWith('log.bill')) {
    const box = world.objects.find((o) => catalog.objects[o.defId]?.interactions.some((i) => i.special === 'payBills'));
    if (box) return { x: box.x, y: box.y };
  }
  return null;
}

/** Ícone do cartão de aviso para esta linha do log (null = aviso passageiro). */
export function noticeIcon(key: string): string | null {
  for (const [k, icon] of NOTICES) if (key === k || key.startsWith(`${k}.`) || (k === 'log.fired' && key === 'log.firedByBoss')) return icon;
  return null;
}

/**
 * Ponte entre a simulação e as camadas de fora (cena Phaser e HUD).
 * As camadas de fora só leem `world` e mandam comandos por `command`.
 */
export class GameController {
  readonly sim: Sim;
  selectedFolkId: number;
  /** muda quando o mundo inteiro é trocado (novo jogo ou carregar) */
  worldVersion = 0;
  /** como as paredes são mostradas (só visual, não entra no save) */
  wallMode: WallMode = 'cutaway';
  /** plano 2, bloco 3: modo fixo (o telhado não some sozinho) */
  wallPinned = false;
  /** plano 2, bloco 3: o modo que a tela está mostrando (escrito pela tela) */
  shownWall: WallMode = 'cutaway';
  /** quartos de volta da câmera a partir da vista inicial */
  camQuarter = 0;
  mode: Mode = 'live';
  placing: Placing | null = null;
  /** muda quando objetos são comprados, vendidos ou movidos */
  objectsVersion = 0;
  /** muda quando paredes, pisos ou revestimentos mudam */
  gridVersion = 0;
  buildTool: BuildTool = 'wall';
  /** bloco 12: andar que a tela mostra (os de cima somem); só visual */
  viewLevel = 0;
  /** bloco 12: para onde sobe a próxima escada (R gira) */
  stairDir: Side = 'N';
  floorId = 'wood';
  coveringId = 'stripes';
  private speedBeforeBuy: Speed = 1;
  /** velocidade de antes da pausa automática por evento do expediente (0 = não pausou) */
  private pausedForEvent: Speed = 0;
  private hadEvent = false;
  /** bloco 14: pausa enquanto o Seu Sereno espera a barganha */
  private pausedForBargain: Speed = 0;
  private hadBargain = false;
  /** bloco 14: último morador visto (a tela segue de pé quando a casa fica vazia) */
  private lastFolk: Folk;
  private seenStamp = 0;
  /** bloco 16: última troca de lote feita pela própria simulação (o centro fechou) */
  private seenLot = 0;
  private toastListeners: ((text: string) => void)[] = [];
  private noticeListeners: ((text: string, icon: string, target: FocusTarget | null) => void)[] = [];
  /** plano 2, bloco 2: a câmera vai até aqui no próximo quadro (a cena consome) */
  focusRequest: FocusTarget | null = null;
  private seenLog = 0;
  /** bloco 7: vaga de save em uso e o nome do jogo */
  slot: SlotId = SLOT_IDS[0];
  slotName = '';
  /** bloco 7: tira a miniatura da casa para a vaga (a tela fornece) */
  snapshot: (() => string | undefined) | null = null;
  /** bloco 17: foto do álbum (a tela liga) */
  photographer: (() => string | undefined) | null = null;
  private commandListeners: CommandListener[] = [];
  private readonly db: SaveBackend = idbBackend;

  /** bloco 15: tela do bairro aberta? */
  screen: Screen = 'lot';
  /** bloco 15: lote escolhido na tela do bairro */
  townLot = 0;
  /** bloco 15: muda quando lotes ou famílias mudam (a tela do bairro refaz as casas) */
  townVersion = 0;
  private speedBeforeTown: Speed = 1;

  constructor() {
    this.sim = new Sim(CATALOG, townWorld(createWorld(starterHouse(freshSeed()))));
    this.selectedFolkId = this.sim.world.folks[0].id;
    this.lastFolk = this.sim.world.folks[0];
  }

  /** Bloco 14: não sobrou ninguém morando na casa. */
  get houseEmpty(): boolean {
    return this.sim.household().length === 0;
  }

  get world(): World {
    return this.sim.world;
  }

  /** O morador selecionado (visitas nunca são selecionadas). */
  get folk(): Folk {
    const f = this.sim.findFolk(this.selectedFolkId);
    if (f && !f.visit) {
      this.lastFolk = f;
      return f;
    }
    // bloco 14: quem estava selecionado morreu: passa para outro da casa (ou fica no último, com a casa vazia)
    const first = this.sim.residents()[0] ?? this.sim.household()[0];
    if (!first) return this.lastFolk;
    this.selectedFolkId = first.id;
    this.lastFolk = first;
    return first;
  }

  selectFolk(id: number): boolean {
    const f = this.sim.findFolk(id);
    if (!f || f.visit) return false;
    this.selectedFolkId = id;
    return true;
  }

  /** Passa a seleção para o próximo morador (tecla Tab). */
  selectNext(): void {
    const list = this.sim.household();
    if (list.length < 2) return;
    const i = list.findIndex((f) => f.id === this.selectedFolkId);
    this.selectedFolkId = list[(i + 1) % list.length].id;
  }

  command(cmd: Command): boolean {
    // plano 2, bloco 1: com Shift apertado a ordem vai para o fim da fila
    if (this.shiftHeld && ORDER_TYPES.has(cmd.type) && !('append' in cmd && cmd.append !== undefined)) {
      cmd = { ...cmd, append: true } as Command;
    }
    const ok = this.sim.dispatch(cmd);
    for (const cb of this.commandListeners) cb(cmd, ok);
    if (ok && (cmd.type === 'buy' || cmd.type === 'sell' || cmd.type === 'move' || cmd.type === 'undoBuy' || cmd.type === 'storeObject' || cmd.type === 'placeStored')) this.objectsVersion++;
    if (ok && (isBuildCommand(cmd) || cmd.type === 'undoBuild')) this.gridVersion++;
    return ok;
  }

  /** Volta a uma velocidade guardada; pular que não vale mais vira normal. */
  resumeSpeed(speed: Speed): void {
    if (!this.command({ type: 'setSpeed', speed }) && speed !== 1) this.command({ type: 'setSpeed', speed: 1 });
  }

  /** Manda o comando e, se for recusado, explica o motivo num aviso. */
  /** Plano 2, bloco 1: Shift apertado agora (a tela avisa pelo teclado e pelo mouse). */
  shiftHeld = false;

  commandOrExplain(cmd: Command): boolean {
    const ok = this.command(cmd);
    if (!ok) this.toast(this.problemText());
    return ok;
  }

  problemText(): string {
    const p = this.sim.lastProblem ?? 'invalid';
    const name = this.folk.name;
    if (p === 'away') return t('toast.away', { name });
    if (p === 'collapsed') return t('toast.collapsed', { name });
    if (p === 'queueFull') return t('toast.queueFull');
    if (p === 'cantSkip') {
      const who = skipBlocker(this.world, this.sim.catalog);
      return who ? t('toast.cantSkipWho', { name: who.name.split(' ')[0] }) : t('toast.cantSkip');
    }
    if (p === 'visitor') return t('problem.visitor');
    // bloco 6: a recusa diz por quê (fome, sono, mau humor...)
    if (p === 'refused') return t(`refuse.${this.sim.lastRefusal ?? 'mood'}`, { name });
    if (p === 'noSpark') return t('problem.noSpark', { name });
    return t(`problem.${p}`);
  }

  // ---------- modo compra ----------

  setMode(mode: Mode): void {
    if (mode === this.mode) return;
    const wasLive = this.mode === 'live';
    // bloco 4: saindo do modo compra, o que foi feito lá não se desfaz mais
    if (this.mode === 'buy') this.command({ type: 'closeBuy' });
    this.mode = mode;
    this.placing = null;
    if (mode !== 'live') {
      // compra e construção param o tempo
      if (wasLive) this.speedBeforeBuy = this.world.speed === 0 ? 1 : this.world.speed;
      this.command({ type: 'setSpeed', speed: 0 });
    } else {
      this.resumeSpeed(this.speedBeforeBuy);
    }
  }

  startPlacing(defId: string, moveId?: number): void {
    const obj = moveId !== undefined ? this.sim.findObject(moveId) : undefined;
    const prev = moveId === undefined && this.placing?.defId === defId && this.placing.moveId === undefined ? this.placing : undefined;
    this.placing = {
      defId,
      rot: obj?.rot ?? prev?.rot ?? 0,
      moveId,
      color: prev?.color,
      parts: prev?.parts,
      style: prev?.style,
      turn8: obj?.turn8 ?? prev?.turn8,
      lift: obj?.lift ?? prev?.lift,
      nudge: obj?.nudge,
      autoRot: !obj && !prev,
    };
  }

  /** Plano 2, bloco 11: pega um objeto do inventário para pôr na casa (abre o modo compra). */
  startPlacingStored(objectId: number): void {
    const obj = this.world.household.stored?.find((o) => o.id === objectId);
    if (!obj) return;
    if (this.mode !== 'buy') this.setMode('buy');
    this.placing = { defId: obj.defId, rot: obj.rot, parts: obj.parts, style: obj.style, turn8: obj.turn8, lift: obj.lift, autoRot: true, storedId: obj.id };
  }

  rotatePlacing(): void {
    const p = this.placing;
    if (p) {
      p.autoRot = false;
      // plano 2, bloco 8: enfeite gira em oitavos
      if (this.sim.catalog.objects[p.defId]?.turns8) {
        p.turn8 = ((p.turn8 ?? 0) + 1) % 8;
        p.rot = (p.turn8 >> 1) as Rotation;
      } else p.rot = ((p.rot + 1) % 4) as Rotation;
    } else if (this.mode === 'build' && this.buildTool === 'stairs') this.rotateStairs();
  }

  /** Plano 2, bloco 8: sobe ou desce o objeto de parede (degraus de 25 cm). */
  liftPlacing(dir: number): void {
    const p = this.placing;
    const def = p && this.sim.catalog.objects[p.defId];
    if (!p || def?.layer !== 'wall') return;
    p.lift = Math.max(LIFT_MIN, Math.min(LIFT_MAX, (p.lift ?? 0) + dir));
  }

  /** Plano 2, bloco 8: peças e estilo do que vai ser comprado (o editor chama). */
  setPlacingLook(parts: KitParts | undefined, style: ObjStyle | undefined): void {
    if (!this.placing || this.placing.moveId !== undefined) return;
    this.placing.parts = parts;
    this.placing.style = style;
  }

  /** Plano 2, bloco 8: preço do que vai ser comprado, com peças e estilo. */
  placingPrice(): number {
    const p = this.placing;
    const def = p && this.sim.catalog.objects[p.defId];
    if (!p || !def || p.storedId !== undefined) return 0;
    const look = cleanLook(def, p.parts, p.style ?? styleFromColor(zonesOf(def), p.color));
    return priceWith(def, look.parts, look.style);
  }

  /** Tenta pôr o objeto em (x, y). Devolve true se deu certo. */
  place(x: number, y: number): boolean {
    const p = this.placing;
    if (!p) return false;
    const def = this.sim.catalog.objects[p.defId];
    if (p.storedId !== undefined) {
      const ok = this.commandOrExplain({ type: 'placeStored', objectId: p.storedId, x, y, rot: p.rot, nudge: p.nudge, turn8: p.turn8, lift: p.lift });
      if (ok) this.placing = null;
      return ok;
    }
    const ok =
      p.moveId !== undefined
        ? this.commandOrExplain({ type: 'move', objectId: p.moveId, x, y, rot: p.rot, nudge: p.nudge, turn8: p.turn8, lift: p.lift })
        : this.commandOrExplain({ type: 'buy', defId: p.defId, x, y, rot: p.rot, color: p.color, parts: p.parts, style: p.style, nudge: p.nudge, turn8: p.turn8, lift: p.lift });
    if (ok) {
      if (p.moveId === undefined && def) this.toast(t('buy.bought', { name: t(def.name) }));
      // depois de mover, larga; depois de comprar, segue com outro igual se der
      if (p.moveId !== undefined || !def || this.world.household.funds < this.placingPrice()) this.placing = null;
    }
    return ok;
  }

  // ---------- modo construção ----------

  setBuildTool(tool: BuildTool): void {
    this.buildTool = tool;
  }

  /** Bloco 12: sobe (1) ou desce (-1) o andar que a tela mostra. */
  changeLevel(dir: number): void {
    this.viewLevel = Math.max(0, Math.min(Math.min(MAX_LEVELS, this.world.grid.levels ?? 1) - 1, this.viewLevel + dir));
  }

  /** Bloco 12: andar onde o folk está. */
  levelOf(folk: Folk): number {
    return Math.max(0, levelOfRow(this.world.grid, folk.y));
  }

  /** Bloco 12: gira a direção da escada que vai ser posta. */
  rotateStairs(): void {
    const order: Side[] = ['N', 'E', 'S', 'W'];
    this.stairDir = order[(order.indexOf(this.stairDir) + 1) % 4];
  }

  /** Bloco 4: desfaz a última compra, venda ou mudança no modo compra. */
  undoBuy(): boolean {
    const ok = this.commandOrExplain({ type: 'undoBuy' });
    if (ok) this.toast(t('buy.undone'));
    return ok;
  }

  /** Escolhe a cor do objeto que vai ser comprado. */
  setPlacingColor(color: string): void {
    if (this.placing && this.placing.moveId === undefined) this.placing.color = color;
  }

  /** Desfaz a última obra (Ctrl+Z ou botão), explicando se não der. */
  undoBuild(): boolean {
    const ok = this.commandOrExplain({ type: 'undoBuild' });
    if (ok) this.toast(t('build.undone'));
    return ok;
  }

  /** Responde um evento do expediente e, se o jogo parou por causa dele, volta a andar. */
  chooseWorkEvent(folkId: number, choice: number): boolean {
    const ok = this.commandOrExplain({ type: 'workChoice', folkId, choice });
    if (ok && this.pausedForEvent && this.mode === 'live' && !this.world.folks.some((f) => f.away?.event)) {
      this.resumeSpeed(this.pausedForEvent);
      this.pausedForEvent = 0;
    }
    return ok;
  }

  /** Bloco 14: par ou ímpar com o Seu Sereno (null = deixar ir); o jogo volta a andar. */
  chooseBargain(pick: 'even' | 'odd' | null): boolean {
    const ok = this.commandOrExplain({ type: 'bargain', pick });
    if (ok && this.pausedForBargain && this.mode === 'live' && this.world.passings[0]?.stage !== 'waiting') {
      this.resumeSpeed(this.pausedForBargain);
      this.pausedForBargain = 0;
    }
    return ok;
  }

  /** Avança um tick e transforma eventos novos do log em avisos. */
  step(): void {
    this.sim.step();
    // bloco 16: o centro fechou (ou todo mundo cansou): o táxi trouxe a turma de volta
    if (this.sim.lotStamp !== this.seenLot) {
      this.lotChanged();
      return;
    }
    // bloco 14: a simulação tirou ou pôs objetos (fogo, gatuno, lápide): a tela redesenha
    if (this.sim.objectStamp !== this.seenStamp) {
      this.seenStamp = this.sim.objectStamp;
      this.objectsVersion++;
    }
    // bloco 14: Seu Sereno abriu o livro: pausa para o jogador decidir
    // bloco 17: de velhice não tem barganha (o jogo segue enquanto a família se despede)
    const bargaining = this.world.passings[0]?.stage === 'waiting' && this.world.passings[0]?.cause !== 'age';
    if (bargaining && !this.hadBargain && this.world.speed !== 0) {
      this.pausedForBargain = this.world.speed;
      this.command({ type: 'setSpeed', speed: 0 });
    }
    this.hadBargain = bargaining;
    // casa vazia: o tempo para
    if (this.houseEmpty && this.world.speed !== 0) this.command({ type: 'setSpeed', speed: 0 });
    // evento novo no trabalho: pausa para o jogador escolher
    const pending = this.world.folks.some((f) => !f.visit && f.away?.event);
    if (pending && !this.hadEvent && this.world.speed !== 0) {
      this.pausedForEvent = this.world.speed;
      this.command({ type: 'setSpeed', speed: 0 });
    }
    this.hadEvent = pending;
    const log = this.world.log;
    for (const entry of log) {
      if (entry.tick <= this.seenLog) continue;
      const text = t(entry.key, translateParams(entry.params));
      const icon = noticeIcon(entry.key);
      if (icon) this.notice(text, icon, noticeTarget(this.world, this.sim.catalog, entry));
      else this.toast(text);
    }
    if (log.length > 0) this.seenLog = Math.max(this.seenLog, log[log.length - 1].tick);
  }

  /** Plano 2, bloco 3: escolhe o modo de vista. */
  setWallMode(mode: WallMode): void {
    this.wallMode = mode;
  }

  /** Plano 2, bloco 3: sobe (1) ou desce (-1) um degrau nos modos de vista (Home e End). */
  stepWallMode(dir: number): WallMode {
    this.wallMode = stepWallMode(this.wallMode, dir);
    return this.wallMode;
  }

  /** Gira a câmera um quarto de volta (dir = -1 ou 1). */
  rotateCamera(dir: number): void {
    this.camQuarter += dir;
  }

  onToast(cb: (text: string) => void): void {
    this.toastListeners.push(cb);
  }

  toast(text: string): void {
    for (const cb of this.toastListeners) cb(text);
  }

  onNotice(cb: (text: string, icon: string, target: FocusTarget | null) => void): void {
    this.noticeListeners.push(cb);
  }

  notice(text: string, icon: string, target: FocusTarget | null = null): void {
    for (const cb of this.noticeListeners) cb(text, icon, target);
  }

  /** Plano 2, bloco 2: leva a câmera até alguém ou até um tile (e o andar junto). */
  focus(target: FocusTarget): void {
    this.focusRequest = target;
  }

  private replaceWorld(world: World): void {
    this.mode = 'live';
    this.placing = null;
    this.sim.load(world);
    const first = world.folks.find((f) => !f.visit) ?? world.folks[0];
    if (first) {
      this.selectedFolkId = first.id;
      this.lastFolk = first;
    }
    this.seenStamp = this.sim.objectStamp;
    this.pausedForBargain = 0;
    this.hadBargain = false;
    this.seenLog = world.tick;
    this.viewLevel = 0;
    this.worldVersion++;
    this.townVersion++;
    this.screen = 'lot';
  }

  // ---------- bloco 15: bairro ----------

  /** Abre a vista do bairro (o tempo para enquanto está aberta). */
  openTown(): void {
    if (!this.world.town || this.screen === 'town') return;
    if (this.mode !== 'live') this.setMode('live');
    this.speedBeforeTown = this.world.speed === 0 ? 1 : this.world.speed;
    this.command({ type: 'setSpeed', speed: 0 });
    this.screen = 'town';
    this.townLot = this.sim.world.town?.lots.find((l) => l.familyId === this.world.town?.active)?.id ?? 0;
    this.townVersion++;
  }

  /** Volta para o lote em jogo, na velocidade de antes. */
  closeTown(): void {
    if (this.screen !== 'town') return;
    this.screen = 'lot';
    if (!this.houseEmpty) this.resumeSpeed(this.speedBeforeTown);
  }

  /** Joga com outra família, muda de casa ou traz família nova: o lote em jogo é outro. */
  townCommand(cmd: Extract<Command, { type: 'playFamily' | 'moveHouse' | 'foundFamily' }>): boolean {
    if (!this.commandOrExplain(cmd)) return false;
    this.lotChanged();
    this.speedBeforeTown = 1;
    this.closeTown();
    return true;
  }

  /**
   * Plano 2, bloco 11: gaveta, dividir, juntar e chamar para morar. Quando a
   * gente da casa em jogo muda, a tela inteira se refaz (como numa troca de lote).
   */
  familyCommand(cmd: Extract<Command, { type: 'binFamily' | 'placeFamily' | 'splitFamily' | 'joinFamily' | 'inviteHome' }>): boolean {
    const keep = this.selectedFolkId;
    if (!this.commandOrExplain(cmd)) return false;
    if (cmd.type === 'binFamily' || cmd.type === 'placeFamily') this.townVersion++;
    else {
      this.lotChanged();
      if (this.world.folks.some((f) => f.id === keep && !f.visit)) this.selectedFolkId = keep;
    }
    return true;
  }

  /** Bloco 16: táxi para o centro (ou de volta): o lote em jogo é outro. */
  outingCommand(cmd: Extract<Command, { type: 'goDowntown' | 'goHome' }>): boolean {
    if (!this.commandOrExplain(cmd)) return false;
    this.lotChanged();
    return true;
  }

  /** O lote em jogo trocou (bairro, centro): seleção, avisos e a tela inteira de novo. */
  private lotChanged(): void {
    this.seenLot = this.sim.lotStamp;
    const world = this.world;
    const first = world.folks.find((f) => !f.visit) ?? world.folks[0];
    if (first) {
      this.selectedFolkId = first.id;
      this.lastFolk = first;
    }
    this.placing = null;
    this.seenStamp = this.sim.objectStamp;
    this.pausedForBargain = 0;
    this.hadBargain = false;
    this.pausedForEvent = 0;
    this.hadEvent = false;
    this.seenLog = world.tick;
    this.viewLevel = 0;
    this.worldVersion++;
    this.objectsVersion++;
    this.gridVersion++;
    this.townVersion++;
  }

  // ---------- bloco 7: jogos salvos ----------

  onCommand(cb: CommandListener): void {
    this.commandListeners.push(cb);
  }

  /** Na abertura: traz o save antigo para a vaga 1 e carrega a vaga em uso. */
  async boot(): Promise<boolean> {
    try {
      await adoptLegacy(this.db, MIGRATION);
      this.slot = await currentSlot(this.db);
    } catch {
      return false;
    }
    return this.loadSlot(this.slot, true);
  }

  /** Salva o jogo na vaga em uso (ou em outra, que passa a ser a vaga em uso). */
  async save(silent = false, slot: SlotId = this.slot): Promise<boolean> {
    try {
      let thumb: string | undefined;
      try {
        thumb = this.snapshot?.();
      } catch {
        thumb = undefined;
      }
      const meta = await writeSlot(this.db, slot, this.world, this.slotName || defaultSlotName(this.world), Date.now(), thumb);
      this.slotName = meta.name;
      if (slot !== this.slot) {
        this.slot = slot;
        await setCurrentSlot(this.db, slot);
      }
      if (!silent) this.toast(t('toast.saved'));
      return true;
    } catch {
      if (!silent) this.toast(t('toast.saveError'));
      return false;
    }
  }

  /** Carrega a vaga em uso (botão de antes do bloco 7). */
  load(silent = false): Promise<boolean> {
    return this.loadSlot(this.slot, silent);
  }

  async loadSlot(slot: SlotId, silent = false): Promise<boolean> {
    let found: Awaited<ReturnType<typeof readSlot>>;
    try {
      found = await readSlot(this.db, slot, MIGRATION);
    } catch {
      if (!silent) this.toast(t('toast.loadError'));
      return false;
    }
    if (!found) {
      if (!silent) this.toast(t('toast.noSave'));
      return false;
    }
    this.replaceWorld(found.world);
    this.slot = slot;
    this.slotName = found.meta.name;
    void setCurrentSlot(this.db, slot).catch(() => undefined);
    this.toast(t('toast.loadedSlot', { name: found.meta.name }));
    return true;
  }

  slots(): Promise<(SlotMeta | null)[]> {
    return listSlots(this.db).catch(() => SLOT_IDS.map(() => null));
  }

  async renameSlot(slot: SlotId, name: string): Promise<boolean> {
    const ok = await renameSlot(this.db, slot, name).catch(() => false);
    if (ok && slot === this.slot) this.slotName = (await this.slots())[SLOT_IDS.indexOf(slot)]?.name ?? this.slotName;
    return ok;
  }

  async deleteSlot(slot: SlotId): Promise<boolean> {
    try {
      await deleteSlot(this.db, slot);
      this.toast(t('toast.slotDeleted'));
      return true;
    } catch {
      this.toast(t('toast.saveError'));
      return false;
    }
  }

  /** Texto e nome do arquivo para baixar o jogo de agora. */
  exportGame(): { text: string; fileName: string } {
    const name = this.slotName || defaultSlotName(this.world);
    return { text: exportSave(this.world, name, Date.now()), fileName: exportFileName(name, Math.floor(this.world.tick / 1440) + 1) };
  }

  /**
   * Abre um arquivo exportado. Vai para uma vaga livre (para não apagar
   * nenhum jogo); sem vaga livre, avisa e não abre.
   */
  async importGame(text: string): Promise<boolean> {
    let found: ReturnType<typeof importSave>;
    try {
      found = importSave(text, MIGRATION);
    } catch {
      this.toast(t('toast.importError'));
      return false;
    }
    const slot = await freeSlot(this.db).catch(() => null);
    if (!slot) {
      this.toast(t('toast.importFull'));
      return false;
    }
    this.replaceWorld(found.world);
    this.slotName = found.name;
    await this.save(true, slot);
    this.toast(t('toast.imported', { name: found.name }));
    return true;
  }

  /** Jogo novo vai para uma vaga livre; sem vaga livre, usa a vaga de agora. */
  private async freshSlot(): Promise<void> {
    const slot = await freeSlot(this.db).catch(() => null);
    this.slotName = '';
    await this.save(true, slot ?? this.slot);
  }

  newGame(death = true, life: LifePace = 'off'): void {
    this.replaceWorld(townWorld(createWorld({ ...starterHouse(freshSeed()), death, life })));
    this.toast(t('toast.newGame'));
    void this.freshSlot();
  }

  /** Bloco 5: começa de novo com a família criada na tela de criação. */
  newFamily(draft: FamilyDraft, death = true, life: LifePace = 'off'): boolean {
    if (familyProblem(this.sim.catalog, draft)) return false;
    this.replaceWorld(townWorld(familyWorld(draft, freshSeed(), { death, life })));
    this.toast(t('toast.newFamily', { name: cleanName(draft.surname) }));
    void this.freshSlot();
    return true;
  }
}

/** Parâmetros do log que são chaves de texto (cargo, habilidade) viram texto. */
function translateParams(params?: Record<string, string | number>): Record<string, string | number> | undefined {
  if (!params) return params;
  const out: Record<string, string | number> = {};
  // textos dentro de textos (resultado de evento, notícia) usam os mesmos parâmetros
  const raw: Record<string, string | number> = { ...params, about: params.about ?? params.name };
  for (const [k, v] of Object.entries(params)) out[k] = typeof v === 'string' && hasText(v) ? t(v, raw) : v;
  // bloco 6: texto dentro de texto com parâmetro que também é chave (desejo "Aprender {skill}")
  const inner: Record<string, string | number> = { ...out, about: out.about ?? out.name };
  for (const [k, v] of Object.entries(params)) if (typeof v === 'string' && hasText(v)) out[k] = t(v, inner);
  return out;
}

/** Bloco 15: o jogo novo já nasce num bairro (a casa pronta é o lote 5). */
function townWorld(world: World): World {
  foundTown(world, CATALOG, TOWN);
  return world;
}

function freshSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) | 0;
}
