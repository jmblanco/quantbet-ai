import { prisma } from '../../infrastructure/db.js';
import { valkey } from '../../infrastructure/cache.js';
import { calculateMatchProbabilities } from '../math/poisson.js';
import { calculateExpectedValue, MatchValueAnalysis } from '../math/expected-value.js';
import { applyFatigueToExpectedGoals, FatigueAdjustmentResult } from '../math/fatigue.js';
import { 
  TeamStrength, 
  getDefaultTeamStrength, 
  estimateMatchExpectedGoals, 
  updateStrengthsFromMatch 
} from '../math/bayesian-feedback.js';

export interface TeamGoalAverages {
  [teamName: string]: { homeScored: number; homeConceded: number; awayScored: number; awayConceded: number };
}

// Promedios y fortalezas estimadas de LaLiga (Goles esperados base)
const DEFAULT_LEAGUE_AVG_HOME = 1.45;
const DEFAULT_LEAGUE_AVG_AWAY = 1.05;

export class PredictionService {
  private teamStrengths: Map<string, TeamStrength> = new Map();

  async getTeamStrength(team: string): Promise<TeamStrength> {
    if (this.teamStrengths.has(team)) {
      return this.teamStrengths.get(team)!;
    }

    try {
      const cached = await valkey.get(`rating:team:${team}`);
      if (cached) {
        const parsed = JSON.parse(cached) as TeamStrength;
        this.teamStrengths.set(team, parsed);
        return parsed;
      }
    } catch (e) {
      // Ignorar fallo de cache
    }

    const defaultStr = getDefaultTeamStrength(team);
    this.teamStrengths.set(team, defaultStr);
    return defaultStr;
  }

  async saveTeamStrength(strength: TeamStrength): Promise<void> {
    this.teamStrengths.set(strength.team, strength);
    try {
      await valkey.set(`rating:team:${strength.team}`, JSON.stringify(strength));
    } catch (e) {}
  }

  async getAllTeamRatings(): Promise<TeamStrength[]> {
    const teams = [
      'Real Madrid CF', 'FC Barcelona', 'Club Atlético de Madrid', 'Athletic Club',
      'Real Sociedad de Fútbol', 'Villarreal CF', 'Real Betis Balompié', 'Girona FC',
      'Sevilla FC', 'RC Celta de Vigo', 'CA Osasuna', 'Rayo Vallecano de Madrid',
      'RCD Mallorca', 'Getafe CF', 'Deportivo Alavés', 'UD Las Palmas',
      'RCD Espanyol de Barcelona', 'CD Leganés', 'Real Valladolid CF', 'Valencia CF'
    ];

    const results: TeamStrength[] = [];
    for (const t of teams) {
      results.push(await this.getTeamStrength(t));
    }

    return results.sort((a, b) => b.attack - a.attack);
  }

  async applyBayesianFeedbackFromJornada(jornadaId: string): Promise<{
    matchesEvaluated: number;
    adjustments: string[];
  }> {
    const jornada = await prisma.jornada.findUnique({
      where: { id: jornadaId },
      include: {
        partidos: {
          where: {
            golesLocal: { not: null },
            golesVisitante: { not: null }
          }
        }
      }
    });

    if (!jornada || jornada.partidos.length === 0) {
      return { 
        matchesEvaluated: 0, 
        adjustments: ['No se encontraron partidos con resultado finalizado en la jornada seleccionada.'] 
      };
    }

    const allLogs: string[] = [];

    for (const partido of jornada.partidos) {
      const homeStr = await this.getTeamStrength(partido.equipoLocal);
      const awayStr = await this.getTeamStrength(partido.equipoVisitante);

      const updateResult = updateStrengthsFromMatch({
        homeStrength: homeStr,
        awayStrength: awayStr,
        goalsHome: partido.golesLocal!,
        goalsAway: partido.golesVisitante!
      });

      await this.saveTeamStrength(updateResult.updatedHomeStrength);
      await this.saveTeamStrength(updateResult.updatedAwayStrength);

      allLogs.push(...updateResult.adjustmentLog);
    }

    // Invalidar caché de jornadas y ratings
    try {
      await valkey.del('cache:jornadas:list');
    } catch (e) {}

    return {
      matchesEvaluated: jornada.partidos.length,
      adjustments: allLogs
    };
  }

