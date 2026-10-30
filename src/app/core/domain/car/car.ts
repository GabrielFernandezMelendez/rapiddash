import {
  JUNCTION_SIZE,
  LANE_WIDTH,
  nearestLaneCenter,
  TRACK_HALF_WIDTH,
} from '../track/track-constants';
import { Leg, Track } from '../track/track';
import { CAR_TUNING, QUARTER_TURN, WALL_LIMIT } from './car-tuning';

export type Swipe = 'left' | 'right';

export interface DriveInput {
  /** Dedo pulsado o espacio mantenido. */
  readonly throttle: boolean;
  /** Swipes ocurridos desde el último tick, en orden. */
  readonly swipes: readonly Swipe[];
}

/**
 * - driving: conducción normal; el morro mira al frente o está girado 90° dentro de un cruce.
 * - recovering: pivote automático hacia la salida tras chocar en un cruce. Se ignoran los swipes.
 */
export type CarMode = 'driving' | 'recovering';

/** bump: golpecito al cambiar de carril contra el muro (no es un choque). */
export type CarEvent = 'crash' | 'recovered' | 'junction-exit' | 'bump';

/** Choque en un cruce: el coche pivota hacia la salida y entra en la carretera nueva. */
export interface Recovery {
  readonly elapsed: number;
  readonly fromYaw: number;
}

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
  /** Ángulo al que tiende el morro: 0, o ±90° al girar en un cruce. */
  readonly yawTarget: number;
  /** Lateral al que va un cambio de carril en curso (null = sin cambio, manda el imán). */
  readonly laneTarget: number | null;
  readonly mode: CarMode;
  readonly recovery: Recovery | null;
  /** Segundos seguidos rozando el muro (0 = sin roce). */
  readonly scrapeTime: number;
  /** Lado del muro que roza: 1 derecha, -1 izquierda, 0 ninguno. */
  readonly scrapeSide: -1 | 0 | 1;
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
    laneTarget: null,
    mode: 'driving',
    recovery: null,
    scrapeTime: 0,
    scrapeSide: 0,
    accelerating: false,
  };
}

const directionOf = (swipe: Swipe): 1 | -1 => (swipe === 'right' ? 1 : -1);

/** Curva de animación suave: arranca y termina despacio. */
const ease = (t: number) => t * t * (3 - 2 * t);

function approach(value: number, target: number, maxDelta: number): number {
  if (Math.abs(target - value) <= maxDelta) return target;
  return value + Math.sign(target - value) * maxDelta;
}

/**
 * Swipe lateral:
 * - En el cruce (o hasta `junctionEarlyEntry` m antes), hacia la salida: gira 90°.
 * - En cualquier otro caso: cambia un carril a ese lado (como en Subway Surfers). Si ya está en
 *   el carril pegado al muro, va hacia el muro y se lleva un golpecito.
 * Con el coche ya girado o en mitad de un cambio de carril se ignora.
 */
function applySwipe(car: CarState, swipe: Swipe, leg: Leg): CarState {
  if (car.yawTarget !== 0) return car;
  const side = directionOf(swipe);
  const junction = leg.junction;
  const inTurnZone = !!junction && car.distance > leg.length - CAR_TUNING.junctionEarlyEntry;
  if (inTurnZone && side === junction.direction) {
    return { ...car, yawTarget: side * QUARTER_TURN, laneTarget: null };
  }
  // Un swipe = un carril: mientras dura un cambio de carril se ignoran los demás swipes
  if (car.laneTarget !== null) return car;
  const target = nearestLaneCenter(car.lateral) + side * LANE_WIDTH;
  return { ...car, laneTarget: Math.abs(target) > WALL_LIMIT ? side * WALL_LIMIT : target };
}

/** Lo que sobresale el morro del coche hacia delante según su giro. */
const noseReach = (yaw: number) =>
  CAR_TUNING.carHalfLength * Math.abs(Math.cos(yaw)) +
  CAR_TUNING.carHalfWidth * Math.abs(Math.sin(yaw));

/** Paso al tramo siguiente al salir por el lado abierto del cruce. */
function exitJunction(car: CarState, lateral: number, f: number, d: 1 | -1, yaw: number) {
  return {
    leg: car.leg + 1,
    distance: d * lateral - TRACK_HALF_WIDTH,
    lateral: d * (TRACK_HALF_WIDTH - f),
    yaw: yaw - d * QUARTER_TURN,
    laneTarget: null,
  };
}

const NO_SCRAPE = { scrapeTime: 0, scrapeSide: 0 as const };

function startExitRecovery(car: CarState, events: CarEvent[]) {
  events.push('crash');
  return {
    car: {
      ...car,
      ...NO_SCRAPE,
      mode: 'recovering' as const,
      speed: CAR_TUNING.frontRecoverySpeed,
      laneTarget: null,
      accelerating: false,
      recovery: { elapsed: 0, fromYaw: car.yaw },
    },
    events,
  };
}

