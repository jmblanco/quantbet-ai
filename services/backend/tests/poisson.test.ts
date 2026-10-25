import { describe, it, expect } from 'vitest';
import { calculateMatchProbabilities, poissonPmf } from '../src/core/math/poisson.js';

describe('Poisson & Dixon-Coles Probability Engine', () => {
  it('debe calcular correctamente la PMF de Poisson para lambda conocida', () => {
    // Para lambda = 1.0: P(0) = e^(-1) ~ 0.3679
    const p0 = poissonPmf(0, 1.0);
    expect(p0).toBeCloseTo(0.3679, 3);

    // P(1) = 1.0 * e^(-1) ~ 0.3679
    const p1 = poissonPmf(1, 1.0);
    expect(p1).toBeCloseTo(0.3679, 3);
  });

  it('debe calcular probabilidades 1X2 cuya suma sea exactamente 1.000', () => {
    const result = calculateMatchProbabilities({
      lambdaHome: 1.85, // Ej: Real Madrid en casa
      muAway: 0.95,     // Ej: Rival visitante
      rho: -0.05
    });

    expect(result.prob1).toBeGreaterThan(result.prob2);
    expect(result.prob1).toBeGreaterThan(result.probX);

    const sum = Number((result.prob1 + result.probX + result.prob2).toFixed(2));
    expect(sum).toBe(1.0);
  });

  it('debe reflejar ventaja visitante cuando lambdaHome < muAway', () => {
    const result = calculateMatchProbabilities({
      lambdaHome: 0.60,
      muAway: 2.20
    });

    expect(result.prob2).toBeGreaterThan(result.prob1);
  });
});
