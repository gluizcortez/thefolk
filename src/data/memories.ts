import type { MemoryDef } from '../sim/types';

// Lembranças marcantes que um folk guarda de outro. `weight` pesa na chance
// de topar a próxima conversa com essa pessoa (positivo aproxima, negativo
// afasta). A IA também usa o peso: com rancor alto o folk evita
// papo amigável e pode partir para a briga; com carinho, procura mais.
const list: MemoryDef[] = [
  { id: 'met', label: 'mem.met', weight: 0, once: true },
  // bloco 14: luto por quem se foi (e o susto com o fantasma dessa pessoa)
  { id: 'mourned', label: 'mem.mourned', weight: 0, once: true },
  { id: 'hauntedMe', label: 'mem.hauntedMe', weight: -1 },
  // bloco 4: jogaram, tocaram ou relaxaram juntos
  { id: 'playedTogether', label: 'mem.playedTogether', weight: 1, once: true },
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
  // bloco 1: quem se incomoda com bagunça lembra de quem deixou
  { id: 'leftMess', label: 'mem.leftMess', weight: -1 },
  // bloco 2: campainha
  { id: 'leftAtDoor', label: 'mem.leftAtDoor', weight: -2 },
  { id: 'turnedAway', label: 'mem.turnedAway', weight: -3 },
  { id: 'goodTip', label: 'mem.goodTip', weight: 1 },
  // bloco 10: vida a dois
  { id: 'engaged', label: 'mem.engaged', weight: 6, log: 'log.engagedMemory' },
  { id: 'proposalRefused', label: 'mem.proposalRefused', weight: -3 },
  { id: 'refusedProposal', label: 'mem.refusedProposal', weight: -1 },
  { id: 'married', label: 'mem.married', weight: 8 },
  { id: 'sleptTogether', label: 'mem.sleptTogether', weight: 2, once: true },
  { id: 'divorced', label: 'mem.divorced', weight: -6 },
  { id: 'gotDivorced', label: 'mem.gotDivorced', weight: -8 },
  { id: 'toldToLeave', label: 'mem.toldToLeave', weight: -5 },
  { id: 'atWedding', label: 'mem.atWedding', weight: 2, once: true },
];

export const MEMORIES: Record<string, MemoryDef> = Object.fromEntries(list.map((m) => [m.id, m]));
