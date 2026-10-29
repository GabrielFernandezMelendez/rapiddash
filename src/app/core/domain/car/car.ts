import { Track } from '../track/track';
import { nearestLaneCenter } from '../track/track-constants';
import { TurnDirection } from '../track/track-segment';
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
 * - cornering: recorriendo (o a punto de recorrer) una curva de 90° ya tomada.
 * - crashed: parado contra un muro; necesita un swipe para salir.
 */
export type CarMode = 'driving' | 'cornering' | 'crashed';

export type CarEvent = 'crash' | 'corner-taken' | 'recovered';

export interface CarState {
  /** Distancia recorrida sobre el eje de la pista. */
  readonly distance: number;
  /** Desplazamiento lateral respecto al eje (positivo = derecha). */
  readonly lateral: number;
  readonly speed: number;
  /** Ángulo actual del morro respecto a la pista. */
  readonly yaw: number;
  /** Ángulo al que tiende el morro: 0 o ±90°. */
  readonly yawTarget: number;
  readonly mode: CarMode;
  readonly cornerIndex: number | null;
  /** Lado del muro contra el que chocó (1 derecha, -1 izquierda). En curvas: 0. */
  readonly wallSide: -1 | 0 | 1;
  readonly accelerating: boolean;
}

export function createCar(track: Track): CarState {
  return {
    distance: track.startDistance,
    lateral: 0,
    speed: 0,
    yaw: 0,
    yawTarget: 0,
    mode: 'driving',
    cornerIndex: null,
    wallSide: 0,
    accelerating: false,
  };
}

const directionOf = (swipe: 'left' | 'right'): TurnDirection => (swipe === 'right' ? 1 : -1);

/** Aplica un swipe al estado. Es la única forma de cambiar de dirección. */
function applySwipe(car: CarState, swipe: Swipe, track: Track, events: CarEvent[]): CarState {
  if (car.mode === 'crashed') {
    if (swipe === 'forward') return car;
    const dir = directionOf(swipe);
    // Choque en una curva no tomada: el swipe hacia el lado de la curva la toma
    if (car.cornerIndex !== null) {
      const corner = track.corners[car.cornerIndex];
      if (dir !== corner.direction) return car;
      events.push('recovered', 'corner-taken');
      return { ...car, mode: 'cornering', speed: CAR_TUNING.recoverySpeed, yawTarget: 0 };
    }
    // Choque contra un muro lateral: hay que girar hacia el lado contrario
    if (dir === car.wallSide) return car;
    events.push('recovered');
    return {
      ...car,
      mode: 'driving',
      wallSide: 0,
      speed: CAR_TUNING.recoverySpeed,
      // El coche pivota sobre el muro: parte de frente y gira hacia el centro
      yaw: 0,
      yawTarget: dir * QUARTER_TURN,
    };
  }

  if (car.mode === 'cornering') return car;

  if (swipe === 'forward') return { ...car, yawTarget: 0 };

  const dir = directionOf(swipe);
  const corner = track.cornerNear(car.distance, CAR_TUNING.cornerWindow);
  // Un swipe en el sentido de la curva la toma siempre, aunque el coche estuviera girado
  // corrigiendo el magnetismo: al tomarla se endereza
  if (corner && corner.direction === dir && car.distance < corner.start + CAR_TUNING.cornerGrace) {
    events.push('corner-taken');
    return { ...car, mode: 'cornering', cornerIndex: corner.index, yaw: 0, yawTarget: 0 };
  }
  // Cualquier otro swipe lateral gira el coche 90°
  return { ...car, yawTarget: dir * QUARTER_TURN };
}

