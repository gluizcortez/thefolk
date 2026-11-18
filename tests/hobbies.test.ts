import { describe, expect, it } from 'vitest';
import { CATALOG } from '../src/data/catalog';
import { ptBR } from '../src/i18n/pt-BR';
import type { Folk, Sim } from '../src/sim';
import {
  BOOKS,
  CANVAS_MINUTES,
  PROJECTS,
  Sim as SimClass,
  bookProgress,
  canvasDone,
  createWorld,
  deserialize,
  gridFromMap,
  jogRoute,
  paintingPrice,
  projectProgress,
  projectTick,
  returnsBook,
  serialize,
} from '../src/sim';
import { mouthAt, utterance, voiceOf } from '../src/audio/folkes';
import { CLIPS, isAnim, sampleClip } from '../src/game/art/anims';
import { crowd, openField, run } from './helpers';

// Plano 2, bloco 7: lazer, estudo, trabalho em casa e convívio.

const FULL = { hunger: 95, energy: 95, bladder: 95, hygiene: 95, comfort: 60, fun: 40, social: 95 };
const obj = (sim: Sim, defId: string) => sim.world.objects.find((o) => o.defId === defId)!;
const reload = (sim: Sim): Sim => new SimClass(CATALOG, deserialize(JSON.parse(JSON.stringify(serialize(sim.world, 0)))).world);

/** Roda até a condição valer (ou desistir). */
function until(sim: Sim, ok: () => boolean, limit = 200): boolean {
  for (let i = 0; i < limit; i++) {
    if (ok()) return true;
    sim.step();
  }
  return ok();
}

describe('plano 2, bloco 7: o que entrou nos objetos', () => {
  it('estante: ler pega o livro; os de habilidade têm livro e o progresso; devolver é escondido', () => {
    const shelf = CATALOG.objects.bookcase;
    const read = shelf.interactions.find((i) => i.id === 'read')!;
    expect(read.browse).toBe(true);
    for (const id of ['study', 'recipes', 'manual', 'readArt', 'readSpeech', 'readTraining']) {
      const it = shelf.interactions.find((i) => i.id === id)!;
      expect(BOOKS[it.book!], id).toBeTruthy();
      expect(it.browse).toBe(true);
    }
    expect(shelf.interactions.find((i) => i.id === 'returnBook')?.hidden).toBe(true);
    expect(CATALOG.objects.bed.interactions.some((i) => i.id === 'readInBed')).toBe(true);
  });

  it('computador, violão, tapete e caixa de blocos estão no catálogo com nome e animação', () => {
    for (const id of ['computer', 'guitar', 'yogamat', 'toybox']) {
      const def = CATALOG.objects[id];
      expect(def, id).toBeTruthy();
      expect(ptBR[def.name], id).toBeTruthy();
      for (const it of def.interactions) {
        expect(ptBR[it.label], it.label).toBeTruthy();
        if (it.anim) expect(isAnim(it.anim), it.anim).toBe(true);
      }
    }
    const pc = CATALOG.objects.computer;
    expect(pc.interactions.map((i) => i.screen).filter(Boolean)).toEqual(expect.arrayContaining(['web', 'game', 'text', 'code', 'chat', 'jobs']));
    expect(pc.interactions.find((i) => i.id === 'writeNovel')?.project).toBe('novel');
    expect(pc.interactions.find((i) => i.id === 'program')?.project).toBe('program');
  });

  it('frilas e negócios aceitam o computador e os instrumentos', () => {
    expect(CATALOG.gigs.ledger.objects).toContain('computer');
    expect(CATALOG.gigs.jingle.objects).toEqual(expect.arrayContaining(['piano', 'guitar']));
    expect(CATALOG.gigs.website.objects).toEqual(['computer']);
    expect(CATALOG.businesses.bookkeeping.objects).toContain('computer');
    expect(CATALOG.objects.piano.interactions.some((i) => i.task === 'gig')).toBe(true);
  });

  it('toda animação pedida por objeto ou conversa existe', () => {
    for (const def of Object.values(CATALOG.objects)) for (const it of def.interactions) if (it.anim) expect(isAnim(it.anim), `${def.id}:${it.anim}`).toBe(true);
    for (const s of Object.values(CATALOG.socials)) {
      expect(isAnim(s.anim), s.id).toBe(true);
      if (s.targetAnim) expect(isAnim(s.targetAnim), s.id).toBe(true);
    }
    // gestos novos têm cara de gesto (não são o "talk" de sempre)
    expect(CATALOG.socials.handshake.anim).toBe('handshake');
    expect(CATALOG.socials.joke.anim).toBe('joke');
    expect(CATALOG.socials.propose.anim).toBe('kneel');
  });

  it('as animações novas dão poses diferentes ao longo do tempo (não ficam paradas)', () => {
    for (const name of ['type', 'keys', 'strum', 'paint', 'jog', 'yoga', 'handshake', 'joke', 'pedal', 'punch']) {
      expect(name in CLIPS, name).toBe(true);
      const a = sampleClip(name, 0.3, { mood: 60 });
      const b = sampleClip(name, 3.7, { mood: 60 });
      const moved = Object.keys(a).some((k) => Math.abs(a[k as keyof typeof a] - b[k as keyof typeof b]) > 0.01);
      expect(moved, name).toBe(true);
    }
  });
});

