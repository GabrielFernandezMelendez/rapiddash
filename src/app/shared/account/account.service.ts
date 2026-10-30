import { inject, Injectable, signal } from '@angular/core';
import { AuthPort } from '../../core/application/ports/out/auth.port';
import { ProfileRepository } from '../../core/application/ports/out/profile.repository';
import { PlayerAccount, SavePilotResult } from '../../core/application/use-cases/player-account';
import { CountryCode } from '../../core/domain/profile/country';
import { Profile } from '../../core/domain/profile/profile';

/**
 * Puente entre PlayerAccount y Angular: el perfil como signal para las pantallas. Arranca con
 * la copia local (sin esperar a Firebase) y la confirma en segundo plano.
 */
@Injectable({ providedIn: 'root' })
export class AccountService {
  private readonly account = new PlayerAccount(inject(AuthPort), inject(ProfileRepository));
  readonly profile = signal<Profile | null>(this.account.cached());

  /** Con perfil guardado, Firebase se carga cuando el menú ya está pintado. */
  init(): void {
    if (!this.profile()) return;
    const resume = () => void this.account.resume().then((p) => this.profile.set(p));
    if ('requestIdleCallback' in globalThis) requestIdleCallback(resume, { timeout: 3000 });
    else setTimeout(resume, 1500);
  }

  signInWithGoogle(): Promise<Profile | null> {
    return this.track(this.account.signInWithGoogle());
  }

  signUpWithEmail(email: string, password: string): Promise<Profile | null> {
    return this.track(this.account.signUpWithEmail(email, password));
  }

  signInWithEmail(email: string, password: string): Promise<Profile | null> {
    return this.track(this.account.signInWithEmail(email, password));
  }

  playAsGuest(): Promise<Profile | null> {
    return this.track(this.account.playAsGuest());
  }

  currentEmail(): Promise<string | null> {
    return this.account.currentEmail();
  }

  sendVerificationEmail(): Promise<void> {
    return this.account.sendVerificationEmail();
  }

  sendPasswordReset(email: string): Promise<void> {
    return this.account.sendPasswordReset(email);
  }

  async checkVerified(): Promise<boolean> {
    const verified = await this.account.checkVerified();
    this.profile.set(this.account.cached());
    return verified;
  }

  isNicknameFree(nickname: string): Promise<boolean> {
    return this.account.isNicknameFree(nickname);
  }

  async savePilot(nickname: string, country: CountryCode | null): Promise<SavePilotResult> {
    const result = await this.account.savePilot(nickname, country);
    if (result.ok) this.profile.set(result.profile);
    return result;
  }

  needsLinkReminder(): boolean {
    return this.account.needsLinkReminder();
  }

  async snoozeLinkReminder(): Promise<void> {
    const pending = this.account.snoozeLinkReminder();
    this.profile.set(this.account.cached());
    await pending;
  }

  async signOut(): Promise<void> {
    await this.account.signOut();
    this.profile.set(null);
  }

  private async track(signIn: Promise<Profile | null>): Promise<Profile | null> {
    const profile = await signIn;
    this.profile.set(profile);
    return profile;
  }
}
