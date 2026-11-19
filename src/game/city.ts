import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import {
  CENTRO_AT,
  CENTRO_SIZE,
  CITY_BOUNDS,
  DISTRICT_DEPTH,
  LOT_H,
  LOT_PITCH,
  LOT_W,
  PUBLIC_AREA,
  RIVER,
  SQUARE,
  buildingOf,
  placeCenter,
  placeSpot,
  STREET_WIDTH,
  activeLot,
  buildHome,
  centroPlace,
  cityOn,
  cityStreets,
  districtOrigin,
  familyById,
  lotPlace,
  lotRect,
  lotStatus,
  objectSize,
  streetZ,
  toCity,
  toLocal,
  tripState,
} from '../sim';
import type { Folk, Lot, LotHome, Place, PlaceDef, Pt, World } from '../sim';
import { t } from '../i18n';
import { box, colorMat, cyl, rod, setShadows, texMat, tileUV } from './art/build';
import { objectArt } from './art/furniture';
import { House, sceneZ } from './art/house';
import { PAL, SKIN, seeded } from './art/palette';
import { belltower, bush, car, hydrant, sobrado, streetLamp, tree } from './art/scenery';
import type { GameController } from './controller';

// Plano 2, bloco 12: a cidade em volta do lote em jogo. A cena do jogo
// continua com o lote em jogo na origem (paredes, móveis e gente de verdade);
// esta camada põe o resto da cidade em volta, no lugar certo: ruas, rio,
// ponte, praça, mato, os outros lotes e o centro. A arte de cada lote é
// montada em duas versões: a simples (caixa e telhado, sempre lá) e a
// detalhada (a casa de verdade, montada quando a câmera chega perto e
// desmontada quando se afasta). Daqui também saem as etiquetas do mapa e os
// ícones de onde está cada um da família.

/** A partir desta altura de vista a tela vira o mapa da cidade (cartão do lote, etiquetas). */
export const MAP_ZOOM = 60;
/** Altura máxima de vista (a cidade inteira cabe). */
export const CITY_ZOOM = 300;
/** Etiquetas de bairro e ícones da família aparecem a partir daqui. */
export const LABEL_ZOOM = 26;
/** Casa detalhada só com a vista abaixo disto e perto da câmera. */
const DETAIL_ZOOM = 70;
const DETAIL_RADIUS = 48;
/** Chão além dos limites da cidade (para a borda não aparecer de longe). */
const GROUND_PAD = 160;

interface LotArt {
  lot: Lot;
  simple: THREE.Group;
  detail: THREE.Group | null;
  center: Pt;
}

export interface MapMark {
  key: string;
  kind: 'district' | 'place' | 'street' | 'folk' | 'lot';
  text: string;
  x: number;
  y: number;
  /** ícone de folk: id do folk; etiqueta de lote: id do lote */
  id?: number;
  /** plano 2, bloco 13: etiqueta de lugar (id do lugar) */
  place?: string;
  on?: boolean;
  /** viagem: como vai (a pé, bicicleta...) */
  how?: string;
}

export class CityLayer {
  /** a cidade inteira, em coordenadas da cidade, posta em volta do lote mostrado */
  readonly root = new THREE.Group();
  private stat = new THREE.Group();
  private lotsRoot = new THREE.Group();
  private movers = new THREE.Group();
  private pick = new THREE.Group();
  private hoverMark: THREE.Group;
  private selectMark: THREE.Group;
  private hoverPlaceMark: THREE.Group;
  private selectPlaceMark: THREE.Group;
  private arts = new Map<number, LotArt>();
  /** plano 2, bloco 13: os lugares da cidade (o centro é um deles), simples e detalhados */
  private placeArts = new Map<string, { def: PlaceDef; simple: THREE.Group; detail: THREE.Group | null; center: Pt }>();
  private venueHomes = new Map<string, LotHome>();
  private builtKey = '';
  private staticKey = '';
  /** lote mostrado em detalhe pelo jogo (id do lugar no passeio) */
  private shown: number | string = 0;
  private place: Place = { x: 0, z: 0, flip: false };
  private moverKey = '';
  private moverModels: THREE.Group[] = [];
  /** lote sob o mouse no mapa (0 = nenhum) */
  hover = 0;
  /** plano 2, bloco 13: lugar sob o mouse no mapa ('' = nenhum) */
  hoverPlace = '';
  /** altura da vista no último quadro */
  viewHeight = 11;

  constructor(private readonly ctrl: GameController) {
    this.root.add(this.stat, this.lotsRoot, this.movers, this.pick);
    this.hoverMark = frame(0xffffff, 0.5);
    this.selectMark = frame(PAL.mustard, 0.95);
    this.hoverPlaceMark = frame(0xffffff, 0.5);
    this.selectPlaceMark = frame(PAL.mustard, 0.95);
    this.pick.add(this.hoverMark, this.selectMark, this.hoverPlaceMark, this.selectPlaceMark);
    this.root.visible = false;
  }

  get on(): boolean {
    return cityOn(this.ctrl.world);
  }

  /** Onde o lote mostrado fica na cidade. */
  get shownPlace(): Place {
    return this.place;
  }

  // ---------- conversão ----------

  /** Ponto local da cena (x, z) para a cidade. */
  toCity(x: number, z: number): Pt {
    return toCity(this.place, x, z);
  }

  /** Ponto da cidade para a cena local. */
  toLocal(x: number, z: number): Pt {
    return toLocal(this.place, x, z);
  }

  // ---------- montagem ----------

  /** Chamado a cada quadro: refaz o que mudou, troca o detalhe por perto e move quem anda na rua. */
  sync(target: THREE.Vector3, viewHeight: number, tick: number): void {
    this.viewHeight = viewHeight;
    const world = this.ctrl.world;
    this.root.visible = this.on;
    if (!this.on) return;
    const town = world.town!;
    const lot = activeLot(world);
    const venue = world.outing ? this.places().find((p) => p.id === world.outing!.venue) : undefined;
    this.shown = world.outing ? world.outing.venue : (lot?.id ?? 0);
    this.place = world.outing ? (venue ? placeSpot(venue) : centroPlace()) : lot ? lotPlace(lot) : { x: 0, z: 0, flip: false };
    // a cidade gira e anda para o lote mostrado ficar na origem
    if (this.place.flip) {
      this.root.rotation.y = Math.PI;
      this.root.position.set(this.place.x, 0, this.place.z);
    } else {
      this.root.rotation.y = 0;
      this.root.position.set(-this.place.x, 0, -this.place.z);
    }
    const sKey = `${town.city?.districts.length ?? 0}`;
    if (sKey !== this.staticKey) {
      this.staticKey = sKey;
      this.buildStatic(world);
    }
    const key = `${this.ctrl.townVersion}|${this.shown}|${town.lots.length}`;
    if (key !== this.builtKey) {
      this.builtKey = key;
      this.buildLots(world);
    }
    this.updateDetail(target, viewHeight);
    this.updateMovers(world, tick);
    punchGround(world.grid.w, world.grid.h);
    this.placeMark(this.hoverMark, this.ctrl.screen === 'town' && this.hover !== this.ctrl.townLot ? this.hover : 0);
    this.placeMark(this.selectMark, this.ctrl.screen === 'town' && !this.ctrl.townPlace ? this.ctrl.townLot : 0);
    const onMap = this.ctrl.screen === 'town';
    this.markPlace(this.hoverPlaceMark, onMap && this.hoverPlace !== this.ctrl.townPlace ? this.hoverPlace : '');
    this.markPlace(this.selectPlaceMark, onMap ? this.ctrl.townPlace : '');
  }

