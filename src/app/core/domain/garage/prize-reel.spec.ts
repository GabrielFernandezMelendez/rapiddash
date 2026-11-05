import { describe, expect, it } from 'vitest';
import { lockedPrizes, Prize } from './garage';
import { carLook } from './car-looks';
import {
  PRIZE_REEL_WINNER,
  prizeReel,
  REEL_SETTLE_MS,
  REEL_SPIN_MS,
  reelPosition,
} from './prize-reel';

const shape = (p: Prize) => (p.kind === 'car' ? carLook(p.id).profile : `fx-${p.id}`);

/** Azar repetible para que el test no dependa de la suerte. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

describe('cinta de la ruleta', () => {
  const locked = lockedPrizes([], []);

  it('el premio cae siempre en su sitio, sea coche o efecto', () => {
    for (const prize of [{ kind: 'car', id: 14 }, { kind: 'fx', id: 3 }] as Prize[]) {
      expect(prizeReel(prize, locked)[PRIZE_REEL_WINNER]).toEqual(prize);
    }
  });

  it('nunca pone dos siluetas iguales seguidas', () => {
    for (let seed = 1; seed < 50; seed++) {
      const prize = locked[seed % locked.length];
      const reel = prizeReel(prize, locked, seeded(seed));
      for (let i = 1; i < reel.length; i++) expect(shape(reel[i])).not.toBe(shape(reel[i - 1]));
    }
  });

  it('solo enseña lo que aún se puede ganar', () => {
    const few = lockedPrizes(
      Array.from({ length: 15 }, (_, i) => i + 2),
      [2, 3, 4, 5, 6, 7, 8, 9, 10],
    );
    const reel = prizeReel(few[0], few, seeded(7));
    for (const item of reel) expect(few).toContainEqual(item);
  });

  it('con muy poco por ganar, se rellena para que siga pareciendo una ruleta', () => {
    const prize: Prize = { kind: 'fx', id: 10 };
    const reel = prizeReel(prize, [prize], seeded(3));
    expect(reel[PRIZE_REEL_WINNER]).toEqual(prize);
    expect(new Set(reel.map((p) => `${p.kind}-${p.id}`)).size).toBeGreaterThan(3);
  });
});

describe('movimiento de la cinta', () => {
  it('avanza sin retroceder mientras gira y va frenando', () => {
    let last = -1;
    let lastStep = Infinity;
    for (let ms = 0; ms <= REEL_SPIN_MS; ms += 200) {
      const pos = reelPosition(ms);
      expect(pos).toBeGreaterThan(last);
      if (last >= 0) {
        expect(pos - last).toBeLessThan(lastStep);
        lastStep = pos - last;
      }
      last = pos;
    }
  });

  it('se pasa un poco del premio y acaba justo en él', () => {
    expect(reelPosition(REEL_SPIN_MS)).toBeGreaterThan(PRIZE_REEL_WINNER);
    expect(reelPosition(REEL_SPIN_MS)).toBeLessThan(PRIZE_REEL_WINNER + 0.5);
    expect(reelPosition(REEL_SPIN_MS + REEL_SETTLE_MS)).toBe(PRIZE_REEL_WINNER);
    expect(reelPosition(Infinity)).toBe(PRIZE_REEL_WINNER);
  });
});
