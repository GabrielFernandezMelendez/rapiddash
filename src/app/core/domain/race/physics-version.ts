import { BestRun } from './ghost';

/**
 * Versión de la física y de los mapas. Un tiempo solo es comparable con otro de la misma
 * versión: si cambias la física del coche o el trazado de un mapa, súbela y los récords
 * (locales y online) se reinician.
 *
 * 1-2: versiones sin campo (la clave local llevaba la versión). 3: embudos y roce.
 */
export const PHYSICS_VERSION = 3;

/** El récord se hizo con la física actual: se puede cargar como fantasma y como marca a batir. */
export function isCurrentPhysics(run: Pick<BestRun, 'physicsVersion'>): boolean {
  return run.physicsVersion === PHYSICS_VERSION;
}
