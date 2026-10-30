import { engineFor, musicFor, pickTrack } from './soundtrack';

describe('Banda sonora', () => {
  it('retro y futurista comparten la música synthwave; el clásico tiene la suya', () => {
    expect(musicFor('retro')).toBe(musicFor('futurist'));
    expect(musicFor('classic')).not.toBe(musicFor('retro'));
    expect(musicFor('classic').length).toBe(4);
    expect(musicFor('retro').length).toBe(3);
  });

  it('cada canción vuelve a un punto válido del bucle', () => {
    for (const t of [...musicFor('classic'), ...musicFor('retro')]) {
      expect(t.start).toBeGreaterThanOrEqual(0);
      expect(t.loopStart).toBeGreaterThanOrEqual(0);
    }
    const jazz = musicFor('classic').find((t) => t.file.includes('jazz'))!;
    expect(jazz).toEqual(expect.objectContaining({ start: 8, loopStart: 10 }));
  });

  it('nunca repite la canción anterior', () => {
    const list = musicFor('retro');
    for (let i = 0; i < 20; i++) {
      const previous = list[i % list.length];
      expect(pickTrack(list, previous, () => (i * 0.37) % 1)).not.toBe(previous);
    }
  });

  it('elige entre todas al azar', () => {
    const list = musicFor('classic');
    expect(pickTrack(list, null, () => 0)).toBe(list[0]);
    expect(pickTrack(list, null, () => 0.999)).toBe(list[3]);
  });

  it('con una sola canción la repite; sin canciones, silencio', () => {
    const one = musicFor('retro').slice(0, 1);
    expect(pickTrack(one, one[0])).toBe(one[0]);
    expect(pickTrack([], null)).toBeNull();
  });

  it('el clásico mantiene el motor de vueltas; retro y nave, el zumbido en bucle', () => {
    expect(engineFor('classic').mode).toBe('rev');
    expect(engineFor('retro')).toEqual({ file: 'engine/retro.mp3', mode: 'loop' });
    expect(engineFor('futurist')).toEqual({ file: 'engine/futurist.mp3', mode: 'loop' });
  });
});
