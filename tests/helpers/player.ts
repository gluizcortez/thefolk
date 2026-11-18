import {
  CARE_BELOW,
  CARE_NEED,
  babyWant,
  chooseAutonomous,
  clockOf,
  cribOf,
  doorTaken,
  inSchool,
  interactionOpen,
  interactionReady,
  isAdult,
  isSleep,
  kidsOf,
  relationOf,
  ringing,
  safetyOf,
} from '../../src/sim';
import type { Command, Folk, InteractionDef, Sim, WorldObject } from '../../src/sim';

/**
 * Plano 2, bloco 1: jogador de teste. Sem jogo sozinho, a simulação de vários
 * dias precisa de alguém dando ordens. Este roteiro joga como uma pessoa
 * atenta: atende a porta e o telefone, apaga o fogo, cuida do bebê, manda a
 * criança fazer a lição, põe todo mundo para dormir às 23h, manda comer quando
 * a fome passa de metade e, no resto do tempo, escolhe a melhor coisa a fazer
 * pela mesma conta de utilidade que as visitas usam. Tudo por `sim.dispatch`,
 * como a tela faria, e só para quem está parado (não interrompe ninguém).
 */
export class TestPlayer {
  /** ordens aceitas e recusadas (para os testes conferirem que houve jogo) */
  orders = 0;
  refused = 0;

  constructor(
    readonly sim: Sim,
    /** de quantos em quantos minutos o jogador olha a casa */
    readonly every = 1,
  ) {}

  /** Um minuto de jogo com o jogador olhando antes. */
  step(): void {
    if (this.sim.world.tick % this.every === 0) this.look();
    this.sim.step();
  }

  look(): void {
    const world = this.sim.world;
    const home = world.folks.filter((f) => !f.visit && this.free(f));
    if (home.length === 0) return;
    // porta, telefone e fogo: o primeiro que estiver livre vai
    this.door(home) || this.phone(home);
    this.fire(home);
    for (const folk of home) {
      // como uma pessoa: espera o folk ficar parado uns minutos antes de mandar de novo
      if (folk.queue.length > 0 || folk.idleTicks < 2 || folk.idleTicks % 2 === 1) continue;
      this.decide(folk);
    }
  }

  private free(folk: Folk): boolean {
    return !folk.away && folk.age !== 'baby' && folk.collapsed === 0 && !folk.down && !folk.adrift;
  }

  private order(cmd: Command): boolean {
    const ok = this.sim.dispatch(cmd);
    if (ok) this.orders++;
    else this.refused++;
    return ok;
  }

  /** Quem pode largar o que faz para atender: primeiro os parados, depois quem não dorme nem saiu para o turno. */
  private idle(home: Folk[]): Folk[] {
    const asleep = (f: Folk) => {
      const a = f.queue[0];
      const it = a?.phase === 'using' ? this.sim.interactionOf(a) : undefined;
      return !!it && isSleep(it);
    };
    const leaving = (f: Folk) => f.queue[0]?.kind === 'work' || f.queue[0]?.kind === 'school';
    const ok = home.filter((f) => !asleep(f) && !leaving(f) && f.queue[0]?.kind !== 'panic');
    return [...ok.filter((f) => f.queue.length === 0), ...ok.filter((f) => f.queue.length > 0)];
  }

  private door(home: Folk[]): boolean {
    const world = this.sim.world;
    const caller = ringing(world).find((v) => !doorTaken(world, v.id));
    if (!caller) return false;
    const late = clockOf(world.tick).hour >= 22;
    for (const folk of this.idle(home).filter((f) => isAdult(f) || f.age === 'teen')) {
      const rel = relationOf(world, folk.id, caller.id);
      const welcome = !!caller.visit?.service || ((rel?.friendship ?? 0) > -30 && !late);
      if (this.order({ type: 'answerDoor', folkId: folk.id, otherId: caller.id, welcome })) return true;
    }
    return false;
  }

  private phone(home: Folk[]): boolean {
    const call = this.sim.world.call;
    if (!call || call.answeredBy || this.sim.world.folks.some((f) => f.queue.some((a) => a.interactionId === 'answer'))) return false;
    for (const folk of this.idle(home)) {
      if (this.order({ type: 'answerPhone', folkId: folk.id })) return true;
    }
    return false;
  }

  private fire(home: Folk[]): void {
    const world = this.sim.world;
    if (world.fires.length === 0) return;
    if (world.folks.some((f) => f.queue.some((a) => a.kind === 'douse' || a.interactionId === 'douse'))) return;
    const ext = safetyOf(world, this.sim.catalog, 'extinguisher');
    const adult = home.find((f) => isAdult(f));
    if (ext && adult) {
      this.order({ type: 'queueUse', folkId: adult.id, objectId: ext.id, interactionId: 'douse' });
      return;
    }
    if (adult && world.help.fire === 0 && !world.folks.some((f) => f.queue.some((q) => q.interactionId === 'callFire'))) {
      const phone = this.find(adult, (it) => it.special === 'callFire');
      if (phone) this.order({ type: 'queueUse', folkId: adult.id, objectId: phone.obj.id, interactionId: phone.it.id });
    }
  }

