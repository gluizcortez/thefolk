import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { familyWorld } from '../src/data/family';
import { NEIGHBORS, NEIGHBOR_TIES } from '../src/data/neighbors';
import {
  NEUTRAL_TEMPER,
  TRAIT_CLASHES,
  checkDream,
  clockEnergy,
  completeTraits,
  cookBonus,
  createBaby,
  deserialize,
  dropMember,
  familyProblem,
  fullLook,
  mixLooks,
  perkDecay,
  serialize,
  setTie,
  suggestDream,
  tieOf,
  tieProblem,
  traitBlock,
  traitProduct,
  traitSlots,
  traitTraining,
  traitsClash,
  traitsProblem,
  bondOf,
  growTraits,
  socialAllowed,
  relationOf,
} from '../src/sim';
import type { FamilyDraft, Look, MemberDraft, Temper } from '../src/sim';
import { faceFromSeed } from '../src/sim/temper';
import { householdSim } from './helpers';

const LOOK: Look = fullLook({ skin: 1, hair: 2, shirt: 3, pants: 1, style: 2, face: 1, body: 2, formal: 1, sleepwear: 0, swimwear: 3, ...faceFromSeed(1) });
const FIVE = ['gentil', 'caseiro', 'tagarela', 'romantico', 'ambicioso'];
const KID3 = ['gentil', 'caseiro', 'tagarela'];

function member(name: string, traits: string[] = FIVE, age?: MemberDraft['age']): MemberDraft {
  return { name, look: { ...LOOK }, traits, temper: { ...NEUTRAL_TEMPER }, month: 0, ...(age ? { age } : {}) };
}

describe('traços: pares proibidos e vagas por idade (plano 2, bloco 10)', () => {
  it('cerca de quarenta traços, todos com nome e dica; os pares proibidos são de traços que existem', () => {
    const ids = Object.keys(CATALOG.traits);
    expect(ids.length).toBeGreaterThanOrEqual(38);
    for (const [a, b] of TRAIT_CLASHES) {
      expect(CATALOG.traits[a], a).toBeDefined();
      expect(CATALOG.traits[b], b).toBeDefined();
      expect(traitsClash(a, b)).toBe(true);
      expect(traitsClash(b, a)).toBe(true);
    }
    expect(traitsClash('gentil', 'caseiro')).toBe(false);
  });

  it('não deixa escolher traço que briga com outro, repetido, além do limite ou de adulto na criança', () => {
    expect(traitBlock(CATALOG, ['madrugador'], 'coruja', undefined)).toBe('clash');
    expect(traitBlock(CATALOG, ['gentil'], 'esquentado', undefined)).toBe('clash');
    expect(traitBlock(CATALOG, ['gentil'], 'gentil', undefined)).toBe('have');
    expect(traitBlock(CATALOG, FIVE, 'atletico', undefined)).toBe('full');
    expect(traitBlock(CATALOG, [], 'nao_existe', undefined)).toBe('unknown');
    expect(traitBlock(CATALOG, [], 'romantico', 'child')).toBe('grown');
    expect(traitBlock(CATALOG, [], 'romantico', 'teen')).toBeNull();
    expect(traitBlock(CATALOG, [], 'romantico', undefined)).toBeNull();
    expect(traitsProblem(CATALOG, ['sortudo', 'desastrado'], undefined)).toBe('clash');
  });

  it('cada idade tem suas vagas: bebê 1, criança 3, jovem 4, adulto e idoso 5', () => {
    expect([traitSlots('baby'), traitSlots('child'), traitSlots('teen'), traitSlots(undefined), traitSlots('elder')]).toEqual([1, 3, 4, 5, 5]);
  });

  it('o rascunho da família recusa par proibido, traço de adulto na criança e traços de menos', () => {
    const draft = (...m: MemberDraft[]): FamilyDraft => ({ surname: 'Goiabeira', members: m });
    expect(familyProblem(CATALOG, draft(member('Ana')))).toBeNull();
    expect(familyProblem(CATALOG, draft(member('Ana', ['gentil', 'esquentado', 'caseiro', 'tagarela', 'romantico'])))).toBe('clashingTraits');
    expect(familyProblem(CATALOG, draft(member('Ana', ['gentil', 'caseiro'])))).toBe('fewTraits');
    expect(familyProblem(CATALOG, draft(member('Ana'), member('Bia', ['romantico', 'gentil', 'caseiro'], 'child')))).toBe('grownTrait');
    expect(familyProblem(CATALOG, draft(member('Ana'), member('Bia', KID3, 'child')))).toBeNull();
    expect(familyProblem(CATALOG, { ...draft(member('Ana')), members: [{ ...member('Ana'), dream: 'nada' }] })).toBe('dream');
  });
});