  /** Plano 2, bloco 13: os lugares da cidade (do catálogo). */
  places(): PlaceDef[] {
    return Object.values(this.ctrl.sim.catalog.places ?? {});
  }

  private markPlace(mark: THREE.Group, id: string): void {
    const p = id ? this.places().find((x) => x.id === id) : undefined;
    mark.visible = !!p;
    if (!p) return;
    mark.position.set(p.rect.x + p.rect.w / 2, 0.08, p.rect.z + p.rect.h / 2);
    mark.scale.set(p.rect.w + 1, 1, p.rect.h + 1);
  }

  /** Plano 2, bloco 13: lugar debaixo de um ponto local do chão ('' = nenhum). */
  placeAt(local: THREE.Vector3): string {
    if (!this.on) return '';
    const c = this.toCity(local.x, local.z);
    const p = this.places().find((x) => c.x >= x.rect.x - 0.5 && c.x <= x.rect.x + x.rect.w + 0.5 && c.z >= x.rect.z - 0.5 && c.z <= x.rect.z + x.rect.h + 0.5);
    return p?.id ?? '';
  }

  /** Plano 2, bloco 13: o lote montado de um lugar aberto (cópia só para desenhar). */
  private venueHome(id: string): LotHome | null {
    const plan = this.ctrl.sim.catalog.venues?.[id];
    if (!plan) return null;
    let home = this.venueHomes.get(id);
    if (!home) {
      // monta numa cópia do mundo: os ids dos objetos não gastam os do jogo
      const world = { ...this.ctrl.world, nextId: 1_000_000 } as World;
      home = buildHome(world, this.ctrl.sim.catalog, plan).home;
      this.venueHomes.set(id, home);
    }
    return home;
  }

  private clear(g: THREE.Group): void {
    g.traverse((o) => {
      if (o instanceof THREE.Mesh) o.geometry.dispose();
    });
    g.clear();
  }

  /** Chão, morros, rio, ponte, ruas, praça, área dos lugares públicos e mato. */
  private buildStatic(world: World): void {
    this.clear(this.stat);
    const town = world.town!;
    const parts = new THREE.Group();
    parts.add(ground());
    // rio com margens de pedra
    const riverLen = CITY_BOUNDS.z1 - CITY_BOUNDS.z0 + 2 * GROUND_PAD;
    const water = new THREE.Mesh(new THREE.PlaneGeometry(RIVER.x1 - RIVER.x0, riverLen), texMat('water', { color: 0x9ccbe0 }));
    tileUV(water, (RIVER.x1 - RIVER.x0) / 3, riverLen / 3);
    water.rotation.x = -Math.PI / 2;
    water.position.set((RIVER.x0 + RIVER.x1) / 2, 0.004, (CITY_BOUNDS.z0 + CITY_BOUNDS.z1) / 2);
    parts.add(water);
    for (const x of [RIVER.x0, RIVER.x1]) parts.add(box(0.8, 0.25, riverLen, texMat('stone', { color: 0xc9c1ae }), x, -0.1, (CITY_BOUNDS.z0 + CITY_BOUNDS.z1) / 2));
    // ruas e calçadas
    const streets = cityStreets(town);
    streets.forEach((s, i) => parts.add(streetArt(s.a, s.b, streets, i)));
    // ponte: guarda-corpo dos dois lados por cima do rio
    const bz = streetZ(1);
    for (const side of [-1, 1]) {
      const z = bz + side * (STREET_WIDTH / 2 + 0.1);
      parts.add(box(RIVER.x1 - RIVER.x0 + 4, 0.18, 0.25, colorMat(0xd8d0bd), (RIVER.x0 + RIVER.x1) / 2, 0.85, z));
      for (let x = RIVER.x0 - 2; x <= RIVER.x1 + 2; x += 1.6) parts.add(box(0.18, 0.85, 0.18, colorMat(0xd8d0bd), x, 0, z));
    }
    parts.add(box(RIVER.x1 - RIVER.x0 + 4, 0.6, STREET_WIDTH + 0.6, colorMat(0xa49c8a), (RIVER.x0 + RIVER.x1) / 2, -0.6, bz));
    // plano 2, bloco 13: a praça e a área pública viraram lugares (lotes com planta)
    // árvores, arbustos, postes e carros parados
    const rnd = seeded(1212);
    const merged = mergeByMaterial(parts);
    // chão e ruas sem sombra: o chão da cidade cobre a tela toda, e a sombra custa caro nele
    setShadows(merged, false, false);
    // desenhado depois do lote: onde o lote já cobriu, o chão da cidade nem é pintado
    merged.traverse((o) => (o.renderOrder = 2));
    this.stat.add(merged);
    // o que é miúdo vai em pedaços de 64 tiles: fora da tela, o pedaço nem é desenhado
    const chunks = new Map<string, THREE.Group>();
    for (const g of [this.streetFurniture(world, rnd), woods(world, rnd)]) {
      for (const child of [...g.children]) {
        const key = `${Math.floor(child.position.x / 64)},${Math.floor(child.position.z / 64)}`;
        let c = chunks.get(key);
        if (!c) chunks.set(key, (c = new THREE.Group()));
        c.add(child);
      }
    }
    for (const c of chunks.values()) {
      const m = mergeByMaterial(c);
      setShadows(m, false, false);
      this.stat.add(m);
    }
  }

  /** Postes nos corredores entre lotes, hidrantes, carros parados e árvores nos fundos. */
  private streetFurniture(world: World, rnd: () => number): THREE.Group {
    const g = new THREE.Group();
    const n = world.town!.city?.districts.length ?? 1;
    for (let d = 0; d < n; d++) {
      const o = districtOrigin(d);
      const z = streetZ(d);
      for (let c = 0; c <= 5; c++) {
        const x = o.x + c * LOT_PITCH - 1;
        g.add(streetLamp(x, z - 3.9 + 0.9));
        g.add(tree(x, o.z + 3 + rnd() * 6, 1 + rnd() * 0.3, rnd), tree(x, o.z + DISTRICT_DEPTH - 5 - rnd() * 6, 1 + rnd() * 0.3, rnd));
        g.add(bush(x, o.z + 12.5, 0.9), bush(x, o.z + DISTRICT_DEPTH - 12.5, 0.9));
        if (c % 2 === 1) g.add(hydrant(x + 0.6, z + 3.2));
      }
      const tones = [0x2f8a86, 0xc9382f, 0x2f4f86, 0xe8dcc0];
      g.add(car(o.x + 2 * LOT_PITCH + 13, z + 1.7, tones[d % 4]), car(o.x + 4 * LOT_PITCH + 4, z + 1.7, tones[(d + 2) % 4]));
    }
    // postes na avenida da ponte
    for (let x = 110; x < 200; x += 14) g.add(streetLamp(x, streetZ(1) - 3));
    return g;
  }

