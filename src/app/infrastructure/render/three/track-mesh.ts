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
  JUNCTION_SIZE,
  LANE_COUNT,
  LANE_WIDTH,
  SAMPLE_STEP,
  TRACK_HALF_WIDTH,
} from '../../../core/domain/track/track-constants';
import { Junction, Leg, Track } from '../../../core/domain/track/track';
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

function pushColor(out: number[], c: Color, vertices: number): void {
  for (let i = 0; i < vertices; i++) out.push(c.r, c.g, c.b);
}

function geometry(positions: number[], colors?: number[]): BufferGeometry {
  const g = new BufferGeometry();
  g.setAttribute('position', new Float32BufferAttribute(positions, 3));
  if (colors) g.setAttribute('color', new Float32BufferAttribute(colors, 3));
  g.computeVertexNormals();
  return g;
}

/** Acumula los triángulos de toda la pista para dibujarla con pocas mallas. */
class TrackBuffers {
  readonly road: number[] = [];
  readonly roadColors: number[] = [];
  readonly wall: number[] = [];
  readonly wallColors: number[] = [];
  readonly lanes: number[] = [];
  readonly grid: number[] = [];

  readonly roadA: Color;
  readonly roadB: Color;
  readonly wallA: Color;
  readonly wallB: Color;

  constructor(palette: ScenePalette) {
    this.roadA = new Color(palette.road[0]);
    this.roadB = new Color(palette.road[1]);
    this.wallA = new Color(palette.wall[0]);
    this.wallB = new Color(palette.wall[1]);
  }

  wallSegment(a: Vec3, b: Vec3, stripe: boolean): void {
    pushQuad(this.wall, a, b, [a[0], WALL_HEIGHT, a[2]], [b[0], WALL_HEIGHT, b[2]]);
    pushColor(this.wallColors, stripe ? this.wallA : this.wallB, 6);
  }
}

/** Asfalto, muros y líneas de carril de un tramo. */
function addLeg(buf: TrackBuffers, leg: Leg): void {
  const s = leg.samples;
  const laneOffsets = Array.from(
    { length: LANE_COUNT - 1 },
    (_, k) => -TRACK_HALF_WIDTH + LANE_WIDTH * (k + 1),
  );
  for (let i = 0; i < s.length - 1; i++) {
    const j = i + 1;
    const r0 = [Math.cos(s[i].heading), Math.sin(s[i].heading)] as const;
    const r1 = [Math.cos(s[j].heading), Math.sin(s[j].heading)] as const;
    const at = (k: number, o: number, y: number): Vec3 => {
      const r = k === i ? r0 : r1;
      return [s[k].x + r[0] * o, y, s[k].z + r[1] * o];
    };
    const w = TRACK_HALF_WIDTH;
    pushQuad(buf.road, at(i, -w, 0.01), at(i, w, 0.01), at(j, -w, 0.01), at(j, w, 0.01));
    // Bandas alternas en el asfalto para notar la velocidad
    pushColor(buf.roadColors, Math.floor((i * SAMPLE_STEP) / 4) % 2 ? buf.roadB : buf.roadA, 6);
    const stripe = Math.floor((i * SAMPLE_STEP) / 2) % 2 === 0;
    for (const side of [-1, 1]) buf.wallSegment(at(i, side * w, 0), at(j, side * w, 0), stripe);
    if (Math.floor((i * SAMPLE_STEP) / 1.5) % 2 === 0) {
      for (const lx of laneOffsets) {
        pushQuad(
          buf.lanes,
          at(i, lx - 0.08, 0.02),
          at(i, lx + 0.08, 0.02),
          at(j, lx - 0.08, 0.02),
          at(j, lx + 0.08, 0.02),
        );
      }
    }
  }
}

/**
 * Cruce cuadrado: suelo, muro frontal, muro del lado cerrado y una retícula tenue con los
 * carriles de entrada y de salida.
 */
function addJunction(buf: TrackBuffers, j: Junction): void {
  const f = [Math.sin(j.heading), -Math.cos(j.heading)] as const;
  const r = [Math.cos(j.heading), Math.sin(j.heading)] as const;
  const at = (fw: number, lt: number, y: number): Vec3 => [
    j.x + f[0] * fw + r[0] * lt,
    y,
    j.z + f[1] * fw + r[1] * lt,
  ];
  const H = TRACK_HALF_WIDTH;
  const S = JUNCTION_SIZE;
  pushQuad(buf.road, at(0, -H, 0.01), at(0, H, 0.01), at(S, -H, 0.01), at(S, H, 0.01));
  pushColor(buf.roadColors, buf.roadA, 6);

  for (let k = 1; k < LANE_COUNT; k++) {
    const o = -H + LANE_WIDTH * k;
    for (let a = 0; a < S; a += 1.5) {
      pushQuad(
        buf.grid,
        at(a, o - 0.05, 0.02),
        at(a, o + 0.05, 0.02),
        at(a + 0.7, o - 0.05, 0.02),
        at(a + 0.7, o + 0.05, 0.02),
      );
      pushQuad(
        buf.grid,
        at(H + o - 0.05, a - H, 0.02),
        at(H + o + 0.05, a - H, 0.02),
        at(H + o - 0.05, a - H + 0.7, 0.02),
        at(H + o + 0.05, a - H + 0.7, 0.02),
      );
    }
  }

  // Muros en piezas de 1 m para mantener las franjas
  const wallLine = (a: Vec3, b: Vec3) => {
    const n = Math.round(Math.hypot(b[0] - a[0], b[2] - a[2]));
    for (let i = 0; i < n; i++) {
      const p = (t: number): Vec3 => [a[0] + (b[0] - a[0]) * t, 0, a[2] + (b[2] - a[2]) * t];
      buf.wallSegment(p(i / n), p((i + 1) / n), i % 2 === 0);
    }
  };
  wallLine(at(S, -H, 0), at(S, H, 0));
  wallLine(at(0, -j.direction * H, 0), at(S, -j.direction * H, 0));
}

