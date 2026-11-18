// Plano 2, bloco 7: atividades a fundo II. Como em data/activities.ts e
// data/chores.ts, isto acrescenta etapas, animações e interações aos objetos
// que já existiam, e traz os objetos novos do lazer e do estudo:
//
// - estante: pegar o livro, sentar perto para ler e devolver (ou largar);
//   livros de habilidade com o progresso salvo no folk;
// - cama: ler deitado; escrivaninha: sentar na cadeira, escrever o romance à mão;
// - computador (novo): navegar, jogar, procurar emprego, escrever, programar,
//   conversar à distância e os frilas;
// - cavalete: o quadro avança, fica pronto e se vende;
// - teclado e piano: dedilhado e compor; violão (novo) no colo;
// - bicicleta e saco de pancada com o corpo certo; tapete de ioga (novo);
//   correr pela calçada saindo da caixa de correio;
// - xadrez, cartas e videogame com a mão no jogo; caixa de brinquedos (nova).

import type { InteractionDef, ObjectDef } from '../sim/types';

const pc = (id: string, extra: Partial<InteractionDef>): InteractionDef => ({
  id,
  label: `act.${id}`,
  duration: 60,
  effects: {},
  pose: 'sit',
  onObject: true,
  anim: 'type',
  ...extra,
});

/** O computador: mesa, monitor de tubo, gabinete e cadeira. */
export const HOBBY_OBJECTS: ObjectDef[] = [
  {
    id: 'computer',
    name: 'obj.computer',
    tier: 1,
    line: 'computer',
    room: 'office',
    price: 980,
    category: 'electronics',
    art: 'computer',
    useSides: ['S'],
    size: { w: 2, h: 1 },
    ambience: 2,
    interactions: [
      pc('surfWeb', { duration: 50, effects: { fun: 0.8, comfort: 0.2 }, until: 'fun', screen: 'web', anim: 'mouse' }),
      pc('playPC', { duration: 60, effects: { fun: 1.4, energy: -0.03 }, until: 'fun', screen: 'game', anim: 'gamePC', skill: { id: 'logic', xpPerMinute: 0.25 } }),
      pc('chatOnline', { duration: 40, effects: { social: 1.6, fun: 0.3 }, until: 'social', screen: 'chat', online: true, skill: { id: 'charisma', xpPerMinute: 0.25 } }),
      pc('jobHunt', { duration: 45, effects: { fun: -0.05 }, screen: 'jobs', jobHunt: true, anim: 'mouse', autonomous: false, residentOnly: true, kids: 'no' }),
      pc('writeNovel', { duration: 90, effects: { fun: 0.4, comfort: 0.2 }, screen: 'text', project: 'novel', autonomous: false, residentOnly: true, skill: { id: 'creativity', xpPerMinute: 1 } }),
      pc('program', { duration: 90, effects: { fun: 0.2, comfort: 0.1 }, screen: 'code', project: 'program', autonomous: false, residentOnly: true, kids: 'no', skill: { id: 'logic', xpPerMinute: 1.1 } }),
      pc('freelance', { label: 'act.freelance', duration: 120, effects: { fun: -0.05, comfort: 0.1 }, screen: 'text', task: 'gig', autonomous: false, residentOnly: true }),
      pc('business', { label: 'act.business', duration: 120, effects: { fun: 0.05, social: 0.05 }, screen: 'code', task: 'business', autonomous: false, residentOnly: true }),
      { id: 'repair', label: 'act.repair', duration: 40, effects: {}, care: 'repair', skill: { id: 'handiness', xpPerMinute: 1.2 } },
    ],
    upkeep: { wear: 0.07, breaks: true },
  },
  {
    id: 'guitar',
    name: 'obj.guitar',
    tier: 0,
    line: 'guitar',
    room: 'studio',
    price: 240,
    category: 'games',
    art: 'guitar',
    size: { w: 1, h: 1 },
    ambience: 2,
    interactions: [
      { id: 'strum', label: 'act.strum', duration: 45, effects: { fun: 0.8, social: 0.1 }, until: 'fun', anim: 'strum', hold: 'guitar', skill: { id: 'creativity', xpPerMinute: 1.0 } },
      { id: 'compose', label: 'act.compose', duration: 60, effects: { fun: 0.4 }, anim: 'strum', hold: 'guitar', project: 'song', autonomous: false, residentOnly: true, skill: { id: 'creativity', xpPerMinute: 0.8 } },
      { id: 'freelance', label: 'act.freelance', duration: 120, effects: { fun: -0.05, comfort: 0.1 }, anim: 'strum', hold: 'guitar', task: 'gig', autonomous: false, residentOnly: true },
    ],
  },
  {
    id: 'yogamat',
    name: 'obj.yogamat',
    tier: 0,
    line: 'yogamat',
    room: 'gym',
    price: 70,
    category: 'hobbies',
    art: 'yogamat',
    size: { w: 1, h: 1 },
    ambience: 1,
    interactions: [
      { id: 'yoga', label: 'act.yoga', duration: 40, effects: { comfort: 0.6, fun: 0.4, energy: -0.05 }, until: 'comfort', anim: 'yoga', onObject: true, kids: 'no', skill: { id: 'fitness', xpPerMinute: 0.9 } },
      { id: 'stretch', label: 'act.stretch', duration: 12, effects: { comfort: 1.0, energy: 0.05 }, until: 'comfort', anim: 'stretch', onObject: true, skill: { id: 'fitness', xpPerMinute: 0.3 } },
      { id: 'situps', label: 'act.situps', duration: 25, effects: { fun: 0.2, energy: -0.3, hygiene: -0.2 }, anim: 'situps', onObject: true, kids: 'no', autonomous: false, skill: { id: 'fitness', xpPerMinute: 1.4 } },
    ],
  },
  {
    id: 'toybox',
    name: 'obj.toybox',
    tier: 0,
    line: 'toybox',
    room: 'bedroom',
    price: 90,
    category: 'hobbies',
    art: 'toybox',
    useSides: ['S'],
    size: { w: 1, h: 1 },
    slots: 2,
    ambience: 2,
    interactions: [
      {
        id: 'playBlocks',
        label: 'act.playBlocks',
        duration: 45,
        effects: { fun: 1.5, social: 0.1 },
        until: 'fun',
        kids: 'only',
        anim: 'playFloor',
        hold: 'block',
        skill: { id: 'creativity', xpPerMinute: 0.6 },
        duo: { effects: { social: 0.9, fun: 0.3 }, friendship: 0.06 },
      },
    ],
  },
];