  /** Cada lote: versão simples (sempre) e lugar para a detalhada. */
  private buildLots(world: World): void {
    for (const art of this.arts.values()) {
      this.clear(art.simple);
      if (art.detail) this.clear(art.detail);
    }
    this.clear(this.lotsRoot);
    this.arts.clear();
    for (const art of this.placeArts.values()) {
      this.clear(art.simple);
      if (art.detail) this.clear(art.detail);
    }
    this.placeArts.clear();
    const town = world.town!;
    for (const lot of town.lots) {
      if (lot.id === this.shown) continue;
      const home = storedHome(world, lot);
      const simple = placed(lotPlace(lot));
      simple.add(simpleHouse(home, lot, lotStatus(world, lot)));
      const merged = mergeByMaterial(simple);
      merged.position.copy(simple.position);
      merged.rotation.copy(simple.rotation);
      setShadows(merged, true, true);
      this.lotsRoot.add(merged);
      const [x0, z0, x1, z1] = lotRect(lot);
      this.arts.set(lot.id, { lot, simple: merged, detail: null, center: { x: (x0 + x1) / 2, z: (z0 + z1) / 2 } });
    }
    // plano 2, bloco 13: os lugares (o que está aberto no passeio é o lote do jogo)
    for (const def of this.places()) {
      if (def.id === this.shown) {
        // em volta do centro aberto ficam os sobrados e a torre
        if (def.id === 'centro') {
          const block = placed(centroPlace());
          block.add(downtownBlock());
          const m = mergeByMaterial(block);
          m.position.copy(block.position);
          setShadows(m, true, true);
          this.lotsRoot.add(m);
        }
        continue;
      }
      const simple = placed(placeSpot(def));
      if (def.id === 'centro') simple.add(downtownBlock(), centroSimple());
      else if (def.kind === 'venue') simple.add(venueSimple(this.venueHome(def.id), def, this.ctrl));
      else simple.add(civicBuilding(def));
      const merged = mergeByMaterial(simple);
      merged.position.copy(simple.position);
      merged.rotation.copy(simple.rotation);
      setShadows(merged, true, true);
      this.lotsRoot.add(merged);
      this.placeArts.set(def.id, { def, simple: merged, detail: null, center: placeCenter(def) });
    }
  }

  /** Troca a versão simples pela detalhada nos lotes perto da câmera (um por quadro). */
  private updateDetail(target: THREE.Vector3, viewHeight: number): void {
    const at = this.toCity(target.x, target.z);
    let budget = 1;
    const near = (c: Pt, r: number) => viewHeight < DETAIL_ZOOM && Math.hypot(c.x - at.x, c.z - at.z) < r;
    for (const art of this.arts.values()) {
      const want = near(art.center, DETAIL_RADIUS);
      if (want && !art.detail && budget > 0) {
        budget--;
        art.detail = this.detailLot(art.lot);
        this.lotsRoot.add(art.detail);
      } else if (art.detail && !near(art.center, DETAIL_RADIUS * 1.3)) {
        this.lotsRoot.remove(art.detail);
        this.clear(art.detail);
        art.detail = null;
      }
      art.simple.visible = !art.detail;
    }
    for (const c of this.placeArts.values()) {
      // prédio fechado não tem versão detalhada (a simples já tem fachada)
      if (c.def.kind !== 'venue') continue;
      const want = near(c.center, DETAIL_RADIUS + 10);
      if (want && !c.detail && budget > 0) {
        budget--;
        c.detail = this.detailVenue(c.def);
        this.lotsRoot.add(c.detail);
      } else if (c.detail && !near(c.center, (DETAIL_RADIUS + 10) * 1.3)) {
        this.lotsRoot.remove(c.detail);
        this.clear(c.detail);
        c.detail = null;
      }
      c.simple.visible = !c.detail;
    }
  }

  /** A casa de verdade do lote (paredes, pisos, telhado) e o que fica do lado de fora. */
  private detailLot(lot: Lot): THREE.Group {
    const world = this.ctrl.world;
    const home = storedHome(world, lot);
    const g = placed(lotPlace(lot));
    const w = home?.grid.w ?? LOT_W;
    const h = home?.grid.h ?? LOT_H;
    g.add(lotGround(w, h, home, this.ctrl), lotEdge(w, h, lot.col * 7 + lot.side));
    if (home) this.addHouse(g, home);
    setShadows(g, true, true);
    return g;
  }

  /** Um lugar aberto montado da planta (fora do passeio ninguém está lá). */
  private detailVenue(def: PlaceDef): THREE.Group {
    const g = placed(placeSpot(def));
    const home = this.venueHome(def.id);
    if (!home) return g;
    g.add(lotGround(home.grid.w, home.grid.h, home, this.ctrl));
    if (def.id === 'centro') g.add(downtownBlock());
    this.addHouse(g, home);
    setShadows(g, true, true);
    return g;
  }

  private addHouse(g: THREE.Group, home: LotHome): void {
    const catalog = this.ctrl.sim.catalog;
    const house = new House(home.grid, catalog.floors, catalog);
    const levels = home.grid.levels ?? 1;
    house.update('roof', 1, 1, levels - 1);
    g.add(house.group);
    for (const obj of home.objects) {
      const def = catalog.objects[obj.defId];
      if (!def || def.layer) continue;
      const at = sceneZ(home.grid, obj.y);
      if (at.level !== 0) continue;
      const floor = catalog.floors[home.grid.floor[obj.y * home.grid.w + obj.x]];
      if (!floor?.outdoor) continue;
      const { model, spec } = objectArt(def, obj.id, { parts: obj.parts, style: obj.style });
      const size = objectSize(def, obj.rot);
      model.group.position.set(obj.x + size.w / 2, at.base, at.z + size.h / 2);
      model.group.rotation.y = (spec.facing === 'E' ? Math.PI / 2 : 0) + obj.rot * (Math.PI / 2);
      g.add(model.group);
    }
  }

  // ---------- quem anda pela rua ----------

  private updateMovers(world: World, tick: number): void {
    const trip = world.trip;
    const key = trip ? `${trip.from}|${trip.mode}|${trip.goers.join(',')}` : '';
    if (key !== this.moverKey) {
      this.moverKey = key;
      this.clear(this.movers);
      this.moverModels = [];
      if (trip) {
        if (trip.mode === 'car' || trip.mode === 'taxi') {
          const c = car(0, 0, trip.mode === 'taxi' ? 0xe8b830 : 0x3d6fb0);
          if (trip.mode === 'taxi') c.add(box(0.7, 0.22, 0.4, colorMat(0xf4efdf, { emissive: 0xfff3c0, emissiveIntensity: 0.4 }), -0.25, 1.24, 0));
          const holder = new THREE.Group();
          // o carro do cenário anda de lado (comprimento em x): gira para olhar em z
          c.rotation.y = -Math.PI / 2;
          holder.add(c);
          this.moverModels.push(holder);
        } else {
          trip.goers.forEach((id, i) => this.moverModels.push(pawn(world, id, i, trip.mode === 'bike')));
        }
        this.movers.add(...this.moverModels);
        setShadows(this.movers, true, false);
      }
    }
    if (!trip) return;
    const st = tripState(trip, tick);
    const hidden = st.phase === 'there';
    const inCar = trip.mode === 'car' || trip.mode === 'taxi';
    // mão direita: o carro pela pista, quem anda pela calçada
    const side = inCar ? 1.3 : 3.1;
    const rx = -st.dz;
    const rz = st.dx;
    this.moverModels.forEach((m, i) => {
      m.visible = !hidden;
      const behind = inCar ? 0 : i * 0.9;
      m.position.set(st.x + rx * side - st.dx * behind, 0, st.z + rz * side - st.dz * behind);
      m.rotation.y = Math.atan2(st.dx, st.dz);
      // passo de quem anda (sobe e desce um pouco)
      if (!inCar) m.children[0].position.y = Math.abs(Math.sin(tick * 3 + i)) * 0.06;
    });
  }

