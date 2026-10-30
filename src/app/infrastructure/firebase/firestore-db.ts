import { getAuth } from 'firebase/auth';
import {
  Firestore,
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
} from 'firebase/firestore';
import { firebaseApp } from './firebase-app';

let db: Firestore | null = null;

/**
 * Firestore con caché en el dispositivo: sin red se leen los últimos datos (ranking, perfil) y
 * las escrituras quedan en cola hasta que vuelva la conexión, aunque se cierre el juego.
 * Espera a que Auth restaure la sesión: las reglas necesitan saber quién pregunta.
 */
export async function firestore(): Promise<Firestore> {
  const app = firebaseApp();
  await getAuth(app).authStateReady();
  db ??= createDb();
  return db;
}

function createDb(): Firestore {
  const app = firebaseApp();
  try {
    return initializeFirestore(app, {
      localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
    });
  } catch {
    // Ya inicializado o sin IndexedDB (modo privado): Firestore normal, sin caché persistente
    return getFirestore(app);
  }
}