// ---------- o que entra nos objetos que já existiam ----------

const BOOK_OF: Record<string, string> = { study: 'logic', recipes: 'recipes', manual: 'manual' };

const moreBooks = (xp: number): InteractionDef[] => [
  { id: 'readArt', label: 'act.readArt', duration: 60, effects: { fun: 0.2 }, autonomous: false, book: 'art', skill: { id: 'creativity', xpPerMinute: xp * 0.8 } },
  { id: 'readSpeech', label: 'act.readSpeech', duration: 60, effects: { fun: 0.15 }, autonomous: false, book: 'speech', skill: { id: 'charisma', xpPerMinute: xp * 0.8 } },
  { id: 'readTraining', label: 'act.readTraining', duration: 60, effects: { fun: 0.1 }, autonomous: false, book: 'training', skill: { id: 'fitness', xpPerMinute: xp * 0.6 } },
];

/** Ler da estante: pega o livro (etapa de 1 min, o braço lá em cima) e procura onde sentar. */
const PICK: Partial<InteractionDef> = { browse: true, anim: 'read', hold: 'book', stages: { enter: { minutes: 1, anim: 'shelve', hold: 'book' } } };

/** Devolver o livro na estante (vem encadeado do fim da leitura). */
const returnBook = (): InteractionDef => ({ id: 'returnBook', label: 'act.returnBook', duration: 1, effects: {}, hidden: true, anim: 'shelve', hold: 'book' });

/** Ler deitado na cama, com o livro em cima do peito. */
const readInBed = (): InteractionDef => ({
  id: 'readInBed',
  label: 'act.readInBed',
  duration: 50,
  effects: { fun: 0.7, comfort: 0.5 },
  until: 'fun',
  pose: 'lie',
  onObject: true,
  anim: 'read_lie',
  hold: 'book',
  autonomous: false,
  residentOnly: true,
});

const DESK_ANIM: Record<string, string> = { puzzles: 'puzzle', write: 'write', homework: 'write', freelance: 'write', business: 'write' };

