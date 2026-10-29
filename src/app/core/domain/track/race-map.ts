import { left, right, sCurve, straight, arc, TrackSegment } from './track-segment';

export type MapId = 'bay' | 'canyon' | 'summit';
export type MapTheme = 'bay' | 'canyon' | 'summit';

export interface RaceMap {
  readonly id: MapId;
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

export function findMap(id: string): RaceMap | undefined {
  return RACE_MAPS.find((m) => m.id === id);
}
