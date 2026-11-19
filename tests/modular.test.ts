import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { ptBR } from '../src/i18n/pt-BR';
import { SAVE_VERSION, deserialize, serialize } from '../src/sim';
import { KINDS, PARTS, assemble, kitZones, partsFor } from '../src/sim/parts';
import type { KitKind } from '../src/sim/parts';
import { MATERIALS, PATTERNS, ROLE_ZONES, SWATCHES, adaptStyle, cleanStyle, stylePrice } from '../src/sim/style';
import { LIFT_GAP, hasSurface, itemsOn, priceWith, supportAt, zonesOf } from '../src/sim/modular';
import { DISHWASHER_LOAD, LAUNDRY_OK, careAvailable, stateAmbience } from '../src/sim/upkeep';
import { checkPlacement } from '../src/sim/economy';
import { openField, run } from './helpers';

const KIT_IDS = Object.values(CATALOG.objects).filter((d) => d.kit);

describe('montagem por peças (plano 2, bloco 8)', () => {
  it('todo kit do catálogo monta sem problema, cabe no lugar e tem nome para cada peça', () => {
    expect(KIT_IDS.length).toBeGreaterThanOrEqual(27);
    for (const def of KIT_IDS) {
      const a = assemble(def.kit!.kind, def.kit!.parts, def.size);
      expect(a.problems, def.id).toEqual([]);
      expect(a.size.w, def.id).toBeLessThanOrEqual(def.size.w);
      expect(a.size.d, def.id).toBeLessThanOrEqual(def.size.h);
      expect(a.size.h, def.id).toBeGreaterThan(0.3);
      // os lugares de sentar não mudam com as peças
      if (KINDS[def.kit!.kind].seatTop !== undefined) expect(a.seats, def.id).toBe(def.slots ?? 1);
    }
    for (const part of PARTS) expect(ptBR[`part.${part.slot}.${part.id}`], `${part.slot}.${part.id}`).toBeTruthy();
    for (const m of Object.keys(MATERIALS)) expect(ptBR[`mat.${m}`], m).toBeTruthy();
    for (const c of Object.keys(SWATCHES)) expect(ptBR[`color.${c}`], c).toBeTruthy();
    for (const p of PATTERNS) expect(ptBR[`pattern.${p}`], p).toBeTruthy();
  });

  it('peça de outro tipo de móvel não entra, e o que uma peça pede das outras é conferido', () => {
    expect(assemble('sofa', { seat: 'slab' }, { w: 2, h: 1 }).problems).toContain('fit:seat:slab');
    expect(assemble('chair', { arms: 'round' } as never, { w: 1, h: 1 }).problems).toEqual([]);
    // babado vai até o chão: não aceita pé
    expect(assemble('sofa', { frame: 'skirt', legs: 'peg' }, { w: 2, h: 1 }).problems).toContain('needs:frame:skirt:legs');
    expect(assemble('sofa', { frame: 'skirt', legs: 'none' }, { w: 2, h: 1 }).problems).toEqual([]);
    // tampo redondo não vai em cavalete
    expect(assemble('table', { top: 'round', legs: 'trestle' }, { w: 2, h: 1 }).problems).toContain('needs:top:round:legs');
    // cadeira de tubo pede pé de tubo
    expect(assemble('chair', { frame: 'tube', legs: 'peg' }, { w: 1, h: 1 }).problems.length).toBeGreaterThan(0);
  });

  it('tamanho final: o assento fica na mesma altura com qualquer pé, e braço grosso não cabe em poltrona estreita demais', () => {
    const tall = assemble('sofa', { legs: 'hairpin' }, { w: 2, h: 1 });
    const flat = assemble('sofa', { legs: 'block' }, { w: 2, h: 1 });
    expect(tall.legH).toBeGreaterThan(flat.legH);
    expect(tall.legH + tall.frameH).toBeCloseTo(flat.legH + flat.frameH, 5);
    const high = assemble('sofa', { back: 'high' }, { w: 2, h: 1 });
    const low = assemble('sofa', { back: 'low' }, { w: 2, h: 1 });
    expect(high.size.h).toBeGreaterThan(low.size.h);
    // braços tiram largura do assento; dois lugares precisam de 1 m livre
    const thin = assemble('sofa', { arms: 'thin' }, { w: 2, h: 1 });
    const round = assemble('sofa', { arms: 'round' }, { w: 2, h: 1 });
    expect(thin.inner!).toBeGreaterThan(round.inner!);
    expect(assemble('armchair', { arms: 'round' }, { w: 1, h: 1 }).problems).toEqual([]);
    // braço enrolado num assento estreito demais não cabe; o fino cabe
    expect(assemble('armchair', { arms: 'round' }, { w: 0.9, h: 1 }).problems).toContain('tooNarrow');
    expect(assemble('armchair', { arms: 'thin' }, { w: 0.9, h: 1 }).problems).toEqual([]);
    // cama: colchão sempre a 0,5 m
    const bed = assemble('bed', { legs: 'hairpin' }, { w: 1, h: 2 });
    expect(bed.legH + bed.frameH + 0.24).toBeCloseTo(KINDS.bed.top!, 5);
  });

  it('cada tipo de móvel tem ao menos duas peças em cada encaixe que muda a cara', () => {
    for (const kind of Object.keys(KINDS) as KitKind[]) {
      const k = KINDS[kind];
      const varied = k.slots.filter((slot) => partsFor(kind, slot).length >= 2);
      expect(varied.length, kind).toBeGreaterThanOrEqual(Math.min(3, k.slots.length));
      expect(kitZones(kind).length).toBe(k.slots.length);
    }
  });
});

