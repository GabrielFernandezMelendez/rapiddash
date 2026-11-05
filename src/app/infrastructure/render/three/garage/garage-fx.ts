import {
  AdditiveBlending,
  Blending,
  BoxGeometry,
  BufferAttribute,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Group,
  Line,
  LineBasicMaterial,
  Mesh,
  MeshBasicMaterial,
  NormalBlending,
  Object3D,
  Sprite,
  SpriteMaterial,
  Texture,
  Vector3,
} from 'three';

/**
 * Efectos al acelerar del garaje (2-10; el 1 es el `ExhaustFx` de siempre, en `car-mesh.ts`).
 *
 * Todo vive en un grupo que sigue al coche (posición y giro): +Z es hacia atrás. Las partículas
 * se quedan atrás a la velocidad del coche, como si estuvieran quietas en el suelo; en el garaje,
 * donde el coche no avanza, esa velocidad se simula (sube al acelerar y baja al soltar).
 * Las cintas no dependen de la velocidad: ondean detrás del coche como una tela.
 */

/** Dónde salen los efectos: escapes, pilotos y techo, sacados del tamaño del coche. */
export interface FxAnchors {
  readonly rearZ: number;
  readonly halfWidth: number;
  readonly roofY: number;
  readonly exhaustY: number;
}

interface Particle {
  obj: Object3D;
  life: number;
  max: number;
  velocity: Vector3;
  /** Gravedad (m/s²); 0 si flota. */
  gravity: number;
  /** Cuánto le afecta la marcha: 1 se queda atrás con el suelo, 0 va con el coche. */
  drag: number;
  /** Rebote al tocar el suelo (0 = sin rebote). */
  bounce: number;
  spin: number;
  grow: number;
  baseScale: number;
  fade: (k: number) => number;
}

/** Marcha simulada del garaje (m/s) y velocidad que se toma como «a tope» en carrera. */
const TOP_SPEED = 14;
const RACE_TOP_SPEED = 60;
const RAMP = 10;

/** Textura de canvas reutilizable. */
function texture(size: number, draw: (g: CanvasRenderingContext2D, s: number) => void): Texture {
  const c = document.createElement('canvas');
  c.width = c.height = size;
  draw(c.getContext('2d')!, size);
  const t = new CanvasTexture(c);
  return t;
}

function radial(stops: readonly [number, string][]): Texture {
  return texture(64, (g, s) => {
    const grad = g.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    for (const [at, color] of stops) grad.addColorStop(at, color);
    g.fillStyle = grad;
    g.fillRect(0, 0, s, s);
  });
}

const EMOJIS = ['😄', '😎', '🤩', '😁', '🥳', '😜'];
const EMOJI_FONT = "'Apple Color Emoji', 'Segoe UI Emoji', 'Noto Color Emoji', sans-serif";

/**
 * Cinta de neón: una tira de triángulos que sale de un punto del coche y se estira hacia atrás.
 * Cada vértice ondea con el tiempo (más cuanto más lejos del coche) y se apaga hacia la punta,
 * como una tela flotando. `twist` gira la tela sobre sí misma; con `rigid` no ondea (muro de luz).
 */
class Ribbon {
  readonly mesh: Mesh;
  private readonly segments = 48;
  private readonly positions: Float32Array;
  private readonly colors: Float32Array;
  readonly color: Color;

