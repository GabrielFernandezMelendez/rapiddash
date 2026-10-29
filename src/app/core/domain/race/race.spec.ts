import { straight } from '../track/track-segment';
import { Track } from '../track/track';
import { createRace, LIGHT_DURATION, lightOf, RaceState, showsGo, stepRace } from './race';

const DT = 1 / 60;
const hold = { throttle: true, swipes: [] };

describe('Race', () => {
  const track = Track.fromSegments([straight(150)]);

  it('el semáforo pasa de rojo a amarillo y luego arranca en verde', () => {
    let race: RaceState = createRace(track);
    expect(lightOf(race)).toBe('red');
    race = stepRace(race, hold, track, LIGHT_DURATION + 0.1).race;
    expect(lightOf(race)).toBe('yellow');
    const go = stepRace(race, hold, track, LIGHT_DURATION);
    expect(go.events).toContain('go');
    expect(go.race.phase).toBe('racing');
    expect(showsGo(go.race)).toBe(true);
  });

  it('ignora los controles durante la cuenta atrás', () => {
    const race = stepRace(createRace(track), hold, track, 1).race;
    expect(race.car.speed).toBe(0);
  });

  it('termina al cruzar la meta con un tiempo positivo', () => {
    let race: RaceState = createRace(track);
    let finished = false;
    for (let i = 0; i < 60 * 30 && !finished; i++) {
      const next = stepRace(race, hold, track, DT);
      race = next.race;
      finished = next.events.includes('finish');
    }
    expect(race.phase).toBe('finished');
    expect(race.raceTime).toBeGreaterThan(0);
  });
});
