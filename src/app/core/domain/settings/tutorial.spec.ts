import { nextStep, previousStep, showTutorialBeforeRace, TUTORIAL_STEPS } from './tutorial';

describe('Tutorial', () => {
  it('cinco pasos: acelerar, carriles, cruces, embudos y rival', () => {
    expect(TUTORIAL_STEPS).toEqual(['accelerate', 'lanes', 'junctions', 'funnels', 'rival']);
  });

  it('sale solo antes de la primera carrera', () => {
    expect(showTutorialBeforeRace(false)).toBe(true);
    expect(showTutorialBeforeRace(true)).toBe(false);
  });

  it('avanza y retrocede sin salirse', () => {
    expect(nextStep('accelerate')).toBe('lanes');
    expect(nextStep('rival')).toBeNull();
    expect(previousStep('lanes')).toBe('accelerate');
    expect(previousStep('accelerate')).toBeNull();
  });
});
