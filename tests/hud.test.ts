import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { feelingsOf, fullNeeds, isEffort, relationOf } from '../src/sim';
import type { Folk } from '../src/sim';
import { noticeTarget } from '../src/game/controller';
import { RING_MAX, interactionState, objectGroup, ringCenter, ringPoints, ringSlots, socialState } from '../src/ui/ring';
import { householdSim, openField } from './helpers';

function kitchen() {
  const sim = openField(8, 3, [{ defId: 'fridge', x: 6, y: 1 }, { defId: 'tv', x: 0, y: 1 }], { x: 3, y: 1, needs: { ...fullNeeds(60) } });
  const folk = sim.world.folks[0];
  const [fridge, tv] = sim.world.objects;
  return { sim, folk, fridge, tv };
}

describe('menu em anel: agrupamento (plano 2, bloco 2)', () => {
  const item = (id: string, group?: string) => ({ id, group });

  it('até RING_MAX opções vão soltas, cada uma numa fatia', () => {
    const items = Array.from({ length: RING_MAX }, (_, i) => item(`a${i}`, i % 2 ? 'x' : 'y'));
    const slots = ringSlots(items);
    expect(slots).toHaveLength(RING_MAX);
    expect(slots.every((s) => s.kind === 'item')).toBe(true);
  });

  it('passando de RING_MAX, o mesmo grupo vira uma fatia na posição da primeira', () => {
    const items = [item('control'), item('hi', 'friendly'), item('joke', 'friendly'), item('flirt', 'romantic'), item('kiss', 'romantic'), item('hug', 'friendly'), item('insult', 'mean')];
    const slots = ringSlots(items);
    expect(slots.map((s) => (s.kind === 'group' ? `${s.group}:${s.items.length}` : s.item.id))).toEqual(['control', 'friendly:3', 'romantic:2', 'insult']);
  });

  it('grupo com uma opção só volta a ser a opção', () => {
    const items = [...Array.from({ length: 7 }, (_, i) => item(`f${i}`, 'friendly')), item('solo', 'mean')];
    const slots = ringSlots(items);
    expect(slots).toHaveLength(2);
    expect(slots[1]).toEqual({ kind: 'item', item: { id: 'solo', group: 'mean' } });
  });

  it('as fatias começam em cima e dão a volta; o anel é puxado para dentro da tela', () => {
    const pts = ringPoints(4, 100);
    expect(pts).toEqual([
      { x: 0, y: -100 },
      { x: 100, y: 0 },
      { x: 0, y: 100 },
      { x: -100, y: 0 },
    ]);
    expect(ringCenter(10, 10, 200, 120, 1280, 800)).toEqual({ x: 208, y: 128 });
    expect(ringCenter(640, 400, 200, 120, 1280, 800)).toEqual({ x: 640, y: 400 });
    expect(ringCenter(1270, 795, 200, 120, 1280, 800)).toEqual({ x: 1072, y: 672 });
  });

  it('grupos dos objetos: cuidar, aprender, telefonar, usar', () => {
    const fridge = CATALOG.objects.fridge;
    const meal = fridge.interactions.find((i) => i.id === 'meal')!;
    expect(objectGroup(meal)).toBe('learn');
    const care = Object.values(CATALOG.objects).flatMap((d) => d.interactions).find((i) => i.care === 'repair')!;
    expect(objectGroup(care)).toBe('care');
    const call = Object.values(CATALOG.objects).flatMap((d) => d.interactions).find((i) => i.special === 'services')!;
    expect(objectGroup(call)).toBe('phone');
    expect(objectGroup(CATALOG.objects.tv.interactions.find((i) => i.id === 'watch')!)).toBe('use');
  });
});

