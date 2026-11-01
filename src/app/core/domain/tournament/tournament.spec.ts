import {
  CODE_ALPHABET,
  dayBoardId,
  dayIndex,
  dayRemaining,
  generateCode,
  joinProblem,
  normalizeCode,
  pickMaps,
  pointsFor,
  standings,
  statusAt,
  Tournament,
  TOURNAMENT_DAY_MS,
  TOURNAMENT_MAX_MEMBERS,
} from './tournament';

const member = (uid: string) => ({ uid, nickname: uid, country: 'ES' as const });
const base: Tournament = {
  code: 'K7RQ2M',
  name: 'Primos',
  ownerUid: 'ana',
  members: ['ana', 'gabo', 'nico'].map(member),
  startedAt: null,
  mapIds: [],
};

describe('Torneos', () => {
  it('códigos de 6 caracteres sin letras confusas', () => {
    const code = generateCode(() => 0.5);
    expect(code).toHaveLength(6);
    expect([...code].every((c) => CODE_ALPHABET.includes(c))).toBe(true);
    expect(CODE_ALPHABET).not.toMatch(/[01OIL]/);
    expect(normalizeCode(' k7rq-2m ')).toBe('K7RQ2M');
    expect(normalizeCode('K7RQ0M')).toBeNull();
    expect(normalizeCode('ABC')).toBeNull();
  });

  it('tres mapas distintos al azar', () => {
    const maps = pickMaps(['a', 'b', 'c', 'd', 'e', 'f'], () => 0);
    expect(maps).toEqual(['a', 'b', 'c']);
    expect(new Set(pickMaps(['a', 'b', 'c', 'd'], Math.random)).size).toBe(3);
  });

  it('con circuitos, uno de los tres mapas es siempre un circuito', () => {
    for (let i = 0; i < 50; i++) {
      const maps = pickMaps(['a', 'b', 'c', 'd', 'l1', 'l2'], Math.random, ['l1', 'l2']);
      expect(maps.length).toBe(3);
      expect(new Set(maps).size).toBe(3);
      expect(maps.filter((m) => m.startsWith('l')).length).toBe(1);
    }
  });

  it('esperando, en curso por días y terminado', () => {
    expect(statusAt(base, 0)).toBe('waiting');
    const t = { ...base, startedAt: 1000 };
    expect(dayIndex(t, 1000)).toBe(0);
    expect(dayIndex(t, 1000 + TOURNAMENT_DAY_MS)).toBe(1);
    expect(statusAt(t, 1000 + 2.5 * TOURNAMENT_DAY_MS)).toBe('running');
    expect(statusAt(t, 1000 + 3 * TOURNAMENT_DAY_MS)).toBe('finished');
    expect(dayRemaining(t, 1000 + TOURNAMENT_DAY_MS / 2)).toBe(TOURNAMENT_DAY_MS / 2);
    expect(dayBoardId('K7RQ2M', 1)).toBe('t-K7RQ2M-d1');
  });

  it('unirse: solo antes de empezar y hasta 10', () => {
    expect(joinProblem(base, 'lucia')).toBeNull();
    expect(joinProblem(base, 'gabo')).toBe('already');
    // Ya empezado se puede entrar; terminado, no
    expect(joinProblem({ ...base, startedAt: 1 }, 'lucia', 2)).toBeNull();
    expect(joinProblem({ ...base, startedAt: 1 }, 'lucia', 1 + 3 * TOURNAMENT_DAY_MS)).toBe('finished');
    const full = { ...base, members: Array.from({ length: TOURNAMENT_MAX_MEMBERS }, (_, i) => member(`p${i}`)) };
    expect(joinProblem(full, 'lucia')).toBe('full');
  });

  it('puntos por puesto como en Mario Kart', () => {
    expect([1, 2, 3, 10, 11].map(pointsFor)).toEqual([15, 12, 10, 2, 0]);
  });

  it('clasificación: suma de días, quien no corre suma 0 y desempata quien gana más días', () => {
    const t = { ...base, startedAt: 0 };
    const rows = standings(t, [
      [
        { uid: 'ana', time: 60 },
        { uid: 'gabo', time: 61 },
        { uid: 'intruso', time: 10 },
      ],
      [
        { uid: 'gabo', time: 58 },
        { uid: 'nico', time: 59 },
        { uid: 'ana', time: 70 },
      ],
    ]);
    expect(rows.map((r) => [r.member.uid, r.total, r.days])).toEqual([
      ['gabo', 27, [12, 15]],
      ['ana', 25, [15, 10]],
      ['nico', 12, [null, 12]],
    ]);
    // El tiempo de cada día va con la fila (null si no corrió)
    expect(rows.find((r) => r.member.uid === 'nico')?.times).toEqual([null, 59]);
    expect(rows.find((r) => r.member.uid === 'gabo')?.times).toEqual([61, 58]);
    // Empate a puntos: gana quien ganó más días
    const tie = standings(t, [[{ uid: 'ana', time: 1 }, { uid: 'gabo', time: 2 }], [{ uid: 'gabo', time: 1 }, { uid: 'ana', time: 2 }]]);
    expect(tie[0].total).toBe(tie[1].total);
    expect(tie[0].wins).toBe(1);
  });
});
