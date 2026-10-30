/**
 * Estética del juego, elegida en Ajustes. No cambia la física ni los mapas, solo cómo se ven.
 * - classic: el aspecto original (asfalto, árboles y cielo claro).
 * - retro: mundo synthwave con el deportivo de los 80.
 * - futurist: el mismo mundo synthwave con la nave.
 */
export const AESTHETICS = ['classic', 'retro', 'futurist'] as const;
export type Aesthetic = (typeof AESTHETICS)[number];

export const DEFAULT_AESTHETIC: Aesthetic = 'classic';

export const isAesthetic = (value: unknown): value is Aesthetic =>
  typeof value === 'string' && (AESTHETICS as readonly string[]).includes(value);

/** Retro y futurista comparten el mundo synthwave; solo cambia el vehículo. */
export const isSynthwave = (aesthetic: Aesthetic): boolean => aesthetic !== 'classic';
