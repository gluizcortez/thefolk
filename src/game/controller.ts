import { CATALOG } from '../data/catalog';
import { starterHouse } from '../data/house';
import { NEIGHBORS } from '../data/neighbors';
import { hasText, t } from '../i18n';
import { readSave, writeSave } from '../platform/saveStore';
import { Sim, createWorld, deserialize, serialize } from '../sim';
import type { Command, Folk, Rotation, Speed, World } from '../sim';

export type Mode = 'live' | 'buy';

/** O que está sendo posto no chão no modo compra. */
export interface Placing {
  defId: string;
  rot: Rotation;
  /** quando é um objeto que já existe sendo movido */
  moveId?: number;
}
import type { WallMode } from './art/house';

const SLOT = 'principal';

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
  /** quartos de volta da câmera a partir da vista inicial */
  camQuarter = 0;
  mode: Mode = 'live';
  placing: Placing | null = null;
  /** muda quando objetos são comprados, vendidos ou movidos */
  objectsVersion = 0;
  private speedBeforeBuy: Speed = 1;
  private toastListeners: ((text: string) => void)[] = [];
  private seenLog = 0;

  constructor() {
    this.sim = new Sim(CATALOG, createWorld(starterHouse(freshSeed())));
    this.selectedFolkId = this.sim.world.folks[0].id;
  }

  get world(): World {
    return this.sim.world;
  }

  /** O morador selecionado (visitas nunca são selecionadas). */
  get folk(): Folk {
    const f = this.sim.findFolk(this.selectedFolkId);
    if (f && !f.visit) return f;
    const first = this.sim.residents()[0] ?? this.world.folks[0];
    this.selectedFolkId = first.id;
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
    const list = this.sim.residents();
    if (list.length < 2) return;
    const i = list.findIndex((f) => f.id === this.selectedFolkId);
    this.selectedFolkId = list[(i + 1) % list.length].id;
  }

  command(cmd: Command): boolean {
    const ok = this.sim.dispatch(cmd);
    if (ok && (cmd.type === 'buy' || cmd.type === 'sell' || cmd.type === 'move')) this.objectsVersion++;
    return ok;
  }

  /** Manda o comando e, se for recusado, explica o motivo num aviso. */
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
    if (p === 'visitor') return t('problem.visitor');
    return t(`problem.${p}`);
  }

  // ---------- modo compra ----------

  setMode(mode: Mode): void {
    if (mode === this.mode) return;
    this.mode = mode;
    this.placing = null;
    if (mode === 'buy') {
      this.speedBeforeBuy = this.world.speed === 0 ? 1 : this.world.speed;
      this.command({ type: 'setSpeed', speed: 0 });
    } else {
      this.command({ type: 'setSpeed', speed: this.speedBeforeBuy });
    }
  }

  startPlacing(defId: string, moveId?: number): void {
    const obj = moveId !== undefined ? this.sim.findObject(moveId) : undefined;
    this.placing = { defId, rot: obj?.rot ?? 0, moveId };
  }

  rotatePlacing(): void {
    if (this.placing) this.placing.rot = ((this.placing.rot + 1) % 4) as Rotation;
  }

  /** Tenta pôr o objeto em (x, y). Devolve true se deu certo. */
  place(x: number, y: number): boolean {
    const p = this.placing;
    if (!p) return false;
    const def = this.sim.catalog.objects[p.defId];
    const ok =
      p.moveId !== undefined
        ? this.commandOrExplain({ type: 'move', objectId: p.moveId, x, y, rot: p.rot })
        : this.commandOrExplain({ type: 'buy', defId: p.defId, x, y, rot: p.rot });
    if (ok) {
      if (p.moveId === undefined && def) this.toast(t('buy.bought', { name: t(def.name) }));
      // depois de mover, larga; depois de comprar, segue com outro igual se der
      if (p.moveId !== undefined || !def || this.world.household.funds < def.price) this.placing = null;
    }
    return ok;
  }

  /** Avança um tick e transforma eventos novos do log em avisos. */
  step(): void {
    this.sim.step();
    const log = this.world.log;
    for (const entry of log) {
      if (entry.tick > this.seenLog) this.toast(t(entry.key, translateParams(entry.params)));
    }
    if (log.length > 0) this.seenLog = Math.max(this.seenLog, log[log.length - 1].tick);
  }

  cycleWallMode(): WallMode {
    const order: WallMode[] = ['cutaway', 'down', 'up'];
    this.wallMode = order[(order.indexOf(this.wallMode) + 1) % order.length];
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

  private replaceWorld(world: World): void {
    this.mode = 'live';
    this.placing = null;
    this.sim.load(world);
    this.selectedFolkId = world.folks[0].id;
    this.seenLog = world.tick;
    this.worldVersion++;
  }

  async save(silent = false): Promise<boolean> {
    try {
      await writeSave(SLOT, serialize(this.world, Date.now()));
      if (!silent) this.toast(t('toast.saved'));
      return true;
    } catch {
      if (!silent) this.toast(t('toast.saveError'));
      return false;
    }
  }

  async load(silent = false): Promise<boolean> {
    let raw: unknown;
    try {
      raw = await readSave(SLOT);
    } catch {
      if (!silent) this.toast(t('toast.loadError'));
      return false;
    }
    if (raw === undefined) {
      if (!silent) this.toast(t('toast.noSave'));
      return false;
    }
    try {
      this.replaceWorld(deserialize(raw, { neighbors: NEIGHBORS }).world);
      this.toast(t('toast.loaded'));
      return true;
    } catch {
      this.toast(t('toast.loadError'));
      return false;
    }
  }

  newGame(): void {
    this.replaceWorld(createWorld(starterHouse(freshSeed())));
    this.toast(t('toast.newGame'));
    void this.save(true);
  }
}

/** Parâmetros do log que são chaves de texto (cargo, habilidade) viram texto. */
function translateParams(params?: Record<string, string | number>): Record<string, string | number> | undefined {
  if (!params) return params;
  const out: Record<string, string | number> = {};
  for (const [k, v] of Object.entries(params)) out[k] = typeof v === 'string' && hasText(v) ? t(v) : v;
  return out;
}

function freshSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) | 0;
}
