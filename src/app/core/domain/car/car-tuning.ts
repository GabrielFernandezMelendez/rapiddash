import { TRACK_HALF_WIDTH } from '../track/track-constants';

// Parámetros de conducción. Velocidades en m/s, ángulos en radianes.
export const CAR_TUNING = {
  maxSpeed: 26,
  acceleration: 9,
  /** Pérdida de velocidad al soltar el dedo. */
  coastDrag: 3,
  /** Pérdida de velocidad mientras recorre una curva de 90°. */
  cornerDrag: 2,
  /** Velocidad mínima mientras el coche está girado: sin ella se quedaría bloqueado. */
  crawlSpeed: 4,
  /** Velocidad para salir del muro tras un choque. */
  recoverySpeed: 5,
  /** Velocidad de giro del morro hacia el ángulo objetivo. */
  turnRate: 14,
  /** Metros antes de una curva de 90° en los que el swipe cuenta como tomarla. */
  cornerWindow: 9,
  /** Curvatura (1/radio) por debajo de la cual no hay magnetismo. */
  magnetThreshold: 1 / 80,
  /** Intensidad del magnetismo: desvío lateral = exceso de curvatura × velocidad × ganancia. */
  magnetGain: 18,
  carHalfWidth: 0.75,
} as const;

/** Desplazamiento lateral máximo antes de tocar el muro. */
export const WALL_LIMIT = TRACK_HALF_WIDTH - CAR_TUNING.carHalfWidth;
export const QUARTER_TURN = Math.PI / 2;