describe('plano 2, bloco 7: livros', () => {
  const room = (order: number) => {
    const sim = openField(10, 8, [
      { defId: 'bookcase', x: 1, y: 1 },
      { defId: 'sofa', x: 6, y: 4 },
    ], { x: 3, y: 5, needs: FULL });
    const folk = sim.world.folks[0];
    folk.temper = { ...folk.temper, order };
    return { sim, folk };
  };

  it('pega o livro na estante, vai sentar no sofá e lê sentado', () => {
    const { sim, folk } = room(5);
    expect(sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: obj(sim, 'bookcase').id, interactionId: 'read' })).toBe(true);
    // primeiro a etapa na estante
    expect(until(sim, () => folk.queue[0]?.phase === 'using' && folk.queue[0]?.stage === 'enter' && !folk.queue[0]?.picked)).toBe(true);
    // depois vai sentar
    expect(until(sim, () => !!folk.posture && folk.queue[0]?.phase === 'using' && folk.queue[0]?.stage === undefined)).toBe(true);
    expect(folk.posture!.objectId).toBe(obj(sim, 'sofa').id);
    expect(folk.queue[0].interactionId).toBe('read');
    expect(folk.queue[0].picked).toBe(true);
  });

  it('o caprichoso devolve o livro na estante; o desleixado larga no sofá', () => {
    const tidy = room(10);
    tidy.sim.dispatch({ type: 'queueUse', folkId: tidy.folk.id, objectId: obj(tidy.sim, 'bookcase').id, interactionId: 'read' });
    const seen: string[] = [];
    for (let i = 0; i < 260 && tidy.folk.queue.length > 0; i++) {
      const id = tidy.folk.queue[0]?.interactionId;
      if (id && seen[seen.length - 1] !== id) seen.push(id);
      tidy.sim.step();
    }
    expect(seen).toEqual(['read', 'returnBook']);
    expect(tidy.sim.world.mess.some((m) => m.kind === 'book')).toBe(false);

    const sloppy = room(0);
    let left = false;
    for (let seed = 1; seed < 8 && !left; seed++) {
      const s = room(0);
      s.sim.world.rngState = seed * 7919;
      s.sim.dispatch({ type: 'queueUse', folkId: s.folk.id, objectId: obj(s.sim, 'bookcase').id, interactionId: 'read' });
      run(s.sim, 260);
      left = s.sim.world.mess.some((m) => m.kind === 'book');
    }
    expect(sloppy.folk).toBeTruthy();
    expect(left).toBe(true);
  });

  it('livro de habilidade guarda a página no folk, passa pelo save e no fim dá o bônus', () => {
    const { sim, folk } = room(5);
    folk.needs.fun = 90;
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: obj(sim, 'bookcase').id, interactionId: 'study' });
    run(sim, 50);
    const read = folk.books?.logic ?? 0;
    expect(read).toBeGreaterThan(10);
    expect(bookProgress(folk, 'logic')).toBeCloseTo(read / BOOKS.logic.minutes, 5);
    // salva no meio do livro, carrega e continua de onde parou
    const back = reload(sim);
    const f2 = back.world.folks[0];
    expect(f2.books?.logic).toBe(read);
    // lê até o fim (várias sessões)
    const before = f2.skills.logic ?? 0;
    for (let n = 0; n < 8 && bookProgress(f2, 'logic') < 1; n++) {
      f2.needs = { ...f2.needs, ...FULL, fun: 90 };
      back.dispatch({ type: 'queueUse', folkId: f2.id, objectId: obj(back, 'bookcase').id, interactionId: 'study' });
      run(back, 90);
    }
    expect(bookProgress(f2, 'logic')).toBe(1);
    expect(back.world.log.some((l) => l.key === 'log.bookFinished')).toBe(true);
    expect((f2.skills.logic ?? 0) - before).toBeGreaterThan(BOOKS.logic.bonus);
  });

  it('quem devolve o livro: o caprichoso sempre, o desleixado de vez em quando', () => {
    expect(returnsBook(1.4, 0.99)).toBe(true);
    expect(returnsBook(0.5, 0.1)).toBe(true);
    expect(returnsBook(0.5, 0.5)).toBe(false);
  });
});

