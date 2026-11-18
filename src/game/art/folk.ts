import * as THREE from 'three';
import { ball, box, colorMat, cyl, loft, rbox, rod, texMat } from './build';
import type { Ring } from './build';
import { PAL, SHIRT, SKIN, mix, shade } from './palette';
import { faceTextureName, getTexture } from './textures';
import type { Expression } from './textures';
import type { Age, HeldProp, Look, UniformDef, Wear } from '../../sim/types';

// Folk em 3D: um adulto de proporção realista (cerca de sete cabeças de
// altura), modelado com cascas suaves para tronco, braços e pernas, roupa e
// rosto pintados em textura e animação por juntas (sem esqueleto pesado).
// A emoção aparece na expressão do rosto e na postura do corpo.
// Trocar por um modelo definitivo depois é trocar só esta classe.

export type FolkAnim =
  | 'idle'
  | 'walk'
  | 'sit'
  | 'sleep'
  | 'collapsed'
  | 'dance'
  | 'reach'
  | 'phone'
  | 'read'
  | 'watch'
  | 'scrub'
  | 'talk'
  | 'listen'
  | 'laugh'
  | 'wave'
  | 'hug'
  | 'kiss'
  | 'argue'
  // bloco 6: recusa (cruza os braços e balança a cabeça) e comemoração (desejo cumprido)
  | 'refuse'
  | 'cheer'
  // bloco 11: bebê no colo (braços dobrados na frente, embalando)
  | 'cradle'
  // bloco 13: nadando (de peito, cabeça fora d'água) e o pulo do trampolim
  | 'swim'
  | 'dive'
  // bloco 14: pânico (braços sacudindo por cima da cabeça), apagando fogo e o Seu Sereno de lanterna erguida
  | 'panic'
  | 'spray'
  | 'lantern';

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
  /** expressão forçada (conversa), no lugar da que vem do humor */
  expr?: Expression;
  /** bloco 5: o que está na mão */
  hold?: HeldProp;
  /** bloco 6: energia (0..100); com pouca, cara de cansaço e cabeça pesada */
  energy?: number;
  /** bloco 10: aliança no dedo (noivo ou casado) */
  ring?: boolean;
}

export const FOLK_HEIGHT = 1.8;
/** bloco 11: tamanho da criança e do bebê em relação ao adulto */
export const CHILD_SCALE = 0.64;
export const BABY_SCALE = 0.4;
const HIPS_Y = 0.9;
const THIGH = 0.42;
const SHIN = 0.41;
const UPPER_ARM = 0.28;
const FOREARM = 0.24;

interface Pose {
  hipsY: number;
  lie: number;
  torsoX: number;
  torsoY: number;
  torsoZ: number;
  headX: number;
  headY: number;
  headZ: number;
  armLX: number;
  armRX: number;
  armLOut: number;
  armROut: number;
  elbowL: number;
  elbowR: number;
  legLX: number;
  legRX: number;
  legOut: number;
  kneeL: number;
  kneeR: number;
}

function rest(): Pose {
  return {
    hipsY: HIPS_Y,
    lie: 0,
    torsoX: 0,
    torsoY: 0,
    torsoZ: 0,
    headX: 0,
    headY: 0,
    headZ: 0,
    armLX: 0,
    armRX: 0,
    armLOut: 0.07,
    armROut: 0.07,
    elbowL: -0.12,
    elbowR: -0.12,
    legLX: 0,
    legRX: 0,
    legOut: 0.02,
    kneeL: 0,
    kneeR: 0,
  };
}

