import { LANE_WIDTH, nearestLaneCenter, TRACK_HALF_WIDTH } from '../track/track-constants';
import { Leg, Track } from '../track/track';
import { CAR_TUNING, QUARTER_TURN } from './car-tuning';

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
  /**
   * Centro del carril al que pertenece el coche. Normalmente es el carril en el que va, pero si
   * acelera contra la pared de un embudo sigue siendo el carril que se cierra: la pared lo empuja
   * y roza hasta que el jugador cambia al carril de al lado o suelta el acelerador.
   */
  readonly lane: number;
  readonly speed: number;
  /** Ángulo actual del morro respecto al tramo. */
  readonly yaw: number;
  /** Ángulo al que tiende el morro: 0, o ±90° al girar en un cruce. */
  readonly yawTarget: number;
  /** Lateral al que va un cambio de carril en curso (null = sin cambio, manda el imán). */
  readonly laneTarget: number | null;
  /** Velocidad lateral del cambio de carril (m/s): el muelle del cambio la necesita para rebotar. */
  readonly lateralVelocity: number;
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
    lane: 0,
    speed: 0,
    yaw: 0,
    yawTarget: 0,
    laneTarget: null,
    lateralVelocity: 0,
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

/** Desplazamiento lateral máximo antes de tocar el muro en ese punto (depende del ancho). */
const wallLimitAt = (track: Track, leg: number, distance: number) =>
  track.halfWidthAt(leg, distance) - CAR_TUNING.carHalfWidth;

/** Carril disponible (el coche cabe en él) más cercano a un desplazamiento lateral. */
const nearestOpenLane = (lateral: number, wallLimit: number) =>
  nearestLaneCenter(lateral, wallLimit);

/**
 * Swipe lateral:
 * - En el cruce (o hasta `junctionEarlyEntry` m antes), hacia la salida: gira 90°.
 * - En cualquier otro caso: cambia un carril a ese lado (como en Subway Surfers), partiendo del
 *   carril al que pertenece el coche. Si a ese lado no hay carril, va hacia el muro y se lleva
 *   un golpecito.
 * Con el coche ya girado o en mitad de un cambio de carril se ignora.
 */
function applySwipe(car: CarState, swipe: Swipe, leg: Leg, track: Track): CarState {
  if (car.yawTarget !== 0) return car;
  const side = directionOf(swipe);
  const junction = leg.junction;
  const inTurnZone = !!junction && car.distance > leg.length - CAR_TUNING.junctionEarlyEntry;
  if (inTurnZone && side === junction.direction) {
    return { ...car, yawTarget: side * QUARTER_TURN, laneTarget: null };
  }
  // Un swipe = un carril: mientras dura un cambio de carril se ignoran los demás swipes (salvo
  // en el rebote final, cuando el coche ya está prácticamente en su carril)
  if (
    car.laneTarget !== null &&
    Math.abs(car.laneTarget - car.lateral) > CAR_TUNING.laneChangeRetarget
  ) {
    return car;
  }
  const wallLimit = wallLimitAt(track, car.leg, car.distance);
  const target = car.lane + side * LANE_WIDTH;
  if (Math.abs(target) > wallLimit + 0.01) {
    // Hacia el muro: apunta más allá para que llegue con impulso y rebote
    return { ...car, laneTarget: side * (wallLimit + CAR_TUNING.carHalfWidth) };
  }
  return { ...car, laneTarget: target, lane: target };
}

/** Lo que sobresale el morro del coche hacia delante según su giro. */
const noseReach = (yaw: number) =>
  CAR_TUNING.carHalfLength * Math.abs(Math.cos(yaw)) +
  CAR_TUNING.carHalfWidth * Math.abs(Math.sin(yaw));

