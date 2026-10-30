import { arc, right, straight } from '../track/track-segment';
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

  it('un swipe lateral en recta gira 90° y no acelera mientras está girado', () => {
    const car = run(createCar(longStraight), longStraight, 1);
    const turned = stepCar(car, swipe('right'), longStraight, DT).car;
    expect(turned.yawTarget).toBeCloseTo(QUARTER_TURN);
    const later = run(turned, longStraight, 0.1);
    expect(later.accelerating).toBe(false);
    expect(later.lateral).toBeGreaterThan(car.lateral);
  });

  it('el swipe adelante endereza el coche', () => {
    let car = run(createCar(longStraight), longStraight, 1);
    car = stepCar(car, swipe('right'), longStraight, DT).car;
    car = run(car, longStraight, 0.05);
    car = stepCar(car, swipe('forward'), longStraight, DT).car;
    car = run(car, longStraight, 0.3);
    expect(car.yaw).toBe(0);
    expect(car.mode).toBe('driving');
  });

  describe('choque lateral (coche girado contra el muro)', () => {
    function crashLeft() {
      let car = run(createCar(longStraight), longStraight, 2);
      const before = car.speed;
      car = stepCar(car, swipe('left'), longStraight, DT).car;
      const r = runUntil(car, longStraight, (c) => c.mode === 'recovering');
      return { ...r, before };
    }

    it('no se para: pierde velocidad y entra en recuperación automática', () => {
      const { car, events, before } = crashLeft();
      expect(events).toContain('crash');
      expect(car.mode).toBe('recovering');
      expect(car.speed).toBeGreaterThan(0);
      expect(car.speed).toBeLessThan(before);
    });

    it('en menos de un segundo queda recto y en el carril pegado al muro', () => {
      const { car } = crashLeft();
      const r = runUntil(car, longStraight, (c) => c.mode === 'driving');
      expect(r.seconds).toBeLessThan(1);
      expect(r.events).toContain('recovered');
      expect(r.car.yaw).toBe(0);
      expect(r.car.lateral).toBeCloseTo(laneCenter(0));
    });

    it('ignora los swipes durante la recuperación', () => {
      const { car } = crashLeft();
      const after = stepCar(car, swipe('right'), longStraight, DT).car;
      expect(after.mode).toBe('recovering');
      expect(after.yawTarget).toBe(0);
    });

    it('sigue avanzando durante la animación', () => {
      const { car } = crashLeft();
      expect(run(car, longStraight, 0.4).distance).toBeGreaterThan(car.distance);
    });
  });

  describe('roce contra el muro', () => {
    // Arco cerrado a la derecha: acelerando, el magnetismo lleva al muro izquierdo
    const tight = Track.fromSegments([straight(10), arc(170, 40), straight(20)]);

    function scrapeTrack() {
      return runUntil({ ...createCar(tight), speed: 24 }, tight, (c) => c.scrapeSide !== 0);
    }

    it('un contacto casi paralelo no es un choque: roza y sigue', () => {
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
      const turned = run(stepCar(car, swipe('right'), tight, DT).car, tight, 0.2);
      expect(turned.scrapeSide).toBe(0);
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

    it('deslizar al entrar en el cruce sale por el carril interior', () => {
      let car = stepCar(driveTo(entry + 0.5), swipe('right'), track, DT).car;
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
      car = run(car, track, 2);
      expect(car.leg).toBe(1);
      expect(car.mode).toBe('driving');
    });

    it('girar demasiado pronto lleva contra el muro lateral', () => {
      const car = stepCar(driveTo(entry - 10), swipe('right'), track, DT).car;
      const r = runUntil(car, track, (c) => c.mode === 'recovering', hold, 2);
      expect(r.events).toContain('crash');
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

  describe('imán de carril', () => {
    it('al enderezar, el coche se centra en el carril más cercano', () => {
      let car = run(createCar(longStraight), longStraight, 1);
      car = stepCar(car, swipe('right'), longStraight, DT).car;
      car = run(car, longStraight, 0.12);
      car = stepCar(car, swipe('forward'), longStraight, DT).car;
      car = run(car, longStraight, 1.5);
      expect(inALane(car)).toBe(true);
      expect(Math.abs(car.lateral)).toBeGreaterThan(1);
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
});