/** Pose-alvo de cada animação. Ângulos em radianos; frente do corpo = +z. */
function poseFor(anim: FolkAnim, t: number, mood: number, energy = 100): Pose {
  const p = rest();
  const breathe = Math.sin(t * 1.8);
  // bloco 6: cansado, a cabeça pesa e os braços caem
  const tired = Math.min(1, Math.max(0, (25 - energy) / 20));
  // postura: cabisbaixo quando o humor está ruim, peito aberto quando está ótimo
  const slump = Math.min(1, Math.max(0, (55 - mood) / 40));
  const perky = Math.min(1, Math.max(0, (mood - 70) / 30));
  p.torsoX = 0.02 * breathe + 0.2 * slump - 0.04 * perky;
  // a cabeça fica um pouco erguida para o rosto aparecer para a câmera alta
  p.headX = -0.12 + 0.24 * slump - 0.06 * perky + 0.16 * tired;
  p.torsoX += 0.08 * tired;

  switch (anim) {
    case 'walk': {
      const s = Math.sin(t * 9);
      const c = Math.cos(t * 9);
      const stride = 0.55 - 0.15 * slump;
      p.legLX = -stride * s;
      p.legRX = stride * s;
      p.kneeL = 0.12 + 0.8 * Math.max(0, c);
      p.kneeR = 0.12 + 0.8 * Math.max(0, -c);
      p.armLX = 0.45 * s;
      p.armRX = -0.45 * s;
      p.elbowL = -0.35;
      p.elbowR = -0.35;
      p.hipsY = HIPS_Y - 0.025 + 0.03 * Math.abs(c) + 0.015 * perky * Math.abs(s);
      p.torsoX += 0.06;
      p.torsoY = 0.09 * s;
      break;
    }
    case 'sit': {
      p.hipsY = 0.1;
      p.legLX = -1.5;
      p.legRX = -1.5;
      p.kneeL = 1.45;
      p.kneeR = 1.45;
      p.legOut = 0.06;
      p.torsoX += -0.18;
      p.armLX = -0.4;
      p.armRX = -0.4;
      p.elbowL = -0.85;
      p.elbowR = -0.85;
      p.headY = 0.12 * Math.sin(t * 0.7);
      break;
    }
    case 'sleep':
    case 'collapsed': {
      p.lie = 1;
      p.torsoX = 0;
      p.headX = 0;
      p.armLOut = anim === 'collapsed' ? 0.9 : 0.14;
      p.armROut = anim === 'collapsed' ? 0.6 : 0.14;
      p.legOut = anim === 'collapsed' ? 0.2 : 0.04;
      p.headZ = anim === 'collapsed' ? 0.4 : 0.1;
      p.elbowL = -0.1;
      p.elbowR = -0.1;
      break;
    }
    case 'dance': {
      const s = Math.sin(t * 8);
      p.hipsY = HIPS_Y - 0.03 + 0.04 * Math.abs(s);
      p.torsoY = 0.4 * Math.sin(t * 4);
      p.torsoZ = 0.1 * s;
      p.torsoX = 0;
      p.armLX = -2.4 + 0.4 * s;
      p.armRX = -2.4 - 0.4 * s;
      p.armLOut = 0.4;
      p.armROut = 0.4;
      p.elbowL = -0.6 - 0.3 * s;
      p.elbowR = -0.6 + 0.3 * s;
      p.legLX = -0.3 * Math.max(0, s);
      p.kneeL = 0.6 * Math.max(0, s);
      p.legRX = -0.3 * Math.max(0, -s);
      p.kneeR = 0.6 * Math.max(0, -s);
      p.headZ = 0.12 * Math.sin(t * 4);
      p.headX = -0.05;
      break;
    }
    case 'reach': {
      const s = Math.sin(t * 5);
      p.armLX = -1.15 + 0.12 * s;
      p.armRX = -1.05 - 0.12 * s;
      p.elbowL = -0.45;
      p.elbowR = -0.55;
      p.torsoX += 0.12;
      p.headX += 0.15;
      break;
    }
    case 'phone': {
      p.armRX = -0.55;
      p.armROut = 0.3;
      p.elbowR = -2.35;
      p.headZ = -0.14;
      p.headY = 0.1 * Math.sin(t * 1.3);
      p.headX += 0.06 * Math.sin(t * 3.1);
      p.armLX = -0.25 + 0.15 * Math.sin(t * 2.2);
      p.elbowL = -0.8 - 0.3 * Math.sin(t * 2.2);
      break;
    }
    case 'read': {
      p.armLX = -0.6;
      p.armRX = -0.6;
      p.armLOut = -0.12;
      p.armROut = -0.12;
      p.elbowL = -1.5;
      p.elbowR = -1.5;
      p.headX += 0.35;
      p.headY = 0.08 * Math.sin(t * 0.9);
      break;
    }
    case 'watch': {
      p.armLX = -0.3;
      p.armRX = -0.3;
      p.armLOut = -0.3;
      p.armROut = -0.3;
      p.elbowL = -1.7;
      p.elbowR = -1.6;
      p.headY = 0.1 * Math.sin(t * 0.8);
      p.torsoZ = 0.03 * Math.sin(t * 0.6);
      break;
    }
    case 'scrub': {
      const s = Math.sin(t * 6);
      p.armLX = -2.5 + 0.3 * s;
      p.armRX = -2.5 - 0.3 * s;
      p.armLOut = 0.15;
      p.armROut = 0.15;
      p.elbowL = -1.6 - 0.3 * s;
      p.elbowR = -1.6 + 0.3 * s;
      p.torsoY = 0.2 * Math.sin(t * 3);
      p.headX = -0.1;
      break;
    }
    case 'talk': {
      // fala gesticulando com a mão direita
      const s = Math.sin(t * 4);
      p.armRX = -0.55 + 0.25 * s;
      p.armROut = 0.18;
      p.elbowR = -1.25 + 0.35 * Math.sin(t * 3.1);
      p.armLX = -0.15;
      p.elbowL = -0.55 - 0.2 * Math.max(0, Math.sin(t * 2.3));
      p.headY = 0.1 * Math.sin(t * 1.7);
      p.headX += 0.05 * Math.sin(t * 5);
      p.torsoY = 0.05 * s;
      break;
    }
    case 'listen': {
      // braços cruzados, balança a cabeça concordando
      p.armLX = -0.35;
      p.armRX = -0.35;
      p.armLOut = -0.28;
      p.armROut = -0.28;
      p.elbowL = -1.65;
      p.elbowR = -1.55;
      p.headX += 0.09 * Math.max(0, Math.sin(t * 2.4));
      p.headZ = 0.06;
      break;
    }
    case 'laugh': {
      const k = Math.abs(Math.sin(t * 11));
      p.torsoX += 0.05 + 0.08 * k;
      p.headX = -0.28 + 0.1 * k;
      p.armLX = -0.45;
      p.armRX = -0.45;
      p.armLOut = -0.1;
      p.armROut = -0.1;
      p.elbowL = -1.25;
      p.elbowR = -1.25;
      p.hipsY = HIPS_Y - 0.015 * k;
      break;
    }
    case 'wave': {
      p.armRX = -2.7;
      p.armROut = 0.25 + 0.3 * Math.sin(t * 9);
      p.elbowR = -0.35;
      p.armLX = 0.05;
      p.headZ = 0.08;
      break;
    }
    case 'hug': {
      p.torsoX += 0.12;
      p.armLX = -1.35;
      p.armRX = -1.35;
      p.armLOut = -0.45;
      p.armROut = -0.45;
      p.elbowL = -0.75;
      p.elbowR = -0.75;
      p.headX += 0.12;
      p.headZ = 0.18;
      p.torsoZ = 0.03 * Math.sin(t * 1.5);
      break;
    }
    case 'cradle': {
      p.torsoX -= 0.06;
      p.armLX = -0.75;
      p.armRX = -0.55;
      p.armLOut = -0.2;
      p.armROut = -0.32;
      p.elbowL = -1.35;
      p.elbowR = -1.5;
      p.headX += 0.32;
      p.torsoY = 0.12 * Math.sin(t * 1.4);
      break;
    }
    case 'kiss': {
      p.torsoX += 0.2;
      p.headX += 0.14;
      p.headZ = 0.22;
      p.armLX = -0.85;
      p.armRX = -0.85;
      p.armLOut = -0.3;
      p.armROut = -0.3;
      p.elbowL = -0.65;
      p.elbowR = -0.65;
      break;
    }
    case 'argue': {
      // aponta o dedo com uma mão, a outra na cintura
      const s = Math.sin(t * 7);
      p.armRX = -1.2 + 0.4 * s;
      p.armROut = 0.1;
      p.elbowR = -0.35 + 0.25 * s;
      p.armLX = 0.25;
      p.armLOut = 0.55;
      p.elbowL = -1.7;
      p.torsoX += 0.1;
      p.headY = 0.12 * Math.sin(t * 5.3);
      p.headX += 0.06;
      break;
    }
    case 'refuse': {
      // braços cruzados na frente do peito e a cabeça dizendo que não
      p.armLX = -1.1;
      p.armRX = -1.1;
      p.armLOut = -0.5;
      p.armROut = -0.5;
      p.elbowL = -1.9;
      p.elbowR = -1.9;
      p.headY = 0.42 * Math.sin(t * 9);
      p.headX -= 0.05;
      p.torsoX -= 0.06;
      break;
    }
    case 'cheer': {
      // os dois braços para cima, num pulinho
      const hop = Math.max(0, Math.sin(t * 8));
      p.armLX = -2.8;
      p.armRX = -2.8;
      p.armLOut = 0.35 + 0.15 * hop;
      p.armROut = 0.35 + 0.15 * hop;
      p.elbowL = -0.2;
      p.elbowR = -0.2;
      p.hipsY = HIPS_Y + 0.05 * hop;
      p.headX = -0.25;
      break;
    }
    case 'swim': {
      // nado de peito: braços abrem e voltam na frente, pernas batem
      const s = Math.sin(t * 3.2);
      const c = Math.cos(t * 3.2);
      p.torsoX = 0.35;
      p.headX = -0.45;
      p.armLX = -1.5 + 0.25 * c;
      p.armRX = -1.5 + 0.25 * c;
      p.armLOut = 0.3 + 0.55 * Math.max(0, s);
      p.armROut = 0.3 + 0.55 * Math.max(0, s);
      p.elbowL = -0.3 - 0.5 * Math.max(0, -s);
      p.elbowR = -0.3 - 0.5 * Math.max(0, -s);
      p.legLX = 0.5 + 0.3 * s;
      p.legRX = 0.5 - 0.3 * s;
      p.kneeL = 0.6;
      p.kneeR = 0.6;
      p.legOut = 0.12;
      break;
    }
    case 'dive': {
      // na ponta da prancha: braços para cima, joelhos dobram e esticam
      const k = (t * 1.3) % 1;
      const crouch = k < 0.5 ? Math.sin(k * Math.PI * 2) : 0;
      p.armLX = -2.9;
      p.armRX = -2.9;
      p.armLOut = 0.12;
      p.armROut = 0.12;
      p.elbowL = -0.05;
      p.elbowR = -0.05;
      p.kneeL = 0.7 * Math.max(0, crouch);
      p.kneeR = 0.7 * Math.max(0, crouch);
      p.legLX = -0.35 * Math.max(0, crouch);
      p.legRX = -0.35 * Math.max(0, crouch);
      p.hipsY = HIPS_Y - 0.12 * Math.max(0, crouch);
      p.torsoX = 0.25 * Math.max(0, crouch);
      p.headX = -0.2;
      break;
    }
    case 'panic': {
      // braços sacudindo no alto, pulinhos sem sair do lugar, cabeça olhando para os lados
      const s = Math.sin(t * 14);
      const hop = Math.max(0, Math.sin(t * 7));
      p.armLX = -2.6 + 0.35 * s;
      p.armRX = -2.6 - 0.35 * s;
      p.armLOut = 0.5 + 0.25 * s;
      p.armROut = 0.5 - 0.25 * s;
      p.elbowL = -0.5 - 0.3 * Math.max(0, s);
      p.elbowR = -0.5 - 0.3 * Math.max(0, -s);
      p.hipsY = HIPS_Y + 0.04 * hop;
      p.headY = 0.5 * Math.sin(t * 5);
      p.headX = -0.3;
      break;
    }
    case 'spray': {
      // extintor apontado para a frente, com o corpo inclinado e um balanço curto
      const s = Math.sin(t * 6);
      p.armRX = -1.25 + 0.08 * s;
      p.armLX = -1.05 + 0.08 * s;
      p.armROut = -0.15;
      p.armLOut = -0.3;
      p.elbowR = -0.25;
      p.elbowL = -0.9;
      p.torsoX += 0.1;
      p.torsoY = 0.12 * s;
      p.legLX = -0.25;
      p.legRX = 0.2;
      break;
    }
    case 'lantern': {
      // lanterna erguida na direita, livro aberto na esquerda, de pé, sem pressa
      p.armRX = -1.7;
      p.armROut = 0.15;
      p.elbowR = -0.3;
      p.armLX = -0.7;
      p.elbowL = -1.2;
      p.armLOut = -0.2;
      p.headX = -0.05 + 0.05 * Math.sin(t * 0.6);
      p.torsoZ = 0.02 * Math.sin(t * 0.5);
      break;
    }
    default: {
      // parado: respira e troca o peso de perna de vez em quando
      p.torsoZ = 0.025 * Math.sin(t * 0.7);
      p.headY = 0.18 * Math.sin(t * 0.45) * (1 - slump);
      p.armLX = 0.03 * breathe;
      p.armRX = -0.03 * breathe;
    }
  }
  return p;
}

