import { arc, narrow, right, straight } from '../track/track-segment';
import { Track } from '../track/track';
import { CarEvent, CarState, createCar, DriveInput, Swipe, stepCar } from './car';
import { LANE_COUNT, laneCenter } from '../track/track-constants';
import { CAR_TUNING, QUARTER_TURN, WALL_LIMIT } from './car-tuning';

const DT = 1 / 60;
const hold: DriveInput = { throttle: true, swipes: [] };
const idle: DriveInput = { throttle: false, swipes: [] };
const swipe = (...swipes: Swipe[]): DriveInput => ({ throttle: true, swipes });
const LANES = Array.from({ length: LANE_COUNT }, (_, i) => laneCenter(i));
const inALane = (car: CarState) => LANES.some((c) => Math.abs(c - car.lateral) < 0.01);
const MIDDLE = Math.floor(LANE_COUNT / 2);

function run(car: CarState, track: Track, seconds: number, input: DriveInput = hold): CarState {
  let state = car;
  for (let t = 0; t < seconds; t += DT) state = stepCar(state, input, track, DT).car;
  return state;
}

/** Como `run`, pero acumula los eventos y para en cuanto se cumple `until`. */
function runUntil(
  car: CarState,
  track: Track,
  until: (c: CarState) => boolean,
  input: DriveInput = hold,
  maxSeconds = 10,
): { car: CarState; events: CarEvent[]; seconds: number } {
  let state = car;
  const events: CarEvent[] = [];
  let t = 0;
  for (; t < maxSeconds && !until(state); t += DT) {
    const r = stepCar(state, input, track, DT);
    state = r.car;
    events.push(...r.events);
  }
  return { car: state, events, seconds: t };
}

