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
  cornerWindow: 12,
  /**
   * Metros dentro de la curva en los que todavía se puede tomar. Pasado este punto el coche
   * choca de frente. Da margen a quien desliza justo cuando ve el coche entrar en la curva.
   */
  cornerGrace: 3.5,
  /** Curvatura (1/radio) por debajo de la cual no hay magnetismo. */
  magnetThreshold: 1 / 80,
  /** Intensidad del magnetismo: desvío lateral = exceso de curvatura × velocidad × ganancia. */
  magnetGain: 18,
  /** Imán de carril: con el morro recto el coche se centra en el carril más cercano. */
  laneSpring: 8,
  /** Velocidad lateral máxima del imán de carril (m/s). Si el magnetismo de la curva lo supera, cambias de carril. */
  lanePull: 2.5,
  carHalfWidth: 0.75,
} as const;

/** Desplazamiento lateral máximo antes de tocar el muro. */
export const WALL_LIMIT = TRACK_HALF_WIDTH - CAR_TUNING.carHalfWidth;
export const QUARTER_TURN = Math.PI / 2;
