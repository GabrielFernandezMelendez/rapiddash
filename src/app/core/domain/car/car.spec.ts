import { arc, right, straight } from '../track/track-segment';
import { Track } from '../track/track';
import { CarState, createCar, DriveInput, Swipe, stepCar } from './car';
import { LANE_COUNT, laneCenter } from '../track/track-constants';
import { CAR_TUNING, QUARTER_TURN, WALL_LIMIT } from './car-tuning';

const DT = 1 / 60;
const hold: DriveInput = { throttle: true, swipes: [] };
const idle: DriveInput = { throttle: false, swipes: [] };
const swipe = (...swipes: Swipe[]): DriveInput => ({ throttle: true, swipes });

function run(car: CarState, track: Track, seconds: number, input: DriveInput = hold): CarState {
  let state = car;
  for (let t = 0; t < seconds; t += DT) state = stepCar(state, input, track, DT).car;
  return state;
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

  it('girado sin enderezar choca contra el muro y se queda parado', () => {
    let car = run(createCar(longStraight), longStraight, 1);
    car = stepCar(car, swipe('left'), longStraight, DT).car;
    car = run(car, longStraight, 3);
    expect(car.mode).toBe('crashed');
    expect(car.wallSide).toBe(-1);
    expect(car.lateral).toBeCloseTo(-WALL_LIMIT);
    expect(car.speed).toBe(0);
  });

  it('tras chocar, el swipe hacia el muro no hace nada y el contrario recupera', () => {
    let car = run(createCar(longStraight), longStraight, 1);
    car = stepCar(car, swipe('left'), longStraight, DT).car;
    car = run(car, longStraight, 3);
    expect(stepCar(car, swipe('left'), longStraight, DT).car.mode).toBe('crashed');
    const result = stepCar(car, swipe('right'), longStraight, DT);
    expect(result.events).toContain('recovered');
    expect(result.car.mode).toBe('driving');
    expect(result.car.yawTarget).toBeCloseTo(QUARTER_TURN);
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

    it('sin swipe, choca de frente contra el muro del cruce', () => {
      const car = run(createCar(track), track, 5);
      expect(car.mode).toBe('crashed');
      expect(car.wallSide).toBe(0);
      expect(car.leg).toBe(0);
      expect(car.distance).toBeGreaterThan(entry);
    });

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
      let car = stepCar(driveTo(entry - 10), swipe('right'), track, DT).car;
      car = run(car, track, 1);
      expect(car.mode).toBe('crashed');
      expect(car.wallSide).toBe(1);
    });

    it('tras el choque frontal, un swipe hacia la salida continúa la carrera', () => {
      const crashed = run(createCar(track), track, 5);
      const result = stepCar(crashed, swipe('right'), track, DT);
      expect(result.events).toContain('recovered');
      const out = run(result.car, track, 3);
      expect(out.leg).toBe(1);
      expect(out.mode).toBe('driving');
    });

    it('tras el choque frontal, el swipe al lado cerrado también despega el coche', () => {
      const crashed = run(createCar(track), track, 5);
      let car = stepCar(crashed, swipe('left'), track, DT).car;
      expect(car.mode).toBe('driving');
      car = run(car, track, 3);
      // Llega al muro cerrado; desde ahí, hacia la salida
      expect(car.mode).toBe('crashed');
      expect(car.wallSide).toBe(-1);
      car = run(stepCar(car, swipe('right'), track, DT).car, track, 4);
      expect(car.leg).toBe(1);
    });
  });

  describe('imán de carril', () => {
    it('al enderezar, el coche se centra en el carril más cercano', () => {
      let car = run(createCar(longStraight), longStraight, 1);
      car = stepCar(car, swipe('right'), longStraight, DT).car;
      car = run(car, longStraight, 0.12);
      car = stepCar(car, swipe('forward'), longStraight, DT).car;
      car = run(car, longStraight, 1.5);
      const lanes = [0, 1, 2, 3, 4].map(laneCenter);
      expect(lanes.some((c) => Math.abs(c - car.lateral) < 0.01)).toBe(true);
      expect(Math.abs(car.lateral)).toBeGreaterThan(1);
    });

    it('tras salir de un choque contra el muro acaba en un carril', () => {
      let car = run(createCar(longStraight), longStraight, 1);
      car = stepCar(car, swipe('left'), longStraight, DT).car;
      car = run(car, longStraight, 3);
      car = stepCar(car, swipe('right'), longStraight, DT).car;
      car = run(car, longStraight, 0.3);
      car = stepCar(car, swipe('forward'), longStraight, DT).car;
      car = run(car, longStraight, 1.5);
      expect([0, 1, 2, 3, 4].map(laneCenter).some((c) => Math.abs(c - car.lateral) < 0.01)).toBe(
        true,
      );
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
