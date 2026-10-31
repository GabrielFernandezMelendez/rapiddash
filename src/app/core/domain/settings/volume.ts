/** Volumen de cada canal, de 0 (silencio) a 1 (máximo). */
export interface Volumes {
  readonly music: number;
  readonly effects: number;
}

export type VolumeChannel = keyof Volumes;

export const DEFAULT_VOLUMES: Volumes = { music: 1, effects: 1 };

/** Lo que venga de almacenamiento o del slider, siempre entre 0 y 1. */
export function clampVolume(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : 1;
}

export function toVolumes(value: unknown): Volumes {
  const v = (value ?? {}) as Partial<Record<VolumeChannel, unknown>>;
  return { music: clampVolume(v.music ?? 1), effects: clampVolume(v.effects ?? 1) };
}

/** El slider va de 0 a 100 %. */
export function toPercent(volume: number): number {
  return Math.round(clampVolume(volume) * 100);
}
