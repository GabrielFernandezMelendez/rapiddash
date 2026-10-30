import { AuthError } from '../../../core/application/ports/out/auth.port';

/** Clave i18n del error; null si no hay que enseñar nada (el jugador cerró la ventana de Google). */
export function authErrorKey(error: unknown): string | null {
  if (error instanceof AuthError) {
    return error.code === 'popup-closed' ? null : `auth.error.${error.code}`;
  }
  console.error('[cuenta]', error);
  return 'auth.error.unknown';
}
