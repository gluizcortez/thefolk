import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { starterHouse } from '../src/data/house';
import {
  BANDS,
  GARMENTS,
  MAX_SETS,
  OCCASIONS,
  bandOf,
  ensembleOf,
  ensembleProblems,
  fitEnsemble,
  isWorkout,
  legacyCloset,
  legacyEnsemble,
  ownedGarments,
  refitCloset,
  shopFor,
  wearPiece,
} from '../src/sim/clothes';
import type { Ensemble } from '../src/sim/clothes';
import { setStage } from '../src/sim/life';
import { CHANGE_MINUTES, SAVE_VERSION, Sim, createWorld, deserialize, serialize, wearOf } from '../src/sim';
import type { Folk, InteractionDef } from '../src/sim';
import { faceFromSeed, fullLook } from '../src/sim/temper';

const LOOK = fullLook({ skin: 1, hair: 2, shirt: 1, pants: 2, style: 2, face: 0, body: 1, formal: 2, sleepwear: 1, swimwear: 3, ...faceFromSeed(4) });

function itOf(defId: string, id: string): InteractionDef {
  const it = CATALOG.objects[defId]?.interactions.find((i) => i.id === id);
  if (!it) throw new Error(`${defId}:${id}`);
  return it;
}

describe('peças de roupa (plano 2, bloco 9)', () => {
  it('toda peça tem lugar, faixa de idade e áreas de tecido válidas', () => {
    for (const g of Object.values(GARMENTS)) {
      expect(g.bands.length).toBeGreaterThan(0);
      expect(g.zones.length).toBeGreaterThan(0);
      if (g.slot === 'top' || g.slot === 'full') expect(g.sleeve).toBeDefined();
      if (g.slot === 'bottom' || g.slot === 'full') expect(g.leg).toBeDefined();
      if (g.slot === 'shoes') expect(g.shoe).toBeDefined();
    }
    // cada idade tem o básico para todas as ocasiões
    for (const band of BANDS) {
      for (const o of OCCASIONS) {
        const e = legacyEnsemble(LOOK, o, band === 'adult' ? undefined : band);
        expect(ensembleProblems(e, band, o)).toEqual([]);
      }
    }
  });

  it('peças por idade: paletó não serve na criança, jardineira não serve no adulto', () => {
    expect(GARMENTS.blazer.bands).not.toContain('child');
    expect(GARMENTS.overalls.bands).toEqual(['child', 'teen']);
    expect(GARMENTS.cardigan.bands).toContain('elder');
    const suit: Ensemble = { top: { g: 'blazer' }, bottom: { g: 'slacks' }, shoes: { g: 'shoes' } };
    expect(ensembleProblems(suit, 'adult', 'formal')).toEqual([]);
    expect(ensembleProblems(suit, 'child', 'formal')).toEqual(['age:top', 'age:bottom', 'age:shoes']);
    // a jardineira do jovem que virou adulto vira camiseta e calça básicas, na mesma cor
    const kid: Ensemble = { full: { g: 'overalls', style: { main: { mat: 'cotton', color: 'red' } } }, shoes: { g: 'sneakers' } };
    const grown = fitEnsemble(kid, 'adult', 'day');
    expect(grown.full).toBeUndefined();
    expect(grown.top?.g).toBeDefined();
    expect(grown.bottom?.style?.main?.color).toBe('red');
    expect(ensembleProblems(grown, 'adult', 'day')).toEqual([]);
    // loja: só o que serve na idade
    expect(shopFor('child').every((g) => g.bands.includes('child'))).toBe(true);
    expect(shopFor('child').some((g) => g.id === 'overalls')).toBe(true);
    expect(shopFor('adult').some((g) => g.id === 'overalls')).toBe(false);
    expect(shopFor('elder').some((g) => g.id === 'cardigan')).toBe(true);
    expect(bandOf('baby')).toBeNull();
    expect(bandOf(undefined)).toBe('adult');
  });

  it('peça inteira tira as partes; corpo precisa estar coberto (menos no banho)', () => {
    let e: Ensemble = { top: { g: 'tee' }, bottom: { g: 'jeans' } };
    e = wearPiece(e, { g: 'dress' }, 'full');
    expect(e.top).toBeUndefined();
    expect(e.bottom).toBeUndefined();
    e = wearPiece(e, { g: 'skirt' }, 'bottom');
    expect(e.full).toBeUndefined();
    expect(ensembleProblems(e, 'adult', 'day')).toEqual(['needs:top']);
    expect(ensembleProblems({ bottom: { g: 'trunks' } }, 'adult', 'swim')).toEqual([]);
    expect(ensembleProblems({ full: { g: 'robe' } }, 'adult', 'day')).toEqual(['hidden:full']);
  });

  it('crescer acerta o guarda-roupa: a camiseta de estrela vira camiseta, a cor fica', () => {
    const p: { age?: Folk['age']; closet?: Folk['closet'] } = { age: 'child', closet: legacyCloset(LOOK, 'child') };
    const before = p.closet!.sets.day![0];
    expect(before.top?.g).toBe('kidtee');
    setStage(p, 'teen');
    const after = p.closet!.sets.day![0];
    expect(after.top?.g).not.toBe('kidtee');
    expect(after.top?.style?.main?.color).toBe(before.top?.style?.main?.color);
    expect(ensembleProblems(after, 'teen', 'day')).toEqual([]);
    expect(refitCloset(p.closet!, 'elder').sets.formal![0].top?.g).toBe('polo');
  });
});

