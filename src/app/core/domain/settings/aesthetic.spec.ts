import { AESTHETICS, DEFAULT_AESTHETIC, isAesthetic, isSynthwave } from './aesthetic';

describe('Estética', () => {
  it('hay tres estéticas y la clásica es la de por defecto', () => {
    expect(AESTHETICS).toEqual(['classic', 'retro', 'futurist']);
    expect(DEFAULT_AESTHETIC).toBe('classic');
  });

  it('reconoce solo valores válidos', () => {
    expect(isAesthetic('retro')).toBe(true);
    expect(isAesthetic('neon')).toBe(false);
    expect(isAesthetic(null)).toBe(false);
  });

  it('retro y futurista comparten el mundo synthwave', () => {
    expect(isSynthwave('classic')).toBe(false);
    expect(isSynthwave('retro')).toBe(true);
    expect(isSynthwave('futurist')).toBe(true);
  });
});
