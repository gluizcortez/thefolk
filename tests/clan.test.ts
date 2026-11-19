import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { starterHouse } from '../src/data/house';
import { NEIGHBORS, NEIGHBOR_TIES } from '../src/data/neighbors';
import { TOWN } from '../src/data/town';
import {
  NEW_FAMILY_FUNDS,
  NEW_LEAF,
  Sim,
  TOWN_HOUR,
  activeFamily,
  activeLot,
  barePrice,
  binFamilies,
  buildNav,
  createWorld,
  deserialize,
  familyById,
  familyLedger,
  foundTown,
  inviteProblem,
  lotPrice,
  lotSaleValue,
  lotStatus,
  membersOf,
  relationOf,
  serialize,
  splitProblem,
} from '../src/sim';
import type { FamilyDraft, World } from '../src/sim';
import { run } from './helpers';

const CTX = { neighbors: NEIGHBORS, ties: NEIGHBOR_TIES, catalog: CATALOG, town: TOWN };

function townSim(seed = 3): Sim {
  const world = createWorld(starterHouse(seed));
  foundTown(world, CATALOG, TOWN);
  return new Sim(CATALOG, world);
}

function lotOfFamily(w: World, name: string) {
  const fam = w.town!.families.find((f) => f.name === name)!;
  return { fam, lot: w.town!.lots.find((l) => l.id === fam.lotId)! };
}

const lotNumber = (w: World, n: number) => w.town!.lots.find((l) => l.number === n)!;

function draftFrom(w: World, surname: string): FamilyDraft {
  return {
    surname,
    members: [
      { name: 'Iara', look: { ...w.folks[0].look }, traits: ['gentil', 'caseiro', 'tagarela', 'romantico', 'ambicioso'], temper: { ...w.folks[0].temper }, month: w.folks[0].month, dream: 'casaDosSonhos' },
      { name: 'Davi', look: { ...w.folks[1].look }, traits: ['agitado', 'artistico', 'coruja', 'festeiro', 'atletico'], temper: { ...w.folks[1].temper }, month: w.folks[1].month },
    ],
    ties: [{ kind: 'spouse', a: 0, b: 1 }],
  };
}

/** Avança até a próxima vida resumida das outras casas. */
function toTownHour(sim: Sim): void {
  const day = 1440;
  const at = Math.floor(sim.world.tick / day) * day + TOWN_HOUR * 60;
  run(sim, (at > sim.world.tick ? at : at + day) - sim.world.tick + 1);
}