describe('qual conjunto vestir em cada ação (plano 2, bloco 9)', () => {
  it('cama põe o de dormir, piscina o de nadar, exercício o de ginástica, chuveiro o roupão', () => {
    const sim = new Sim(CATALOG, createWorld(starterHouse(3)));
    const folk = sim.residents()[0];
    expect(wearOf(folk, itOf('bed', 'sleep'))).toBe('sleep');
    expect(wearOf(folk, itOf('shower', 'shower'))).toBe('bath');
    expect(wearOf(folk, itOf('yogamat', 'yoga'))).toBe('gym');
    expect(wearOf(folk, itOf('yogamat', 'stretch'))).toBe('day');
    const pool = Object.values(CATALOG.objects).flatMap((d) => d.interactions).find((i) => i.wear === 'swim')!;
    expect(wearOf(folk, pool)).toBe('swim');
    expect(isWorkout({ skill: { id: 'fitness', xpPerMinute: 1.4 } })).toBe(true);
    expect(isWorkout({ skill: { id: 'fitness', xpPerMinute: 1.4 }, book: 'training' })).toBe(false);
    // o conjunto é o escolhido da ocasião
    const closet = legacyCloset(folk.look, folk.age);
    closet.sets.sleep!.push({ full: { g: 'nightgown' }, shoes: { g: 'slippers' } });
    closet.pick.sleep = 1;
    folk.closet = closet;
    expect(ensembleOf(folk, wearOf(folk, itOf('bed', 'sleep'))).full?.g).toBe('nightgown');
    expect(ensembleOf(folk, 'bath').full?.g).toBe('robe');
    expect(ensembleOf(folk, 'day').top?.g).toBe('shirt');
  });

  it('troca de roupa na entrada: alguns minutos trocando antes de deitar', () => {
    const sim = new Sim(CATALOG, createWorld(starterHouse(5)));
    const folk = sim.residents()[0];
    const bed = sim.world.objects.find((o) => o.defId === 'bed')!;
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: bed.id, interactionId: 'sleep' })).toBe(true);
    let seen = 0;
    let usedAfter = -1;
    for (let i = 0; i < 200; i++) {
      sim.step();
      const a = folk.queue[0];
      if (!a) break;
      if (a.changing && a.phase !== 'using') seen++;
      if (a.phase === 'using') {
        usedAfter = i;
        break;
      }
    }
    expect(seen).toBe(CHANGE_MINUTES);
    expect(usedAfter).toBeGreaterThan(0);
    // já de pijama: a próxima vez não troca de novo (a ação que pede a mesma roupa)
    expect(wearOf(folk, sim.interactionOf(folk.queue[0]))).toBe('sleep');
  });
});

