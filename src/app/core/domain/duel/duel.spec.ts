import {
  attemptsLeft,
  canRaceDuel,
  Duel,
  DUEL_ATTEMPTS,
  DUEL_RACE_GRACE_MS,
  DUEL_WINDOW_MS,
  duelBoardId,
  duelJoinProblem,
  duelOutcome,
  duelRemaining,
  duelStatus,
  DuelPlayer,
  newDuelPlayer,
  pickDuelMap,
  rivalOf,
} from './duel';

const member = (uid: string) => ({ uid, nickname: uid, country: null });
const player = (patch: Partial<DuelPlayer> = {}): DuelPlayer => ({
  ...newDuelPlayer({ car: null, fx: 1 }),
  ...patch,
});
const START = 1_000_000;

function duel(a: Partial<DuelPlayer> = {}, b: Partial<DuelPlayer> = {}): Duel {
  return {
    code: 'K7RQ2M',
    ownerUid: 'a',
    members: [member('a'), member('b')],
    players: { a: player(a), b: player(b) },
    startedAt: START,
    mapId: 'mapa',
  };
}

describe('1 vs 1: estado del duelo', () => {
  it('espera hasta que entra el rival', () => {
    const d: Duel = { ...duel(), members: [member('a')], players: { a: player() }, startedAt: null };
    expect(duelStatus(d, START)).toBe('waiting');
    expect(rivalOf(d, 'a')).toBeNull();
    expect(duelRemaining(d, START)).toBe(0);
    expect(canRaceDuel(d, 'a', START)).toBe(false);
  });

  it('con el rival dentro, en marcha y 3 intentos para cada uno', () => {
    const d = duel();
    expect(duelStatus(d, START)).toBe('running');
    expect(rivalOf(d, 'a')?.uid).toBe('b');
    expect(attemptsLeft(d, 'a')).toBe(DUEL_ATTEMPTS);
    expect(canRaceDuel(d, 'a', START)).toBe(true);
  });

  it('sin intentos no se puede correr, y quien no está dentro tampoco', () => {
    const d = duel({ attempts: 3, lastStartAt: START });
    expect(attemptsLeft(d, 'a')).toBe(0);
    expect(canRaceDuel(d, 'a', START + 1)).toBe(false);
    expect(canRaceDuel(d, 'b', START + 1)).toBe(true);
    expect(canRaceDuel(d, 'c', START + 1)).toBe(false);
  });

  it('no termina mientras el rival corre su último intento', () => {
    const d = duel({ attempts: 3, lastStartAt: START, done: true }, { attempts: 3, lastStartAt: START });
    expect(duelStatus(d, START + 1000)).toBe('running');
  });

  it('termina cuando los dos avisan de que han acabado', () => {
    const d = duel({ attempts: 3, lastStartAt: START, done: true }, { attempts: 3, lastStartAt: START, done: true });
    expect(duelStatus(d, START + 1000)).toBe('finished');
  });

  it('si a alguien se le cierra la app en el último intento, termina igual pasado un rato', () => {
    const d = duel({ attempts: 3, lastStartAt: START, done: true }, { attempts: 3, lastStartAt: START });
    expect(duelStatus(d, START + DUEL_RACE_GRACE_MS)).toBe('finished');
  });

  it('si el rival desaparece, termina al acabar el plazo', () => {
    const d = duel({ attempts: 1, lastStartAt: START });
    expect(duelStatus(d, START + DUEL_WINDOW_MS - 1)).toBe('running');
    expect(duelRemaining(d, START + DUEL_WINDOW_MS - 1)).toBe(1);
    expect(duelStatus(d, START + DUEL_WINDOW_MS)).toBe('finished');
    expect(canRaceDuel(d, 'a', START + DUEL_WINDOW_MS)).toBe(false);
    expect(duelRemaining(d, START + DUEL_WINDOW_MS + 5)).toBe(0);
  });
});

describe('1 vs 1: unirse', () => {
  it('entra quien no está si queda sitio', () => {
    const waiting: Duel = { ...duel(), members: [member('a')], players: { a: player() }, startedAt: null };
    expect(duelJoinProblem(waiting, 'b')).toBeNull();
    expect(duelJoinProblem(waiting, 'a')).toBe('already');
  });

  it('con los dos dentro está lleno, salvo para ellos', () => {
    expect(duelJoinProblem(duel(), 'c')).toBe('full');
    expect(duelJoinProblem(duel(), 'b')).toBe('already');
  });
});

describe('1 vs 1: resultado', () => {
  it('gana el mejor tiempo', () => {
    const outcome = duelOutcome(duel(), [
      { uid: 'a', time: 42.1 },
      { uid: 'b', time: 41.2 },
    ]);
    expect(outcome).toEqual({ kind: 'winner', uid: 'b' });
  });

  it('si solo corrió uno, gana él', () => {
    expect(duelOutcome(duel(), [{ uid: 'a', time: 42.1 }])).toEqual({ kind: 'winner', uid: 'a' });
  });

  it('mismo tiempo exacto: empate', () => {
    const outcome = duelOutcome(duel(), [
      { uid: 'a', time: 41.2 },
      { uid: 'b', time: 41.2 },
    ]);
    expect(outcome).toEqual({ kind: 'draw' });
  });

  it('si nadie corrió no hay ganador, y los de fuera no cuentan', () => {
    expect(duelOutcome(duel(), [])).toEqual({ kind: 'none' });
    expect(duelOutcome(duel(), [{ uid: 'c', time: 10 }])).toEqual({ kind: 'none' });
  });
});

describe('1 vs 1: varios', () => {
  it('el tablero lleva el código y el mapa sale de la lista', () => {
    expect(duelBoardId('K7RQ2M')).toBe('d-K7RQ2M');
    expect(pickDuelMap(['x', 'y'], () => 0)).toBe('x');
    expect(pickDuelMap(['x', 'y'], () => 0.999)).toBe('y');
  });
});