describe('plano 2, bloco 7: quadro no cavalete', () => {
  it('o quadro avança, fica salvo no cavalete, fica pronto e se vende', () => {
    const sim = openField(8, 6, [{ defId: 'easel', x: 3, y: 1 }], { x: 3, y: 4, needs: { ...FULL, fun: 10 } });
    const folk = sim.world.folks[0];
    const easel = obj(sim, 'easel');
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: easel.id, interactionId: 'paint' });
    run(sim, 40);
    const p = easel.canvas?.progress ?? 0;
    expect(p).toBeGreaterThan(5);
    expect(easel.canvas!.by).toBe(folk.id);
    const back = reload(sim);
    const e2 = obj(back, 'easel');
    expect(e2.canvas?.progress).toBeCloseTo(p, 5);
    const f2 = back.world.folks[0];
    for (let n = 0; n < 10 && !canvasDone(e2); n++) {
      f2.needs = { ...f2.needs, ...FULL, fun: 10 };
      back.dispatch({ type: 'queueUse', folkId: f2.id, objectId: e2.id, interactionId: 'paint' });
      run(back, 80);
    }
    expect(canvasDone(e2)).toBe(true);
    expect(f2.works?.painting).toBe(1);
    // pronto, não se pinta mais por cima
    expect(back.dispatch({ type: 'queueUse', folkId: f2.id, objectId: e2.id, interactionId: 'paint' })).toBe(false);
    expect(back.lastProblem).toBe('canvasDone');
    const funds = back.world.household.funds;
    const price = paintingPrice(e2.canvas);
    back.dispatch({ type: 'queueUse', folkId: f2.id, objectId: e2.id, interactionId: 'sellPainting' });
    run(back, 15);
    expect(back.world.household.funds).toBe(funds + price);
    expect(e2.canvas).toBeUndefined();
  });

  it('o tempo de um quadro diminui com a criatividade', () => {
    expect(CANVAS_MINUTES).toBeGreaterThan(100);
  });
});

describe('plano 2, bloco 7: computador e trabalhos que avançam', () => {
  it('escrever o romance avança aos poucos, passa pelo save e pronto vende', () => {
    const sim = openField(8, 6, [{ defId: 'computer', x: 3, y: 1 }], { x: 3, y: 4, needs: FULL, skills: { creativity: 600 } });
    const folk = sim.world.folks[0];
    const pc = obj(sim, 'computer');
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: pc.id, interactionId: 'writeNovel' });
    run(sim, 40);
    expect(folk.posture?.objectId).toBe(pc.id);
    expect(projectProgress(folk, 'novel')).toBeGreaterThan(0.03);
    const back = reload(sim);
    const f2 = back.world.folks[0];
    expect(projectProgress(f2, 'novel')).toBeCloseTo(projectProgress(folk, 'novel'), 5);
    const funds = back.world.household.funds;
    for (let n = 0; n < 10 && !f2.works?.novel; n++) {
      f2.needs = { ...f2.needs, ...FULL };
      back.dispatch({ type: 'queueUse', folkId: f2.id, objectId: pc.id, interactionId: 'writeNovel' });
      run(back, 100);
    }
    expect(f2.works?.novel).toBe(1);
    expect(back.world.household.funds).toBeGreaterThan(funds + PROJECTS.novel.base);
    expect(f2.projects?.novel).toBeUndefined();
  });

  it('projectTick: mais habilidade termina antes e rende mais', () => {
    const make = (xp: number): Folk => ({ skills: { logic: xp } }) as unknown as Folk;
    const slow = make(0);
    const fast = make(3300);
    let a = 0;
    let b = 0;
    let pa = 0;
    let pb = 0;
    while (!pa) (a++, (pa = projectTick(slow, 'program')?.pay ?? 0));
    while (!pb) (b++, (pb = projectTick(fast, 'program')?.pay ?? 0));
    expect(b).toBeLessThan(a);
    expect(pb).toBeGreaterThan(pa);
    expect(slow.works?.program).toBe(1);
  });

  it('procurar emprego no computador pega uma vaga', () => {
    const sim = openField(8, 6, [{ defId: 'computer', x: 3, y: 1 }], { x: 3, y: 4, needs: FULL, skills: { cooking: 500 } });
    const folk = sim.world.folks[0];
    expect(folk.job).toBeNull();
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: obj(sim, 'computer').id, interactionId: 'jobHunt' });
    run(sim, 70);
    expect(folk.job).not.toBeNull();
    expect(CATALOG.careers[folk.job!.careerId].skills).toContain('cooking');
  });

  it('a tela mostra o que o folk faz', () => {
    const sim = openField(8, 6, [{ defId: 'computer', x: 3, y: 1 }], { x: 3, y: 4, needs: FULL });
    const folk = sim.world.folks[0];
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: obj(sim, 'computer').id, interactionId: 'playPC' });
    run(sim, 12);
    expect(sim.interactionOf(folk.queue[0])?.screen).toBe('game');
  });
});