describe('guarda-roupa e loja (plano 2, bloco 9)', () => {
  it('guarda conjunto só com peças da casa e da idade; comprar libera a peça', () => {
    const sim = new Sim(CATALOG, createWorld(starterHouse(6)));
    const folk = sim.residents()[0];
    const set: Ensemble = { top: { g: 'blazer', style: { main: { mat: 'velvet', color: 'plum' } } }, bottom: { g: 'slacks' }, shoes: { g: 'shoes' } };
    expect(sim.dispatch({ type: 'saveOutfit', folkId: folk.id, occasion: 'formal', index: 1, ensemble: set })).toBe(false);
    const funds = sim.world.household.funds;
    expect(sim.dispatch({ type: 'buyGarment', garmentId: 'blazer' })).toBe(true);
    expect(sim.world.household.funds).toBe(funds - GARMENTS.blazer.price);
    expect(sim.dispatch({ type: 'buyGarment', garmentId: 'blazer' })).toBe(false);
    expect(ownedGarments(sim.world.household.garments).has('blazer')).toBe(true);
    expect(sim.dispatch({ type: 'saveOutfit', folkId: folk.id, occasion: 'formal', index: 1, ensemble: set })).toBe(true);
    expect(folk.closet!.sets.formal!.length).toBe(2);
    expect(folk.closet!.pick.formal).toBe(1);
    expect(ensembleOf(folk, 'formal').top?.style?.main).toEqual({ mat: 'velvet', color: 'plum' });
    // cor que não combina com o material sai na limpeza
    expect(sim.dispatch({ type: 'saveOutfit', folkId: folk.id, occasion: 'day', index: 1, ensemble: { top: { g: 'tee', style: { main: { mat: 'chrome' } } }, bottom: { g: 'jeans' } } })).toBe(true);
    expect(folk.closet!.sets.day![1].top).toEqual({ g: 'tee' });
    // até 3 por ocasião
    expect(sim.dispatch({ type: 'saveOutfit', folkId: folk.id, occasion: 'day', index: 2, ensemble: { top: { g: 'tank' }, bottom: { g: 'shorts' } } })).toBe(true);
    expect(sim.dispatch({ type: 'saveOutfit', folkId: folk.id, occasion: 'day', index: MAX_SETS, ensemble: { top: { g: 'tank' }, bottom: { g: 'shorts' } } })).toBe(false);
    // escolher e apagar
    expect(sim.dispatch({ type: 'pickOutfit', folkId: folk.id, occasion: 'day', index: 0 })).toBe(true);
    expect(sim.dispatch({ type: 'dropOutfit', folkId: folk.id, occasion: 'day', index: 2 })).toBe(true);
    expect(folk.closet!.sets.day!.length).toBe(2);
    // sem a parte de cima não guarda
    expect(sim.dispatch({ type: 'saveOutfit', folkId: folk.id, occasion: 'day', index: 0, ensemble: { bottom: { g: 'jeans' } } })).toBe(false);
  });

  it('o guarda-roupa troca para o conjunto da ocasião', () => {
    const sim = new Sim(CATALOG, createWorld(starterHouse(7)));
    const folk = sim.residents()[0];
    const wardrobe = sim.world.objects.find((o) => o.defId === 'wardrobe')!;
    for (const o of OCCASIONS) expect(CATALOG.objects.wardrobe.interactions.some((i) => i.dress === o)).toBe(true);
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: wardrobe.id, interactionId: 'dress_cold' })).toBe(true);
    for (let i = 0; i < 150 && folk.outfit !== 'cold'; i++) sim.step();
    expect(folk.outfit).toBe('cold');
    expect(ensembleOf(folk, wearOf(folk)).scarf?.g).toBe('scarf');
  });
});

describe('save v29 (plano 2, bloco 9)', () => {
  it('moradores ganham guarda-roupa com as cores de antes', () => {
    const sim = new Sim(CATALOG, createWorld(starterHouse(2)));
    const old = serialize(sim.world, 0);
    const w = JSON.parse(JSON.stringify(old.world));
    for (const f of w.folks) delete f.closet;
    delete w.household.garments;
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(29);
    const loaded = deserialize({ ...old, version: 28, world: w }, { neighbors: [], catalog: CATALOG });
    const folk = loaded.world.folks[0];
    expect(folk.closet).toBeDefined();
    expect(loaded.world.household.garments).toEqual([]);
    for (const o of OCCASIONS) expect(folk.closet!.sets[o]!.length).toBe(1);
    expect(folk.closet!.sets.day![0]).toEqual(legacyEnsemble(folk.look, 'day', folk.age));
  });
});
