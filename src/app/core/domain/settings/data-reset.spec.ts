import { describe, expect, it } from 'vitest';
import { DATA_RESET_VERSION, needsDataReset } from './data-reset';

describe('reinicio de datos', () => {
  it('limpia si el móvil nunca lo aplicó', () => {
    expect(needsDataReset(null)).toBe(true);
  });

  it('limpia si aplicó uno anterior o el valor no es válido', () => {
    expect(needsDataReset('1', 2)).toBe(true);
    expect(needsDataReset('basura', 2)).toBe(true);
  });

  it('no limpia dos veces el mismo reinicio', () => {
    expect(needsDataReset(String(DATA_RESET_VERSION))).toBe(false);
    expect(needsDataReset('3', 2)).toBe(false);
  });
});