  constructor(
    color: number,
    private readonly origin: Vector3,
    private readonly opts: {
      width: number;
      maxLength: number;
      /** Ángulo de la tela: 0 = horizontal, π/2 = vertical. */
      angle: number;
      wave: number;
      twist: number;
      phase: number;
      rigid?: boolean;
    },
  ) {
    this.color = new Color(color);
    const n = (this.segments + 1) * 2;
    this.positions = new Float32Array(n * 3);
    this.colors = new Float32Array(n * 3);
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new BufferAttribute(this.colors, 3));
    const index: number[] = [];
    for (let i = 0; i < this.segments; i++) {
      const a = i * 2;
      index.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
    }
    geo.setIndex(index);
    this.mesh = new Mesh(
      geo,
      new MeshBasicMaterial({
        vertexColors: true,
        blending: AdditiveBlending,
        transparent: true,
        depthWrite: false,
        side: DoubleSide,
        fog: false,
      }),
    );
    this.mesh.frustumCulled = false;
  }

  /** `stretch` 0-1: cuánto de la cinta está fuera (crece al acelerar y se recoge al soltar). */
  update(time: number, stretch: number): void {
    const { width, maxLength, angle, wave, twist, phase, rigid } = this.opts;
    const length = Math.max(0.01, maxLength * stretch);
    for (let i = 0; i <= this.segments; i++) {
      const t = i / this.segments;
      const z = this.origin.z + t * length;
      // Ondas que viajan hacia atrás, más amplias lejos del coche
      const amp = rigid ? 0 : wave * t * (0.4 + 0.6 * stretch);
      const s1 = Math.sin(time * 5.2 - t * 7 + phase);
      const s2 = Math.sin(time * 3.1 - t * 4.3 + phase * 1.7);
      const x = this.origin.x + amp * s2 * 0.8;
      const y = this.origin.y + amp * s1 * 0.6 + (rigid ? 0 : t * 0.25);
      const theta = angle + (rigid ? 0 : twist * t * Math.sin(time * 2.4 - t * 5 + phase));
      const w = (width * (1 - 0.55 * t)) / 2;
      const dx = Math.cos(theta) * w;
      const dy = Math.sin(theta) * w;
      const a = i * 6;
      this.positions.set([x - dx, y - dy, z, x + dx, y + dy, z], a);
      // Más brillo junto al coche; se apaga hacia la punta (con aditivo, oscuro = transparente)
      const k = Math.pow(1 - t, 1.4) * (0.35 + 0.65 * stretch);
      const r = this.color.r * k;
      const gC = this.color.g * k;
      const b = this.color.b * k;
      this.colors.set([r, gC, b, r, gC, b], a);
    }
    const geo = this.mesh.geometry;
    geo.attributes['position'].needsUpdate = true;
    geo.attributes['color'].needsUpdate = true;
    this.mesh.visible = stretch > 0.01;
  }
}

/** Rayo: una línea en zigzag que se rehace cada pocos fotogramas. */
class Bolt {
  readonly line: Line;
  private timer = 0;

  constructor(
    private readonly from: Vector3,
    color: number,
  ) {
    const geo = new BufferGeometry();
    geo.setAttribute('position', new BufferAttribute(new Float32Array(10 * 3), 3));
    this.line = new Line(
      geo,
      new LineBasicMaterial({ color, blending: AdditiveBlending, transparent: true, fog: false }),
    );
    this.line.frustumCulled = false;
  }

  update(dt: number, strength: number): void {
    this.line.visible = strength > 0.05 && Math.random() < 0.85;
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.04 + Math.random() * 0.05;
    const pos = this.line.geometry.attributes['position'] as BufferAttribute;
    const length = 1.2 + Math.random() * 2.6 * strength;
    // Baja hasta el suelo mientras se aleja hacia atrás
    for (let i = 0; i < 10; i++) {
      const t = i / 9;
      const jitter = i === 0 ? 0 : 0.32;
      pos.setXYZ(
        i,
        this.from.x + (Math.random() - 0.5) * jitter * 2,
        Math.max(0.02, this.from.y * (1 - t) + (Math.random() - 0.5) * jitter),
        this.from.z + t * length,
      );
    }
    pos.needsUpdate = true;
  }
}

export class GarageFx {
  readonly group = new Group();
  private particles: Particle[] = [];
  private ribbons: Ribbon[] = [];
  private bolts: Bolt[] = [];
  private glows: Sprite[] = [];
  private type = 0;
  private speed = 0;
  private stretch = 0;
  private time = 0;
  private pending = 0;
  private readonly textures = new Map<string, Texture>();

  constructor(
    parent: Object3D,
    private readonly anchors: FxAnchors,
  ) {
    parent.add(this.group);
  }

  /** Quita todo al cambiar de coche o de efecto. */
  dispose(): void {
    this.clear();
    this.group.removeFromParent();
  }