/** Pivote automático hacia la salida del cruce tras un choque. Los swipes se ignoran. */
function stepRecovery(car: CarState, track: Track, dt: number) {
  const events: CarEvent[] = [];
  const rec = car.recovery!;
  const leg = track.legs[car.leg];
  const junction = leg.junction;
  const elapsed = rec.elapsed + dt;

  const d = junction?.direction ?? 1;
  const k = ease(Math.min(1, elapsed / CAR_TUNING.frontRecoveryTime));
  const yaw = rec.fromYaw + (d * QUARTER_TURN - rec.fromYaw) * k;
  const speed = CAR_TUNING.frontRecoverySpeed;
  let distance = car.distance + speed * Math.cos(yaw) * dt;
  let lateral = car.lateral + speed * Math.sin(yaw) * dt;
  // El morro no atraviesa el muro frontal ni el lado cerrado mientras gira
  distance = Math.min(distance, leg.length + JUNCTION_SIZE - noseReach(yaw) - 0.01);
  if (lateral * -d > WALL_LIMIT) lateral = -d * WALL_LIMIT;

  if (junction && distance > leg.length && lateral * d > TRACK_HALF_WIDTH) {
    events.push('junction-exit', 'recovered');
    return {
      car: {
        ...car,
        ...exitJunction(car, lateral, distance - leg.length, d, yaw),
        speed,
        yawTarget: 0,
        mode: 'driving' as const,
        recovery: null,
      },
      events,
    };
  }
  return {
    car: {
      ...car,
      distance,
      lateral,
      yaw,
      speed,
      yawTarget: d * QUARTER_TURN,
      recovery: { ...rec, elapsed },
    },
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
  if (state.mode === 'recovering') return stepRecovery(state, track, dt);

  const events: CarEvent[] = [];
  const leg = track.legs[state.leg];
  const junction = leg.junction;
  let car = state;
  for (const swipe of input.swipes) car = applySwipe(car, swipe, leg);

  const yaw = approach(car.yaw, car.yawTarget, CAR_TUNING.turnRate * dt);
  const facingForward = car.yawTarget === 0 && Math.abs(yaw) < 0.05;
  const accelerating = input.throttle && facingForward;

  let speed = car.speed;
  if (accelerating) speed = Math.min(CAR_TUNING.maxSpeed, speed + CAR_TUNING.acceleration * dt);
  else speed = Math.max(0, speed - CAR_TUNING.coastDrag * dt);
  // Girado el coche nunca se detiene del todo
  if (car.yawTarget !== 0) speed = Math.max(speed, CAR_TUNING.crawlSpeed);

  let distance = car.distance + speed * Math.cos(yaw) * dt;
  let lateral = car.lateral + speed * Math.sin(yaw) * dt;

  // Cambio de carril en curso: desplazamiento lateral rápido hasta el carril elegido
  let laneTarget = car.laneTarget;
  if (laneTarget !== null && facingForward) {
    lateral = approach(lateral, laneTarget, CAR_TUNING.laneChangeSpeed * dt);
    if (lateral === laneTarget) {
      if (Math.abs(laneTarget) >= WALL_LIMIT) {
        // Golpecito contra el muro: pierde algo de velocidad y vuelve a su carril
        events.push('bump');
        speed *= CAR_TUNING.bumpKeep;
        lateral = Math.sign(laneTarget) * (WALL_LIMIT - 0.001);
        laneTarget = nearestLaneCenter(laneTarget);
      } else {
        laneTarget = null;
      }
    }
  }
  const next: CarState = { ...car, yaw, speed, accelerating, laneTarget };

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
          ...NO_SCRAPE,
          ...exitJunction(car, lateral, f, d, yaw),
          yawTarget: car.yawTarget - d * QUARTER_TURN,
        },
        events,
      };
    }

    // Muro frontal (solo si avanza hacia él) o lado cerrado: pivota solo hacia la salida
    if (distance > car.distance && f + noseReach(yaw) >= JUNCTION_SIZE) {
      return startExitRecovery(
        { ...next, distance: leg.length + JUNCTION_SIZE - noseReach(yaw) - 0.01, lateral },
        events,
      );
    }
    if (lateral * -d >= WALL_LIMIT) lateral = -d * WALL_LIMIT;
    return { car: { ...next, ...NO_SCRAPE, distance, lateral }, events };
  }

  // ----- En un tramo -----
  if (facingForward && laneTarget === null) {
    // Imán de carril: con el morro recto el coche tiende al centro del carril más cercano
    const offset = nearestLaneCenter(lateral) - lateral;
    const pull = Math.max(
      -CAR_TUNING.lanePull,
      Math.min(CAR_TUNING.lanePull, offset * CAR_TUNING.laneSpring),
    );
    lateral += Math.abs(pull * dt) > Math.abs(offset) ? offset : pull * dt;

    // Magnetismo de las curvas: empuja hacia el muro exterior. Acelerando supera al imán de
    // carril y el coche salta de carril; sin acelerar el coche se queda pegado (y se despega
    // del muro si estaba rozando)
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
      car.yawTarget !== 0 &&
      side === junction.direction &&
      movingIntoWall &&
      distance > leg.length - CAR_TUNING.junctionEarlyEntry
    ) {
      return { car: { ...next, ...NO_SCRAPE, distance: leg.length + 0.01, lateral }, events };
    }
    lateral = side * WALL_LIMIT;

    // Roce: el magnetismo de la curva lo pega al muro. Frena cada vez más mientras dure
    const scrapeTime = car.scrapeTime + dt;
    const ramp = Math.min(1, scrapeTime / CAR_TUNING.scrapeRampTime);
    const friction =
      CAR_TUNING.scrapeFrictionStart +
      (CAR_TUNING.scrapeFrictionMax - CAR_TUNING.scrapeFrictionStart) * ramp;
    if (!junction) distance = Math.min(distance, leg.length);
    return {
      car: {
        ...next,
        distance,
        lateral,
        speed: Math.max(0, speed - friction * dt),
        scrapeTime,
        scrapeSide: side,
      },
      events,
    };
  }

  // Sin cruce (último tramo) la pista termina
  if (!junction) distance = Math.min(distance, leg.length);
  return { car: { ...next, ...NO_SCRAPE, distance, lateral }, events };
}
