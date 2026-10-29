import { JUNCTION_SIZE, nearestLaneCenter, TRACK_HALF_WIDTH } from '../track/track-constants';
import { Track } from '../track/track';
import { CAR_TUNING, QUARTER_TURN, WALL_LIMIT } from './car-tuning';

export type Swipe = 'left' | 'right' | 'forward';

export interface DriveInput {
  /** Dedo pulsado o espacio mantenido. */
  readonly throttle: boolean;
  /** Swipes ocurridos desde el último tick, en orden. */
  readonly swipes: readonly Swipe[];
}

/**
 * - driving: conducción normal; el morro mira al frente o está girado 90°.
 * - crashed: parado contra un muro; necesita un swipe lateral para salir.
 */
export type CarMode = 'driving' | 'crashed';

export type CarEvent = 'crash' | 'recovered' | 'junction-exit';

export interface CarState {
  /** Tramo de la pista en el que está el coche. */
  readonly leg: number;
  /** Distancia dentro del tramo. Si supera su longitud, el coche está en el cruce. */
  readonly distance: number;
  /** Desplazamiento lateral respecto al eje del tramo (positivo = derecha). */
  readonly lateral: number;
  readonly speed: number;
  /** Ángulo actual del morro respecto al tramo. */
  readonly yaw: number;
  /** Ángulo al que tiende el morro: 0 o ±90°. */
  readonly yawTarget: number;
  readonly mode: CarMode;
  /** Lado del muro contra el que chocó (1 derecha, -1 izquierda). 0 = muro frontal del cruce. */
  readonly wallSide: -1 | 0 | 1;
  readonly accelerating: boolean;
}

export function createCar(track: Track): CarState {
  return {
    leg: 0,
    distance: track.startDistance,
    lateral: 0,
    speed: 0,
    yaw: 0,
    yawTarget: 0,
    mode: 'driving',
    wallSide: 0,
    accelerating: false,
  };
}

const directionOf = (swipe: 'left' | 'right'): 1 | -1 => (swipe === 'right' ? 1 : -1);

/** Aplica un swipe al estado. Es la única forma de cambiar de dirección. */
function applySwipe(
  car: CarState,
  swipe: Swipe,
  inJunction: boolean,
  events: CarEvent[],
): CarState {
  if (car.mode === 'crashed') {
    if (swipe === 'forward') return car;
    const dir = directionOf(swipe);
    // Contra un muro lateral solo se sale girando hacia el lado contrario
    if (car.wallSide !== 0 && dir === car.wallSide) return car;
    events.push('recovered');
    return {
      ...car,
      mode: 'driving',
      speed: CAR_TUNING.recoverySpeed,
      // En el cruce el coche pivota en el sitio y sale de lado: hacia la salida continúa la
      // carrera. En un tramo parte de frente y gira hacia el centro.
      yaw: inJunction ? dir * QUARTER_TURN : 0,
      yawTarget: dir * QUARTER_TURN,
      wallSide: 0,
    };
  }

  if (swipe === 'forward') return { ...car, yawTarget: 0 };
  // Cualquier swipe lateral gira el coche 90°: en recta cambia de carril, en el cruce sale por él
  return { ...car, yawTarget: directionOf(swipe) * QUARTER_TURN };
}

function approach(value: number, target: number, maxDelta: number): number {
  if (Math.abs(target - value) <= maxDelta) return target;
  return value + Math.sign(target - value) * maxDelta;
}

function crash(car: CarState, patch: Partial<CarState>, events: CarEvent[]) {
  events.push('crash');
  return {
    car: { ...car, ...patch, speed: 0, mode: 'crashed' as const, accelerating: false },
    events,
  };
}

