import { CarState, DriveInput, Swipe } from '../car/car';
import { RACE_MAPS } from '../track/race-map';
import { Track } from '../track/track';
import { createRace, RaceState, stepRace } from './race';

/** Piloto automático sencillo: demuestra que cada mapa se puede terminar sin chocar. */
function autopilot(car: CarState, track: Track): DriveInput {
  const swipes: Swipe[] = [];
  if (car.mode === 'driving') {
    const corner = track.cornerNear(car.distance, 5);
    if (car.yawTarget !== 0 && Math.abs(car.lateral) < 0.4) swipes.push('forward');
    else if (corner && car.yawTarget === 0) swipes.push(corner.direction > 0 ? 'right' : 'left');
    else if (car.yawTarget === 0 && Math.abs(car.lateral) > 2.4)
      swipes.push(car.lateral > 0 ? 'left' : 'right');
  }
  return { throttle: true, swipes };
}

describe('Mapas jugables', () => {
  for (const map of RACE_MAPS) {
    it(`${map.id}: se termina con el piloto automático y sin choques`, () => {
      const track = Track.fromSegments(map.segments);
      let race: RaceState = createRace(track);
      let crashes = 0;
      const dt = 1 / 60;
      for (let i = 0; i < 60 * 180 && race.phase !== 'finished'; i++) {
        const next = stepRace(race, autopilot(race.car, track), track, dt);
        crashes += next.events.filter((e) => e === 'crash').length;
        race = next.race;
      }
      expect(race.phase).toBe('finished');
      expect(crashes).toBe(0);
      // Duración razonable para una carrera de móvil
      expect(race.raceTime).toBeGreaterThan(20);
      expect(race.raceTime).toBeLessThan(90);
    });
  }
});
