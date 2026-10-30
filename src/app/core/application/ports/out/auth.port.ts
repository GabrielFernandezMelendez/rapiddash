import { AccountKind } from '../../../domain/profile/profile';

export interface AuthUser {
  readonly uid: string;
  readonly kind: AccountKind;
  readonly email: string | null;
}

export type AuthErrorCode =
  | 'email-in-use'
  | 'invalid-email'
  | 'weak-password'
  | 'wrong-credentials'
  | 'popup-closed'
  | 'popup-blocked'
  | 'too-many-requests'
  | 'provider-disabled'
  | 'network'
  | 'unknown';

/** Error de autenticación ya traducido a un código propio (la interfaz lo muestra por i18n). */
export class AuthError extends Error {
  constructor(readonly code: AuthErrorCode) {
    super(code);
  }
}

/**
 * Cuentas. Si el jugador ya es invitado, entrar con Google o crear cuenta con correo VINCULA
 * esa cuenta al invitado: conserva el uid, el apodo y los récords. Lanza AuthError.
 */
export abstract class AuthPort {
  /** Usuario de la sesión guardada (espera a que se restaure); null si no hay. */
  abstract currentUser(): Promise<AuthUser | null>;
  abstract signInWithGoogle(): Promise<AuthUser>;
  /** Crea la cuenta (o la vincula al invitado) y envía el correo de verificación. */
  abstract signUpWithEmail(email: string, password: string): Promise<AuthUser>;
  abstract signInWithEmail(email: string, password: string): Promise<AuthUser>;
  abstract signInAsGuest(): Promise<AuthUser>;
  abstract sendVerificationEmail(): Promise<void>;
  abstract sendPasswordReset(email: string): Promise<void>;
  /** Vuelve a leer el usuario del servidor (por ejemplo, tras verificar el correo). */
  abstract refreshUser(): Promise<AuthUser | null>;
  abstract signOut(): Promise<void>;
}