function approach(value: number, target: number, maxDelta: number): number {
  if (Math.abs(target - value) <= maxDelta) return target;
  return value + Math.sign(target - value) * maxDelta;
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
  for (const swipe of input.swipes) car = applySwipe(car, swipe, track, events);

  if (car.mode === 'crashed') {
    return { car: { ...car, speed: 0, accelerating: false }, events };
  }

  const yaw = approach(car.yaw, car.yawTarget, CAR_TUNING.turnRate * dt);
  const facingForward = car.yawTarget === 0 && Math.abs(yaw) < 0.05;
  const accelerating = input.throttle && car.mode === 'driving' && facingForward;

  let speed = car.speed;
  if (accelerating) speed = Math.min(CAR_TUNING.maxSpeed, speed + CAR_TUNING.acceleration * dt);
  else {
    const drag = car.mode === 'cornering' ? CAR_TUNING.cornerDrag : CAR_TUNING.coastDrag;
    speed = Math.max(0, speed - drag * dt);
  }
  // Girado o dentro de una curva el coche nunca se detiene del todo
  if (car.yawTarget !== 0 || car.mode === 'cornering')
    speed = Math.max(speed, CAR_TUNING.crawlSpeed);

  let distance = car.distance + speed * Math.cos(yaw) * dt;
  let lateral = car.lateral + speed * Math.sin(yaw) * dt;

  // Imán de carril: con el morro recto el coche tiende al centro del carril más cercano
  if (car.yawTarget === 0 && Math.abs(yaw) < 0.05) {
    const offset = nearestLaneCenter(lateral) - lateral;
    const pull = Math.max(
      -CAR_TUNING.lanePull,
      Math.min(CAR_TUNING.lanePull, offset * CAR_TUNING.laneSpring),
    );
    lateral += Math.abs(pull * dt) > Math.abs(offset) ? offset : pull * dt;
  }

  // Magnetismo: en tramos curvos el coche se desvía hacia el muro exterior.
  // Si empuja más que el imán de carril, el coche va saltando de carril hacia el muro
  const sample = track.sampleAt(car.distance);
  if (car.mode === 'driving' && sample.kind === 'arc') {
    const excess = Math.abs(sample.curvature) - CAR_TUNING.magnetThreshold;
    if (excess > 0)
      lateral -= Math.sign(sample.curvature) * excess * speed * CAR_TUNING.magnetGain * dt;
  }

  let mode: CarMode = car.mode;
  let cornerIndex = car.cornerIndex;

  if (mode === 'cornering' && cornerIndex !== null && distance >= track.corners[cornerIndex].end) {
    mode = 'driving';
    cornerIndex = null;
  }

  // Llegar a una curva de 90° sin haberla tomado: choque frontal
  if (mode === 'driving') {
    const grace = CAR_TUNING.cornerGrace;
    const missed = track.corners.find(
      (c) => car.distance < c.start + grace && distance >= c.start + grace,
    );
    if (missed) {
      events.push('crash');
      return {
        car: {
          ...car,
          distance: missed.start + grace,
          lateral: Math.max(-WALL_LIMIT, Math.min(WALL_LIMIT, lateral)),
          speed: 0,
          yaw: 0,
          yawTarget: 0,
          mode: 'crashed',
          cornerIndex: missed.index,
          wallSide: 0,
          accelerating: false,
        },
        events,
      };
    }
  }

  // Contacto con un muro lateral
  if (Math.abs(lateral) >= WALL_LIMIT) {
    const side = lateral > 0 ? 1 : -1;
    const movingIntoWall = (lateral - car.lateral) * side > 0;
    lateral = side * WALL_LIMIT;
    if (mode === 'driving' && movingIntoWall) {
      events.push('crash');
      return {
        car: {
          ...car,
          distance,
          lateral,
          speed: 0,
          yaw,
          mode: 'crashed',
          cornerIndex: null,
          wallSide: side,
          accelerating: false,
        },
        events,
      };
    }
  }

  distance = Math.min(distance, track.length);
  return {
    car: { ...car, distance, lateral, speed, yaw, mode, cornerIndex, accelerating },
    events,
  };
}
