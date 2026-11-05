import { autopilot } from './autopilot';
import { ALL_MAPS, trackOf } from '../track/race-map';
import { createRace, RaceState, stepRace } from './race';

describe('Mapas jugables', () => {
  for (const map of ALL_MAPS) {
    it(`${map.id}: se termina con el piloto automático y sin choques`, () => {
      const track = trackOf(map);
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
      // Circuitos: 3 vueltas en 30-60 s
      if (track.circuit) {
        expect(race.lapTimes.length).toBe(3);
        expect(race.raceTime).toBeGreaterThan(30);
        expect(race.raceTime).toBeLessThan(60);
      }
    });
  }
});
