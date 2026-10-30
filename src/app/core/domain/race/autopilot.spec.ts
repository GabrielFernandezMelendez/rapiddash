import { CarState, DriveInput, Swipe } from '../car/car';
import { ALL_MAPS } from '../track/race-map';
import { Track } from '../track/track';
import { createRace, RaceState, stepRace } from './race';

/** Piloto automático sencillo: demuestra que cada mapa se puede terminar sin chocar. */
function autopilot(car: CarState, track: Track): DriveInput {
  const swipes: Swipe[] = [];
  const leg = track.legs[car.leg];
  const inJunction = !!leg.junction && car.distance > leg.length;
  if (car.mode === 'driving') {
    if (inJunction && car.yawTarget === 0 && car.distance > leg.length + 2.5) {
      // Gira en el cruce a unos 2,5 m: sale por un carril central
      swipes.push(leg.junction!.direction > 0 ? 'right' : 'left');
    } else if (
      !inJunction &&
      car.yawTarget === 0 &&
      car.laneTarget === null &&
      Math.abs(car.lateral) > 3.3 &&
      car.distance < leg.length - 3
    ) {
      // Corrige el magnetismo antes de llegar al muro: un carril hacia el centro
      swipes.push(car.lateral > 0 ? 'left' : 'right');
    }
  }
  return { throttle: true, swipes };
}

describe('Mapas jugables', () => {
  for (const map of ALL_MAPS) {
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
      expect(race.raceTime).toBeGreaterThan(18);
      expect(race.raceTime).toBeLessThan(90);
    });
  }
});
