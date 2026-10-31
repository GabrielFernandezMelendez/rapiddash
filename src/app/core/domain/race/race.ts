import { CarEvent, CarState, createCar, DriveInput, stepCar } from '../car/car';
import { Track } from '../track/track';

export type RacePhase = 'countdown' | 'racing' | 'finished';
export type CountdownLight = 'red' | 'yellow' | 'green';

/** Segundos que dura cada luz del semáforo antes de la verde. */
export const LIGHT_DURATION = 1;
/** Segundos que se muestra el "GO" tras la luz verde. */
export const GO_DURATION = 0.9;

export type RaceEvent = CarEvent | 'light' | 'go' | 'lap' | 'finish';

export interface RaceState {
  readonly phase: RacePhase;
  /** Segundos desde que se encendió el semáforo. */
  readonly countdownTime: number;
  /** Tiempo de carrera (empieza en la luz verde). */
  readonly raceTime: number;
  readonly car: CarState;
  /** Vuelta en curso (1 en los mapas de ida). */
  readonly lap: number;
  /** Tiempo de cada vuelta ya terminada (s); vacío en los mapas de ida. */
  readonly lapTimes: readonly number[];
}

export function createRace(track: Track): RaceState {
  return { phase: 'countdown', countdownTime: 0, raceTime: 0, car: createCar(track), lap: 1, lapTimes: [] };
}

export function lightOf(race: RaceState): CountdownLight {
  if (race.phase !== 'countdown') return 'green';
  return race.countdownTime < LIGHT_DURATION ? 'red' : 'yellow';
}

export function showsGo(race: RaceState): boolean {
  return race.phase === 'racing' && race.raceTime < GO_DURATION;
}

export function stepRace(
  race: RaceState,
  input: DriveInput,
  track: Track,
  dt: number,
): { race: RaceState; events: RaceEvent[] } {
  if (race.phase === 'finished') return { race, events: [] };

  if (race.phase === 'countdown') {
    const before = lightOf(race);
    const countdownTime = race.countdownTime + dt;
    if (countdownTime >= LIGHT_DURATION * 2) {
      // Luz verde: arranca el cronómetro con el tiempo sobrante del tick
      const extra = countdownTime - LIGHT_DURATION * 2;
      const started: RaceState = { ...race, phase: 'racing', countdownTime, raceTime: 0 };
      const next =
        extra > 0 ? stepRace(started, input, track, extra) : { race: started, events: [] };
      return { race: next.race, events: ['go', ...next.events] };
    }
    const next = { ...race, countdownTime };
    return { race: next, events: lightOf(next) !== before ? ['light'] : [] };
  }

  const { car, events } = stepCar(race.car, input, track, dt);
  const raceTime = race.raceTime + dt;
  const before = track.progress(race.car.leg, race.car.distance);
  const after = track.progress(car.leg, car.distance);
  // Instante exacto en el que se cruza una línea, para que el tiempo no dependa de los fps
  const crossedAt = (line: number) => {
    const covered = after - before;
    return race.raceTime + dt * (covered > 0 ? (line - before) / covered : 1);
  };
  const lapTimeAt = (time: number) => time - race.lapTimes.reduce((sum, t) => sum + t, 0);
  if (after >= track.finishProgress) {
    const time = crossedAt(track.finishProgress);
    const lapTimes = track.circuit ? [...race.lapTimes, lapTimeAt(time)] : race.lapTimes;
    return {
      race: { ...race, phase: 'finished', car, raceTime: time, lapTimes },
      events: [...events, 'finish'],
    };
  }
  const lap = track.lapAt(after);
  if (lap > race.lap) {
    // Nueva vuelta: se guarda el tiempo de la que acaba
    const time = crossedAt(track.lapStartProgress(lap));
    return {
      race: { ...race, car, raceTime, lap, lapTimes: [...race.lapTimes, lapTimeAt(time)] },
      events: [...events, 'lap'],
    };
  }
  return { race: { ...race, car, raceTime }, events };
}
