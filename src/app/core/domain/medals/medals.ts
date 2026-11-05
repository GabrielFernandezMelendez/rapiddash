/**
 * Medallas por tiempo (fase 1): bronce, plata, oro y platino por mapa. Los tiempos objetivo
 * salen del piloto automático (T): platino T − 3 %, oro T, plata T + 8 %, bronce T + 18 %.
 * La medalla de cada mapa se deduce del mejor tiempo guardado: no hay nada nuevo que guardar.
 */
export const MEDALS = ['bronze', 'silver', 'gold', 'platinum'] as const;
export type Medal = (typeof MEDALS)[number];

export const MEDAL_FACTORS: Readonly<Record<Medal, number>> = {
  platinum: 0.97,
  gold: 1,
  silver: 1.08,
  bronze: 1.18,
};

export type MedalTargets = Readonly<Record<Medal, number>>;

/** Tiempos objetivo a partir del tiempo del piloto automático (redondeados a la milésima). */
export function medalTargets(autopilotTime: number): MedalTargets {
  const at = (m: Medal) => Math.round(autopilotTime * MEDAL_FACTORS[m] * 1000) / 1000;
  return { bronze: at('bronze'), silver: at('silver'), gold: at('gold'), platinum: at('platinum') };
}

/** La mejor medalla que da ese tiempo (null sin tiempo o por encima del bronce). */
export function medalFor(time: number | null, targets: MedalTargets): Medal | null {
  if (time === null) return null;
  for (const m of [...MEDALS].reverse()) if (time <= targets[m]) return m;
  return null;
}

/** La siguiente medalla por conseguir (null si ya es platino). */
export function nextMedal(current: Medal | null): Medal | null {
  const i = current === null ? 0 : MEDALS.indexOf(current) + 1;
  return MEDALS[i] ?? null;
}