describe('conversão dos eixos em traços', () => {
  it('temperamento marcado vira os traços que combinam com ele, sem par proibido', () => {
    const talker: Temper = { ...NEUTRAL_TEMPER, outgoing: 10, warmth: 8, wit: 1, pep: 3, order: 3 };
    const out = completeTraits(CATALOG, [], talker, undefined, 7);
    expect(out).toHaveLength(5);
    expect(out).toContain('tagarela');
    expect(out).not.toContain('reservado');
    expect(traitsProblem(CATALOG, out, undefined)).toBeNull();
    const shy: Temper = { ...talker, outgoing: 0 };
    expect(completeTraits(CATALOG, [], shy, undefined, 7)).toContain('reservado');
  });

  it('mantém os traços que já tinha e completa até a idade; criança perde o que não cabe', () => {
    const out = completeTraits(CATALOG, ['gentil', 'caseiro'], NEUTRAL_TEMPER, undefined, 3);
    expect(out.slice(0, 2)).toEqual(['gentil', 'caseiro']);
    expect(out).toHaveLength(5);
    expect(completeTraits(CATALOG, ['gentil', 'caseiro'], NEUTRAL_TEMPER, undefined, 3)).toEqual(out);
    const kid = completeTraits(CATALOG, ['romantico', 'gentil'], NEUTRAL_TEMPER, 'child', 3);
    expect(kid).not.toContain('romantico');
    expect(kid).toHaveLength(3);
  });

  it('save v29 vira v30: traços completos, sonho, pontos zerados, gostos e aparência na escala nova', () => {
    const sim = householdSim(4);
    const raw = JSON.parse(JSON.stringify(serialize(sim.world, 1).world)) as { folks: Record<string, unknown>[]; neighbors: Record<string, unknown>[] };
    const tome = raw.folks[0];
    tome.traits = ['tagarela', 'caseiro'];
    tome.temper = { ...NEUTRAL_TEMPER, outgoing: 9 };
    tome.look = { skin: 2, hair: 1, shirt: 0, pants: 0, style: 1, face: 0, body: 1, formal: 0, sleepwear: 0, swimwear: 0, ...faceFromSeed(2), eyeColor: 1 };
    for (const k of ['dream', 'points', 'tastes', 'perks', 'voice']) delete tome[k];
    const { world } = deserialize({ version: 29, savedAt: 1, world: raw }, { neighbors: NEIGHBORS, ties: NEIGHBOR_TIES, catalog: CATALOG });
    const f = world.folks[0];
    expect(f.traits.slice(0, 2)).toEqual(['tagarela', 'caseiro']);
    expect(f.traits).toHaveLength(5);
    expect(traitsProblem(CATALOG, f.traits, f.age)).toBeNull();
    expect(f.dream?.id).toBe(suggestDream(CATALOG, f.traits));
    expect(f.points).toBe(0);
    expect(f.tastes?.food).toBeTruthy();
    // pele 2 (de 4) vira o tom 27 de 40; corpo 1 vira 10; sliders no meio
    expect(f.look.skin).toBe(27);
    expect(f.look.body).toBe(10);
    expect(f.look.height).toBe(10);
    for (const n of world.neighbors) expect(n.traits.length, n.name).toBe(traitSlots(n.age));
  });
});

describe('aparência herdada', () => {
  it('bebê mistura os pais: pele entre os dois, cabelo e olhos perto de um deles', () => {
    let seed = 1;
    const rand = (n: number) => {
      seed = (seed * 16807) % 2147483647;
      return seed % n;
    };
    const dark = { ...LOOK, skin: 40, hair: 0 };
    const light = { ...LOOK, skin: 0, hair: 30 };
    const a = { ...dark, height: 18, eyeColor: 40 };
    const b = { ...light, height: 2, eyeColor: 0 };
    for (let i = 0; i < 40; i++) {
      const kid = mixLooks([a, b], rand);
      expect(kid.skin).toBeGreaterThanOrEqual(Math.min(a.skin, b.skin) + 18);
      expect(kid.skin).toBeLessThanOrEqual(Math.max(a.skin, b.skin) - 18);
      expect(kid.height).toBeGreaterThanOrEqual(7);
      expect(kid.height).toBeLessThanOrEqual(13);
      expect(Math.min(Math.abs(kid.eyeColor - 40), Math.abs(kid.eyeColor - 0))).toBeLessThanOrEqual(2);
      expect(kid.beard).toBe(0);
    }
  });

  it('no jogo, o bebê nasce com a pele entre a dos pais e um traço só', () => {
    const sim = householdSim(2);
    const [a, b] = sim.residents();
    a.look = { ...a.look, skin: 0 };
    b.look = { ...b.look, skin: 40 };
    const crib = { id: 999, defId: 'crib', x: 2, y: 2, rot: 0 as const, paid: 0, state: {} } as never;
    sim.world.objects.push(crib);
    const baby = createBaby(sim.world, CATALOG, [a, b], crib, false);
    expect(baby.look.skin).toBeGreaterThanOrEqual(18);
    expect(baby.look.skin).toBeLessThanOrEqual(22);
    expect(baby.traits).toHaveLength(1);
  });
});