  // ---------- mapa: mouse, molduras e etiquetas ----------

  /** Lote (da cidade) debaixo de um ponto local do chão; 0 = nenhum. */
  lotAt(local: THREE.Vector3): number {
    if (!this.on) return 0;
    const p = this.toCity(local.x, local.z);
    const lot = this.ctrl.world.town!.lots.find((l) => {
      const [x0, z0, x1, z1] = lotRect(l);
      return p.x >= x0 - 0.5 && p.x <= x1 + 0.5 && p.z >= z0 - 0.5 && p.z <= z1 + 0.5;
    });
    return lot?.id ?? 0;
  }

  private placeMark(mark: THREE.Group, lotId: number): void {
    const lot = lotId ? this.ctrl.world.town?.lots.find((l) => l.id === lotId) : undefined;
    mark.visible = !!lot;
    if (!lot) return;
    const [x0, z0, x1, z1] = lotRect(lot);
    mark.position.set((x0 + x1) / 2, 0.08, (z0 + z1) / 2);
    mark.scale.set(x1 - x0 + 1, 1, z1 - z0 + 1);
  }

  /** Etiquetas do mapa e ícones da família, já na tela (0..1). */
  marks(camera: THREE.Camera): MapMark[] {
    if (!this.on || this.viewHeight < LABEL_ZOOM) return [];
    const world = this.ctrl.world;
    const town = world.town!;
    this.root.updateMatrixWorld();
    const v = new THREE.Vector3();
    const screen = (x: number, z: number, y = 0): { x: number; y: number } | null => {
      v.set(x, y, z);
      this.root.localToWorld(v);
      v.project(camera);
      if (v.x < -1.1 || v.x > 1.1 || v.y < -1.1 || v.y > 1.1) return null;
      return { x: (v.x + 1) / 2, y: (1 - v.y) / 2 };
    };
    const out: MapMark[] = [];
    const add = (m: Omit<MapMark, 'x' | 'y'>, p: Pt, y = 0) => {
      const s = screen(p.x, p.z, y);
      if (s) out.push({ ...m, ...s });
    };
    const far = this.viewHeight > 110;
    (town.city?.districts ?? []).forEach((d, i) => {
      const o = districtOrigin(i);
      add({ key: `d${i}`, kind: 'district', text: d.name }, { x: o.x + (far ? 1 : 2.5) * LOT_PITCH, z: streetZ(i) + (far ? 0 : 1) }, far ? 6 : 1);
      if (!far) add({ key: `s${i}`, kind: 'street', text: d.street }, { x: o.x - 4, z: streetZ(i) }, 0.2);
    });
    add({ key: 'rio', kind: 'place', text: t('city.place.river') }, { x: (RIVER.x0 + RIVER.x1) / 2, z: far ? 20 : 30 }, 0.2);
    // plano 2, bloco 13: cada lugar tem a sua plaquinha (clicar abre o cartão do lugar)
    if (far) add({ key: 'publico', kind: 'district', text: t('city.place.public') }, { x: (PUBLIC_AREA.x0 + PUBLIC_AREA.x1) / 2, z: (PUBLIC_AREA.z0 + PUBLIC_AREA.z1) / 2 }, 6);
    for (const def of this.places()) {
      if (far && def.id !== 'centro' && def.id !== 'praca') continue;
      const c = placeCenter(def);
      add({ key: `p${def.id}`, kind: 'place', text: t(def.name), place: def.id, on: def.id === this.ctrl.townPlace }, def.id === 'centro' ? { x: c.x, z: def.rect.z - 4 } : c, def.kind === 'building' ? 9 : 5);
    }
    if (!far) add({ key: 'avenida', kind: 'street', text: t('city.street.bridge') }, { x: 180, z: streetZ(1) }, 0.2);
    // número e família de cada lote (no mapa de perto)
    if (this.ctrl.screen === 'town' && this.viewHeight < 140) {
      for (const lot of town.lots) {
        const [x0, z0, x1, z1] = lotRect(lot);
        const status = lotStatus(world, lot);
        const fam = familyById(world, lot.familyId);
        const text = `${lot.number} · ${status === 'forSale' ? t('town.forSale') : status === 'vacant' ? t('town.vacant') : (fam?.name ?? '')}`;
        add({ key: `l${lot.id}`, kind: 'lot', text, id: lot.id, on: lot.id === this.ctrl.townLot }, { x: (x0 + x1) / 2, z: lot.side === 0 ? z1 - 2 : z0 + 2 }, 5);
      }
    }
    // a família em jogo: onde está cada um
    for (const f of familyFolks(world)) {
      const p = this.folkPoint(world, f);
      if (!p) continue;
      const how = f.away?.trip && world.trip ? t(`travel.${world.trip.mode}`) : undefined;
      add({ key: `f${f.id}`, kind: 'folk', text: f.name.split(' ')[0], id: f.id, on: f.id === this.ctrl.selectedFolkId, how }, p, 2.2);
    }
    return out;
  }

  /** Onde está (na cidade) alguém da família: no lote mostrado, em casa durante o passeio ou na rua. */
  folkPoint(world: World, f: Folk): Pt | null {
    if (f.away?.trip && world.trip) {
      const st = tripState(world.trip, world.tick);
      return { x: st.x, z: st.z };
    }
    // plano 2, bloco 13: no trabalho ou na escola, o ícone fica no prédio
    if (f.away) {
      const id = buildingOf(world, this.ctrl.sim.catalog, f);
      const def = id ? this.places().find((p) => p.id === id) : undefined;
      return def ? placeCenter(def) : null;
    }
    const onShown = world.folks.includes(f);
    if (onShown) return this.toCity(f.x + 0.5, f.y + 0.5);
    const lot = activeLot(world);
    if (!lot) return null;
    const exit = world.outing?.home.exit ?? world.exit;
    const p = lotPlace(lot);
    return toCity(p, exit.x + 0.5, exit.y - 3);
  }

  /** Para quem segue a viagem com a câmera: ponto local de quem anda na rua agora. */
  tripLocal(tick: number): Pt | null {
    const trip = this.ctrl.world.trip;
    if (!trip || !this.on) return null;
    const st = tripState(trip, tick);
    if (st.phase === 'there') return null;
    return this.toLocal(st.x, st.z);
  }

  /** O lote da família em jogo, em coordenadas locais (para voltar a câmera para casa). */
  homeLocal(): Pt | null {
    const lot = activeLot(this.ctrl.world);
    if (!lot || !this.on) return null;
    const [x0, z0, x1, z1] = lotRect(lot);
    return this.toLocal((x0 + x1) / 2, (z0 + z1) / 2);
  }

  /** Centro da cidade em coordenadas locais (para a vista do mapa). */
  cityCenterLocal(): Pt {
    return this.toLocal(70, 80);
  }

  /** Limites do mapa (locais) para a câmera não fugir da cidade. */
  clampLocal(x: number, z: number): Pt {
    const c = this.toCity(x, z);
    const cx = Math.max(CITY_BOUNDS.x0 + 20, Math.min(CITY_BOUNDS.x1 - 20, c.x));
    const cz = Math.max(CITY_BOUNDS.z0 + 20, Math.min(CITY_BOUNDS.z1 - 20, c.z));
    return this.toLocal(cx, cz);
  }
}

