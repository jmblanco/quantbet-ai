import { describe, it, expect } from 'vitest';
import { SquadService } from '../src/core/sports/squad-service.js';

describe('SquadService & Tactical Intelligence', () => {
  it('debe devolver la alineación y plantilla canónica para el Real Madrid 2026-2027', () => {
    const squad = SquadService.getTeamSquad('Real Madrid');
    expect(squad.equipo).toBe('Real Madrid');
    expect(squad.sistema).toBe('4-3-3');
    expect(squad.entrenador).toBe('Carlo Ancelotti');
    expect(squad.titulares).toHaveLength(11);
    expect(squad.titulares.some(p => p.nombre === 'Vinícius Jr.')).toBe(true);
    expect(squad.titulares.some(p => p.nombre === 'Trent Alexander-Arnold')).toBe(true);
    expect(squad.titulares.some(p => p.posicion === 'POR')).toBe(true);
  });

  it('debe reflejar a Dani Carvajal como titular activo en el Getafe CF', () => {
    const squad = SquadService.getTeamSquad('Getafe');
    expect(squad.equipo).toBe('Getafe');
    expect(squad.entrenador).toBe('José Bordalás');
    expect(squad.titulares.some(p => p.nombre === 'Dani Carvajal' && p.dorsal === 14)).toBe(true);
    expect(squad.bajas.some(b => b.jugador === 'Dani Carvajal')).toBe(false); // No está lesionado
  });

  it('debe devolver la alineación canónica de FC Barcelona 2026-2027 con Joan Garcia y Lamine Yamal', () => {
    const squad = SquadService.getTeamSquad('FC Barcelona');
    expect(squad.sistema).toBe('4-2-3-1');
    expect(squad.entrenador).toBe('Hansi Flick');
    expect(squad.titulares.some(p => p.nombre === 'Lamine Yamal')).toBe(true);
    expect(squad.titulares.some(p => p.nombre === 'Joan Garcia')).toBe(true);
  });

  it('debe calcular correctamente el impacto ofensivo y defensivo de las bajas', () => {
    const impacto = SquadService.calculateSquadImpact([
      { jugador: 'Delantero Estrella', posicion: 'DEL', tipo: 'LESION', motivo: 'Isquios', gravedad: 'CRITICA', esClave: true },
      { jugador: 'Central Titular', posicion: 'DEF', tipo: 'SANCION', motivo: '5 amarillas', gravedad: 'MODERADA', esClave: true }
    ]);

    expect(impacto.factorOfensivo).toBeLessThan(1.0); // Pierde potencial goleador
    expect(impacto.factorDefensivo).toBeGreaterThan(1.0); // Concede más
    expect(impacto.bajasClaveCount).toBe(2);
    expect(impacto.nivelAlerta).toBe('CRITICO');
  });

  it('debe generar una plantilla sintética coherente para equipos no registrados (Copa del Rey / Regionales)', () => {
    const squad = SquadService.getTeamSquad('CD Alcoyano');
    expect(squad.equipo).toBe('CD Alcoyano');
    expect(squad.titulares).toHaveLength(11);
    expect(squad.titulares[0].posicion).toBe('POR');
    expect(squad.sistema).toBe('4-4-2');
  });

  it('debe generar un reporte comparativo táctico de partido entre Sevilla y Osasuna', () => {
    const report = SquadService.getMatchSquadReport('Sevilla', 'Osasuna');
    expect(report.local.equipo).toBe('Sevilla');
    expect(report.visitante.equipo).toBe('Osasuna');
    expect(report.resumenTactico).toContain('Duelo táctico');
    expect(['LOCAL', 'VISITANTE', 'EQUILIBRADO']).toContain(report.ventajaPlantilla);
  });
});
