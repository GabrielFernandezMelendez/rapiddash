import { FirebaseError } from 'firebase/app';
import {
  Auth,
  createUserWithEmailAndPassword,
  EmailAuthProvider,
  getAuth,
  GoogleAuthProvider,
  linkWithCredential,
  linkWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInAnonymously,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  User,
} from 'firebase/auth';
import {
  AuthError,
  AuthErrorCode,
  AuthPort,
  AuthUser,
} from '../../core/application/ports/out/auth.port';
import { AccountKind } from '../../core/domain/profile/profile';
import { firebaseApp } from './firebase-app';

/** Firebase Authentication. Se carga de forma diferida (ver LazyFirebaseAuth). */
export class FirebaseAuthAdapter extends AuthPort {
  private readonly auth: Auth = getAuth(firebaseApp());

  async currentUser(): Promise<AuthUser | null> {
    await this.auth.authStateReady();
    return toAuthUser(this.auth.currentUser);
  }

  signInWithGoogle(): Promise<AuthUser> {
    return guard(async () => {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await this.auth.authStateReady();
      const current = this.auth.currentUser;
      if (current?.isAnonymous) {
        try {
          return mapped((await linkWithPopup(current, provider)).user);
        } catch (e) {
          // Esa cuenta de Google ya tenía piloto: se entra en ella (el invitado se queda atrás)
          const credential =
            e instanceof FirebaseError && e.code === 'auth/credential-already-in-use'
              ? GoogleAuthProvider.credentialFromError(e)
              : null;
          if (!credential) throw e;
          return mapped((await signInWithCredential(this.auth, credential)).user);
        }
      }
      return mapped((await signInWithPopup(this.auth, provider)).user);
    });
  }

  signUpWithEmail(email: string, password: string): Promise<AuthUser> {
    return guard(async () => {
      await this.auth.authStateReady();
      const current = this.auth.currentUser;
      const user = current?.isAnonymous
        ? (await linkWithCredential(current, EmailAuthProvider.credential(email, password))).user
        : (await createUserWithEmailAndPassword(this.auth, email, password)).user;
      this.useGameLanguage();
      await sendEmailVerification(user);
      return mapped(user);
    });
  }

  signInWithEmail(email: string, password: string): Promise<AuthUser> {
    return guard(async () => mapped((await signInWithEmailAndPassword(this.auth, email, password)).user));
  }

  signInAsGuest(): Promise<AuthUser> {
    return guard(async () => mapped((await signInAnonymously(this.auth)).user));
  }

  sendVerificationEmail(): Promise<void> {
    return guard(async () => {
      const user = this.auth.currentUser;
      if (!user) return;
      this.useGameLanguage();
      await sendEmailVerification(user);
    });
  }

  sendPasswordReset(email: string): Promise<void> {
    return guard(async () => {
      this.useGameLanguage();
      await sendPasswordResetEmail(this.auth, email);
    });
  }

  refreshUser(): Promise<AuthUser | null> {
    return guard(async () => {
      await this.auth.authStateReady();
      await this.auth.currentUser?.reload();
      return toAuthUser(this.auth.currentUser);
    });
  }

  signOut(): Promise<void> {
    return guard(() => signOut(this.auth));
  }

  /** Los correos de Firebase salen en el idioma elegido en el juego. */
  private useGameLanguage(): void {
    this.auth.languageCode = document.documentElement.lang || null;
  }
}

function kindOf(user: User): AccountKind {
  if (user.isAnonymous) return 'guest';
  const providers = user.providerData.map((p) => p.providerId);
  if (providers.includes('google.com')) return 'google';
  return user.emailVerified ? 'email' : 'unverified';
}

function toAuthUser(user: User | null): AuthUser | null {
  return user ? mapped(user) : null;
}

function mapped(user: User): AuthUser {
  return { uid: user.uid, kind: kindOf(user), email: user.email };
}

const CODES: Record<string, AuthErrorCode> = {
  'auth/email-already-in-use': 'email-in-use',
  'auth/credential-already-in-use': 'email-in-use',
  'auth/invalid-email': 'invalid-email',
  'auth/missing-email': 'invalid-email',
  'auth/weak-password': 'weak-password',
  'auth/invalid-credential': 'wrong-credentials',
  'auth/invalid-login-credentials': 'wrong-credentials',
  'auth/wrong-password': 'wrong-credentials',
  'auth/user-not-found': 'wrong-credentials',
  'auth/missing-password': 'wrong-credentials',
  'auth/popup-closed-by-user': 'popup-closed',
  'auth/cancelled-popup-request': 'popup-closed',
  'auth/user-cancelled': 'popup-closed',
  'auth/popup-blocked': 'popup-blocked',
  'auth/too-many-requests': 'too-many-requests',
  'auth/network-request-failed': 'network',
  // El modo de entrada no está activado en la consola de Firebase
  'auth/operation-not-allowed': 'provider-disabled',
  'auth/admin-restricted-operation': 'provider-disabled',
};

/** Traduce los errores de Firebase a AuthError: el núcleo no conoce Firebase. */
async function guard<T>(run: () => Promise<T>): Promise<T> {
  try {
    return await run();
  } catch (e) {
    if (e instanceof AuthError) throw e;
    const code = e instanceof FirebaseError ? CODES[e.code] : undefined;
    if (!code) console.error('[auth]', e);
    throw new AuthError(code ?? 'unknown');
  }
}
