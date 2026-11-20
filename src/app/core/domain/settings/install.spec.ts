import { describe, expect, it } from 'vitest';
import { installState, isIosDevice } from './install';

describe('instalar como app', () => {
  it('instalada gana a todo', () => {
    expect(installState({ standalone: true, promptReady: true, ios: true })).toBe('installed');
  });
  it('con el aviso del navegador, se puede instalar', () => {
    expect(installState({ standalone: false, promptReady: true, ios: false })).toBe('available');
  });
  it('en iPhone, sin aviso, se explica Compartir', () => {
    expect(installState({ standalone: false, promptReady: false, ios: true })).toBe('ios');
  });
  it('sin aviso ni iPhone, desde el menú del navegador', () => {
    expect(installState({ standalone: false, promptReady: false, ios: false })).toBe('manual');
  });
  it('reconoce iPhone y el iPad que se hace pasar por Mac', () => {
    expect(isIosDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)', 5)).toBe(true);
    expect(isIosDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 5)).toBe(true);
    expect(isIosDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)', 0)).toBe(false);
    expect(isIosDevice('Mozilla/5.0 (Linux; Android 15; Pixel 9)', 5)).toBe(false);
  });
});
