import { TRACK_HALF_WIDTH } from '../track/track-constants';

// Parámetros de conducción. Velocidades en m/s, ángulos en radianes.
export const CAR_TUNING = {
  maxSpeed: 26,
  acceleration: 9,
  /** Pérdida de velocidad al soltar el dedo. */
  coastDrag: 3,
  /** Velocidad mínima mientras el coche está girado: sin ella se quedaría bloqueado. */
  crawlSpeed: 4,
  /** Velocidad para salir del muro tras un choque. */
  recoverySpeed: 5,
  /** Velocidad de giro del morro hacia el ángulo objetivo. */
  turnRate: 14,
  /**
   * Metros antes del cruce en los que girar hacia la salida todavía cuenta como entrar en él.
   * Antes de ese punto, el giro lleva contra el muro lateral.
   */
  junctionEarlyEntry: 1.5,
  /** Curvatura (1/radio) por debajo de la cual no hay magnetismo. */
  magnetThreshold: 1 / 80,
  /** Intensidad del magnetismo: desvío lateral = exceso de curvatura × velocidad × ganancia. */
  magnetGain: 30,
  /** Sin acelerar el coche se agarra al suelo: el magnetismo de la curva se reduce a esta fracción. */
  coastMagnetFactor: 0.35,
  /** Imán de carril: con el morro recto el coche se centra en el carril más cercano. */
  laneSpring: 14,
  /**
   * Velocidad lateral máxima del imán de carril (m/s). Si el magnetismo de la curva la supera
   * (solo pasa acelerando), el coche va saltando de carril hacia el muro exterior.
   */
  lanePull: 5,
  carHalfWidth: 0.75,
  carHalfLength: 1.3,
} as const;

/** Desplazamiento lateral máximo antes de tocar el muro. */
export const WALL_LIMIT = TRACK_HALF_WIDTH - CAR_TUNING.carHalfWidth;
export const QUARTER_TURN = Math.PI / 2;
