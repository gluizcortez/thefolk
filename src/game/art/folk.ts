import * as THREE from 'three';
import { ball, box, colorMat, cyl, loft, rbox, rod, texMat } from './build';
import type { Ring } from './build';
import { HAIR, PAL, SHIRT, SKIN, mix, shade } from './palette';
import { faceTextureName, getTexture } from './textures';
import type { Expression, FaceLook } from './textures';
import { PoseMixer, rest, variantOf } from './anims';
import type { FolkAnim, Pose } from './anims';
import type { Age, HeldProp, Look, UniformDef, Wear } from '../../sim/types';

// Folk em 3D: um adulto de proporção realista (cerca de sete cabeças de
// altura), modelado com cascas suaves, roupa e rosto pintados em textura e
// animação por juntas (sem esqueleto pesado). Plano 2, bloco 5: quadril que
// balança, tronco em duas partes (barriga e peito), pescoço, ombros que
// sobem, pulsos, mãos que abrem, fecham, seguram e apontam, tornozelos. As
// animações são dados (anims/), tocadas com mistura entre uma e outra; o
// rosto é feito de peças (formato da cabeça, olhos, sobrancelhas, nariz,
// boca, orelhas, barba, marcas) e expressões, com piscar, olhar para quem
// fala e a boca mexendo com a fala.

export type { FolkAnim } from './anims';

export type FolkLook = Look;

/** Bloco 5: largura do corpo (magro, médio, forte). */
const BODY_WIDTH = [0.88, 1, 1.14];

export interface FolkFrame {
  anim: FolkAnim;
  x: number;
  y: number;
  z: number;
  heading: number;
  /** humor 0..100, vira expressão e postura */
  mood: number;
  /** tempo de animação (segue a velocidade do jogo) */
  time: number;
  /** segundos reais desde o último quadro */
  dt: number;
  /** expressão forçada (conversa, reação), no lugar da que vem do humor */
  expr?: Expression;
  /** bloco 5: o que está na mão */
  hold?: HeldProp;
  /** bloco 6: energia (0..100); com pouca, cara de cansaço e cabeça pesada */
  energy?: number;
  /** bloco 10: aliança no dedo (noivo ou casado) */
  ring?: boolean;
  /** plano 2, bloco 4: sentado (as pernas dobram; o resto do corpo segue a animação) */
  seated?: boolean;
  /** plano 2, bloco 5: para onde olhar (posição no mundo de quem fala, da TV) */
  lookAt?: { x: number; z: number };
  /** plano 2, bloco 5: falando (a boca abre e fecha) */
  speaking?: boolean;
  /** plano 2, bloco 5: semente das variações do laço (o id do folk) */
  seed?: number;
}

export const FOLK_HEIGHT = 1.8;
/** bloco 11: tamanho da criança e do bebê em relação ao adulto */
export const CHILD_SCALE = 0.64;
export const BABY_SCALE = 0.4;
/** Bloco 17: jovem quase do tamanho de adulto; idoso um tico menor e de cabelo branco. */
export const TEEN_SCALE = 0.86;
export const ELDER_SCALE = 0.96;
/** índice do cinza em HAIR */
export const ELDER_HAIR = 4;
const THIGH = 0.42;
const SHIN = 0.41;
const UPPER_ARM = 0.28;
const FOREARM = 0.24;
/** onde o tronco se divide em barriga e peito */
const WAIST = 0.24;
const SHOULDER_Y = 0.42 - WAIST;
/** formato da cabeça: oval, redonda, comprida, quadrada (escala do crânio) */
const HEAD_SHAPES: [number, number, number][] = [
  [1, 1, 1],
  [1.06, 0.94, 1.04],
  [0.95, 1.07, 0.97],
  [1.04, 0.98, 1],
];

/** Peças do rosto que vão na textura, a partir da aparência e da idade. */
export function faceLookOf(look: Look, age?: Age): FaceLook {
  const grown = age !== 'baby' && age !== 'child';
  return {
    skin: look.skin,
    hair: look.hair,
    eyes: look.eyes ?? 0,
    eyeColor: look.eyeColor ?? 0,
    lashes: look.lashes ?? 0,
    brows: look.brows ?? 1,
    nose: look.nose ?? 1,
    mouth: look.mouth ?? 0,
    beard: grown && age !== 'teen' ? (look.beard ?? 0) : 0,
    marks: look.marks ?? (look.face === 1 ? 1 : 0),
    wrinkles: age === 'elder' ? 1 : 0,
  };
}

/** Expressão que vem do humor quando nada mais pede uma. */
export function moodExpression(mood: number, energy = 100): Expression {
  if (energy < 22) return 'tired';
  if (mood >= 62) return 'happy';
  if (mood >= 40) return 'neutral';
  return 'sad';
}

/** Boca falando: abre e fecha num ritmo de sílabas inventadas. */
export function mouthFrame(clock: number): 0 | 1 | 2 {
  const v = Math.sin(clock * 13) + Math.sin(clock * 7.3 + 1) * 0.8;
  return v > 0.9 ? 2 : v > -0.4 ? 1 : 0;
}

