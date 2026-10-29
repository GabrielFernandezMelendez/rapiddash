import {
  BoxGeometry,
  BufferGeometry,
  CanvasTexture,
  Color,
  DoubleSide,
  Float32BufferAttribute,
  Group,
  Mesh,
  MeshBasicMaterial,
  MeshLambertMaterial,
  PlaneGeometry,
} from 'three';
import {
  CORNER_RADIUS,
  LANE_COUNT,
  LANE_WIDTH,
  SAMPLE_STEP,
  TRACK_HALF_WIDTH,
} from '../../../core/domain/track/track-constants';
import { Track } from '../../../core/domain/track/track';
import { ScenePalette } from './themes';

const WALL_HEIGHT = 0.85;
type Vec3 = readonly [number, number, number];

export const flat = (color: number, extra: Record<string, unknown> = {}) =>
  new MeshLambertMaterial({ color, flatShading: true, ...extra });

export function canvasTexture(w: number, h: number, draw: (g: CanvasRenderingContext2D) => void) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');
  if (ctx) draw(ctx);
  return new CanvasTexture(canvas);
}

function pushQuad(out: number[], a: Vec3, b: Vec3, c: Vec3, d: Vec3): void {
  out.push(...a, ...b, ...c, ...b, ...d, ...c);
}

/** Asfalto, muros, líneas de carril, salida, meta y carteles de las curvas. */
export function buildTrackMesh(track: Track, palette: ScenePalette): Group {
  const group = new Group();
  const s = track.samples;
  const right = (i: number) => [Math.cos(s[i].heading), Math.sin(s[i].heading)] as const;

  // Asfalto con bandas alternas para notar la velocidad
  {
    const pos: number[] = [];
    const col: number[] = [];
    const idx: number[] = [];
    const c0 = new Color(palette.road[0]);
    const c1 = new Color(palette.road[1]);
    for (let i = 0; i < s.length; i++) {
      const [rx, rz] = right(i);
      const w = TRACK_HALF_WIDTH;
      pos.push(s[i].x - rx * w, 0.01, s[i].z - rz * w, s[i].x + rx * w, 0.01, s[i].z + rz * w);
      const c = Math.floor((i * SAMPLE_STEP) / 4) % 2 ? c1 : c0;
      col.push(c.r, c.g, c.b, c.r, c.g, c.b);
      if (i < s.length - 1) {
        const a = i * 2;
        idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
      }
    }
    const g = new BufferGeometry();
    g.setAttribute('position', new Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new Float32BufferAttribute(col, 3));
    g.setIndex(idx);
    g.computeVertexNormals();
    // DoubleSide: el asfalto se ve sea cual sea el orden de los vértices
    group.add(new Mesh(g, flat(0xffffff, { vertexColors: true, side: DoubleSide })));
  }

  // Muros a franjas y líneas discontinuas entre carriles
  {
    const wall: number[] = [];
    const wallCol: number[] = [];
    const lanes: number[] = [];
    const cA = new Color(palette.wall[0]);
    const cB = new Color(palette.wall[1]);
    const laneOffsets = Array.from(
      { length: LANE_COUNT - 1 },
      (_, k) => -TRACK_HALF_WIDTH + LANE_WIDTH * (k + 1),
    );
    for (let i = 0; i < s.length - 1; i++) {
      const j = i + 1;
      const [r0x, r0z] = right(i);
      const [r1x, r1z] = right(j);
      const c = Math.floor((i * SAMPLE_STEP) / 2) % 2 ? cA : cB;
      for (const side of [-1, 1]) {
        const o = side * TRACK_HALF_WIDTH;
        const a: Vec3 = [s[i].x + r0x * o, 0, s[i].z + r0z * o];
        const b: Vec3 = [s[j].x + r1x * o, 0, s[j].z + r1z * o];
        pushQuad(wall, a, b, [a[0], WALL_HEIGHT, a[2]], [b[0], WALL_HEIGHT, b[2]]);
        for (let q = 0; q < 6; q++) wallCol.push(c.r, c.g, c.b);
      }
      // Sin líneas dentro de las curvas de 90°
      if (s[j].kind !== 'corner' && Math.floor((i * SAMPLE_STEP) / 1.5) % 2 === 0) {
        for (const lx of laneOffsets) {
          const a0 = lx - 0.08;
          const a1 = lx + 0.08;
          pushQuad(
            lanes,
            [s[i].x + r0x * a0, 0.02, s[i].z + r0z * a0],
            [s[i].x + r0x * a1, 0.02, s[i].z + r0z * a1],
            [s[j].x + r1x * a0, 0.02, s[j].z + r1z * a0],
            [s[j].x + r1x * a1, 0.02, s[j].z + r1z * a1],
          );
        }
      }
    }
    const wg = new BufferGeometry();
    wg.setAttribute('position', new Float32BufferAttribute(wall, 3));
    wg.setAttribute('color', new Float32BufferAttribute(wallCol, 3));
    wg.computeVertexNormals();
    group.add(new Mesh(wg, flat(0xffffff, { vertexColors: true, side: DoubleSide })));
    const lg = new BufferGeometry();
    lg.setAttribute('position', new Float32BufferAttribute(lanes, 3));
    group.add(new Mesh(lg, new MeshBasicMaterial({ color: palette.lane, side: DoubleSide })));
  }

  group.add(checkeredLine(track, track.startDistance + 2));
  group.add(checkeredLine(track, track.finishDistance));
  group.add(finishBanner(track));
  for (const corner of track.corners)
    group.add(cornerSign(track, corner.start, corner.direction, palette));
  return group;
}

