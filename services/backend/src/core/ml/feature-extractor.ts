/**
 * Feature Extractor Multimodal para el Motor de Machine Learning de La Quiniela.
 * 
 * Agrupa y normaliza en un vector continuo de 24 dimensiones todas las fuentes
 * de información cuantitativa y espacial de la plataforma:
 * - Dixon-Coles & Poisson
 * - Elo Multi-League
 * - Fatiga de Calendario Europeo
 * - Bajas & Plantillas
 * - Mapas de Calor Espaciales & Táctica 3x3
 * - Sesgo de Masa y Cuotas Implícitas SELAE
 */

import { getDefaultTeamStrength, getTeamElo } from '../math/bayesian-feedback.js';
import { evaluateTeamFatigue } from '../math/fatigue.js';
import { SquadService } from '../sports/squad-service.js';
import { HeatmapService } from '../sports/heatmap-service.js';

export const FEATURE_NAMES = [
  // Dixon-Coles (5)
  'dc_lambda_home',
  'dc_mu_away',
  'dc_prob1',
  'dc_probX',
  'dc_prob2',

  // Elo (3)
  'elo_home',
  'elo_away',
  'elo_diff_adjusted',

  // Fatiga y Calendario (3)
  'fatigue_days_home',
  'fatigue_days_away',
  'fatigue_impact_diff',

  // Plantillas & Bajas (4)
  'squad_factor_off_home',
  'squad_factor_def_home',
  'squad_factor_off_away',
  'squad_factor_def_away',

  // Mapas de Calor Espaciales 3x3 (5)
  'spatial_block_height_diff',
  'spatial_possession_diff',
  'spatial_flank_mismatch',
  'spatial_pressing_diff',
  'spatial_style_clash_index',

  // Sesgo de Masa SELAE (4)
  'lae_pct_1',
  'lae_pct_X',
  'lae_pct_2',
  'mass_consensus_entropy'
] as const;

export type FeatureName = typeof FEATURE_NAMES[number];

export interface MatchInputContext {
  equipoLocal: string;
  equipoVisitante: string;
  pctApostadoLae1?: number | null;
  pctApostadoLaeX?: number | null;
  pctApostadoLae2?: number | null;
  jornadaNumero?: number;
  resultadoSigno?: string | null;
  golesLocal?: number | null;
  golesVisitante?: number | null;
}

export interface ExtractedFeatureVector {
  vector: number[];
  namedFeatures: Record<FeatureName, number>;
  targetSigno?: '1' | 'X' | '2' | null;
  targetIndex?: number | null; // 0: '1', 1: 'X', 2: '2'
}

