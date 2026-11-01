/** 38.6244 → "0:38.624" (tres decimales: milésimas) */
export function formatTime(seconds: number): string {
  // Se redondea a milésimas antes de partir en minutos: 59.9996 → "1:00.000", no "0:60.000"
  const ms = Math.round(Math.max(0, seconds) * 1000);
  const minutes = Math.floor(ms / 60000);
  const rest = (ms - minutes * 60000) / 1000;
  return `${minutes}:${rest.toFixed(3).padStart(6, '0')}`;
}

/** Hueco de un tiempo que aún no hay, con el mismo ancho: «–:––.–––». */
export const NO_TIME = '–:––.–––';

/** -0.42 → "−0.42", 1.2 → "+1.20" */
export function formatDelta(seconds: number): string {
  return `${seconds < 0 ? '−' : '+'}${Math.abs(seconds).toFixed(2)}`;
}