// ---------- ajudantes de arte ----------

/** Casa guardada do lote (a do lote em jogo mora no World, ou em outing.home no passeio). */
function storedHome(world: World, lot: Lot): LotHome | null {
  const mine = activeLot(world);
  if (mine && lot.id === mine.id) {
    const out = world.outing;
    return out ? { grid: out.home.grid, objects: out.home.objects, exit: out.home.exit } : { grid: world.grid, objects: world.objects, exit: world.exit };
  }
  return lot.home;
}

/** Quem é da família em jogo, onde estiver (no lote, em casa durante o passeio). */
function familyFolks(world: World): Folk[] {
  return [...world.folks, ...(world.outing?.home.folks ?? [])].filter((f) => !f.visit);
}

/** Grupo posto onde o canto do lote cai na cidade (girado meia volta do lado de baixo da rua). */
function placed(p: Place): THREE.Group {
  const g = new THREE.Group();
  g.position.set(p.x, 0, p.z);
  if (p.flip) g.rotation.y = Math.PI;
  return g;
}

/** Casa simples: caixa das paredes de fora e telhado de quatro águas. */
function simpleHouse(home: LotHome | null, lot: Lot, status: string): THREE.Group {
  const g = new THREE.Group();
  if (!home) return g;
  const { grid } = home;
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const key of Object.keys(grid.edges)) {
    const kind = grid.edges[key];
    if (kind !== 'wall' && kind !== 'door' && kind !== 'window') continue;
    const [xs, ys] = key.split(',');
    const x = Number(xs);
    const y = Number(ys);
    if (y >= grid.h) continue;
    x0 = Math.min(x0, x);
    y0 = Math.min(y0, y);
    x1 = Math.max(x1, x);
    y1 = Math.max(y1, y);
  }
  if (x0 === Infinity || x1 - x0 < 1 || y1 - y0 < 1) {
    if (status === 'vacant') g.add(saleSign(LOT_W / 2 + 4, LOT_H - 1.5));
    return g;
  }
  const w = x1 - x0;
  const d = y1 - y0;
  const levels = grid.levels ?? 1;
  const tones = [0xe8dcc0, 0xd9c486, 0xcf9f8f, 0xa9c29a, 0xc9d7e0, 0xe3c7a0];
  const wall = colorMat(tones[(lot.id * 7 + (lot.district ?? 0)) % tones.length]);
  const hgt = 2.7 * levels;
  g.add(box(w, hgt, d, wall, x0 + w / 2, 0, y0 + d / 2));
  const roof = new THREE.Mesh(new THREE.ConeGeometry(1, 1.6, 4), texMat('roof'));
  roof.rotation.y = Math.PI / 4;
  roof.scale.set(w * 0.78, 1, d * 0.78);
  roof.position.set(x0 + w / 2, hgt + 0.8, y0 + d / 2);
  g.add(roof);
  // porta e duas janelas na frente (para a casa não ficar uma caixa cega de longe)
  const front = y0 + d + 0.03;
  g.add(box(0.9, 1.9, 0.06, colorMat(0x6b3a22), x0 + w / 2, 0, front));
  for (const k of [0.22, 0.78]) g.add(box(1.1, 0.9, 0.06, colorMat(0x2c3b4a), x0 + w * k, 1.1, front));
  if (status === 'forSale') g.add(saleSign(x0 + w + 1.5, LOT_H - 1.5));
  return g;
}

function saleSign(x: number, z: number): THREE.Group {
  const g = new THREE.Group();
  g.add(box(0.1, 1.2, 0.1, colorMat(0x8a6a48), x, 0, z), box(1.1, 0.6, 0.06, colorMat(0xc9382f), x, 1.0, z + 0.06), box(0.9, 0.14, 0.07, colorMat(0xf3efe2), x, 1.24, z + 0.07));
  return g;
}

/** O centro de longe: chão de pedra, chafariz e bancas. */
function centroSimple(): THREE.Group {
  const g = new THREE.Group();
  const { w, h } = CENTRO_SIZE;
  const paving = new THREE.Mesh(new THREE.PlaneGeometry(w, h), texMat('stone', { color: 0xe2d8c4 }));
  tileUV(paving, w / 2, h / 2);
  paving.rotation.x = -Math.PI / 2;
  paving.position.set(w / 2, 0.01, h / 2);
  g.add(paving);
  g.add(cyl(1.6, 1.8, 0.5, 16, colorMat(0xd8d0bd), w / 2, 0, h / 2 + 2), cyl(0.3, 0.3, 1.4, 8, colorMat(0xd8d0bd), w / 2, 0, h / 2 + 2));
  const tones = [0xc9382f, 0x2f8a86, 0xe8b830];
  for (let i = 0; i < 3; i++) g.add(box(5, 2.8, 4, colorMat(0xe8dcc0), 3.5 + i * 8, 0, 3.5), box(5.4, 0.2, 4.4, colorMat(tones[i]), 3.5 + i * 8, 2.8, 3.5));
  return g;
}

/** Sobrados e a torre da matriz em volta do largo (os mesmos do lote do centro). */
function downtownBlock(): THREE.Group {
  const g = new THREE.Group();
  const { w, h } = CENTRO_SIZE;
  const front = h + 1;
  g.add(
    belltower(w / 2, -6),
    sobrado(-4.5, 3, 7, 0, Math.PI / 2),
    sobrado(-4.5, 11, 7, 1, Math.PI / 2),
    sobrado(w + 4.5, 3, 7, 2, -Math.PI / 2),
    sobrado(w + 4.5, 11, 7, 3, -Math.PI / 2),
    sobrado(4, -4, 8, 4, 0),
    sobrado(w - 4, -4, 8, 5, 0),
  );
  void front;
  return g;
}

/** Chão da cidade: grama plana onde tem cidade e morros baixos em volta. */
function ground(): THREE.Mesh {
  // o chão vai bem além dos limites da câmera (de longe não aparece a borda)
  const W = CITY_BOUNDS.x1 - CITY_BOUNDS.x0 + 2 * GROUND_PAD;
  const D = CITY_BOUNDS.z1 - CITY_BOUNDS.z0 + 2 * GROUND_PAD;
  const geo = new THREE.PlaneGeometry(W, D, Math.round(W / 6), Math.round(D / 6));
  geo.rotateX(-Math.PI / 2);
  const pos = geo.getAttribute('position');
  const cx = (CITY_BOUNDS.x0 + CITY_BOUNDS.x1) / 2;
  const cz = (CITY_BOUNDS.z0 + CITY_BOUNDS.z1) / 2;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i) + cx;
    const z = pos.getZ(i) + cz;
    // quanto sai da área da cidade (0 dentro, cresce para fora)
    const out = Math.max(-75 - x, x - 212, -40 - z, z - 190, 0);
    // o rio corta os morros (um vale raso dos dois lados)
    const valley = Math.max(0, 1 - Math.max(0, Math.abs(x - (RIVER.x0 + RIVER.x1) / 2) - 8) / 30);
    const hill = out > 0 ? Math.min(1, out / 24) * (3 + 2.5 * Math.sin(x * 0.07) * Math.cos(z * 0.05) + 1.5 * Math.sin(z * 0.13 + x * 0.04)) : 0;
    pos.setY(i, Math.max(0, hill) * (1 - valley) - 0.04);
  }
  geo.computeVertexNormals();
  const uv = geo.getAttribute('uv');
  for (let i = 0; i < uv.count; i++) uv.setXY(i, uv.getX(i) * (W / 2), uv.getY(i) * (D / 2));
  // plano 2, bloco 13: material só do chão da cidade (ganha o buraco do lote mostrado)
  const m = new THREE.Mesh(geo, GROUND_MAT());
  m.position.set(cx, 0, cz);
  return m;
}

