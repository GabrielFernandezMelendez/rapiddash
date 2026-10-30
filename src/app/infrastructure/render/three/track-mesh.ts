import {
  AdditiveBlending,
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
  LANE_COUNT,
  LANE_WIDTH,
  SAMPLE_STEP,
  TRACK_HALF_WIDTH,
} from '../../../core/domain/track/track-constants';
import { Junction, Leg, Taper, Track } from '../../../core/domain/track/track';
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

function pushTri(out: number[], a: Vec3, b: Vec3, c: Vec3): void {
  out.push(...a, ...b, ...c);
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
  /** Halo de los muros de neón en el suelo (solo synthwave). */
  readonly glow: number[] = [];
  readonly glowColors: number[] = [];

  readonly roadA: Color;
  readonly roadB: Color;
  readonly wallA: Color;
  readonly wallB: Color;
  readonly neonLeft: Color | null;
  readonly neonRight: Color | null;

  constructor(palette: ScenePalette) {
    this.roadA = new Color(palette.road[0]);
    this.roadB = new Color(palette.road[1]);
    this.wallA = new Color(palette.wall[0]);
    this.wallB = new Color(palette.wall[1]);
    this.neonLeft = palette.neon ? new Color(palette.neon.left) : null;
    this.neonRight = palette.neon ? new Color(palette.neon.right) : null;
  }

  /** `side`: -1 muro izquierdo, 1 derecho, 0 muros de los cruces (alternan los dos neones). */
  wallSegment(a: Vec3, b: Vec3, stripe: boolean, side: -1 | 0 | 1 = 0): void {
    pushQuad(this.wall, a, b, [a[0], WALL_HEIGHT, a[2]], [b[0], WALL_HEIGHT, b[2]]);
    if (this.neonLeft && this.neonRight) {
      const left = side === 0 ? stripe : side < 0;
      pushColor(this.wallColors, left ? this.neonLeft : this.neonRight, 6);
    } else {
      pushColor(this.wallColors, stripe ? this.wallA : this.wallB, 6);
    }
  }

  /** Halo en el suelo por fuera del muro: de su color a transparente (mezcla aditiva). */
  glowSegment(a: Vec3, b: Vec3, aOut: Vec3, bOut: Vec3, side: -1 | 1): void {
    if (!this.neonLeft || !this.neonRight) return;
    pushQuad(this.glow, a, b, aOut, bOut);
    const c = side < 0 ? this.neonLeft : this.neonRight;
    const black = new Color(0x000000);
    for (const k of [c, c, black, c, black, black]) this.glowColors.push(k.r, k.g, k.b);
  }
}

