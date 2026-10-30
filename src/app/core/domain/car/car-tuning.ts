import { TRACK_HALF_WIDTH } from '../track/track-constants';

// Parámetros de conducción. Velocidades en m/s, ángulos en radianes.
export const CAR_TUNING = {
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
} as const;

/** Desplazamiento lateral máximo antes de tocar el muro. */
export const WALL_LIMIT = TRACK_HALF_WIDTH - CAR_TUNING.carHalfWidth;
export const QUARTER_TURN = Math.PI / 2;
