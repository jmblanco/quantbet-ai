import { describe, it, expect } from 'vitest';
import { MetricsService } from '../src/core/services/metrics-service.js';

describe('Metrics & Statistics Service', () => {
  it('debe devolver métricas estructuradas de rendimiento y distribución', async () => {
    const service = new MetricsService();
    const metrics = await service.getMetrics();

    expect(metrics).toBeDefined();
    // La precisión debe superar holgadamente el azar puro (33.3%)
    expect(metrics.performance.overallAccuracyPct).toBeGreaterThan(33.3);
    expect(metrics.performance.brierScore).toBeLessThan(1.0);

    // Verificación de la distribución 1X2
    expect(metrics.distribution.homeWinsPct + metrics.distribution.drawsPct + metrics.distribution.awayWinsPct).toBeCloseTo(100, 0);

    // Verificación de estadísticas del Pleno al 15
    expect(metrics.pleno15TopScores.length).toBeGreaterThan(0);
    expect(metrics.recentJornadas.length).toBeGreaterThan(0);
  }, 15000);
});
