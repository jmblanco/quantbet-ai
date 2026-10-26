import { describe, it, expect } from 'vitest';
import { HeatmapService } from '../src/core/sports/heatmap-service.js';

describe('HeatmapService & Spatial Tactical Modeling', () => {
  it('debe devolver el perfil espacial y mapa de calor de Real Madrid', async () => {
    const profile = await HeatmapService.getTeamHeatmap('Real Madrid', 16);
    expect(profile.equipo).toBe('Real Madrid');
    expect(profile.flancoPreferente).toBe('BANDA_IZQUIERDA');
    expect(profile.tipoBloque).toBe('BLOQUE_ALTO');
    expect(profile.alturaMediaLineaMetros).toBeGreaterThan(50);
    expect(profile.puntosCalientes.length).toBeGreaterThan(0);

    // Validar coordenadas dentro del terreno (0-100)
    for (const pt of profile.puntosCalientes) {
      expect(pt.x).toBeGreaterThanOrEqual(0);
      expect(pt.x).toBeLessThanOrEqual(100);
      expect(pt.y).toBeGreaterThanOrEqual(0);
      expect(pt.y).toBeLessThanOrEqual(100);
      expect(pt.intensidad).toBeGreaterThan(0);
    }
  });

  it('debe devolver la distribución de zonas sumando 100%', async () => {
    const profile = await HeatmapService.getTeamHeatmap('Barcelona', 16);
    const z = profile.zonas;
    const totalZonas = 
      z.defensivaIzquierda + z.defensivaCentro + z.defensivaDerecha +
      z.medularIzquierda + z.medularCentro + z.medularDerecha +
      z.ataqueIzquierda + z.ataqueCentro + z.ataqueDerecha;

    expect(totalZonas).toBe(100);
    expect(profile.tipoBloque).toBe('BLOQUE_ALTO');
  });

  it('debe generar una comparación táctica entre Sevilla y Osasuna', async () => {
    const comp = await HeatmapService.getMatchTacticalComparison('Sevilla', 'Osasuna', 16);
    expect(comp.local.equipo).toBe('Sevilla');
    expect(comp.visitante.equipo).toBe('Osasuna');
    expect(comp.choqueEstilos).toBeTruthy();
    expect(comp.desequilibrioZonal).toBeTruthy();
    expect(comp.factorAjusteLocalLambda).toBeGreaterThanOrEqual(1.0);
  });

  it('debe refrescar los datos tácticos semana a semana con media móvil exponencial', async () => {
    const prevMadrid = await HeatmapService.getTeamHeatmap('Real Madrid', 15);
    const res = await HeatmapService.refreshWeeklyTacticalData(16, [
      { local: 'Real Madrid', visitante: 'Tenerife', golesL: 3, golesV: 0 }
    ]);

    expect(res.updatedTeams).toContain('Real Madrid');
    expect(res.jornada).toBe(16);

    const postMadrid = await HeatmapService.getTeamHeatmap('Real Madrid', 16);
    expect(postMadrid.ultimaJornadaActualizada).toBe(16);
    expect(postMadrid.alturaMediaLineaMetros).toBeGreaterThanOrEqual(prevMadrid.alturaMediaLineaMetros);
  });
});
