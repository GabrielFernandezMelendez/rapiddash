import { describe, expect, it } from 'vitest';
import { isCurrentPhysics, PHYSICS_VERSION } from './physics-version';

describe('PHYSICS_VERSION', () => {
  it('acepta récords de la física actual', () => {
    expect(isCurrentPhysics({ physicsVersion: PHYSICS_VERSION })).toBe(true);
  });

  it('descarta récords de otra versión o sin versión', () => {
    expect(isCurrentPhysics({ physicsVersion: PHYSICS_VERSION - 1 })).toBe(false);
    expect(isCurrentPhysics({} as { physicsVersion: number })).toBe(false);
  });
});
