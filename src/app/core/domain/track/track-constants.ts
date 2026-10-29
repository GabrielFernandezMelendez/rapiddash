// Medidas de la pista en metros (unidades del mundo 3D).
export const LANE_COUNT = 5;
export const LANE_WIDTH = 2.2;
/** Distancia del eje central a cada muro. */
export const TRACK_HALF_WIDTH = (LANE_COUNT * LANE_WIDTH) / 2;
/** Radio del eje central en las curvas de 90°. */
export const CORNER_RADIUS = 7.5;
/** Resolución con la que se muestrea la pista. */
export const SAMPLE_STEP = 0.5;
/** Posición de salida y metros que quedan tras la meta para frenar. */
export const START_DISTANCE = 8;
export const FINISH_RUNOFF = 24;