describe('estilo por parte (plano 2, bloco 8)', () => {
  it('limpa o que não combina: veludo não vai no pé, padrão só em tecido e fórmica, ébano não tinge', () => {
    const zones = kitZones('sofa');
    const style = cleanStyle(zones, {
      seat: { mat: 'velvet', color: 'plum' },
      legs: { mat: 'velvet' },
      back: { mat: 'cotton', color: 'teal', pattern: 'floral' },
      arms: { mat: 'leather', pattern: 'stripes' },
      frame: { mat: 'ebony', color: 'red' },
      bogus: { mat: 'oak' },
    });
    expect(style).toEqual({ seat: { mat: 'velvet', color: 'plum' }, back: { mat: 'cotton', color: 'teal', pattern: 'floral' } });
  });

  it('material nobre e estampa custam mais; o preço da compra soma peças e estilo', () => {
    const sofa = CATALOG.objects.sofa;
    const plain = priceWith(sofa);
    expect(plain).toBe(sofa.price);
    expect(priceWith(sofa, undefined, { seat: { mat: 'leather', color: 'brown' } })).toBe(sofa.price + MATERIALS.leather.price);
    expect(priceWith(sofa, { seat: 'tufted' })).toBeGreaterThan(plain);
    expect(stylePrice(kitZones('sofa'), { back: { mat: 'cotton', color: 'blue', pattern: 'check' } })).toBeGreaterThan(0);
  });

  it('estilo salvo passa para outro móvel pela família do material', () => {
    const saved = { seat: { mat: 'velvet', color: 'teal' }, legs: { mat: 'brass' } } as const;
    const chair = adaptStyle({ ...saved }, kitZones('chair'))!;
    expect(chair.seat).toEqual({ mat: 'velvet', color: 'teal' });
    expect(chair.legs).toEqual({ mat: 'brass' });
    // num desenho antigo, o tecido vai para a zona de tecido
    const legacy = adaptStyle({ ...saved }, Object.values(ROLE_ZONES).map((z) => ({ ...z, base: { mat: '' } })))!;
    expect(legacy.fabric).toEqual({ mat: 'velvet', color: 'teal' });
    expect(legacy.metal).toEqual({ mat: 'brass' });
  });

  it('comprar com peças e estilo guarda só o que difere da fábrica e cobra a diferença', () => {
    const sim = openField(8, 8, [], { x: 0, y: 0 }, 1, 5000);
    const before = sim.world.household.funds;
    expect(
      sim.dispatch({ type: 'buy', defId: 'sofa', x: 2, y: 2, rot: 0, parts: { arms: 'round', legs: 'hairpin' }, style: { seat: { mat: 'leather', color: 'black' }, legs: { mat: 'walnut' } } }),
    ).toBe(true);
    const obj = sim.world.objects[0];
    expect(obj.parts).toEqual({ legs: 'hairpin' });
    expect(obj.style).toEqual({ seat: { mat: 'leather', color: 'black' } });
    expect(before - sim.world.household.funds).toBe(priceWith(CATALOG.objects.sofa, obj.parts, obj.style));
    expect(obj.paid).toBe(before - sim.world.household.funds);
    // peças que não montam são recusadas
    expect(sim.dispatch({ type: 'buy', defId: 'sofa', x: 2, y: 5, rot: 0, parts: { frame: 'skirt', legs: 'peg' } })).toBe(false);
    expect(sim.lastProblem).toBe('badParts');
  });

  it('personalizar um objeto da casa paga só o que ficou mais caro', () => {
    const sim = openField(8, 8, [{ defId: 'chair', x: 3, y: 3 }], { x: 0, y: 0 }, 1, 500);
    const chair = sim.world.objects[0];
    const funds = sim.world.household.funds;
    expect(sim.dispatch({ type: 'restyle', objectId: chair.id, style: { seat: { mat: 'leather', color: 'navy' } } })).toBe(true);
    expect(funds - sim.world.household.funds).toBe(MATERIALS.leather.price);
    // voltar ao simples não devolve nada
    expect(sim.dispatch({ type: 'restyle', objectId: chair.id })).toBe(true);
    expect(chair.style).toBeUndefined();
    expect(funds - sim.world.household.funds).toBe(MATERIALS.leather.price);
  });

  it('guarda e apaga estilos da família (até doze)', () => {
    const sim = openField(4, 4, [], { x: 0, y: 0 });
    for (let i = 0; i < 14; i++) expect(sim.dispatch({ type: 'saveStyle', name: `s${i}`, style: { seat: { mat: 'cotton', color: 'red' } } })).toBe(true);
    const list = sim.world.household.styles!;
    expect(list.length).toBe(12);
    expect(list[0].name).toBe('s2');
    expect(sim.dispatch({ type: 'saveStyle', name: 'lixo', style: { seat: { mat: 'nada' } } })).toBe(false);
    expect(sim.dispatch({ type: 'dropStyle', styleId: list[0].id })).toBe(true);
    expect(sim.world.household.styles!.length).toBe(11);
  });
});

