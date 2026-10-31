/**
 * Reinicio de los datos guardados en el móvil (piloto, récords, sesión). Se sube cuando se
 * borran los datos de la nube (usuarios, tiempos…) para que ningún móvil conserve lo antiguo
 * ni vuelva a subirlo. Los ajustes (idioma, estética, volumen, tutorial) se conservan.
 */
export const DATA_RESET_VERSION = 1;

/** ¿Hay que limpiar? Sí si este móvil no ha aplicado todavía el reinicio actual. */
export function needsDataReset(applied: string | null, current: number = DATA_RESET_VERSION): boolean {
  const n = Number(applied);
  return applied === null || !Number.isInteger(n) || n < current;
}
