import { APP_VERSION } from './app-version';

/** Claves de i18n de las novedades de esta versión, en orden. */
export const PATCH_NOTES = ['patch.content', 'patch.restart'] as const;

/** Las novedades salen solas una vez por versión: la primera vez y tras cada actualización. */
export function showPatchNotes(seen: string | null, version: string = APP_VERSION): boolean {
  return seen !== version;
}