export class FolkModel {
  readonly group = new THREE.Group();
  private body = new THREE.Group();
  private hips = new THREE.Group();
  private torso = new THREE.Group();
  private head = new THREE.Group();
  private armL = new THREE.Group();
  private armR = new THREE.Group();
  private foreL = new THREE.Group();
  private foreR = new THREE.Group();
  private legL = new THREE.Group();
  private legR = new THREE.Group();
  private shinL = new THREE.Group();
  private shinR = new THREE.Group();
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
  private pose = rest();
  private placed = false;
  private blinkAt = 2;
  private clock = 0;

  constructor(
    private readonly look: FolkLook,
    readonly wear: Wear = 'day',
    uniform?: UniformDef,
    /** bloco 11: bebê (enrolado na manta) ou criança (menor, cabeça maior) */
    readonly age?: Age,
  ) {
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
    this.torso.position.y = 0.07;
    this.torso.add(
      widen(loft(
        [
          { y: 0, rx: 0.152, rz: 0.098 },
          { y: 0.1, rx: 0.153, rz: 0.1 },
          { y: 0.24, rx: 0.17, rz: 0.108 },
          { y: 0.36, rx: 0.183, rz: 0.11 },
          { y: 0.43, rx: 0.186, rz: 0.1 },
          { y: 0.475, rx: 0.15, rz: 0.086 },
          { y: 0.5, rx: 0.09, rz: 0.066 },
          { y: 0.518, rx: 0.056, rz: 0.054 },
        ],
        SIDES,
        shirtMat,
      )),
      cyl(0.044, 0.05, 0.09, 10, skin, 0, 0.5, 0),
    );
    // gola da camisa: duas abas abertas sobre o peito
    for (const sx of [-1, 1]) {
      if (kind) break; // só a camisa do dia tem gola de abas
      const flap = box(0.075, 0.016, 0.055, collar, sx * 0.043, 0.498, 0.052);
      flap.rotation.set(0.5, sx * 0.35, sx * -0.45);
      this.torso.add(flap);
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
    this.torso.add(this.book);
    // bloco 5: prato com comida, seguro na frente do corpo
    const china = colorMat(0xf4efdf, { gloss: 0.7 });
    this.plate.add(
      cyl(0.13, 0.1, 0.02, 14, china, 0, 0, 0),
      ball(0.07, 0.03, 0.06, colorMat(0xc9822f, { gloss: 0.3 }), -0.02, 0.02, 0, 8),
      ball(0.035, 0.025, 0.035, colorMat(0x3f9455), 0.05, 0.02, 0.02, 6),
    );
    this.plate.position.set(0, 0.12, 0.3 * (0.5 + k * 0.5));
    this.plate.visible = false;
    this.torso.add(this.plate);

    // cabeça: o rosto vai na textura; nariz, orelhas e cabelo são modelados
    this.faceMat = new THREE.MeshPhongMaterial({ map: null, specular: 0x1a1a1a, shininess: 14 });
    const skull = ball(0.1, 0.136, 0.11, this.faceMat, 0, 0.132, 0, 16);
    const skinSolid = colorMat(shade(skinColor, 0.9), { gloss: 0.12 });
    const cap = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 7, 0, Math.PI * 2, 0, Math.PI * 0.48), hairMat);
    cap.scale.set(0.105, 0.143, 0.117);
    cap.position.set(0, 0.132, -0.004);
    cap.rotation.x = -0.5;
    this.head.add(
      skull,
      cap,
      ball(0.016, 0.025, 0.022, skinSolid, 0, 0.104, 0.106, 8),
      ball(0.012, 0.03, 0.019, skinSolid, -0.098, 0.124, 0, 8),
      ball(0.012, 0.03, 0.019, skinSolid, 0.098, 0.124, 0, 8),
      // nuca
      ball(0.094, 0.082, 0.054, hairMat, 0, 0.108, -0.07, 10),
    );
    const style = look.style ?? look.hair % 2;
    if (style === 0) {
      // topete penteado para o lado
      const tuft = ball(0.08, 0.036, 0.052, hairMat, 0.012, 0.25, 0.06, 10);
      tuft.rotation.set(-0.35, 0.25, 0.12);
      this.head.add(tuft);
    } else if (style === 1 || style === 2) {
      // franja e volume dos lados
      this.head.add(ball(0.106, 0.052, 0.106, hairMat, 0, 0.236, 0, 10), ball(0.11, 0.095, 0.074, hairMat, 0, 0.138, -0.052, 10));
      if (style === 2) {
        // comprido: cai atrás até os ombros e emoldura o rosto
        this.head.add(
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
        this.head.add(lens);
        this.head.add(rod([sx * 0.06, 0.142, 0.09], [sx * 0.098, 0.142, 0.0], 0.004, rim, 4));
      }
      this.head.add(rod([-0.014, 0.142, 0.104], [0.014, 0.142, 0.104], 0.004, rim, 4));
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
    this.head.position.y = 0.56;
    this.torso.add(this.head);

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
      arm.position.set(sx * 0.196 * k, 0.42, 0);
      arm.add(widen(loft(upperArm, 10, longSleeve ? sleeve : skin)));
      if (kind !== 'swim') arm.add(widen(loft(sleeveRings, 10, sleeve)));
      fore.position.y = -UPPER_ARM;
      fore.add(
        widen(ball(0.04, 0.04, 0.042, longSleeve ? sleeve : skin, 0, 0, 0, 8)),
        widen(loft(forearm, 10, longSleeve ? sleeve : skin)),
        // mão: palma, dedos e polegar
        ball(0.03, 0.04, 0.02, skin, 0, -FOREARM - 0.03, 0.004, 8),
        ball(0.026, 0.03, 0.017, skin, 0, -FOREARM - 0.075, 0.012, 8),
        ball(0.011, 0.026, 0.012, skin, sx * -0.026, -FOREARM - 0.035, 0.018, 6),
      );
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
        fore.add(this.rag, this.cup, this.bag, this.bottle, this.extinguisher, this.lantern);
      } else {
        // bloco 10: aliança dourada no anelar da mão esquerda
        const band = new THREE.Mesh(new THREE.TorusGeometry(0.013, 0.005, 5, 10), colorMat(PAL.brass, { gloss: 1 }));
        band.position.set(0.012, -FOREARM - 0.08, 0.012);
        band.rotation.x = Math.PI / 2;
        this.ring.add(band);
        this.ring.visible = false;
        fore.add(this.ring);
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
      this.torso.add(arm);
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
      if (barefoot) {
        shin.add(rbox(0.09, 0.05, 0.22, 0.03, skin, 0, -SHIN - 0.06, 0.05));
      } else if (kind === 'pj' || kind === 'robe') {
        // chinelo
        shin.add(rbox(0.1, 0.04, 0.25, 0.02, shoe, 0, -SHIN - 0.065, 0.05), rbox(0.09, 0.05, 0.2, 0.03, skin, 0, -SHIN - 0.05, 0.04));
      } else {
        shin.add(
          // sapato: sola clara, cabedal escuro e cadarço
          rbox(0.104, 0.03, 0.27, 0.012, sole, 0, -SHIN - 0.07, 0.05),
          rbox(0.098, 0.07, 0.25, 0.034, shoe, 0, -SHIN - 0.05, 0.05),
        );
        if (kind !== 'suit') shin.add(box(0.045, 0.01, 0.07, lace, 0, -SHIN + 0.016, 0.085));
      }
      leg.add(shin);
      this.hips.add(leg);
    }
    this.hips.add(this.torso);
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
    this.setFace('neutral', false);
  }