describe('tampos, enfeites e parede (plano 2, bloco 8)', () => {
  it('enfeite só vai em cima de tampo; um por tile, solto e girado em oitavos', () => {
    const sim = openField(8, 8, [{ defId: 'nightstand', x: 3, y: 3 }, { defId: 'sofa', x: 5, y: 5 }], { x: 0, y: 0 }, 1, 2000);
    expect(hasSurface(CATALOG.objects.nightstand)).toBe(true);
    expect(hasSurface(CATALOG.objects.sofa)).toBe(false);
    expect(hasSurface(CATALOG.objects.dinette)).toBe(true);
    expect(sim.dispatch({ type: 'buy', defId: 'vase', x: 1, y: 1, rot: 0 })).toBe(false);
    expect(sim.lastProblem).toBe('needsSurface');
    expect(sim.dispatch({ type: 'buy', defId: 'vase', x: 5, y: 5, rot: 0 })).toBe(false);
    expect(sim.dispatch({ type: 'buy', defId: 'tablelamp', x: 3, y: 3, rot: 0, nudge: { dx: 0.9, dy: -0.2 }, turn8: 3 })).toBe(true);
    const lamp = sim.world.objects.find((o) => o.defId === 'tablelamp')!;
    expect(lamp.nudge).toEqual({ dx: 0.35, dy: -0.2 });
    expect(lamp.turn8).toBe(3);
    expect(sim.dispatch({ type: 'buy', defId: 'vase', x: 3, y: 3, rot: 0 })).toBe(false);
    expect(sim.lastProblem).toBe('occupied');
    const stand = sim.world.objects[0];
    expect(supportAt(sim.world, CATALOG, 3, 3)?.id).toBe(stand.id);
    expect(itemsOn(sim.world, CATALOG, stand).map((o) => o.id)).toEqual([lamp.id]);
  });

  it('o tampo não se vende com coisa em cima, e ao mudar de lugar leva o enfeite junto', () => {
    const sim = openField(8, 8, [{ defId: 'endtable', x: 3, y: 3 }, { defId: 'vase', x: 3, y: 3 }], { x: 0, y: 0 }, 1, 2000);
    const table = sim.world.objects.find((o) => o.defId === 'endtable')!;
    const vase = sim.world.objects.find((o) => o.defId === 'vase')!;
    expect(sim.dispatch({ type: 'sell', objectId: table.id })).toBe(false);
    expect(sim.lastProblem).toBe('surfaceBusy');
    expect(sim.dispatch({ type: 'move', objectId: table.id, x: 5, y: 2, rot: 0 })).toBe(true);
    expect([vase.x, vase.y]).toEqual([5, 2]);
    expect(sim.dispatch({ type: 'undoBuy' })).toBe(true);
    expect([vase.x, vase.y]).toEqual([3, 3]);
    expect(sim.dispatch({ type: 'sell', objectId: vase.id })).toBe(true);
    expect(sim.dispatch({ type: 'sell', objectId: table.id })).toBe(true);
  });

  it('objeto de parede sobe e desce; dois na mesma parede só se chocam se estão perto', () => {
    const sim = openField(8, 8, [], { x: 4, y: 6 }, 1, 2000);
    sim.world.grid.edges['3,3,N'] = 'wall';
    expect(sim.dispatch({ type: 'buy', defId: 'painting', x: 3, y: 3, rot: 0 })).toBe(true);
    expect(checkPlacement(sim.world, CATALOG, 'shelf', 3, 3, 0, undefined, 1).ok).toBe(false);
    expect(sim.dispatch({ type: 'buy', defId: 'shelf', x: 3, y: 3, rot: 0, lift: LIFT_GAP })).toBe(true);
    const shelf = sim.world.objects.find((o) => o.defId === 'shelf')!;
    expect(shelf.lift).toBe(LIFT_GAP);
    expect(sim.dispatch({ type: 'buy', defId: 'wallclock', x: 3, y: 3, rot: 0, lift: 99 })).toBe(true);
    expect(sim.world.objects.find((o) => o.defId === 'wallclock')!.lift).toBe(4);
  });
});