describe('plano 2, bloco 11: gaveta de famílias', () => {
  it('família nova vai para a gaveta, não vive lá e depois compra um lote e é jogada', () => {
    const sim = townSim();
    const w = sim.world;
    expect(sim.dispatch({ type: 'binDraft', draft: draftFrom(w, 'Goiabeira') })).toBe(true);
    const fam = binFamilies(w)[0];
    expect(fam.name).toBe('Goiabeira');
    expect(fam.lotId).toBe(0);
    expect(fam.funds).toBe(NEW_FAMILY_FUNDS);
    expect(fam.bin!.map((n) => n.name).sort()).toEqual(['Davi Goiabeira', 'Iara Goiabeira']);
    // ninguém da gaveta anda pelo mundo
    expect(w.neighbors.some((n) => n.home === fam.id)).toBe(false);
    // a vida resumida não mexe na gaveta (nem desfaz a família vazia de vizinhos)
    toTownHour(sim);
    expect(familyById(w, fam.id)?.funds).toBe(NEW_FAMILY_FUNDS);
    // compra a casa à venda sem os móveis (só terreno e obra)
    const lot = lotNumber(w, 6);
    const bare = barePrice(w, CATALOG, lot);
    expect(bare).toBeLessThan(lotPrice(w, CATALOG, lot));
    expect(sim.dispatch({ type: 'placeFamily', familyId: fam.id, lotId: lot.id, bare: true })).toBe(true);
    expect(fam.lotId).toBe(lot.id);
    expect(fam.funds).toBe(NEW_FAMILY_FUNDS - bare);
    expect(lotStatus(w, lot)).toBe('family');
    expect(lot.home!.objects.every((o) => CATALOG.objects[o.defId].price === 0)).toBe(true);
    expect(membersOf(w, fam.id)).toHaveLength(2);
    // e passa a ser jogada: chega com o sonho, os laços e em pé num tile livre
    expect(sim.dispatch({ type: 'playFamily', familyId: fam.id })).toBe(true);
    const iara = w.folks.find((f) => f.name === 'Iara Goiabeira')!;
    expect(iara.dream?.id).toBe('casaDosSonhos');
    const davi = w.folks.find((f) => f.name === 'Davi Goiabeira')!;
    expect(relationOf(w, iara.id, davi.id)?.bond).toBe('married');
    const nav = buildNav(w, CATALOG);
    for (const f of w.folks) expect(nav.isFree(f.x, f.y)).toBe(true);
    expect(w.household.funds).toBe(NEW_FAMILY_FUNDS - bare);
  });

  it('família do bairro vai para a gaveta vendendo a casa e volta para outro lote', () => {
    const sim = townSim();
    const w = sim.world;
    const { fam, lot } = lotOfFamily(w, 'Alpendre');
    const value = lotSaleValue(w, CATALOG, lot);
    const funds = fam.funds;
    const dora = w.neighbors.find((n) => n.name === 'Dora Alpendre')!;
    expect(sim.dispatch({ type: 'binFamily', familyId: fam.id })).toBe(true);
    expect(fam.lotId).toBe(0);
    expect(fam.funds).toBe(funds + value);
    expect(lotStatus(w, lot)).toBe('forSale');
    expect(w.neighbors.some((n) => n.id === dora.id)).toBe(false);
    expect(fam.bin!.some((n) => n.id === dora.id)).toBe(true);
    // a família em jogo não vai para a gaveta
    expect(sim.dispatch({ type: 'binFamily', familyId: 1 })).toBe(false);
    expect(sim.lastProblem).toBe('sameFamily');
    // lote vago: paga o terreno
    const vacant = lotNumber(w, 9);
    expect(sim.dispatch({ type: 'placeFamily', familyId: fam.id, lotId: vacant.id })).toBe(true);
    expect(fam.funds).toBe(funds + value - vacant.land);
    expect(w.neighbors.find((n) => n.id === dora.id)?.home).toBe(fam.id);
    // sem dinheiro não compra
    const other = lotOfFamily(w, 'Alpendre');
    expect(other.lot.id).toBe(vacant.id);
    expect(sim.dispatch({ type: 'binFamily', familyId: fam.id })).toBe(true);
    fam.funds = 10;
    expect(sim.dispatch({ type: 'placeFamily', familyId: fam.id, lotId: lot.id })).toBe(false);
    expect(sim.lastProblem).toBe('cantAfford');
  });

  it('save com família na gaveta volta igual; save v30 carrega sem gaveta', () => {
    const sim = townSim();
    const w = sim.world;
    sim.dispatch({ type: 'binDraft', draft: draftFrom(w, 'Goiabeira') });
    const back = deserialize(JSON.parse(JSON.stringify(serialize(w, 1))), CTX).world;
    expect(binFamilies(back)[0].bin).toHaveLength(2);
    const v30 = JSON.parse(JSON.stringify({ version: 30, savedAt: 1, world: townSim().world }));
    const loaded = deserialize(v30, CTX);
    expect(loaded.version).toBe(31);
    expect(binFamilies(loaded.world)).toHaveLength(0);
  });
});

