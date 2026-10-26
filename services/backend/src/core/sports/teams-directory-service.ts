/**
 * Servicio de Directorio y Datos Agregados de Equipos (Primera y Segunda División).
 * Proporciona el perfil completo de cada club: rendimiento competitivo (W/D/L, Elo, xG),
 * mapa de calor espacial agregado, alineación tipo y estado de la plantilla.
 */

import { SquadService, AlineacionEquipo } from './squad-service.js';
import { HeatmapService, PerfilTacticoEspacial } from './heatmap-service.js';
import { getTeamElo } from '../math/bayesian-feedback.js';

export interface RendimientoEquipo {
  partidosJugados: number;
  victorias: number;
  empates: number;
  derrotas: number;
  golesFavor: number;
  golesContra: number;
  diferenciaGoles: number;
  puntos: number;
  xGMedio: number;
  ratingElo: number;
  racha: ('V' | 'E' | 'D')[];
}

export interface FichaEquipoAgregada {
  id: string;
  nombre: string;
  nombreCorto: string;
  division: 'PRIMERA' | 'SEGUNDA';
  estadio: string;
  ciudad: string;
  entrenador: string;
  sistema: string;
  colorPrimario: string;
  rendimiento: RendimientoEquipo;
  heatmap: PerfilTacticoEspacial;
  squad: AlineacionEquipo;
}

// Catálogo de clubes de Primera División (LaLiga EA Sports 2026/2027) - 20 Clubes Oficiales
const PRIMERA_DIVISION_CLUBS = [
  { nombre: 'Real Madrid', corto: 'RMA', estadio: 'Santiago Bernabéu', ciudad: 'Madrid', color: '#1e3a8a' },
  { nombre: 'Barcelona', corto: 'FCB', estadio: 'Spotify Camp Nou', ciudad: 'Barcelona', color: '#991b1b' },
  { nombre: 'At. Madrid', corto: 'ATM', estadio: 'Riyadh Air Metropolitano', ciudad: 'Madrid', color: '#dc2626' },
  { nombre: 'Athletic Club', corto: 'ATH', estadio: 'San Mamés', ciudad: 'Bilbao', color: '#b91c1c' },
  { nombre: 'Real Sociedad', corto: 'RSO', estadio: 'Reale Arena', ciudad: 'San Sebastián', color: '#2563eb' },
  { nombre: 'Villarreal', corto: 'VIL', estadio: 'Estadio de la Cerámica', ciudad: 'Villarreal', color: '#eab308' },
  { nombre: 'Betis', corto: 'BET', estadio: 'Benito Villamarín', ciudad: 'Sevilla', color: '#16a34a' },
  { nombre: 'Sevilla', corto: 'SEV', estadio: 'Ramón Sánchez-Pizjuán', ciudad: 'Sevilla', color: '#e11d48' },
  { nombre: 'Celta', corto: 'CEL', estadio: 'Abanca-Balaídos', ciudad: 'Vigo', color: '#38bdf8' },
  { nombre: 'Osasuna', corto: 'OSA', estadio: 'El Sadar', ciudad: 'Pamplona', color: '#991b1b' },
  { nombre: 'Rayo Vallecano', corto: 'RAY', estadio: 'Vallecas', ciudad: 'Madrid', color: '#ef4444' },
  { nombre: 'Valencia', corto: 'VAL', estadio: 'Mestalla', ciudad: 'Valencia', color: '#f97316' },
  { nombre: 'Getafe', corto: 'GET', estadio: 'Coliseum', ciudad: 'Getafe', color: '#2563eb' },
  { nombre: 'Alavés', corto: 'ALA', estadio: 'Mendizorroza', ciudad: 'Vitoria-Gasteiz', color: '#3b82f6' },
  { nombre: 'Espanyol', corto: 'ESP', estadio: 'Stage Front Stadium', ciudad: 'Barcelona', color: '#3b82f6' },
  { nombre: 'Deportivo', corto: 'DEP', estadio: 'Abanca-Riazor', ciudad: 'A Coruña', color: '#2563eb' },
  { nombre: 'Racing Santander', corto: 'RAC', estadio: 'El Sardinero', ciudad: 'Santander', color: '#15803d' },
  { nombre: 'Levante', corto: 'LEV', estadio: 'Ciutat de València', ciudad: 'Valencia', color: '#1e40af' },
  { nombre: 'Elche', corto: 'ELC', estadio: 'Martínez Valero', ciudad: 'Elche', color: '#16a34a' },
  { nombre: 'Málaga', corto: 'MAL', estadio: 'La Rosaleda', ciudad: 'Málaga', color: '#0284c7' }
];

