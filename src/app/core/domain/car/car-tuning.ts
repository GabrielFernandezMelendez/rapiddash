import { TRACK_HALF_WIDTH } from '../track/track-constants';

/**
 * Modelo de las curvas:
 * - grip: física de agarre. La curva pide v²·curvatura de aceleración lateral; si pasa del agarre
 *   y se va acelerando, el coche no gira tanto como la carretera y se abre de forma continua
 *   hacia el muro exterior (sin imán de carril mientras derrapa). Soltando, recupera el agarre y
 *   el imán lo devuelve al carril más cercano. En recta, siempre recto.
 * - magnet: el de antes. Desvío lineal con la velocidad contra el imán de carril, que hace que el
 *   coche salte de carril a tramos.
 */
export type CurveModel = 'grip' | 'magnet';

// Parámetros de conducción. Velocidades en m/s, ángulos en radianes.
export const CAR_TUNING = {
  curveModel: 'grip' as CurveModel,
  /** Agarre lateral máximo (m/s²) del modelo de agarre: por encima, el coche se abre. */
  gripAccel: 16,
  /** Cuánto empuja hacia fuera el exceso sobre el agarre (1 = físico). */
  slideGain: 1,
  /** Con qué rapidez se frena el derrape lateral al recuperar el agarre (1/s). */
  slideRecovery: 8,
  maxSpeed: 26,
  acceleration: 9,
  /** Pérdida de velocidad al soltar el dedo. */
  coastDrag: 3,
  /** Velocidad mínima mientras el coche está girado en un cruce: sin ella se quedaría bloqueado. */
  crawlSpeed: 4,
  /**
   * Cambio de carril (swipe fuera del cruce): muelle con poco amortiguamiento, para que llegue
   * rápido (~0,2 s), se pase un poco del carril y rebote hasta asentarse. Frecuencia en rad/s.
   */
  laneChangeFrequency: 13,
  /** < 1 rebota; 0,5 se pasa del carril un ~16 % y se asienta en ~0,5 s. */
  laneChangeDamping: 0.5,
  /** Cerca del carril destino (m) ya se acepta otro swipe, aunque siga rebotando. */
  laneChangeRetarget: 0.5,
  /** Al golpear el muro en un cambio de carril, fracción de la velocidad lateral con la que rebota. */
  bumpBounce: 0.45,
  /** Golpecito al cambiar de carril contra el muro: fracción de velocidad que conserva. */
  bumpKeep: 0.8,
  /** Choque frontal en un cruce: velocidad con la que pivota y sale hacia la nueva carretera. */
  frontRecoverySpeed: 10,
  /** Duración del giro automático hacia la salida tras un choque frontal (s). */
  frontRecoveryTime: 0.6,
  /** Rozamiento contra el muro (m/s²): empieza suave y crece mientras dura el roce. */
  scrapeFrictionStart: 4,
  scrapeFrictionMax: 14,
  /** Rozamiento en un tramo estrecho (embudo): la pared entra en ángulo y frena más. */
  taperFrictionStart: 8,
  taperFrictionMax: 20,
  /** Segundos de roce hasta alcanzar el rozamiento máximo. */
  scrapeRampTime: 1,
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
};

export type CarTuning = typeof CAR_TUNING;

let active: CarTuning = CAR_TUNING;

/** Parámetros en uso: los de serie o los del laboratorio de física (solo en debug). */
export const tuning = (): CarTuning => active;

/** Cambia los parámetros en uso; null = los de serie. */
export function setActiveTuning(overrides: Partial<CarTuning> | null): void {
  active = overrides ? { ...CAR_TUNING, ...overrides } : CAR_TUNING;
}

/** ¿Se corre con parámetros distintos de los de serie? (entonces no cuentan los récords) */
export const isCustomTuning = (): boolean =>
  (Object.keys(CAR_TUNING) as (keyof CarTuning)[]).some((k) => active[k] !== CAR_TUNING[k]);

/** Desplazamiento lateral máximo antes de tocar el muro. */
export const WALL_LIMIT = TRACK_HALF_WIDTH - CAR_TUNING.carHalfWidth;
export const QUARTER_TURN = Math.PI / 2;