describe('plano 2, bloco 11: dividir e juntar', () => {
  it('dividir: quem sai forma família na gaveta com parte do dinheiro; relações ficam', () => {
    const sim = townSim();
    const w = sim.world;
    const [tome, lia] = [w.folks.find((f) => f.name === 'Tomé Varanda')!, w.folks.find((f) => f.name === 'Lia Sacada')!];
    const rel = relationOf(w, tome.id, lia.id)!.friendship;
    w.household.funds = 5000;
    expect(splitProblem(w, [])).toBe('noOne');
    expect(splitProblem(w, [tome.id, lia.id])).toBe('allOfThem');
    lia.closet = lia.closet ?? undefined;
    expect(sim.dispatch({ type: 'splitFamily', memberIds: [lia.id], money: 2000, surname: 'Sacada' })).toBe(true);
    expect(w.household.funds).toBe(3000);
    expect(w.folks.map((f) => f.id)).toEqual([tome.id]);
    const fam = binFamilies(w)[0];
    expect(fam.name).toBe('Sacada');
    expect(fam.funds).toBe(2000);
    expect(fam.bin!.map((n) => n.id)).toEqual([lia.id]);
    expect(relationOf(w, tome.id, lia.id)!.friendship).toBe(rel);
    // a Lia ganha uma casa e é jogada de novo com o que tinha (o Folk guardado)
    expect(sim.dispatch({ type: 'placeFamily', familyId: fam.id, lotId: lotNumber(w, 9).id })).toBe(true);
    expect(sim.dispatch({ type: 'playFamily', familyId: fam.id })).toBe(true);
    expect(w.folks[0].id).toBe(lia.id);
    expect(w.household.funds).toBe(2000 - lotNumber(w, 9).land);
  });

  it('criança não sai sozinha e quem fica precisa de um adulto', () => {
    const sim = townSim();
    const w = sim.world;
    const [tome, lia] = w.folks;
    lia.age = 'child';
    expect(splitProblem(w, [lia.id])).toBe('kidNeedsAdult');
    expect(splitProblem(w, [tome.id])).toBe('noAdult');
    lia.age = undefined;
    tome.away = { until: w.tick + 100 } as never;
    expect(splitProblem(w, [tome.id])).toBe('memberAway');
  });

  it('juntar aqui: a outra família muda para a casa em jogo e a dela fica à venda', () => {
    const sim = townSim();
    const w = sim.world;
    const { fam, lot } = lotOfFamily(w, 'Alpendre');
    const funds = w.household.funds;
    const gain = fam.funds + lotSaleValue(w, CATALOG, lot);
    expect(sim.dispatch({ type: 'joinFamily', familyId: fam.id, where: 'here' })).toBe(true);
    expect(w.folks.map((f) => f.name).sort()).toEqual(['Dora Alpendre', 'Lia Sacada', 'Rita Vidraça', 'Tomé Varanda']);
    expect(w.household.funds).toBe(funds + gain);
    expect(familyById(w, fam.id)).toBeUndefined();
    expect(lotStatus(w, lot)).toBe('forSale');
    // a Dora trouxe o emprego e anda pela casa
    expect(w.folks.find((f) => f.name === 'Dora Alpendre')!.job?.careerId).toBe('kitchen');
    const nav = buildNav(w, CATALOG);
    for (const f of w.folks) expect(nav.isFree(f.x, f.y)).toBe(true);
    run(sim, 120);
  });

  it('juntar lá: a família em jogo vende a casa e vai morar na casa da outra', () => {
    const sim = townSim();
    const w = sim.world;
    const { fam, lot } = lotOfFamily(w, 'Alpendre');
    const old = activeLot(w)!;
    const objects = lot.home!.objects.length;
    const funds = w.household.funds;
    const gain = fam.funds + lotSaleValue(w, CATALOG, old);
    expect(sim.dispatch({ type: 'joinFamily', familyId: fam.id, where: 'there' })).toBe(true);
    expect(activeLot(w)?.id).toBe(lot.id);
    expect(w.objects.length).toBe(objects);
    expect(lotStatus(w, old)).toBe('forSale');
    expect(w.household.funds).toBe(funds + gain);
    expect(w.folks).toHaveLength(4);
    expect(activeFamily(w)?.name).toBe('Varanda');
    run(sim, 120);
  });

  it('chamar para morar junto: só quem é perto; leva a parte dele do dinheiro', () => {
    const sim = townSim();
    const w = sim.world;
    const { fam } = lotOfFamily(w, 'Alpendre');
    const dora = w.neighbors.find((n) => n.name === 'Dora Alpendre')!;
    const tome = w.folks[0];
    for (const [a, b] of [
      [tome.id, dora.id],
      [dora.id, tome.id],
    ]) {
      const r = relationOf(w, a, b);
      if (r) r.friendship = 10;
    }
    expect(inviteProblem(w, dora.id)).toBe('notClose');
    sim.dispatch({ type: 'inviteHome', personId: dora.id });
    expect(sim.lastProblem).toBe('notClose');
    for (const [a, b] of [
      [tome.id, dora.id],
      [dora.id, tome.id],
    ]) {
      w.relations[`${a}>${b}`] = { ...(w.relations[`${a}>${b}`] ?? { romance: 0, respect: 0, last: 0 }), friendship: 60 } as never;
    }
    fam.funds = 1000;
    const funds = w.household.funds;
    expect(sim.dispatch({ type: 'inviteHome', personId: dora.id })).toBe(true);
    expect(w.folks.some((f) => f.id === dora.id && !f.visit)).toBe(true);
    expect(w.household.funds).toBe(funds + 500);
    expect(fam.funds).toBe(500);
    expect(membersOf(w, fam.id).map((m) => m.name)).toEqual(['Rita Vidraça']);
    run(sim, 60);
  });
});

