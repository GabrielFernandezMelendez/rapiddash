import {
  AdditiveBlending,
  BoxGeometry,
  BufferGeometry,
  CylinderGeometry,
  Group,
  Material,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Scene,
  Sprite,
  SpriteMaterial,
  Texture,
  Vector3,
} from 'three';
import { canvasTexture, flat } from './track-mesh';

const BODY = 0xff5a36;
const CABIN = 0x1d2433;
const TYRE = 0x18181c;

/** Coche low-poly. El fantasma usa la misma forma con material translúcido. */
export function buildCar(ghost = false): Group {
  const g = new Group();
  const ghostMat = new MeshBasicMaterial({
    color: 0x8fd3ff,
    transparent: true,
    opacity: 0.32,
    depthWrite: false,
  });
  const mat = (color: number): Material => (ghost ? ghostMat : flat(color));
  const add = (geo: BufferGeometry, color: number, x: number, y: number, z: number) => {
    const mesh = new Mesh(geo, mat(color));
    mesh.position.set(x, y, z);
    g.add(mesh);
    return mesh;
  };

  add(new BoxGeometry(1.4, 0.45, 2.6), BODY, 0, 0.5, 0);
  add(new BoxGeometry(1.3, 0.25, 0.6), BODY, 0, 0.4, -1.5);
  add(new BoxGeometry(1.05, 0.42, 1.15), CABIN, 0, 0.94, 0.15);
  add(new BoxGeometry(1.5, 0.08, 0.35), CABIN, 0, 1.0, 1.25);
  for (const x of [-0.55, 0.55]) add(new BoxGeometry(0.08, 0.3, 0.12), CABIN, x, 0.82, 1.25);
  const wheel = new CylinderGeometry(0.3, 0.3, 0.26, 10);
  for (const [x, z] of [
    [-0.74, -0.85],
    [0.74, -0.85],
    [-0.74, 0.9],
    [0.74, 0.9],
  ]) {
    add(wheel, TYRE, x, 0.3, z).rotation.z = Math.PI / 2;
  }
  if (!ghost) {
    for (const x of [-0.4, 0.4]) add(new BoxGeometry(0.22, 0.16, 0.08), 0x2b2b30, x, 0.42, 1.32);
    const shadow = new Mesh(
      new PlaneGeometry(1.7, 3),
      new MeshBasicMaterial({
        color: 0x000000,
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
      }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.03;
    g.add(shadow);
  }
  return g;
}

const EXHAUST_X = [-0.4, 0.4];
const SPARK_COUNT = 70;
const SPARKS_PER_SECOND = 55;

interface Spark {
  sprite: Sprite;
  life: number;
  max: number;
  velocity: Vector3;
}

/**
 * Feedback de aceleración: resplandor en los escapes y chispas que salen hacia atrás.
 * Sin acelerar queda solo un piloto tenue.
 */
export class ExhaustFx {
  private readonly glowTexture: Texture;
  private readonly glows: Sprite[];
  private readonly sparks: Spark[] = [];
  private cursor = 0;
  private pending = 0;
  private readonly tmp = new Vector3();
  private readonly back = new Vector3();

  constructor(
    private readonly car: Group,
    scene: Scene,
  ) {
    this.glowTexture = canvasTexture(64, 64, (g) => {
      const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grad.addColorStop(0, 'rgba(255,255,230,1)');
      grad.addColorStop(0.3, 'rgba(255,190,80,0.9)');
      grad.addColorStop(0.65, 'rgba(255,110,40,0.35)');
      grad.addColorStop(1, 'rgba(255,80,20,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 64, 64);
    });
    this.glows = EXHAUST_X.map((x) => {
      const s = this.sprite();
      s.position.set(x, 0.45, 1.45);
      car.add(s);
      return s;
    });
    for (let i = 0; i < SPARK_COUNT; i++) {
      const sprite = this.sprite();
      sprite.visible = false;
      scene.add(sprite);
      this.sparks.push({ sprite, life: 0, max: 1, velocity: new Vector3() });
    }
  }

  update(dt: number, accelerating: boolean): void {
    const flicker = 0.85 + Math.random() * 0.3;
    for (const glow of this.glows) {
      const k = accelerating ? 1.1 * flicker : 0.28;
      glow.scale.set(k, k, 1);
      (glow.material as SpriteMaterial).opacity = accelerating ? 0.95 : 0.35;
    }

    if (accelerating) {
      this.pending += dt * SPARKS_PER_SECOND;
      while (this.pending > 1) {
        this.pending--;
        this.emit();
      }
    }

    for (const spark of this.sparks) {
      if (!spark.sprite.visible) continue;
      spark.life -= dt;
      if (spark.life <= 0) {
        spark.sprite.visible = false;
        continue;
      }
      const k = spark.life / spark.max;
      spark.sprite.position.addScaledVector(spark.velocity, dt);
      const size = 0.25 + (1 - k) * 0.7;
      spark.sprite.scale.set(size, size, 1);
      (spark.sprite.material as SpriteMaterial).opacity = k * 0.9;
    }
  }

  private emit(): void {
    const spark = this.sparks[this.cursor];
    this.cursor = (this.cursor + 1) % this.sparks.length;
    this.tmp.set(EXHAUST_X[Math.random() < 0.5 ? 0 : 1], 0.45, 1.5);
    this.car.localToWorld(this.tmp);
    // +Z local del coche apunta hacia atrás
    this.car.getWorldDirection(this.back);
    const speed = 3 + Math.random() * 3;
    spark.velocity.set(
      this.back.x * speed + (Math.random() - 0.5) * 1.2,
      0.4 + Math.random() * 1.2,
      this.back.z * speed + (Math.random() - 0.5) * 1.2,
    );
    spark.sprite.position.copy(this.tmp);
    spark.max = spark.life = 0.35 + Math.random() * 0.25;
    spark.sprite.visible = true;
  }

  private sprite(): Sprite {
    return new Sprite(
      new SpriteMaterial({
        map: this.glowTexture,
        blending: AdditiveBlending,
        depthWrite: false,
        transparent: true,
      }),
    );
  }
}

const SCRAPE_SPARK_COUNT = 60;
const SCRAPE_SPARKS_PER_SECOND = 70;

/** Chispas amarillas que salen del lado del coche que roza el muro. */
export class ScrapeFx {
  private readonly texture: Texture;
  private readonly sparks: Spark[] = [];
  private cursor = 0;
  private pending = 0;
  private readonly tmp = new Vector3();
  private readonly back = new Vector3();

  constructor(
    private readonly car: Group,
    scene: Scene,
  ) {
    this.texture = canvasTexture(32, 32, (g) => {
      const grad = g.createRadialGradient(16, 16, 0, 16, 16, 16);
      grad.addColorStop(0, 'rgba(255,255,240,1)');
      grad.addColorStop(0.4, 'rgba(255,220,90,0.9)');
      grad.addColorStop(1, 'rgba(255,160,40,0)');
      g.fillStyle = grad;
      g.fillRect(0, 0, 32, 32);
    });
    for (let i = 0; i < SCRAPE_SPARK_COUNT; i++) {
      const sprite = new Sprite(
        new SpriteMaterial({
          map: this.texture,
          blending: AdditiveBlending,
          depthWrite: false,
          transparent: true,
        }),
      );
      sprite.visible = false;
      scene.add(sprite);
      this.sparks.push({ sprite, life: 0, max: 1, velocity: new Vector3() });
    }
  }

  /** `side`: 1 roza a la derecha, -1 a la izquierda, 0 sin roce. */
  update(dt: number, side: -1 | 0 | 1, speed01: number): void {
    if (side !== 0) {
      this.pending += dt * SCRAPE_SPARKS_PER_SECOND * (0.4 + 0.6 * speed01);
      while (this.pending > 1) {
        this.pending--;
        this.emit(side);
      }
    }
    for (const spark of this.sparks) {
      if (!spark.sprite.visible) continue;
      spark.life -= dt;
      if (spark.life <= 0) {
        spark.sprite.visible = false;
        continue;
      }
      spark.velocity.y -= 9 * dt;
      spark.sprite.position.addScaledVector(spark.velocity, dt);
      const k = spark.life / spark.max;
      const size = 0.12 + k * 0.22;
      spark.sprite.scale.set(size, size, 1);
      (spark.sprite.material as SpriteMaterial).opacity = k;
    }
  }

  /** Ráfaga de chispas de un golpe puntual. */
  burst(side: 1 | -1, count: number): void {
    for (let i = 0; i < count; i++) this.emit(side);
  }

  private emit(side: 1 | -1): void {
    const spark = this.sparks[this.cursor];
    this.cursor = (this.cursor + 1) % this.sparks.length;
    // Punto de contacto: costado del coche, a lo largo de la carrocería
    this.tmp.set(side * 0.75, 0.35, (Math.random() - 0.3) * 2.2);
    this.car.localToWorld(this.tmp);
    this.car.getWorldDirection(this.back);
    const speed = 4 + Math.random() * 4;
    spark.velocity.set(
      this.back.x * speed + (Math.random() - 0.5) * 2,
      1.5 + Math.random() * 2.5,
      this.back.z * speed + (Math.random() - 0.5) * 2,
    );
    spark.sprite.position.copy(this.tmp);
    spark.max = spark.life = 0.25 + Math.random() * 0.25;
    spark.sprite.visible = true;
  }
}

/** Ajustes del "rebote" visual del coche en los cambios de carril. */
const BOUNCE = {
  /** El morro apunta hacia donde se mueve: radianes por m/s lateral (y máximo). */
  steer: 0.035,
  maxSteer: 0.28,
  /** La carrocería se inclina hacia fuera del movimiento y se balancea con un muelle flojo. */
  roll: 0.03,
  maxRoll: 0.2,
  rollStiffness: 260,
  rollDamping: 9,
  /** Saltito al empezar un cambio de carril (m/s hacia arriba) y gravedad del saltito. */
  hopSpeed: 2.2,
  hopGravity: 26,
  /** Al aterrizar rebota con esta fracción de la velocidad y se aplasta un poco. */
  hopRestitution: 0.35,
  squash: 0.03,
  squashStiffness: 320,
  squashDamping: 14,
  /** Velocidad lateral (m/s) a partir de la cual cuenta como cambio de carril. */
  startThreshold: 2.5,
} as const;

/**
 * Vida al coche en los cambios de carril, solo visual: el morro apunta hacia donde va, la
 * carrocería se inclina y se balancea, da un saltito y se aplasta al caer, como una pelota.
 * Se calcula a partir del movimiento lateral entre fotogramas.
 */
export class CarBounce {
  private lastLeg = -1;
  private lastLateral = 0;
  private velocity = 0;
  private moving = false;
  private roll = 0;
  private rollVelocity = 0;
  private hop = 0;
  private hopVelocity = 0;
  private squash = 0;
  private squashVelocity = 0;

  apply(obj: Group, dt: number, leg: number, lateral: number): void {
    if (dt <= 0) return;
    // Al cambiar de tramo el lateral cambia de referencia: no es movimiento real
    const raw = leg === this.lastLeg ? (lateral - this.lastLateral) / dt : 0;
    this.lastLeg = leg;
    this.lastLateral = lateral;
    this.velocity += (raw - this.velocity) * Math.min(1, dt * 20);
    const v = this.velocity;

    // Saltito al arrancar cada cambio de carril
    const moving = Math.abs(v) > BOUNCE.startThreshold;
    if (moving && !this.moving && this.hop <= 0.001) this.hopVelocity = BOUNCE.hopSpeed;
    this.moving = moving;
    this.hopVelocity -= BOUNCE.hopGravity * dt;
    this.hop += this.hopVelocity * dt;
    if (this.hop < 0) {
      // Aterriza: aplastamiento proporcional al golpe y un botecito más pequeño
      const impact = -this.hopVelocity;
      this.hop = 0;
      this.hopVelocity = impact > 0.6 ? impact * BOUNCE.hopRestitution : 0;
      this.squashVelocity += impact * BOUNCE.squash * 40;
    }

    // Muelles flojos para la inclinación y el aplastamiento: se pasan y oscilan un poco
    const clamp = (x: number, m: number) => Math.max(-m, Math.min(m, x));
    const rollTarget = clamp(v * BOUNCE.roll, BOUNCE.maxRoll);
    this.rollVelocity +=
      (BOUNCE.rollStiffness * (rollTarget - this.roll) - BOUNCE.rollDamping * this.rollVelocity) *
      dt;
    this.roll += this.rollVelocity * dt;
    this.squashVelocity +=
      (-BOUNCE.squashStiffness * this.squash - BOUNCE.squashDamping * this.squashVelocity) * dt;
    this.squash += this.squashVelocity * dt;

    obj.position.y = this.hop;
    obj.rotation.y -= clamp(v * BOUNCE.steer, BOUNCE.maxSteer);
    obj.rotation.z = this.roll;
    const s = clamp(this.squash, 0.18);
    obj.scale.set(1 + s * 0.5, 1 - s, 1 + s * 0.5);
  }
}