export class FolkModel {
  readonly group = new THREE.Group();
  private body = new THREE.Group();
  private hips = new THREE.Group();
  /** barriga (de baixo) e peito (de cima): o tronco dobra nos dois */
  private spine = new THREE.Group();
  private chest = new THREE.Group();
  private neck = new THREE.Group();
  private head = new THREE.Group();
  /** formato da cabeça: crânio, cabelo, nariz, orelhas e barba escalam juntos */
  private shape = new THREE.Group();
  private armL = new THREE.Group();
  private armR = new THREE.Group();
  private foreL = new THREE.Group();
  private foreR = new THREE.Group();
  private legL = new THREE.Group();
  private legR = new THREE.Group();
  private shinL = new THREE.Group();
  private shinR = new THREE.Group();
  private footL = new THREE.Group();
  private footR = new THREE.Group();
  /** mão: pulso, dedos (fecham juntos), indicador (aponta) e polegar */
  private handL = new THREE.Group();
  private handR = new THREE.Group();
  private fingersL = new THREE.Group();
  private fingersR = new THREE.Group();
  private indexL = new THREE.Group();
  private indexR = new THREE.Group();
  private thumbL = new THREE.Group();
  private thumbR = new THREE.Group();
  private blob: THREE.Mesh;
  private book = new THREE.Group();
  private handset = new THREE.Group();
  private plate = new THREE.Group();
  private rag = new THREE.Group();
  private cup = new THREE.Group();
  /** bloco 10: mala na mão de quem se muda e aliança no dedo */
  private bag = new THREE.Group();
  /** bloco 11: mamadeira na mão de quem alimenta o bebê */
  private bottle = new THREE.Group();
  /** bloco 14: extintor (morador e bombeiro) e a lanterna do Seu Sereno */
  private extinguisher = new THREE.Group();
  private lantern = new THREE.Group();
  private ring = new THREE.Group();
  private faceMat: THREE.MeshPhongMaterial;
  private faceKey = '';
  private faceLook: FaceLook;
  private pose: Pose = rest();
  private mixer = new PoseMixer();
  private placed = false;
  private blinkAt = 2;
  private clock = 0;
  /** giro da cabeça para quem fala (suavizado) */
  private lookYaw = 0;
  private wide = 1;

