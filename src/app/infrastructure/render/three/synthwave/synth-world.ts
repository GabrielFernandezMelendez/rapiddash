import {
  AdditiveBlending,
  CanvasTexture,
  ConeGeometry,
  CylinderGeometry,
  DoubleSide,
  EdgesGeometry,
  Group,
  InstancedMesh,
  LineBasicMaterial,
  LineSegments,
  Mesh,
  MeshBasicMaterial,
  Object3D,
  PlaneGeometry,
  RepeatWrapping,
  Sprite,
  SpriteMaterial,
  SRGBColorSpace,
  WireframeGeometry,
  BufferGeometry,
  Float32BufferAttribute,
} from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { Track } from '../../../../core/domain/track/track';
import { sceneryLayout } from '../scenery';
import { canvasTexture } from '../track-mesh';
import { seededRandom } from '../themes';
import { SynthPalette } from './synth-palettes';

/** Cielo de fondo: degradado vertical de la paleta. */
export function skyTexture(p: SynthPalette): CanvasTexture {
  const tex = canvasTexture(4, 256, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0, p.skyStops[0]);
    grad.addColorStop(0.35, p.skyStops[1]);
    grad.addColorStop(0.62, p.skyStops[2]);
    grad.addColorStop(0.8, p.skyStops[3]);
    grad.addColorStop(1, p.skyStops[3]);
    g.fillStyle = grad;
    g.fillRect(0, 0, 4, 256);
  });
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

/** Sol a franjas: círculo con degradado y bandas transparentes en la mitad de abajo. */
function sunTexture(p: SynthPalette): CanvasTexture {
  const tex = canvasTexture(256, 256, (g) => {
    const grad = g.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.1, p.sunStops[0]);
    grad.addColorStop(0.5, p.sunStops[1]);
    grad.addColorStop(0.95, p.sunStops[2]);
    g.fillStyle = grad;
    g.beginPath();
    g.arc(128, 128, 126, 0, Math.PI * 2);
    g.fill();
    g.globalCompositeOperation = 'destination-out';
    for (const [y, t] of [
      [0.56, 0.025],
      [0.64, 0.035],
      [0.72, 0.045],
      [0.8, 0.055],
      [0.88, 0.065],
    ])
      g.fillRect(0, y * 256, 256, t * 256);
  });
  tex.colorSpace = SRGBColorSpace;
  return tex;
}

function haloTexture(): CanvasTexture {
  return canvasTexture(128, 128, (g) => {
    const r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
    r.addColorStop(0, 'rgba(255,90,140,0.55)');
    r.addColorStop(1, 'rgba(255,42,109,0)');
    g.fillStyle = r;
    g.fillRect(0, 0, 128, 128);
  });
}

/**
 * Lo que está "en el infinito": sol y anillo de montañas en alambre alrededor de la cámara.
 * Sigue a la cámara (solo en posición), así nunca se alcanza, como en las referencias.
 */
export class SynthSky {
  readonly group = new Group();

  constructor(p: SynthPalette) {
    const sky = { fog: false, depthWrite: false, transparent: true };
    const sun = new Sprite(new SpriteMaterial({ map: sunTexture(p), ...sky }));
    sun.scale.set(170, 170, 1);
    sun.position.set(0, 40, -400);
    const halo = new Sprite(
      new SpriteMaterial({ map: haloTexture(), blending: AdditiveBlending, ...sky }),
    );
    halo.scale.set(380, 380, 1);
    halo.position.set(0, 40, -401);
    sun.renderOrder = halo.renderOrder = -2;
    this.group.add(halo, sun, this.mountains(p));
  }

  /** Anillo de montañas low-poly: oscuras por dentro, aristas de neón. */
  private mountains(p: SynthPalette): Group {
    const seg = 72;
    const rows = 4;
    const inner = 250;
    const depth = 90;
    const rand = seededRandom(p.seed + 3);
    const positions: number[] = [];
    const heights: number[][] = [];
    for (let r = 0; r <= rows; r++) {
      heights.push([]);
      for (let i = 0; i <= seg; i++) {
        const back = r / rows;
        const h = r === 0 ? 0 : Math.pow(back, 0.7) * (8 + rand() * 46);
        heights[r].push(i === seg ? heights[r][0] : h);
      }
    }
    const pt = (r: number, i: number) => {
      const a = (i / seg) * Math.PI * 2;
      const rad = inner + (depth * r) / rows;
      return [Math.sin(a) * rad, heights[r][i] - 1, -Math.cos(a) * rad];
    };
    for (let r = 0; r < rows; r++)
      for (let i = 0; i < seg; i++) {
        const a = pt(r, i);
        const b = pt(r, i + 1);
        const c = pt(r + 1, i);
        const d = pt(r + 1, i + 1);
        positions.push(...a, ...c, ...b, ...b, ...c, ...d);
      }
    const geo = new BufferGeometry();
    geo.setAttribute('position', new Float32BufferAttribute(positions, 3));
    const g = new Group();
    const body = new Mesh(
      geo,
      new MeshBasicMaterial({ color: 0x140630, fog: false, side: DoubleSide }),
    );
    const wire = new LineSegments(
      new WireframeGeometry(geo),
      new LineBasicMaterial({ color: p.mountain, transparent: true, opacity: 0.7, fog: false }),
    );
    body.renderOrder = wire.renderOrder = -1;
    g.add(body, wire);
    return g;
  }

