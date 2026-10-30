import { AuthPort, AuthUser } from '../../core/application/ports/out/auth.port';
import type { FirebaseAuthAdapter } from './firebase-auth.adapter';

/**
 * Firebase Auth solo se descarga cuando hace falta (al entrar o, con perfil guardado, después
 * de pintar el menú): no engorda el arranque.
 */
export class LazyFirebaseAuth extends AuthPort {
  private adapter: Promise<FirebaseAuthAdapter> | null = null;

  private load(): Promise<FirebaseAuthAdapter> {
    this.adapter ??= import('./firebase-auth.adapter').then((m) => new m.FirebaseAuthAdapter());
    // Si falla la descarga (sin red), se reintenta en la siguiente llamada
    this.adapter.catch(() => (this.adapter = null));
    return this.adapter;
  }

  async currentUser(): Promise<AuthUser | null> {
    return (await this.load()).currentUser();
  }
  async signInWithGoogle(): Promise<AuthUser> {
    return (await this.load()).signInWithGoogle();
  }
  async signUpWithEmail(email: string, password: string): Promise<AuthUser> {
    return (await this.load()).signUpWithEmail(email, password);
  }
  async signInWithEmail(email: string, password: string): Promise<AuthUser> {
    return (await this.load()).signInWithEmail(email, password);
  }
  async signInAsGuest(): Promise<AuthUser> {
    return (await this.load()).signInAsGuest();
  }
  async sendVerificationEmail(): Promise<void> {
    return (await this.load()).sendVerificationEmail();
  }
  async sendPasswordReset(email: string): Promise<void> {
    return (await this.load()).sendPasswordReset(email);
  }
  async refreshUser(): Promise<AuthUser | null> {
    return (await this.load()).refreshUser();
  }
  async signOut(): Promise<void> {
    return (await this.load()).signOut();
  }
}