/** Pista completa: tramos, cruces, salida, meta y carteles. */
export function buildTrackMesh(track: Track, palette: ScenePalette): Group {
  const group = new Group();
  const buf = new TrackBuffers(palette);
  for (const leg of track.legs) {
    addLeg(buf, leg);
    if (leg.junction) addJunction(buf, leg.junction);
  }
  group.add(
    new Mesh(
      geometry(buf.road, buf.roadColors),
      flat(0xffffff, { vertexColors: true, side: DoubleSide }),
    ),
    new Mesh(
      geometry(buf.wall, buf.wallColors),
      flat(0xffffff, { vertexColors: true, side: DoubleSide }),
    ),
    new Mesh(geometry(buf.lanes), new MeshBasicMaterial({ color: palette.lane, side: DoubleSide })),
    new Mesh(
      geometry(buf.grid),
      new MeshBasicMaterial({
        color: palette.lane,
        transparent: true,
        opacity: 0.35,
        side: DoubleSide,
      }),
    ),
  );

  group.add(checkeredLine(track, 0, track.startDistance + 2));
  group.add(checkeredLine(track, track.legs.length - 1, track.finishDistance));
  group.add(finishBanner(track));
  for (const j of track.junctions) group.add(junctionSign(j, palette));
  return group;
}

function checkerTexture(w: number, h: number, size: number): CanvasTexture {
  return canvasTexture(w, h, (g) => {
    for (let y = 0; y < h / size; y++)
      for (let x = 0; x < w / size; x++) {
        g.fillStyle = (x + y) % 2 ? '#111' : '#f5f5f5';
        g.fillRect(x * size, y * size, size, size);
      }
  });
}

function checkeredLine(track: Track, leg: number, distance: number): Mesh {
  const mesh = new Mesh(
    new PlaneGeometry(TRACK_HALF_WIDTH * 2, 1.4),
    new MeshBasicMaterial({ map: checkerTexture(176, 24, 12) }),
  );
  const p = track.pointAt(leg, distance);
  mesh.rotation.x = -Math.PI / 2;
  mesh.rotation.z = -p.heading;
  mesh.position.set(p.x, 0.03, p.z);
  return mesh;
}

function finishBanner(track: Track): Group {
  const g = new Group();
  const p = track.pointAt(track.legs.length - 1, track.finishDistance);
  const [rx, rz] = [Math.cos(p.heading), Math.sin(p.heading)];
  const postMat = flat(0x2b2f36);
  for (const side of [-1, 1]) {
    const post = new Mesh(new BoxGeometry(0.35, 5, 0.35), postMat);
    const o = side * (TRACK_HALF_WIDTH + 0.4);
    post.position.set(p.x + rx * o, 2.5, p.z + rz * o);
    g.add(post);
  }
  const banner = new Mesh(
    new PlaneGeometry(TRACK_HALF_WIDTH * 2 + 0.8, 1),
    new MeshBasicMaterial({ map: checkerTexture(256, 32, 16), side: DoubleSide }),
  );
  banner.position.set(p.x, 4.6, p.z);
  banner.rotation.y = -p.heading;
  g.add(banner);
  return g;
}

/** Cartel de chevrones sobre el muro frontal del cruce, indicando hacia dónde sale la carretera. */
function junctionSign(j: Junction, palette: ScenePalette): Group {
  const g = new Group();
  const direction = j.direction;
  const tex = canvasTexture(192, 48, (c) => {
    c.fillStyle = palette.sign;
    c.fillRect(0, 0, 192, 48);
    c.fillStyle = '#14110f';
    const cw = 48;
    const h = 48;
    for (let k = 0; k < 4; k++) {
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
  const d = JUNCTION_SIZE + 1.2;
  const bx = j.x + Math.sin(j.heading) * d;
  const bz = j.z - Math.cos(j.heading) * d;
  const board = new Mesh(
    new PlaneGeometry(10, 2.4),
    new MeshBasicMaterial({ map: tex, side: DoubleSide }),
  );
  board.position.set(bx, 2, bz);
  board.rotation.y = -j.heading;
  g.add(board);
  const postMat = flat(0x3a3a3a);
  for (const off of [-4, 4]) {
    const post = new Mesh(new BoxGeometry(0.2, 1, 0.2), postMat);
    post.position.set(bx + Math.cos(j.heading) * off, 0.5, bz + Math.sin(j.heading) * off);
    g.add(post);
  }
  return g;
}
