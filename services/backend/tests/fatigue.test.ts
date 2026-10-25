import { describe, it, expect } from 'vitest';
import { evaluateTeamFatigue, applyFatigueToExpectedGoals } from '../src/core/math/fatigue.js';

describe('Fatigue & European Calendar Engine', () => {
  it('debe penalizar la expectativa goleadora de un equipo con partido de Champions entre semana (<72h descanso)', () => {
    const fatigue = evaluateTeamFatigue({
      team: 'Real Madrid CF',
      hasMidweekMatch: true,
      midweekCompetition: 'CHAMPIONS_LEAGUE',
      restHours: 66,
      traveledAbroad: true,
      rotationsExpected: true
    });

    expect(fatigue.hasFatigue).toBe(true);
    expect(fatigue.attackMultiplier).toBeLessThan(0.90); // Más de un 10% de penalización ofensiva
    expect(fatigue.defenseMultiplier).toBeGreaterThan(1.05); // Concede más goles por rotaciones
    expect(fatigue.badgeLabel).toContain('CHAMPIONS');
  });

  it('no debe penalizar a equipos con descanso completo (> 120h sin partido intersemanal)', () => {
    const fatigue = evaluateTeamFatigue({
      team: 'CD Leganés',
      hasMidweekMatch: false,
      restHours: 168
    });

    expect(fatigue.hasFatigue).toBe(false);
    expect(fatigue.attackMultiplier).toBe(1.0);
    expect(fatigue.defenseMultiplier).toBe(1.0);
  });

  it('debe ajustar correctamente los lambdas y mus de Dixon-Coles en presencia de fatiga', () => {
    const baseLambda = 2.10; // Real Madrid
    const baseMu = 0.80;     // Rival

    const result = applyFatigueToExpectedGoals(baseLambda, baseMu, 'Real Madrid CF', 'RCD Espanyol', true);

    // Al tener fatiga el Real Madrid, su lambda ajustado debe bajar respecto al base
    expect(result.adjustedLambdaHome).toBeLessThan(baseLambda);
    expect(result.homeFatigue.hasFatigue).toBe(true);
  });
});
