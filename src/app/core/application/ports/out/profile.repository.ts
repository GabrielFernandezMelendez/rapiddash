import { Profile } from '../../../domain/profile/profile';

/** Lo que se guarda del perfil: el tipo de cuenta no, porque lo dice la autenticación. */
export type StoredProfile = Omit<Profile, 'kind'>;

export type SaveProfileResult = 'saved' | 'taken';

/** Perfiles de los pilotos y reserva de apodos únicos. */
export abstract class ProfileRepository {
  /** Copia local del perfil de este dispositivo: permite arrancar sin red. */
  abstract cached(): Profile | null;
  abstract cache(profile: Profile | null): void;
  abstract get(uid: string): Promise<StoredProfile | null>;
  /** Guarda el perfil y reserva el apodo; libera el anterior si cambia. */
  abstract save(profile: StoredProfile, previous: StoredProfile | null): Promise<SaveProfileResult>;
  abstract isNicknameFree(nickname: string): Promise<boolean>;
}
