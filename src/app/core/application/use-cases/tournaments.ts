import { Profile } from '../../domain/profile/profile';
import { isCurrentPhysics } from '../../domain/race/physics-version';
import {
  cleanName,
  dayBoardId,
  dayIndex,
  DayTime,
  generateCode,
  normalizeCode,
  pickMaps,
  standings,
  StandingRow,
  Tournament,
  TOURNAMENT_DAYS,
  TOURNAMENT_MAX_MEMBERS,
  winnerOf,
} from '../../domain/tournament/tournament';
import { CloudRecordRepository } from '../ports/out/cloud-record.repository';
import { JoinResult, TournamentRepository } from '../ports/out/tournament.repository';

/** Cómo va un torneo: clasificación y ganador de cada día ya cerrado. */
export interface TournamentBoard {
  readonly rows: readonly StandingRow[];
  /** uid del ganador de cada día (null si aún no ha terminado o nadie corrió). */
  readonly dayWinners: readonly (string | null)[];
}

/** Crear, unirse, empezar y seguir torneos. */
export class Tournaments {
  constructor(
    private readonly repo: TournamentRepository,
    private readonly records: CloudRecordRepository,
    private readonly random: () => number = Math.random,
    private readonly now: () => number = () => Date.now(),
  ) {}

  async create(name: string, owner: Profile): Promise<Tournament> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const t: Tournament = {
        code: generateCode(this.random),
        name: cleanName(name) || owner.nickname,
        ownerUid: owner.uid,
        members: [{ uid: owner.uid, nickname: owner.nickname, country: owner.country }],
        startedAt: null,
        mapIds: [],
      };
      if ((await this.repo.create(t)) === 'created') return t;
    }
    throw new Error('No se pudo generar un código libre');
  }

  find(raw: string): Promise<Tournament | null> {
    const code = normalizeCode(raw);
    return code ? this.repo.get(code) : Promise.resolve(null);
  }

  async join(raw: string, profile: Profile): Promise<JoinResult> {
    const code = normalizeCode(raw);
    if (!code) return 'not-found';
    return this.repo.join(code, { uid: profile.uid, nickname: profile.nickname, country: profile.country });
  }

  /** Solo el creador y con al menos 2 pilotos. Uno de los tres días es un circuito por vueltas. */
  async start(
    t: Tournament,
    uid: string,
    mapIds: readonly string[],
    circuitIds: readonly string[] = [],
  ): Promise<boolean> {
    if (t.ownerUid !== uid || t.startedAt !== null || t.members.length < 2) return false;
    await this.repo.start(t.code, pickMaps(mapIds, this.random, circuitIds));
    return true;
  }

  /** Mis torneos: en curso primero, luego esperando y al final los terminados. */
  async mine(uid: string): Promise<Tournament[]> {
    const list = await this.repo.mine(uid);
    const order = (t: Tournament) => {
      const day = dayIndex(t, this.now());
      return day === null ? 1 : day >= TOURNAMENT_DAYS ? 2 : 0;
    };
    return [...list].sort((a, b) => order(a) - order(b) || (b.startedAt ?? 0) - (a.startedAt ?? 0));
  }

  /** Clasificación con los días que ya han empezado. */
  async board(t: Tournament): Promise<TournamentBoard> {
    const today = dayIndex(t, this.now());
    if (today === null) return { rows: standings(t, []), dayWinners: [] };
    const days = Math.min(today + 1, TOURNAMENT_DAYS);
    const dayTimes: DayTime[][] = await Promise.all(
      Array.from({ length: days }, (_, day) =>
        this.records
          .top(dayBoardId(t.code, day), TOURNAMENT_MAX_MEMBERS * 3)
          .then((rs) => rs.filter(isCurrentPhysics).map((r) => ({ uid: r.uid, time: r.time })))
          .catch(() => []),
      ),
    );
    const members = new Set(t.members.map((m) => m.uid));
    return {
      rows: standings(t, dayTimes),
      dayWinners: dayTimes.map((times, day) => (day < today ? winnerOf(times, members) : null)),
    };
  }
}
