// Medidas de la pista en metros (unidades del mundo 3D).
export const LANE_COUNT = 5;
/** Carriles en los tramos estrechos. Impar: el carril central sigue siempre en el eje. */
export const NARROW_LANE_COUNT = 3;
export const LANE_WIDTH = 2.2;
/** Mitad del ancho de una carretera de `lanes` carriles. */
export const halfWidthFor = (lanes: number): number => (lanes * LANE_WIDTH) / 2;
/** Distancia del eje central a cada muro en la carretera ancha (5 carriles). */
export const TRACK_HALF_WIDTH = halfWidthFor(LANE_COUNT);
/** Lado del cruce cuadrado en la carretera ancha. En un tramo estrecho el cruce es más pequeño. */
export const JUNCTION_SIZE = TRACK_HALF_WIDTH * 2;
/** Resolución con la que se muestrea la pista. */
export const SAMPLE_STEP = 0.5;
/** Posición de salida y metros que quedan tras la meta para frenar. */
export const START_DISTANCE = 8;
export const FINISH_RUNOFF = 24;

/** Centro del carril `index` (0 = el de más a la izquierda de la carretera ancha). */
export const laneCenter = (index: number): number => -TRACK_HALF_WIDTH + LANE_WIDTH * (index + 0.5);

/** Centros de todos los carriles posibles. Los de 3 carriles coinciden con los 3 centrales. */
export const LANE_CENTERS: readonly number[] = Array.from({ length: LANE_COUNT }, (_, i) =>
  laneCenter(i),
);

/**
 * Centro del carril más cercano a un desplazamiento lateral, entre los carriles cuyo centro está
 * a menos de `limit` del eje (por defecto, todos).
 */
export function nearestLaneCenter(lateral: number, limit = TRACK_HALF_WIDTH): number {
  let best = 0;
  for (const c of LANE_CENTERS) {
    if (Math.abs(c) > limit + 0.01) continue;
    if (Math.abs(c - lateral) < Math.abs(best - lateral)) best = c;
  }
  return best;
}
