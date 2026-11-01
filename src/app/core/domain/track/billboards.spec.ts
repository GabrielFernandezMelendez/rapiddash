import { describe, expect, it } from 'vitest';
import { ALL_MAPS } from './race-map';
import { left, right, straight } from './track-segment';
import { Track } from './track';
import {
  billboardLegs,
  DISTANT_PHOTO,
  distantPhotoSpots,
  MAX_BILLBOARDS,
  roadPoints,
  straightApproach,
} from './billboards';
import { CIRCUIT_MAPS, trackOf } from './race-map';

describe('carteles de líderes', () => {
  it('mide la recta que hay justo antes del cruce', () => {
    const track = Track.fromSegments([straight(40), right(), straight(10)]);
    expect(straightApproach(track.legs[0])).toBeCloseTo(40, 0);
  });

  it('elige un cruce por mitad, el de la recta más larga, y nunca el primero', () => {
    const track = Track.fromSegments([
      straight(20), right(), straight(30), left(), straight(60), right(),
      straight(40), left(), straight(90), right(), straight(80),
    ]);
    // Tramos 1 (30 m) y 2 (60 m) en la primera mitad; 3 (40 m) y 4 (90 m) en la segunda
    expect(billboardLegs(track)).toEqual([2, 4]);
  });

  it('cada mapa tiene como mucho dos carteles, en cruces y sin repetir', () => {
    for (const map of ALL_MAPS) {
      const track = Track.fromSegments(map.segments);
      const legs = billboardLegs(track);
      expect(legs.length).toBeGreaterThan(0);
      expect(legs.length).toBeLessThanOrEqual(MAX_BILLBOARDS);
      expect(new Set(legs).size).toBe(legs.length);
      for (const i of legs) {
        expect(track.legs[i].junction).not.toBeNull();
        expect(i).toBeGreaterThan(0);
      }
    }
  });

  it('los cuatro carteles con foto van lejos, fuera de la carretera y separados', () => {
    for (const map of CIRCUIT_MAPS) {
      const track = trackOf(map).circuit!.lapTrack;
      const spots = distantPhotoSpots(track);
      expect(spots.length, map.id).toBe(4);
      const road = roadPoints(track);
      for (const s of spots) {
        const nearest = Math.min(...road.map((p) => Math.hypot(p.x - s.x, p.z - s.z)));
        expect(nearest, map.id).toBeGreaterThanOrEqual(DISTANT_PHOTO.roadClearance);
      }
      spots.forEach((a, i) =>
        spots.slice(i + 1).forEach((b) => {
          expect(Math.hypot(a.x - b.x, a.z - b.z), map.id).toBeGreaterThanOrEqual(DISTANT_PHOTO.apart);
        }),
      );
    }
  });
});
