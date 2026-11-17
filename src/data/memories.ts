import type { MemoryDef } from '../sim/types';

// Lembranças marcantes que um folk guarda de outro. `weight` pesa na chance
// de topar a próxima conversa com essa pessoa (positivo aproxima, negativo
// afasta). A fatia 5 vai usar essas lembranças para fofoca e ciúme.
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
];

export const MEMORIES: Record<string, MemoryDef> = Object.fromEntries(list.map((m) => [m.id, m]));
