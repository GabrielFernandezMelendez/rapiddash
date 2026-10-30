export const NICKNAME_MIN = 3;
export const NICKNAME_MAX = 16;

export type NicknameProblem = 'short' | 'long' | 'chars';

export type NicknameCheck =
  | { readonly ok: true; readonly value: string }
  | { readonly ok: false; readonly problem: NicknameProblem };

// Letras (con tildes y ñ) y números; sin espacios ni símbolos para que se lea bien en el ranking
const ALLOWED = /^[\p{L}\p{N}]+$/u;

/** Valida el apodo tal y como lo escribe el jugador (se recortan los espacios de los extremos). */
export function checkNickname(raw: string): NicknameCheck {
  const value = raw.trim();
  const length = [...value].length;
  if (length < NICKNAME_MIN) return { ok: false, problem: 'short' };
  if (length > NICKNAME_MAX) return { ok: false, problem: 'long' };
  if (!ALLOWED.test(value)) return { ok: false, problem: 'chars' };
  return { ok: true, value };
}

/**
 * Clave única del apodo: sin mayúsculas ni tildes, para que «Gabo» y «gabó» no puedan
 * convivir en el ranking.
 */
export function nicknameKey(nickname: string): string {
  return nickname
    .trim()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('und');
}
