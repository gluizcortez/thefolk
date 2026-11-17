import { CATALOG } from '../data/catalog';
import { starterHouse } from '../data/house';
import { t } from '../i18n';
import { readSave, writeSave } from '../platform/saveStore';
import { Sim, createWorld, deserialize, serialize } from '../sim';
import type { Command, Folk, World } from '../sim';

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
  private toastListeners: ((text: string) => void)[] = [];
  private seenLog = 0;

  constructor() {
    this.sim = new Sim(CATALOG, createWorld(starterHouse(freshSeed())));
    this.selectedFolkId = this.sim.world.folks[0].id;
  }

  get world(): World {
    return this.sim.world;
  }

  get folk(): Folk {
    return this.sim.findFolk(this.selectedFolkId) ?? this.world.folks[0];
  }

  command(cmd: Command): boolean {
    return this.sim.dispatch(cmd);
  }

  /** Avança um tick e transforma eventos novos do log em avisos. */
  step(): void {
    this.sim.step();
    const log = this.world.log;
    for (const entry of log) {
      if (entry.tick > this.seenLog) this.toast(t(entry.key, entry.params));
    }
    if (log.length > 0) this.seenLog = Math.max(this.seenLog, log[log.length - 1].tick);
  }

  onToast(cb: (text: string) => void): void {
    this.toastListeners.push(cb);
  }

  toast(text: string): void {
    for (const cb of this.toastListeners) cb(text);
  }

  private replaceWorld(world: World): void {
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
      this.replaceWorld(deserialize(raw).world);
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

function freshSeed(): number {
  return (Date.now() ^ Math.floor(Math.random() * 0x7fffffff)) | 0;
}