describe('efeitos dos traços', () => {
  it('cabeça boa aprende lógica mais rápido; aprender rápido soma', () => {
    expect(traitTraining(CATALOG, { traits: ['cabeca_boa'] }, 'logic')).toBeCloseTo(1.4);
    expect(traitTraining(CATALOG, { traits: ['cabeca_boa'], perks: ['quickStudy'] }, 'logic')).toBeCloseTo(1.75);
    expect(traitTraining(CATALOG, { traits: ['gentil'] }, 'logic')).toBe(1);
  });

  it('sorte: o sortudo quebra menos, o desastrado mais', () => {
    expect(traitProduct(CATALOG, ['sortudo'], 'luck')).toBeLessThan(1);
    expect(traitProduct(CATALOG, ['desastrado'], 'luck')).toBeGreaterThan(1);
  });

  it('relógio do corpo: madrugador cansa menos de manhã, coruja de noite', () => {
    const at = (h: number) => 2 * 1440 + h * 60;
    expect(clockEnergy(CATALOG, { traits: ['madrugador'] }, at(7))).toBeLessThan(1);
    expect(clockEnergy(CATALOG, { traits: ['madrugador'] }, at(23))).toBeGreaterThan(1);
    expect(clockEnergy(CATALOG, { traits: ['coruja'] }, at(23))).toBeLessThan(1);
    expect(clockEnergy(CATALOG, { traits: ['coruja'] }, at(7))).toBeGreaterThan(1);
    expect(clockEnergy(CATALOG, { traits: ['gentil'] }, at(7))).toBe(1);
  });

  it('mão de fada cozinha melhor; o benefício de cozinheiro soma', () => {
    expect(cookBonus(CATALOG, { traits: ['mao_de_fada'] })).toBeGreaterThan(0);
    expect(cookBonus(CATALOG, { traits: ['mao_de_fada'], perks: ['chef'] })).toBe(cookBonus(CATALOG, { traits: ['mao_de_fada'] }) + 10);
  });

  it('conversa e interação de traço só aparecem para quem tem o traço', () => {
    const sim = householdSim(3);
    const [a, b] = sim.residents();
    const causo = CATALOG.socials.causo;
    a.traits = ['gentil'];
    expect(socialAllowed(sim.world, CATALOG, causo, a, b)).toBe(false);
    a.traits = ['tagarela'];
    expect(socialAllowed(sim.world, CATALOG, causo, a, b)).toBe(true);
    const raid = CATALOG.objects.fridge.interactions.find((i) => i.id === 'raidFridge')!;
    expect(raid.trait).toBe('guloso');
  });
});

describe('sonho de vida, pontos e benefícios', () => {
  it('juntar o dinheiro do sonho dá os pontos uma vez só', () => {
    const sim = householdSim(1);
    const [a] = sim.residents();
    a.dream = { id: 'sossego' };
    a.points = 0;
    sim.world.household.funds = 100;
    const log = () => {};
    expect(checkDream(sim.world, CATALOG, log, a)).toBe(false);
    sim.world.household.funds = 25000;
    expect(checkDream(sim.world, CATALOG, log, a)).toBe(true);
    expect(a.points).toBe(CATALOG.dreams!.sossego.reward);
    expect(checkDream(sim.world, CATALOG, log, a)).toBe(false);
    expect(sim.dispatch({ type: 'pickDream', folkId: a.id, dreamId: 'topo' })).toBe(false);
  });

  it('pontos compram benefícios; sem pontos ou repetido não compra', () => {
    const sim = householdSim(1);
    const [a] = sim.residents();
    a.points = 50;
    expect(sim.dispatch({ type: 'buyPerk', folkId: a.id, perkId: 'restful' })).toBe(false);
    expect(sim.dispatch({ type: 'buyPerk', folkId: a.id, perkId: 'chef' })).toBe(true);
    expect(a.points).toBe(10);
    expect(a.perks).toEqual(['chef']);
    a.points = 100;
    expect(sim.dispatch({ type: 'buyPerk', folkId: a.id, perkId: 'chef' })).toBe(false);
    expect(sim.dispatch({ type: 'buyPerk', folkId: a.id, perkId: 'restful' })).toBe(true);
    expect(perkDecay(a, 'energy')).toBeLessThan(1);
    expect(perkDecay(a, 'hunger')).toBe(1);
  });

  it('dá para trocar de sonho enquanto não realizou', () => {
    const sim = householdSim(1);
    const [a] = sim.residents();
    expect(sim.dispatch({ type: 'pickDream', folkId: a.id, dreamId: 'galeria' })).toBe(true);
    expect(a.dream).toEqual({ id: 'galeria' });
    expect(sim.dispatch({ type: 'pickDream', folkId: a.id, dreamId: 'nada' })).toBe(false);
  });
});

