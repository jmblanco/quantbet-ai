/**
 * Servicio de Inferencia y Ensamble Cuántico en Tiempo Real.
 * 
 * Combina las predicciones del modelo ML entrenado sobre las 24 features
 * con el prior bio-físico de Dixon-Coles mediante un blending bayesiano calibrado.
 */

import { ModelTrainer, TrainedModelArtifact } from './model-trainer.js';
import { FeatureExtractor, MatchInputContext, ExtractedFeatureVector } from './feature-extractor.js';

export interface MLPredictionOutput {
  prob1: number;
  probX: number;
  prob2: number;
  mlOnly: {
    prob1: number;
    probX: number;
    prob2: number;
  };
  dixonColes: {
    prob1: number;
    probX: number;
    prob2: number;
  };
  confidenceScore: number;
  topDrivers: string[];
  modelVersion: string;
}

export class MLInferenceService {
  private static cachedModel: TrainedModelArtifact | null = null;

  /**
   * Obtiene o refresca el modelo en memoria.
   */
  static async getModel(): Promise<TrainedModelArtifact> {
    if (!this.cachedModel) {
      this.cachedModel = await ModelTrainer.getOrLoadModel();
    }
    return this.cachedModel;
  }

  /**
   * Predice un partido aplicando el ensemble multimodal.
   */
  static async predictMatch(match: MatchInputContext): Promise<MLPredictionOutput> {
    const model = await this.getModel();
    const feat = await FeatureExtractor.extractFeatures(match);

    // 1. Escalar características con los parámetros Z-Score del entrenamiento
    const scaledX = feat.vector.map((val, idx) => {
      const m = model.scaler.means[idx] || 0;
      const s = model.scaler.stds[idx] || 1;
      return (val - m) / s;
    });

    // 2. Inferencia Softmax ML
    const logits = model.weights.biases.map((b, c) => {
      let dot = b;
      for (let f = 0; f < scaledX.length; f++) {
        dot += model.weights.weights[c][f] * scaledX[f];
      }
      return dot;
    });

    const maxLogit = Math.max(...logits);
    const expLogits = logits.map(l => Math.exp(l - maxLogit));
    const sumExp = expLogits.reduce((acc, val) => acc + val, 0);

    const mlProb1 = expLogits[0] / sumExp;
    const mlProbX = expLogits[1] / sumExp;
    const mlProb2 = expLogits[2] / sumExp;

    // 3. Probabilidades de Dixon-Coles como prior físico
    const dcProb1 = feat.namedFeatures.dc_prob1;
    const dcProbX = feat.namedFeatures.dc_probX;
    const dcProb2 = feat.namedFeatures.dc_prob2;

    // 4. Bayesian Blending (60% Machine Learning + 40% Dixon-Coles)
    const W_ML = 0.60;
    const W_DC = 0.40;

    let ensemble1 = W_ML * mlProb1 + W_DC * dcProb1;
    let ensembleX = W_ML * mlProbX + W_DC * dcProbX;
    let ensemble2 = W_ML * mlProb2 + W_DC * dcProb2;

    const totalEnsemble = ensemble1 + ensembleX + ensemble2;
    ensemble1 = Number((ensemble1 / totalEnsemble).toFixed(4));
    ensembleX = Number((ensembleX / totalEnsemble).toFixed(4));
    ensemble2 = Number((ensemble2 / totalEnsemble).toFixed(4));

    // 5. Score de Confianza Cuántico (0 - 100%)
    const maxProb = Math.max(ensemble1, ensembleX, ensemble2);
    const entropyConfidence = (maxProb - 0.333) / 0.667;
    const agreementFactor = Math.abs(mlProb1 - dcProb1) < 0.15 ? 1.05 : 0.95;
    const confidenceScore = Math.min(96, Math.max(35, Math.round(entropyConfidence * 100 * agreementFactor)));

    // 6. Factores explicativos dominantes (Top Drivers de la decisión)
    const topDrivers: string[] = [];

    // Factor Elo
    if (Math.abs(feat.namedFeatures.elo_diff_adjusted) > 80) {
      const fav = feat.namedFeatures.elo_diff_adjusted > 0 ? match.equipoLocal : match.equipoVisitante;
      topDrivers.push(`Superioridad Elo (+${Math.abs(Math.round(feat.namedFeatures.elo_diff_adjusted))} pts) para ${fav}`);
    }

    // Factor Espacial / Flancos
    if (Math.abs(feat.namedFeatures.spatial_flank_mismatch) > 0.15) {
      topDrivers.push(`Desequilibrio táctico: penetración por carril preferente frente a zaga lateral vulnerable`);
    }

    // Factor Fatiga
    if (Math.abs(feat.namedFeatures.fatigue_impact_diff) > 0.05) {
      const fatigued = feat.namedFeatures.fatigue_impact_diff < 0 ? match.equipoLocal : match.equipoVisitante;
      topDrivers.push(`Sobrecarga física / calendario europeo penaliza a ${fatigued}`);
    }

    // Factor Plantilla / Bajas
    if (feat.namedFeatures.squad_factor_off_away < 0.98 || feat.namedFeatures.squad_factor_def_away > 1.05) {
      topDrivers.push(`Bajas estructurales en ${match.equipoVisitante} restan solvencia defensiva`);
    }

    if (topDrivers.length === 0) {
      topDrivers.push(`Equilibrio técnico en el centro del campo; choque dirimido en áreas.`);
    }

    return {
      prob1: ensemble1,
      probX: ensembleX,
      prob2: ensemble2,
      mlOnly: {
        prob1: Number(mlProb1.toFixed(4)),
        probX: Number(mlProbX.toFixed(4)),
        prob2: Number(mlProb2.toFixed(4))
      },
      dixonColes: {
        prob1: dcProb1,
        probX: dcProbX,
        prob2: dcProb2
      },
      confidenceScore,
      topDrivers,
      modelVersion: model.version
    };
  }
}
