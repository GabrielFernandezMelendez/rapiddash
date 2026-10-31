import { clampVolume, DEFAULT_VOLUMES, toPercent, toVolumes } from './volume';

describe('Volumen', () => {
  it('por defecto, todo al máximo', () => {
    expect(DEFAULT_VOLUMES).toEqual({ music: 1, effects: 1 });
  });

  it('siempre entre 0 y 1', () => {
    expect(clampVolume(1.4)).toBe(1);
    expect(clampVolume(-0.2)).toBe(0);
    expect(clampVolume('0.5')).toBe(0.5);
    expect(clampVolume('basura')).toBe(1);
  });

  it('lee lo guardado aunque falte o venga roto', () => {
    expect(toVolumes(null)).toEqual({ music: 1, effects: 1 });
    expect(toVolumes({ music: 0.3 })).toEqual({ music: 0.3, effects: 1 });
    expect(toVolumes({ music: 0, effects: 7 })).toEqual({ music: 0, effects: 1 });
  });

  it('se muestra en porcentaje', () => {
    expect(toPercent(0.704)).toBe(70);
    expect(toPercent(0)).toBe(0);
  });
});
