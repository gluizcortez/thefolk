import type { ObjectDef } from '../sim/types';

// Catálogo de objetos. Tudo aqui é dado: para criar um objeto novo, adicione
// uma entrada, os textos em i18n e (opcional) um desenho em game/art/objects.ts
// com o mesmo id de `art` (sem desenho, aparece uma caixa genérica).
//
// `useSides` limita de que lados o folk usa o objeto (a frente do desenho
// fica para o sul ou para o leste).
// `effects` é por minuto de jogo; `duration` é o máximo em minutos; `until`
// encerra a interação quando aquela necessidade enche.
const list: ObjectDef[] = [
  {
    id: 'fridge',
    name: 'obj.fridge',
    art: 'fridge',
    useSides: ['S', 'W'],
    size: { w: 1, h: 1 },
    ambience: 0,
    interactions: [
      {
        id: 'meal',
        label: 'act.meal',
        duration: 50,
        effects: { hunger: 2.0, energy: -0.02 },
        until: 'hunger',
      },
      { id: 'snack', label: 'act.snack', duration: 12, effects: { hunger: 2.2 }, until: 'hunger' },
    ],
  },
  {
    id: 'bed',
    name: 'obj.bed',
    art: 'bed',
    size: { w: 1, h: 2 },
    ambience: 4,
    interactions: [
      {
        id: 'sleep',
        label: 'act.sleep',
        duration: 600,
        effects: { energy: 0.2, comfort: 0.15 },
        until: 'energy',
        autoBelow: 35,
        decayScale: 0.5,
        pose: 'lie',
        onObject: true,
      },
      {
        id: 'nap',
        label: 'act.nap',
        duration: 90,
        effects: { energy: 0.25, comfort: 0.4 },
        until: 'energy',
        decayScale: 0.5,
        autonomous: false,
        pose: 'lie',
        onObject: true,
      },
    ],
  },
  {
    id: 'shower',
    name: 'obj.shower',
    art: 'shower',
    size: { w: 1, h: 1 },
    ambience: 0,
    interactions: [
      {
        id: 'shower',
        label: 'act.shower',
        duration: 25,
        effects: { hygiene: 4.5, comfort: 0.3 },
        until: 'hygiene',
        onObject: true,
      },
    ],
  },
  {
    id: 'toilet',
    name: 'obj.toilet',
    art: 'toilet',
    useSides: ['S'],
    size: { w: 1, h: 1 },
    ambience: -6,
    interactions: [
      {
        id: 'use',
        label: 'act.toilet',
        duration: 8,
        effects: { bladder: 14, hygiene: -0.5 },
        until: 'bladder',
        pose: 'sit',
        onObject: true,
      },
    ],
  },
  {
    id: 'sink',
    name: 'obj.sink',
    art: 'sink',
    useSides: ['E'],
    size: { w: 1, h: 1 },
    ambience: 0,
    interactions: [
      { id: 'wash', label: 'act.wash', duration: 5, effects: { hygiene: 3 }, until: 'hygiene' },
    ],
  },
  {
    id: 'sofa',
    name: 'obj.sofa',
    art: 'sofa',
    useSides: ['S'],
    size: { w: 2, h: 1 },
    ambience: 5,
    interactions: [
      {
        id: 'rest',
        label: 'act.rest',
        duration: 60,
        effects: { comfort: 2.0, energy: 0.05 },
        until: 'comfort',
        pose: 'sit',
        onObject: true,
      },
    ],
  },
  {
    id: 'tv',
    name: 'obj.tv',
    art: 'tv',
    useSides: ['E'],
    size: { w: 1, h: 1 },
    ambience: 4,
    interactions: [
      { id: 'watch', label: 'act.watch', duration: 90, effects: { fun: 1.3 }, until: 'fun' },
    ],
  },
  {
    id: 'bookshelf',
    name: 'obj.bookshelf',
    art: 'bookshelf',
    useSides: ['S'],
    size: { w: 2, h: 1 },
    ambience: 8,
    interactions: [
      { id: 'read', label: 'act.read', duration: 75, effects: { fun: 0.9 }, until: 'fun' },
    ],
  },
  {
    id: 'phone',
    name: 'obj.phone',
    art: 'phone',
    size: { w: 1, h: 1 },
    ambience: 0,
    interactions: [
      {
        id: 'call',
        label: 'act.call',
        duration: 40,
        effects: { social: 2.2, fun: 0.2 },
        until: 'social',
      },
    ],
  },
  {
    id: 'speaker',
    name: 'obj.speaker',
    art: 'speaker',
    useSides: ['S', 'W'],
    size: { w: 1, h: 1 },
    ambience: 4,
    interactions: [
      {
        id: 'dance',
        label: 'act.dance',
        duration: 45,
        effects: { fun: 2.0, energy: -0.25 },
        until: 'fun',
        pose: 'dance',
      },
    ],
  },
  {
    id: 'plant',
    name: 'obj.plant',
    art: 'plant',
    size: { w: 1, h: 1 },
    ambience: 14,
    interactions: [
      { id: 'water', label: 'act.water', duration: 10, effects: { fun: 0.4, ambience: 0.4 } },
    ],
  },
  {
    id: 'lamp',
    name: 'obj.lamp',
    art: 'lamp',
    size: { w: 1, h: 1 },
    ambience: 12,
    interactions: [],
  },
];

export const OBJECTS: Record<string, ObjectDef> = Object.fromEntries(list.map((o) => [o.id, o]));