function checkeredLine(track: Track, distance: number): Mesh {
  const tex = canvasTexture(176, 24, (g) => {
    const size = 12;
    for (let y = 0; y < 2; y++)
      for (let x = 0; x < 176 / size; x++) {
        g.fillStyle = (x + y) % 2 ? '#111' : '#f5f5f5';
        g.fillRect(x * size, y * size, size, size);
      }
  });
  const mesh = new Mesh(
    new PlaneGeometry(TRACK_HALF_WIDTH * 2, 1.4),
    new MeshBasicMaterial({ map: tex }),
  );
  const p = track.pointAt(distance);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = -p.heading;
  mesh.position.set(p.x, 0.03, p.z);
  return mesh;
}

function finishBanner(track: Track): Group {
  const g = new Group();
  const p = track.pointAt(track.finishDistance);
  const [rx, rz] = [Math.cos(p.heading), Math.sin(p.heading)];
  const postMat = flat(0x2b2f36);
  for (const side of [-1, 1]) {
    const post = new Mesh(new BoxGeometry(0.35, 5, 0.35), postMat);
    const o = side * (TRACK_HALF_WIDTH + 0.4);
    post.position.set(p.x + rx * o, 2.5, p.z + rz * o);
    g.add(post);
  }
  const tex = canvasTexture(256, 32, (c) => {
    for (let x = 0; x < 16; x++)
      for (let y = 0; y < 2; y++) {
        c.fillStyle = (x + y) % 2 ? '#111' : '#f5f5f5';
        c.fillRect(x * 16, y * 16, 16, 16);
      }
  });
  const banner = new Mesh(
    new PlaneGeometry(TRACK_HALF_WIDTH * 2 + 0.8, 1),
    new MeshBasicMaterial({ map: tex, side: DoubleSide }),
  );
  banner.position.set(p.x, 4.6, p.z);
  banner.rotation.y = -p.heading;
  g.add(banner);
  return g;
}

/** Cartel de chevrones en el muro exterior, frente al coche, al empezar cada curva. */
function cornerSign(track: Track, start: number, direction: 1 | -1, palette: ScenePalette): Group {
  const g = new Group();
  const tex = canvasTexture(192, 48, (c) => {
    c.fillStyle = palette.sign;
    c.fillRect(0, 0, 192, 48);
    c.fillStyle = '#14110f';
    const n = 4;
    const cw = 192 / n;
    const h = 48;
    for (let k = 0; k < n; k++) {
      const x0 = k * cw + cw * 0.3;
      const x1 = x0 + cw * 0.4;
      const t = cw * 0.18;
      c.beginPath();
      if (direction > 0) {
        c.moveTo(x0, h * 0.15);
        c.lineTo(x1, h / 2);
        c.lineTo(x0, h * 0.85);
        c.lineTo(x0 + t, h * 0.85);
        c.lineTo(x1 + t, h / 2);
        c.lineTo(x0 + t, h * 0.15);
      } else {
        c.moveTo(x1, h * 0.15);
        c.lineTo(x0, h / 2);
        c.lineTo(x1, h * 0.85);
        c.lineTo(x1 - t, h * 0.85);
        c.lineTo(x0 - t, h / 2);
        c.lineTo(x1 - t, h * 0.15);
      }
      c.fill();
    }
  });
  const p = track.pointAt(start);
  // Justo detrás del muro exterior de la curva, en la línea de la recta de entrada
  const d = CORNER_RADIUS + TRACK_HALF_WIDTH + 1.2;
  const bx = p.x + Math.sin(p.heading) * d;
  const bz = p.z - Math.cos(p.heading) * d;
  const board = new Mesh(
    new PlaneGeometry(10, 2.4),
    new MeshBasicMaterial({ map: tex, side: DoubleSide }),
  );
  board.position.set(bx, 2, bz);
  board.rotation.y = -p.heading;
  g.add(board);
  const postMat = flat(0x3a3a3a);
  for (const off of [-4, 4]) {
    const post = new Mesh(new BoxGeometry(0.2, 1, 0.2), postMat);
    post.position.set(bx + Math.cos(p.heading) * off, 0.5, bz + Math.sin(p.heading) * off);
    g.add(post);
  }
  return g;
}
