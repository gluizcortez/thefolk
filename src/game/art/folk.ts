import * as THREE from 'three';
import { ball, box, colorMat, cyl, loft, rbox, rod, texMat } from './build';
import type { Ring } from './build';
import { PAL, SHIRT, SKIN, shade } from './palette';
import { faceTextureName, getTexture } from './textures';
import type { Expression } from './textures';

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
  | 'scrub';

export interface FolkLook {
  skin: number;
  hair: number;
  shirt: number;
  pants: number;
}

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
}

export const FOLK_HEIGHT = 1.8;
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
function poseFor(anim: FolkAnim, t: number, mood: number): Pose {
  const p = rest();
  const breathe = Math.sin(t * 1.8);
  // postura: cabisbaixo quando o humor está ruim, peito aberto quando está ótimo
  const slump = Math.min(1, Math.max(0, (55 - mood) / 40));
  const perky = Math.min(1, Math.max(0, (mood - 70) / 30));
  p.torsoX = 0.02 * breathe + 0.2 * slump - 0.04 * perky;
  // a cabeça fica um pouco erguida para o rosto aparecer para a câmera alta
  p.headX = -0.12 + 0.24 * slump - 0.06 * perky;

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
  private faceMat: THREE.MeshPhongMaterial;
  private faceKey = '';
  private pose = rest();
  private placed = false;
  private blinkAt = 2;
  private clock = 0;

  constructor(private readonly look: FolkLook) {
    const skinColor = SKIN[look.skin % SKIN.length];
    const skin = texMat(`skin:${look.skin % SKIN.length}`, { gloss: 0.12 });
    const shirtMat = texMat(`shirt:${look.shirt}`);
    const sleeve = texMat(`sleeve:${look.shirt}`);
    const pants = texMat(`pants:${look.pants}`);
    const pelvis = texMat(`pelvis:${look.pants}`);
    const collar = colorMat(shade(SHIRT[look.shirt % SHIRT.length], 1.3));
    const hairMat = texMat(`hair:${look.hair}`, { gloss: 0.25 });
    const shoe = colorMat(PAL.shoe, { gloss: 0.45 });
    const sole = colorMat(0xd8d0bc);
    const lace = colorMat(0xf4efdf);
    const SIDES = 12;

    // quadril, cinto e tronco
    this.hips.add(
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
      loft(
        [
          { y: 0.045, rx: 0.159, rz: 0.104 },
          { y: 0.085, rx: 0.157, rz: 0.102 },
        ],
        SIDES,
        colorMat(0x2a1d14, { gloss: 0.3 }),
      ),
      box(0.04, 0.034, 0.012, colorMat(PAL.brass, { gloss: 0.8 }), 0, 0.048, 0.1),
    );
    this.torso.position.y = 0.07;
    this.torso.add(
      loft(
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
      ),
      cyl(0.044, 0.05, 0.09, 10, skin, 0, 0.5, 0),
    );
    // gola da camisa: duas abas abertas sobre o peito
    for (const sx of [-1, 1]) {
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
    if (look.hair % 2 === 0) {
      // topete penteado para o lado
      const tuft = ball(0.08, 0.036, 0.052, hairMat, 0.012, 0.25, 0.06, 10);
      tuft.rotation.set(-0.35, 0.25, 0.12);
      this.head.add(tuft);
    } else {
      // franja e volume dos lados
      this.head.add(ball(0.106, 0.052, 0.106, hairMat, 0, 0.236, 0, 10), ball(0.11, 0.095, 0.074, hairMat, 0, 0.138, -0.052, 10));
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
      arm.position.set(sx * 0.196, 0.42, 0);
      arm.add(loft(upperArm, 10, skin), loft(sleeveRings, 10, sleeve));
      fore.position.y = -UPPER_ARM;
      fore.add(
        ball(0.04, 0.04, 0.042, skin, 0, 0, 0, 8),
        loft(forearm, 10, skin),
        // mão: palma, dedos e polegar
        ball(0.03, 0.04, 0.02, skin, 0, -FOREARM - 0.03, 0.004, 8),
        ball(0.026, 0.03, 0.017, skin, 0, -FOREARM - 0.075, 0.012, 8),
        ball(0.011, 0.026, 0.012, skin, sx * -0.026, -FOREARM - 0.035, 0.018, 6),
      );
      if (sx === -1) {
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
      leg.position.set(sx * 0.082, 0, 0);
      leg.add(loft(thigh, 10, pants));
      shin.position.y = -THIGH;
      shin.add(
        ball(0.058, 0.058, 0.062, pants, 0, 0, 0, 8),
        loft(calf, 10, pants),
        // sapato: sola clara, cabedal escuro e cadarço
        rbox(0.104, 0.03, 0.27, 0.012, sole, 0, -SHIN - 0.07, 0.05),
        rbox(0.098, 0.07, 0.25, 0.034, shoe, 0, -SHIN - 0.05, 0.05),
        box(0.045, 0.01, 0.07, lace, 0, -SHIN + 0.016, 0.085),
      );
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
    this.group.traverse((o) => {
      if (o instanceof THREE.Mesh && o !== this.blob) o.castShadow = true;
    });
    this.setFace('neutral', false);
  }

  private setFace(expr: Expression, closed: boolean): void {
    const key = faceTextureName(this.look.skin, this.look.hair, expr, closed);
    if (key === this.faceKey) return;
    this.faceKey = key;
    this.faceMat.map = getTexture(key);
    this.faceMat.needsUpdate = true;
  }

  /** Posição do alto da cabeça no mundo (para o balão de pensamento). */
  headTop(out: THREE.Vector3): THREE.Vector3 {
    this.head.getWorldPosition(out);
    out.y += 0.38;
    return out;
  }

  update(f: FolkFrame): void {
    this.clock += f.dt;
    const k = 1 - Math.exp(-f.dt * 12);
    const target = poseFor(f.anim, f.time, f.mood);
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

    this.book.visible = f.anim === 'read';
    this.handset.visible = f.anim === 'phone';
    const lying = f.anim === 'sleep' || f.anim === 'collapsed';
    this.blob.visible = f.anim !== 'sleep' && f.anim !== 'sit';
    this.blob.scale.setScalar(f.anim === 'collapsed' ? 1.9 : 1);
    this.blob.position.z = f.anim === 'collapsed' ? -0.85 : 0;

    // expressão: humor + piscadas
    if (this.clock > this.blinkAt + 0.13) this.blinkAt = this.clock + 2 + Math.random() * 3;
    const blinking = this.clock > this.blinkAt;
    const expr: Expression = f.mood >= 62 ? 'happy' : f.mood >= 40 ? 'neutral' : 'sad';
    this.setFace(lying ? 'neutral' : expr, lying || blinking);
  }
}
