import { MapTheme } from '../../../core/domain/track/race-map';

export interface ScenePalette {
  readonly sky: number;
  readonly fogNear: number;
  readonly fogFar: number;
  readonly ground: number;
  readonly road: readonly [number, number];
  readonly wall: readonly [number, number];
  readonly lane: number;
  readonly leaf: number;
  readonly trunk: number;
  readonly rock: number;
  readonly sign: string;
  /** Proporción de árboles frente a rocas en el decorado. */
  readonly treeRatio: number;
  readonly seed: number;
}

export const PALETTES: Record<MapTheme, ScenePalette> = {
  bay: {
    sky: 0xbfe1dc,
    fogNear: 40,
    fogFar: 140,
    ground: 0x86b46b,
    road: [0x3d424b, 0x454a54],
    wall: [0xd64933, 0xf2efe6],
    lane: 0xf2efe6,
    leaf: 0x2f7d52,
    trunk: 0x6b4a34,
    rock: 0x9ea4aa,
    sign: '#f3c13a',
    treeRatio: 0.82,
    seed: 7,
  },
  canyon: {
    sky: 0xf3cfa4,
    fogNear: 45,
    fogFar: 150,
    ground: 0xc98a5a,
    road: [0x4a3e3a, 0x534641],
    wall: [0xd64933, 0xf4e7d3],
    lane: 0xf4e7d3,
    leaf: 0x6d8a3a,
    trunk: 0x6b4a34,
    rock: 0xa45a3a,
    sign: '#f3c13a',
    treeRatio: 0.2,
    seed: 21,
  },
  summit: {
    sky: 0xd3e2ef,
    fogNear: 35,
    fogFar: 125,
    ground: 0xe8eef3,
    road: [0x3a4250, 0x434b5a],
    wall: [0x2f6fd6, 0xf4f6f8],
    lane: 0xf4f6f8,
    leaf: 0x1f5a45,
    trunk: 0x4a3328,
    rock: 0x8d97a3,
    sign: '#f3c13a',
    treeRatio: 0.7,
    seed: 42,
  },
};

/** Generador pseudoaleatorio con semilla: el decorado es siempre el mismo para cada mapa. */
export function seededRandom(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
