import {
  doc,
  Firestore,
  getDoc,
  getFirestore,
  runTransaction,
} from 'firebase/firestore';
import {
  SaveProfileResult,
  StoredProfile,
} from '../../core/application/ports/out/profile.repository';
import { isCountryCode } from '../../core/domain/profile/country';
import { nicknameKey } from '../../core/domain/profile/nickname';
import { firebaseApp } from './firebase-app';

/**
 * Perfiles en Firestore:
 * - users/{uid}: apodo, clave del apodo, país y fechas.
 * - nicknames/{clave}: { uid } reserva el apodo; la transacción evita que dos lo cojan a la vez.
 * Las reglas (firestore.rules) solo dejan escribir el propio perfil y reservar a nombre propio.
 */
export class FirestoreProfileRepository {
  private readonly db: Firestore = getFirestore(firebaseApp());

  async get(uid: string): Promise<StoredProfile | null> {
    const snap = await getDoc(doc(this.db, 'users', uid));
    const data = snap.data();
    if (!data || typeof data['nickname'] !== 'string') return null;
    return {
      uid,
      nickname: data['nickname'],
      country: isCountryCode(data['country']) ? data['country'] : null,
      createdAt: String(data['createdAt'] ?? ''),
      linkReminderAt: String(data['linkReminderAt'] ?? ''),
    };
  }

  async save(profile: StoredProfile, previous: StoredProfile | null): Promise<SaveProfileResult> {
    const key = nicknameKey(profile.nickname);
    const oldKey = previous ? nicknameKey(previous.nickname) : null;
    return runTransaction(this.db, async (tx) => {
      const claim = doc(this.db, 'nicknames', key);
      const owner = (await tx.get(claim)).data()?.['uid'];
      if (owner && owner !== profile.uid) return 'taken' as const;
      if (!owner) tx.set(claim, { uid: profile.uid });
      if (oldKey && oldKey !== key) tx.delete(doc(this.db, 'nicknames', oldKey));
      tx.set(doc(this.db, 'users', profile.uid), {
        nickname: profile.nickname,
        nicknameKey: key,
        country: profile.country,
        createdAt: profile.createdAt,
        linkReminderAt: profile.linkReminderAt,
      });
      return 'saved' as const;
    });
  }

  async isNicknameFree(nickname: string): Promise<boolean> {
    const snap = await getDoc(doc(this.db, 'nicknames', nicknameKey(nickname)));
    return !snap.exists();
  }
}
