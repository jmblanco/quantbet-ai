import { describe, it, expect } from 'vitest';
import { calculateExpectedValue } from '../src/core/math/expected-value.js';

describe('Expected Value (EV) Engine', () => {
  it('debe detectar valor masivo en la sorpresa cuando el público sobre-apuesta el favorito', () => {
    // Escenario: El público juega 85% al favorito, pero el modelo calcula que solo ganará el 60%
    // El empate tiene 25% de prob real pero el público solo le echa el 10% -> EV de X = 25 / 10 = 2.50!
    const result = calculateExpectedValue({
      prob1: 0.60,
      probX: 0.25,
      prob2: 0.15,
      pctLae1: 85.0,
      pctLaeX: 10.0,
      pctLae2: 5.0
    });

    expect(result.signs['1'].isOverbet).toBe(true); // 0.60 / 0.85 = 0.705 (< 0.85)
    expect(result.signs['X'].hasValue).toBe(true);  // 0.25 / 0.10 = 2.500 (>> 1.05)
    expect(result.signs['2'].hasValue).toBe(true);  // 0.15 / 0.05 = 3.000
    expect(result.signs['X'].evRatio).toBeGreaterThan(2.0);
  });

  it('debe recomendar signo con alto score de confianza si hay favorito indiscutible', () => {
    const result = calculateExpectedValue({
      prob1: 0.78,
      probX: 0.14,
      prob2: 0.08,
      pctLae1: 75.0,
      pctLaeX: 15.0,
      pctLae2: 10.0
    });

    expect(result.recommendedSign).toBe('1');
    expect(result.confidenceScore).toBeGreaterThan(70);
  });
});