  private decide(folk: Folk): void {
    const world = this.sim.world;
    const hour = clockOf(world.tick).hour;
    const n = folk.needs;
    // o que não pode esperar: banheiro e fome braba
    if (n.bladder < 30 && this.use(folk, (it) => (it.effects.bladder ?? 0) > 0)) return;
    if (n.hunger < 50 && this.use(folk, (it) => (it.effects.hunger ?? 0) > 0, (it) => -(it.effects.hunger ?? 0))) return;
    // sono: às 23h ou quando a energia cai muito
    const bedtime = hour >= 23 || hour < 6;
    if ((bedtime && n.energy < 90) || n.energy < 25) {
      if (this.use(folk, (it) => isSleep(it), (it) => (it.id === 'sleep' ? 0 : 1))) return;
    }
    if (this.baby(folk)) return;
    if (this.homework(folk, hour)) return;
    if (this.joinGame(folk)) return;
    // o resto: a melhor coisa a fazer, pela mesma conta das visitas
    const choice = chooseAutonomous(world, this.sim.catalog, folk, this.sim.getNav());
    if (!choice) return;
    if (choice.socialId !== undefined && choice.otherId !== undefined) {
      this.order({ type: 'queueSocial', folkId: folk.id, otherId: choice.otherId, socialId: choice.socialId });
    } else if (choice.messId !== undefined) {
      this.order({ type: 'queueTidy', folkId: folk.id, messId: choice.messId });
    } else if (choice.serviceId !== undefined) {
      this.order({ type: 'callService', folkId: folk.id, service: choice.serviceId });
    } else if (choice.objectId !== undefined && choice.interactionId) {
      this.order({ type: 'queueUse', folkId: folk.id, objectId: choice.objectId, interactionId: choice.interactionId });
    }
  }

  private baby(folk: Folk): boolean {
    if (!isAdult(folk)) return false;
    const world = this.sim.world;
    for (const baby of kidsOf(world, 'baby')) {
      const crib = cribOf(world, baby);
      if (!crib) continue;
      if (world.folks.some((f) => f !== folk && f.queue.some((a) => a.objectId === crib.id))) continue;
      const care = babyWant(baby, CARE_BELOW);
      if (!care || (baby.kid!.asleep && (care === 'hold' || care === 'lull'))) continue;
      if (baby.needs[CARE_NEED[care]] >= CARE_BELOW) continue;
      const it = this.sim.defOf(crib)?.interactions.find((i) => i.baby === care);
      if (it && this.order({ type: 'queueUse', folkId: folk.id, objectId: crib.id, interactionId: it.id })) return true;
    }
    return false;
  }

  /** Alguém da casa jogando sozinho um jogo de dois? Manda o parado sentar junto. */
  private joinGame(folk: Folk): boolean {
    if (folk.needs.fun > 92) return false;
    for (const other of this.sim.world.folks) {
      const a = other.queue[0];
      if (other === folk || other.visit || a?.phase !== 'using' || a.objectId === undefined) continue;
      const it = this.sim.interactionOf(a);
      if (!it?.duo) continue;
      if (this.order({ type: 'queueUse', folkId: folk.id, objectId: a.objectId, interactionId: it.id })) return true;
    }
    return false;
  }

  private homework(folk: Folk, hour: number): boolean {
    if (!inSchool(folk) || folk.kid?.homework !== 'due' || hour < 15 || hour >= 22) return false;
    return this.use(folk, (it) => !!it.homework);
  }

  /** Manda usar o objeto mais perto (ou o melhor, com `rank`) que serve; tenta o próximo se recusar. */
  private use(folk: Folk, pick: (it: InteractionDef) => boolean, rank?: (it: InteractionDef) => number): boolean {
    for (const c of this.candidates(folk, pick, rank)) {
      if (this.order({ type: 'queueUse', folkId: folk.id, objectId: c.obj.id, interactionId: c.it.id })) return true;
    }
    return false;
  }

  private find(folk: Folk, pick: (it: InteractionDef) => boolean) {
    return this.candidates(folk, pick)[0];
  }

  private candidates(folk: Folk, pick: (it: InteractionDef) => boolean, rank?: (it: InteractionDef) => number) {
    const world = this.sim.world;
    const out: { obj: WorldObject; it: InteractionDef; d: number; r: number }[] = [];
    for (const obj of world.objects) {
      const def = this.sim.defOf(obj);
      if (!def) continue;
      for (const it of def.interactions) {
        if (it.hidden || !pick(it) || !interactionOpen(obj, it) || !interactionReady(world, it)) continue;
        if ((it.cost ?? 0) > world.household.funds) continue;
        // como quem olha a casa: não manda deitar numa cama que já tem gente
        if (isSleep(it) && this.busy(folk, obj, def.slots ?? 1)) continue;
        out.push({ obj, it, d: Math.abs(obj.x - folk.x) + Math.abs(obj.y - folk.y), r: rank ? rank(it) : 0 });
      }
    }
    return out.sort((a, b) => a.r - b.r || a.d - b.d);
  }

  private busy(folk: Folk, obj: WorldObject, slots: number): boolean {
    const using = this.sim.world.folks.filter((f) => f !== folk && f.queue[0]?.objectId === obj.id && f.queue[0]?.phase === 'using');
    return using.length >= slots;
  }
}

/** Roda `minutes` minutos de jogo com o jogador de teste mandando. */
export function play(sim: Sim, minutes: number, every = 1): TestPlayer {
  const p = new TestPlayer(sim, every);
  for (let i = 0; i < minutes; i++) p.step();
  return p;
}

/** Roda até a condição valer (ou até `limit` minutos), com o jogador mandando. */
export function playUntil(sim: Sim, cond: () => boolean, limit: number, player = new TestPlayer(sim)): boolean {
  for (let i = 0; i < limit; i++) {
    if (cond()) return true;
    player.step();
  }
  return cond();
}

/** Um minuto com o jogador olhando (o jogador não guarda estado entre minutos). */
export function playStep(sim: Sim): void {
  new TestPlayer(sim).step();
}
