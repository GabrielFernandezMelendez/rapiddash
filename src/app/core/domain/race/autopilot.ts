import { CarState, DriveInput, Swipe } from '../car/car';
import { Track } from '../track/track';

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
  return { throttle: true, swipes };
}
