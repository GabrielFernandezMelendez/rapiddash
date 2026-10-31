import { deleteDoc, doc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';
import { TournamentPhotoRepository } from '../../core/application/ports/out/tournament-photo.repository';
import { firestore } from './firestore-db';

/** tournaments/{código}/photos/{uid}: { image (data URL), updatedAt }. */
export class FirestoreTournamentPhotoRepository extends TournamentPhotoRepository {
  async get(code: string, uid: string): Promise<string | null> {
    const db = await firestore();
    const snap = await getDoc(doc(db, 'tournaments', code, 'photos', uid));
    const image = snap.exists() ? snap.data()['image'] : null;
    return typeof image === 'string' ? image : null;
  }

  async save(code: string, uid: string, dataUrl: string): Promise<void> {
    const db = await firestore();
    await setDoc(doc(db, 'tournaments', code, 'photos', uid), {
      image: dataUrl,
      updatedAt: serverTimestamp(),
    });
  }

  async remove(code: string, uid: string): Promise<void> {
    const db = await firestore();
    await deleteDoc(doc(db, 'tournaments', code, 'photos', uid));
  }
}
