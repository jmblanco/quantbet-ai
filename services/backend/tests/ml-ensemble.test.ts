import { describe, it, expect } from 'vitest';
import { FeatureExtractor, FEATURE_NAMES } from '../src/core/ml/feature-extractor.js';
import { ModelTrainer } from '../src/core/ml/model-trainer.js';
import { MLInferenceService } from '../src/core/ml/ml-inference-service.js';

describe('Multimodal Machine Learning Ensemble Subsystem', () => {
  it('debe extraer el vector completo de 24 características cuantitativas sin NaN ni valores nulos', async () => {
    const feat = await FeatureExtractor.extractFeatures({
      equipoLocal: 'Real Madrid',
      equipoVisitante: 'Barcelona',
      pctApostadoLae1: 45.0,
      pctApostadoLaeX: 25.0,
      pctApostadoLae2: 30.0,
      jornadaNumero: 16,
      resultadoSigno: '1-2'
    });

    expect(feat.vector.length).toBe(24);
    expect(FEATURE_NAMES.length).toBe(24);

    for (let i = 0; i < feat.vector.length; i++) {
      expect(Number.isFinite(feat.vector[i])).toBe(true);
    }

    // Verificar variables clave
    expect(feat.namedFeatures.elo_home).toBeGreaterThan(1800);
    expect(feat.namedFeatures.elo_away).toBeGreaterThan(1800);
    expect(feat.namedFeatures.spatial_block_height_diff).toBeDefined();
    expect(feat.targetSigno).toBe('2');
    expect(feat.targetIndex).toBe(2);
  });

  it('debe mapear correctamente los diferentes formatos de signos y goles a sus índices multiclase', async () => {
    const f1 = await FeatureExtractor.extractFeatures({
      equipoLocal: 'Athletic Club',
      equipoVisitante: 'Getafe',
      resultadoSigno: '1'
    });
    expect(f1.targetIndex).toBe(0);

    const fX = await FeatureExtractor.extractFeatures({
      equipoLocal: 'Celta',
      equipoVisitante: 'Betis',
      resultadoSigno: 'X'
    });
    expect(fX.targetIndex).toBe(1);

    const f2 = await FeatureExtractor.extractFeatures({
      equipoLocal: 'Rayo Vallecano',
      equipoVisitante: 'Elche',
      golesLocal: 0,
      golesVisitante: 3
    });
    expect(f2.targetIndex).toBe(2);
  });

  it('debe realizar inferencia ensemble con probabilidades calibradas sumando 1.0 y top drivers explicativos', async () => {
    const prediction = await MLInferenceService.predictMatch({
      equipoLocal: 'Real Madrid',
      equipoVisitante: 'Osasuna',
      pctApostadoLae1: 72.0,
      pctApostadoLaeX: 18.0,
      pctApostadoLae2: 10.0,
      jornadaNumero: 16
    });

    const sumP = prediction.prob1 + prediction.probX + prediction.prob2;
    expect(sumP).toBeCloseTo(1.0, 2);

    expect(prediction.confidenceScore).toBeGreaterThanOrEqual(35);
    expect(prediction.confidenceScore).toBeLessThanOrEqual(96);

    expect(prediction.topDrivers.length).toBeGreaterThan(0);
    expect(prediction.mlOnly).toBeDefined();
    expect(prediction.dixonColes).toBeDefined();
  }, 15000);

  it('debe calcular importancias de características sumando exactamente 100%', async () => {
    const model = await ModelTrainer.getOrLoadModel();

    expect(model.metrics.featureImportances.length).toBe(24);
    const sumImp = model.metrics.featureImportances.reduce((acc, f) => acc + f.importancePct, 0);
    expect(sumImp).toBeCloseTo(100.0, 0);

    // Debe contener features tanto espaciales como Elo y Dixon-Coles
    const featureNames = model.metrics.featureImportances.map(f => f.feature);
    expect(featureNames).toContain('elo_diff_adjusted');
    expect(featureNames).toContain('spatial_flank_mismatch');
    expect(featureNames).toContain('dc_lambda_home');
  }, 15000);
});