/** Avanza la simulación del coche `dt` segundos. Función pura. */
export function stepCar(
  state: CarState,
  input: DriveInput,
  track: Track,
  dt: number,
): { car: CarState; events: CarEvent[] } {
  const events: CarEvent[] = [];
  let car = state;
  const inJunction = !!track.legs[car.leg].junction && car.distance > track.legs[car.leg].length;
  for (const swipe of input.swipes) car = applySwipe(car, swipe, inJunction, events);

  if (car.mode === 'crashed') {
    return { car: { ...car, speed: 0, accelerating: false }, events };
  }

  const yaw = approach(car.yaw, car.yawTarget, CAR_TUNING.turnRate * dt);
  const facingForward = car.yawTarget === 0 && Math.abs(yaw) < 0.05;
  const accelerating = input.throttle && facingForward;

  let speed = car.speed;
  if (accelerating) speed = Math.min(CAR_TUNING.maxSpeed, speed + CAR_TUNING.acceleration * dt);
  else speed = Math.max(0, speed - CAR_TUNING.coastDrag * dt);
  // Girado el coche nunca se detiene del todo
  if (car.yawTarget !== 0) speed = Math.max(speed, CAR_TUNING.crawlSpeed);

  const leg = track.legs[car.leg];
  const junction = leg.junction;
  let distance = car.distance + speed * Math.cos(yaw) * dt;
  let lateral = car.lateral + speed * Math.sin(yaw) * dt;
  const next: CarState = { ...car, yaw, speed, accelerating };

  // ----- Dentro del cruce cuadrado -----
  if (junction && distance > leg.length) {
    const f = distance - leg.length;
    const d = junction.direction;

    // Sale por el lado abierto: el momento del giro decide el carril del tramo siguiente
    if (lateral * d > TRACK_HALF_WIDTH) {
      events.push('junction-exit');
      return {
        car: {
          ...next,
          leg: car.leg + 1,
          distance: d * lateral - TRACK_HALF_WIDTH,
          lateral: d * (TRACK_HALF_WIDTH - f),
          yaw: yaw - d * QUARTER_TURN,
          yawTarget: car.yawTarget - d * QUARTER_TURN,
        },
        events,
      };
    }

    // Muro frontal: solo cuenta si el coche avanza hacia él
    const nose =
      f +
      CAR_TUNING.carHalfLength * Math.abs(Math.cos(yaw)) +
      CAR_TUNING.carHalfWidth * Math.abs(Math.sin(yaw));
    if (distance > car.distance && nose >= JUNCTION_SIZE) {
      return crash(
        next,
        { distance: distance - (nose - JUNCTION_SIZE) - 0.01, lateral, wallSide: 0 },
        events,
      );
    }

    // Muro del lado cerrado
    if (lateral * -d >= WALL_LIMIT) {
      lateral = -d * WALL_LIMIT;
      if ((lateral - car.lateral) * -d >= 0 && car.yawTarget !== 0) {
        return crash(next, { distance, lateral, wallSide: -d as 1 | -1 }, events);
      }
    }
    return { car: { ...next, distance, lateral }, events };
  }

  // ----- En un tramo -----
  if (facingForward) {
    // Imán de carril: con el morro recto el coche tiende al centro del carril más cercano
    const offset = nearestLaneCenter(lateral) - lateral;
    const pull = Math.max(
      -CAR_TUNING.lanePull,
      Math.min(CAR_TUNING.lanePull, offset * CAR_TUNING.laneSpring),
    );
    lateral += Math.abs(pull * dt) > Math.abs(offset) ? offset : pull * dt;

    // Magnetismo de las curvas: empuja hacia el muro exterior. Acelerando supera al imán de
    // carril y el coche salta de carril; sin acelerar el coche se queda pegado
    const sample = track.sampleAt(car.leg, car.distance);
    const excess = Math.abs(sample.curvature) - CAR_TUNING.magnetThreshold;
    if (sample.kind === 'arc' && excess > 0) {
      const grip = accelerating ? 1 : CAR_TUNING.coastMagnetFactor;
      lateral -= Math.sign(sample.curvature) * excess * speed * CAR_TUNING.magnetGain * grip * dt;
    }
  }

  if (Math.abs(lateral) >= WALL_LIMIT) {
    const side = lateral > 0 ? 1 : -1;
    const movingIntoWall = (lateral - car.lateral) * side > 0;
    // Girar hacia la salida justo antes del cruce cuenta como entrar en él
    if (
      junction &&
      side === junction.direction &&
      movingIntoWall &&
      distance > leg.length - CAR_TUNING.junctionEarlyEntry
    ) {
      return { car: { ...next, distance: leg.length + 0.01, lateral }, events };
    }
    lateral = side * WALL_LIMIT;
    if (movingIntoWall) return crash(next, { distance, lateral, wallSide: side }, events);
  }

  // Sin cruce (último tramo) la pista termina
  if (!junction) distance = Math.min(distance, leg.length);
  return { car: { ...next, distance, lateral }, events };
}