  /**
   * Genera y almacena las predicciones de IA y análisis de EV para todos los partidos de una jornada.
   */
  async generateJornadaPredictions(jornadaId: string, modeloVersion: string = 'poisson-dixon-coles-v1.0') {
    const jornada = await prisma.jornada.findUnique({
      where: { id: jornadaId },
      include: { partidos: true }
    });

    if (!jornada) {
      throw new Error(`Jornada con ID ${jornadaId} no encontrada`);
    }

    const predictionsResult: Array<{
      partidoId: string;
      casilla: number;
      local: string;
      visitante: string;
      analysis: MatchValueAnalysis;
      homeFatigue?: FatigueAdjustmentResult;
      awayFatigue?: FatigueAdjustmentResult;
    }> = [];

    for (const partido of jornada.partidos) {
      // Estimar lambdas de Poisson con ratings bayesianos actualizados
      const baseExpected = await this.estimateExpectedGoals(
        partido.equipoLocal,
        partido.equipoVisitante,
        Number(partido.pctApostadoLae1 ?? 40),
        Number(partido.pctApostadoLaeX ?? 30),
        Number(partido.pctApostadoLae2 ?? 30)
      );

      // Aplicar Factor Descanso / Fatiga Europea
      const { adjustedLambdaHome, adjustedMuAway, homeFatigue, awayFatigue } = applyFatigueToExpectedGoals(
        baseExpected.lambdaHome,
        baseExpected.muAway,
        partido.equipoLocal,
        partido.equipoVisitante,
        true
      );

      const probs = calculateMatchProbabilities({
        lambdaHome: adjustedLambdaHome,
        muAway: adjustedMuAway,
        rho: -0.06
      });

      const analysis = calculateExpectedValue({
        prob1: probs.prob1,
        probX: probs.probX,
        prob2: probs.prob2,
        pctLae1: Number(partido.pctApostadoLae1 ?? 33.3),
        pctLaeX: Number(partido.pctApostadoLaeX ?? 33.3),
        pctLae2: Number(partido.pctApostadoLae2 ?? 33.3)
      });

      // Si hay fatiga europea relevante, enriquecer la nota explicativa
      if (homeFatigue.hasFatigue || awayFatigue.hasFatigue) {
        const fatigued = homeFatigue.hasFatigue ? partido.equipoLocal : partido.equipoVisitante;
        const fatigueObj = homeFatigue.hasFatigue ? homeFatigue : awayFatigue;
        analysis.explanation += ` [Factor Calendario: ${fatigued} ${fatigueObj.warningNotice}]`;
      }

      // Guardar o actualizar en la base de datos
      await prisma.prediccionIa.upsert({
        where: {
          id: `${partido.id}-${modeloVersion}`
        },
        create: {
          id: `${partido.id}-${modeloVersion}`,
          partidoId: partido.id,
          modeloVersion,
          prob1: probs.prob1,
          probX: probs.probX,
          prob2: probs.prob2,
          ev1: analysis.signs['1'].evRatio,
          evX: analysis.signs['X'].evRatio,
          ev2: analysis.signs['2'].evRatio,
          recomendacionSigno: analysis.recommendedSign,
          confianzaScore: analysis.confidenceScore
        },
        update: {
          prob1: probs.prob1,
          probX: probs.probX,
          prob2: probs.prob2,
          ev1: analysis.signs['1'].evRatio,
          evX: analysis.signs['X'].evRatio,
          ev2: analysis.signs['2'].evRatio,
          recomendacionSigno: analysis.recommendedSign,
          confianzaScore: analysis.confidenceScore
        }
      });

      predictionsResult.push({
        partidoId: partido.id,
        casilla: partido.numeroCasilla,
        local: partido.equipoLocal,
        visitante: partido.equipoVisitante,
        analysis
      });
    }

    return predictionsResult;
  }

  /**
   * Modela la expectativa de goles lambda y mu considerando localía y calidad relativa bayesiana.
   */
  async estimateExpectedGoals(
    local: string,
    visitante: string,
    lae1: number,
    laeX: number,
    lae2: number
  ): Promise<{ lambdaHome: number; muAway: number }> {
    const homeStr = await this.getTeamStrength(local);
    const awayStr = await this.getTeamStrength(visitante);
    return estimateMatchExpectedGoals(homeStr, awayStr);
  }
}
