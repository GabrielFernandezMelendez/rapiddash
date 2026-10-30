/** 1 = derecha, -1 = izquierda (vista desde el coche). */
export type TurnDirection = 1 | -1;

/**
 * Piezas con las que se describe un mapa.
 * - straight: recta.
 * - corner: cruce cuadrado de 90°; el swipe en el cruce decide por qué carril sales.
 * - arc: curva suave; no se gira, pero el magnetismo empuja hacia el muro exterior.
 */
export type TrackSegment =
  | { readonly kind: 'straight'; readonly length: number }
  | { readonly kind: 'corner'; readonly direction: TurnDirection }
  | { readonly kind: 'arc'; readonly angleDeg: number; readonly radius: number };

export type SegmentKind = TrackSegment['kind'];

// Atajos para escribir mapas de forma legible.
export const straight = (length: number): TrackSegment => ({ kind: 'straight', length });
export const right = (): TrackSegment => ({ kind: 'corner', direction: 1 });
export const left = (): TrackSegment => ({ kind: 'corner', direction: -1 });
export const arc = (angleDeg: number, radius: number): TrackSegment => ({
  kind: 'arc',
  angleDeg,
  radius,
});
/** Curva en S: dos arcos opuestos, el rumbo final no cambia. */
export const sCurve = (angleDeg: number, radius: number): TrackSegment[] => [
  arc(angleDeg, radius),
  arc(-angleDeg, radius),
];
