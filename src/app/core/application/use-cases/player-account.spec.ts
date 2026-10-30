import { nicknameKey } from '../../domain/profile/nickname';
import { Profile } from '../../domain/profile/profile';
import { AuthPort, AuthUser } from '../ports/out/auth.port';
import { ProfileRepository, SaveProfileResult, StoredProfile } from '../ports/out/profile.repository';
import { PlayerAccount } from './player-account';

class FakeAuth extends AuthPort {
  user: AuthUser | null = null;
  offline = false;
  async currentUser() {
    if (this.offline) throw new Error('sin red');
    return this.user;
  }
  async signInWithGoogle() {
    // Si era invitado, se vincula: mismo uid
    return (this.user = { uid: this.user?.uid ?? 'g1', kind: 'google', email: 'g@x.com' });
  }
  async signUpWithEmail(email: string) {
    return (this.user = { uid: this.user?.uid ?? 'e1', kind: 'unverified', email });
  }
  async signInWithEmail(email: string) {
    return (this.user = { uid: 'e1', kind: 'email', email });
  }
  async signInAsGuest() {
    return (this.user = { uid: 'a1', kind: 'guest', email: null });
  }
  async sendVerificationEmail() {}
  async sendPasswordReset() {}
  async refreshUser() {
    return this.user;
  }
  async signOut() {
    this.user = null;
  }
}

class FakeProfiles extends ProfileRepository {
  local: Profile | null = null;
  remote = new Map<string, StoredProfile>();
  nicknames = new Map<string, string>();
  cached() {
    return this.local;
  }
  cache(profile: Profile | null) {
    this.local = profile;
  }
  async get(uid: string) {
    return this.remote.get(uid) ?? null;
  }
  async save(profile: StoredProfile, previous: StoredProfile | null): Promise<SaveProfileResult> {
    const key = nicknameKey(profile.nickname);
    const owner = this.nicknames.get(key);
    if (owner && owner !== profile.uid) return 'taken';
    if (previous) this.nicknames.delete(nicknameKey(previous.nickname));
    this.nicknames.set(key, profile.uid);
    this.remote.set(profile.uid, profile);
    return 'saved';
  }
  async isNicknameFree(nickname: string) {
    return !this.nicknames.has(nicknameKey(nickname));
  }
}

const day = (n: number) => new Date(Date.UTC(2026, 10, 1 + n));

describe('PlayerAccount', () => {
  let auth: FakeAuth;
  let profiles: FakeProfiles;
  let now: Date;
  let account: PlayerAccount;

  beforeEach(() => {
    auth = new FakeAuth();
    profiles = new FakeProfiles();
    now = day(0);
    account = new PlayerAccount(auth, profiles, () => now);
  });

  it('solo apodo: entra como invitado y crea el piloto', async () => {
    expect(await account.playAsGuest()).toBeNull();
    const result = await account.savePilot(' Gabo ', 'ES');
    expect(result).toEqual({
      ok: true,
      profile: expect.objectContaining({ uid: 'a1', nickname: 'Gabo', country: 'ES', kind: 'guest' }),
    });
    expect(account.cached()?.nickname).toBe('Gabo');
  });

  it('el apodo es único sin importar mayúsculas ni tildes', async () => {
    profiles.nicknames.set('gabo', 'otro');
    await account.playAsGuest();
    expect(await account.isNicknameFree('GABÓ')).toBe(false);
    expect(await account.savePilot('Gabó', 'ES')).toEqual({ ok: false, problem: 'taken' });
  });

  it('valida el apodo antes de ir a la red', async () => {
    await account.playAsGuest();
    expect(await account.savePilot('ab', null)).toEqual({ ok: false, problem: 'short' });
  });

  it('cambiar el apodo libera el anterior y conserva la fecha de alta', async () => {
    await account.playAsGuest();
    await account.savePilot('Gabo', 'ES');
    now = day(2);
    await account.savePilot('Gabriel', 'MX');
    expect(profiles.nicknames.has('gabo')).toBe(false);
    expect(account.cached()).toEqual(
      expect.objectContaining({ nickname: 'Gabriel', country: 'MX', createdAt: day(0).toISOString() }),
    );
    expect(await account.isNicknameFree('gabriel')).toBe(true);
  });

  it('una cuenta con piloto entra directamente', async () => {
    profiles.remote.set('e1', {
      uid: 'e1',
      nickname: 'Gabo',
      country: 'ES',
      createdAt: day(0).toISOString(),
      linkReminderAt: day(0).toISOString(),
    });
    const profile = await account.signInWithEmail('gabo@x.com', 'secreto123');
    expect(profile).toEqual(expect.objectContaining({ nickname: 'Gabo', kind: 'email' }));
  });

  it('vincular Google conserva el piloto del invitado', async () => {
    await account.playAsGuest();
    await account.savePilot('Gabo', 'ES');
    const profile = await account.signInWithGoogle();
    expect(profile).toEqual(expect.objectContaining({ uid: 'a1', nickname: 'Gabo', kind: 'google' }));
  });

  it('el aviso de vincular sale a los 5 días y «Ahora no» lo pospone', async () => {
    await account.playAsGuest();
    await account.savePilot('Gabo', 'ES');
    expect(account.needsLinkReminder()).toBe(false);
    now = day(5);
    expect(account.needsLinkReminder()).toBe(true);
    await account.snoozeLinkReminder();
    expect(account.needsLinkReminder()).toBe(false);
    expect(profiles.remote.get('a1')?.linkReminderAt).toBe(day(5).toISOString());
  });

  it('al verificar el correo deja de ser invitado', async () => {
    await account.signUpWithEmail('gabo@x.com', 'secreto123');
    await account.savePilot('Gabo', 'ES');
    expect(account.cached()?.kind).toBe('unverified');
    auth.user = { ...auth.user!, kind: 'email' };
    expect(await account.checkVerified()).toBe(true);
    expect(account.cached()?.kind).toBe('email');
  });

  it('sin red arranca con la copia local; sin sesión, la borra', async () => {
    await account.playAsGuest();
    await account.savePilot('Gabo', 'ES');
    auth.offline = true;
    expect((await account.resume())?.nickname).toBe('Gabo');
    auth.offline = false;
    await auth.signOut();
    expect(await account.resume()).toBeNull();
    expect(account.cached()).toBeNull();
  });

  it('cerrar sesión borra el perfil local', async () => {
    await account.playAsGuest();
    await account.savePilot('Gabo', 'ES');
    await account.signOut();
    expect(account.cached()).toBeNull();
  });
});