/**
 * Asfalto, muros y líneas de carril de un tramo. El ancho sigue al de cada muestra: en los
 * embudos las paredes se cierran en diagonal y las líneas de los carriles que desaparecen se
 * acaban.
 */
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
    const wi = s[i].halfWidth;
    const wj = s[j].halfWidth;
    pushQuad(buf.road, at(i, -wi, 0.01), at(i, wi, 0.01), at(j, -wj, 0.01), at(j, wj, 0.01));
    // Bandas alternas en el asfalto para notar la velocidad
    pushColor(buf.roadColors, Math.floor((i * SAMPLE_STEP) / 4) % 2 ? buf.roadB : buf.roadA, 6);
    const stripe = Math.floor((i * SAMPLE_STEP) / 2) % 2 === 0;
    for (const side of [-1, 1] as const) {
      buf.wallSegment(at(i, side * wi, 0), at(j, side * wj, 0), stripe, side);
      buf.glowSegment(
        at(i, side * wi, 0.02),
        at(j, side * wj, 0.02),
        at(i, side * (wi + 1.6), 0.02),
        at(j, side * (wj + 1.6), 0.02),
        side,
      );
    }
    if (Math.floor((i * SAMPLE_STEP) / 1.5) % 2 === 0) {
      for (const lx of laneOffsets) {
        // La línea solo se pinta mientras el carril de fuera cabe entre ella y la pared
        if (Math.abs(lx) + 0.45 > Math.min(wi, wj)) continue;
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
  const H = j.halfWidth;
  const S = 2 * H;
  const lanes = Math.round(S / LANE_WIDTH);
  pushQuad(buf.road, at(0, -H, 0.01), at(0, H, 0.01), at(S, -H, 0.01), at(S, H, 0.01));
  pushColor(buf.roadColors, buf.roadA, 6);

  for (let k = 1; k < lanes; k++) {
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

/** Flechas de "carril que se cierra": tallo recto que se tuerce hacia dentro, con punta. */
function addMergeArrow(buf: TrackBuffers, track: Track, leg: number, d: number, lane: number) {
  const k = -Math.sign(lane);
  const p = (x: number, y: number): Vec3 => {
    const w = track.worldAt(leg, d + y, lane + x);
    return [w.x, 0.02, w.z];
  };
  pushQuad(buf.lanes, p(-0.16, 0), p(0.16, 0), p(-0.16, 2), p(0.16, 2));
  pushQuad(buf.lanes, p(-0.16, 2), p(0.16, 2), p(-0.16 + k * 0.9, 3.1), p(0.16 + k * 0.9, 3.1));
  pushTri(buf.lanes, p(k * 0.5, 3), p(k * 1.5, 2.6), p(k * 1.25, 3.9));
}

/** Avisos de un embudo: flechas en los carriles que se cierran y paneles de chevrones. */
function taperWarnings(
  buf: TrackBuffers,
  track: Track,
  leg: Leg,
  taper: Taper,
  palette: ScenePalette,
): Group {
  const g = new Group();
  if (taper.toHalfWidth >= taper.fromHalfWidth) return g;
  const closing = [-1, 1].flatMap((side) =>
    Array.from({ length: LANE_COUNT }, (_, i) => -TRACK_HALF_WIDTH + LANE_WIDTH * (i + 0.5))
      .filter((c) => Math.abs(c) < taper.fromHalfWidth && Math.abs(c) > taper.toHalfWidth - 1)
      .filter((c) => Math.sign(c) === side),
  );
  for (const back of [20, 9]) {
    const d = taper.start - back;
    if (d < 1) continue;
    for (const lane of closing) addMergeArrow(buf, track, leg.index, d, lane);
  }
  for (const side of [-1, 1] as const) {
    const board = new Mesh(
      new PlaneGeometry(3.4, 0.85),
      new MeshBasicMaterial({ map: chevronTexture(-side, palette), side: DoubleSide }),
    );
    const p = track.worldAt(leg.index, taper.start + 1, side * (taper.fromHalfWidth + 1.2));
    board.position.set(p.x, 1.15, p.z);
    board.rotation.y = -p.heading;
    const post = new Mesh(new BoxGeometry(0.12, 0.8, 0.12), flat(0x2b2f36));
    post.position.set(p.x, 0.4, p.z);
    g.add(board, post);
  }
  return g;
}

/** Pista completa: tramos, cruces, embudos, salida, meta y carteles. */
export function buildTrackMesh(track: Track, palette: ScenePalette): Group {
  const group = new Group();
  const buf = new TrackBuffers(palette);
  for (const leg of track.legs) {
    addLeg(buf, leg);
    if (leg.junction) addJunction(buf, leg.junction);
    for (const taper of leg.tapers) group.add(taperWarnings(buf, track, leg, taper, palette));
  }
  group.add(
    new Mesh(
      geometry(buf.road, buf.roadColors),
      flat(0xffffff, { vertexColors: true, side: DoubleSide }),
    ),
    new Mesh(
      geometry(buf.wall, buf.wallColors),
      // Los muros de neón no reciben luz: así brillan siempre con su color
      palette.neon
        ? new MeshBasicMaterial({ vertexColors: true, side: DoubleSide })
        : flat(0xffffff, { vertexColors: true, side: DoubleSide }),
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

  if (buf.glow.length) {
    group.add(
      new Mesh(
        geometry(buf.glow, buf.glowColors),
        new MeshBasicMaterial({
          vertexColors: true,
          transparent: true,
          opacity: 0.45,
          blending: AdditiveBlending,
          depthWrite: false,
          side: DoubleSide,
        }),
      ),
    );
  }

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
    new PlaneGeometry(track.halfWidthAt(leg, distance) * 2, 1.4),
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
  const half = track.halfWidthAt(track.legs.length - 1, track.finishDistance);
  const [rx, rz] = [Math.cos(p.heading), Math.sin(p.heading)];
  const postMat = flat(0x2b2f36);
  for (const side of [-1, 1]) {
    const post = new Mesh(new BoxGeometry(0.35, 5, 0.35), postMat);
    const o = side * (half + 0.4);
    post.position.set(p.x + rx * o, 2.5, p.z + rz * o);
    g.add(post);
  }
  const banner = new Mesh(
    new PlaneGeometry(half * 2 + 0.8, 1),
    new MeshBasicMaterial({ map: checkerTexture(256, 32, 16), side: DoubleSide }),
  );
  banner.position.set(p.x, 4.6, p.z);
  banner.rotation.y = -p.heading;
  g.add(banner);
  return g;
}

/** Chevrones negros sobre el color de los carteles, apuntando a `direction` (1 derecha). */
function chevronTexture(direction: number, palette: ScenePalette): CanvasTexture {
  return canvasTexture(192, 48, (c) => {
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
}

/** Cartel de chevrones sobre el muro frontal del cruce, indicando hacia dónde sale la carretera. */
function junctionSign(j: Junction, palette: ScenePalette): Group {
  const g = new Group();
  const tex = chevronTexture(j.direction, palette);
  // El cartel se ajusta al ancho del cruce (más pequeño en un tramo de 3 carriles)
  const width = Math.min(10, j.halfWidth * 2 - 1);
  const d = j.halfWidth * 2 + 1.2;
  const bx = j.x + Math.sin(j.heading) * d;
  const bz = j.z - Math.cos(j.heading) * d;
  const board = new Mesh(
    new PlaneGeometry(width, width * 0.24),
    new MeshBasicMaterial({ map: tex, side: DoubleSide }),
  );
  board.position.set(bx, 2, bz);
  board.rotation.y = -j.heading;
  g.add(board);
  const postMat = flat(0x3a3a3a);
  for (const off of [-width * 0.4, width * 0.4]) {
    const post = new Mesh(new BoxGeometry(0.2, 1, 0.2), postMat);
    post.position.set(bx + Math.cos(j.heading) * off, 0.5, bz + Math.sin(j.heading) * off);
    g.add(post);
  }
  return g;
}
