import { CarState, DriveInput, Swipe } from '../car/car';
import { Track } from '../track/track';
import { tuning } from '../car/car-tuning';
import { createRace, stepRace } from './race';

/**
 * Piloto automático sencillo: gira en los cruces a unos 2,5 m y corrige el magnetismo antes del
 * muro. Demuestra en los tests que cada mapa se termina sin chocar y da el tiempo de referencia
 * de las medallas.
 */
export function autopilot(car: CarState, track: Track): DriveInput {
  const swipes: Swipe[] = [];
  const leg = track.legs[car.leg];
  const inJunction = !!leg.junction && car.distance > leg.length;
  if (car.mode === 'driving') {
    if (inJunction && car.yawTarget === 0 && car.distance > leg.length + 2.5) {
      swipes.push(leg.junction!.direction > 0 ? 'right' : 'left');
    } else if (
      !inJunction &&
      car.yawTarget === 0 &&
      car.laneTarget === null &&
      Math.abs(car.lateral) > 3.3 &&
      car.distance < leg.length - 3
    ) {
      swipes.push(car.lateral > 0 ? 'left' : 'right');
    }
  }
  // Con el modelo de agarre, suelta un momento si la curva pide más de lo que agarra (así no se
  // abre contra el muro): conduce como un buen piloto, que es lo que miden las medallas
  const sample = track.sampleAt(car.leg, car.distance);
  const t = tuning();
  const overGrip =
    t.curveModel === 'grip' &&
    sample.kind === 'arc' &&
    car.speed * car.speed * Math.abs(sample.curvature) > t.gripAccel * 0.97;
  return { throttle: !overGrip, swipes };
}

/** Tiempo que hace el piloto automático en esa pista (referencia de las medallas). */
export function autopilotTime(track: Track): number {
  let race = createRace(track);
  for (let i = 0; i < 60 * 180 && race.phase !== 'finished'; i++) {
    race = stepRace(race, autopilot(race.car, track), track, 1 / 60).race;
  }
  return race.raceTime;
}
