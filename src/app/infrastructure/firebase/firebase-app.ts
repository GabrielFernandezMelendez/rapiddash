import { FirebaseApp, getApps, initializeApp } from 'firebase/app';

// Configuración web del proyecto rapiddash-gabo. No es secreta: viaja en el cliente; lo que
// protege los datos son las reglas de Firestore (firestore.rules) y, más adelante, App Check.
const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyBH7IfKwPU_E2rMhoNipYg4BVxjCr1-eXc',
  authDomain: 'rapiddash-gabo.firebaseapp.com',
  projectId: 'rapiddash-gabo',
  storageBucket: 'rapiddash-gabo.firebasestorage.app',
  messagingSenderId: '305836711579',
  appId: '1:305836711579:web:f8319bb558d33b1958f03e',
};

export function firebaseApp(): FirebaseApp {
  return getApps()[0] ?? initializeApp(FIREBASE_CONFIG);
}
