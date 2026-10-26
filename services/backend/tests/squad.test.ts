import { describe, it, expect } from 'vitest';
import { SquadService } from '../src/core/sports/squad-service.js';

describe('SquadService & Tactical Intelligence', () => {
  it('debe devolver la alineación y plantilla canónica para el Real Madrid 2026-2027 bajo José Mourinho', () => {
    const squad = SquadService.getTeamSquad('Real Madrid');
    expect(squad.equipo).toBe('Real Madrid');
    expect(squad.sistema).toBe('4-3-3');
    expect(squad.entrenador).toBe('José Mourinho');
    expect(squad.titulares).toHaveLength(11);
    expect(squad.titulares.some(p => p.nombre === 'Vinícius Jr.')).toBe(true);
    expect(squad.titulares.some(p => p.nombre === 'Trent Alexander-Arnold' && p.dorsal === 12)).toBe(true);
    expect(squad.titulares.some(p => p.posicion === 'POR')).toBe(true);
    // Lucas Vázquez ya no pertenece a la plantilla del Real Madrid
    expect(squad.titulares.some(p => p.nombre === 'Lucas Vázquez')).toBe(false);
    expect(squad.suplentesDestacados.includes('Lucas Vázquez')).toBe(false);
  });

  it('debe reflejar a Dani Carvajal como titular activo en el Getafe CF (no lesionado)', () => {
    const squad = SquadService.getTeamSquad('Getafe');
    expect(squad.equipo).toBe('Getafe');
    expect(squad.entrenador).toBe('José Bordalás');
    expect(squad.titulares.some(p => p.nombre === 'Dani Carvajal' && p.dorsal === 14)).toBe(true);
    // Dani Carvajal está activo en el Getafe, no lesionado
    expect(squad.bajas.some(b => b.jugador === 'Dani Carvajal')).toBe(false);
  });

  it('debe devolver la alineación canónica de FC Barcelona con Iñaki Peña y Lamine Yamal', () => {
    const squad = SquadService.getTeamSquad('FC Barcelona');
    expect(squad.sistema).toBe('4-2-3-1');
    expect(squad.entrenador).toBe('Hansi Flick');
    expect(squad.titulares.some(p => p.nombre === 'Lamine Yamal')).toBe(true);
    expect(squad.titulares.some(p => p.nombre === 'Iñaki Peña' && p.dorsal === 13)).toBe(true);
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

  it('debe auditar rigurosamente que todos los 42 equipos canónicos tienen exactamente 11 titulares, 1 portero y sin jugadores ni dorsales duplicados', () => {
    const teamsToTest = [
      // Primera División (20)
      'Real Madrid', 'Barcelona', 'At. Madrid', 'Athletic Club', 'Real Sociedad',
      'Betis', 'Villarreal', 'Sevilla', 'Osasuna', 'Celta', 'Valencia', 'Getafe',
      'Rayo Vallecano', 'Mallorca', 'Alavés', 'Leganés', 'Girona', 'Espanyol',
      'Las Palmas', 'Valladolid',
      // Segunda División (22)
      'Levante', 'Real Zaragoza', 'Sporting de Gijón', 'Racing Santander', 'Real Oviedo',
      'Granada', 'Elche', 'Eibar', 'Almería', 'Deportivo', 'Cádiz', 'Tenerife',
      'Castellón', 'Burgos', 'Albacete', 'Huesca', 'Cartagena', 'Córdoba',
      'Málaga', 'Eldense', 'Mirandés', 'Racing Ferrol'
    ];

    expect(teamsToTest).toHaveLength(42);

    for (const team of teamsToTest) {
      const squad = SquadService.getTeamSquad(team);
      expect(squad.titulares, `Equipo ${team} no tiene 11 titulares`).toHaveLength(11);
      
      const por = squad.titulares.filter(p => p.posicion === 'POR');
      expect(por, `Equipo ${team} no tiene exactamente 1 portero`).toHaveLength(1);

      const nombres = squad.titulares.map(p => p.nombre);
      const nombresUnicos = new Set(nombres);
      expect(nombresUnicos.size, `Equipo ${team} tiene nombres de jugadores duplicados`).toBe(11);

      const dorsales = squad.titulares.map(p => p.dorsal);
      const dorsalesUnicos = new Set(dorsales);
      expect(dorsalesUnicos.size, `Equipo ${team} tiene dorsales duplicados`).toBe(11);
    }
  });
});
