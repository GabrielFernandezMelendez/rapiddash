/** Pasos del tutorial «Cómo se juega», en orden. */
export const TUTORIAL_STEPS = ['accelerate', 'lanes', 'junctions', 'funnels', 'rival'] as const;

export type TutorialStep = (typeof TUTORIAL_STEPS)[number];

/** El tutorial sale solo antes de la primera carrera; después, desde Ajustes. */
export function showTutorialBeforeRace(seen: boolean): boolean {
  return !seen;
}

/** Paso siguiente, o null si era el último. */
export function nextStep(step: TutorialStep): TutorialStep | null {
  return TUTORIAL_STEPS[TUTORIAL_STEPS.indexOf(step) + 1] ?? null;
}

/** Paso anterior, o null si era el primero. */
export function previousStep(step: TutorialStep): TutorialStep | null {
  const i = TUTORIAL_STEPS.indexOf(step);
  return i > 0 ? TUTORIAL_STEPS[i - 1] : null;
}
