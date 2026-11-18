import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { NEIGHBORS } from '../src/data/neighbors';
import {
  GARDENER,
  MINUTES_PER_DAY,
  SAVE_VERSION,
  buildNav,
  checkPlacement,
  computeRooms,
  deserialize,
  findPath,
  gardenHour,
  plantAmbience,
  plantStage,
  planBuild,
  poolTiles,
  roomAt,
  rowOn,
  serialize,
} from '../src/sim';
import type { Sim, WorldObject } from '../src/sim';
import { arriveAndAdmit, householdSim, openField, run, starterSim } from './helpers';
import { play, playStep } from './helpers/player';

const ok = (sim: Sim, cmd: Parameters<Sim['dispatch']>[0]) => {
  const r = sim.dispatch(cmd);
  if (!r) throw new Error(`${cmd.type}: ${sim.lastProblem}`);
};

/** Campo aberto com uma piscina de 3x2 cavada em (3..5, 2..3). */
function poolField(objects: Parameters<typeof openField>[2] = [], folk = { x: 1, y: 6 }): Sim {
  const sim = openField(10, 8, objects, folk, 1, 5000);
  ok(sim, { type: 'paintFloor', x0: 3, y0: 2, x1: 5, y1: 3, floorId: 'pool' });
  return sim;
}

const silent = () => {};
const objOf = (sim: Sim, defId: string): WorldObject => sim.world.objects.find((o) => o.defId === defId)!;

describe('piscina (bloco 13)', () => {
  it('cava-se tile a tile, só no térreo, e ninguém anda na água', () => {
    const sim = openField(10, 8, [], { x: 1, y: 6 }, 1, 5000);
    const plan = planBuild(sim.world, CATALOG, { type: 'paintFloor', x0: 3, y0: 2, x1: 5, y1: 3, floorId: 'pool' });
    expect(plan.ok).toBe(true);
    expect(plan.cost).toBe(6 * CATALOG.floors.pool.price);
    ok(sim, { type: 'paintFloor', x0: 3, y0: 2, x1: 5, y1: 3, floorId: 'pool' });
    expect(sim.world.household.funds).toBe(5000 - plan.cost);
    const nav = buildNav(sim.world, CATALOG);
    expect(nav.isFree(4, 2)).toBe(false);
    expect(nav.isFree(4, 4)).toBe(true);
    expect(poolTiles(sim.world.grid, CATALOG, 3, 2)).toHaveLength(6);
    // o caminho dá a volta pela beira
    const path = findPath(nav, { x: 4, y: 1 }, { x: 4, y: 4 })!;
    expect(path.length).toBeGreaterThan(3);
    // andar de cima, não
    const up = planBuild(sim.world, CATALOG, { type: 'paintFloor', x0: 1, y0: rowOn(sim.world.grid, 1, 1), x1: 1, y1: rowOn(sim.world.grid, 1, 1), floorId: 'pool' });
    expect(up.problem).toBe('groundOnly');
  });

  it('não cava debaixo de móvel nem de gente, e móvel não vai para a água', () => {
    const sim = openField(10, 8, [{ defId: 'flowers', x: 7, y: 2 }], { x: 1, y: 6 }, 1, 5000);
    expect(planBuild(sim.world, CATALOG, { type: 'paintFloor', x0: 7, y0: 2, x1: 7, y1: 2, floorId: 'pool' }).problem).toBe('onWater');
    expect(planBuild(sim.world, CATALOG, { type: 'paintFloor', x0: 1, y0: 6, x1: 1, y1: 6, floorId: 'pool' }).problem).toBe('trapsFolk');
    ok(sim, { type: 'paintFloor', x0: 3, y0: 2, x1: 5, y1: 3, floorId: 'pool' });
    expect(checkPlacement(sim.world, CATALOG, 'flowers', 4, 2, 0).problem).toBe('onWater');
  });

  it('escadinha vai na água com chão na frente; sem água ela não fica', () => {
    const sim = poolField();
    expect(checkPlacement(sim.world, CATALOG, 'poolladder', 7, 5, 0).problem).toBe('needsPool');
    // virada para o sul na linha 2, a frente dá para mais água: não
    expect(checkPlacement(sim.world, CATALOG, 'poolladder', 4, 2, 0).problem).toBe('needsPool');
    expect(checkPlacement(sim.world, CATALOG, 'poolladder', 4, 3, 0).ok).toBe(true);
    ok(sim, { type: 'buy', defId: 'poolladder', x: 4, y: 3, rot: 0 });
    // aterrar a piscina com a escadinha dentro: não
    expect(planBuild(sim.world, CATALOG, { type: 'paintFloor', x0: 3, y0: 2, x1: 5, y1: 3, floorId: 'grass' }).problem).toBe('holdsPool');
  });

  it('nadar diverte, treina fôlego e é coisa de roupa de banho', () => {
    const sim = poolField([], { x: 4, y: 6 });
    ok(sim, { type: 'buy', defId: 'poolladder', x: 4, y: 3, rot: 0 });
    const folk = sim.world.folks[0];
    folk.needs.fun = 20;
    const ladder = objOf(sim, 'poolladder');
    ok(sim, { type: 'queueUse', folkId: folk.id, objectId: ladder.id, interactionId: 'swim' });
    let swam = false;
    for (let i = 0; i < 120; i++) {
      sim.step();
      if (folk.queue[0]?.phase === 'using' && folk.queue[0].interactionId === 'swim') swam = true;
    }
    expect(swam).toBe(true);
    expect(folk.needs.fun).toBeGreaterThan(60);
    expect(folk.skills.fitness ?? 0).toBeGreaterThan(30);
    expect(CATALOG.objects.poolladder.interactions[0].wear).toBe('swim');
  });

  it('trampolim precisa de água atrás; sem escadinha, morador fica preso na água (bloco 14)', () => {
    const sim = poolField([], { x: 4, y: 6 });
    expect(checkPlacement(sim.world, CATALOG, 'diveboard', 7, 6, 0).problem).toBe('needsPool');
    // rot 0: usa pelo sul, a água fica ao norte
    expect(checkPlacement(sim.world, CATALOG, 'diveboard', 4, 4, 0).ok).toBe(true);
    ok(sim, { type: 'buy', defId: 'diveboard', x: 4, y: 4, rot: 0 });
    const folk = sim.world.folks[0];
    folk.needs.fun = 30;
    folk.needs.comfort = 80;
    const logs = sim.world.log.length;
    ok(sim, { type: 'queueUse', folkId: folk.id, objectId: objOf(sim, 'diveboard').id, interactionId: 'dive' });
    run(sim, 60);
    expect(sim.world.log.slice(logs).some((l) => l.key === 'log.adrift')).toBe(true);
    expect(folk.adrift).toBeTruthy();
    // com a escadinha posta, sai da água
    ok(sim, { type: 'buy', defId: 'poolladder', x: 5, y: 3, rot: 0 });
    run(sim, 2);
    expect(folk.adrift).toBeUndefined();
  });
});

