import { left, right, sCurve, straight, arc, TrackSegment, TurnDirection } from './track-segment';

export type MapId = 'bay' | 'canyon' | 'summit' | 'bay-zigzag' | 'canyon-zigzag' | 'summit-zigzag';
export type MapTheme = 'bay' | 'canyon' | 'summit';

/**
 * - classic: cruces sueltos separados por tramos largos.
 * - zigzag: además, series de cruces seguidos (reto de destreza).
 */
export type MapLayout = 'classic' | 'zigzag';

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
      straight(70),
    ],
  },
];

export const ALL_MAPS: readonly RaceMap[] = [...RACE_MAPS, ...ZIGZAG_MAPS];

export function findMap(id: string): RaceMap | undefined {
  return ALL_MAPS.find((m) => m.id === id);
}