  follow(x: number, z: number): void {
    this.group.position.set(x, 0, z);
  }
}

/** Suelo oscuro con rejilla de neón y palmeras en silueta alrededor de la pista. */
export function buildSynthScenery(track: Track, p: SynthPalette): Group {
  const group = new Group();
  const { minX, maxX, minZ, maxZ, spots } = sceneryLayout(track, p);

  // Rejilla: una textura de una celda repetida por todo el suelo
  const cell = 6;
  const w = maxX - minX + 600;
  const h = maxZ - minZ + 600;
  const grid = canvasTexture(64, 64, (g) => {
    g.fillStyle = '#000';
    g.fillRect(0, 0, 64, 64);
    g.fillStyle = `#${p.grid.toString(16).padStart(6, '0')}`;
    g.fillRect(0, 0, 64, 3);
    g.fillRect(0, 0, 3, 64);
  });
  grid.wrapS = grid.wrapT = RepeatWrapping;
  grid.repeat.set(w / cell, h / cell);
  grid.anisotropy = 4;
  const ground = new Mesh(new PlaneGeometry(w, h), new MeshBasicMaterial({ color: p.ground }));
  const lines = new Mesh(
    new PlaneGeometry(w, h),
    new MeshBasicMaterial({
      map: grid,
      transparent: true,
      opacity: 0.55,
      blending: AdditiveBlending,
      depthWrite: false,
    }),
  );
  for (const m of [ground, lines]) {
    m.rotation.x = -Math.PI / 2;
    m.position.set((minX + maxX) / 2, m === ground ? -0.06 : -0.04, (minZ + maxZ) / 2);
    group.add(m);
  }

  // Palmeras: tronco curvado y 7 hojas, en una sola geometría por pieza e instanciadas
  const trunkParts: BufferGeometry[] = [];
  let y = 0;
  for (let s = 0; s < 6; s++) {
    const t = new CylinderGeometry(0.2 - s * 0.018, 0.24 - s * 0.018, 1.4, 6);
    t.translate(s * s * 0.03, y + 0.7, 0);
    trunkParts.push(t);
    y += 1.35;
  }
  const leafParts: BufferGeometry[] = [];
  for (let a = 0; a < 7; a++) {
    const leaf = new ConeGeometry(0.5, 4.2, 4);
    leaf.rotateZ(Math.PI / 2);
    leaf.translate(2.1, 0, 0);
    leaf.scale(1, 0.25, 1);
    leaf.rotateZ(-0.45);
    leaf.rotateY((a / 7) * Math.PI * 2);
    leaf.translate(0.75, y, 0);
    leafParts.push(leaf);
  }
  const trunkGeo = mergeGeometries(trunkParts);
  const leafGeo = mergeGeometries(leafParts);
  const palms = spots.filter((s, i) => i % 2 === 0);
  const silhouette = new MeshBasicMaterial({ color: p.palm });
  const trunks = new InstancedMesh(trunkGeo, silhouette, palms.length);
  const leaves = new InstancedMesh(leafGeo, silhouette, palms.length);
  const m = new Object3D();
  palms.forEach((s, i) => {
    m.position.set(s.x, 0, s.z);
    m.rotation.set(0, s.spin * 6, 0);
    m.scale.setScalar(0.8 + s.scale * 0.4);
    m.updateMatrix();
    trunks.setMatrixAt(i, m.matrix);
    leaves.setMatrixAt(i, m.matrix);
  });
  // Borde de neón de las hojas en las palmeras más cercanas, fundido en una sola geometría
  // (una única llamada de dibujo en vez de una por palmera)
  const edges = new EdgesGeometry(leafGeo);
  const outlines = mergeGeometries(
    palms.slice(0, 80).map((s) => {
      m.position.set(s.x, 0, s.z);
      m.rotation.set(0, s.spin * 6, 0);
      m.scale.setScalar(0.8 + s.scale * 0.4);
      m.updateMatrix();
      return edges.clone().applyMatrix4(m.matrix);
    }),
  );
  group.add(
    new LineSegments(
      outlines,
      new LineBasicMaterial({ color: p.mountain, transparent: true, opacity: 0.55 }),
    ),
  );
  group.add(trunks, leaves);
  return group;
}
