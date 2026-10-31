import { right, straight } from '../track/track-segment';
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

describe('Carrera en un circuito', () => {
  // Óvalo cuadrado de 4 derechas; el piloto gira en cada cruce y acelera siempre
  const lapSegments = [straight(60), right(), straight(30), right(), straight(60), right(), straight(30), right(), straight(30)];

  it('cuenta las vueltas, avisa en cada una y guarda sus tiempos', () => {
    const track = Track.circuit(lapSegments, 3);
    let race = createRace(track);
    const laps: number[] = [];
    for (let i = 0; i < 60 * 120 && race.phase !== 'finished'; i++) {
      const leg = track.legs[race.car.leg];
      const turn = !!leg.junction && race.car.distance > leg.length + 2.5 && race.car.yawTarget === 0;
      const next = stepRace(race, { throttle: true, swipes: turn ? ['right'] : [] }, track, 1 / 60);
      if (next.events.includes('lap')) laps.push(next.race.lap);
      race = next.race;
    }
    expect(race.phase).toBe('finished');
    expect(laps).toEqual([2, 3]);
    expect(race.lapTimes.length).toBe(3);
    // Las vueltas suman el tiempo total; la primera es la más lenta (sale parado)
    expect(race.lapTimes.reduce((a, b) => a + b, 0)).toBeCloseTo(race.raceTime, 6);
    expect(race.lapTimes[0]).toBeGreaterThan(race.lapTimes[1]);
  });
});
