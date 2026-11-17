import type { MemoryDef } from '../sim/types';

// Lembranças marcantes que um folk guarda de outro. `weight` pesa na chance
// de topar a próxima conversa com essa pessoa (positivo aproxima, negativo
// afasta). A IA também usa o peso: com rancor alto o folk evita
// papo amigável e pode partir para a briga; com carinho, procura mais.
const list: MemoryDef[] = [
  { id: 'met', label: 'mem.met', weight: 0, once: true },
  { id: 'confided', label: 'mem.confided', weight: 2 },
  { id: 'heardOut', label: 'mem.heardOut', weight: 2 },
  { id: 'firstHug', label: 'mem.firstHug', weight: 1, once: true },
  { id: 'firstKiss', label: 'mem.firstKiss', weight: 4, once: true, log: 'log.firstKiss' },
  { id: 'startedDating', label: 'mem.startedDating', weight: 5, log: 'log.datingMemory' },
  { id: 'turnedDown', label: 'mem.turnedDown', weight: -3 },
  { id: 'gotTurnedDown', label: 'mem.gotTurnedDown', weight: -1 },
  { id: 'rebuffed', label: 'mem.rebuffed', weight: -2 },
  { id: 'fought', label: 'mem.fought', weight: -4, log: 'log.fought' },
  { id: 'insulted', label: 'mem.insulted', weight: -3 },
  { id: 'movedIn', label: 'mem.movedIn', weight: 3, once: true },
  { id: 'gotAdvice', label: 'mem.gotAdvice', weight: 1 },
  // fatia 5: namoro, ciúme e trabalho
  { id: 'cheatedOnMe', label: 'mem.cheatedOnMe', weight: -8 },
  { id: 'rival', label: 'mem.rival', weight: -4 },
  { id: 'brokeUp', label: 'mem.brokeUp', weight: -2 },
  { id: 'gotDumped', label: 'mem.gotDumped', weight: -5 },
  { id: 'apologized', label: 'mem.apologized', weight: 4 },
  { id: 'deniedRaise', label: 'mem.deniedRaise', weight: -2 },
  { id: 'helpedOut', label: 'mem.helpedOut', weight: 3 },
  { id: 'coveredForMe', label: 'mem.coveredForMe', weight: 4 },
  { id: 'tookCredit', label: 'mem.tookCredit', weight: -5 },
  { id: 'mentoredMe', label: 'mem.mentoredMe', weight: 3, once: true },
  { id: 'cheeredUp', label: 'mem.cheeredUp', weight: 3 },
];

export const MEMORIES: Record<string, MemoryDef> = Object.fromEntries(list.map((m) => [m.id, m]));
