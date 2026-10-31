import {
  arc,
  left,
  narrow,
  right,
  sCurve,
  straight,
  TrackSegment,
  TurnDirection,
  widen,
} from './track-segment';
import { CIRCUIT_LAPS } from './track-constants';
import { Track } from './track';

export type MapId =
  | 'bay'
  | 'canyon'
  | 'summit'
  | 'bay-zigzag'
  | 'canyon-zigzag'
  | 'summit-zigzag'
  | 'port-loop'
  | 'canyon-ring'
  | 'summit-gp'
  | 'lighthouse-oval'
  | 'desert-horseshoe'
  | 'glacier-loop'
  | 'neon-snake'
  | 'canyon-maze'
  | 'summit-stairs';
export type MapTheme = 'bay' | 'canyon' | 'summit';

/**
 * - classic: cruces sueltos separados por tramos largos.
 * - zigzag: además, series de cruces seguidos (reto de destreza).
 * - laps: circuito cerrado de 3 vueltas (salida y meta en la misma línea).
 */
export type MapLayout = 'classic' | 'zigzag' | 'laps';

export interface RaceMap {
  readonly id: MapId;
  readonly layout: MapLayout;
  /** Clave i18n del nombre. */
  readonly nameKey: string;
  /** 1 = fácil, 3 = difícil. */
  readonly difficulty: 1 | 2 | 3;
  readonly theme: MapTheme;
  readonly segments: readonly TrackSegment[];
}

// Los mapas avanzan en "escalera" (norte, este u oeste, nunca hacia atrás) para que la pista
// no se cruce consigo misma. El test race-map.spec.ts lo comprueba.
// Cada mapa tiene dos mitades: la primera es la original; la segunda añade embudos de 5 a 3
// carriles (abruptos de 6-8 m, medios de 10-15 m y largos de 20-25 m), tramos estrechos con
// curvas y cruces de 3 carriles, y ensanches de vuelta a 5.
export const RACE_MAPS: readonly RaceMap[] = [
  {
    id: 'bay',
    layout: 'classic',
    nameKey: 'maps.bay',
    difficulty: 1,
    theme: 'bay',
    segments: [
      straight(60),
      right(),
      straight(45),
      ...sCurve(30, 50),
      straight(30),
      left(),
      straight(60),
      right(),
      straight(40),
      ...sCurve(-30, 45),
      straight(25),
      left(),
      straight(50),
      right(),
      // Segunda mitad
      straight(35),
      narrow(25),
      straight(25),
      left(),
      straight(25),
      widen(15),
      straight(20),
      ...sCurve(30, 50),
      straight(30),
      right(),
      straight(30),
      narrow(12),
      straight(30),
      left(),
      straight(25),
      widen(12),
      straight(30),
      right(),
      straight(40),
      narrow(15),
      straight(30),
      widen(20),
      straight(70),
    ],
  },
  {
    id: 'canyon',
    layout: 'classic',
    nameKey: 'maps.canyon',
    difficulty: 2,
    theme: 'canyon',
    segments: [
      straight(50),
      left(),
      straight(40),
      ...sCurve(35, 42),
      straight(20),
      right(),
      straight(50),
      right(),
      straight(30),
      ...sCurve(-40, 40),
      straight(20),
      left(),
      straight(45),
      arc(-30, 40),
      arc(30, 40),
      straight(30),
      left(),
      straight(55),
      right(),
      // Segunda mitad
      straight(30),
      narrow(12),
      straight(25),
      left(),
      straight(25),
      ...sCurve(35, 42),
      straight(15),
      widen(10),
      straight(35),
      right(),
      straight(40),
      narrow(6),
      straight(25),
      left(),
      straight(25),
      widen(20),
      straight(30),
      arc(-30, 40),
      arc(30, 40),
      straight(25),
      right(),
      straight(45),
      narrow(8),
      straight(20),
      ...sCurve(-30, 45),
      straight(20),
      widen(8),
      straight(30),
      left(),
      straight(30),
      narrow(25),
      straight(30),
      widen(15),
      straight(70),
    ],
  },
  {
    id: 'summit',
    layout: 'classic',
    nameKey: 'maps.summit',
    difficulty: 3,
    theme: 'summit',
    segments: [
      straight(40),
      right(),
      straight(30),
      ...sCurve(45, 35),
      straight(15),
      left(),
      straight(35),
      ...sCurve(-45, 35),
      straight(15),
      left(),
      straight(30),
      right(),
      straight(25),
      ...sCurve(40, 34),
      ...sCurve(-40, 34),
      straight(15),
      right(),
      straight(35),
      left(),
      straight(25),
      ...sCurve(45, 33),
      straight(20),
      left(),
      straight(40),
      right(),
      // Segunda mitad
      straight(30),
      narrow(6),
      straight(15),
      left(),
      straight(20),
      ...sCurve(40, 34),
      straight(10),
      right(),
      straight(25),
      widen(6),
      straight(20),
      ...sCurve(-45, 33),
      straight(15),
      left(),
      straight(30),
      narrow(15),
      straight(20),
      right(),
      straight(15),
      ...sCurve(-40, 34),
      straight(10),
      left(),
      straight(20),
      widen(8),
      straight(25),
      ...sCurve(45, 33),
      ...sCurve(-45, 33),
      straight(15),
      right(),
      straight(30),
      narrow(8),
      straight(15),
      left(),
      straight(20),
      ...sCurve(35, 36),
      straight(15),
      right(),
      straight(20),
      widen(25),
      straight(70),
    ],
  },
];

