import { MapTheme } from '../../../../core/domain/track/race-map';
import { ScenePalette } from '../themes';

/** Paleta synthwave: la de la escena más el cielo, el sol, la rejilla y las montañas. */
export interface SynthPalette extends ScenePalette {
  /** Degradado del cielo de arriba al horizonte. */
  readonly skyStops: readonly [string, string, string, string];
  /** Degradado del sol de arriba abajo. */
  readonly sunStops: readonly [string, string, string];
  readonly grid: number;
  readonly mountain: number;
  readonly palm: number;
}

// Cada mapa con su atardecer: Bahía rosa, Cañón naranja, Cumbre azul.
// Los campos clásicos (árboles, rocas…) se mantienen para reutilizar la colocación del decorado.
export const SYNTH_PALETTES: Record<MapTheme, SynthPalette> = {
  bay: {
    sky: 0x3a0b5e,
    fogNear: 60,
    fogFar: 230,
    ground: 0x0d0420,
    road: [0x1a0a33, 0x1f0c3c],
    wall: [0x2de2e6, 0xff2a6d],
    lane: 0xf4ecff,
    leaf: 0x12051f,
    trunk: 0x12051f,
    rock: 0x12051f,
    sign: '#ff4fd8',
    treeRatio: 1,
    seed: 7,
    neon: { left: 0x2de2e6, right: 0xff2a6d },
    skyStops: ['#0d0420', '#25094a', '#6a1470', '#ff2a6d'],
    sunStops: ['#ffe86b', '#ff901f', '#ff2a6d'],
    grid: 0xff4fd8,
    mountain: 0x2de2e6,
    palm: 0x12051f,
  },
  canyon: {
    sky: 0x5a1430,
    fogNear: 60,
    fogFar: 230,
    ground: 0x12030f,
    road: [0x24091f, 0x2b0b25],
    wall: [0xffd319, 0xff5a3c],
    lane: 0xfff2e0,
    leaf: 0x1a0612,
    trunk: 0x1a0612,
    rock: 0x1a0612,
    sign: '#ff901f',
    treeRatio: 1,
    seed: 21,
    neon: { left: 0xffd319, right: 0xff5a3c },
    skyStops: ['#12030f', '#3a0b2e', '#a3245a', '#ff901f'],
    sunStops: ['#fff2a8', '#ffb347', '#ff5a3c'],
    grid: 0xff901f,
    mountain: 0xff901f,
    palm: 0x1a0612,
  },
  summit: {
    sky: 0x1a1660,
    fogNear: 60,
    fogFar: 230,
    ground: 0x030520,
    road: [0x0d0a2e, 0x110d38],
    wall: [0x2de2e6, 0x7a5cff],
    lane: 0xeef4ff,
    leaf: 0x060a26,
    trunk: 0x060a26,
    rock: 0x060a26,
    sign: '#2de2e6',
    treeRatio: 1,
    seed: 42,
    neon: { left: 0x2de2e6, right: 0x7a5cff },
    skyStops: ['#030520', '#0d0a3a', '#3a2a9a', '#2de2e6'],
    sunStops: ['#ffffff', '#9ad8ff', '#7a5cff'],
    grid: 0x2de2e6,
    mountain: 0x9ad8ff,
    palm: 0x060a26,
  },
};
