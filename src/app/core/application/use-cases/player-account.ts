import { CountryCode } from '../../domain/profile/country';
import { checkNickname, NicknameProblem, nicknameKey } from '../../domain/profile/nickname';
import { needsLinkReminder, Profile, snoozeLinkReminder } from '../../domain/profile/profile';
import { AuthPort, AuthUser } from '../ports/out/auth.port';
import { ProfileRepository, StoredProfile } from '../ports/out/profile.repository';

export type SavePilotResult =
  | { readonly ok: true; readonly profile: Profile }
  | { readonly ok: false; readonly problem: NicknameProblem | 'taken' };

/**
 * Cuenta del jugador: entrar (Google, correo o solo apodo), crear o editar el piloto y el aviso
 * de vincular. Los métodos de entrada devuelven el perfil o null si aún tiene que crearlo.
 */
export class PlayerAccount {
  constructor(
    private readonly auth: AuthPort,
    private readonly profiles: ProfileRepository,
    private readonly now: () => Date = () => new Date(),
  ) {}

  /** Perfil guardado en este dispositivo, sin esperar a la red. */
  cached(): Profile | null {
    return this.profiles.cached();
  }

  /** Al arrancar: confirma la sesión y refresca el perfil. Sin red, se queda con la copia local. */
  async resume(): Promise<Profile | null> {
    const cached = this.cached();
    let user: AuthUser | null;
    try {
      user = await this.auth.currentUser();
    } catch {
      return cached;
    }
    if (!user) {
      // Se cerró la sesión (o se borraron los datos): toca volver a entrar
      this.profiles.cache(null);
      return null;
    }
    try {
      return await this.loadFor(user);
    } catch {
      return cached?.uid === user.uid ? this.keep({ ...cached, kind: user.kind }) : cached;
    }
  }

  async signInWithGoogle(): Promise<Profile | null> {
    return this.afterSignIn(await this.auth.signInWithGoogle());
  }

  async signUpWithEmail(email: string, password: string): Promise<Profile | null> {
    return this.afterSignIn(await this.auth.signUpWithEmail(email.trim(), password));
  }

  async signInWithEmail(email: string, password: string): Promise<Profile | null> {
    return this.afterSignIn(await this.auth.signInWithEmail(email.trim(), password));
  }

  async playAsGuest(): Promise<Profile | null> {
    return this.afterSignIn(await this.auth.signInAsGuest());
  }

  async currentEmail(): Promise<string | null> {
    return (await this.auth.currentUser())?.email ?? null;
  }

  sendVerificationEmail(): Promise<void> {
    return this.auth.sendVerificationEmail();
  }

  sendPasswordReset(email: string): Promise<void> {
    return this.auth.sendPasswordReset(email.trim());
  }

  /** Tras verificar el correo: ¿ya está verificado? Actualiza el tipo de cuenta del perfil. */
  async checkVerified(): Promise<boolean> {
    const user = await this.auth.refreshUser();
    const cached = this.cached();
    if (user && cached?.uid === user.uid) this.keep({ ...cached, kind: user.kind });
    return user?.kind === 'email';
  }

  async isNicknameFree(nickname: string): Promise<boolean> {
    const mine = this.cached();
    if (mine && nicknameKey(mine.nickname) === nicknameKey(nickname)) return true;
    return this.profiles.isNicknameFree(nickname);
  }

  /** Crea el piloto o cambia apodo y país. */
  async savePilot(nickname: string, country: CountryCode | null): Promise<SavePilotResult> {
    const check = checkNickname(nickname);
    if (!check.ok) return check;
    const user = await this.auth.currentUser();
    if (!user) throw new Error('Sin sesión');
    const cached = this.cached();
    const previous = cached?.uid === user.uid ? cached : null;
    const now = this.now().toISOString();
    const stored: StoredProfile = {
      uid: user.uid,
      nickname: check.value,
      country,
      createdAt: previous?.createdAt ?? now,
      linkReminderAt: previous?.linkReminderAt ?? now,
    };
    const result = await this.profiles.save(stored, previous ? strip(previous) : null);
    if (result === 'taken') return { ok: false, problem: 'taken' };
    return { ok: true, profile: this.keep({ ...stored, kind: user.kind }) };
  }

  needsLinkReminder(): boolean {
    const profile = this.cached();
    return profile !== null && needsLinkReminder(profile, this.now());
  }

  /** «Ahora no»: se guarda en local al momento y en la nube cuando se pueda. */
  async snoozeLinkReminder(): Promise<void> {
    const profile = this.cached();
    if (!profile) return;
    const snoozed = this.keep(snoozeLinkReminder(profile, this.now()));
    await this.profiles.save(strip(snoozed), strip(profile)).catch(() => undefined);
  }

  async signOut(): Promise<void> {
    await this.auth.signOut();
    this.profiles.cache(null);
  }

  private async afterSignIn(user: AuthUser): Promise<Profile | null> {
    return this.loadFor(user);
  }

  private async loadFor(user: AuthUser): Promise<Profile | null> {
    const stored = await this.profiles.get(user.uid);
    if (!stored) {
      // Cuenta sin piloto todavía (o de otro jugador en este móvil): fuera la copia local
      if (this.cached()?.uid !== user.uid) this.profiles.cache(null);
      return null;
    }
    return this.keep({ ...stored, kind: user.kind });
  }

  private keep(profile: Profile): Profile {
    this.profiles.cache(profile);
    return profile;
  }
}

function strip({ kind: _kind, ...stored }: Profile): StoredProfile {
  return stored;
}