/**
 * Serie de `count` cruces seguidos en zigzag, separados por tramos cortos de `gap` metros.
 * Empieza girando hacia `first` y alterna; así la pista sigue en escalera y no se cruza.
 */
export function zigzag(count: number, first: TurnDirection, gap: number): TrackSegment[] {
  const out: TrackSegment[] = [];
  for (let i = 0; i < count; i++) {
    out.push((i % 2 === 0) === (first === 1) ? right() : left());
    if (i < count - 1) out.push(straight(gap));
  }
  return out;
}

// Versiones zigzag de los tres mapas: mismo ambiente y tramos curvos para el magnetismo, con
// series de cruces seguidos al final de las rectas. Todos los giros alternan derecha/izquierda.
export const ZIGZAG_MAPS: readonly RaceMap[] = [
  {
    id: 'bay-zigzag',
    layout: 'zigzag',
    nameKey: 'maps.bayZigzag',
    difficulty: 1,
    theme: 'bay',
    segments: [
      straight(60),
      ...zigzag(3, 1, 16),
      straight(45),
      ...sCurve(30, 50),
      straight(30),
      left(),
      straight(50),
      ...sCurve(-30, 45),
      straight(25),
      ...zigzag(4, 1, 15),
      // Segunda mitad
      straight(45),
      narrow(20),
      straight(30),
      ...zigzag(3, -1, 14),
      straight(20),
      widen(12),
      straight(35),
      ...sCurve(-30, 45),
      straight(25),
      ...zigzag(4, -1, 15),
      straight(30),
      narrow(15),
      straight(30),
      left(),
      straight(25),
      widen(15),
      straight(30),
      ...zigzag(3, 1, 16),
      straight(70),
    ],
  },
  {
    id: 'canyon-zigzag',
    layout: 'zigzag',
    nameKey: 'maps.canyonZigzag',
    difficulty: 2,
    theme: 'canyon',
    segments: [
      straight(50),
      left(),
      straight(40),
      ...sCurve(35, 42),
      straight(20),
      ...zigzag(5, 1, 13),
      straight(45),
      arc(-30, 40),
      arc(30, 40),
      straight(30),
      ...zigzag(3, -1, 14),
      straight(40),
      ...sCurve(-35, 40),
      straight(20),
      right(),
      // Segunda mitad
      straight(35),
      narrow(10),
      straight(25),
      left(),
      straight(25),
      ...sCurve(35, 42),
      straight(15),
      widen(10),
      straight(20),
      ...zigzag(5, 1, 13),
      straight(30),
      narrow(6),
      straight(25),
      left(),
      straight(30),
      widen(15),
      straight(30),
      arc(30, 40),
      arc(-30, 40),
      straight(20),
      ...zigzag(3, 1, 14),
      straight(25),
      narrow(20),
      straight(20),
      ...zigzag(3, -1, 14),
      straight(20),
      widen(10),
      straight(70),
    ],
  },
  {
    id: 'summit-zigzag',
    layout: 'zigzag',
    nameKey: 'maps.summitZigzag',
    difficulty: 3,
    theme: 'summit',
    segments: [
      straight(40),
      right(),
      straight(30),
      ...sCurve(45, 35),
      straight(15),
      left(),
      straight(35),
      ...sCurve(-45, 35),
      straight(15),
      ...zigzag(8, 1, 12),
      straight(25),
      ...sCurve(40, 34),
      ...sCurve(-40, 34),
      straight(15),
      ...zigzag(6, 1, 11),
      // Segunda mitad
      straight(30),
      narrow(8),
      straight(20),
      ...zigzag(4, 1, 12),
      straight(15),
      widen(8),
      straight(20),
      ...sCurve(40, 34),
      straight(15),
      ...zigzag(6, 1, 11),
      straight(25),
      narrow(20),
      straight(25),
      ...sCurve(-35, 36),
      straight(15),
      ...zigzag(3, 1, 12),
      straight(20),
      widen(6),
      straight(25),
      ...sCurve(45, 33),
      ...sCurve(-45, 33),
      straight(15),
      ...zigzag(5, 1, 11),
      straight(70),
    ],
  },
];

