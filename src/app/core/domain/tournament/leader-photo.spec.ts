import { describe, expect, it } from 'vitest';
import { isValidPhoto, leaderOf, PHOTO_MAX_LENGTH, PHOTO_PREFIX, shouldOfferPhoto } from './leader-photo';
import { StandingRow } from './tournament';

const row = (uid: string, total: number): StandingRow => ({
  member: { uid, nickname: uid, country: null },
  days: [total],
  total,
  wins: 0,
});

describe('foto del líder', () => {
  it('el líder es el 1.º con puntos; sin puntos no hay líder', () => {
    expect(leaderOf([row('a', 15), row('b', 12)])?.member.uid).toBe('a');
    expect(leaderOf([row('a', 0)])).toBeNull();
    expect(leaderOf([])).toBeNull();
  });

  it('solo se ofrece al líder sin foto que no la ha rechazado', () => {
    expect(shouldOfferPhoto(true, false, false)).toBe(true);
    expect(shouldOfferPhoto(false, false, false)).toBe(false);
    expect(shouldOfferPhoto(true, true, false)).toBe(false);
    expect(shouldOfferPhoto(true, false, true)).toBe(false);
  });

  it('acepta JPEG en data URL hasta el tamaño máximo', () => {
    expect(isValidPhoto(PHOTO_PREFIX + 'abc')).toBe(true);
    expect(isValidPhoto('data:image/png;base64,abc')).toBe(false);
    expect(isValidPhoto(PHOTO_PREFIX + 'a'.repeat(PHOTO_MAX_LENGTH))).toBe(false);
  });
});
