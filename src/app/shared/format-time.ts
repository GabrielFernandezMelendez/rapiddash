/** 38.624 → "0:38.62" */
export function formatTime(seconds: number): string {
  const safe = Math.max(0, seconds);
  const minutes = Math.floor(safe / 60);
  const rest = safe - minutes * 60;
  return `${minutes}:${rest.toFixed(2).padStart(5, '0')}`;
}

/** -0.42 → "−0.42", 1.2 → "+1.20" */
export function formatDelta(seconds: number): string {
  return `${seconds < 0 ? '−' : '+'}${Math.abs(seconds).toFixed(2)}`;
}
