import {
  collection,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  JoinResult,
  TournamentRepository,
} from '../../core/application/ports/out/tournament.repository';
import { isCountryCode } from '../../core/domain/profile/country';
import {
  joinProblem,
  Tournament,
  TournamentMember,
} from '../../core/domain/tournament/tournament';
import { firestore } from './firestore-db';

/**
 * tournaments/{código}: nombre, creador, miembros (y sus uid aparte, para buscar «mis torneos»),
 * hora de inicio (la pone el servidor) y los 3 mapas. Las reglas impiden unirse a uno empezado
 * o lleno y que alguien que no sea el creador lo empiece.
 */
export class FirestoreTournamentRepository extends TournamentRepository {
  async create(t: Tournament): Promise<'created' | 'taken'> {
    const db = await firestore();
    const ref = doc(db, 'tournaments', t.code);
    return runTransaction(db, async (tx) => {
      if ((await tx.get(ref)).exists()) return 'taken' as const;
      tx.set(ref, {
        name: t.name,
        ownerUid: t.ownerUid,
        members: t.members.map(plainMember),
        memberUids: t.members.map((m) => m.uid),
        startedAt: null,
        mapIds: [],
        createdAt: serverTimestamp(),
      });
      return 'created' as const;
    });
  }

  async get(code: string): Promise<Tournament | null> {
    const db = await firestore();
    const snap = await getDoc(doc(db, 'tournaments', code));
    return snap.exists() ? toTournament(code, snap.data()) : null;
  }

  async mine(uid: string): Promise<Tournament[]> {
    const db = await firestore();
    const snap = await getDocs(
      query(collection(db, 'tournaments'), where('memberUids', 'array-contains', uid)),
    );
    return snap.docs.map((d) => toTournament(d.id, d.data()));
  }

  async join(code: string, member: TournamentMember): Promise<JoinResult> {
    const db = await firestore();
    const ref = doc(db, 'tournaments', code);
    return runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return 'not-found' as const;
      const t = toTournament(code, snap.data());
      const problem = joinProblem(t, member.uid);
      if (problem) return problem;
      tx.update(ref, {
        members: [...t.members, member].map(plainMember),
        memberUids: [...t.members.map((m) => m.uid), member.uid],
      });
      return 'joined' as const;
    });
  }

  async start(code: string, mapIds: readonly string[]): Promise<void> {
    const db = await firestore();
    await updateDoc(doc(db, 'tournaments', code), { startedAt: serverTimestamp(), mapIds: [...mapIds] });
  }
}

function plainMember(m: TournamentMember): DocumentData {
  return { uid: m.uid, nickname: m.nickname, country: m.country };
}

function toTournament(code: string, data: DocumentData): Tournament {
  const members = Array.isArray(data['members']) ? data['members'] : [];
  const started = data['startedAt'];
  return {
    code,
    name: String(data['name'] ?? code),
    ownerUid: String(data['ownerUid'] ?? ''),
    members: members.map((m: DocumentData) => ({
      uid: String(m['uid']),
      nickname: String(m['nickname'] ?? '?'),
      country: isCountryCode(m['country']) ? m['country'] : null,
    })),
    startedAt: started instanceof Timestamp ? started.toMillis() : null,
    mapIds: Array.isArray(data['mapIds']) ? data['mapIds'].map(String) : [],
  };
}
