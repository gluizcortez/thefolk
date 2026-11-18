// Plano 2, bloco 7: atividades a fundo II. Regras puras do lazer, do estudo
// e do trabalho em casa: livros de habilidade com o progresso salvo no folk,
// romance, programa e música que avançam aos poucos e se vendem prontos, o
// quadro que vai aparecendo no cavalete, a corrida pela calçada e a janela.
// Nada de DOM nem Three.js.

import type { Nav } from './grid';
import { skillLevel } from './skills';
import type { Canvas, Folk, ProjectKind, Vec, WorldObject } from './types';

// ---------- livros ----------

/** Um livro de habilidade: quantos minutos tem e o bônus de quem lê até o fim. */
export interface BookDef {
  id: string;
  skill: string;
  /** minutos para ler inteiro */
  minutes: number;
  /** experiência a mais no fim */
  bonus: number;
}

export const BOOKS: Record<string, BookDef> = {
  logic: { id: 'logic', skill: 'logic', minutes: 240, bonus: 90 },
  recipes: { id: 'recipes', skill: 'cooking', minutes: 180, bonus: 70 },
  manual: { id: 'manual', skill: 'handiness', minutes: 180, bonus: 70 },
  art: { id: 'art', skill: 'creativity', minutes: 200, bonus: 80 },
  speech: { id: 'speech', skill: 'charisma', minutes: 200, bonus: 80 },
  training: { id: 'training', skill: 'fitness', minutes: 150, bonus: 60 },
};

/** Livro já lido inteiro rende só isto do treino na releitura. */
export const REREAD = 0.4;

/** Minutos lidos do livro (0 = nunca abriu). */
export function bookRead(folk: Folk, id: string): number {
  return folk.books?.[id] ?? 0;
}

/** Fração lida, de 0 a 1. */
export function bookProgress(folk: Folk, id: string): number {
  const def = BOOKS[id];
  if (!def) return 0;
  return Math.min(1, bookRead(folk, id) / def.minutes);
}

export function bookFinished(folk: Folk, id: string): boolean {
  return bookProgress(folk, id) >= 1;
}

/**
 * Um minuto de leitura. Devolve 'finished' no minuto em que chega ao fim
 * (o bônus já entra na habilidade), senão null.
 */
export function readTick(folk: Folk, id: string): 'finished' | null {
  const def = BOOKS[id];
  if (!def) return null;
  const before = bookRead(folk, id);
  if (before >= def.minutes) return null;
  folk.books = { ...(folk.books ?? {}), [id]: before + 1 };
  if (before + 1 < def.minutes) return null;
  folk.skills[def.skill] = (folk.skills[def.skill] ?? 0) + def.bonus;
  return 'finished';
}

/** Quanto do treino normal o livro ainda dá (relido rende menos). */
export function readFactor(folk: Folk, id: string): number {
  return bookFinished(folk, id) ? REREAD : 1;
}

/**
 * Quem devolve o livro na estante ao terminar. O caprichoso sempre devolve;
 * o desleixado deixa largado de vez em quando (`roll` de 0 a 1).
 */
export function returnsBook(tidy: number, roll: number): boolean {
  if (tidy >= 1.2) return true;
  if (tidy <= 0.7) return roll < 0.3;
  return roll < 0.75;
}

// ---------- trabalhos que avançam (romance, programa, música) ----------

export interface ProjectDef {
  kind: ProjectKind;
  skill: string;
  /** minutos de trabalho (de quem está no nível 0) para terminar */
  minutes: number;
  /** quanto rende pronto: base + por nível médio de qualidade */
  base: number;
  perLevel: number;
}

export const PROJECTS: Record<ProjectKind, ProjectDef> = {
  novel: { kind: 'novel', skill: 'creativity', minutes: 360, base: 90, perLevel: 70 },
  program: { kind: 'program', skill: 'logic', minutes: 300, base: 80, perLevel: 65 },
  song: { kind: 'song', skill: 'creativity', minutes: 160, base: 35, perLevel: 35 },
};

/** Cada nível da habilidade faz o trabalho andar mais rápido. */
export const PROJECT_SPEED_PER_LEVEL = 0.12;

/** Fração feita (0 a 1) do trabalho em andamento. */
export function projectProgress(folk: Folk, kind: ProjectKind): number {
  const p = folk.projects?.[kind];
  if (!p) return 0;
  return Math.min(1, p.done / PROJECTS[kind].minutes);
}

/** Quanto rende um trabalho pronto com essa qualidade (nível médio). */
export function projectPay(kind: ProjectKind, quality: number): number {
  const def = PROJECTS[kind];
  return Math.round(def.base + def.perLevel * quality);
}