let groundMat: THREE.MeshPhongMaterial | null = null;
const GROUND_MAT = () => (groundMat ??= texMat('grass', { unique: true }));
const holePlanes = [new THREE.Plane(), new THREE.Plane(), new THREE.Plane(), new THREE.Plane()];

/**
 * Plano 2, bloco 13: o chão da cidade fica um pouco abaixo do lote e, por
 * cima de água (piscina, lago do parque), cobria a água. Um buraco do tamanho
 * do lote mostrado (planos de corte, só onde todos cortam) deixa a água
 * aparecer; o chão do próprio lote cobre o resto.
 */
export function punchGround(w: number, h: number): void {
  const mat = GROUND_MAT();
  holePlanes[0].set(new THREE.Vector3(-1, 0, 0), 0);
  holePlanes[1].set(new THREE.Vector3(1, 0, 0), -w);
  holePlanes[2].set(new THREE.Vector3(0, 0, -1), 0);
  holePlanes[3].set(new THREE.Vector3(0, 0, 1), -h);
  if (mat.clippingPlanes !== holePlanes) {
    mat.clippingPlanes = holePlanes;
    mat.clipIntersection = true;
    mat.needsUpdate = true;
  }
}

/** Pista, calçadas dos dois lados (com o vão dos cruzamentos) e faixa do meio. */
function streetArt(a: Pt, b: Pt, all: { a: Pt; b: Pt }[], index: number): THREE.Group {
  const g = new THREE.Group();
  const horiz = Math.abs(a.z - b.z) < 0.01;
  const lo = horiz ? Math.min(a.x, b.x) : Math.min(a.z, b.z);
  const hi = horiz ? Math.max(a.x, b.x) : Math.max(a.z, b.z);
  const at = horiz ? a.z : a.x;
  const half = STREET_WIDTH / 2;
  const yRoad = 0.012 + index * 0.0015;
  // a pista vai até o meio da rua cruzada (as pontas cobrem o cruzamento)
  const strip = (from: number, to: number, off0: number, off1: number, tex: string, y: number, rep: number) => {
    if (to - from < 0.05) return;
    const len = to - from;
    const wid = off1 - off0;
    const m = new THREE.Mesh(new THREE.PlaneGeometry(horiz ? len : wid, horiz ? wid : len), texMat(tex));
    tileUV(m, (horiz ? len : wid) * rep, (horiz ? wid : len) * rep);
    m.rotation.x = -Math.PI / 2;
    const mid = (from + to) / 2;
    const side = at + (off0 + off1) / 2;
    if (horiz) m.position.set(mid, y, side);
    else m.position.set(side, y, mid);
    g.add(m);
  };
  strip(lo - half, hi + half, -half + 1.4, half - 1.4, 'road', yRoad, 0.5);
  // calçadas: param nos cruzamentos com outras ruas
  const cuts: [number, number][] = [];
  for (const o of all) {
    const oh = Math.abs(o.a.z - o.b.z) < 0.01;
    if (oh === horiz) continue;
    const c = horiz ? o.a.x : o.a.z;
    const span = horiz ? [Math.min(o.a.z, o.b.z), Math.max(o.a.z, o.b.z)] : [Math.min(o.a.x, o.b.x), Math.max(o.a.x, o.b.x)];
    if (at < span[0] - half || at > span[1] + half || c < lo - half || c > hi + half) continue;
    cuts.push([c - half + 1.4, c + half - 1.4]);
  }
  for (const [o0, o1] of [
    [-half, -half + 1.4],
    [half - 1.4, half],
  ]) {
    // um lado da calçada: de ponta a ponta, menos os vãos dos cruzamentos que chegam por esse lado
    let start = lo - half;
    const sideCuts = cuts.filter(() => true).sort((p, q) => p[0] - q[0]);
    for (const [c0, c1] of sideCuts) {
      strip(start, Math.min(c0, hi + half), o0, o1, 'sidewalk', 0.02, 1);
      start = Math.max(start, c1);
    }
    strip(start, hi + half, o0, o1, 'sidewalk', 0.02, 1);
  }
  // faixa amarela tracejada no meio
  for (let p = lo + 1; p < hi - 1; p += 3) {
    if (cuts.some(([c0, c1]) => p > c0 - 1.4 && p < c1 + 1.4)) continue;
    g.add(horiz ? box(1.4, 0.005, 0.14, colorMat(0xd9cf8a), p, yRoad + 0.004, at) : box(0.14, 0.005, 1.4, colorMat(0xd9cf8a), at, yRoad + 0.004, p));
  }
  return g;
}

/**
 * Plano 2, bloco 13: um lugar aberto de longe. Água, caminhos e deck pintados
 * no chão, o prédio como caixa com telhado e uma faixa colorida na fachada.
 */
function venueSimple(home: LotHome | null, def: PlaceDef, ctrl: GameController): THREE.Group {
  const g = new THREE.Group();
  if (!home) return g;
  const floors = ctrl.sim.catalog.floors;
  const { grid } = home;
  const flat: Record<string, number> = { stonepath: 0xe2d8c4, deck: 0xb98a5a, pool: 0x6fb6d8, lake: 0x5d9fbf };
  for (let y = 0; y < grid.h; y++) {
    for (let x = 0; x < grid.w; x++) {
      const f = grid.floor[y * grid.w + x];
      const tone = flat[f] ?? (floors[f]?.outdoor ? undefined : 0xcfc6b4);
      if (tone === undefined) continue;
      const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), colorMat(tone));
      m.rotation.x = -Math.PI / 2;
      m.position.set(x + 0.5, 0.012, y + 0.5);
      g.add(m);
    }
  }
  const house = simpleHouse(home, { id: def.id.length * 7, district: 0 } as Lot, 'family');
  g.add(house);
  // faixa colorida em cima da porta (cor do lugar)
  const tones: Record<string, number> = { praca: 0x3f7a52, biblioteca: 0x7d55ad, academia: 0x2f8a86, mercado: 0xc9382f, loja: 0xe8b830, cinema: 0x8e1f1f, bar: 0xd27a2a, parque: 0x3f9455 };
  const box3 = new THREE.Box3().setFromObject(house);
  if (!box3.isEmpty()) g.add(box(Math.min(6, box3.max.x - box3.min.x), 0.5, 0.2, colorMat(tones[def.id] ?? 0x2f4f86), (box3.min.x + box3.max.x) / 2, 2.2, box3.max.z + 0.1));
  // praça e parque: árvores e o coreto de longe
  if (def.id === 'praca') {
    g.add(cyl(1.8, 1.9, 0.55, 8, colorMat(0xc9b896), 15, 0, 7), cyl(0.05, 2.0, 1.0, 8, colorMat(0x3f7a52), 15, 2.8, 7));
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      g.add(cyl(0.08, 0.08, 2.3, 6, colorMat(0xf3efe2), 15 + Math.cos(a) * 1.6, 0.55, 7 + Math.sin(a) * 1.6));
    }
  }
  if (def.id === 'praca' || def.id === 'parque') {
    const rnd = seeded(def.rect.w * 13);
    for (const o of home.objects) if (o.defId === 'ipe') g.add(tree(o.x + 0.5, o.y + 0.5, 1.1, rnd));
  }
  return g;
}