describe('laços da família', () => {
  it('cônjuge precisa ser adulto; pai ou mãe precisa ser mais velho', () => {
    const d: FamilyDraft = { surname: 'Goiabeira', members: [member('Ana'), member('Beto'), member('Caio', KID3, 'child')] };
    expect(tieProblem(d, { a: 0, b: 1, kind: 'spouse' })).toBe(false);
    expect(tieProblem(d, { a: 0, b: 2, kind: 'spouse' })).toBe(true);
    expect(tieProblem(d, { a: 0, b: 2, kind: 'parent' })).toBe(false);
    expect(tieProblem(d, { a: 2, b: 0, kind: 'parent' })).toBe(true);
    setTie(d, 0, 1, 'spouse');
    setTie(d, 0, 2, 'parent');
    setTie(d, 1, 2, 'parent');
    expect(tieOf(d, 2, 0)).toEqual({ kind: 'parent', flip: true });
    expect(familyProblem(CATALOG, d)).toBeNull();
    // casada com dois não pode
    d.members.push(member('Duda'));
    setTie(d, 0, 3, 'spouse');
    expect(familyProblem(CATALOG, d)).toBe('tie');
    dropMember(d, 3);
    expect(familyProblem(CATALOG, d)).toBeNull();
    expect(d.ties).toHaveLength(3);
  });

  it('a família criada chega casada, com os filhos na árvore', () => {
    const d: FamilyDraft = { surname: 'Goiabeira', members: [member('Ana'), member('Beto'), member('Caio', KID3, 'child'), member('Dora', KID3, 'child')] };
    setTie(d, 0, 1, 'spouse');
    setTie(d, 0, 2, 'parent');
    setTie(d, 1, 2, 'parent');
    setTie(d, 2, 3, 'sibling');
    const world = familyWorld(d, 5);
    const [ana, beto, caio, dora] = world.folks;
    expect(bondOf(world, ana.id, beto.id)).toBe('married');
    expect(caio.parents).toEqual([ana.id, beto.id]);
    expect(caio.kid?.parents).toEqual([ana.id, beto.id]);
    expect(dora.parents).toBeUndefined();
    expect(relationOf(world, caio.id, dora.id)?.friendship).toBe(45);
    expect(relationOf(world, ana.id, beto.id)?.romance).toBe(70);
  });
});

describe('crescer ganha traços', () => {
  it('criança que vira jovem ganha um traço a mais, sem par proibido', () => {
    const sim = householdSim(6);
    const [a] = sim.residents();
    a.age = 'teen';
    a.traits = ['gentil', 'caseiro', 'tagarela'];
    const got = growTraits(sim.world, CATALOG, a);
    expect(got).toHaveLength(1);
    expect(a.traits).toHaveLength(4);
    expect(traitsProblem(CATALOG, a.traits, 'teen')).toBeNull();
  });
});

describe('cabelo no espelho', () => {
  it('troca o penteado e a cor; valor fora da faixa não passa', () => {
    const sim = householdSim(1);
    const [a] = sim.residents();
    expect(sim.dispatch({ type: 'restyleHair', folkId: a.id, style: 3, hair: 33 })).toBe(true);
    expect(a.look.style).toBe(3);
    expect(a.look.hair).toBe(33);
    expect(sim.dispatch({ type: 'restyleHair', folkId: a.id, style: 99, hair: 1 })).toBe(false);
    expect(sim.dispatch({ type: 'restyleHair', folkId: a.id, style: 1, hair: 41 })).toBe(false);
  });
});
