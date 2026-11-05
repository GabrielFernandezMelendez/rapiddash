import { Duel } from '../../domain/duel/duel';
import { Profile } from '../../domain/profile/profile';
import { CloudRecord } from '../../domain/race/cloud-record';
import { PHYSICS_VERSION } from '../../domain/race/physics-version';
import { CloudRecordRepository } from '../ports/out/cloud-record.repository';
import { DuelJoinResult, DuelRepository } from '../ports/out/duel.repository';
import { Duels } from './duels';

const GARAGE = { car: 14, fx: 3 };
const owner = { uid: 'a', nickname: 'Gabo', country: 'ES' } as Profile;

class FakeRepo extends DuelRepository {
  taken = 0;
  saved: Duel[] = [];
  joined: unknown[] = [];
  removed: string[] = [];
  async create(duel: Duel): Promise<'created' | 'taken'> {
    if (this.taken-- > 0) return 'taken';
    this.saved.push(duel);
    return 'created';
  }
  async get(code: string): Promise<Duel | null> {
    return this.saved.find((d) => d.code === code) ?? null;
  }
  async mine(): Promise<Duel[]> {
    return this.saved;
  }
  async join(code: string, member: unknown): Promise<DuelJoinResult> {
    this.joined.push([code, member]);
    return 'joined';
  }
  async startAttempt(): Promise<boolean> {
    return true;
  }
  async markDone(): Promise<void> {}
  async remove(code: string): Promise<void> {
    this.removed.push(code);
  }
}

const record = (uid: string, time: number, physicsVersion = PHYSICS_VERSION): CloudRecord => ({
  mapId: 'd-X',
  uid,
  nickname: uid,
  country: null,
  time,
  physicsVersion,
});

const records = (list: CloudRecord[]) =>
  ({ top: async () => list }) as unknown as CloudRecordRepository;

describe('Duels', () => {
  it('crea el duelo con el creador dentro, su coche y un circuito de la lista', async () => {
    const repo = new FakeRepo();
    const duel = await new Duels(repo, records([]), () => 0).create(owner, GARAGE, ['oval', 'ring']);
    expect(duel.mapId).toBe('oval');
    expect(duel.startedAt).toBeNull();
    expect(duel.members.map((m) => m.uid)).toEqual(['a']);
    expect(duel.players['a']).toMatchObject({ attempts: 0, car: 14, fx: 3 });
    expect(repo.saved).toEqual([duel]);
  });

  it('si el código está cogido, prueba con otro; tras varios intentos se rinde', async () => {
    const repo = new FakeRepo();
    repo.taken = 2;
    await expect(new Duels(repo, records([])).create(owner, GARAGE, ['oval'])).resolves.toBeTruthy();
    repo.taken = 99;
    await expect(new Duels(repo, records([])).create(owner, GARAGE, ['oval'])).rejects.toThrow();
  });

  it('un código mal escrito no llega a la nube', async () => {
    const repo = new FakeRepo();
    const duels = new Duels(repo, records([]));
    await expect(duels.join('corto', owner, GARAGE)).resolves.toBe('not-found');
    await expect(duels.find('corto')).resolves.toBeNull();
    expect(repo.joined).toEqual([]);
    await expect(duels.join(' k7rq 2m', owner, GARAGE)).resolves.toBe('joined');
    expect(repo.joined[0]).toEqual(['K7RQ2M', { uid: 'a', nickname: 'Gabo', country: 'ES' }]);
  });

  it('solo cuentan los tiempos de los miembros con la física actual, el mejor primero', async () => {
    const duel = {
      code: 'X',
      members: [{ uid: 'a' }, { uid: 'b' }],
    } as unknown as Duel;
    const scores = await new Duels(
      new FakeRepo(),
      records([record('a', 45), record('b', 41), record('intruso', 20), record('a', 30, PHYSICS_VERSION - 1)]),
    ).scores(duel);
    expect(scores.map((s) => [s.uid, s.time])).toEqual([
      ['b', 41],
      ['a', 45],
    ]);
  });

  it('solo el creador cancela, y solo mientras espera', async () => {
    const repo = new FakeRepo();
    const duels = new Duels(repo, records([]));
    const waiting = { code: 'X', ownerUid: 'a', startedAt: null } as Duel;
    await expect(duels.remove(waiting, 'b')).resolves.toBe(false);
    await expect(duels.remove({ ...waiting, startedAt: 5 }, 'a')).resolves.toBe(false);
    await expect(duels.remove(waiting, 'a')).resolves.toBe(true);
    expect(repo.removed).toEqual(['X']);
  });

  it('mis duelos: en curso, esperando y terminados', async () => {
    const repo = new FakeRepo();
    const base = { ownerUid: 'a', mapId: 'm', players: {} };
    const two = [{ uid: 'a' }, { uid: 'b' }];
    repo.saved = [
      { ...base, code: 'FIN', members: two, startedAt: 1 },
      { ...base, code: 'ESP', members: [{ uid: 'a' }], startedAt: null },
      { ...base, code: 'RUN', members: two, startedAt: 90_000_000 },
    ] as unknown as Duel[];
    const list = await new Duels(repo, records([]), Math.random, () => 90_000_001).mine('a');
    expect(list.map((d) => d.code)).toEqual(['RUN', 'ESP', 'FIN']);
  });
});
