import { describe, it, expect } from 'vitest';
import {
  hammingDistance,
  generateDirectBets,
  processReduction,
  BaseBetMatch
} from '../src/core/math/reductions.js';

describe('Combinatorial Reductions & QUI Exporter', () => {
  it('debe calcular la distancia de Hamming con precisión', () => {
    const betA = '11111111111111';
    const betB = '1111111111111X'; // 1 diferencia
    const betC = 'XXXXXXXXXXXXXX'; // 14 diferencias

    expect(hammingDistance(betA, betB)).toBe(1);
    expect(hammingDistance(betA, betC)).toBe(14);
    expect(hammingDistance(betA, betA)).toBe(0);
  });

  it('debe generar exactamente 2^D * 3^T combinaciones directas', () => {
    // 2 dobles y 1 triple = 2^2 * 3^1 = 4 * 3 = 12 apuestas
    const matches: BaseBetMatch[] = [
      { matchNumber: 1, selection: '1X' },
      { matchNumber: 2, selection: '12' },
      { matchNumber: 3, selection: '1X2' },
      ...Array.from({ length: 11 }, (_, i) => ({
        matchNumber: i + 4,
        selection: '1' as const
      }))
    ];

    const directBets = generateDirectBets(matches);
    expect(directBets.length).toBe(12);
  });

  it('debe reducir eficazmente al 13 ahorrando coste respecto al directo', () => {
    // 4 dobles al directo son 16 apuestas (12.00€). Al 13 se reducen drásticamente.
    const matches: BaseBetMatch[] = [
      { matchNumber: 1, selection: '1X' },
      { matchNumber: 2, selection: '1X' },
      { matchNumber: 3, selection: '1X' },
      { matchNumber: 4, selection: '1X' },
      ...Array.from({ length: 10 }, (_, i) => ({
        matchNumber: i + 5,
        selection: '1' as const
      }))
    ];

    const result = processReduction({
      guarantee: 'AL_13',
      matches,
      pleno15: 'M-1'
    });

    expect(result.totalDirectBets).toBe(16);
    expect(result.reducedBetsCount).toBeLessThan(16);
    expect(result.savingsPercentage).toBeGreaterThan(0);
    expect(result.formattedQuiFile).toContain('PLENO AL 15: M-1');
  });
});