export class FeatureExtractor {
  /**
   * Extrae el vector completo de 24 características normalizadas para un partido.
   */
  static async extractFeatures(match: MatchInputContext): Promise<ExtractedFeatureVector> {
    const jNum = match.jornadaNumero || 16;

    // 1. Dixon-Coles & Poisson ratings
    const homeStr = getDefaultTeamStrength(match.equipoLocal);
    const awayStr = getDefaultTeamStrength(match.equipoVisitante);
    const lambdaHome = homeStr.attack * awayStr.defense * 1.35; // Factor campo medio
    const muAway = awayStr.attack * homeStr.defense * 0.95;
    
    // Probabilidades Poisson aproximadas
    const sumG = Math.max(0.1, lambdaHome + muAway);
    const dcProb1 = Number((lambdaHome / sumG * 0.52).toFixed(4));
    const dcProbX = Number((0.26 + 0.05 * Math.exp(-Math.abs(lambdaHome - muAway))).toFixed(4));
    const dcProb2 = Number(Math.max(0.05, 1 - dcProb1 - dcProbX).toFixed(4));

    // 2. Elo ratings
    const eloHome = getTeamElo(match.equipoLocal);
    const eloAway = getTeamElo(match.equipoVisitante);
    const eloDiffAdjusted = (eloHome + 65) - eloAway;

    // 3. Fatiga & Calendario Europeo
    const fatigueHome = evaluateTeamFatigue({ team: match.equipoLocal });
    const fatigueAway = evaluateTeamFatigue({ team: match.equipoVisitante });
    const fatigueDaysHome = fatigueHome.hasFatigue ? 3.0 : 7.0;
    const fatigueDaysAway = fatigueAway.hasFatigue ? 3.0 : 7.0;
    const fatigueImpactDiff = Number((fatigueHome.attackMultiplier - fatigueAway.attackMultiplier).toFixed(3));

    // 4. Plantillas & Bajas
    const squadHome = SquadService.getTeamSquad(match.equipoLocal);
    const squadAway = SquadService.getTeamSquad(match.equipoVisitante);
    const squadOffHome = squadHome.impacto.factorOfensivo;
    const squadDefHome = squadHome.impacto.factorDefensivo;
    const squadOffAway = squadAway.impacto.factorOfensivo;
    const squadDefAway = squadAway.impacto.factorDefensivo;

    // 5. Mapas de Calor Espaciales & Táctica 3x3
    const spatialComp = await HeatmapService.getMatchTacticalComparison(
      match.equipoLocal,
      match.equipoVisitante,
      jNum
    );
    const blockHeightDiff = spatialComp.local.alturaMediaLineaMetros - spatialComp.visitante.alturaMediaLineaMetros;
    const possessionDiff = spatialComp.local.posesionMediaPct - spatialComp.visitante.posesionMediaPct;
    const pressingDiff = spatialComp.local.presionUltimoTercioPct - spatialComp.visitante.presionUltimoTercioPct;

    // Desequilibrio de flanco (0 a 1)
    let flankMismatch = 0;
    if (spatialComp.local.flancoPreferente === 'BANDA_IZQUIERDA') {
      flankMismatch = (spatialComp.local.pctFlancoPreferente - 33) * 0.03 + (spatialComp.visitante.zonas.defensivaDerecha - 10) * 0.02;
    } else if (spatialComp.local.flancoPreferente === 'BANDA_DERECHA') {
      flankMismatch = (spatialComp.local.pctFlancoPreferente - 33) * 0.03 + (spatialComp.visitante.zonas.defensivaIzquierda - 10) * 0.02;
    }

    // Índice de choque de estilos (-1 defensivo/cerrado, 0 neutral, +1 vertiginoso)
    let styleClashIndex = 0;
    if (spatialComp.local.tipoBloque === 'BLOQUE_ALTO' && spatialComp.visitante.tipoBloque === 'BLOQUE_ALTO') {
      styleClashIndex = 1.0;
    } else if (spatialComp.local.tipoBloque === 'BLOQUE_BAJO' && spatialComp.visitante.tipoBloque === 'BLOQUE_BAJO') {
      styleClashIndex = -1.0;
    } else if (spatialComp.local.tipoBloque === 'BLOQUE_ALTO' && spatialComp.visitante.tipoBloque === 'BLOQUE_BAJO') {
      styleClashIndex = 0.5;
    }

    // 6. Sesgo de Masa SELAE
    const pLae1 = Number(match.pctApostadoLae1 ?? 40.0) / 100.0;
    const pLaeX = Number(match.pctApostadoLaeX ?? 30.0) / 100.0;
    const pLae2 = Number(match.pctApostadoLae2 ?? 30.0) / 100.0;

    // Entropía de Shannon de la masa: H = -sum(p * log(p))
    const entropy = -[pLae1, pLaeX, pLae2].reduce((acc, p) => {
      const val = Math.max(0.001, p);
      return acc + val * Math.log2(val);
    }, 0);

    const namedFeatures: Record<FeatureName, number> = {
      dc_lambda_home: Number(lambdaHome.toFixed(3)),
      dc_mu_away: Number(muAway.toFixed(3)),
      dc_prob1: dcProb1,
      dc_probX: dcProbX,
      dc_prob2: dcProb2,
      elo_home: eloHome,
      elo_away: eloAway,
      elo_diff_adjusted: eloDiffAdjusted,
      fatigue_days_home: fatigueDaysHome,
      fatigue_days_away: fatigueDaysAway,
      fatigue_impact_diff: Number(fatigueImpactDiff.toFixed(3)),
      squad_factor_off_home: squadOffHome,
      squad_factor_def_home: squadDefHome,
      squad_factor_off_away: squadOffAway,
      squad_factor_def_away: squadDefAway,
      spatial_block_height_diff: Number(blockHeightDiff.toFixed(2)),
      spatial_possession_diff: Number(possessionDiff.toFixed(2)),
      spatial_flank_mismatch: Number(flankMismatch.toFixed(3)),
      spatial_pressing_diff: Number(pressingDiff.toFixed(2)),
      spatial_style_clash_index: styleClashIndex,
      lae_pct_1: pLae1 * 100,
      lae_pct_X: pLaeX * 100,
      lae_pct_2: pLae2 * 100,
      mass_consensus_entropy: Number(entropy.toFixed(3))
    };

    const vector = FEATURE_NAMES.map(name => namedFeatures[name]);

    // Target de clasificación multiclase (1 = 0, X = 1, 2 = 2)
    let targetSigno: '1' | 'X' | '2' | null = null;
    let targetIndex: number | null = null;

    if (match.resultadoSigno) {
      const s = match.resultadoSigno.toUpperCase().trim();
      if (s.includes('-')) {
        const parts = s.split('-');
        const gL = parts[0] === 'M' ? 3 : parseInt(parts[0], 10);
        const gV = parts[1] === 'M' ? 3 : parseInt(parts[1], 10);
        if (!isNaN(gL) && !isNaN(gV)) {
          if (gL > gV) {
            targetSigno = '1';
            targetIndex = 0;
          } else if (gL === gV) {
            targetSigno = 'X';
            targetIndex = 1;
          } else {
            targetSigno = '2';
            targetIndex = 2;
          }
        }
      } else if (s === '1') {
        targetSigno = '1';
        targetIndex = 0;
      } else if (s === 'X') {
        targetSigno = 'X';
        targetIndex = 1;
      } else if (s === '2') {
        targetSigno = '2';
        targetIndex = 2;
      }
    } else if (match.golesLocal !== null && match.golesLocal !== undefined &&
               match.golesVisitante !== null && match.golesVisitante !== undefined) {
      if (match.golesLocal > match.golesVisitante) {
        targetSigno = '1';
        targetIndex = 0;
      } else if (match.golesLocal === match.golesVisitante) {
        targetSigno = 'X';
        targetIndex = 1;
      } else {
        targetSigno = '2';
        targetIndex = 2;
      }
    }

    return {
      vector,
      namedFeatures,
      targetSigno,
      targetIndex
    };
  }
}
