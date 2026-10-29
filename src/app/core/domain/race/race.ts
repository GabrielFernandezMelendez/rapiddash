import { CarEvent, CarState, createCar, DriveInput, stepCar } from '../car/car';
import { Track } from '../track/track';

export type RacePhase = 'countdown' | 'racing' | 'finished';
export type CountdownLight = 'red' | 'yellow' | 'green';

/** Segundos que dura cada luz del semáforo antes de la verde. */
export const LIGHT_DURATION = 1;
/** Segundos que se muestra el "GO" tras la luz verde. */
export const GO_DURATION = 0.9;

export type RaceEvent = CarEvent | 'light' | 'go' | 'finish';

export interface RaceState {
  readonly phase: RacePhase;
  /** Segundos desde que se encendió el semáforo. */
  readonly countdownTime: number;
  /** Tiempo de carrera (empieza en la luz verde). */
  readonly raceTime: number;
  readonly car: CarState;
}

export function createRace(track: Track): RaceState {
  return { phase: 'countdown', countdownTime: 0, raceTime: 0, car: createCar(track) };
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
  if (car.distance >= track.finishDistance) {
    // Interpolamos el instante exacto de cruce para que el tiempo no dependa de los fps
    const covered = car.distance - race.car.distance;
    const fraction = covered > 0 ? (track.finishDistance - race.car.distance) / covered : 1;
    return {
      race: { ...race, phase: 'finished', car, raceTime: race.raceTime + dt * fraction },
      events: [...events, 'finish'],
    };
  }
  return { race: { ...race, car, raceTime }, events };
}
