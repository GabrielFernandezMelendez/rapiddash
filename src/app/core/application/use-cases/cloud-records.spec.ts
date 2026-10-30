import { CloudRecord } from '../../domain/race/cloud-record';
import { BestRun, GhostFrame } from '../../domain/race/ghost';
import { PHYSICS_VERSION } from '../../domain/race/physics-version';
import { Profile } from '../../domain/profile/profile';
import { BestRunRepository } from '../ports/out/best-run.repository';
import { CloudRecordRepository } from '../ports/out/cloud-record.repository';
import { CloudRecords } from './cloud-records';

class FakeCloud extends CloudRecordRepository {
  records = new Map<string, CloudRecord>();
  ghosts = new Map<string, readonly GhostFrame[]>();
  offline = false;
  async mine(mapId: string, uid: string) {
    if (this.offline) throw new Error('sin red');
    return this.records.get(`${mapId}/${uid}`) ?? null;
  }
  async save(record: CloudRecord, ghost: readonly GhostFrame[]) {
    if (this.offline) throw new Error('sin red');
    this.records.set(`${record.mapId}/${record.uid}`, record);
    this.ghosts.set(`${record.mapId}/${record.uid}`, ghost);
  }
  async top() {
    return [];
  }
  async rankOf() {
    return 1;
  }
  async above() {
    return null;
  }
  async count() {
    return this.records.size;
  }
  async ghost() {
    return null;
  }
  async updateIdentity(mapId: string, uid: string, nickname: string, country: Profile['country']) {
    const key = `${mapId}/${uid}`;
    const current = this.records.get(key);
    if (current) this.records.set(key, { ...current, nickname, country });
  }
}

class FakeBestRuns extends BestRunRepository {
  runs = new Map<string, BestRun>();
  async get(mapId: string) {
    return this.runs.get(mapId) ?? null;
  }
  async save(run: BestRun) {
    this.runs.set(run.mapId, run);
  }
}

const frames: GhostFrame[] = [
  { time: 0, progress: 0, leg: 0, distance: 0, lateral: 0, yaw: 0 },
];
const run = (mapId: string, time: number, physicsVersion = PHYSICS_VERSION): BestRun => ({
  mapId,
  time,
  frames,
  recordedAt: '2026-10-30T00:00:00.000Z',
  physicsVersion,
});
const profile: Profile = {
  uid: 'u1',
  nickname: 'Gabo',
  country: 'ES',
  kind: 'guest',
  createdAt: '',
  linkReminderAt: '',
};

describe('CloudRecords', () => {
  let cloud: FakeCloud;
  let bestRuns: FakeBestRuns;
  let records: CloudRecords;

  beforeEach(() => {
    cloud = new FakeCloud();
    bestRuns = new FakeBestRuns();
    records = new CloudRecords(cloud, bestRuns);
  });

  it('sube el récord con apodo, país y fantasma', async () => {
    expect(await records.publish(run('bay', 42), profile)).toBe('uploaded');
    expect(cloud.records.get('bay/u1')).toEqual(
      expect.objectContaining({ nickname: 'Gabo', country: 'ES', time: 42 }),
    );
    expect(cloud.ghosts.get('bay/u1')).toBe(frames);
  });

  it('sin piloto o con otra física no sube nada', async () => {
    expect(await records.publish(run('bay', 42), null)).toBe('skipped');
    expect(await records.publish(run('bay', 42, PHYSICS_VERSION - 1), profile)).toBe('skipped');
    expect(cloud.records.size).toBe(0);
  });

  it('no pisa un récord mejor de la nube (hecho en otro móvil)', async () => {
    await records.publish(run('bay', 40), profile);
    expect(await records.publish(run('bay', 42), profile)).toBe('skipped');
    expect(cloud.records.get('bay/u1')?.time).toBe(40);
  });

  it('sin red para leer, lo intenta subir igualmente', async () => {
    const save = vi.spyOn(cloud, 'save');
    cloud.offline = true;
    await expect(records.publish(run('bay', 42), profile)).rejects.toThrow();
    expect(save).toHaveBeenCalled();
  });

  it('al cambiar el apodo, actualiza mis récords subidos', async () => {
    await records.publish(run('bay', 42), profile);
    const renamed = { ...profile, nickname: 'Gabriel', country: 'MX' as const };
    expect(await records.updateIdentity(renamed, ['bay', 'canyon'])).toBe(1);
    expect(cloud.records.get('bay/u1')).toEqual(
      expect.objectContaining({ nickname: 'Gabriel', country: 'MX', time: 42 }),
    );
    expect(await records.updateIdentity(renamed, ['bay'])).toBe(0);
  });

  it('al arrancar sube los récords locales que mejoran la nube', async () => {
    await bestRuns.save(run('bay', 42));
    await bestRuns.save(run('canyon', 55));
    await records.publish(run('canyon', 50), profile);
    expect(await records.syncLocalBests(profile, ['bay', 'canyon', 'summit'])).toBe(1);
    expect(cloud.records.get('bay/u1')?.time).toBe(42);
    expect(cloud.records.get('canyon/u1')?.time).toBe(50);
  });
});