export function withHobbies(def: ObjectDef): ObjectDef {
  const its = def.interactions;
  const has = (id: string) => its.some((i) => i.id === id);
  // estante: pega o livro, senta perto para ler; os de habilidade guardam a página
  if (def.line === 'bookshelf' || (has('read') && has('study'))) {
    const xp = its.find((i) => i.id === 'study')?.skill?.xpPerMinute ?? 1;
    const mapped = its.map((i): InteractionDef => {
      if (i.homework) return i;
      if (i.id === 'read') return { ...i, ...PICK };
      const book = BOOK_OF[i.id];
      return book ? { ...i, ...PICK, book } : i;
    });
    const extra = has('recipes') ? moreBooks(xp).map((b) => ({ ...b, ...PICK })) : [];
    return { ...def, interactions: [...mapped, ...extra, returnBook()] };
  }
  if (def.category === 'beds' && its.some((i) => i.pose === 'lie' && i.onObject) && !has('readInBed')) {
    return { ...def, interactions: [...its, readInBed()] };
  }
  // escrivaninha: senta na cadeira dela; escrever vira o romance à mão
  if (def.art === 'desk') {
    return {
      ...def,
      interactions: its.map((i) => {
        if (i.pose !== 'sit') return i;
        const out: InteractionDef = { ...i, onObject: true, anim: DESK_ANIM[i.homework ? 'homework' : i.id] ?? 'write' };
        if (i.id === 'write') out.project = 'novel';
        return out;
      }),
    };
  }
  if (def.art === 'easel') {
    return {
      ...def,
      interactions: [
        ...its.map((i) => (i.id === 'paint' ? { ...i, canvas: 'paint' as const, anim: 'paint', hold: 'brush' as const } : i.task ? { ...i, anim: 'paint', hold: 'brush' as const } : i)),
        { id: 'sellPainting', label: 'act.sellPainting', duration: 3, effects: { fun: 0.3 }, canvas: 'sell', anim: 'reach', autonomous: false, residentOnly: true },
        { id: 'scrapCanvas', label: 'act.scrapCanvas', duration: 2, effects: {}, canvas: 'scrap', anim: 'reach', autonomous: false, residentOnly: true },
      ],
    };
  }
  if (def.line === 'piano') {
    const play = its.find((i) => i.id === 'playMusic');
    const compose: InteractionDef = {
      ...(play ?? { id: 'compose', label: 'act.compose', duration: 60, effects: {} }),
      id: 'compose',
      label: 'act.compose',
      duration: 60,
      effects: { fun: 0.4 },
      until: undefined,
      duo: undefined,
      project: 'song',
      autonomous: false,
      residentOnly: true,
      anim: 'keys',
      skill: { id: 'creativity', xpPerMinute: (play?.skill?.xpPerMinute ?? 1) * 0.8 },
    };
    const gig: InteractionDef = { ...compose, id: 'freelance', label: 'act.freelance', duration: 120, effects: { fun: -0.05, comfort: 0.1 }, project: undefined, skill: undefined, task: 'gig' };
    return { ...def, interactions: [...its.map((i) => (i.id === 'playMusic' ? { ...i, anim: 'keys' } : i)), compose, ...(has('freelance') ? [] : [gig])] };
  }
  const anim = (id: string, a: string, hold?: InteractionDef['hold']): ObjectDef => ({
    ...def,
    interactions: its.map((i) => (i.id === id ? { ...i, anim: a, ...(hold ? { hold } : {}) } : i)),
  });
  if (def.line === 'chess') return anim('chess', 'chess');
  if (def.line === 'cards') return anim('cards', 'cards', 'cards');
  if (def.line === 'videogame') return anim('play', 'gamepad', 'gamepad');
  if (def.art === 'bike') return anim('pedal', 'pedal');
  if (def.line === 'punchbag') return anim('punch', 'punch');
  if (def.art === 'mailbox') {
    const jog: InteractionDef = {
      id: 'jog',
      label: 'act.jog',
      duration: 40,
      effects: { fun: 0.4, energy: -0.3, hygiene: -0.3, comfort: -0.05 },
      jog: true,
      anim: 'jog',
      autonomous: false,
      residentOnly: true,
      skill: { id: 'fitness', xpPerMinute: 1.3 },
    };
    return { ...def, interactions: [...its, jog] };
  }
  return def;
}
