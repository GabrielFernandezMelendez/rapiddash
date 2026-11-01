import { formatDelta, formatTime } from './format-time';

describe('formatTime', () => {
  it('formatea minutos, segundos y centésimas', () => {
    expect(formatTime(38.6244)).toBe('0:38.624');
    expect(formatTime(65.5)).toBe('1:05.500');
    expect(formatTime(-1)).toBe('0:00.000');
    expect(formatTime(59.9996)).toBe('1:00.000');
  });

  it('formatea la diferencia con el fantasma', () => {
    expect(formatDelta(-0.42)).toBe('−0.42');
    expect(formatDelta(1.2)).toBe('+1.20');
  });
});
