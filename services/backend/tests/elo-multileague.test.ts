import { describe, it, expect } from 'vitest';
import { 
  getTeamElo, 
  getLeagueQualityCoefficient, 
  estimateMatchExpectedGoals,
  getDefaultTeamStrength
} from '../src/core/math/bayesian-feedback.js';

describe('Unified Elo Bridge & Multi-League Normalization', () => {
  it('debe asignar calificaciones Elo coherentes entre ligas y selecciones', () => {
    const eloCity = getTeamElo('Manchester City');
    const eloCeltic = getTeamElo('Celtic');
    const eloEspana = getTeamElo('España');
    const eloSanMarino = getTeamElo('San Marino');
    const eloBurgos = getTeamElo('Burgos CF');

    expect(eloCity).toBeGreaterThan(2000);
    expect(eloEspana).toBeGreaterThan(2000);
    expect(eloCity).toBeGreaterThan(eloCeltic);
    expect(eloCeltic).toBeGreaterThan(eloBurgos);
    expect(eloBurgos).toBeGreaterThan(eloSanMarino);
  });

  it('debe ajustar coeficientes de calidad de liga según ranking UEFA', () => {
    const coeffPremier = getLeagueQualityCoefficient('Manchester City');
    const coeffLaLiga = getLeagueQualityCoefficient('Real Madrid CF');
    const coeffCeltic = getLeagueQualityCoefficient('Celtic');
    const coeffSegunda = getLeagueQualityCoefficient('Burgos CF');
    const coeffCopa = getLeagueQualityCoefficient('Atlético Calatayud');

    expect(coeffPremier).toBeGreaterThan(coeffCeltic);
    expect(coeffLaLiga).toBeGreaterThan(coeffCeltic);
    expect(coeffCeltic).toBeGreaterThan(coeffSegunda);
    expect(coeffSegunda).toBeGreaterThan(coeffCopa);
  });

  it('debe reflejar la superioridad de un club de élite en campo de un club menor europeo', () => {
    // Ejemplo real Jornada 15: Lillestrom (Noruega) vs Real Sociedad (España)
    const lillestrom = getDefaultTeamStrength('Lillestrom');
    const realSociedad = getDefaultTeamStrength('Real Sociedad');

    const exp = estimateMatchExpectedGoals(lillestrom, realSociedad, 1.08, { competition: 'CHAMPIONS' });

    // A pesar de jugar fuera, la Real Sociedad debe tener mayor expectativa de gol que Lillestrom
    expect(exp.muAway).toBeGreaterThan(exp.lambdaHome);
  });

  it('debe anular la ventaja de campo en sede neutral para selecciones', () => {
    const espana = getDefaultTeamStrength('España');
    const croacia = getDefaultTeamStrength('Croacia');

    const expHome = estimateMatchExpectedGoals(espana, croacia, 1.08, { isNeutralVenue: false });
    const expNeutral = estimateMatchExpectedGoals(espana, croacia, 1.08, { isNeutralVenue: true });

    // En sede neutral, lambda del primer equipo debe ser menor que jugando en casa
    expect(expNeutral.lambdaHome).toBeLessThan(expHome.lambdaHome);
  });
});
