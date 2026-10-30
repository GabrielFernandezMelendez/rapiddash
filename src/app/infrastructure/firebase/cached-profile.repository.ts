import {
  ProfileRepository,
  SaveProfileResult,
  StoredProfile,
} from '../../core/application/ports/out/profile.repository';
import { isCountryCode } from '../../core/domain/profile/country';
import { Profile } from '../../core/domain/profile/profile';
import { readJson, removeKey, writeJson } from '../persistence/local/safe-storage';
import type { FirestoreProfileRepository } from './firestore-profile.repository';

const KEY = 'rapiddash.profile';
const KINDS = ['guest', 'unverified', 'google', 'email'];

/**
 * Perfil con copia en localStorage (para arrancar al instante y sin red) y Firestore detrás,
 * que se descarga de forma diferida.
 */
export class CachedProfileRepository extends ProfileRepository {
  private remote: Promise<FirestoreProfileRepository> | null = null;

  private load(): Promise<FirestoreProfileRepository> {
    this.remote ??= import('./firestore-profile.repository').then(
      (m) => new m.FirestoreProfileRepository(),
    );
    this.remote.catch(() => (this.remote = null));
    return this.remote;
  }

  cached(): Profile | null {
    const p = readJson<Profile>(KEY);
    const valid =
      p &&
      typeof p.uid === 'string' &&
      typeof p.nickname === 'string' &&
      KINDS.includes(p.kind) &&
      (p.country === null || isCountryCode(p.country));
    return valid ? p : null;
  }

  cache(profile: Profile | null): void {
    if (profile) writeJson(KEY, profile);
    else removeKey(KEY);
  }

  async get(uid: string): Promise<StoredProfile | null> {
    return (await this.load()).get(uid);
  }

  async save(profile: StoredProfile, previous: StoredProfile | null): Promise<SaveProfileResult> {
    return (await this.load()).save(profile, previous);
  }

  async isNicknameFree(nickname: string): Promise<boolean> {
    return (await this.load()).isNicknameFree(nickname);
  }
}
