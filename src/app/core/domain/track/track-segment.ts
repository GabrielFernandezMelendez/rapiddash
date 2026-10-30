/** 1 = derecha, -1 = izquierda (vista desde el coche). */
export type TurnDirection = 1 | -1;

/**
 * Piezas con las que se describe un mapa.
 * - straight: recta.
 * - corner: cruce cuadrado de 90°; el swipe en el cruce decide por qué carril sales.
 * - arc: curva suave; no se gira, pero el magnetismo empuja hacia el muro exterior.
 * - taper: recta en la que la carretera pasa a `lanes` carriles (embudo o ensanche). Las dos
 *   paredes se mueven a la vez, así el carril central sigue en el eje.
 */
export type TrackSegment =
  | { readonly kind: 'straight'; readonly length: number }
  | { readonly kind: 'taper'; readonly length: number; readonly lanes: 3 | 5 }
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
/** Embudo de 5 a 3 carriles: abrupto (~6 m), medio (~12-15 m) o largo (~25 m). */
export const narrow = (length: number): TrackSegment => ({ kind: 'taper', length, lanes: 3 });
/** Ensanche de 3 a 5 carriles. */
export const widen = (length: number): TrackSegment => ({ kind: 'taper', length, lanes: 5 });
/** Curva en S: dos arcos opuestos, el rumbo final no cambia. */
export const sCurve = (angleDeg: number, radius: number): TrackSegment[] => [
  arc(angleDeg, radius),
  arc(-angleDeg, radius),
];