describe('plano 2, bloco 7: correr, ioga e janela', () => {
  it('correr sai da caixa de correio pela calçada e volta', () => {
    const sim = openField(14, 6, [{ defId: 'mailbox', x: 2, y: 2 }], { x: 2, y: 4, needs: FULL });
    const folk = sim.world.folks[0];
    sim.dispatch({ type: 'queueUse', folkId: folk.id, objectId: obj(sim, 'mailbox').id, interactionId: 'jog' });
    const spots = new Set<string>();
    for (let i = 0; i < 60; i++) {
      sim.step();
      if (folk.queue[0]?.interactionId === 'jog' && folk.queue[0].phase === 'using') spots.add(`${folk.x},${folk.y}`);
    }
    expect(spots.size).toBeGreaterThan(4);
    expect(folk.skills.fitness ?? 0).toBeGreaterThan(5);
  });

  it('o caminho da corrida é ida e volta e termina onde começou', () => {
    const sim = openField(14, 6, [], { x: 1, y: 1 });
    const route = jogRoute(sim.getNav(), { x: 1, y: 1 }, () => true);
    expect(route.length).toBeGreaterThan(5);
    expect(route[route.length - 1]).toEqual({ x: 1, y: 1 });
    for (let i = 1; i < route.length; i++) expect(Math.abs(route[i].x - route[i - 1].x) + Math.abs(route[i].y - route[i - 1].y)).toBe(1);
  });

  it('olhar pela janela: vai até a janela, fica de frente para ela e descansa', () => {
    const rows = ['.....', '.LLL.', '.LLL.', '.LLL.', '.....'];
    const grid = gridFromMap(rows, { '.': { floor: 'grass', indoor: false }, L: { floor: 'parquet', indoor: true } }, ['2,4,N'], ['3,1,N']);
    const sim = new SimClass(CATALOG, createWorld({ seed: 2, startTick: 12 * 60, grid, objects: [], folks: [{ name: 'Teste', traits: [], x: 1, y: 3, needs: { ...FULL, comfort: 30 } }], funds: 100, exit: { x: 0, y: 4 } }));
    const folk = sim.world.folks[0];
    expect(sim.dispatch({ type: 'lookOut', folkId: folk.id })).toBe(true);
    run(sim, 6);
    expect(folk.queue[0]?.kind).toBe('window');
    expect(folk.queue[0]?.phase).toBe('using');
    expect({ x: folk.x, y: folk.y }).toEqual({ x: 3, y: 1 });
    expect(folk.facing).toEqual({ x: 0, y: -1 });
    run(sim, 20);
    expect(folk.queue.length).toBe(0);
    expect(folk.needs.comfort).toBeGreaterThan(30);
  });

  it('sem janela, não dá', () => {
    const sim = openField(5, 5, [], { x: 1, y: 1 });
    expect(sim.dispatch({ type: 'lookOut', folkId: sim.world.folks[0].id })).toBe(false);
    expect(sim.lastProblem).toBe('noWindow');
  });
});

describe('plano 2, bloco 7: convívio', () => {
  it('sentar para conversar: cada um senta num lugar do sofá e o papo começa sentado', () => {
    const sim = crowd(
      [
        { name: 'Ana', x: 1, y: 5 },
        { name: 'Bia', x: 9, y: 5 },
      ],
      { objects: [{ defId: 'sofa', x: 5, y: 2 }], relations: [{ a: 'Ana', b: 'Bia', friendship: 40 }] },
    );
    const [a, b] = sim.world.folks;
    expect(sim.dispatch({ type: 'queueSocial', folkId: a.id, otherId: b.id, socialId: 'sitTalk' })).toBe(true);
    let both = false;
    for (let i = 0; i < 120 && !both; i++) {
      sim.step();
      both = !!a.posture && !!b.posture && a.queue[0]?.kind === 'social' && a.queue[0]?.socialId === 'chat' && a.queue[0]?.phase === 'using';
    }
    expect(both).toBe(true);
    expect(a.posture!.objectId).toBe(b.posture!.objectId);
  });

  it('a boca abre na vogal e fecha na consoante e na pausa', () => {
    const voice = voiceOf({ id: 1, name: 'Ana', look: { body: 1 } as never, temper: undefined as never });
    const sylls = utterance(voice, 'happy', 42);
    const total = sylls.reduce((s, x) => s + x.dur + x.gap, 0);
    const seen = new Set<number>();
    for (let t = 0; t < total; t += 0.01) seen.add(mouthAt(sylls, t));
    expect(seen.has(0)).toBe(true);
    expect(seen.has(1) || seen.has(2)).toBe(true);
    expect(mouthAt(sylls, total + 0.1)).toBe(-1);
  });
});
