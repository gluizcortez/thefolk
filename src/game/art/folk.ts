import * as THREE from 'three';
import { box, colorMat, cyl, texMat } from './build';
import { HAIR, PAL, PANTS, SHIRT, SKIN, shade } from './palette';
import { faceTextureName, getTexture } from './textures';
import type { Expression } from './textures';

// Folk em 3D: um boneco low-poly articulado, com cabeça um pouco grande,
// rosto pintado em textura e animação por juntas (sem esqueleto pesado).
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
const HIPS_Y = 0.84;

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
    armLOut: 0.09,
    armROut: 0.09,
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
      p.hipsY = 0.09;
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
  private faceMat: THREE.MeshLambertMaterial;
  private faceKey = '';
  private pose = rest();
  private placed = false;
  private blinkAt = 2;
  private clock = 0;

  constructor(private readonly look: FolkLook) {
    const skin = colorMat(SKIN[look.skin % SKIN.length]);
    const hairColor = HAIR[look.hair % HAIR.length];
    const shirtColor = SHIRT[look.shirt % SHIRT.length];
    const pants = colorMat(PANTS[look.pants % PANTS.length]);
    const sleeve = colorMat(shade(shirtColor, 0.95));
    const shoe = colorMat(PAL.shoe);

    // quadril e tronco
    this.hips.add(box(0.3, 0.16, 0.19, pants, 0, -0.08, 0));
    this.torso.position.y = 0.06;
    const chest = cyl(0.2, 0.16, 0.44, 8, texMat(`shirt:${look.shirt}`), 0, 0, 0);
    chest.scale.z = 0.62;
    this.torso.add(chest, cyl(0.05, 0.058, 0.1, 6, skin, 0, 0.43, 0));

    // cabeça: esfera low-poly com o rosto na textura
    this.faceMat = new THREE.MeshLambertMaterial({ map: null });
    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.19, 10, 8, -Math.PI / 2), this.faceMat);
    skull.scale.set(1, 1.1, 1.02);
    const hairMat = colorMat(hairColor);
    // calota de cabelo inclinada para trás, deixando a testa e o rosto à mostra
    const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 5, 0, Math.PI * 2, 0, Math.PI * 0.42), hairMat);
    cap.scale.set(1.04, 1.12, 1.07);
    cap.rotation.x = -0.5;
    this.head.add(skull, cap);
    if (look.hair % 2 === 0) {
      // topete
      const tuft = new THREE.Mesh(new THREE.IcosahedronGeometry(0.09, 0), hairMat);
      tuft.scale.set(1.5, 0.6, 1);
      tuft.position.set(0.03, 0.17, 0.11);
      tuft.rotation.set(-0.4, 0.3, 0.1);
      this.head.add(tuft);
    } else {
      this.head.add(box(0.34, 0.24, 0.12, hairMat, 0, -0.2, -0.13));
    }
    const skinDark = colorMat(shade(SKIN[look.skin % SKIN.length], 0.92));
    this.head.add(
      box(0.04, 0.055, 0.045, skinDark, 0, -0.06, 0.178),
      box(0.03, 0.07, 0.05, skinDark, -0.19, -0.04, 0),
      box(0.03, 0.07, 0.05, skinDark, 0.19, -0.04, 0),
    );
    this.head.position.y = 0.7;
    this.torso.add(this.head);

    // braços: manga curta, antebraço e mão à mostra
    for (const [arm, fore, sx] of [
      [this.armL, this.foreL, -1],
      [this.armR, this.foreR, 1],
    ] as const) {
      arm.position.set(sx * 0.235, 0.4, 0);
      arm.add(cyl(0.06, 0.052, 0.27, 6, sleeve, 0, -0.27, 0));
      fore.position.y = -0.27;
      fore.add(cyl(0.047, 0.04, 0.25, 6, skin, 0, -0.25, 0), box(0.065, 0.09, 0.05, skin, 0, -0.33, 0));
      arm.add(fore);
      this.torso.add(arm);
    }

    // pernas
    for (const [leg, shin, sx] of [
      [this.legL, this.shinL, -1],
      [this.legR, this.shinR, 1],
    ] as const) {
      leg.position.set(sx * 0.085, -0.1, 0);
      leg.add(cyl(0.095, 0.078, 0.4, 6, pants, 0, -0.4, 0));
      shin.position.y = -0.4;
      shin.add(cyl(0.074, 0.06, 0.3, 6, pants, 0, -0.3, 0), box(0.1, 0.07, 0.24, shoe, 0, -0.34, 0.05));
      leg.add(shin);
      this.hips.add(leg);
    }
    this.hips.add(this.torso);
    this.body.add(this.hips);

    // sombra "de bolinha" sob os pés, como nos jogos da época
    this.blob = new THREE.Mesh(
      new THREE.PlaneGeometry(0.95, 0.95),
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

  /** Posição da cabeça no mundo (para o balão de pensamento). */
  headTop(out: THREE.Vector3): THREE.Vector3 {
    this.head.getWorldPosition(out);
    out.y += 0.34;
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
