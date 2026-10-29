import { arc, right, straight } from '../track/track-segment';
import { Track } from '../track/track';
import { CarState, createCar, DriveInput, Swipe, stepCar } from './car';
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

  describe('curvas de 90°', () => {
    const track = Track.fromSegments([straight(30), right(), straight(100)]);

    it('sin swipe, choca al llegar a la curva', () => {
      const car = run(createCar(track), track, 4);
      expect(car.mode).toBe('crashed');
      expect(car.cornerIndex).toBe(0);
    });

    it('con swipe en la ventana, toma la curva y sale conduciendo', () => {
      let car = createCar(track);
      while (car.distance < track.corners[0].start - 4) car = stepCar(car, hold, track, DT).car;
      const taken = stepCar(car, swipe('right'), track, DT);
      expect(taken.events).toContain('corner-taken');
      car = run(taken.car, track, 3);
      expect(car.mode).toBe('driving');
      expect(car.distance).toBeGreaterThan(track.corners[0].end);
    });

    it('el swipe en sentido contrario no toma la curva, gira hacia el muro', () => {
      let car = createCar(track);
      while (car.distance < track.corners[0].start - 4) car = stepCar(car, hold, track, DT).car;
      car = stepCar(car, swipe('left'), track, DT).car;
      expect(car.mode).toBe('driving');
      expect(car.yawTarget).toBeCloseTo(-QUARTER_TURN);
    });

    it('tras chocar en la curva, un swipe en su sentido la toma', () => {
      const crashed = run(createCar(track), track, 4);
      const result = stepCar(crashed, swipe('right'), track, DT);
      expect(result.car.mode).toBe('cornering');
      const out = run(result.car, track, 5);
      expect(out.distance).toBeGreaterThan(track.corners[0].end);
    });
  });

  describe('magnetismo', () => {
    it('en un arco suave no desvía el coche', () => {
      const gentle = Track.fromSegments([straight(10), arc(20, 200), straight(10)]);
      const car = run({ ...createCar(gentle), speed: 20 }, gentle, 2, idle);
      expect(Math.abs(car.lateral)).toBeLessThan(0.01);
    });

    it('en un arco cerrado empuja hacia el muro exterior', () => {
      const tight = Track.fromSegments([straight(10), arc(60, 40), straight(10)]);
      const car = run({ ...createCar(tight), speed: 20 }, tight, 1.5);
      // Curva a la derecha: el exterior es la izquierda (lateral negativo)
      expect(car.lateral).toBeLessThan(-1);
    });
  });
});