describe('máquinas e banheira (plano 2, bloco 8)', () => {
  it('a louça vai para a lava-louças antes da pia, e ligar esvazia', () => {
    const sim = openField(10, 8, [{ defId: 'kitchensink', x: 2, y: 2 }, { defId: 'dishwasher', x: 6, y: 2 }], { x: 4, y: 4 }, 1, 2000);
    const washer = sim.world.objects.find((o) => o.defId === 'dishwasher')!;
    const sink = sim.world.objects.find((o) => o.defId === 'kitchensink')!;
    for (let i = 0; i < 3; i++) sim.world.mess.push({ id: sim.world.nextId++, kind: 'plate', x: 4, y: 5 + (i % 2), tick: 0, by: 0 });
    const folk = sim.world.folks[0];
    for (const m of [...sim.world.mess]) sim.dispatch({ type: 'queueTidy', folkId: folk.id, messId: m.id, append: true });
    run(sim, 120);
    expect(washer.dishes ?? 0).toBeGreaterThan(0);
    expect(sink.dishes ?? 0).toBe(0);
    const run1 = CATALOG.objects.dishwasher.interactions.find((i) => i.id === 'runDishwasher')!;
    expect(careAvailable(washer, run1)).toBe(true);
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: washer.id, interactionId: 'runDishwasher' })).toBe(true);
    run(sim, 30);
    expect(washer.dishes ?? 0).toBe(0);
    expect(washer.running).toBeGreaterThan(sim.world.tick);
    expect(DISHWASHER_LOAD).toBeGreaterThan(10);
  });

  it('banho deixa roupa no cesto da máquina; cesto cheio enfeia, lavar zera', () => {
    const sim = openField(10, 8, [{ defId: 'bathtub', x: 2, y: 2 }, { defId: 'washer', x: 6, y: 2 }], { x: 4, y: 5 }, 1, 2000);
    const tub = sim.world.objects.find((o) => o.defId === 'bathtub')!;
    const washer = sim.world.objects.find((o) => o.defId === 'washer')!;
    const folk = sim.world.folks[0];
    folk.needs.hygiene = 30;
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: tub.id, interactionId: 'bath' })).toBe(true);
    run(sim, 120);
    expect(washer.laundry).toBe(1);
    const clean = stateAmbience(washer, CATALOG.objects.washer);
    washer.laundry = LAUNDRY_OK + 4;
    expect(stateAmbience(washer, CATALOG.objects.washer)).toBeLessThan(clean);
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: washer.id, interactionId: 'washClothes' })).toBe(true);
    run(sim, 30);
    expect(washer.laundry ?? 0).toBe(0);
  });
});

describe('save v28 (plano 2, bloco 8)', () => {
  it('a cor do bloco 4 vira estilo na migração, na casa e nos objetos antigos', () => {
    const sim = openField(8, 8, [{ defId: 'sofa', x: 2, y: 2 }, { defId: 'crib', x: 5, y: 5 }], { x: 0, y: 0 });
    const old = serialize(sim.world, 0);
    const w = JSON.parse(JSON.stringify(old.world));
    w.objects[0].color = 'plum';
    w.objects[1].color = 'green';
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(28);
    const loaded = deserialize({ ...old, version: 27, world: w }, { neighbors: [], catalog: CATALOG });
    const [sofa, crib] = loaded.world.objects;
    expect(sofa.color).toBeUndefined();
    expect(sofa.style?.seat).toEqual({ mat: 'cotton', color: 'plum' });
    expect(sofa.style?.frame).toEqual({ mat: 'cotton', color: 'plum' });
    expect(crib.style?.fabric).toEqual({ mat: 'cotton', color: 'green' });
    expect(zonesOf(CATALOG.objects.crib).length).toBe(Object.keys(ROLE_ZONES).length);
  });
});
