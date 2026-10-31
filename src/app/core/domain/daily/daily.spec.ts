import {
  canRace,
  currentAttempts,
  freshAttempts,
  grantAdAttempts,
  useAttempt,
  waitRemaining,
  WAIT_MS,
} from './daily-attempts';
import { dailyBoardId, dailyKey, dailyMapId, dailyPool, msUntilNextDay, trophyFor } from './daily-map';

const MAPS = ['bay', 'canyon', 'summit', 'bay-zigzag', 'canyon-zigzag', 'summit-zigzag'];

describe('Mapa del día', () => {
  it('el día es el de España, no el del móvil', () => {
    // 23:30 UTC del 31 de octubre = 00:30 del 1 de noviembre en Madrid (UTC+1)
    expect(dailyKey(new Date('2026-10-31T23:30:00Z'))).toBe('2026-11-01');
    expect(dailyKey(new Date('2026-10-31T22:59:00Z'))).toBe('2026-10-31');
    expect(dailyBoardId('2026-10-31')).toBe('daily-2026-10-31');
  });

  it('rota por los mapas: uno distinto cada día y vuelta a empezar', () => {
    const week = ['2026-10-31', '2026-11-01', '2026-11-02', '2026-11-03', '2026-11-04', '2026-11-05', '2026-11-06'];
    const maps = week.map((d) => dailyMapId(d, MAPS));
    expect(new Set(maps.slice(0, 6)).size).toBe(6);
    expect(maps[6]).toBe(maps[0]);
    expect(dailyMapId('2026-10-31', MAPS)).toBe(dailyMapId('2026-10-31', MAPS));
  });

  it('cuenta atrás hasta la medianoche de España', () => {
    expect(msUntilNextDay(new Date('2026-10-31T22:00:00Z'))).toBe(60 * 60 * 1000);
    // Verano (UTC+2): 21:30 UTC = 23:30 en Madrid
    expect(msUntilNextDay(new Date('2026-07-01T21:30:00Z'))).toBe(30 * 60 * 1000);
  });

  it('copa por tercios del ranking', () => {
    expect(trophyFor(1, 3)).toBe('gold');
    expect(trophyFor(2, 3)).toBe('silver');
    expect(trophyFor(3, 3)).toBe('bronze');
    expect(trophyFor(1453, 2000)).toBe('bronze');
    expect(trophyFor(600, 2000)).toBe('gold');
    expect(trophyFor(1, 1)).toBe('gold');
  });
});

describe('Intentos del mapa del día', () => {
  const day = '2026-10-31';

  it('2 gratis; al gastarlos empieza la espera', () => {
    let s = freshAttempts(day);
    s = useAttempt(s, 0);
    expect(canRace(s)).toBe(true);
    s = useAttempt(s, 1000);
    expect(canRace(s)).toBe(false);
    expect(waitRemaining(s, 1000)).toBe(WAIT_MS);
  });

  it('esperar 3 h da 2 intentos más', () => {
    let s = useAttempt(useAttempt(freshAttempts(day), 0), 0);
    s = currentAttempts(s, day, WAIT_MS - 1);
    expect(canRace(s)).toBe(false);
    s = currentAttempts(s, day, WAIT_MS);
    expect(s.allowed - s.used).toBe(2);
  });

  it('un anuncio da 3 intentos más al momento', () => {
    let s = useAttempt(useAttempt(freshAttempts(day), 0), 0);
    s = grantAdAttempts(s);
    expect(s.allowed - s.used).toBe(3);
    expect(waitRemaining(s, 0)).toBe(0);
  });

  it('un día nuevo empieza de cero', () => {
    const s = useAttempt(useAttempt(freshAttempts(day), 0), 0);
    expect(currentAttempts(s, '2026-11-01', 0)).toEqual(freshAttempts('2026-11-01'));
  });
});

describe('circuitos en el mapa del día', () => {
  const maps = [
    { id: 'bay', layout: 'classic' },
    { id: 'port-loop', layout: 'laps' },
  ];

  it('el mapa del día sale solo de los circuitos', () => {
    expect(dailyPool('2026-11-01', maps).map((m) => m.id)).toEqual(['port-loop']);
    expect(dailyPool('2026-11-02', maps).map((m) => m.id)).toEqual(['port-loop']);
  });
});
