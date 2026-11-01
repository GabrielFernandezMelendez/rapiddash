import { describe, expect, it } from 'vitest';
import { ALL_MAPS } from './race-map';
import { arc, left, right, straight } from './track-segment';
import { Track } from './track';
import {
  billboardLegs,
  DISTANT_PHOTO,
  distantPhotoSpots,
  MAX_BILLBOARDS,
  photoSpot,
  photoSpots,
  photoViewMeters,
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

  it('el cartel con foto va en la recta más larga, antes del cruce', () => {
    const track = Track.fromSegments([straight(30), right(), straight(100), left(), straight(40)]);
    const spot = photoSpot(track);
    expect(spot.leg).toBe(1);
    expect(spot.distance).toBeGreaterThan(30);
    expect(spot.distance).toBeLessThan(track.legs[1].length);
  });

  it('el cartel con foto va en la recta más larga aunque acabe en curva (circuitos)', () => {
    const track = Track.fromSegments([
      straight(20), right(), straight(100), arc(45, 45), straight(10), left(), straight(30),
    ]);
    const spot = photoSpot(track);
    expect(spot.leg).toBe(1);
    // Al 65 % de la recta de 100 m, no en los 10 m que hay antes del cruce
    expect(spot.distance).toBeGreaterThan(55);
    expect(spot.distance).toBeLessThan(75);
  });

  it('los dos carteles con foto van donde más tiempo se ven, separados y lejos de la salida', () => {
    for (const map of CIRCUIT_MAPS) {
      const track = trackOf(map).circuit!.lapTrack;
      const spots = photoSpots(track, true);
      expect(spots.length, map.id).toBe(2);
      const points = roadPoints(track);
      const progress = spots.map((s) => track.legs[s.leg].startProgress + s.distance);
      const lap = points.at(-1)!.progress;
      const gap = Math.abs(progress[0] - progress[1]);
      expect(Math.min(gap, lap - gap), map.id).toBeGreaterThanOrEqual(100);
      for (const s of spots) {
        const i = points.findIndex((p) => p.leg === s.leg && p.distance === s.distance);
        // Se ve durante al menos 60 m de carretera (alrededor de un segundo a toda velocidad)
        expect(photoViewMeters(points, i, true), map.id).toBeGreaterThanOrEqual(60);
        if (s.leg === 0) expect(s.distance, map.id).toBeGreaterThan(60);
      }
    }
  });

  it('los dos carteles lejanos van al fondo de una recta, fuera de la carretera y separados', () => {
    for (const map of CIRCUIT_MAPS) {
      const track = trackOf(map).circuit!.lapTrack;
      const overRoad = photoSpots(track, true).map((s) => track.pointAt(s.leg, s.distance));
      const spots = distantPhotoSpots(track, overRoad);
      expect(spots.length, map.id).toBe(2);
      const road = roadPoints(track);
      for (const s of spots) {
        const nearest = Math.min(...road.map((p) => Math.hypot(p.x - s.x, p.z - s.z)));
        expect(nearest, map.id).toBeGreaterThanOrEqual(DISTANT_PHOTO.roadClearance);
      }
      const [a, b] = spots;
      expect(Math.hypot(a.x - b.x, a.z - b.z), map.id).toBeGreaterThanOrEqual(DISTANT_PHOTO.apart);
    }
  });
});
