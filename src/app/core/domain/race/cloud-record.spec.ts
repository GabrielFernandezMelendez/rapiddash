import { CloudRecord, improvesCloudRecord, isPlausibleTime } from './cloud-record';
import { PHYSICS_VERSION } from './physics-version';

const record = (time: number, physicsVersion = PHYSICS_VERSION): CloudRecord => ({
  mapId: 'bay',
  uid: 'u1',
  nickname: 'Gabo',
  country: 'ES',
  time,
  physicsVersion,
});

describe('Récord en la nube', () => {
  it('sube el primer tiempo y los que mejoran', () => {
    expect(improvesCloudRecord(42, null)).toBe(true);
    expect(improvesCloudRecord(41.9, record(42))).toBe(true);
    expect(improvesCloudRecord(42, record(42))).toBe(false);
    expect(improvesCloudRecord(43, record(42))).toBe(false);
  });

  it('un récord de otra física se sustituye aunque sea peor', () => {
    expect(improvesCloudRecord(50, record(42, PHYSICS_VERSION - 1))).toBe(true);
  });

  it('descarta tiempos imposibles', () => {
    expect(isPlausibleTime(5)).toBe(false);
    expect(isPlausibleTime(Number.NaN)).toBe(false);
    expect(isPlausibleTime(4000)).toBe(false);
    expect(improvesCloudRecord(3, null)).toBe(false);
  });
});