  constructor(
    look: FolkLook,
    readonly wear: Wear = 'day',
    uniform?: UniformDef,
    /** bloco 11: bebê (enrolado na manta) ou criança (menor, cabeça maior) */
    readonly age?: Age,
  ) {
    if (age === 'elder' && look.hair !== ELDER_HAIR) {
      look = { ...look, hair: ELDER_HAIR };
    }
    const skinColor = SKIN[look.skin % SKIN.length];
    const skin = texMat(`skin:${look.skin % SKIN.length}`, { gloss: 0.12 });
    // bloco 5: a roupa depende da ocasião
    // bloco 8: uniforme da carreira (sem uniforme, vai com a roupa do dia)
    const uni = wear === 'work' ? uniform : undefined;
    const kind = uni
      ? 'uni'
      : wear === 'formal'
        ? 'suit'
        : wear === 'sleep'
          ? 'pj'
          : wear === 'bath'
            ? 'robe'
            : wear === 'swim'
              ? 'swim'
              : null;
    const tone = wear === 'formal' ? look.formal : wear === 'sleep' ? look.sleepwear : wear === 'swim' ? look.swimwear : 0;
    const cloth = (part: string) =>
      uni ? texMat(`uni:${part}:${uni.style}:${uni.top}:${uni.bottom}:${uni.accent}`) : texMat(`${kind}:${part}:${tone}`);
    const shirtMat = kind ? cloth('torso') : texMat(`shirt:${look.shirt}`);
    const sleeve = kind && kind !== 'swim' ? cloth('sleeve') : kind === 'swim' ? skin : texMat(`sleeve:${look.shirt}`);
    const longSleeve = kind === 'suit' || kind === 'pj' || kind === 'robe' || (!!uni && uni.style !== 'shirt' && uni.style !== 'apron');
    const pants = kind === 'swim' ? skin : kind ? cloth('leg') : texMat(`pants:${look.pants}`);
    const shinMat = kind === 'robe' || kind === 'swim' ? skin : pants;
    const pelvis = kind ? cloth('hip') : texMat(`pelvis:${look.pants}`);
    const collar = colorMat(shade(SHIRT[look.shirt % SHIRT.length], 1.3));
    const hairMat = texMat(`hair:${look.hair}`, { gloss: 0.25 });
    const barefoot = kind === 'swim';
    const shoe = colorMat(
      kind === 'pj' || kind === 'robe' ? 0x7a5a8a : kind === 'suit' ? 0x15110e : uni?.style === 'track' ? 0xf4efdf : uni ? 0x2a1d14 : PAL.shoe,
      { gloss: kind === 'suit' ? 0.8 : 0.45 },
    );
    const sole = colorMat(0xd8d0bc);
    const lace = colorMat(0xf4efdf);
    const SIDES = 12;
    const k = BODY_WIDTH[look.body ?? 1] ?? 1;
    this.wide = k;
    this.faceLook = faceLookOf(look, age);
    const widen = <T extends THREE.Object3D>(o: T): T => {
      o.scale.x *= k;
      o.scale.z *= 0.5 + k * 0.5;
      return o;
    };

    // quadril, cinto e tronco
    this.hips.add(
      widen(
        loft(
          [
            { y: -0.13, rx: 0.06, rz: 0.07 },
            { y: -0.08, rx: 0.14, rz: 0.1 },
            { y: 0, rx: 0.165, rz: 0.108 },
            { y: 0.08, rx: 0.154, rz: 0.1 },
          ],
          SIDES,
          pelvis,
        ),
      ),
    );
    if (!kind || kind === 'suit' || (uni && uni.style !== 'overall' && uni.style !== 'track')) {
      // cinto e fivela só com calça de verdade
      this.hips.add(
        widen(
          loft(
            [
              { y: 0.045, rx: 0.159, rz: 0.104 },
              { y: 0.085, rx: 0.157, rz: 0.102 },
            ],
            SIDES,
            colorMat(0x2a1d14, { gloss: 0.3 }),
          ),
        ),
        box(0.04, 0.034, 0.012, colorMat(PAL.brass, { gloss: 0.8 }), 0, 0.048, 0.1 * (0.5 + k * 0.5)),
      );
    }
    // tronco em duas cascas que dividem a mesma textura da camisa
    const TOP = 0.518;
    this.spine.position.y = 0.07;
    this.spine.add(
      widen(
        loft(
          [
            { y: 0, rx: 0.152, rz: 0.098 },
            { y: 0.1, rx: 0.153, rz: 0.1 },
            { y: 0.18, rx: 0.16, rz: 0.104 },
            { y: WAIST, rx: 0.17, rz: 0.108 },
          ],
          SIDES,
          shirtMat,
          [0, WAIST / TOP],
        ),
      ),
    );
    this.chest.position.y = WAIST;
    this.chest.add(
      widen(
        loft(
          [
            { y: -0.02, rx: 0.168, rz: 0.107 },
            { y: 0, rx: 0.17, rz: 0.108 },
            { y: 0.36 - WAIST, rx: 0.183, rz: 0.11 },
            { y: 0.43 - WAIST, rx: 0.186, rz: 0.1 },
            { y: 0.475 - WAIST, rx: 0.15, rz: 0.086 },
            { y: 0.5 - WAIST, rx: 0.09, rz: 0.066 },
            { y: TOP - WAIST, rx: 0.056, rz: 0.054 },
          ],
          SIDES,
          shirtMat,
          [(WAIST - 0.02) / TOP, 1],
        ),
      ),
    );
    this.neck.position.y = 0.5 - WAIST;
    this.neck.add(cyl(0.044, 0.05, 0.09, 10, skin, 0, 0, 0));
    this.chest.add(this.neck);
    this.spine.add(this.chest);
    // gola da camisa: duas abas abertas sobre o peito
    for (const sx of [-1, 1]) {
      if (kind) break; // só a camisa do dia tem gola de abas
      const flap = box(0.075, 0.016, 0.055, collar, sx * 0.043, 0.498 - WAIST, 0.052);
      flap.rotation.set(0.5, sx * 0.35, sx * -0.45);
      this.chest.add(flap);
    }
    // livro aberto, que só aparece durante a leitura
    const cover = colorMat(0x8a2f2a);
    const page = colorMat(0xf4efdf);
    for (const sx of [-1, 1]) {
      const half = new THREE.Group();
      half.add(box(0.13, 0.012, 0.19, cover, sx * 0.065, 0, 0), box(0.12, 0.012, 0.18, page, sx * 0.064, 0.01, 0));
      half.rotation.z = sx * 0.22;
      this.book.add(half);
    }
    this.book.position.set(0, 0.2, 0.33);
    this.book.rotation.x = 0.75;
    this.book.visible = false;
    this.spine.add(this.book);
    // bloco 5: prato com comida, seguro na frente do corpo
    const china = colorMat(0xf4efdf, { gloss: 0.7 });
    this.plate.add(
      cyl(0.13, 0.1, 0.02, 14, china, 0, 0, 0),
      ball(0.07, 0.03, 0.06, colorMat(0xc9822f, { gloss: 0.3 }), -0.02, 0.02, 0, 8),
      ball(0.035, 0.025, 0.035, colorMat(0x3f9455), 0.05, 0.02, 0.02, 6),
    );
    this.plate.position.set(0, 0.12, 0.3 * (0.5 + k * 0.5));
    this.plate.visible = false;
    this.spine.add(this.plate);

    // cabeça: o rosto vai na textura; nariz, orelhas e cabelo são modelados
    this.faceMat = new THREE.MeshPhongMaterial({ map: null, specular: 0x1a1a1a, shininess: 14 });
    const skull = ball(0.1, 0.136, 0.11, this.faceMat, 0, 0.132, 0, 20);
    const skinSolid = colorMat(shade(skinColor, 0.9), { gloss: 0.12 });
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 7, 0, Math.PI * 2, 0, Math.PI * 0.48), hairMat);
    cap.scale.set(0.105, 0.143, 0.117);
    cap.position.set(0, 0.132, -0.004);
    cap.rotation.x = -0.5;
    this.head.add(this.shape);
    this.shape.add(
      skull,
      cap,
      // nuca
      ball(0.094, 0.082, 0.054, hairMat, 0, 0.108, -0.07, 10),
    );
    this.addFeatures(look, skinSolid, age);
    const [hx, hy, hz] = HEAD_SHAPES[(look.headShape ?? 0) % HEAD_SHAPES.length];
    this.shape.scale.set(hx, hy, hz);
    this.shape.position.y = 0.132 * (1 - hy);
    const style = look.style ?? look.hair % 2;
    if (style === 0) {
      // topete penteado para o lado
      const tuft = ball(0.08, 0.036, 0.052, hairMat, 0.012, 0.25, 0.06, 10);
      tuft.rotation.set(-0.35, 0.25, 0.12);
      this.shape.add(tuft);
    } else if (style === 1 || style === 2) {
      // franja e volume dos lados
      this.head.add(ball(0.106, 0.052, 0.106, hairMat, 0, 0.236, 0, 10), ball(0.11, 0.095, 0.074, hairMat, 0, 0.138, -0.052, 10));
      if (style === 2) {
        // comprido: cai atrás até os ombros e emoldura o rosto
        this.shape.add(
          ball(0.118, 0.17, 0.07, hairMat, 0, 0.03, -0.07, 10),
          ball(0.03, 0.12, 0.05, hairMat, -0.1, 0.07, -0.01, 8),
          ball(0.03, 0.12, 0.05, hairMat, 0.1, 0.07, -0.01, 8),
        );
      }
    } else {
      // raspado: o cabelo fica rente
      cap.scale.set(0.102, 0.139, 0.112);
    }
    if (look.face === 2) {
      // óculos de aro escuro
      const rim = colorMat(0x1e1814, { gloss: 0.6 });
      for (const sx of [-1, 1]) {
        const lens = new THREE.Mesh(new THREE.TorusGeometry(0.024, 0.005, 5, 14), rim);
        lens.position.set(sx * 0.037, 0.14, 0.098);
        lens.rotation.y = sx * 0.25;
        this.shape.add(lens);
        this.shape.add(rod([sx * 0.06, 0.142, 0.09], [sx * 0.098, 0.142, 0.0], 0.004, rim, 4));
      }
      this.shape.add(rod([-0.014, 0.142, 0.104], [0.014, 0.142, 0.104], 0.004, rim, 4));
    }
    // fone do telefone, encostado na orelha durante a ligação
    const phoneRed = colorMat(PAL.phone, { gloss: 0.7 });
    this.handset.add(
      rod([0.112, 0.06, 0.05], [0.112, 0.19, 0.0], 0.016, phoneRed),
      ball(0.026, 0.026, 0.026, phoneRed, 0.106, 0.06, 0.052, 8),
      ball(0.026, 0.026, 0.026, phoneRed, 0.106, 0.19, 0.0, 8),
    );
    this.handset.visible = false;
    this.head.add(this.handset);
    if (uni?.hat) this.head.add(hatFor(uni));
    this.head.position.y = 0.06;
    this.neck.add(this.head);

    // braços: manga curta, antebraço e mão à mostra
    const upperArm: Ring[] = [
      { y: -UPPER_ARM, rx: 0.039, rz: 0.041 },
      { y: -0.14, rx: 0.046, rz: 0.05 },
      { y: 0, rx: 0.05, rz: 0.054 },
      { y: 0.03, rx: 0.04, rz: 0.044 },
    ];
    const sleeveRings: Ring[] = [
      { y: -0.15, rx: 0.051, rz: 0.055 },
      { y: -0.03, rx: 0.055, rz: 0.059 },
      { y: 0.03, rx: 0.05, rz: 0.054 },
      { y: 0.05, rx: 0.03, rz: 0.034 },
    ];
    const forearm: Ring[] = [
      { y: -FOREARM, rx: 0.027, rz: 0.03 },
      { y: -0.12, rx: 0.037, rz: 0.04 },
      { y: 0, rx: 0.039, rz: 0.042 },
    ];
    for (const [arm, fore, sx] of [
      [this.armL, this.foreL, -1],
      [this.armR, this.foreR, 1],
    ] as const) {
      arm.position.set(sx * 0.196 * k, SHOULDER_Y, 0);
      arm.add(widen(loft(upperArm, 10, longSleeve ? sleeve : skin)));
      if (kind !== 'swim') arm.add(widen(loft(sleeveRings, 10, sleeve)));
      fore.position.y = -UPPER_ARM;
      fore.add(
        widen(ball(0.04, 0.04, 0.042, longSleeve ? sleeve : skin, 0, 0, 0, 8)),
        widen(loft(forearm, 10, longSleeve ? sleeve : skin)),
      );
      // mão: palma no pulso, dedos que fecham juntos, indicador que aponta, polegar
      const hand = sx === 1 ? this.handR : this.handL;
      const fingers = sx === 1 ? this.fingersR : this.fingersL;
      const index = sx === 1 ? this.indexR : this.indexL;
      const thumb = sx === 1 ? this.thumbR : this.thumbL;
      hand.position.y = -FOREARM;
      hand.add(ball(0.03, 0.036, 0.019, skin, 0, -0.03, 0.004, 8));
      fingers.position.set(0, -0.058, 0.004);
      fingers.add(ball(0.019, 0.026, 0.015, skin, sx * 0.008, -0.022, 0.004, 7));
      index.position.set(sx * -0.016, -0.056, 0.006);
      index.add(ball(0.009, 0.028, 0.012, skin, 0, -0.024, 0, 6));
      thumb.position.set(sx * -0.022, -0.018, 0.014);
      thumb.add(ball(0.01, 0.024, 0.011, skin, 0, -0.016, 0.004, 6));
      thumb.rotation.z = sx * -0.3;
      hand.add(fingers, index, thumb);
      // o que vai na mão fica preso à mão (medidas a partir do cotovelo, como antes)
      const props = new THREE.Group();
      props.position.y = FOREARM;
      hand.add(props);
      fore.add(hand);
      if (sx === 1) {
        // bloco 5: pano de limpeza e xícara, na mão direita
        this.rag.add(rbox(0.1, 0.03, 0.12, 0.01, colorMat(0xe8b830), 0, -FOREARM - 0.08, 0.04));
        this.cup.add(
          cyl(0.03, 0.026, 0.07, 10, colorMat(0xf4efdf, { gloss: 0.7 }), 0, -FOREARM - 0.1, 0.05),
          cyl(0.026, 0.026, 0.005, 10, colorMat(0x5a3820), 0, -FOREARM - 0.032, 0.05),
        );
        this.rag.visible = false;
        this.cup.visible = false;
        // bloco 10: mala de mudança pendurada na mão direita
        const leather = colorMat(0x7a4222, { gloss: 0.35 });
        this.bag.add(
          rbox(0.08, 0.3, 0.42, 0.03, leather, 0, -FOREARM - 0.38, 0.02),
          rod([0, -FOREARM - 0.06, -0.04], [0, -FOREARM - 0.06, 0.08], 0.012, colorMat(0x3a2418), 6),
          box(0.085, 0.02, 0.43, colorMat(0x3a2418), 0, -FOREARM - 0.2, 0.02),
        );
        this.bag.visible = false;
        // bloco 11: mamadeira de bico para cima
        this.bottle.add(
          cyl(0.026, 0.026, 0.11, 10, colorMat(0xf4efdf, { gloss: 0.9 }), 0, -FOREARM - 0.14, 0.05),
          cyl(0.028, 0.028, 0.02, 10, colorMat(0x7ec8e3, { gloss: 0.6 }), 0, -FOREARM - 0.035, 0.05),
          ball(0.012, 0.022, 0.012, colorMat(0xd9a273, { gloss: 0.5 }), 0, -FOREARM - 0.005, 0.05, 6),
        );
        this.bottle.rotation.x = 0.6;
        this.bottle.visible = false;
        // bloco 14: extintor vermelho com mangueirinha preta; lanterna de vidro do Seu Sereno
        this.extinguisher.add(
          cyl(0.055, 0.055, 0.32, 10, colorMat(0xc8261e, { gloss: 0.8 }), 0, -FOREARM - 0.34, 0.07),
          ball(0.055, 0.03, 0.055, colorMat(0xc8261e, { gloss: 0.8 }), 0, -FOREARM - 0.02, 0.07, 10),
          cyl(0.02, 0.02, 0.05, 6, colorMat(0x2a2a2e, { gloss: 0.5 }), 0, -FOREARM + 0.02, 0.07),
          rod([0, -FOREARM + 0.02, 0.07], [0, -FOREARM - 0.08, 0.2], 0.012, colorMat(0x18181a), 6),
          box(0.12, 0.03, 0.02, colorMat(0xe9e4d6), 0, -FOREARM - 0.3, 0.125),
        );
        this.extinguisher.visible = false;
        const glass = colorMat(0xffe7a0, { emissive: 0xffc860, emissiveIntensity: 0.9 });
        this.lantern.add(
          rod([0, -FOREARM - 0.04, 0.05], [0, -FOREARM - 0.12, 0.05], 0.006, colorMat(0x2a2a30), 6),
          cyl(0.045, 0.045, 0.012, 8, colorMat(0x2a2a30, { gloss: 0.6 }), 0, -FOREARM - 0.13, 0.05),
          cyl(0.038, 0.038, 0.11, 8, glass, 0, -FOREARM - 0.25, 0.05),
          cyl(0.05, 0.05, 0.014, 8, colorMat(0x2a2a30, { gloss: 0.6 }), 0, -FOREARM - 0.26, 0.05),
        );
        this.lantern.visible = false;
        props.add(this.rag, this.cup, this.bag, this.bottle, this.extinguisher, this.lantern);
      } else {
        // bloco 10: aliança dourada no anelar da mão esquerda
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.013, 0.005, 5, 10), colorMat(PAL.brass, { gloss: 1 }));
        band.position.set(0.012, -FOREARM - 0.08, 0.012);
        band.rotation.x = Math.PI / 2;
        this.ring.add(band);
        this.ring.visible = false;
        props.add(this.ring);
      }
      if (sx === -1 && !longSleeve && kind !== 'swim') {
        // relógio de pulso
        fore.add(
          loft(
            [
              { y: -FOREARM + 0.012, rx: 0.031, rz: 0.034 },
              { y: -FOREARM + 0.034, rx: 0.032, rz: 0.035 },
            ],
            10,
            colorMat(0x2a1d14),
          ),
          cyl(0.017, 0.017, 0.008, 10, colorMat(PAL.brass, { gloss: 0.9 }), -0.033, -FOREARM + 0.019, 0),
        );
        fore.children[fore.children.length - 1].rotation.z = Math.PI / 2;
      }
      arm.add(fore);
      this.chest.add(arm);
    }

    // pernas e sapatos
    const thigh: Ring[] = [
      { y: -THIGH, rx: 0.058, rz: 0.062 },
      { y: -0.22, rx: 0.072, rz: 0.08 },
      { y: -0.05, rx: 0.084, rz: 0.092 },
      { y: 0.02, rx: 0.078, rz: 0.086 },
    ];
    const calf: Ring[] = [
      { y: -SHIN + 0.03, rx: 0.046, rz: 0.052 },
      { y: -0.28, rx: 0.054, rz: 0.062, z: -0.006 },
      { y: -0.12, rx: 0.06, rz: 0.066, z: -0.006 },
      { y: 0, rx: 0.057, rz: 0.061 },
    ];
    for (const [leg, shin, sx] of [
      [this.legL, this.shinL, -1],
      [this.legR, this.shinR, 1],
    ] as const) {
      leg.position.set(sx * 0.082 * k, 0, 0);
      leg.add(widen(loft(thigh, 10, pants)));
      if (kind === 'swim') {
        // bermuda de banho curta
        leg.add(
          widen(
            loft(
              [
                { y: -0.13, rx: 0.08, rz: 0.088 },
                { y: -0.05, rx: 0.087, rz: 0.095 },
                { y: 0.025, rx: 0.081, rz: 0.089 },
              ],
              10,
              pelvis,
            ),
          ),
        );
      }
      shin.position.y = -THIGH;
      shin.add(widen(ball(0.058, 0.058, 0.062, shinMat, 0, 0, 0, 8)), widen(loft(calf, 10, shinMat)));
      const foot = sx === 1 ? this.footR : this.footL;
      foot.position.y = -SHIN;
      // peças do pé medidas a partir do joelho, como antes
      const feet = new THREE.Group();
      feet.position.y = SHIN;
      foot.add(feet);
      shin.add(foot);
      if (barefoot) {
        feet.add(rbox(0.09, 0.05, 0.22, 0.03, skin, 0, -SHIN - 0.06, 0.05));
      } else if (kind === 'pj' || kind === 'robe') {
        // chinelo
        feet.add(rbox(0.1, 0.04, 0.25, 0.02, shoe, 0, -SHIN - 0.065, 0.05), rbox(0.09, 0.05, 0.2, 0.03, skin, 0, -SHIN - 0.05, 0.04));
      } else {
        feet.add(
          // sapato: sola clara, cabedal escuro e cadarço
          rbox(0.104, 0.03, 0.27, 0.012, sole, 0, -SHIN - 0.07, 0.05),
          rbox(0.098, 0.07, 0.25, 0.034, shoe, 0, -SHIN - 0.05, 0.05),
        );
        if (kind !== 'suit') feet.add(box(0.045, 0.01, 0.07, lace, 0, -SHIN + 0.016, 0.085));
      }
      leg.add(shin);
      this.hips.add(leg);
    }
    this.hips.add(this.spine);
    this.body.add(this.hips);

    // sombra "de bolinha" sob os pés, como nos jogos da época
    this.blob = new THREE.Mesh(
      new THREE.PlaneGeometry(0.8, 0.8),
      new THREE.MeshBasicMaterial({ map: getTexture('blob'), transparent: true, depthWrite: false }),
    );
    this.blob.rotation.x = -Math.PI / 2;
    this.blob.position.y = 0.03;
    this.blob.renderOrder = 1;

    this.group.add(this.body, this.blob);
    // bloco 11: criança é menor e de cabeça maior; bebê vem enrolado na manta
    if (age === 'child') {
      this.group.scale.setScalar(CHILD_SCALE);
      this.head.scale.setScalar(1.22);
    } else if (age === 'teen') {
      this.group.scale.setScalar(TEEN_SCALE);
      this.head.scale.setScalar(1.06);
    } else if (age === 'elder') {
      this.group.scale.setScalar(ELDER_SCALE);
    } else if (age === 'baby') {
      this.group.scale.setScalar(BABY_SCALE);
      this.head.scale.setScalar(1.6);
      this.legL.visible = false;
      this.legR.visible = false;
      const blanket = texMat('duvet', { color: mix(0xffffff, SHIRT[look.shirt % SHIRT.length], 0.45) });
      this.hips.add(ball(0.2, 0.5, 0.17, blanket, 0, -0.32, 0, 12), ball(0.21, 0.12, 0.18, blanket, 0, 0.12, 0, 12));
    }
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh && o !== this.blob) o.castShadow = true;
    });
    this.setFace({ expr: 'neutral', closed: false, talk: 0, gaze: 0 });
  }

  /** Plano 2, bloco 5: nariz, orelhas e barba modelados, conforme as peças do rosto. */
  private addFeatures(look: Look, skinSolid: THREE.Material, age?: Age): void {
    // nariz: pequeno, reto, largo, adunco
    switch ((look.nose ?? 1) % 4) {
      case 0:
        this.shape.add(ball(0.013, 0.02, 0.018, skinSolid, 0, 0.106, 0.104, 8));
        break;
      case 2:
        this.shape.add(ball(0.021, 0.022, 0.022, skinSolid, 0, 0.102, 0.105, 8), ball(0.012, 0.03, 0.012, skinSolid, 0, 0.122, 0.104, 6));
        break;
      case 3: {
        const bridge = ball(0.012, 0.032, 0.016, skinSolid, 0, 0.122, 0.108, 6);
        bridge.rotation.x = -0.35;
        this.shape.add(ball(0.016, 0.024, 0.022, skinSolid, 0, 0.1, 0.108, 8), bridge);
        break;
      }
      default:
        this.shape.add(ball(0.016, 0.025, 0.022, skinSolid, 0, 0.104, 0.106, 8));
    }
    // orelhas: pequenas, médias, de abano
    const ears = (look.ears ?? 1) % 3;
    for (const sx of [-1, 1]) {
      const ear = ears === 0 ? ball(0.01, 0.025, 0.016, skinSolid, sx * 0.097, 0.126, 0, 8) : ears === 2 ? ball(0.012, 0.035, 0.024, skinSolid, sx * 0.1, 0.124, -0.004, 8) : ball(0.012, 0.03, 0.019, skinSolid, sx * 0.098, 0.124, 0, 8);
      if (ears === 2) ear.rotation.y = sx * -0.55;
      this.shape.add(ear);
    }
    // barba com volume: cavanhaque no queixo, barba cheia no queixo e no maxilar
    const beard = this.faceLook.beard;
    const fuzz = colorMat(shade(HAIR[look.hair % HAIR.length], 0.92), { gloss: 0.05 });
    if (beard === 3) this.shape.add(ball(0.02, 0.02, 0.016, fuzz, 0, 0.006, 0.084, 8));
    if (beard === 4) {
      this.shape.add(ball(0.055, 0.028, 0.045, fuzz, 0, 0.004, 0.05, 10));
    }
    // cabeça quadrada: maxilar mais marcado
    if ((look.headShape ?? 0) % 4 === 3 && age !== 'baby') this.shape.add(rbox(0.15, 0.05, 0.1, 0.03, this.faceMat, 0, 0.045, 0.035));
  }

  private setFace(st: { expr: Expression; closed: boolean; talk: 0 | 1 | 2; gaze: -1 | 0 | 1 }): void {
    const key = faceTextureName(this.faceLook, st);
    if (key === this.faceKey) return;
    this.faceKey = key;
    this.faceMat.map = getTexture(key);
    this.faceMat.needsUpdate = true;
  }

  /** Posição do alto da cabeça no mundo (para o balão de pensamento). */
  headTop(out: THREE.Vector3): THREE.Vector3 {
    this.head.getWorldPosition(out);
    out.y += 0.38 * Math.max(0.55, this.group.scale.y);
    return out;
  }

  /** Animação que toca de fato: a pedida ou uma das suas variações. */
  private playing(f: FolkFrame): FolkAnim {
    if (f.anim === 'watch' && !f.seated) return 'watch';
    return variantOf(f.anim, f.seed ?? 0, f.time);
  }

  update(f: FolkFrame): void {
    this.clock += f.dt;
    const anim = this.playing(f);
    const target = this.mixer.target(anim, f.time, f.dt, { mood: f.mood, energy: f.energy, seated: f.seated });
    const p = this.pose;
    const k = 1 - Math.exp(-f.dt * 20);
    for (const key of Object.keys(p) as (keyof Pose)[]) p[key] += (target[key] - p[key]) * k;

    // posição e direção, com uma transição curta entre lugares
    if (!this.placed) {
      this.group.position.set(f.x, f.y, f.z);
      this.group.rotation.y = f.heading;
      this.placed = true;
    } else {
      const kp = 1 - Math.exp(-f.dt * 16);
      this.group.position.x += (f.x - this.group.position.x) * kp;
      this.group.position.y += (f.y - this.group.position.y) * kp;
      this.group.position.z += (f.z - this.group.position.z) * kp;
      let d = f.heading - this.group.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.group.rotation.y += d * (1 - Math.exp(-f.dt * 10));
    }

    // olhar para quem fala: a cabeça gira até um limite, os olhos completam
    const lying = f.anim === 'sleep' || f.anim === 'collapsed';
    let want = 0;
    if (f.lookAt && !lying) {
      const dx = f.lookAt.x - this.group.position.x;
      const dz = f.lookAt.z - this.group.position.z;
      if (dx * dx + dz * dz > 0.04) {
        want = Math.atan2(dx, dz) - this.group.rotation.y;
        want = Math.atan2(Math.sin(want), Math.cos(want));
      }
    }
    const turn = Math.max(-0.95, Math.min(0.95, want));
    this.lookYaw += (turn - this.lookYaw) * (1 - Math.exp(-f.dt * 6));

    this.body.rotation.x = (-Math.PI / 2) * p.lie;
    this.hips.position.set(p.hipsSway * this.wide, p.hipsY, 0);
    this.hips.rotation.set(0, p.hipsYaw, p.hipsRoll);
    this.spine.rotation.set(p.spineX, p.spineY, p.spineZ);
    this.chest.rotation.set(p.chestX, p.chestY, p.chestZ);
    this.neck.rotation.set(p.neckX, p.neckY + this.lookYaw * 0.35, 0);
    this.head.rotation.set(p.headX, p.headY + this.lookYaw * 0.65, p.headZ);
    this.armL.position.y = SHOULDER_Y + p.shoulderL;
    this.armR.position.y = SHOULDER_Y + p.shoulderR;
    this.armL.rotation.set(p.armLX, 0, -p.armLOut);
    this.armR.rotation.set(p.armRX, 0, p.armROut);
    this.foreL.rotation.x = p.elbowL;
    this.foreR.rotation.x = p.elbowR;
    this.legL.rotation.set(p.legLX, 0, -p.legLOut);
    this.legR.rotation.set(p.legRX, 0, p.legROut);
    this.shinL.rotation.x = p.kneeL;
    this.shinR.rotation.x = p.kneeR;
    this.footL.rotation.x = p.ankleL;
    this.footR.rotation.x = p.ankleR;

    // bloco 5: o que está na mão vem da interação (ou da animação)
    const family = f.anim.startsWith('g_') ? f.anim : f.anim.split('_')[0];
    const hold = f.hold ?? (family === 'read' ? 'book' : family === 'phone' ? 'phone' : family === 'scrub' ? 'rag' : family === 'eat' ? 'plate' : undefined);
    this.book.visible = hold === 'book';
    this.handset.visible = hold === 'phone';
    this.plate.visible = hold === 'plate';
    this.rag.visible = hold === 'rag';
    this.cup.visible = hold === 'cup';
    this.bag.visible = hold === 'suitcase';
    this.bottle.visible = hold === 'bottle';
    this.extinguisher.visible = hold === 'extinguisher';
    this.lantern.visible = hold === 'lantern' || f.anim === 'lantern';
    this.ring.visible = !!f.ring;

    // mãos: segurar algo fecha a mão em volta; o indicador aponta quando pedido
    const inRight = hold === 'cup' || hold === 'suitcase' || hold === 'bottle' || hold === 'extinguisher' || hold === 'lantern' || hold === 'rag' || hold === 'phone';
    const both = hold === 'book' || hold === 'plate';
    const gripR = inRight || both ? Math.max(p.gripR, 0.72) : p.gripR;
    const gripL = both ? Math.max(p.gripL, 0.72) : p.gripL;
    this.handL.rotation.x = p.wristL;
    this.handR.rotation.x = p.wristR;
    this.fingersL.rotation.x = -gripL * 1.55;
    this.fingersR.rotation.x = -gripR * 1.55;
    this.indexL.rotation.x = -gripL * 1.55 * (1 - p.pointL);
    this.indexR.rotation.x = -gripR * 1.55 * (1 - p.pointR);
    this.thumbL.rotation.x = -gripL * 0.7;
    this.thumbR.rotation.x = -gripR * 0.7;

    this.blob.visible = f.anim !== 'sleep' && f.anim !== 'sit' && !f.seated && f.anim !== 'perch';
    this.blob.scale.setScalar(f.anim === 'collapsed' ? 1.9 : 1);
    this.blob.position.z = f.anim === 'collapsed' ? -0.85 : 0;

    // rosto: expressão (pedida ou do humor), piscar, boca falando e olhar
    if (this.clock > this.blinkAt + 0.13) this.blinkAt = this.clock + 2 + Math.random() * 3;
    const blinking = this.clock > this.blinkAt;
    let expr: Expression = f.expr ?? moodExpression(f.mood, f.energy);
    let speaking = !!f.speaking;
    if (expr === 'talk') {
      expr = f.mood >= 62 ? 'happy' : 'neutral';
      speaking = true;
    }
    const residual = want - turn;
    const gaze: -1 | 0 | 1 = Math.abs(residual) > 0.15 || Math.abs(want - this.lookYaw) > 0.35 ? (want > 0 ? 1 : -1) : 0;
    this.setFace({
      expr: lying ? 'neutral' : expr,
      closed: lying || (blinking && expr !== 'laugh' && expr !== 'cry'),
      talk: speaking && !lying ? mouthFrame(this.clock) : 0,
      gaze: lying ? 0 : gaze,
    });
  }
}

