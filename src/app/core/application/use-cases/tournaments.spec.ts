import { CloudRecord } from '../../domain/race/cloud-record';
import { PHYSICS_VERSION } from '../../domain/race/physics-version';
import { Profile } from '../../domain/profile/profile';
import { joinProblem, Tournament, TOURNAMENT_DAY_MS } from '../../domain/tournament/tournament';
import { CloudRecordRepository } from '../ports/out/cloud-record.repository';
import { JoinResult, TournamentRepository } from '../ports/out/tournament.repository';
import { Tournaments } from './tournaments';

class MemoryTournaments extends TournamentRepository {
  data = new Map<string, Tournament>();
  async create(t: Tournament) {
    if (this.data.has(t.code)) return 'taken' as const;
    this.data.set(t.code, t);
    return 'created' as const;
  }
  async get(code: string) {
    return this.data.get(code) ?? null;
  }
  async mine(uid: string) {
    return [...this.data.values()].filter((t) => t.members.some((m) => m.uid === uid));
  }
  async join(code: string, member: Tournament['members'][number]): Promise<JoinResult> {
    const t = this.data.get(code);
    if (!t) return 'not-found';
    const problem = joinProblem(t, member.uid);
    if (problem) return problem;
    this.data.set(code, { ...t, members: [...t.members, member] });
    return 'joined';
  }
  async start(code: string, mapIds: readonly string[]) {
    const t = this.data.get(code)!;
    this.data.set(code, { ...t, startedAt: 0, mapIds });
  }
  async remove(code: string) {
    this.data.delete(code);
  }
}

class Records extends CloudRecordRepository {
  boards = new Map<string, CloudRecord[]>();
  async mine() {
    return null;
  }
  async save() {}
  async top(board: string) {
    return this.boards.get(board) ?? [];
  }
  async rankOf() {
    return 1;
  }
  async above() {
    return null;
  }
  async count() {
    return 0;
  }
  async ghost() {
    return null;
  }
  async updateIdentity() {}
}

const profile = (uid: string): Profile => ({
  uid,
  nickname: uid,
  country: 'ES',
  kind: 'google',
  createdAt: '',
  linkReminderAt: '',
});
const rec = (board: string, uid: string, time: number): CloudRecord => ({
  mapId: board,
  uid,
  nickname: uid,
  country: 'ES',
  time,
  physicsVersion: PHYSICS_VERSION,
});

describe('Tournaments', () => {
  let repo: MemoryTournaments;
  let records: Records;
  let now: number;
  let tournaments: Tournaments;
  let seq: number;

  beforeEach(() => {
    repo = new MemoryTournaments();
    records = new Records();
    now = 0;
    seq = 0;
    // Azar repetible: los dos primeros códigos coinciden para probar el reintento
    tournaments = new Tournaments(repo, records, () => (seq++ < 12 ? 0.1 : 0.7), () => now);
  });

  it('crea con código, se unen por código y empieza el creador', async () => {
    const t = await tournaments.create('  Primos  ', profile('ana'));
    expect(t.name).toBe('Primos');
    expect(await tournaments.join(t.code.toLowerCase(), profile('gabo'))).toBe('joined');
    expect(await tournaments.join(t.code, profile('gabo'))).toBe('already');
    expect(await tournaments.join('ZZZZZZ', profile('gabo'))).toBe('not-found');
    const saved = (await repo.get(t.code))!;
    expect(await tournaments.start(saved, 'gabo', ['a', 'b', 'c', 'd'])).toBe(false);
    expect(await tournaments.start(saved, 'ana', ['a', 'b', 'c', 'd'])).toBe(true);
    expect((await repo.get(t.code))!.mapIds).toHaveLength(3);
    expect(await tournaments.join(t.code, profile('lucia'))).toBe('started');
  });

  it('si el código ya existe, prueba otro', async () => {
    const a = await tournaments.create('A', profile('ana'));
    seq = 0;
    const b = await tournaments.create('B', profile('ana'));
    expect(a.code).not.toBe(b.code);
  });

  it('solo el creador elimina el torneo', async () => {
    const t = await tournaments.create('Por error', profile('ana'));
    await tournaments.join(t.code, profile('gabo'));
    expect(await tournaments.remove(t, 'gabo')).toBe(false);
    expect(await repo.get(t.code)).not.toBeNull();
    expect(await tournaments.remove(t, 'ana')).toBe(true);
    expect(await repo.get(t.code)).toBeNull();
    expect(await tournaments.mine('gabo')).toEqual([]);
  });

  it('no se empieza solo', async () => {
    const t = await tournaments.create('Solo', profile('ana'));
    expect(await tournaments.start(t, 'ana', ['a', 'b', 'c'])).toBe(false);
  });

  it('clasificación con los días que han empezado y ganador de los cerrados', async () => {
    const t: Tournament = {
      code: 'K7RQ2M',
      name: 'Primos',
      ownerUid: 'ana',
      members: ['ana', 'gabo'].map((u) => ({ uid: u, nickname: u, country: 'ES' })),
      startedAt: 0,
      mapIds: ['a', 'b', 'c'],
    };
    records.boards.set('t-K7RQ2M-d0', [rec('t-K7RQ2M-d0', 'ana', 60), rec('t-K7RQ2M-d0', 'gabo', 62)]);
    records.boards.set('t-K7RQ2M-d1', [rec('t-K7RQ2M-d1', 'gabo', 50)]);
    now = TOURNAMENT_DAY_MS * 1.5;
    const board = await tournaments.board(t);
    expect(board.rows.map((r) => [r.member.uid, r.total])).toEqual([
      ['gabo', 27],
      ['ana', 15],
    ]);
    expect(board.dayWinners).toEqual(['ana', null]);
  });
});