describe('cercas, muretas e portões (bloco 13)', () => {
  it('cerca fecha a passagem e o portão abre', () => {
    const sim = openField(10, 8, [], { x: 1, y: 6 }, 1, 5000);
    // cerca na linha 4, de x=1 até o fim (o x=0 fica aberto)
    ok(sim, { type: 'buildFences', x0: 1, y0: 4, x1: 10, y1: 4, kind: 'fence' });
    expect(sim.world.grid.edges['5,4,N']).toBe('fence');
    let nav = buildNav(sim.world, CATALOG);
    const around = findPath(nav, { x: 5, y: 2 }, { x: 5, y: 6 })!;
    expect(around.length).toBeGreaterThan(8);
    expect(sim.world.household.funds).toBe(5000 - 9 * CATALOG.parts.fence.price);
    ok(sim, { type: 'placeOpening', edge: '5,4,N', kind: 'gate' });
    nav = buildNav(sim.world, CATALOG);
    expect(findPath(nav, { x: 5, y: 2 }, { x: 5, y: 6 })!.length).toBe(4);
    // vão deixado ao lado da cerca também aceita portão
    ok(sim, { type: 'placeOpening', edge: '0,4,N', kind: 'gate' });
    expect(sim.world.grid.edges['0,4,N']).toBe('gate');
    // fechar a última saída prenderia o folk
    expect(planBuild(sim.world, CATALOG, { type: 'placeOpening', edge: '7,7,N', kind: 'gate' }).problem).toBe('noFence');
  });

  it('cercado não vira cômodo, portão só em cerca e porta não vai em cerca', () => {
    const sim = openField(10, 8, [], { x: 8, y: 7 }, 1, 5000);
    ok(sim, { type: 'buildFences', x0: 2, y0: 2, x1: 5, y1: 2, kind: 'fence' });
    ok(sim, { type: 'buildFences', x0: 5, y0: 2, x1: 5, y1: 5, kind: 'lowwall' });
    ok(sim, { type: 'buildFences', x0: 5, y0: 5, x1: 2, y1: 5, kind: 'fence' });
    ok(sim, { type: 'buildFences', x0: 2, y0: 5, x1: 2, y1: 2, kind: 'fence' });
    const rooms = computeRooms(sim.world.grid, CATALOG);
    expect(roomAt(rooms, 3, 3)?.outdoor).toBe(true);
    expect(roomAt(rooms, 3, 3)).toBe(roomAt(rooms, 8, 7));
    expect(planBuild(sim.world, CATALOG, { type: 'placeOpening', edge: '3,2,N', kind: 'door' }).problem).toBe('noWall');
    ok(sim, { type: 'buildWalls', x0: 7, y0: 1, x1: 9, y1: 1 });
    expect(planBuild(sim.world, CATALOG, { type: 'placeOpening', edge: '7,1,N', kind: 'gate' }).problem).toBe('noFence');
    // mureta e cerca trocam uma pela outra, mas não passam por cima de parede
    expect(planBuild(sim.world, CATALOG, { type: 'buildFences', x0: 7, y0: 1, x1: 9, y1: 1, kind: 'fence' }).problem).toBe('nothing');
  });
});

