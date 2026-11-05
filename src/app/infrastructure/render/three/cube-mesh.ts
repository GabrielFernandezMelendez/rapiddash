import {
  AdditiveBlending,
  BoxGeometry,
  EdgesGeometry,
  Group,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  PlaneGeometry,
  Sprite,
  SpriteMaterial,
} from 'three';
import { canvasTexture } from './track-mesh';

const SIZE = 1.4;
/** Altura del centro sobre el asfalto y cuánto sube y baja. */
const HOVER = 1.15;
const BOB = 0.18;
const SPIN = 1.6;
/** Destello al cogerlo (s). */
const POP = 0.35;

/**
 * Cubo azul brillante del mapa del día: gira y flota sobre su carril, con aristas de neón, un
 * halo y su reflejo en el suelo. Al cogerlo crece y se desvanece.
 */
export class CubeMesh {
  readonly group = new Group();
  private readonly body = new Group();
  private readonly materials: (MeshBasicMaterial | LineBasicMaterial | SpriteMaterial)[] = [];
  private time = 0;
  private popping = -1;

  constructor() {
    const fill = new MeshBasicMaterial({ color: 0x1f6bff, transparent: true, opacity: 0.85 });
    const geometry = new BoxGeometry(SIZE, SIZE, SIZE);
    const edges = new LineBasicMaterial({ color: 0x9fe8ff, transparent: true });
    const core = new MeshBasicMaterial({
      color: 0x7fd6ff,
      transparent: true,
      opacity: 0.6,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    this.body.add(
      new Mesh(geometry, fill),
      new LineSegments(new EdgesGeometry(geometry), edges),
      new Mesh(new BoxGeometry(SIZE * 0.55, SIZE * 0.55, SIZE * 0.55), core),
    );
    // Halo alrededor
    const glowTexture = canvasTexture(64, 64, (g) => {
      const r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      r.addColorStop(0, 'rgba(120,200,255,0.9)');
      r.addColorStop(0.4, 'rgba(45,120,255,0.45)');
      r.addColorStop(1, 'rgba(45,120,255,0)');
      g.fillStyle = r;
      g.fillRect(0, 0, 64, 64);
    });
    const halo = new SpriteMaterial({
      map: glowTexture,
      transparent: true,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const sprite = new Sprite(halo);
    sprite.scale.setScalar(SIZE * 3.4);
    this.body.add(sprite);
    // Mancha de luz en el asfalto
    const spot = new MeshBasicMaterial({
      map: glowTexture,
      transparent: true,
      opacity: 0.8,
      blending: AdditiveBlending,
      depthWrite: false,
    });
    const floor = new Mesh(new PlaneGeometry(SIZE * 3, SIZE * 3), spot);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = 0.03;
    this.group.add(this.body, floor);
    this.materials.push(fill, edges, core, halo, spot);
    this.body.position.y = HOVER;
    this.group.visible = false;
  }

  place(x: number, y: number, z: number, heading: number): void {
    this.group.position.set(x, y, z);
    this.group.rotation.y = -heading;
    this.group.visible = true;
    this.popping = -1;
    this.body.scale.setScalar(1);
    for (const m of this.materials) m.opacity = m === this.materials[0] ? 0.85 : 1;
  }

  hide(): void {
    this.group.visible = false;
    this.popping = -1;
  }

  collect(): void {
    if (this.group.visible) this.popping = 0;
  }

  update(dt: number): void {
    if (!this.group.visible) return;
    this.time += dt;
    this.body.rotation.set(0.45, this.time * SPIN, 0.3);
    this.body.position.y = HOVER + Math.sin(this.time * 2.4) * BOB;
    if (this.popping < 0) return;
    this.popping += dt;
    const t = Math.min(1, this.popping / POP);
    this.body.scale.setScalar(1 + t * 1.6);
    for (const m of this.materials) m.opacity = 1 - t;
    if (t >= 1) this.hide();
  }
}