/**
 * Plano 2, bloco 13: prédio fechado (trabalho, escola, prefeitura, hospital,
 * delegacia). Caixa com andares, janelas em grade na fachada, porta e um
 * enfeite de cada um (a cruz do hospital, a cúpula da prefeitura, o relógio
 * da escola, o giroflex da delegacia). A frente fica em +z (o lote gira).
 */
function civicBuilding(def: PlaceDef): THREE.Group {
  const g = new THREE.Group();
  const { w, h } = def.rect;
  const floorsBy: Record<string, number> = { work: 6, school: 2, cityhall: 2, hospital: 4, police: 2 };
  const n = floorsBy[def.building ?? 'work'] ?? 2;
  const bw = w - 2;
  const bd = h - 4;
  const hgt = n * 3;
  const wall = colorMat(def.color ?? 0xe8dcc0);
  const cx = w / 2;
  const cz = 1 + bd / 2;
  // pátio de pedra na frente e um gramado em volta
  const paving = new THREE.Mesh(new THREE.PlaneGeometry(w, 3), texMat('stone', { color: 0xe2d8c4 }));
  tileUV(paving, w / 2, 1.5);
  paving.rotation.x = -Math.PI / 2;
  paving.position.set(cx, 0.012, h - 1.5);
  g.add(paving, box(bw, hgt, bd, wall, cx, 0, cz), box(bw + 0.4, 0.3, bd + 0.4, colorMat(0xd8d0bd), cx, hgt, cz));
  const glass = colorMat(0x2c3b4a, { gloss: 0.8 });
  const front = 1 + bd + 0.03;
  for (let f = 0; f < n; f++) {
    for (let x = 1.2; x < bw - 0.6; x += 1.8) g.add(box(1.0, 1.2, 0.06, glass, cx - bw / 2 + x + 0.2, f * 3 + 1.0, front));
  }
  g.add(box(2.0, 2.3, 0.08, colorMat(0x6b3a22), cx, 0, front + 0.02), box(3.2, 0.25, 1.2, colorMat(0xd8d0bd), cx, 2.4, front + 0.6));
  switch (def.building) {
    case 'hospital': {
      const red = colorMat(0xc9382f, { emissive: 0x6a1410, emissiveIntensity: 0.3 });
      g.add(box(0.6, 2.0, 0.1, red, cx, hgt - 2.6, front + 0.05), box(2.0, 0.6, 0.1, red, cx, hgt - 1.9, front + 0.05));
      break;
    }
    case 'cityhall': {
      for (let x = -2; x <= 2; x += 1.33) g.add(cyl(0.22, 0.25, 3.0, 10, colorMat(0xf3efe2), cx + x, 0, front + 1.0));
      g.add(box(5.4, 0.35, 1.6, colorMat(0xf3efe2), cx, 3.0, front + 0.6));
      const dome = new THREE.Mesh(new THREE.SphereGeometry(2.0, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), colorMat(0x3f7a52, { gloss: 0.5 }));
      dome.position.set(cx, hgt + 0.3, cz);
      g.add(dome, rod([cx, hgt + 2.3, cz], [cx, hgt + 3.5, cz], 0.04, colorMat(0x26282b)), box(0.7, 0.45, 0.02, colorMat(0x2f8a86), cx + 0.35, hgt + 3.2, cz));
      break;
    }
    case 'school': {
      g.add(cyl(0.7, 0.7, 0.1, 16, colorMat(0xf3efe2), cx, hgt - 1.2, front + 0.05).rotateX(Math.PI / 2));
      g.add(box(0.06, 0.5, 0.04, colorMat(0x26282b), cx, hgt - 1.25, front + 0.12), box(0.4, 0.06, 0.04, colorMat(0x26282b), cx + 0.18, hgt - 1.25, front + 0.12));
      // quadra no fundo
      g.add(box(bw * 0.6, 0.02, 2.2, colorMat(0x5d8f6e), cx, 0, 0.2));
      break;
    }
    case 'police': {
      g.add(box(1.6, 0.4, 0.1, colorMat(0x2f4f86), cx, 2.75, front + 0.7), cyl(0.18, 0.18, 0.3, 10, colorMat(0x4a8fe0, { emissive: 0x2050c0, emissiveIntensity: 0.8 }), cx + 1.5, hgt + 0.3, cz));
      g.add(box(4, 1.3, 2, colorMat(0x26282b), cx - bw / 2 + 2.5, 0, h - 1.4), box(4.1, 0.5, 2.05, colorMat(0xf3efe2), cx - bw / 2 + 2.5, 0.6, h - 1.4));
      break;
    }
    case 'work': {
      // torre de vidro: faixas de janela contínuas e a placa no alto
      g.add(box(bw * 0.6, 0.8, 0.1, colorMat(0x26282b), cx, hgt - 1.0, front + 0.06), box(bw * 0.55, 0.4, 0.12, colorMat(0xf2b632, { emissive: 0x7a5a10, emissiveIntensity: 0.4 }), cx, hgt - 0.8, front + 0.08));
      break;
    }
  }
  return g;
}

/** Mato: árvores e arbustos onde não há lote, rua, rio, praça nem centro. */
function woods(world: World, rnd: () => number): THREE.Group {
  const g = new THREE.Group();
  const town = world.town!;
  const blocked = (x: number, z: number, pad: number): boolean => {
    for (const l of town.lots) {
      const [x0, z0, x1, z1] = lotRect(l);
      if (x > x0 - pad && x < x1 + pad && z > z0 - pad && z < z1 + pad) return true;
    }
    for (const s of cityStreets(town)) {
      const horiz = Math.abs(s.a.z - s.b.z) < 0.01;
      const lo = horiz ? Math.min(s.a.x, s.b.x) : Math.min(s.a.z, s.b.z);
      const hi = horiz ? Math.max(s.a.x, s.b.x) : Math.max(s.a.z, s.b.z);
      const along = horiz ? x : z;
      const across = horiz ? Math.abs(z - s.a.z) : Math.abs(x - s.a.x);
      if (along > lo - 6 && along < hi + 6 && across < STREET_WIDTH / 2 + pad + 0.5) return true;
    }
    if (x > RIVER.x0 - pad - 1 && x < RIVER.x1 + pad + 1) return true;
    const inRect = (r: { x0: number; z0: number; x1: number; z1: number }, p: number) => x > r.x0 - p && x < r.x1 + p && z > r.z0 - p && z < r.z1 + p;
    if (inRect(SQUARE, pad + 2) || inRect(PUBLIC_AREA, pad + 1)) return true;
    if (inRect({ x0: CENTRO_AT.x - 9, z0: CENTRO_AT.z - 10, x1: CENTRO_AT.x + CENTRO_SIZE.w + 9, z1: 100 }, pad)) return true;
    return false;
  };
  let placedTrees = 0;
  for (let i = 0; i < 2600 && placedTrees < 230; i++) {
    const x = CITY_BOUNDS.x0 + 30 + rnd() * (CITY_BOUNDS.x1 - CITY_BOUNDS.x0 - 60);
    const z = CITY_BOUNDS.z0 + 30 + rnd() * (CITY_BOUNDS.z1 - CITY_BOUNDS.z0 - 60);
    if (blocked(x, z, 2)) continue;
    // mais denso perto do rio e nos fundos dos bairros
    const nearRiver = Math.abs(x - (RIVER.x0 + RIVER.x1) / 2) < 22;
    if (!nearRiver && rnd() < 0.35) continue;
    g.add(lowTree(x, z, 1 + rnd() * 0.5, rnd));
    placedTrees++;
  }
  return g;
}