describe('menu em anel: o que fica em cinza e por quê', () => {
  it('quebrado aparece em cinza com o motivo; consertar só aparece quando quebrou', () => {
    const { sim, folk, tv } = kitchen();
    const def = CATALOG.objects.tv;
    const watch = def.interactions.find((i) => i.id === 'watch')!;
    const repair = def.interactions.find((i) => i.care === 'repair');
    expect(interactionState(sim.world, CATALOG, folk, tv, watch)).toEqual({ show: true, why: null, reluctant: null });
    if (repair) expect(interactionState(sim.world, CATALOG, folk, tv, repair).show).toBe(false);
    tv.state = { ...(tv.state ?? { dirt: 0, wear: 0, fill: 0, repair: 0, patched: false }), broken: true } as typeof tv.state;
    expect(interactionState(sim.world, CATALOG, folk, tv, watch)).toMatchObject({ show: true, why: 'broken' });
    if (repair) expect(interactionState(sim.world, CATALOG, folk, tv, repair)).toMatchObject({ show: true, why: null });
  });

  it('sem comida na geladeira, cozinhar fica em cinza; comida pedida também', () => {
    const { sim, folk, fridge } = kitchen();
    const meal = CATALOG.objects.fridge.interactions.find((i) => i.id === 'meal')!;
    const takeout = CATALOG.objects.fridge.interactions.find((i) => i.id === 'takeout')!;
    sim.world.household.pantry = 0;
    sim.world.household.takeout = 0;
    expect(interactionState(sim.world, CATALOG, folk, fridge, meal).why).toBe('noFood');
    expect(interactionState(sim.world, CATALOG, folk, fridge, takeout).why).toBe('noTakeout');
    sim.world.household.pantry = 10;
    expect(interactionState(sim.world, CATALOG, folk, fridge, meal).why).toBeNull();
  });

  it('cansado ou de mau humor ainda dá para mandar, mas avisa que ele vai reclamar', () => {
    const [defId, def] = Object.entries(CATALOG.objects).find(([, d]) => d.interactions.some((i) => isEffort(i)))!;
    const it = def.interactions.find((i) => isEffort(i))!;
    const sim = openField(8, 3, [{ defId, x: 5, y: 0 }], { x: 1, y: 1, needs: { ...fullNeeds(60) } });
    const folk = sim.world.folks[0];
    folk.needs.energy = 2;
    const st = interactionState(sim.world, CATALOG, folk, sim.world.objects[0], it);
    expect(st.why).toBeNull();
    expect(st.reluctant).toBe('energy');
  });

  it('conversa que pede amizade aparece em cinza com quanto falta; sem presente, dar presente também', () => {
    const sim = householdSim();
    const [a, b] = sim.household();
    const hug = Object.values(CATALOG.socials).find((d) => d.requires?.friendship === 30 && d.category === 'friendly' && Object.keys(d.requires).length === 1)!;
    const rel = relationOf(sim.world, a.id, b.id);
    if (rel) rel.friendship = 0;
    const st = socialState(sim.world, CATALOG, hug, a, b);
    expect(st).toEqual({ show: true, why: 'friendship', need: 30 });
    const gift = CATALOG.socials.giveGift;
    a.gifts = [];
    expect(socialState(sim.world, CATALOG, gift, a, b).why).toBe('noGift');
    a.gifts = ['bombons'];
    expect(socialState(sim.world, CATALOG, gift, a, b)).toEqual({ show: true, why: null });
  });
});

describe('sensações (plano 2, bloco 2)', () => {
  it('necessidade baixa vira sensação ruim, e as ruins vêm primeiro', () => {
    const { sim, folk } = kitchen();
    folk.needs.hunger = 10;
    folk.inspired = sim.world.tick + 120;
    const list = feelingsOf(sim.world, CATALOG, folk);
    expect(list[0]).toMatchObject({ id: 'hungry', tone: 'bad', params: { n: 10, urgent: 1 } });
    const insp = list.find((f) => f.id === 'inspired');
    expect(insp).toMatchObject({ tone: 'good', until: sim.world.tick + 120 });
    expect(list.findIndex((f) => f.id === 'inspired')).toBeGreaterThan(0);
  });

  it('luto e susto têm prazo; sem nada especial, a lista fica vazia', () => {
    const { sim, folk } = kitchen();
    expect(feelingsOf(sim.world, CATALOG, folk).filter((f) => f.tone !== 'calm')).toEqual([]);
    folk.mourning = sim.world.tick + 3000;
    (folk as Folk).frightened = sim.world.tick;
    const ids = feelingsOf(sim.world, CATALOG, folk).map((f) => f.id);
    expect(ids).toContain('mourning');
    expect(ids).toContain('scared');
  });
});

describe('fila: arrastar muda a ordem', () => {
  it('move a ação para outra posição sem tocar na de agora', () => {
    const { sim, folk, fridge, tv } = kitchen();
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: fridge.id, interactionId: 'snack' });
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: tv.id, interactionId: 'watch', append: true });
    sim.dispatch({ type: 'queueGoto', folkId: folk.id, x: 1, y: 0, append: true });
    const [cur, second, third] = folk.queue.map((a) => a.id);
    expect(sim.dispatch({ type: 'moveQueued', folkId: folk.id, actionId: third, to: 1 })).toBe(true);
    expect(folk.queue.map((a) => a.id)).toEqual([cur, third, second]);
    // a de agora não sai do lugar, nem vai para o começo
    expect(sim.dispatch({ type: 'moveQueued', folkId: folk.id, actionId: cur, to: 2 })).toBe(false);
    sim.dispatch({ type: 'moveQueued', folkId: folk.id, actionId: second, to: 0 });
    expect(folk.queue[0].id).toBe(cur);
    expect(folk.queue.map((a) => a.id)).toEqual([cur, second, third]);
  });
});

describe('avisos levam a câmera ao lugar', () => {
  it('acha o objeto quebrado pelo nome e a pessoa pelo nome', () => {
    const sim = householdSim();
    const tv = sim.world.objects.find((o) => o.defId === 'tv')!;
    tv.state = { ...(tv.state ?? { dirt: 0, wear: 0, fill: 0, repair: 0, patched: false }), broken: true } as typeof tv.state;
    const folk = sim.household()[0];
    expect(noticeTarget(sim.world, CATALOG, { tick: 0, key: 'log.broke', params: { object: CATALOG.objects.tv.name, name: folk.name } })).toEqual({ x: tv.x, y: tv.y });
    expect(noticeTarget(sim.world, CATALOG, { tick: 0, key: 'log.promoted', params: { name: folk.name } })).toEqual({ folkId: folk.id });
    expect(noticeTarget(sim.world, CATALOG, { tick: 0, key: 'log.allWishes', params: { name: 'Ninguém' } })).toBeNull();
  });
});
