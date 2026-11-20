import { describe, expect, it } from 'vitest';
import { CAR_TUNING, isCustomTuning, setActiveTuning, tuning } from './car-tuning';
import { LAB_PARAMS, labDiff, sanitizeLab } from './physics-lab';

describe('laboratorio de física', () => {
  it('los valores de serie están dentro de los límites del panel', () => {
    for (const p of LAB_PARAMS) {
      const v = CAR_TUNING[p.key] as number;
      expect(v, p.key).toBeGreaterThanOrEqual(p.min);
      expect(v, p.key).toBeLessThanOrEqual(p.max);
    }
  });

  it('lo guardado se limpia: claves desconocidas fuera y números dentro de sus límites', () => {
    expect(sanitizeLab('basura')).toBeNull();
    expect(sanitizeLab({ hack: 3, maxSpeed: 999, curveModel: 'magnet' })).toEqual({
      maxSpeed: 40,
      curveModel: 'magnet',
    });
  });

  it('cambiar los parámetros los aplica y marca la carrera como de prueba', () => {
    try {
      setActiveTuning({ gripAccel: 25 });
      expect(tuning().gripAccel).toBe(25);
      expect(tuning().maxSpeed).toBe(CAR_TUNING.maxSpeed);
      expect(isCustomTuning()).toBe(true);
      setActiveTuning({ ...CAR_TUNING });
      expect(isCustomTuning()).toBe(false);
    } finally {
      setActiveTuning(null);
    }
  });

  it('copiar valores: solo lo que cambia respecto a los de serie', () => {
    expect(labDiff({ ...CAR_TUNING, gripAccel: 20 })).toEqual({ gripAccel: 20 });
  });
});
