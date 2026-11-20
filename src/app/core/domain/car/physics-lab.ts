import { CAR_TUNING, CarTuning } from './car-tuning';

/** Grupos del laboratorio de física, en el orden del panel. */
export type LabGroup = 'speed' | 'lane' | 'junction' | 'curve' | 'wall';

export interface LabParam {
  readonly key: keyof CarTuning;
  readonly group: LabGroup;
  readonly min: number;
  readonly max: number;
  readonly step: number;
}

/**
 * Parámetros que se pueden tocar en el laboratorio (solo en debug), con sus límites. Los valores
 * de serie están en `CAR_TUNING`.
 */
export const LAB_PARAMS: readonly LabParam[] = [
  { key: 'maxSpeed', group: 'speed', min: 16, max: 40, step: 0.5 },
  { key: 'acceleration', group: 'speed', min: 3, max: 20, step: 0.5 },
  { key: 'coastDrag', group: 'speed', min: 0.5, max: 10, step: 0.5 },
  { key: 'laneChangeFrequency', group: 'lane', min: 6, max: 24, step: 0.5 },
  { key: 'laneChangeDamping', group: 'lane', min: 0.2, max: 1.2, step: 0.05 },
  { key: 'laneChangeRetarget', group: 'lane', min: 0, max: 1.5, step: 0.05 },
  { key: 'junctionEarlyEntry', group: 'junction', min: 0, max: 4, step: 0.1 },
  { key: 'turnRate', group: 'junction', min: 6, max: 30, step: 1 },
  { key: 'frontRecoverySpeed', group: 'junction', min: 4, max: 20, step: 0.5 },
  { key: 'frontRecoveryTime', group: 'junction', min: 0.2, max: 1.5, step: 0.05 },
  { key: 'gripAccel', group: 'curve', min: 6, max: 40, step: 0.5 },
  { key: 'slideGain', group: 'curve', min: 0.2, max: 3, step: 0.1 },
  { key: 'slideRecovery', group: 'curve', min: 1, max: 20, step: 0.5 },
  { key: 'magnetGain', group: 'curve', min: 5, max: 80, step: 1 },
  { key: 'coastMagnetFactor', group: 'curve', min: 0, max: 1, step: 0.05 },
  { key: 'laneSpring', group: 'curve', min: 4, max: 30, step: 0.5 },
  { key: 'lanePull', group: 'curve', min: 1, max: 12, step: 0.5 },
  { key: 'scrapeFrictionStart', group: 'wall', min: 0, max: 20, step: 0.5 },
  { key: 'scrapeFrictionMax', group: 'wall', min: 0, max: 40, step: 0.5 },
  { key: 'taperFrictionStart', group: 'wall', min: 0, max: 30, step: 0.5 },
  { key: 'taperFrictionMax', group: 'wall', min: 0, max: 50, step: 0.5 },
  { key: 'bumpKeep', group: 'wall', min: 0.3, max: 1, step: 0.05 },
];

export const LAB_GROUPS: readonly LabGroup[] = ['speed', 'lane', 'junction', 'curve', 'wall'];

/** Lo guardado, comprobado: solo claves conocidas, números dentro de sus límites y el modelo. */
export function sanitizeLab(raw: unknown): Partial<CarTuning> | null {
  if (!raw || typeof raw !== 'object') return null;
  const src = raw as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const p of LAB_PARAMS) {
    const v = src[p.key];
    if (typeof v === 'number' && Number.isFinite(v)) out[p.key] = Math.min(p.max, Math.max(p.min, v));
  }
  if (src['curveModel'] === 'grip' || src['curveModel'] === 'magnet') out['curveModel'] = src['curveModel'];
  return Object.keys(out).length ? (out as Partial<CarTuning>) : null;
}

/** Solo lo que cambia respecto a los valores de serie (para copiarlo y pasarlo). */
export function labDiff(values: Partial<CarTuning>): Partial<CarTuning> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (CAR_TUNING[k as keyof CarTuning] !== v) out[k] = v;
  }
  return out as Partial<CarTuning>;
}
