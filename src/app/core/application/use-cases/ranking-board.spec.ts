import { CloudRecord } from '../../domain/race/cloud-record';
import { PHYSICS_VERSION } from '../../domain/race/physics-version';
import { CloudRecordRepository } from '../ports/out/cloud-record.repository';
import { RankingBoard } from './ranking-board';

const rec = (uid: string, time: number, physicsVersion = PHYSICS_VERSION): CloudRecord => ({
  mapId: 'bay',
  uid,
  nickname: uid,
  country: 'ES',
  time,
  physicsVersion,
});

/** Ranking en memoria: 30 pilotos, p1 = 50 s, p2 = 51 s… */
class FakeCloud extends CloudRecordRepository {
  all = Array.from({ length: 30 }, (_, i) => rec(`p${i + 1}`, 50 + i));
  offline = false;
  private sorted() {
    if (this.offline) throw new Error('sin red');
    return this.all.filter((r) => r.physicsVersion === PHYSICS_VERSION).sort((a, b) => a.time - b.time);
  }
  async mine(_m: string, uid: string) {
    if (this.offline) throw new Error('sin red');
    return this.all.find((r) => r.uid === uid) ?? null;
  }
  async save() {}
  async top(_m: string, n: number) {
    return this.sorted().slice(0, n);
  }
  async rankOf(_m: string, time: number) {
    return this.sorted().filter((r) => r.time < time).length + 1;
  }
  async above(_m: string, time: number) {
    return this.sorted().filter((r) => r.time < time).at(-1) ?? null;
  }
  async count() {
    return this.sorted().length;
  }
  async ghost() {
    return null;
  }
  async updateIdentity() {}
}

describe('RankingBoard', () => {
  let cloud: FakeCloud;
  let board: RankingBoard;
  beforeEach(() => {
    cloud = new FakeCloud();
    board = new RankingBoard(cloud);
  });

  it('top 10, mi puesto fuera del top y el de encima', async () => {
    const view = await board.load('bay', 'p23');
    expect(view.top.map((r) => r.rank)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
    expect(view.me).toEqual({ rank: 23, record: expect.objectContaining({ uid: 'p23' }) });
    expect(view.above).toEqual({ rank: 22, record: expect.objectContaining({ uid: 'p22' }) });
    expect(view.total).toBe(30);
  });

  it('dentro del top, el de encima sale de la lista', async () => {
    const view = await board.load('bay', 'p4');
    expect(view.me?.rank).toBe(4);
    expect(view.above?.record.uid).toBe('p3');
  });

  it('un récord de otra física no cuenta como mío', async () => {
    cloud.all.push(rec('old', 40, PHYSICS_VERSION - 1));
    const view = await board.load('bay', 'old');
    expect(view.me).toBeNull();
    expect(view.top[0].record.uid).toBe('p1');
  });

  it('sin red, ranking vacío sin fallar', async () => {
    cloud.offline = true;
    expect(await board.load('bay', 'p1')).toEqual({ top: [], me: null, above: null, total: null });
    expect(await board.standing('bay', 40, null)).toBeNull();
  });

  it('tras mejorar: puesto, puestos que sube y siguiente rival', async () => {
    const standing = await board.standing('bay', 70.5, 25);
    expect(standing).toEqual({
      rank: 22,
      gained: 3,
      total: 30,
      next: { rank: 21, record: expect.objectContaining({ uid: 'p21' }) },
    });
  });

  it('el más rápido de todos no tiene siguiente rival', async () => {
    expect((await board.standing('bay', 45, null))?.next).toBeNull();
  });
});
