import { formatDelta, formatTime } from './format-time';

describe('formatTime', () => {
  it('formatea minutos, segundos y centésimas', () => {
    expect(formatTime(38.624)).toBe('0:38.62');
    expect(formatTime(65.5)).toBe('1:05.50');
    expect(formatTime(-1)).toBe('0:00.00');
  });

  it('formatea la diferencia con el fantasma', () => {
    expect(formatDelta(-0.42)).toBe('−0.42');
    expect(formatDelta(1.2)).toBe('+1.20');
  });
});