describe('plano 2, bloco 11: fundos, bens e editar', () => {
  it('inventário: guardar, pôr de volta e levar os móveis na mudança', () => {
    const sim = townSim();
    const w = sim.world;
    const chair = w.objects.find((o) => o.defId === 'speaker')!;
    const funds = w.household.funds;
    const at = { x: chair.x, y: chair.y, rot: chair.rot };
    expect(sim.dispatch({ type: 'storeObject', objectId: chair.id })).toBe(true);
    expect(w.household.funds).toBe(funds);
    expect(w.household.stored).toHaveLength(1);
    const stored = w.household.stored![0];
    expect(sim.dispatch({ type: 'placeStored', objectId: stored.id, ...at })).toBe(true);
    expect(w.household.stored).toHaveLength(0);
    expect(w.objects.some((o) => o.defId === chair.defId && o.x === at.x && o.y === at.y)).toBe(true);
    // mudança levando os móveis: entram no inventário e só o terreno e a obra são vendidos
    const paid = w.objects.filter((o) => CATALOG.objects[o.defId].price > 0).length;
    const vacant = lotNumber(w, 9);
    expect(sim.dispatch({ type: 'moveHouse', lotId: vacant.id, pack: true })).toBe(true);
    expect(w.household.stored).toHaveLength(paid);
    const ledger = familyLedger(w, CATALOG, activeFamily(w)!);
    expect(ledger.storedCount).toBe(paid);
    expect(ledger.stored).toBeGreaterThan(0);
    expect(ledger.land).toBe(vacant.land);
    expect(ledger.house).toBe(ledger.land + ledger.build + ledger.furniture);
    // vender do inventário
    const one = w.household.stored![0];
    const before = w.household.funds;
    expect(sim.dispatch({ type: 'sellStored', objectId: one.id })).toBe(true);
    expect(w.household.funds).toBeGreaterThan(before);
  });

  it('editar o folk: aparência e roupa à vontade; traços só com "Página virada"', () => {
    const sim = townSim();
    const w = sim.world;
    const folk = w.folks[0];
    expect(sim.dispatch({ type: 'editFolk', folkId: folk.id, look: { ...folk.look, height: 3, jaw: 17 } })).toBe(true);
    expect(folk.look.height).toBe(3);
    expect(folk.look.jaw).toBe(17);
    expect(sim.dispatch({ type: 'editFolk', folkId: folk.id, look: { ...folk.look, height: 99 } })).toBe(false);
    const traits = ['gentil', 'caseiro', 'tagarela', 'romantico', 'ambicioso'];
    expect(sim.dispatch({ type: 'editFolk', folkId: folk.id, traits })).toBe(false);
    expect(sim.lastProblem).toBe('points');
    folk.points = 100;
    expect(sim.dispatch({ type: 'buyPerk', folkId: folk.id, perkId: NEW_LEAF })).toBe(true);
    expect(sim.dispatch({ type: 'editFolk', folkId: folk.id, traits })).toBe(true);
    expect(folk.traits).toEqual(traits);
    expect(folk.perks ?? []).not.toContain(NEW_LEAF);
    // de novo, sem o benefício: recusa
    expect(sim.dispatch({ type: 'editFolk', folkId: folk.id, traits: ['agitado', 'artistico', 'coruja', 'festeiro', 'atletico'] })).toBe(false);
  });

  it('herança conta nos fundos da família', () => {
    const sim = townSim();
    const w = sim.world;
    const fam = activeFamily(w)!;
    expect(familyLedger(w, CATALOG, fam).inherited).toBe(0);
    fam.inherited = 300;
    const l = familyLedger(w, CATALOG, fam);
    expect(l.inherited).toBe(300);
    expect(l.worth).toBe(l.funds + l.house + l.stored - l.bills);
  });
});
