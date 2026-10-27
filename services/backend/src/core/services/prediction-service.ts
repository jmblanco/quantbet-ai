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
import { MLInferenceService } from '../ml/ml-inference-service.js';

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
    autoApplied: boolean;
    appliedAt: string;
    jornadaId: string;
    matchesEvaluated: number;
    adjustments: string[];
  }> {
    const jornada = await prisma.jornada.findUnique({
      where: { id: jornadaId },
      include: {
        partidos: true
      }
    });

    if (!jornada || jornada.partidos.length === 0) {
      return { 
        autoApplied: true,
        appliedAt: new Date().toISOString(),
        jornadaId,
        matchesEvaluated: 0, 
        adjustments: ['No se encontraron partidos en la jornada seleccionada.'] 
      };
    }

    const allLogs: string[] = [];
    let matchesEvaluated = 0;

    for (const partido of jornada.partidos) {
      let goalsHome = partido.golesLocal;
      let goalsAway = partido.golesVisitante;

      // Si los goles explícitos no están informados pero sí el signo resultado
      if ((goalsHome === null || goalsAway === null) && partido.resultadoSigno) {
        if (partido.resultadoSigno === '1') {
          goalsHome = 1;
          goalsAway = 0;
        } else if (partido.resultadoSigno === 'X') {
          goalsHome = 1;
          goalsAway = 1;
        } else if (partido.resultadoSigno === '2') {
          goalsHome = 0;
          goalsAway = 1;
        } else if (partido.resultadoSigno.includes('-')) {
          const parts = partido.resultadoSigno.split('-');
          goalsHome = parts[0] === 'M' ? 3 : Number(parts[0]) || 1;
          goalsAway = parts[1] === 'M' ? 3 : Number(parts[1]) || 0;
        }
      }

      if (goalsHome === null || goalsAway === null) continue;

      const homeStr = await this.getTeamStrength(partido.equipoLocal);
      const awayStr = await this.getTeamStrength(partido.equipoVisitante);

      const updateResult = updateStrengthsFromMatch({
        homeStrength: homeStr,
        awayStrength: awayStr,
        goalsHome,
        goalsAway
      });

      await this.saveTeamStrength(updateResult.updatedHomeStrength);
      await this.saveTeamStrength(updateResult.updatedAwayStrength);

      allLogs.push(...updateResult.adjustmentLog);
      matchesEvaluated++;
    }

    const feedbackRecord = {
      autoApplied: true,
      appliedAt: new Date().toISOString(),
      jornadaId,
      matchesEvaluated,
      adjustments: allLogs
    };

    // Registrar en Valkey que esta jornada ya retroalimentó el modelo
    try {
      await valkey.set(`bayesian:retrofeed:applied:${jornadaId}`, JSON.stringify(feedbackRecord));
      await valkey.del('cache:jornadas:list');
    } catch (e) {}

    return feedbackRecord;
  }

  /**
   * Retroalimenta automáticamente el modelo con todas las jornadas finalizadas
   * que aún no hayan sido procesadas, en estricto orden cronológico.
   */
  async autoRetrofeedAllFinishedJornadas(): Promise<{
    processedCount: number;
    jornadasProcessed: Array<{ id: string; numero: number; matchesEvaluated: number }>;
  }> {
    const finishedJornadas = await prisma.jornada.findMany({
      where: {
        OR: [
          { estado: 'FINALIZADA' },
          {
            partidos: {
              every: {
                OR: [
                  { golesLocal: { not: null }, golesVisitante: { not: null } },
                  { resultadoSigno: { not: null } }
                ]
              }
            }
          }
        ]
      },
      orderBy: { fechaCierre: 'asc' },
      include: {
        partidos: true
      }
    });

    const processedList: Array<{ id: string; numero: number; matchesEvaluated: number }> = [];

    for (const j of finishedJornadas) {
      if (!j.partidos || j.partidos.length === 0) continue;

      const cacheKey = `bayesian:retrofeed:applied:${j.id}`;
      let already = null;
      try {
        already = await valkey.get(cacheKey);
      } catch (e) {}

      if (!already) {
        console.log(`⚡ [Auto-Feedback] Retroalimentando modelo con Jornada ${j.numero} (${j.id})...`);
        const result = await this.applyBayesianFeedbackFromJornada(j.id);
        processedList.push({
          id: j.id,
          numero: j.numero,
          matchesEvaluated: result.matchesEvaluated
        });
      }
    }

    if (processedList.length > 0) {
      console.log(`✅ [Auto-Feedback] ${processedList.length} jornadas finalizadas retroalimentadas automáticamente.`);
      try {
        await valkey.del('cache:jornadas:list');
      } catch (e) {}
    }

    return {
      processedCount: processedList.length,
      jornadasProcessed: processedList
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

      // Inferencia con el Ensamble ML Multimodal (Dixon-Coles + Elo + Fatiga + Espacial + Plantillas)
      let finalProb1 = probs.prob1;
      let finalProbX = probs.probX;
      let finalProb2 = probs.prob2;
      let finalConfidence = 65.0;

      try {
        const mlEnsemble = await MLInferenceService.predictMatch({
          equipoLocal: partido.equipoLocal,
          equipoVisitante: partido.equipoVisitante,
          pctApostadoLae1: Number(partido.pctApostadoLae1 ?? 40),
          pctApostadoLaeX: Number(partido.pctApostadoLaeX ?? 30),
          pctApostadoLae2: Number(partido.pctApostadoLae2 ?? 30),
          jornadaNumero: jornada.numero
        });

        finalProb1 = mlEnsemble.prob1;
        finalProbX = mlEnsemble.probX;
        finalProb2 = mlEnsemble.prob2;
        finalConfidence = mlEnsemble.confidenceScore;
      } catch (e) {}

      const analysis = calculateExpectedValue({
        prob1: finalProb1,
        probX: finalProbX,
        prob2: finalProb2,
        pctLae1: Number(partido.pctApostadoLae1 ?? 33.3),
        pctLaeX: Number(partido.pctApostadoLaeX ?? 33.3),
        pctLae2: Number(partido.pctApostadoLae2 ?? 33.3)
      });

      // Utilizar la confianza calibrada del ensamble ML
      analysis.confidenceScore = finalConfidence;

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
    const baseGoals = estimateMatchExpectedGoals(homeStr, awayStr);

    // Ajuste sutil por consenso de mercado si existe disparidad de favoritismo
    if (lae1 > 0 && lae2 > 0) {
      const sum = lae1 + lae2;
      const marketHomeRatio = lae1 / sum;
      const marketAwayRatio = lae2 / sum;

      // Ponderación: 75% fuerzas bayesianas del club + 25% consenso de mercado
      const blendedLambda = baseGoals.lambdaHome * 0.75 + (baseGoals.lambdaHome * (marketHomeRatio / 0.50)) * 0.25;
      const blendedMu = baseGoals.muAway * 0.75 + (baseGoals.muAway * (marketAwayRatio / 0.50)) * 0.25;

      return {
        lambdaHome: Math.max(0.2, Number(blendedLambda.toFixed(2))),
        muAway: Math.max(0.2, Number(blendedMu.toFixed(2)))
      };
    }

    return baseGoals;
  }
}