  private setFace(expr: Expression, closed: boolean): void {
    const key = faceTextureName(this.look.skin, this.look.hair, expr, closed, this.look.face);
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

  update(f: FolkFrame): void {
    this.clock += f.dt;
    const k = 1 - Math.exp(-f.dt * 12);
    const target = poseFor(f.anim, f.time, f.mood, f.energy);
    const p = this.pose;
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

    this.body.rotation.x = (-Math.PI / 2) * p.lie;
    this.hips.position.y = p.hipsY;
    this.torso.rotation.set(p.torsoX, p.torsoY, p.torsoZ);
    this.head.rotation.set(p.headX, p.headY, p.headZ);
    this.armL.rotation.set(p.armLX, 0, -p.armLOut);
    this.armR.rotation.set(p.armRX, 0, p.armROut);
    this.foreL.rotation.x = p.elbowL;
    this.foreR.rotation.x = p.elbowR;
    this.legL.rotation.set(p.legLX, 0, -p.legOut);
    this.legR.rotation.set(p.legRX, 0, p.legOut);
    this.shinL.rotation.x = p.kneeL;
    this.shinR.rotation.x = p.kneeR;

    // bloco 5: o que está na mão vem da interação (ou da animação)
    const hold = f.hold ?? (f.anim === 'read' ? 'book' : f.anim === 'phone' ? 'phone' : f.anim === 'scrub' ? 'rag' : undefined);
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
    const lying = f.anim === 'sleep' || f.anim === 'collapsed';
    this.blob.visible = f.anim !== 'sleep' && f.anim !== 'sit';
    this.blob.scale.setScalar(f.anim === 'collapsed' ? 1.9 : 1);
    this.blob.position.z = f.anim === 'collapsed' ? -0.85 : 0;

    // expressão: humor + piscadas
    if (this.clock > this.blinkAt + 0.13) this.blinkAt = this.clock + 2 + Math.random() * 3;
    const blinking = this.clock > this.blinkAt;
    const tired = (f.energy ?? 100) < 22;
    const expr: Expression = f.expr ?? (tired ? 'tired' : f.mood >= 62 ? 'happy' : f.mood >= 40 ? 'neutral' : 'sad');
    this.setFace(lying ? 'neutral' : expr, lying || blinking);
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