describe('jardim vivo (bloco 13)', () => {
  it('muda cresce com água, floresce e soma ao ambiente; seca e murcha sem', () => {
    const sim = openField(10, 8, [], { x: 1, y: 6 }, 1, 5000);
    ok(sim, { type: 'buy', defId: 'flowerbed', x: 5, y: 2, rot: 0 });
    const bed = objOf(sim, 'flowerbed');
    const def = CATALOG.objects.flowerbed;
    expect(bed.plant!.growth).toBe(0);
    expect(plantStage(bed.plant!)).toBe('sprout');
    expect(plantAmbience(bed, def)).toBeLessThan(0);
    for (let h = 0; h < 40; h++) {
      bed.plant!.water = Math.max(bed.plant!.water, 60);
      gardenHour(sim.world, CATALOG, silent);
    }
    expect(bed.plant!.growth).toBe(100);
    expect(plantStage(bed.plant!)).toBe('bloom');
    expect(plantAmbience(bed, def)).toBe(def.plant!.bloom);
    // sem rega (e sem chuva): murcha e depois seca de vez
    sim.world.rain = null;
    for (let h = 0; h < 60; h++) gardenHour(sim.world, CATALOG, silent);
    expect(plantStage(bed.plant!)).toBe('wilted');
    for (let h = 0; h < 120; h++) gardenHour(sim.world, CATALOG, silent);
    expect(plantStage(bed.plant!)).toBe('dead');
    expect(plantAmbience(bed, def)).toBeLessThan(-def.ambience);
  });

  it('regar, cheirar e replantar aparecem só quando faz sentido', () => {
    const sim = openField(10, 8, [], { x: 4, y: 4 }, 1, 5000);
    ok(sim, { type: 'buy', defId: 'rosebush', x: 5, y: 2, rot: 0 });
    const rose = objOf(sim, 'rosebush');
    const folk = sim.world.folks[0];
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: rose.id, interactionId: 'smell' })).toBe(false);
    rose.plant!.water = 20;
    ok(sim, { type: 'queueUse', folkId: folk.id, objectId: rose.id, interactionId: 'water' });
    run(sim, 40);
    expect(rose.plant!.water).toBeGreaterThan(90);
    rose.plant!.health = 0;
    const funds = sim.world.household.funds;
    ok(sim, { type: 'queueUse', folkId: folk.id, objectId: rose.id, interactionId: 'replant' });
    run(sim, 45);
    expect(rose.plant!.health).toBe(100);
    expect(rose.plant!.growth).toBe(0);
    expect(sim.world.household.funds).toBeLessThan(funds);
  });

  it('a horta dá fruto e a colheita vai para a despensa', () => {
    const sim = starterSim();
    const folk = sim.world.folks[0];
    ok(sim, { type: 'buy', defId: 'veggiebed', x: 0, y: 12, rot: 0 });
    const bed = objOf(sim, 'veggiebed');
    bed.plant!.growth = 100;
    for (let h = 0; h < 24; h++) {
      bed.plant!.water = 80;
      gardenHour(sim.world, CATALOG, silent);
    }
    expect(bed.plant!.fruit).toBe(3);
    sim.world.household.pantry = 0;
    ok(sim, { type: 'queueUse', folkId: folk.id, objectId: bed.id, interactionId: 'harvest' });
    run(sim, 90);
    expect(bed.plant!.fruit).toBe(0);
    expect(sim.world.household.pantry).toBe(3);
  });

  it('a chuva rega o quintal mas não o vaso dentro de casa', () => {
    const sim = starterSim();
    ok(sim, { type: 'buy', defId: 'hedge', x: 0, y: 12, rot: 0 });
    const hedge = objOf(sim, 'hedge');
    const pot = objOf(sim, 'plant');
    gardenHour(sim.world, CATALOG, silent);
    hedge.plant!.water = 30;
    pot.plant!.water = 30;
    sim.world.rain = { from: sim.world.tick - 10, to: sim.world.tick + 120 };
    gardenHour(sim.world, CATALOG, silent);
    expect(hedge.plant!.water).toBeGreaterThan(30);
    expect(pot.plant!.water).toBeLessThan(30);
  });

  it('o jardineiro vem de manhã, rega o que tem sede e cobra a diária', () => {
    const sim = householdSim(3);
    const pot = objOf(sim, 'plant');
    sim.world.rules.death = false; // bloco 14: um dia sem comer não pode esvaziar a casa
    sim.world.household.gardener = true;
    // até as 7h59 do dia seguinte
    run(sim, MINUTES_PER_DAY - 1 + GARDENER.hour * 60 - sim.world.tick);
    for (const o of sim.world.objects) if (o.plant) o.plant.water = 10;
    const funds = sim.world.household.funds;
    run(sim, 2);
    const tiao = sim.world.neighbors.find((n) => n.service === 'gardener')!;
    expect(sim.findFolk(tiao.id)).toBeTruthy();
    arriveAndAdmit(sim, tiao.id);
    for (let i = 0; i < 400 && sim.findFolk(tiao.id); i++) sim.step();
    expect(pot.plant!.water).toBeGreaterThan(60);
    expect(sim.world.household.funds).toBeLessThanOrEqual(funds - GARDENER.fee);
    expect(sim.world.log.some((l) => l.key === 'log.gardenerDone')).toBe(true);
  });

  it('quem mora cuida sozinho da planta com sede', () => {
    const sim = starterSim(5, { hunger: 90, energy: 90, bladder: 90, hygiene: 90, comfort: 90, fun: 90, social: 90 });
    const pot = objOf(sim, 'plant');
    play(sim, 31);
    for (const o of sim.world.objects) if (o.plant) o.plant.water = 5;
    let watered = false;
    for (let i = 0; i < 600 && !watered; i++) {
      playStep(sim);
      watered = sim.world.folks[0].queue[0]?.interactionId === 'water';
    }
    expect(watered).toBe(true);
    expect(pot.plant).toBeTruthy();
  });
});

