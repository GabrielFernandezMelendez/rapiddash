import { BestRun } from './ghost';

/**
 * Versión de la física y de los mapas. Un tiempo solo es comparable con otro de la misma
 * versión: si cambias la física del coche o el trazado de un mapa, súbela y los récords
 * (locales y online) se reinician.
 *
 * 1-2: versiones sin campo (la clave local llevaba la versión). 3: embudos y roce.
 * 4: agarre en las curvas (el coche se abre de forma continua) y sin golpe al cambiar al carril
 * exterior (rama de pruebas: sus récords no se mezclan con los de la 3).
 */
export const PHYSICS_VERSION = 4;

/**
 * Rama de pruebas de física: los récords se quedan en el móvil y no se suben a la nube (las
 * reglas dejan que un récord de una versión más nueva pise al de la anterior, y los testers
 * perderían sus marcas de verdad). Al pasar a main se quita.
 */
export const PHYSICS_EXPERIMENT = true;

/** El récord se hizo con la física actual: se puede cargar como fantasma y como marca a batir. */
export function isCurrentPhysics(run: Pick<BestRun, 'physicsVersion'>): boolean {
  return run.physicsVersion === PHYSICS_VERSION;
}