/** Paso al tramo siguiente al salir por el lado abierto del cruce (de lado `2 × H`). */
function exitJunction(
  car: CarState,
  lateral: number,
  f: number,
  d: 1 | -1,
  yaw: number,
  H: number,
) {
  const next = d * (H - f);
  return {
    leg: car.leg + 1,
    distance: d * lateral - H,
    lateral: next,
    lane: nearestOpenLane(next, H - CAR_TUNING.carHalfWidth),
    yaw: yaw - d * QUARTER_TURN,
    laneTarget: null,
    lateralVelocity: 0,
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
      lateralVelocity: 0,
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
  const H = junction?.halfWidth ?? TRACK_HALF_WIDTH;
  const wallLimit = H - CAR_TUNING.carHalfWidth;

  const d = junction?.direction ?? 1;
  const k = ease(Math.min(1, elapsed / CAR_TUNING.frontRecoveryTime));
  const yaw = rec.fromYaw + (d * QUARTER_TURN - rec.fromYaw) * k;
  const speed = CAR_TUNING.frontRecoverySpeed;
  let distance = car.distance + speed * Math.cos(yaw) * dt;
  let lateral = car.lateral + speed * Math.sin(yaw) * dt;
  // El morro no atraviesa el muro frontal ni el lado cerrado mientras gira
  distance = Math.min(distance, leg.length + 2 * H - noseReach(yaw) - 0.01);
  if (lateral * -d > wallLimit) lateral = -d * wallLimit;

  if (junction && distance > leg.length && lateral * d > H) {
    events.push('junction-exit', 'recovered');
    return {
      car: {
        ...car,
        ...exitJunction(car, lateral, distance - leg.length, d, yaw, H),
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
  for (const swipe of input.swipes) car = applySwipe(car, swipe, leg, track);

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
  const wallLimit = wallLimitAt(track, car.leg, distance);
  let lane = car.lane;

  // Cambio de carril en curso: muelle hacia el carril elegido. Llega rápido, se pasa un poco y
  // rebota hasta asentarse, como una pelota
  let laneTarget = car.laneTarget;
  let lateralVelocity = car.lateralVelocity;
  if (laneTarget !== null && facingForward) {
    const w = CAR_TUNING.laneChangeFrequency;
    const force =
      w * w * (laneTarget - lateral) - 2 * CAR_TUNING.laneChangeDamping * w * lateralVelocity;
    lateralVelocity += force * dt;
    lateral += lateralVelocity * dt;

    if (Math.abs(lateral) >= wallLimit) {
      // Golpecito contra el muro: pierde velocidad y rebota hacia el carril disponible
      const side = Math.sign(lateral);
      events.push('bump');
      speed *= CAR_TUNING.bumpKeep;
      lateral = side * (wallLimit - 0.001);
      lateralVelocity = -lateralVelocity * CAR_TUNING.bumpBounce;
      laneTarget = nearestOpenLane(lateral, wallLimit);
      lane = laneTarget;
    } else if (Math.abs(laneTarget - lateral) < 0.01 && Math.abs(lateralVelocity) < 0.05) {
      // Asentado: a partir de aquí manda el imán de carril
      lateral = laneTarget;
      laneTarget = null;
      lateralVelocity = 0;
    }
  } else if (laneTarget === null) {
    lateralVelocity = 0;
  }
  const next: CarState = { ...car, yaw, speed, accelerating, laneTarget, lateralVelocity, lane };

  // ----- Dentro del cruce cuadrado -----
  if (junction && distance > leg.length) {
    const f = distance - leg.length;
    const d = junction.direction;
    const H = junction.halfWidth;

    // Sale por el lado abierto: el momento del giro decide el carril del tramo siguiente
    if (lateral * d > H) {
      events.push('junction-exit');
      return {
        car: {
          ...next,
          ...NO_SCRAPE,
          ...exitJunction(car, lateral, f, d, yaw, H),
          yawTarget: car.yawTarget - d * QUARTER_TURN,
        },
        events,
      };
    }

    // Muro frontal (solo si avanza hacia él): pivota solo hacia la salida
    if (distance > car.distance && f + noseReach(yaw) >= 2 * H) {
      return startExitRecovery(
        { ...next, distance: leg.length + 2 * H - noseReach(yaw) - 0.01, lateral },
        events,
      );
    }
    if (lateral * -d >= wallLimit) lateral = -d * wallLimit;
    return { car: { ...next, ...NO_SCRAPE, distance, lateral }, events };
  }

  // ----- En un tramo -----
  if (facingForward && laneTarget === null) {
    // Acelerando contra la pared (embudo o curva) el coche sigue en su carril y la pared lo
    // empuja. Si no, pertenece al carril disponible más cercano y el imán lo centra en él
    const touching = Math.abs(lateral) >= wallLimit - 0.001;
    if (!(accelerating && touching)) {
      lane = nearestOpenLane(lateral, wallLimit);
      // Imán de carril: con el morro recto el coche tiende al centro de su carril
      const offset = lane - lateral;
      const pull = Math.max(
        -CAR_TUNING.lanePull,
        Math.min(CAR_TUNING.lanePull, offset * CAR_TUNING.laneSpring),
      );
      lateral += Math.abs(pull * dt) > Math.abs(offset) ? offset : pull * dt;
    }

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

  if (Math.abs(lateral) >= wallLimit) {
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
    lateral = side * wallLimit;

    // Roce: frena cada vez más mientras dure. En un tramo estrecho (embudo) la pared entra en
    // ángulo y roza más fuerte
    const narrowed = track.halfWidthAt(car.leg, distance) < TRACK_HALF_WIDTH - 0.01;
    const [start, max] = narrowed
      ? [CAR_TUNING.taperFrictionStart, CAR_TUNING.taperFrictionMax]
      : [CAR_TUNING.scrapeFrictionStart, CAR_TUNING.scrapeFrictionMax];
    const scrapeTime = car.scrapeTime + dt;
    const ramp = Math.min(1, scrapeTime / CAR_TUNING.scrapeRampTime);
    const friction = start + (max - start) * ramp;
    if (!junction) distance = Math.min(distance, leg.length);
    return {
      car: {
        ...next,
        distance,
        lateral,
        lane,
        speed: Math.max(0, speed - friction * dt),
        scrapeTime,
        scrapeSide: side,
      },
      events,
    };
  }

  // Sin cruce (último tramo) la pista termina
  if (!junction) distance = Math.min(distance, leg.length);
  return { car: { ...next, ...NO_SCRAPE, distance, lateral, lane }, events };
}
