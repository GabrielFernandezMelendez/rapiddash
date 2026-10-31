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
    // Curvas en S en lugar de rectas, una curva de 90° en dos tramos y un embudo
    segments: [
      straight(26), ...sCurve(30, 45), straight(4), right(), straight(4), narrow(12), straight(4),
      widen(12), straight(4), arc(45, 45), straight(4), arc(45, 45), straight(4), right(),
      straight(4), left(), straight(4), ...sCurve(-25, 40), straight(4), right(), straight(52),
      ...sCurve(20, 40), straight(4), right(), straight(20),
    ],
  },
  {
    id: 'canyon-ring',
    layout: 'laps',
    nameKey: 'maps.canyonRing',
    difficulty: 2,
    theme: 'canyon',
    // Gran curva en dos tramos (60° + 30°), dos embudos y escalones en las rectas
    segments: [
      straight(9.5), ...sCurve(-30, 40), narrow(10), straight(18), widen(10), right(),
      straight(18), right(), straight(8.5), left(), straight(7), straight(25), arc(60, 35),
      straight(7), arc(30, 35), straight(42.5), right(), straight(10.5), narrow(8), straight(7),
      left(), straight(7), right(), widen(8), straight(1), ...sCurve(30, 35), straight(7),
      right(), straight(14),
    ],
  },
  {
    id: 'summit-gp',
    layout: 'laps',
    nameKey: 'maps.summitGp',
    difficulty: 3,
    theme: 'summit',
    // Horquilla, greca estrecha y curva en S dentro de un embudo
    segments: [
      straight(71.5), ...sCurve(35, 35), straight(4), right(), straight(4), right(), straight(4),
      narrow(6), straight(4), left(), straight(4), right(), straight(4), left(), widen(8),
      straight(4), arc(50, 35), straight(4), arc(40, 35), straight(4), right(), straight(4),
      left(), straight(4), narrow(12), ...sCurve(-30, 30), straight(4), widen(12), right(),
      straight(39), ...sCurve(25, 35), straight(4), right(), straight(20),
    ],
  },
  {
    id: 'lighthouse-oval',
    layout: 'laps',
    nameKey: 'maps.lighthouseOval',
    difficulty: 1,
    theme: 'bay',
    // Curvas en S y dos curvas de 45° en vez de esquinas; dos embudos
    segments: [
      straight(14), ...sCurve(20, 45), straight(4), narrow(20), straight(4), widen(15), right(),
      straight(5), left(), straight(4), right(), straight(4), arc(45, 30), straight(4),
      arc(45, 30), straight(4), ...sCurve(-30, 40), narrow(10), straight(4), widen(10),
      arc(90, 30), straight(39), right(), straight(17.5),
    ],
  },
  {
    id: 'desert-horseshoe',
    layout: 'laps',
    nameKey: 'maps.desertHorseshoe',
    difficulty: 1,
    theme: 'canyon',
    // Gran curva de 90° y curvas en S dentro de los embudos
    segments: [
      straight(14), ...sCurve(-25, 40), arc(90, 35), straight(4), narrow(15), ...sCurve(30, 35),
      widen(15), straight(4), right(), straight(4), right(), straight(4), left(), straight(4),
      ...sCurve(-35, 40), straight(4), narrow(10), straight(4), widen(10), right(), straight(57),
      ...sCurve(25, 40), straight(4), right(), straight(18),
    ],
  },
  {
    id: 'glacier-loop',
    layout: 'laps',
    nameKey: 'maps.glacierLoop',
    difficulty: 2,
    theme: 'summit',
    // Diagonal con dos curvas de 45° y un embudo largo
    segments: [
      straight(34.5), arc(45, 40), straight(5.5), narrow(20), straight(4.5), arc(45, 40),
      widen(15), straight(4), right(), straight(4.5), left(), straight(4), right(), straight(4),
      ...sCurve(30, 35), narrow(8), straight(4.5), widen(8), arc(90, 30), straight(12),
      ...sCurve(-30, 40), straight(4), right(), straight(20),
    ],
  },
  {
    id: 'neon-snake',
    layout: 'laps',
    nameKey: 'maps.neonSnake',
    difficulty: 3,
    theme: 'bay',
    // Greca: 4 cruces con 9 m de carril entre medias y luego 6 seguidos, sin carril entre cruces
    segments: [
      straight(14), ...sCurve(25, 45), straight(18.5), narrow(15), straight(12.5), widen(15),
      right(), straight(21), right(), straight(12.5), left(), straight(7.5), right(),
      straight(7.5), left(), straight(7.5), right(), straight(7.5), left(), right(), left(),
      right(), left(), right(), straight(37.5), right(), straight(44.5), ...sCurve(-25, 45),
      straight(17), right(), straight(15.5),
    ],
  },
  {
    id: 'canyon-maze',
    layout: 'laps',
    nameKey: 'maps.canyonMaze',
    difficulty: 2,
    theme: 'canyon',
    // Escalones con embudos abruptos entre curvas
    segments: [
      straight(32.5), ...sCurve(30, 40), right(), straight(9.5), narrow(8), straight(4.5), left(),
      straight(7), right(), widen(8), straight(9.5), arc(45, 35), straight(4.5), arc(45, 35),
      straight(7), right(), straight(5.5), left(), straight(4.5), ...sCurve(-30, 35), right(),
      straight(7), left(), straight(4.5), narrow(10), right(), straight(4.5), widen(10),
      straight(14), ...sCurve(25, 40), straight(4.5), right(), straight(20),
    ],
  },
  {
    id: 'summit-stairs',
    layout: 'laps',
    nameKey: 'maps.summitStairs',
    difficulty: 3,
    theme: 'summit',
    // Escaleras arriba y abajo con cruces de 3 carriles
    segments: [
      straight(32.5), right(), straight(9.5), left(), straight(9.5), narrow(6), straight(6),
      right(), straight(8), left(), straight(8), widen(6), right(), straight(11.5),
      ...sCurve(30, 35), straight(8), arc(90, 35), right(), straight(8), left(), straight(8),
      narrow(8), straight(6), right(), straight(8), left(), widen(8), straight(11.5), right(),
      straight(52), ...sCurve(-25, 40), right(), straight(20),
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
