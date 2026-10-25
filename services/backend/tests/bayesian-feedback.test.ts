import { describe, it, expect } from 'vitest';
import { 
  updateStrengthsFromMatch, 
  estimateMatchExpectedGoals, 
  TeamStrength,
  getDefaultTeamStrength
} from '../src/core/math/bayesian-feedback.js';

describe('Bayesian Online Feedback & Dixon-Coles Ratings', () => {
  it('debe devolver la fuerza base por defecto calibrada para un equipo', () => {
    const madrid = getDefaultTeamStrength('Real Madrid CF');
    expect(madrid.attack).toBeGreaterThan(1.4);
    expect(madrid.defense).toBeLessThan(0.9);

    const normalTeam = getDefaultTeamStrength('CD Leganés');
    expect(normalTeam.attack).toBeLessThan(1.2);
    expect(normalTeam.defense).toBeGreaterThan(0.95);
  });

  it('debe calcular goles esperados mayores para el local con ventaja de campo', () => {
    const home = getDefaultTeamStrength('Real Betis Balompié');
    const away = getDefaultTeamStrength('Valencia CF');

    const exp = estimateMatchExpectedGoals(home, away);
    expect(exp.lambdaHome).toBeGreaterThan(exp.muAway);
    expect(exp.lambdaHome).toBeGreaterThan(1.0);
    expect(exp.muAway).toBeGreaterThan(0.5);
  });

  it('debe ajustar el ataque hacia arriba y la defensa rival hacia abajo cuando hay sorpresa goleadora', () => {
    const barca = getDefaultTeamStrength('FC Barcelona');
    const madrid = getDefaultTeamStrength('Real Madrid CF');

    const initialBarcaAttack = barca.attack;
    const initialMadridDefense = madrid.defense;

    // Supongamos Clásico: Real Madrid 0 - 4 FC Barcelona
    const result = updateStrengthsFromMatch({
      homeStrength: madrid,
      awayStrength: barca,
      goalsHome: 0,
      goalsAway: 4
    });

    // El ataque del Barça debe aumentar
    expect(result.updatedAwayStrength.attack).toBeGreaterThan(initialBarcaAttack);
    // La defensa del Madrid debe empeorar (aumentar el ratio de goles recibidos)
    expect(result.updatedHomeStrength.defense).toBeGreaterThan(initialMadridDefense);
    // El ataque del Madrid debe descender levemente al quedarse en 0 goles en casa
    expect(result.updatedHomeStrength.attack).toBeLessThan(madrid.attack);

    expect(result.adjustmentLog.length).toBeGreaterThan(0);
    expect(result.adjustmentLog[1]).toContain('FC Barcelona');
  });

  it('debe contener la sobrerreacción mediante regularización bayesiana evitando saltos disparatados', () => {
    const teamA = getDefaultTeamStrength('Equipo A');
    const teamB = getDefaultTeamStrength('Equipo B');

    // Goleada extrema 7-0
    const result = updateStrengthsFromMatch({
      homeStrength: teamA,
      awayStrength: teamB,
      goalsHome: 7,
      goalsAway: 0
    });

    // El ataque no debe duplicarse en un solo partido; la tasa de cambio debe estar acotada (< 15%)
    const pctChangeAttack = Math.abs((result.updatedHomeStrength.attack - teamA.attack) / teamA.attack);
    expect(pctChangeAttack).toBeLessThan(0.15);
  });
});
