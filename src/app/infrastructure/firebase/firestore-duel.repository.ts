import {
  collection,
  deleteDoc,
  doc,
  DocumentData,
  getDoc,
  getDocs,
  query,
  runTransaction,
  serverTimestamp,
  Timestamp,
  where,
} from 'firebase/firestore';
import { DuelJoinResult, DuelRepository } from '../../core/application/ports/out/duel.repository';
import {
  canRaceDuel,
  Duel,
  DUEL_ATTEMPTS,
  duelJoinProblem,
  DuelPlayer,
  newDuelPlayer,
} from '../../core/domain/duel/duel';
import { GarageChoice } from '../../core/domain/garage/garage';
import { isCountryCode } from '../../core/domain/profile/country';
import { TournamentMember } from '../../core/domain/tournament/tournament';
import { firestore } from './firestore-db';

/**
 * duels/{código}: creador, los dos pilotos (y sus uid aparte, para buscar «mis duelos»), hora a la
 * que entró el rival, circuito y, por piloto, sus intentos. Las reglas impiden entrar en uno lleno,
 * gastar más de 3 intentos o tocar los del otro.
 */
export class FirestoreDuelRepository extends DuelRepository {
  async create(duel: Duel): Promise<'created' | 'taken'> {
    const db = await firestore();
    const ref = doc(db, 'duels', duel.code);
    return runTransaction(db, async (tx) => {
      if ((await tx.get(ref)).exists()) return 'taken' as const;
      tx.set(ref, {
        ownerUid: duel.ownerUid,
        members: duel.members.map(plainMember),
        memberUids: duel.members.map((m) => m.uid),
        players: duel.players,
        startedAt: null,
        mapId: duel.mapId,
        createdAt: serverTimestamp(),
      });
      return 'created' as const;
    });
  }

  async get(code: string): Promise<Duel | null> {
    const db = await firestore();
    const snap = await getDoc(doc(db, 'duels', code));
    return snap.exists() ? toDuel(code, snap.data()) : null;
  }

  async mine(uid: string): Promise<Duel[]> {
    const db = await firestore();
    const snap = await getDocs(query(collection(db, 'duels'), where('memberUids', 'array-contains', uid)));
    return snap.docs.map((d) => toDuel(d.id, d.data()));
  }

  async join(code: string, member: TournamentMember, garage: GarageChoice): Promise<DuelJoinResult> {
    const db = await firestore();
    const ref = doc(db, 'duels', code);
    return runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return 'not-found' as const;
      const duel = toDuel(code, snap.data());
      const problem = duelJoinProblem(duel, member.uid);
      if (problem) return problem;
      tx.update(ref, {
        members: [...duel.members, member].map(plainMember),
        memberUids: [...duel.members.map((m) => m.uid), member.uid],
        [`players.${member.uid}`]: newDuelPlayer(garage),
        startedAt: serverTimestamp(),
      });
      return 'joined' as const;
    });
  }

  async startAttempt(code: string, uid: string, garage: GarageChoice): Promise<boolean> {
    const db = await firestore();
    const ref = doc(db, 'duels', code);
    return runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return false;
      const duel = toDuel(code, snap.data());
      if (!canRaceDuel(duel, uid, Date.now())) return false;
      tx.update(ref, {
        [`players.${uid}`]: {
          attempts: (duel.players[uid]?.attempts ?? 0) + 1,
          lastStartAt: serverTimestamp(),
          done: false,
          car: garage.car,
          fx: garage.fx,
        },
      });
      return true;
    });
  }

  async markDone(code: string, uid: string): Promise<void> {
    const db = await firestore();
    const ref = doc(db, 'duels', code);
    await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (!snap.exists()) return;
      const raw: DocumentData | undefined = snap.data()['players']?.[uid];
      // Las reglas exigen que el resto de su ficha no cambie: se reescribe tal cual
      if (!raw || raw['done'] === true || Number(raw['attempts']) < DUEL_ATTEMPTS) return;
      tx.update(ref, { [`players.${uid}`]: { ...raw, done: true } });
    });
  }

  async remove(code: string): Promise<void> {
    const db = await firestore();
    await deleteDoc(doc(db, 'duels', code));
  }
}

function plainMember(m: TournamentMember): DocumentData {
  return { uid: m.uid, nickname: m.nickname, country: m.country };
}

function toPlayer(data: DocumentData): DuelPlayer {
  const last = data['lastStartAt'];
  return {
    attempts: Number(data['attempts'] ?? 0),
    lastStartAt: last instanceof Timestamp ? last.toMillis() : null,
    done: data['done'] === true,
    car: typeof data['car'] === 'number' ? data['car'] : null,
    fx: typeof data['fx'] === 'number' ? data['fx'] : 1,
  };
}

function toDuel(code: string, data: DocumentData): Duel {
  const members = Array.isArray(data['members']) ? data['members'] : [];
  const started = data['startedAt'];
  const players = (data['players'] ?? {}) as Record<string, DocumentData>;
  return {
    code,
    ownerUid: String(data['ownerUid'] ?? ''),
    members: members.map((m: DocumentData) => ({
      uid: String(m['uid']),
      nickname: String(m['nickname'] ?? '?'),
      country: isCountryCode(m['country']) ? m['country'] : null,
    })),
    players: Object.fromEntries(Object.entries(players).map(([uid, p]) => [uid, toPlayer(p)])),
    startedAt: started instanceof Timestamp ? started.toMillis() : null,
    mapId: String(data['mapId'] ?? ''),
  };
}
