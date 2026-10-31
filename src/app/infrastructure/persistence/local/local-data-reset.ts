import { DATA_RESET_VERSION, needsDataReset } from '../../../core/domain/settings/data-reset';

const APPLIED_KEY = 'rapiddash.dataReset';
/** Ajustes del móvil: sobreviven al reinicio. */
const KEPT_KEYS = new Set([
  APPLIED_KEY,
  'rapiddash.language',
  'rapiddash.aesthetic',
  'rapiddash.volumes',
  'rapiddash.tutorialSeen',
]);
/** Bases de IndexedDB de Firebase (sesión, caché de Firestore…). */
const FIREBASE_DB = /^(firebase|firestore)/;
const KNOWN_FIREBASE_DBS = [
  'firebaseLocalStorageDb',
  'firestore/[DEFAULT]/rapiddash-gabo/main',
  'firebase-heartbeat-database',
  'firebase-installations-database',
];

/**
 * Se ejecuta antes de arrancar Angular (y por tanto antes de cargar Firebase): si toca, borra el
 * piloto, los récords locales y la sesión de Firebase. Nunca bloquea el arranque si algo falla.
 */
export async function resetLocalDataIfNeeded(): Promise<void> {
  try {
    if (!needsDataReset(localStorage.getItem(APPLIED_KEY))) return;
    for (const key of Object.keys(localStorage)) {
      const ours = key.startsWith('rapiddash.') && !KEPT_KEYS.has(key);
      // Firebase guarda la sesión aquí si el navegador no le deja usar IndexedDB
      if (ours || key.startsWith('firebase:')) localStorage.removeItem(key);
    }
    await deleteFirebaseDatabases();
    localStorage.setItem(APPLIED_KEY, String(DATA_RESET_VERSION));
  } catch (e) {
    console.error('[reinicio de datos]', e);
  }
}

async function deleteFirebaseDatabases(): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  // indexedDB.databases() no existe en navegadores antiguos: entonces usamos los nombres conocidos
  const names = indexedDB.databases
    ? (await indexedDB.databases()).map((db) => db.name ?? '').filter((n) => FIREBASE_DB.test(n))
    : KNOWN_FIREBASE_DBS;
  await Promise.all(names.map(deleteDatabase));
}

function deleteDatabase(name: string): Promise<void> {
  return new Promise((resolve) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = request.onerror = request.onblocked = () => resolve();
    // Por si el navegador no responde: el arranque no se queda esperando
    setTimeout(resolve, 1500);
  });
}
