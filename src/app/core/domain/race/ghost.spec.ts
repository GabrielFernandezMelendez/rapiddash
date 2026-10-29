import { GhostPlayback } from './ghost';

describe('GhostPlayback', () => {
  const frames = [
    { time: 0, distance: 0, lateral: 0, yaw: 0 },
    { time: 1, distance: 10, lateral: 1, yaw: 0 },
    { time: 2, distance: 30, lateral: 0, yaw: 0 },
  ];
  const ghost = new GhostPlayback(frames);

  it('interpola la pose en el tiempo', () => {
    expect(ghost.poseAt(1.5)?.distance).toBeCloseTo(20);
    expect(ghost.poseAt(0.5)?.lateral).toBeCloseTo(0.5);
  });

  it('calcula cuándo pasó por una distancia', () => {
    expect(ghost.timeAtDistance(20)).toBeCloseTo(1.5);
    expect(ghost.timeAtDistance(40)).toBeNull();
  });
});