// Catálogo de clubes de Segunda División (LaLiga Hypermotion 2026/2027) - 22 Clubes Oficiales
const SEGUNDA_DIVISION_CLUBS = [
  { nombre: 'Girona', corto: 'GIR', estadio: 'Montilivi', ciudad: 'Girona', color: '#ef4444' },
  { nombre: 'Mallorca', corto: 'MLL', estadio: 'Son Moix', ciudad: 'Palma', color: '#dc2626' },
  { nombre: 'Leganés', corto: 'LEG', estadio: 'Municipal Butarque', ciudad: 'Leganés', color: '#2563eb' },
  { nombre: 'Las Palmas', corto: 'LPA', estadio: 'Gran Canaria', ciudad: 'Las Palmas', color: '#eab308' },
  { nombre: 'Valladolid', corto: 'VLL', estadio: 'José Zorrilla', ciudad: 'Valladolid', color: '#9333ea' },
  { nombre: 'Real Oviedo', corto: 'OVI', estadio: 'Carlos Tartiere', ciudad: 'Oviedo', color: '#1d4ed8' },
  { nombre: 'Real Zaragoza', corto: 'ZAR', estadio: 'La Romareda', ciudad: 'Zaragoza', color: '#3b82f6' },
  { nombre: 'Sporting de Gijón', corto: 'SPO', estadio: 'El Molinón', ciudad: 'Gijón', color: '#dc2626' },
  { nombre: 'Granada', corto: 'GRA', estadio: 'Nuevo Los Cármenes', ciudad: 'Granada', color: '#ef4444' },
  { nombre: 'Eibar', corto: 'EIB', estadio: 'Ipurúa', ciudad: 'Eibar', color: '#991b1b' },
  { nombre: 'Almería', corto: 'ALM', estadio: 'Power Horse Stadium', ciudad: 'Almería', color: '#dc2626' },
  { nombre: 'Cádiz', corto: 'CAD', estadio: 'Nuevo Mirandilla', ciudad: 'Cádiz', color: '#eab308' },
  { nombre: 'Tenerife', corto: 'TEN', estadio: 'Heliodoro Rodríguez López', ciudad: 'Santa Cruz', color: '#3b82f6' },
  { nombre: 'Castellón', corto: 'CAS', estadio: 'SkyFi Castalia', ciudad: 'Castellón', color: '#000000' },
  { nombre: 'Burgos', corto: 'BUR', estadio: 'El Plantío', ciudad: 'Burgos', color: '#000000' },
  { nombre: 'Albacete', corto: 'ALB', estadio: 'Carlos Belmonte', ciudad: 'Albacete', color: '#ffffff' },
  { nombre: 'Huesca', corto: 'HUE', estadio: 'El Alcoraz', ciudad: 'Huesca', color: '#1e3a8a' },
  { nombre: 'Cartagena', corto: 'CAR', estadio: 'Cartagonova', ciudad: 'Cartagena', color: '#000000' },
  { nombre: 'Córdoba', corto: 'COR', estadio: 'Nuevo Arcángel', ciudad: 'Córdoba', color: '#16a34a' },
  { nombre: 'Eldense', corto: 'ELD', estadio: 'Pepico Amat', ciudad: 'Elda', color: '#991b1b' },
  { nombre: 'Mirandés', corto: 'MIR', estadio: 'Anduva', ciudad: 'Miranda de Ebro', color: '#dc2626' },
  { nombre: 'Racing Ferrol', corto: 'RFE', estadio: 'A Malata', ciudad: 'Ferrol', color: '#15803d' }
];

