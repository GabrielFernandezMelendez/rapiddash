import { DriveInput } from '../../domain/car/car';
import { ALL_MAPS, trackOf } from '../../domain/track/race-map';
import { AudioPort } from '../ports/out/audio.port';
import { BestRunRepository } from '../ports/out/best-run.repository';
import { GameLoopPort } from '../ports/out/game-loop.port';
import { InputPort } from '../ports/out/input.port';
import { RendererPort } from '../ports/out/renderer.port';
import { RaceSession, RaceViewState } from './race-session';

/** Sesión con puertos falsos: `frame` avanza un fotograma con el reinicio pedido o no. */
async function session(onRestart: (s: RaceSession) => void) {
  const map = ALL_MAPS[0];
  let tick: (dt: number) => void = () => undefined;
  let next: DriveInput = { throttle: false, swipes: [] };
  let view: RaceViewState | null = null;
  const silent = () =>
    new Proxy({}, { get: () => () => undefined }) as never;
  const race: RaceSession = new RaceSession(map, trackOf(map), {
    renderer: silent() as RendererPort,
    audio: silent() as AudioPort,
    input: {
      read: () => {
        const input = next;
        next = { throttle: false, swipes: [] };
        return input;
      },
    } as unknown as InputPort,
    loop: { start: (fn: (dt: number) => void) => (tick = fn), stop: () => undefined } as unknown as GameLoopPort,
    bestRuns: { get: async () => null, save: async () => undefined } as unknown as BestRunRepository,
  });
  await race.start(
    (s) => (view = s),
    () => onRestart(race),
  );
  return {
    frame(restart = false) {
      next = { throttle: true, swipes: [], restart };
      tick(1 / 60);
      return view!;
    },
  };
}

async function untilRacing(s: Awaited<ReturnType<typeof session>>): Promise<void> {
  for (let i = 0; i < 60 * 10 && s.frame().phase !== 'racing'; i++);
}

describe('RaceSession: reinicio en carrera', () => {
  it('en el semáforo no se pide reiniciar', async () => {
    let asked = 0;
    const s = await session(() => asked++);
    expect(s.frame(true).phase).toBe('countdown');
    expect(asked).toBe(0);
  });

  it('con la carrera en marcha, vuelve al semáforo', async () => {
    const s = await session((race) => race.restart());
    await untilRacing(s);
    for (let i = 0; i < 60; i++) s.frame();
    expect(s.frame(true).phase).toBe('countdown');
    expect(s.frame().time).toBe(0);
  });

  it('si no se concede (sin intentos), la carrera sigue', async () => {
    let asked = 0;
    const s = await session(() => asked++);
    await untilRacing(s);
    const before = s.frame().time;
    const view = s.frame(true);
    expect(asked).toBe(1);
    expect(view.phase).toBe('racing');
    expect(view.time).toBeGreaterThan(before);
  });
});
