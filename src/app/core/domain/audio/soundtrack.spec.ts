import { ENGINE, MUSIC, pickTrack } from './soundtrack';

describe('Banda sonora', () => {
  it('tres canciones synthwave y el zumbido del motor', () => {
    expect(MUSIC.length).toBe(3);
    expect(ENGINE).toEqual({ file: 'engine/retro.mp3' });
  });

  it('cada canción vuelve a un punto válido del bucle', () => {
    for (const t of MUSIC) {
      expect(t.start).toBeGreaterThanOrEqual(0);
      expect(t.loopStart).toBeGreaterThanOrEqual(0);
    }
  });

  it('nunca repite la canción anterior', () => {
    for (let i = 0; i < 20; i++) {
      const previous = MUSIC[i % MUSIC.length];
      expect(pickTrack(MUSIC, previous, () => (i * 0.37) % 1)).not.toBe(previous);
    }
  });

  it('elige entre todas al azar', () => {
    expect(pickTrack(MUSIC, null, () => 0)).toBe(MUSIC[0]);
    expect(pickTrack(MUSIC, null, () => 0.999)).toBe(MUSIC[2]);
  });

  it('con una sola canción la repite; sin canciones, silencio', () => {
    const one = MUSIC.slice(0, 1);
    expect(pickTrack(one, one[0])).toBe(one[0]);
    expect(pickTrack([], null)).toBeNull();
  });
});
