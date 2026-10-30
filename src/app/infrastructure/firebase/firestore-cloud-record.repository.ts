import {
  collection,
  Firestore,
  doc,
  getCountFromServer,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { CloudRecordRepository } from '../../core/application/ports/out/cloud-record.repository';
import { CountryCode, isCountryCode } from '../../core/domain/profile/country';
import { CloudRecord } from '../../core/domain/race/cloud-record';
import { GhostFrame } from '../../core/domain/race/ghost';
import { decodeGhost, encodeGhost } from '../../core/domain/race/ghost-codec';
import { PHYSICS_VERSION } from '../../core/domain/race/physics-version';
import { firestore } from './firestore-db';

/**
 * Récords en Firestore, separados en dos para que el ranking sea ligero:
 * - records/{mapa}/runs/{uid}: apodo, país, tiempo, versión de física y fecha.
 * - ghosts/{mapa}__{uid}: el recorrido comprimido; solo se descarga al correr contra él.
 * Las reglas solo aceptan mejoras del propio récord, con el apodo y país de su perfil.
 */
export class FirestoreCloudRecordRepository extends CloudRecordRepository {
  async mine(mapId: string, uid: string): Promise<CloudRecord | null> {
    const db = await firestore();
    const snap = await getDoc(doc(db, 'records', mapId, 'runs', uid));
    return snap.exists() ? toRecord(mapId, uid, snap.data()) : null;
  }

  async save(record: CloudRecord, ghost: readonly GhostFrame[]): Promise<void> {
    const db = await firestore();
    const batch = writeBatch(db);
    batch.set(doc(db, 'records', record.mapId, 'runs', record.uid), {
      nickname: record.nickname,
      country: record.country,
      time: record.time,
      physicsVersion: record.physicsVersion,
      recordedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'ghosts', ghostId(record.mapId, record.uid)), {
      mapId: record.mapId,
      uid: record.uid,
      time: record.time,
      physicsVersion: record.physicsVersion,
      frames: encodeGhost(ghost),
    });
    await batch.commit();
  }

  async top(mapId: string, size: number): Promise<CloudRecord[]> {
    const db = await firestore();
    const snap = await getDocs(
      query(runs(db, mapId), where('physicsVersion', '==', PHYSICS_VERSION), orderBy('time'), limit(size)),
    );
    return snap.docs.map((d) => toRecord(mapId, d.id, d.data()));
  }

  async rankOf(mapId: string, time: number): Promise<number> {
    const db = await firestore();
    const faster = await getCountFromServer(
      query(runs(db, mapId), where('physicsVersion', '==', PHYSICS_VERSION), where('time', '<', time)),
    );
    return faster.data().count + 1;
  }

  async above(mapId: string, time: number): Promise<CloudRecord | null> {
    const db = await firestore();
    const snap = await getDocs(
      query(
        runs(db, mapId),
        where('physicsVersion', '==', PHYSICS_VERSION),
        where('time', '<', time),
        orderBy('time', 'desc'),
        limit(1),
      ),
    );
    const d = snap.docs[0];
    return d ? toRecord(mapId, d.id, d.data()) : null;
  }

  async count(mapId: string): Promise<number> {
    const db = await firestore();
    const snap = await getCountFromServer(
      query(runs(db, mapId), where('physicsVersion', '==', PHYSICS_VERSION)),
    );
    return snap.data().count;
  }

  async updateIdentity(
    mapId: string,
    uid: string,
    nickname: string,
    country: CountryCode | null,
  ): Promise<void> {
    const db = await firestore();
    await updateDoc(doc(db, 'records', mapId, 'runs', uid), { nickname, country });
  }

  async ghost(mapId: string, uid: string): Promise<GhostFrame[] | null> {
    const db = await firestore();
    const data = (await getDoc(doc(db, 'ghosts', ghostId(mapId, uid)))).data();
    if (!data || data['physicsVersion'] !== PHYSICS_VERSION || typeof data['frames'] !== 'string') {
      return null;
    }
    return decodeGhost(data['frames']);
  }
}

function runs(db: Firestore, mapId: string) {
  return collection(db, 'records', mapId, 'runs');
}

function ghostId(mapId: string, uid: string): string {
  return `${mapId}__${uid}`;
}

function toRecord(mapId: string, uid: string, data: Record<string, unknown>): CloudRecord {
  return {
    mapId,
    uid,
    nickname: String(data['nickname'] ?? '?'),
    country: isCountryCode(data['country']) ? data['country'] : null,
    time: Number(data['time']),
    physicsVersion: Number(data['physicsVersion']),
  };
}