// Circuitos por vueltas: cada lista es UNA vuelta, en sentido horario (los giros suman 360°), y
// acaba en una recta que vuelve a la salida. Se dan CIRCUIT_LAPS vueltas. Las longitudes salen de
// cerrar cada trazado con el código real (race-map.spec.ts comprueba que cierran y no se pisan).
// Son experimentos para los testers: se ajustarán con lo que digan.
export const CIRCUIT_MAPS: readonly RaceMap[] = [
  {
    id: 'port-loop',
    layout: 'laps',
    nameKey: 'maps.portLoop',
    difficulty: 1,
    theme: 'bay',
    // Rectángulo con dos curvas en S en las rectas largas
    segments: [
      straight(25), ...sCurve(25, 40), straight(20), right(), straight(35), right(),
      straight(55), ...sCurve(25, 40), straight(10), right(), straight(35), right(), straight(20),
    ],
  },
  {
    id: 'canyon-ring',
    layout: 'laps',
    nameKey: 'maps.canyonRing',
    difficulty: 2,
    theme: 'canyon',
    // Curva amplia de 90°, un giro a la izquierda y un embudo a 3 carriles
    segments: [
      straight(20), ...sCurve(-20, 40), straight(51), right(), straight(30), arc(90, 28),
      straight(20), right(), straight(25), left(), straight(15), narrow(10), straight(20),
      widen(10), straight(10), right(), straight(11.5), right(), straight(20),
    ],
  },
  {
    id: 'summit-gp',
    layout: 'laps',
    nameKey: 'maps.summitGp',
    difficulty: 3,
    theme: 'summit',
    // Horquilla (dos derechas a 12 m) y greca estrecha en zigzag
    segments: [
      straight(15), ...sCurve(25, 35), straight(64), right(), straight(12), right(), straight(18),
      left(), straight(12), narrow(6), straight(8), right(), straight(10), left(), straight(10),
      right(), straight(8), widen(8), straight(15), ...sCurve(-30, 30), straight(20), right(),
      straight(78), right(), straight(15),
    ],
  },
  {
    id: 'lighthouse-oval',
    layout: 'laps',
    nameKey: 'maps.lighthouseOval',
    difficulty: 1,
    theme: 'bay',
    // Solo 2 cruces: el resto del giro son dos curvas amplias de 90°
    segments: [
      straight(18.5), ...sCurve(20, 45), straight(30), right(), straight(40), arc(90, 30),
      straight(50), arc(90, 30), straight(45), right(), straight(20),
    ],
  },
  {
    id: 'desert-horseshoe',
    layout: 'laps',
    nameKey: 'maps.desertHorseshoe',
    difficulty: 1,
    theme: 'canyon',
    // 3 cruces y una curva amplia de 90°
    segments: [
      straight(59.5), arc(90, 35), straight(45), right(), straight(30), ...sCurve(-25, 40),
      straight(40), right(), straight(82), right(), straight(15),
    ],
  },
  {
    id: 'glacier-loop',
    layout: 'laps',
    nameKey: 'maps.glacierLoop',
    difficulty: 2,
    theme: 'summit',
    // 2 cruces, una diagonal con dos curvas de 45° y un embudo largo
    segments: [
      straight(41), arc(45, 40), straight(35), arc(45, 40), straight(45), right(), straight(25),
      narrow(12), straight(25), widen(12), straight(20), arc(90, 30), straight(30),
      ...sCurve(-25, 35), straight(20), right(), straight(25),
    ],
  },
  {
    id: 'neon-snake',
    layout: 'laps',
    nameKey: 'maps.neonSnake',
    difficulty: 3,
    theme: 'bay',
    // Greca en zigzag constante: 8 cruces seguidos cada 9 m
    segments: [
      straight(100), right(), straight(30), right(), straight(15), ...zigzag(8, -1, 9),
      straight(29), right(), straight(110), right(), straight(15),
    ],
  },
  {
    id: 'canyon-maze',
    layout: 'laps',
    nameKey: 'maps.canyonMaze',
    difficulty: 2,
    theme: 'canyon',
    // Escalones, una curva en S y dos rectas largas para recuperar
    segments: [
      straight(69.5), right(), straight(25), left(), straight(20), right(), straight(30), right(),
      straight(15), arc(-45, 30), straight(10), arc(45, 30), straight(20), right(), straight(15),
      left(), straight(15), right(), straight(64.5), right(), straight(10),
    ],
  },
  {
    id: 'summit-stairs',
    layout: 'laps',
    nameKey: 'maps.summitStairs',
    difficulty: 3,
    theme: 'summit',
    // Escaleras arriba y abajo con dos embudos abruptos a 3 carriles
    segments: [
      straight(16), right(), straight(15), left(), straight(15), right(), straight(15), left(),
      narrow(8), straight(10), right(), straight(50), right(), straight(12), widen(8),
      straight(12), right(), straight(20), left(), straight(40), right(), straight(66.5), right(),
      straight(12),
    ],
  },
];

export const ALL_MAPS: readonly RaceMap[] = [...RACE_MAPS, ...ZIGZAG_MAPS, ...CIRCUIT_MAPS];

export const isCircuit = (map: RaceMap): boolean => map.layout === 'laps';

/** Pista de la carrera: de ida, o el circuito con sus vueltas. */
export function trackOf(map: RaceMap): Track {
  return isCircuit(map) ? Track.circuit(map.segments, CIRCUIT_LAPS) : Track.fromSegments(map.segments);
}

export function findMap(id: string): RaceMap | undefined {
  return ALL_MAPS.find((m) => m.id === id);
}