/**
 * Um minuto de trabalho. Pronto, o trabalho sai do folk, conta nos feitos e
 * devolve quanto rendeu (o pagamento fica com quem chama); senão, null.
 */
export function projectTick(folk: Folk, kind: ProjectKind): { pay: number; quality: number; count: number } | null {
  const def = PROJECTS[kind];
  const level = skillLevel(folk, def.skill);
  const projects = { ...(folk.projects ?? {}) };
  const p = { ...(projects[kind] ?? { done: 0, quality: 0, minutes: 0 }) };
  p.done += 1 + PROJECT_SPEED_PER_LEVEL * level;
  p.quality += level;
  p.minutes += 1;
  if (p.done < def.minutes) {
    projects[kind] = p;
    folk.projects = projects;
    return null;
  }
  delete projects[kind];
  folk.projects = projects;
  const quality = p.minutes > 0 ? p.quality / p.minutes : 0;
  const count = (folk.works?.[kind] ?? 0) + 1;
  folk.works = { ...(folk.works ?? {}), [kind]: count };
  return { pay: projectPay(kind, quality), quality, count };
}

// ---------- quadro no cavalete ----------

/** Minutos para terminar um quadro (de quem está no nível 0). */
export const CANVAS_MINUTES = 180;

/** Fração pintada (0 a 1); sem quadro, 0. */
export function canvasProgress(obj: Pick<WorldObject, 'canvas'>): number {
  return Math.min(1, (obj.canvas?.progress ?? 0) / 100);
}

export function canvasDone(obj: Pick<WorldObject, 'canvas'>): boolean {
  return (obj.canvas?.progress ?? 0) >= 100;
}

/** Qualidade do quadro (nível médio de criatividade de quem pintou). */
export function canvasQuality(c: Canvas | undefined): number {
  return c && c.minutes > 0 ? c.quality / c.minutes : 0;
}

/** Quanto se ganha vendendo o quadro pronto. */
export function paintingPrice(c: Canvas | undefined): number {
  return Math.round(40 + 45 * canvasQuality(c));
}

/**
 * Um minuto pintando. Começa uma tela nova se não houver; devolve true no
 * minuto em que o quadro fica pronto.
 */
export function paintTick(obj: WorldObject, folk: Folk, seed: number): boolean {
  if (canvasDone(obj)) return false;
  const level = skillLevel(folk, 'creativity');
  const c: Canvas = obj.canvas ? { ...obj.canvas } : { progress: 0, quality: 0, minutes: 0, by: folk.id, seed };
  c.progress = Math.min(100, c.progress + (100 / CANVAS_MINUTES) * (1 + PROJECT_SPEED_PER_LEVEL * level));
  c.quality += level;
  c.minutes += 1;
  obj.canvas = c;
  return c.progress >= 100;
}

// ---------- corrida ----------

/** Até quantos passos a corrida vai antes de voltar. */
export const JOG_REACH = 9;

/**
 * Caminho da corrida: sai da porta (do objeto de onde parte) pela calçada até
 * o tile de fora mais longe a até `JOG_REACH` passos, e volta.
 */
export function jogRoute(nav: Nav, from: Vec, outdoor: (x: number, y: number) => boolean): Vec[] {
  // busca em largura pelos tiles de fora, a partir da porta
  const prev = new Map<string, Vec | null>();
  const key = (v: Vec) => `${v.x},${v.y}`;
  prev.set(key(from), null);
  let frontier: Vec[] = [from];
  let far: Vec | null = null;
  for (let step = 0; step < JOG_REACH && frontier.length > 0; step++) {
    const next: Vec[] = [];
    for (const c of frontier) {
      for (const [dx, dy] of [
        [1, 0],
        [-1, 0],
        [0, 1],
        [0, -1],
      ]) {
        const n = { x: c.x + dx, y: c.y + dy };
        if (prev.has(key(n)) || !nav.isFree(n.x, n.y) || !outdoor(n.x, n.y)) continue;
        prev.set(key(n), c);
        next.push(n);
      }
    }
    if (next.length > 0) far = next[0];
    frontier = next;
  }
  if (!far) return [];
  const there: Vec[] = [];
  for (let c: Vec | null = far; c && (c.x !== from.x || c.y !== from.y); c = prev.get(key(c)) ?? null) there.unshift(c);
  if (there.length < 3) return [];
  const back = there.slice(0, -1).reverse();
  return [...there, ...back, { ...from }];
}

// ---------- janela ----------

/** Minutos olhando pela janela. */
export const WINDOW_MINUTES = 12;