export class TeamsDirectoryService {
  /**
   * Obtiene la lista completa de equipos agregados de Primera y Segunda División.
   */
  static async getAllTeams(options?: { division?: 'PRIMERA' | 'SEGUNDA'; query?: string }): Promise<FichaEquipoAgregada[]> {
    const list: FichaEquipoAgregada[] = [];

    const includePrimera = !options?.division || options.division === 'PRIMERA';
    const includeSegunda = !options?.division || options.division === 'SEGUNDA';

    const sourceClubs: Array<{ nombre: string; corto: string; estadio: string; ciudad: string; color: string; division: 'PRIMERA' | 'SEGUNDA' }> = [];

    if (includePrimera) {
      sourceClubs.push(...PRIMERA_DIVISION_CLUBS.map(c => ({ ...c, division: 'PRIMERA' as const })));
    }
    if (includeSegunda) {
      sourceClubs.push(...SEGUNDA_DIVISION_CLUBS.map(c => ({ ...c, division: 'SEGUNDA' as const })));
    }

    for (const club of sourceClubs) {
      if (options?.query) {
        const q = options.query.toLowerCase();
        const matches = club.nombre.toLowerCase().includes(q) || club.corto.toLowerCase().includes(q) || club.ciudad.toLowerCase().includes(q);
        if (!matches) continue;
      }

      const ficha = await this.getTeamProfile(club.nombre, club);
      list.push(ficha);
    }

    // Ordenar por Elo Rating descendente
    return list.sort((a, b) => b.rendimiento.ratingElo - a.rendimiento.ratingElo);
  }

  /**
   * Genera la ficha detallada de un equipo agregando táctica, plantilla y rendimiento.
   */
  static async getTeamProfile(
    teamName: string, 
    meta?: { corto: string; estadio: string; ciudad: string; color: string; division: 'PRIMERA' | 'SEGUNDA' }
  ): Promise<FichaEquipoAgregada> {
    const squad = SquadService.getTeamSquad(teamName);
    const heatmap = await HeatmapService.getTeamHeatmap(teamName, 16);
    const elo = getTeamElo(teamName);

    // Calcular estadísticas de rendimiento basadas en Elo y división
    const isPrimera = meta ? meta.division === 'PRIMERA' : elo >= 1650;
    const pj = 16; // Jornada 16 disputada

    // Ponderación de victorias/empates/derrotas según el rating Elo
    let wins = Math.min(pj, Math.max(2, Math.round((elo - 1450) / 45)));
    let draws = Math.min(pj - wins, Math.max(3, Math.round(5 + (1800 - elo) / 80)));
    let losses = Math.max(0, pj - wins - draws);

    if (wins + draws + losses !== pj) {
      draws = pj - wins - losses;
    }

    const gf = Math.round(wins * 2.1 + draws * 1.0 + losses * 0.6);
    const gc = Math.round(losses * 1.9 + draws * 1.0 + wins * 0.7);
    const pts = wins * 3 + draws;
    const xG = Number((gf / pj + (elo - 1600) / 800).toFixed(2));

    // Racha reciente
    const racha: ('V' | 'E' | 'D')[] = [];
    if (wins > losses) {
      racha.push('V', 'V', 'E', 'D', 'V');
    } else if (losses > wins) {
      racha.push('D', 'E', 'D', 'V', 'D');
    } else {
      racha.push('E', 'V', 'D', 'E', 'E');
    }

    const defaultMeta = meta || {
      corto: teamName.substring(0, 3).toUpperCase(),
      estadio: `Estadio de ${teamName}`,
      ciudad: teamName,
      color: '#0f766e',
      division: isPrimera ? ('PRIMERA' as const) : ('SEGUNDA' as const)
    };

    const idSlug = teamName.toLowerCase().replace(/[^a-z0-9]/g, '-');

    return {
      id: idSlug,
      nombre: teamName,
      nombreCorto: defaultMeta.corto,
      division: defaultMeta.division,
      estadio: defaultMeta.estadio,
      ciudad: defaultMeta.ciudad,
      entrenador: squad.entrenador,
      sistema: squad.sistema,
      colorPrimario: defaultMeta.color,
      rendimiento: {
        partidosJugados: pj,
        victorias: wins,
        empates: draws,
        derrotas: losses,
        golesFavor: gf,
        golesContra: gc,
        diferenciaGoles: gf - gc,
        puntos: pts,
        xGMedio: Math.max(0.6, xG),
        ratingElo: elo,
        racha
      },
      heatmap,
      squad
    };
  }
}