describe('Car', () => {
  const longStraight = Track.fromSegments([straight(500)]);

  it('acelera al mantener pulsado y respeta la velocidad máxima', () => {
    const car = run(createCar(longStraight), longStraight, 10);
    expect(car.speed).toBeCloseTo(CAR_TUNING.maxSpeed);
    expect(car.accelerating).toBe(true);
  });

  it('pierde velocidad al soltar, sin freno', () => {
    const fast = run(createCar(longStraight), longStraight, 2);
    const coasting = run(fast, longStraight, 1, idle);
    expect(coasting.speed).toBeLessThan(fast.speed);
    expect(coasting.speed).toBeGreaterThan(0);
  });

  describe('cambio de carril (swipe fuera del cruce)', () => {
    const cruising = () => run(createCar(longStraight), longStraight, 1);

    it('un swipe cambia exactamente un carril en unos 0,2 s sin girar el coche', () => {
      const car = stepCar(cruising(), swipe('right'), longStraight, DT).car;
      expect(car.yawTarget).toBe(0);
      const target = laneCenter(MIDDLE + 1);
      const reach = runUntil(car, longStraight, (c) => c.lateral >= target);
      expect(reach.seconds).toBeLessThan(0.25);
      const settled = runUntil(reach.car, longStraight, (c) => c.laneTarget === null);
      expect(reach.seconds + settled.seconds).toBeLessThan(0.8);
      expect(settled.car.lateral).toBeCloseTo(target);
      expect(settled.car.yaw).toBe(0);
    });

    it('es elástico: se pasa un poco del carril y rebota hasta asentarse', () => {
      let car = stepCar(cruising(), swipe('right'), longStraight, DT).car;
      const target = laneCenter(MIDDLE + 1);
      let max = car.lateral;
      let backAfterMax = false;
      for (let t = 0; t < 0.8; t += DT) {
        car = stepCar(car, hold, longStraight, DT).car;
        if (car.lateral > max) max = car.lateral;
        else if (max > target && car.lateral < target) backAfterMax = true;
      }
      expect(max - target).toBeGreaterThan(0.1);
      expect(max - target).toBeLessThan(0.5);
      expect(backAfterMax).toBe(true);
      expect(car.lateral).toBeCloseTo(target);
    });

    it('sigue acelerando mientras cambia de carril', () => {
      const start = cruising();
      const car = run(stepCar(start, swipe('left'), longStraight, DT).car, longStraight, 0.1);
      expect(car.accelerating).toBe(true);
      expect(car.speed).toBeGreaterThan(start.speed);
    });

    /** Cambia un carril y espera a que se asiente. */
    const changeLane = (car: CarState, side: Swipe) =>
      runUntil(stepCar(car, swipe(side), longStraight, DT).car, longStraight, (c) => !c.laneTarget);

    it('un swipe = un carril: durante el cambio se ignoran los demás swipes', () => {
      const car = stepCar(cruising(), swipe('left', 'left'), longStraight, DT).car;
      const r = runUntil(car, longStraight, (c) => c.laneTarget === null);
      expect(r.car.lateral).toBeCloseTo(laneCenter(MIDDLE - 1));
    });

    it('cerca del carril destino ya acepta otro swipe, aunque siga rebotando', () => {
      let car = stepCar(cruising(), swipe('left'), longStraight, DT).car;
      car = runUntil(car, longStraight, (c) => c.lateral <= laneCenter(MIDDLE - 1)).car;
      car = changeLane(car, 'left').car;
      expect(car.lateral).toBeCloseTo(laneCenter(MIDDLE - 2));
    });

    it('al terminar, el imán lo mantiene centrado en el carril', () => {
      const car = run(stepCar(cruising(), swipe('right'), longStraight, DT).car, longStraight, 1);
      expect(inALane(car)).toBe(true);
      expect(car.laneTarget).toBeNull();
    });

    it('contra el muro: golpecito, pierde algo de velocidad y rebota a su carril', () => {
      let car = changeLane(changeLane(cruising(), 'left').car, 'left').car;
      car = stepCar(car, swipe('left'), longStraight, DT).car;
      const events: CarEvent[] = [];
      let drop = 0;
      while (!events.includes('bump')) {
        const r = stepCar(car, hold, longStraight, DT);
        if (r.events.includes('bump')) drop = r.car.speed / car.speed;
        events.push(...r.events);
        car = r.car;
      }
      expect(drop).toBeCloseTo(CAR_TUNING.bumpKeep, 1);
      expect(car.lateralVelocity).toBeGreaterThan(0); // rebota hacia dentro
      const r = runUntil(car, longStraight, (c) => c.laneTarget === null, hold, 1);
      expect([...events, ...r.events]).not.toContain('crash');
      expect(r.car.mode).toBe('driving');
      expect(r.car.lateral).toBeCloseTo(laneCenter(0));
    });
  });

  describe('roce contra el muro', () => {
    // Arco cerrado a la derecha: acelerando, el magnetismo lleva al muro izquierdo
    const tight = Track.fromSegments([straight(10), arc(170, 40), straight(20)]);

    function scrapeTrack() {
      return runUntil({ ...createCar(tight), speed: 24 }, tight, (c) => c.scrapeSide !== 0);
    }

    it('rozar no es un choque: frena y sigue', () => {
      const { car, events } = scrapeTrack();
      expect(events).not.toContain('crash');
      expect(car.scrapeSide).toBe(-1);
      expect(car.mode).toBe('driving');
      expect(car.lateral).toBeCloseTo(-WALL_LIMIT);
    });

    it('el rozamiento frena cada vez más aunque se acelere', () => {
      const { car } = scrapeTrack();
      const a = run(car, tight, 0.25);
      const b = run(a, tight, 0.25);
      const firstDrop = car.speed - a.speed;
      const secondDrop = a.speed - b.speed;
      expect(b.scrapeSide).toBe(-1);
      expect(firstDrop).toBeGreaterThan(0);
      expect(secondDrop).toBeGreaterThan(firstDrop);
    });

    it('soltar el acelerador despega el coche del muro hacia el carril más cercano', () => {
      const { car } = scrapeTrack();
      const released = run(car, tight, 0.5, idle);
      expect(released.scrapeSide).toBe(0);
      expect(released.lateral).toBeGreaterThan(-WALL_LIMIT + 0.1);
    });

    it('un swipe hacia el centro también lo despega', () => {
      const { car } = scrapeTrack();
      const moved = run(stepCar(car, swipe('right'), tight, DT).car, tight, 0.15);
      expect(moved.scrapeSide).toBe(0);
    });
  });

  describe('cruces cuadrados (curvas de 90°)', () => {
    const track = Track.fromSegments([straight(40), right(), straight(120)]);
    const entry = track.legs[0].length;

    /** Acelera hasta llegar a `distance` del primer tramo (o del cruce, si supera su longitud). */
    function driveTo(distance: number): CarState {
      let car = createCar(track);
      while (car.leg === 0 && car.distance < distance && car.mode === 'driving')
        car = stepCar(car, hold, track, DT).car;
      return car;
    }

    it('deslizar al entrar en el cruce gira 90° y sale por el carril interior', () => {
      let car = stepCar(driveTo(entry + 0.5), swipe('right'), track, DT).car;
      expect(car.yawTarget).toBeCloseTo(QUARTER_TURN);
      car = run(car, track, 2);
      expect(car.leg).toBe(1);
      expect(car.mode).toBe('driving');
      // Giro a la derecha: el interior es la derecha del tramo nuevo
      expect(car.lateral).toBeCloseTo(laneCenter(LANE_COUNT - 1));
    });

    it('deslizar tarde sale por un carril más exterior', () => {
      let car = stepCar(driveTo(entry + 6), swipe('right'), track, DT).car;
      car = run(car, track, 2);
      expect(car.leg).toBe(1);
      expect(car.lateral).toBeLessThan(0);
    });

    it('girar hacia la salida justo antes del cruce cuenta como entrar', () => {
      let car = stepCar(driveTo(entry - 1), swipe('right'), track, DT).car;
      expect(car.yawTarget).toBeCloseTo(QUARTER_TURN);
      car = run(car, track, 2);
      expect(car.leg).toBe(1);
      expect(car.mode).toBe('driving');
    });

    it('antes de esa zona, el swipe hacia la salida solo cambia de carril', () => {
      const car = stepCar(driveTo(entry - 10), swipe('right'), track, DT).car;
      expect(car.yawTarget).toBe(0);
      expect(car.laneTarget).toBeCloseTo(laneCenter(MIDDLE + 1));
    });

    it('en el cruce, el swipe hacia el lado cerrado cambia de carril', () => {
      const car = stepCar(driveTo(entry + 0.5), swipe('left'), track, DT).car;
      expect(car.yawTarget).toBe(0);
      expect(car.laneTarget).toBeCloseTo(laneCenter(MIDDLE - 1));
    });

    it('ya girado, los swipes se ignoran', () => {
      const turned = stepCar(driveTo(entry + 0.5), swipe('right'), track, DT).car;
      const after = stepCar(turned, swipe('left'), track, DT).car;
      expect(after.yawTarget).toBeCloseTo(QUARTER_TURN);
    });

    it('sin swipe, choca de frente y en menos de un segundo sale sola por la carretera nueva', () => {
      const crash = runUntil(createCar(track), track, (c) => c.mode === 'recovering');
      expect(crash.events).toContain('crash');
      expect(crash.car.leg).toBe(0);
      const out = runUntil(crash.car, track, (c) => c.mode === 'driving');
      expect(out.seconds).toBeLessThan(1);
      expect(out.events).toContain('junction-exit');
      expect(out.car.leg).toBe(1);
      // Sale por el exterior del giro (la izquierda en un giro a la derecha)
      expect(out.car.lateral).toBeLessThan(0);
      expect(run(out.car, track, 1).mode).toBe('driving');
    });

    it('durante la salida automática se ignoran los swipes', () => {
      const crash = runUntil(createCar(track), track, (c) => c.mode === 'recovering');
      const after = stepCar(crash.car, swipe('left'), track, DT).car;
      expect(after.mode).toBe('recovering');
      expect(after.yawTarget).toBeCloseTo(QUARTER_TURN);
    });
  });

  describe('magnetismo', () => {
    it('en un arco suave no desvía el coche', () => {
      const gentle = Track.fromSegments([straight(10), arc(20, 200), straight(10)]);
      const car = run({ ...createCar(gentle), speed: 20 }, gentle, 2, idle);
      expect(Math.abs(car.lateral)).toBeLessThan(0.01);
    });

    it('sin acelerar, el coche se queda pegado a su carril en un arco cerrado', () => {
      const tight = Track.fromSegments([straight(10), arc(60, 40), straight(10)]);
      const car = run({ ...createCar(tight), speed: 20 }, tight, 1.5, idle);
      expect(Math.abs(car.lateral)).toBeLessThan(0.5);
    });

    it('acelerando en un arco cerrado salta de carril hacia el muro exterior', () => {
      const tight = Track.fromSegments([straight(10), arc(60, 40), straight(10)]);
      const car = run({ ...createCar(tight), speed: 20 }, tight, 1.5);
      // Curva a la derecha: el exterior es la izquierda (lateral negativo)
      expect(car.lateral).toBeLessThan(-1);
    });
  });

  describe('embudo de 5 a 3 carriles', () => {
    const funnel = Track.fromSegments([straight(40), narrow(15), straight(80)]);
    const NARROW_WALL = 3.3 - CAR_TUNING.carHalfWidth;
    /** Llega al embudo a buena velocidad en el carril exterior derecho (que se cierra). */
    const outerLane = (): CarState => ({
      ...createCar(funnel),
      distance: 20,
      speed: 24,
      lateral: 4.4,
      lane: 4.4,
    });

    it('sin acelerar, el imán lo mete en el carril de al lado sin rozar', () => {
      let car = outerLane();
      let scraped = false;
      while (car.distance < 70) {
        car = stepCar(car, idle, funnel, DT).car;
        if (car.scrapeSide !== 0) scraped = true;
      }
      expect(scraped).toBe(false);
      expect(car.lateral).toBeCloseTo(laneCenter(MIDDLE + 1));
    });

    it('acelerando, la pared lo empuja y sigue rozando aunque el embudo termine', () => {
      const r = runUntil(outerLane(), funnel, (c) => c.distance > 65);
      expect(r.events).not.toContain('crash');
      expect(r.car.scrapeSide).toBe(1);
      expect(r.car.lateral).toBeCloseTo(NARROW_WALL);
      expect(r.car.lane).toBeCloseTo(4.4);
    });

    it('el roce del embudo frena aunque se acelere, y más que en una curva', () => {
      const touch = runUntil(outerLane(), funnel, (c) => c.scrapeSide !== 0).car;
      const later = run(touch, funnel, 0.8);
      expect(later.speed).toBeLessThan(touch.speed);
      expect(CAR_TUNING.taperFrictionMax).toBeGreaterThan(CAR_TUNING.scrapeFrictionMax);
    });

    it('rozando, un swipe hacia dentro lo lleva al carril de al lado (uno solo)', () => {
      const pinned = runUntil(outerLane(), funnel, (c) => c.distance > 60).car;
      const r = runUntil(
        stepCar(pinned, swipe('left'), funnel, DT).car,
        funnel,
        (c) => c.laneTarget === null,
      );
      expect(r.car.lateral).toBeCloseTo(laneCenter(MIDDLE + 1));
      expect(run(r.car, funnel, 0.3).scrapeSide).toBe(0);
    });

    it('rozando, soltar el acelerador lo lleva al carril de al lado', () => {
      const pinned = runUntil(outerLane(), funnel, (c) => c.distance > 60).car;
      const released = run(pinned, funnel, 0.6, idle);
      expect(released.scrapeSide).toBe(0);
      expect(released.lateral).toBeCloseTo(laneCenter(MIDDLE + 1));
    });

    it('en el tramo de 3 carriles, un swipe hacia el muro es un golpecito', () => {
      let car: CarState = {
        ...createCar(funnel),
        distance: 60,
        speed: 20,
        lateral: 2.2,
        lane: 2.2,
      };
      car = stepCar(car, swipe('right'), funnel, DT).car;
      const r = runUntil(car, funnel, (c) => c.laneTarget === null, hold, 1.5);
      expect(r.events).toContain('bump');
      expect(r.car.lateral).toBeCloseTo(2.2);
    });
  });

  describe('cruce en un tramo de 3 carriles', () => {
    const track = Track.fromSegments([
      straight(30),
      narrow(6),
      straight(25),
      right(),
      straight(80),
    ]);
    const entry = track.legs[0].length;
    const reach = (d: number) =>
      runUntil({ ...createCar(track), distance: 20, speed: 20 }, track, (c) => c.distance > d).car;

    it('deslizar al entrar sale por el carril interior del tramo estrecho', () => {
      const car = run(stepCar(reach(entry + 0.3), swipe('right'), track, DT).car, track, 1.5);
      expect(car.leg).toBe(1);
      expect(car.lateral).toBeCloseTo(laneCenter(MIDDLE + 1));
    });

    it('sin swipe, el choque frontal sale solo en menos de un segundo', () => {
      const crash = runUntil(reach(entry - 5), track, (c) => c.mode === 'recovering');
      expect(crash.events).toContain('crash');
      const out = runUntil(crash.car, track, (c) => c.mode === 'driving');
      expect(out.seconds).toBeLessThan(1);
      expect(out.car.leg).toBe(1);
      expect(Math.abs(out.car.lateral)).toBeLessThanOrEqual(3.3 - CAR_TUNING.carHalfWidth + 1e-6);
    });
  });
});