/** Bloco 8: chapéu do uniforme, montado por cima do cabelo. */
function hatFor(uni: UniformDef): THREE.Group {
  const g = new THREE.Group();
  const main = colorMat(uni.hat === 'toque' ? 0xf8f6f0 : uni.hat === 'top' ? 0x1a1a1f : uni.accent, { gloss: 0.35 });
  const trim = colorMat(uni.hat === 'helmet' ? uni.accent : uni.top, { gloss: 0.5 });
  switch (uni.hat) {
    case 'cap': {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 6, 0, Math.PI * 2, 0, Math.PI * 0.5), main);
      dome.scale.set(0.112, 0.08, 0.122);
      dome.position.set(0, 0.215, 0);
      const brim = box(0.15, 0.012, 0.09, main, 0, 0.212, 0.1);
      g.add(dome, brim);
      break;
    }
    case 'toque':
      g.add(cyl(0.1, 0.1, 0.05, 14, trim, 0, 0.21, 0), cyl(0.13, 0.1, 0.13, 14, main, 0, 0.255, 0), ball(0.13, 0.05, 0.13, main, 0, 0.39, 0, 12));
      break;
    case 'helmet': {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 7, 0, Math.PI * 2, 0, Math.PI * 0.5), colorMat(uni.top === 0x2a2a33 ? 0x1f1f24 : uni.top, { gloss: 0.8 }));
      dome.scale.set(0.125, 0.1, 0.135);
      dome.position.set(0, 0.2, 0);
      const ridge = box(0.02, 0.03, 0.24, trim, 0, 0.29, 0);
      const brim = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.012, 16), colorMat(0x1f1f24, { gloss: 0.6 }));
      brim.position.set(0, 0.2, -0.01);
      brim.scale.z = 1.12;
      g.add(dome, ridge, brim);
      break;
    }
    case 'beret': {
      const top = ball(0.13, 0.04, 0.12, main, -0.02, 0.255, 0, 12);
      top.rotation.z = 0.18;
      g.add(top, ball(0.012, 0.018, 0.012, main, -0.03, 0.3, 0, 6));
      break;
    }
    case 'band':
      g.add(cyl(0.107, 0.107, 0.03, 16, main, 0, 0.19, 0, true));
      break;
    case 'top':
      g.add(cyl(0.16, 0.16, 0.012, 16, main, 0, 0.215, 0), cyl(0.085, 0.09, 0.17, 14, main, 0, 0.22, 0), cyl(0.091, 0.091, 0.03, 14, trim, 0, 0.23, 0, true));
      break;
  }
  return g;
}