/** Árvore do mato: a mesma silhueta das árvores do jogo, com menos faces (fica longe). */
function lowTree(x: number, z: number, s: number, rnd: () => number): THREE.Group {
  const g = new THREE.Group();
  const leaves = texMat('treeLeaves');
  g.add(cyl(0.11 * s, 0.2 * s, 1.4 * s, 5, texMat('bark')));
  for (const [dx, dy, dz, r] of [
    [0, 2.0, 0, 1.05],
    [0.45, 1.6, 0.2, 0.75],
    [-0.35, 2.5, -0.15, 0.7],
  ]) {
    const clump = new THREE.Mesh(new THREE.IcosahedronGeometry(r * s, 1), leaves);
    clump.position.set(dx * s, dy * s, dz * s);
    clump.rotation.set(rnd() * 6, rnd() * 6, 0);
    clump.scale.y = 0.85;
    tileUV(clump, 3, 3);
    g.add(clump);
  }
  g.position.set(x, 0, z);
  return g;
}

/** Grama do lote (com buraco onde há piscina cavada). */
function lotGround(w: number, h: number, home: LotHome | null, ctrl: GameController): THREE.Mesh {
  const floors = ctrl.sim.catalog.floors;
  const pos: number[] = [];
  const uv: number[] = [];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (home && floors[home.grid.floor[y * home.grid.w + x]]?.water) continue;
      const p = [
        [x, y],
        [x, y + 1],
        [x + 1, y + 1],
        [x + 1, y],
      ];
      for (const i of [0, 1, 2, 0, 2, 3]) {
        pos.push(p[i][0], 0, p[i][1]);
        uv.push(p[i][0] / 2, -p[i][1] / 2);
      }
    }
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, texMat('grass'));
  mesh.position.y = 0.003;
  mesh.receiveShadow = true;
  return mesh;
}

/** Cerca baixa de ripas no fundo e nas laterais do lote (só enfeite). */
function lotEdge(w: number, h: number, seed: number): THREE.Group {
  const g = new THREE.Group();
  const wood = colorMat(seed % 2 ? 0xe9e1cf : 0xd7c39f);
  const rail = (x0: number, z0: number, x1: number, z1: number) => {
    const len = Math.hypot(x1 - x0, z1 - z0);
    const r = box(len, 0.08, 0.06, wood, (x0 + x1) / 2, 0.55, (z0 + z1) / 2);
    r.rotation.y = -Math.atan2(z1 - z0, x1 - x0);
    g.add(r);
    for (let i = 0; i <= len; i += 1) {
      const k = i / len;
      g.add(box(0.08, 0.7, 0.08, wood, x0 + (x1 - x0) * k, 0.35, z0 + (z1 - z0) * k));
    }
  };
  rail(-0.3, -0.3, w + 0.3, -0.3);
  rail(-0.3, -0.3, -0.3, h);
  rail(w + 0.3, -0.3, w + 0.3, h);
  return g;
}

/** Bonequinho de quem anda pela rua (corpo, cabeça e, na bicicleta, as rodas). */
function pawn(world: World, id: number, i: number, bike: boolean): THREE.Group {
  const holder = new THREE.Group();
  const g = new THREE.Group();
  const f = world.folks.find((x) => x.id === id);
  const shirts = [0xc9382f, 0x2f8a86, 0x2f4f86, 0xe8b830, 0x8f5fa8];
  const small = f?.age === 'child';
  const s = small ? 0.7 : 1;
  const skin = SKIN[Math.min(3, Math.floor(((f?.look.skin ?? 10) / 40) * 4))] ?? SKIN[1];
  g.add(cyl(0.22 * s, 0.26 * s, 0.75 * s, 8, colorMat(0x3a3f55), 0, bike ? 0.55 : 0, 0));
  g.add(cyl(0.26 * s, 0.24 * s, 0.6 * s, 8, colorMat(shirts[(id + i) % shirts.length]), 0, (bike ? 0.55 : 0) + 0.75 * s, 0));
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.2 * s, 10, 8), colorMat(skin));
  head.position.y = (bike ? 0.55 : 0) + 1.55 * s;
  g.add(head);
  if (bike) {
    for (const z of [-0.55, 0.55]) {
      const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.05, 6, 14), colorMat(0x1b1b1e));
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(0, 0.34, z);
      g.add(wheel);
    }
    g.add(box(0.06, 0.06, 1.1, colorMat(0x2f8a86), 0, 0.5, 0));
  }
  holder.add(g);
  return holder;
}

/** Moldura chata no chão (escala 1 = um quadrado de 1x1), para marcar o lote. */
function frame(color: number, opacity: number): THREE.Group {
  const g = new THREE.Group();
  const mat = new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false });
  const th = 0.015;
  for (const [x, z, w, d] of [
    [0, -0.5, 1, th],
    [0, 0.5, 1, th],
    [-0.5, 0, th, 1],
    [0.5, 0, th, 1],
  ]) {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(x, 0, z);
    m.scale.set(w, d, 1);
    m.renderOrder = 4;
    g.add(m);
  }
  g.visible = false;
  return g;
}

/**
 * Junta as malhas do grupo por material (uma chamada de desenho por
 * material). Malhas com vários materiais (caixas com faces diferentes)
 * ficam como estão.
 */
function mergeByMaterial(root: THREE.Group): THREE.Group {
  root.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(root.matrixWorld).invert();
  const buckets = new Map<THREE.Material, THREE.BufferGeometry[]>();
  const keep: THREE.Mesh[] = [];
  root.traverse((o) => {
    if (!(o instanceof THREE.Mesh)) return;
    if (Array.isArray(o.material)) {
      keep.push(o);
      return;
    }
    let geo = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    const m = new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld);
    geo.applyMatrix4(m);
    for (const name of Object.keys(geo.attributes)) if (name !== 'position' && name !== 'normal' && name !== 'uv') geo.deleteAttribute(name);
    if (!geo.getAttribute('uv')) geo.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(geo.getAttribute('position').count * 2), 2));
    if (!geo.getAttribute('normal')) geo.computeVertexNormals();
    geo.morphAttributes = {};
    geo.clearGroups();
    const list = buckets.get(o.material) ?? [];
    list.push(geo);
    buckets.set(o.material, list);
    geo = null as unknown as THREE.BufferGeometry;
  });
  const out = new THREE.Group();
  for (const [mat, geos] of buckets) {
    const merged = mergeGeometries(geos, false);
    for (const g of geos) g.dispose();
    if (!merged) continue;
    out.add(new THREE.Mesh(merged, mat));
  }
  for (const m of keep) {
    const clone = new THREE.Mesh(m.geometry.clone(), m.material);
    clone.geometry.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, m.matrixWorld));
    out.add(clone);
  }
  return out;
}