  /** `speed` (m/s): la del coche en carrera; sin ella se simula (garaje). */
  update(dt: number, accelerating: boolean, type: number, speed?: number): void {
    if (type !== this.type) this.setType(type);
    this.time += dt;
    let power: number;
    if (speed === undefined) {
      // La marcha simulada: sube al acelerar y cae poco a poco al soltar, como en el juego
      const target = accelerating ? TOP_SPEED : 0;
      this.speed += (target - this.speed) * Math.min(1, dt * (accelerating ? 2.2 : 1.1));
      power = this.speed / TOP_SPEED;
    } else {
      this.speed = speed;
      power = Math.min(1, speed / RACE_TOP_SPEED);
    }
    this.stretch +=
      ((accelerating ? 1 : 0) - this.stretch) * Math.min(1, dt * (accelerating ? 2.5 : 1.6));

    for (const r of this.ribbons) r.update(this.time, this.stretch);
    for (const b of this.bolts) b.update(dt, accelerating ? power : 0);
    this.updateGlows(accelerating, power);

    if (accelerating) {
      this.pending += dt * RAMP * this.rate();
      while (this.pending > 1) {
        this.pending--;
        this.emit();
      }
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.group.remove(p.obj);
        this.particles.splice(i, 1);
        continue;
      }
      const k = p.life / p.max;
      p.velocity.y -= p.gravity * dt;
      p.obj.position.addScaledVector(p.velocity, dt);
      // El suelo se va hacia atrás con la marcha
      p.obj.position.z += this.speed * p.drag * dt;
      if (p.bounce > 0 && p.obj.position.y < 0.03) {
        p.obj.position.y = 0.03;
        p.velocity.y = Math.abs(p.velocity.y) * p.bounce;
        p.velocity.x *= 0.7;
      }
      const scale = p.baseScale * (1 + p.grow * (1 - k));
      p.obj.scale.set(scale, scale, scale);
      p.obj.rotation.z += p.spin * dt;
      const material = (p.obj as Mesh | Sprite).material as MeshBasicMaterial | SpriteMaterial;
      material.opacity = p.fade(k);
    }
  }

  // ---------------------------------------------------------------------------

  private setType(type: number): void {
    this.clear();
    this.type = type;
    const { rearZ, halfWidth, roofY, exhaustY } = this.anchors;
    const tailX = halfWidth * 0.72;
    switch (type) {
      case 1:
        this.exhaustGlows(['rgba(255,255,230,1)', 'rgba(255,190,80,0.9)', 'rgba(255,110,40,0.35)']);
        break;
      case 3:
        this.ribbons.push(
          new Ribbon(0x2de2e6, new Vector3(0, roofY - 0.05, rearZ - 0.2), {
            width: 0.9,
            maxLength: 7,
            angle: 0,
            wave: 0.9,
            twist: 1.1,
            phase: 0,
          }),
        );
        break;
      case 4:
        for (const [x, color, phase] of [
          [-tailX, 0xff4fd8, 0],
          [tailX, 0x2de2e6, 1.7],
        ] as const) {
          this.ribbons.push(
            // Algo tumbadas: la cámara de carrera va detrás y arriba, de canto no se verían
            new Ribbon(color, new Vector3(x, exhaustY + 0.15, rearZ), {
              width: 0.42,
              maxLength: 6,
              angle: x < 0 ? 0.35 : -0.35,
              wave: 0.55,
              twist: 0.9,
              phase,
            }),
          );
        }
        break;
      case 5: {
        // Franjas del sol synthwave una al lado de otra, tumbadas: desde la cámara de carrera
        // (detrás y arriba) se ve la bandera entera
        const stripes = [0xffd319, 0xff901f, 0xff2975, 0xf222ff, 0x8c1eff];
        stripes.forEach((color, i) => {
          this.ribbons.push(
            new Ribbon(color, new Vector3((i - 2) * 0.24, roofY - 0.15, rearZ - 0.1), {
              width: 0.25,
              maxLength: 6.5,
              angle: 0,
              wave: 0.75,
              twist: 0.15,
              // Casi la misma fase: ondean juntas como una bandera
              phase: i * 0.25,
            }),
          );
        });
        break;
      }
      case 6:
        // Estela de luz recta sobre el asfalto, como la de una moto de luz
        this.ribbons.push(
          new Ribbon(0xff2975, new Vector3(0, 0.12, rearZ), {
            width: 0.95,
            maxLength: 9,
            angle: 0,
            wave: 0,
            twist: 0,
            phase: 0,
            rigid: true,
          }),
        );
        break;
      case 10:
        this.exhaustGlows(['rgba(235,245,255,1)', 'rgba(140,170,255,0.9)', 'rgba(90,60,255,0.35)']);
        for (const x of [-tailX * 0.6, tailX * 0.6]) {
          for (let i = 0; i < 3; i++) {
            this.bolts.push(new Bolt(new Vector3(x, exhaustY, rearZ), i ? 0xffffff : 0x8fa8ff));
          }
        }
        break;
    }
    for (const r of this.ribbons) this.group.add(r.mesh);
    for (const b of this.bolts) this.group.add(b.line);
  }

  private clear(): void {
    for (const p of this.particles) this.group.remove(p.obj);
    for (const r of this.ribbons) this.group.remove(r.mesh);
    for (const b of this.bolts) this.group.remove(b.line);
    for (const s of this.glows) this.group.remove(s);
    this.particles = [];
    this.ribbons = [];
    this.bolts = [];
    this.glows = [];
    this.pending = 0;
  }

  /** Partículas por segundo (×RAMP) de cada efecto. */
  private rate(): number {
    return [0, 5.5, 7, 1.2, 0.8, 0, 0, 0.6, 2.4, 3.5, 1][this.type] ?? 0;
  }

  private exhaustGlows(stops: readonly string[]): void {
    const map = this.texture(`glow-${stops[1]}`, () =>
      radial([
        [0, stops[0]],
        [0.3, stops[1]],
        [0.65, stops[2]],
        [1, 'rgba(0,0,0,0)'],
      ]),
    );
    const { rearZ, halfWidth, exhaustY } = this.anchors;
    for (const x of [-halfWidth * 0.42, halfWidth * 0.42]) {
      const s = new Sprite(
        new SpriteMaterial({
          map,
          blending: AdditiveBlending,
          depthWrite: false,
          transparent: true,
        }),
      );
      s.position.set(x, exhaustY, rearZ + 0.05);
      this.group.add(s);
      this.glows.push(s);
    }
  }

  private updateGlows(accelerating: boolean, power: number): void {
    const flicker = 0.85 + Math.random() * 0.3;
    for (const g of this.glows) {
      const k = accelerating ? (0.6 + 0.6 * power) * flicker : 0.28;
      g.scale.set(k, k, 1);
      (g.material as SpriteMaterial).opacity = accelerating ? 0.95 : 0.35;
    }
  }

  private emit(): void {
    const { rearZ, halfWidth, exhaustY } = this.anchors;
    const side = Math.random() < 0.5 ? -1 : 1;
    const exhaust = new Vector3(side * halfWidth * 0.42, exhaustY, rearZ + 0.08);
    const r = Math.random;
    switch (this.type) {
      case 1: {
        // Brasas del escape, como en el juego
        const s = this.sprite('ember', () =>
          radial([
            [0, 'rgba(255,255,230,1)'],
            [0.3, 'rgba(255,190,80,0.9)'],
            [0.65, 'rgba(255,110,40,0.35)'],
            [1, 'rgba(255,80,20,0)'],
          ]),
        );
        this.spawn(s, exhaust, new Vector3((r() - 0.5) * 1.2, 0.4 + r() * 1.2, 3 + r() * 3), {
          life: 0.35 + r() * 0.25,
          scale: 0.25,
          grow: 2.8,
          drag: 0.4,
          fade: (k) => k * 0.9,
        });
        break;
      }
      case 2: {
        // Chispa: punto muy brillante que salta, cae y rebota
        const s = this.sprite('spark', () =>
          radial([
            [0, 'rgba(255,255,255,1)'],
            [0.25, 'rgba(255,230,120,1)'],
            [0.6, 'rgba(255,140,20,0.5)'],
            [1, 'rgba(255,90,0,0)'],
          ]),
        );
        const from = new Vector3((r() - 0.5) * halfWidth * 1.6, 0.08, rearZ - 0.2);
        this.spawn(s, from, new Vector3((r() - 0.5) * 4, 1.5 + r() * 2.5, 1 + r() * 3), {
          life: 0.5 + r() * 0.4,
          scale: 0.12 + r() * 0.08,
          gravity: 14,
          bounce: 0.45,
          drag: 0.8,
          fade: (k) => Math.min(1, k * 1.6),
        });
        break;
      }
      case 3:
      case 4:
      case 5: {
        // Polvo de brillo que se desprende de las cintas
        const ribbon = this.ribbons[Math.floor(r() * this.ribbons.length)];
        if (!ribbon) return;
        const s = this.sprite('glitter', () =>
          radial([
            [0, 'rgba(255,255,255,1)'],
            [0.4, 'rgba(255,255,255,0.4)'],
            [1, 'rgba(255,255,255,0)'],
          ]),
        );
        (s.material as SpriteMaterial).color.copy(ribbon.color);
        const pos = new Vector3(
          (r() - 0.5) * 0.6,
          this.anchors.roofY - r() * 0.6,
          rearZ + 0.4 + r() * 2,
        );
        this.spawn(s, pos, new Vector3((r() - 0.5) * 0.4, 0.3 + r() * 0.4, 0), {
          life: 0.7 + r() * 0.6,
          scale: 0.08,
          drag: 0.6,
          fade: (k) => k,
        });
        break;
      }
      case 7: {
        // Carita que sale del escape, bota hacia arriba y se queda atrás girando un poco
        const emoji = EMOJIS[Math.floor(r() * EMOJIS.length)];
        const s = this.sprite(
          `emoji-${emoji}`,
          () =>
            texture(96, (g, size) => {
              g.font = `78px ${EMOJI_FONT}`;
              g.textAlign = 'center';
              g.textBaseline = 'middle';
              g.fillText(emoji, size / 2, size / 2 + 4);
            }),
          NormalBlending,
        );
        this.spawn(s, exhaust, new Vector3((r() - 0.5) * 1.4, 2.2 + r() * 1.2, 1.2 + r()), {
          life: 1.3 + r() * 0.5,
          scale: 0.55,
          gravity: 2.2,
          grow: 0.4,
          drag: 0.55,
          spin: (r() - 0.5) * 3,
          fade: (k) => Math.min(1, k * 3),
        });
        break;
      }
      case 8: {
        // Humo de derrape: bocanadas grises desde las ruedas traseras que crecen
        const s = this.sprite(
          'smoke',
          () =>
            radial([
              [0, 'rgba(230,225,240,0.85)'],
              [0.5, 'rgba(170,165,190,0.45)'],
              [1, 'rgba(120,115,140,0)'],
            ]),
          NormalBlending,
        );
        const from = new Vector3(side * halfWidth * 0.95, 0.25, rearZ - 0.55);
        this.spawn(s, from, new Vector3(side * (0.3 + r() * 0.6), 0.5 + r() * 0.5, 0.5), {
          life: 1.2 + r() * 0.6,
          scale: 0.6,
          grow: 3.5,
          drag: 0.75,
          spin: (r() - 0.5) * 1.2,
          fade: (k) => k * 0.7,
        });
        break;
      }
      case 9: {
        // Píxel de 8 bits: cubito que sale, cae y se apaga
        const palette = [0xff2975, 0x2de2e6, 0xffd319, 0xf222ff, 0x8c1eff];
        const m = new Mesh(
          this.pixelGeometry(),
          new MeshBasicMaterial({
            color: palette[Math.floor(r() * palette.length)],
            transparent: true,
          }),
        );
        const from = new Vector3((r() - 0.5) * halfWidth * 1.4, exhaustY + r() * 0.3, rearZ + 0.1);
        this.spawn(m, from, new Vector3((r() - 0.5) * 1.5, 1 + r() * 1.5, 1 + r() * 1.5), {
          life: 0.8 + r() * 0.5,
          scale: 1,
          gravity: 6,
          bounce: 0.2,
          drag: 0.9,
          spin: (r() - 0.5) * 8,
          // Se apaga a saltos, como un sprite de 8 bits
          fade: (k) => Math.ceil(k * 4) / 4,
        });
        break;
      }
      case 10: {
        // Chispazos azules en la punta de los rayos
        const s = this.sprite('zap', () =>
          radial([
            [0, 'rgba(255,255,255,1)'],
            [0.3, 'rgba(150,170,255,0.9)'],
            [1, 'rgba(80,60,255,0)'],
          ]),
        );
        const from = new Vector3(side * halfWidth * 0.3, 0.05, rearZ + 0.6 + r() * 1.5);
        this.spawn(s, from, new Vector3((r() - 0.5) * 2, 0.8 + r(), 0), {
          life: 0.15 + r() * 0.15,
          scale: 0.3 + r() * 0.3,
          drag: 1,
          fade: (k) => k,
        });
        break;
      }
    }
  }

  private spawn(
    obj: Object3D,
    at: Vector3,
    velocity: Vector3,
    o: {
      life: number;
      scale: number;
      gravity?: number;
      bounce?: number;
      drag?: number;
      spin?: number;
      grow?: number;
      fade: (k: number) => number;
    },
  ): void {
    obj.position.copy(at);
    obj.scale.setScalar(o.scale);
    this.group.add(obj);
    this.particles.push({
      obj,
      life: o.life,
      max: o.life,
      velocity,
      gravity: o.gravity ?? 0,
      drag: o.drag ?? 1,
      bounce: o.bounce ?? 0,
      spin: o.spin ?? 0,
      grow: o.grow ?? 0,
      baseScale: o.scale,
      fade: o.fade,
    });
  }

  private sprite(key: string, make: () => Texture, blending: Blending = AdditiveBlending): Sprite {
    return new Sprite(
      new SpriteMaterial({
        map: this.texture(key, make),
        blending,
        depthWrite: false,
        transparent: true,
      }),
    );
  }

  private pixel: BoxGeometry | null = null;
  private pixelGeometry(): BoxGeometry {
    return (this.pixel ??= new BoxGeometry(0.12, 0.12, 0.12));
  }

  private texture(key: string, make: () => Texture): Texture {
    let t = this.textures.get(key);
    if (!t) {
      t = make();
      this.textures.set(key, t);
    }
    return t;
  }
}