describe('save v17 (bloco 13)', () => {
  it('um save v16 abre com jardineiro no bairro, vasos vivos e sem chuva', () => {
    const sim = householdSim();
    const old = JSON.parse(JSON.stringify(serialize(sim.world, 0)));
    old.version = 16;
    delete old.world.household.gardener;
    delete old.world.rain;
    for (const o of old.world.objects) delete o.plant;
    old.world.neighbors = old.world.neighbors.filter((n: { service?: string }) => n.service !== 'gardener');
    const file = deserialize(old, { neighbors: NEIGHBORS, catalog: CATALOG });
    expect(file.version).toBe(SAVE_VERSION);
    expect(SAVE_VERSION).toBeGreaterThanOrEqual(17);
    const world = file.world;
    expect(world.household.gardener).toBe(false);
    expect(world.rain).toBeNull();
    expect(world.neighbors.some((n) => n.service === 'gardener')).toBe(true);
    const pots = world.objects.filter((o) => o.defId === 'plant');
    expect(pots.length).toBeGreaterThan(0);
    for (const p of pots) expect(p.plant).toMatchObject({ growth: 100, health: 100 });
  });

  it('uma semana com piscina, horta e jardineiro roda sem colapso', () => {
    const sim = householdSim(7);
    sim.world.household.funds = 20000;
    ok(sim, { type: 'paintFloor', x0: 0, y0: 2, x1: 1, y1: 4, floorId: 'pool' });
    ok(sim, { type: 'buy', defId: 'poolladder', x: 1, y: 4, rot: 0 });
    ok(sim, { type: 'buy', defId: 'veggiebed', x: 15, y: 10, rot: 0 });
    ok(sim, { type: 'buy', defId: 'flowerbed', x: 16, y: 3, rot: 0 });
    ok(sim, { type: 'buy', defId: 'hammock', x: 15, y: 12, rot: 0 });
    ok(sim, { type: 'buildFences', x0: 14, y0: 6, x1: 17, y1: 6, kind: 'fence' });
    ok(sim, { type: 'placeOpening', edge: '15,6,N', kind: 'gate' });
    sim.world.household.gardener = true;
    // o registro guarda só as últimas linhas: confere o jardineiro dia a dia
    let gardened = false;
    for (let d = 0; d < 7; d++) {
      play(sim, MINUTES_PER_DAY);
      gardened ||= sim.world.log.some((l) => l.key === 'log.gardenerDone');
    }
    for (const f of sim.world.folks.filter((f) => !f.visit)) expect(f.collapsed).toBe(0);
    for (const o of sim.world.objects) if (o.plant) expect(o.plant.health).toBeGreaterThan(0);
    expect(gardened).toBe(true);
  });
});
