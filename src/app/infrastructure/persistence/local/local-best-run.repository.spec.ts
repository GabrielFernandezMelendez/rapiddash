import { beforeEach, describe, expect, it } from 'vitest';
import { BestRun } from '../../../core/domain/race/ghost';
import { PHYSICS_VERSION } from '../../../core/domain/race/physics-version';
import { LocalBestRunRepository } from './local-best-run.repository';

const run = (physicsVersion: number): BestRun => ({
  mapId: 'm1',
  time: 42,
  frames: [],
  recordedAt: '2026-10-30T00:00:00.000Z',
  physicsVersion,
});

describe('LocalBestRunRepository', () => {
  const repo = new LocalBestRunRepository();
  beforeEach(() => localStorage.clear());

  it('devuelve el récord guardado con la física actual', async () => {
    await repo.save(run(PHYSICS_VERSION));
    expect(await repo.get('m1')).toEqual(run(PHYSICS_VERSION));
  });

  it('ignora récords de otra física', async () => {
    await repo.save(run(PHYSICS_VERSION - 1));
    expect(await repo.get('m1')).toBeNull();
  });

  it('borra la clave antigua v2', async () => {
    localStorage.setItem('rapiddash.best.v2.m1', JSON.stringify(run(2)));
    expect(await repo.get('m1')).toBeNull();
    expect(localStorage.getItem('rapiddash.best.v2.m1')).toBeNull();
  });
});
