import { GhostPlayback } from './ghost';

describe('GhostPlayback', () => {
  const frames = [
    { time: 0, progress: 0, leg: 0, distance: 0, lateral: 0, yaw: 0 },
    { time: 1, progress: 10, leg: 0, distance: 10, lateral: 1, yaw: 0 },
    { time: 2, progress: 30, leg: 0, distance: 30, lateral: 0, yaw: 0 },
    { time: 3, progress: 35, leg: 1, distance: 5, lateral: 0, yaw: 0 },
  ];
  const ghost = new GhostPlayback(frames);

  it('interpola la pose en el tiempo', () => {
    expect(ghost.poseAt(1.5)?.distance).toBeCloseTo(20);
    expect(ghost.poseAt(0.5)?.lateral).toBeCloseTo(0.5);
  });

  it('no interpola entre tramos distintos', () => {
    expect(ghost.poseAt(2.5)?.leg).toBe(0);
    expect(ghost.poseAt(2.5)?.distance).toBe(30);
  });

  it('calcula cuándo pasó por una distancia', () => {
    expect(ghost.timeAtProgress(20)).toBeCloseTo(1.5);
    expect(ghost.timeAtProgress(40)).toBeNull();
  });
});
