/**
 * Servicio de Mapas de Calor Espaciales, Ocupación Táctica y Refresco Semanal.
 * Modela la densidad de acciones en el terreno de juego (3x3 zonas y puntos de calor gaussianos),
 * el estilo de bloque (alto/medio/bajo), el flanco preferente de ataque y actualiza semanalmente
 * las métricas tácticas con el avance de las jornadas.
 */

import { valkey } from '../../infrastructure/cache.js';

export interface PuntoCalor {
  x: number;          // 0 a 100 (0 = portería propia, 100 = portería contraria)
  y: number;          // 0 a 100 (0 = banda izquierda, 50 = pasillo central, 100 = banda derecha)
  intensidad: number; // 0.1 a 1.0
  radio: number;      // Radio de difusión gaussiana en %
  label: string;
}

export interface ZonasOcupacion {
  defensivaIzquierda: number;
  defensivaCentro: number;
  defensivaDerecha: number;
  medularIzquierda: number;
  medularCentro: number;
  medularDerecha: number;
  ataqueIzquierda: number;
  ataqueCentro: number;
  ataqueDerecha: number;
}

export interface PerfilTacticoEspacial {
  equipo: string;
  ultimaJornadaActualizada: number;
  flancoPreferente: 'BANDA_IZQUIERDA' | 'CENTRO' | 'BANDA_DERECHA' | 'EQUILIBRADO';
  pctFlancoPreferente: number;
  alturaMediaLineaMetros: number; // e.g. 52.4m
  tipoBloque: 'BLOQUE_ALTO' | 'BLOQUE_MEDIO' | 'BLOQUE_BAJO';
  presionUltimoTercioPct: number;
  posesionMediaPct: number;
  zonas: ZonasOcupacion;
  puntosCalientes: PuntoCalor[];
  resumenEspacial: string;
}

export interface MatchTacticalHeatmapComparison {
  local: PerfilTacticoEspacial;
  visitante: PerfilTacticoEspacial;
  choqueEstilos: string;
  desequilibrioZonal: string;
  factorAjusteLocalLambda: number;
  factorAjusteVisitanteLambda: number;
}

// ============================================================================
// PERFILES ESPACIALES CANÓNICOS DE EQUIPOS (LALIGA EA SPORTS & HYPERMOTION)
// ============================================================================

const CANONICAL_TACTICAL_DATA: Record<string, Omit<PerfilTacticoEspacial, 'ultimaJornadaActualizada'>> = {
  'Real Madrid': {
    equipo: 'Real Madrid',
    flancoPreferente: 'BANDA_IZQUIERDA',
    pctFlancoPreferente: 44,
    alturaMediaLineaMetros: 53.2,
    tipoBloque: 'BLOQUE_ALTO',
    presionUltimoTercioPct: 36,
    posesionMediaPct: 61.8,
    zonas: {
      defensivaIzquierda: 8, defensivaCentro: 12, defensivaDerecha: 8,
      medularIzquierda: 16, medularCentro: 14, medularDerecha: 11,
      ataqueIzquierda: 18, ataqueCentro: 8, ataqueDerecha: 5
    },
    puntosCalientes: [
      { x: 78, y: 22, intensidad: 0.95, radio: 22, label: 'Sector Vinícius / Mbappé' },
      { x: 65, y: 48, intensidad: 0.85, radio: 20, label: 'Llegada Bellingham' },
      { x: 50, y: 75, intensidad: 0.70, radio: 18, label: 'Progresión Valverde' },
      { x: 88, y: 50, intensidad: 0.80, radio: 16, label: 'Zona Remate Área' }
    ],
    resumenEspacial: 'Dominio por carril zurdo. Asimetría ofensiva volcada en el perfil izquierdo con incorporaciones en segunda línea.'
  },
  'Barcelona': {
    equipo: 'Barcelona',
    flancoPreferente: 'BANDA_DERECHA',
    pctFlancoPreferente: 41,
    alturaMediaLineaMetros: 56.4,
    tipoBloque: 'BLOQUE_ALTO',
    presionUltimoTercioPct: 42,
    posesionMediaPct: 65.2,
    zonas: {
      defensivaIzquierda: 6, defensivaCentro: 10, defensivaDerecha: 6,
      medularIzquierda: 13, medularCentro: 18, medularDerecha: 15,
      ataqueIzquierda: 11, ataqueCentro: 8, ataqueDerecha: 13
    },
    puntosCalientes: [
      { x: 76, y: 80, intensidad: 0.98, radio: 24, label: 'Desequilibrio Lamine Yamal' },
      { x: 86, y: 50, intensidad: 0.92, radio: 18, label: 'Punto de Penalti Lewandowski' },
      { x: 68, y: 35, intensidad: 0.82, radio: 19, label: 'Raphinha interior / Dani Olmo' },
      { x: 45, y: 50, intensidad: 0.80, radio: 20, label: 'Distribución Pedri & Casadó' }
    ],
    resumenEspacial: 'Presión asfixiante en último tercio y línea defensiva hiper-avanzada (56m). Desequilibrio vertical por banda derecha.'
  },
  'At. Madrid': {
    equipo: 'At. Madrid',
    flancoPreferente: 'CENTRO',
    pctFlancoPreferente: 38,
    alturaMediaLineaMetros: 46.5,
    tipoBloque: 'BLOQUE_MEDIO',
    presionUltimoTercioPct: 26,
    posesionMediaPct: 52.0,
    zonas: {
      defensivaIzquierda: 11, defensivaCentro: 18, defensivaDerecha: 11,
      medularIzquierda: 12, medularCentro: 16, medularDerecha: 12,
      ataqueIzquierda: 7, ataqueCentro: 8, ataqueDerecha: 5
    },
    puntosCalientes: [
      { x: 62, y: 50, intensidad: 0.90, radio: 22, label: 'Pivote Creativo Griezmann' },
      { x: 74, y: 52, intensidad: 0.85, radio: 18, label: 'Ruptura Julián Álvarez' },
      { x: 38, y: 50, intensidad: 0.80, radio: 24, label: 'Cerrojo Giménez / De Paul' }
    ],
    resumenEspacial: 'Bloque medio granítico con densidad extrema en carril central. Transición letal por dentro con Griezmann y Julián.'
  },
  'Athletic Club': {
    equipo: 'Athletic Club',
    flancoPreferente: 'BANDA_IZQUIERDA',
    pctFlancoPreferente: 42,
    alturaMediaLineaMetros: 51.0,
    tipoBloque: 'BLOQUE_ALTO',
    presionUltimoTercioPct: 35,
    posesionMediaPct: 54.3,
    zonas: {
      defensivaIzquierda: 8, defensivaCentro: 12, defensivaDerecha: 8,
      medularIzquierda: 15, medularCentro: 14, medularDerecha: 14,
      ataqueIzquierda: 15, ataqueCentro: 7, ataqueDerecha: 7
    },
    puntosCalientes: [
      { x: 76, y: 20, intensidad: 0.94, radio: 22, label: 'Vértigo Nico Williams' },
      { x: 74, y: 78, intensidad: 0.85, radio: 20, label: 'Carril Iñaki Williams' },
      { x: 70, y: 50, intensidad: 0.84, radio: 18, label: 'Llegada Sancet' }
    ],
    resumenEspacial: 'Ritmo vertiginoso por las bandas con los hermanos Williams. Presión agresiva en San Mamés.'
  },
  'Real Sociedad': {
    equipo: 'Real Sociedad',
    flancoPreferente: 'BANDA_DERECHA',
    pctFlancoPreferente: 39,
    alturaMediaLineaMetros: 52.8,
    tipoBloque: 'BLOQUE_ALTO',
    presionUltimoTercioPct: 33,
    posesionMediaPct: 57.5,
    zonas: {
      defensivaIzquierda: 8, defensivaCentro: 13, defensivaDerecha: 9,
      medularIzquierda: 12, medularCentro: 17, medularDerecha: 14,
      ataqueIzquierda: 8, ataqueCentro: 7, ataqueDerecha: 12
    },
    puntosCalientes: [
      { x: 72, y: 78, intensidad: 0.92, radio: 22, label: 'Fantasía Take Kubo' },
      { x: 48, y: 50, intensidad: 0.88, radio: 22, label: 'Eje Martín Zubimendi' },
      { x: 78, y: 45, intensidad: 0.80, radio: 18, label: 'Zona Oyarzabal' }
    ],
    resumenEspacial: 'Construcción asociativa desde Zubimendi y aceleración exterior a través de Take Kubo.'
  },
  'Villarreal': {
    equipo: 'Villarreal',
    flancoPreferente: 'CENTRO',
    pctFlancoPreferente: 37,
    alturaMediaLineaMetros: 49.0,
    tipoBloque: 'BLOQUE_MEDIO',
    presionUltimoTercioPct: 30,
    posesionMediaPct: 53.0,
    zonas: {
      defensivaIzquierda: 9, defensivaCentro: 14, defensivaDerecha: 9,
      medularIzquierda: 14, medularCentro: 15, medularDerecha: 13,
      ataqueIzquierda: 9, ataqueCentro: 9, ataqueDerecha: 8
    },
    puntosCalientes: [
      { x: 65, y: 35, intensidad: 0.90, radio: 20, label: 'Visión Álex Baena' },
      { x: 78, y: 52, intensidad: 0.88, radio: 18, label: 'Instinto Ayoze Pérez' },
      { x: 50, y: 50, intensidad: 0.82, radio: 20, label: 'Dirección Dani Parejo' }
    ],
    resumenEspacial: 'Juego vertical rápido tras robo en 4-4-2. Baena genera superioridades entre líneas.'
  },
  'Betis': {
    equipo: 'Betis',
    flancoPreferente: 'BANDA_IZQUIERDA',
    pctFlancoPreferente: 38,
    alturaMediaLineaMetros: 50.5,
    tipoBloque: 'BLOQUE_MEDIO',
    presionUltimoTercioPct: 31,
    posesionMediaPct: 55.4,
    zonas: {
      defensivaIzquierda: 9, defensivaCentro: 13, defensivaDerecha: 9,
      medularIzquierda: 14, medularCentro: 16, medularDerecha: 12,
      ataqueIzquierda: 12, ataqueCentro: 8, ataqueDerecha: 7
    },
    puntosCalientes: [
      { x: 72, y: 22, intensidad: 0.88, radio: 20, label: 'Regate Ez Abde' },
      { x: 68, y: 52, intensidad: 0.90, radio: 20, label: 'Magia Lo Celso' },
      { x: 45, y: 50, intensidad: 0.78, radio: 18, label: 'Recuperación Johnny' }
    ],
    resumenEspacial: 'Creatividad en tres cuartos de campo con Lo Celso y profundidad exterior mediante Abde.'
  },
  'Sevilla': {
    equipo: 'Sevilla',
    flancoPreferente: 'BANDA_DERECHA',
    pctFlancoPreferente: 40,
    alturaMediaLineaMetros: 48.0,
    tipoBloque: 'BLOQUE_MEDIO',
    presionUltimoTercioPct: 28,
    posesionMediaPct: 53.2,
    zonas: {
      defensivaIzquierda: 10, defensivaCentro: 14, defensivaDerecha: 10,
      medularIzquierda: 11, medularCentro: 15, medularDerecha: 14,
      ataqueIzquierda: 8, ataqueCentro: 7, ataqueDerecha: 11
    },
    puntosCalientes: [
      { x: 74, y: 78, intensidad: 0.91, radio: 20, label: 'Uno contra uno Lukébakio' },
      { x: 76, y: 50, intensidad: 0.82, radio: 18, label: 'Presión Isaac Romero' },
      { x: 35, y: 50, intensidad: 0.80, radio: 22, label: 'Comando Badé' }
    ],
    resumenEspacial: 'Búsqueda constante de Lukébakio en banda derecha para romper líneas y finalizar con centros al área.'
  },
  'Osasuna': {
    equipo: 'Osasuna',
    flancoPreferente: 'BANDA_IZQUIERDA',
    pctFlancoPreferente: 43,
    alturaMediaLineaMetros: 47.5,
    tipoBloque: 'BLOQUE_MEDIO',
    presionUltimoTercioPct: 29,
    posesionMediaPct: 48.5,
    zonas: {
      defensivaIzquierda: 10, defensivaCentro: 16, defensivaDerecha: 10,
      medularIzquierda: 13, medularCentro: 14, medularDerecha: 11,
      ataqueIzquierda: 14, ataqueCentro: 7, ataqueDerecha: 5
    },
    puntosCalientes: [
      { x: 74, y: 22, intensidad: 0.93, radio: 22, label: 'Electricidad Bryan Zaragoza' },
      { x: 84, y: 50, intensidad: 0.89, radio: 18, label: 'Remate Aéreo Budimir' },
      { x: 62, y: 50, intensidad: 0.80, radio: 18, label: 'Llegada Aimar Oroz' }
    ],
    resumenEspacial: 'Foco absoluto en Bryan Zaragoza por izquierda conectando centros al punto de penalti para Ante Budimir.'
  },
  'Celta': {
    equipo: 'Celta',
    flancoPreferente: 'CENTRO',
    pctFlancoPreferente: 39,
    alturaMediaLineaMetros: 51.5,
    tipoBloque: 'BLOQUE_ALTO',
    presionUltimoTercioPct: 32,
    posesionMediaPct: 56.1,
    zonas: {
      defensivaIzquierda: 8, defensivaCentro: 13, defensivaDerecha: 8,
      medularIzquierda: 13, medularCentro: 17, medularDerecha: 13,
      ataqueIzquierda: 9, ataqueCentro: 10, ataqueDerecha: 9
    },
    puntosCalientes: [
      { x: 72, y: 50, intensidad: 0.95, radio: 22, label: 'Genio Iago Aspas' },
      { x: 65, y: 80, intensidad: 0.86, radio: 20, label: 'Proyecciones Mingueza' },
      { x: 78, y: 50, intensidad: 0.82, radio: 18, label: 'Área Borja Iglesias' }
    ],
    resumenEspacial: 'Fútbol posicional y de toque bajo Claudio Giráldez. Superioridad por carriles interiores girando en torno a Iago Aspas.'
  },
  'Valencia': {
    equipo: 'Valencia',
    flancoPreferente: 'BANDA_IZQUIERDA',
    pctFlancoPreferente: 39,
    alturaMediaLineaMetros: 44.5,
    tipoBloque: 'BLOQUE_BAJO',
    presionUltimoTercioPct: 22,
    posesionMediaPct: 45.2,
    zonas: {
      defensivaIzquierda: 13, defensivaCentro: 19, defensivaDerecha: 13,
      medularIzquierda: 12, medularCentro: 13, medularDerecha: 11,
      ataqueIzquierda: 8, ataqueCentro: 6, ataqueDerecha: 5
    },
    puntosCalientes: [
      { x: 68, y: 22, intensidad: 0.85, radio: 20, label: 'Centros Luis Rioja / Gayà' },
      { x: 78, y: 50, intensidad: 0.83, radio: 18, label: 'Pelea Hugo Duro' },
      { x: 25, y: 50, intensidad: 0.92, radio: 24, label: 'Muro Mamardashvili' }
    ],
    resumenEspacial: 'Repliegue ordenado en bloque bajo en Mestalla y salida rápida por bandas mediante Rioja y Gayà.'
  },
  'Getafe': {
    equipo: 'Getafe',
    flancoPreferente: 'CENTRO',
    pctFlancoPreferente: 36,
    alturaMediaLineaMetros: 42.0,
    tipoBloque: 'BLOQUE_BAJO',
    presionUltimoTercioPct: 20,
    posesionMediaPct: 41.5,
    zonas: {
      defensivaIzquierda: 14, defensivaCentro: 22, defensivaDerecha: 14,
      medularIzquierda: 11, medularCentro: 12, medularDerecha: 11,
      ataqueIzquierda: 5, ataqueCentro: 6, ataqueDerecha: 5
    },
    puntosCalientes: [
      { x: 42, y: 50, intensidad: 0.92, radio: 24, label: 'Presión Djené / Arambarri' },
      { x: 50, y: 50, intensidad: 0.84, radio: 20, label: 'Frenada Luis Milla' },
      { x: 74, y: 50, intensidad: 0.78, radio: 18, label: 'Disputas Uche' }
    ],
    resumenEspacial: 'Líneas muy juntas, interrupción del juego rival e incomodidad táctica constante. Bloque bajo impenetrable.'
  },
  'Rayo Vallecano': {
    equipo: 'Rayo Vallecano',
    flancoPreferente: 'BANDA_IZQUIERDA',
    pctFlancoPreferente: 40,
    alturaMediaLineaMetros: 51.5,
    tipoBloque: 'BLOQUE_ALTO',
    presionUltimoTercioPct: 36,
    posesionMediaPct: 51.0,
    zonas: {
      defensivaIzquierda: 9, defensivaCentro: 13, defensivaDerecha: 9,
      medularIzquierda: 14, medularCentro: 15, medularDerecha: 13,
      ataqueIzquierda: 12, ataqueCentro: 8, ataqueDerecha: 7
    },
    puntosCalientes: [
      { x: 72, y: 22, intensidad: 0.88, radio: 20, label: 'Incursiones Álvaro García' },
      { x: 66, y: 76, intensidad: 0.86, radio: 20, label: 'Paredes Isi Palazón' },
      { x: 72, y: 50, intensidad: 0.80, radio: 18, label: 'Presión Camello' }
    ],
    resumenEspacial: 'Alta intensidad en Vallecas. Presión tras pérdida asfixiante y repliegue rápido.'
  },
  'Mallorca': {
    equipo: 'Mallorca',
    flancoPreferente: 'CENTRO',
    pctFlancoPreferente: 37,
    alturaMediaLineaMetros: 45.0,
    tipoBloque: 'BLOQUE_MEDIO',
    presionUltimoTercioPct: 25,
    posesionMediaPct: 48.0,
    zonas: {
      defensivaIzquierda: 11, defensivaCentro: 18, defensivaDerecha: 11,
      medularIzquierda: 12, medularCentro: 14, medularDerecha: 12,
      ataqueIzquierda: 7, ataqueCentro: 8, ataqueDerecha: 7
    },
    puntosCalientes: [
      { x: 80, y: 50, intensidad: 0.91, radio: 20, label: 'Torre Vedat Muriqi' },
      { x: 62, y: 50, intensidad: 0.84, radio: 20, label: 'Batuta Darder' },
      { x: 35, y: 50, intensidad: 0.88, radio: 22, label: 'Muralla Raíllo' }
    ],
    resumenEspacial: 'Estructura sólida de Arrasate con centros templados buscando el remate demoledor de Muriqi.'
  },
  'Alavés': {
    equipo: 'Alavés',
    flancoPreferente: 'BANDA_DERECHA',
    pctFlancoPreferente: 42,
    alturaMediaLineaMetros: 47.0,
    tipoBloque: 'BLOQUE_MEDIO',
    presionUltimoTercioPct: 27,
    posesionMediaPct: 46.5,
    zonas: {
      defensivaIzquierda: 11, defensivaCentro: 16, defensivaDerecha: 10,
      medularIzquierda: 11, medularCentro: 14, medularDerecha: 14,
      ataqueIzquierda: 6, ataqueCentro: 7, ataqueDerecha: 11
    },
    puntosCalientes: [
      { x: 74, y: 80, intensidad: 0.94, radio: 22, label: 'Puñal Carlos Vicente' },
      { x: 78, y: 50, intensidad: 0.85, radio: 18, label: 'Segunda jugada Kike García' },
      { x: 42, y: 50, intensidad: 0.80, radio: 20, label: 'Pivote Ander Guevara' }
    ],
    resumenEspacial: 'Foco total en la banda derecha: Carlos Vicente es el mayor generador de centros y peligro de Mendizorroza.'
  },
  'Leganés': {
    equipo: 'Leganés',
    flancoPreferente: 'BANDA_DERECHA',
    pctFlancoPreferente: 39,
    alturaMediaLineaMetros: 43.5,
    tipoBloque: 'BLOQUE_BAJO',
    presionUltimoTercioPct: 21,
    posesionMediaPct: 44.0,
    zonas: {
      defensivaIzquierda: 13, defensivaCentro: 19, defensivaDerecha: 12,
      medularIzquierda: 11, medularCentro: 13, medularDerecha: 13,
      ataqueIzquierda: 6, ataqueCentro: 6, ataqueDerecha: 7
    },
    puntosCalientes: [
      { x: 70, y: 76, intensidad: 0.88, radio: 20, label: 'Desborde Juan Cruz' },
      { x: 76, y: 50, intensidad: 0.82, radio: 18, label: 'Referencia Haller' },
      { x: 32, y: 50, intensidad: 0.85, radio: 22, label: 'Contención Nastasić & Neyou' }
    ],
    resumenEspacial: 'Bloque bajo reactivo en Butarque. Juan Cruz asume la responsabilidad del cambio de ritmo ofensivo.'
  }
};

// ============================================================================
// GENERADOR DINÁMICO TÁCTICO PARA EQUIPOS DE SEGUNDA, COPA O EUROPA
// ============================================================================

function generateSyntheticSpatialProfile(teamName: string): Omit<PerfilTacticoEspacial, 'ultimaJornadaActualizada'> {
  return {
    equipo: teamName,
    flancoPreferente: 'CENTRO',
    pctFlancoPreferente: 36,
    alturaMediaLineaMetros: 47.0,
    tipoBloque: 'BLOQUE_MEDIO',
    presionUltimoTercioPct: 26,
    posesionMediaPct: 49.0,
    zonas: {
      defensivaIzquierda: 11, defensivaCentro: 16, defensivaDerecha: 11,
      medularIzquierda: 12, medularCentro: 15, medularDerecha: 12,
      ataqueIzquierda: 7, ataqueCentro: 9, ataqueDerecha: 7
    },
    puntosCalientes: [
      { x: 45, y: 50, intensidad: 0.80, radio: 22, label: `Pivote Medular (${teamName})` },
      { x: 72, y: 50, intensidad: 0.78, radio: 18, label: `Referencia Ofensiva (${teamName})` },
      { x: 30, y: 50, intensidad: 0.75, radio: 22, label: `Bloque Defensivo (${teamName})` }
    ],
    resumenEspacial: `Esquema equilibrado y prudente con ocupación simétrica del terreno de juego para ${teamName}.`
  };
}

// ============================================================================
// SERVICIO DE MAPAS DE CALOR Y ACTUALIZACIÓN SEMANAL
// ============================================================================

export class HeatmapService {
  private static localCache = new Map<string, PerfilTacticoEspacial>();

  /**
   * Obtiene el perfil espacial y mapa de calor de un equipo.
   */
  static async getTeamHeatmap(teamName: string, jornadaActual: number = 16): Promise<PerfilTacticoEspacial> {
    const cleanName = teamName.trim();
    const cacheKey = `tactical:heatmap:${cleanName.toLowerCase()}`;

    // 1. Intentar desde Valkey
    try {
      const cached = await valkey.get(cacheKey);
      if (cached) {
        return JSON.parse(cached) as PerfilTacticoEspacial;
      }
    } catch {
      // Ignorar fallback a memoria si Valkey no responde
    }

    // 2. Intentar desde caché en memoria local
    if (this.localCache.has(cleanName)) {
      return this.localCache.get(cleanName)!;
    }

    // 3. Obtener de los datos canónicos o sintéticos
    let baseData: Omit<PerfilTacticoEspacial, 'ultimaJornadaActualizada'> | undefined;
    for (const [key, val] of Object.entries(CANONICAL_TACTICAL_DATA)) {
      if (cleanName.toLowerCase().includes(key.toLowerCase()) || key.toLowerCase().includes(cleanName.toLowerCase())) {
        baseData = val;
        break;
      }
    }

    if (!baseData) {
      baseData = generateSyntheticSpatialProfile(cleanName);
    }

    const fullProfile: PerfilTacticoEspacial = {
      ...baseData,
      equipo: cleanName,
      ultimaJornadaActualizada: jornadaActual
    };

    // Guardar en cachés
    this.localCache.set(cleanName, fullProfile);
    try {
      await valkey.set(cacheKey, JSON.stringify(fullProfile), 'EX', 60 * 60 * 24 * 7); // 7 días TTL
    } catch {
      // noop
    }

    return fullProfile;
  }

  /**
   * Compara los perfiles espaciales de ambos contendientes para un partido,
   * calculando el choque de estilos y los factores de ajuste táctico a lambda y mu.
   */
  static async getMatchTacticalComparison(
    homeTeam: string,
    awayTeam: string,
    jornadaActual: number = 16
  ): Promise<MatchTacticalHeatmapComparison> {
    const local = await this.getTeamHeatmap(homeTeam, jornadaActual);
    const visitante = await this.getTeamHeatmap(awayTeam, jornadaActual);

    // Detección de choque de estilos
    let choqueEstilos = '';
    if (local.tipoBloque === 'BLOQUE_ALTO' && visitante.tipoBloque === 'BLOQUE_BAJO') {
      choqueEstilos = `Asedio posicional: ${local.equipo} instalará su bloque a ${local.alturaMediaLineaMetros}m frente a la muralla en repliegue de ${visitante.equipo} (${visitante.alturaMediaLineaMetros}m).`;
    } else if (local.tipoBloque === 'BLOQUE_BAJO' && visitante.tipoBloque === 'BLOQUE_ALTO') {
      choqueEstilos = `Transición vertical: ${local.equipo} cederá el balón buscando castigar la espalda de la zaga adelantada de ${visitante.equipo}.`;
    } else if (local.tipoBloque === 'BLOQUE_ALTO' && visitante.tipoBloque === 'BLOQUE_ALTO') {
      choqueEstilos = `Duelo de presión alta: choque de máxima intensidad en tres cuartos de campo. Partido de ritmo y xG elevado.`;
    } else {
      choqueEstilos = `Disputa táctica de bloque medio: posesión disputada y batallas clave en carril interior.`;
    }

    // Análisis de vulnerabilidad zonal
    // Si el local ataca por la izquierda (ej. Vinicius 44%) y el visitante defiende débil en su flanco derecho
    let desequilibrioZonal = '';
    let factorAjusteLocalLambda = 1.0;
    let factorAjusteVisitanteLambda = 1.0;

    if (local.flancoPreferente === 'BANDA_IZQUIERDA') {
      const expuestos = visitante.zonas.defensivaDerecha;
      if (expuestos >= 10) {
        desequilibrioZonal = `${local.equipo} concentra el ${local.pctFlancoPreferente}% de sus llegadas por el sector izquierdo, coincidiendo con la zona de mayor densidad y concesión de faltas de ${visitante.equipo}.`;
        factorAjusteLocalLambda += 0.04;
      }
    } else if (local.flancoPreferente === 'BANDA_DERECHA') {
      const expuestos = visitante.zonas.defensivaIzquierda;
      if (expuestos >= 10) {
        desequilibrioZonal = `Aceleración de ${local.equipo} por banda derecha (${local.pctFlancoPreferente}%) comprometerá la contención lateral de ${visitante.equipo}.`;
        factorAjusteLocalLambda += 0.04;
      }
    }

    if (visitante.flancoPreferente === 'BANDA_IZQUIERDA' && local.zonas.defensivaDerecha >= 10) {
      factorAjusteVisitanteLambda += 0.03;
    }

    if (!desequilibrioZonal) {
      desequilibrioZonal = `Zonas de influencia repartidas de forma regular; la eficacia de remate en área pequeña determinará el resultado.`;
    }

    return {
      local,
      visitante,
      choqueEstilos,
      desequilibrioZonal,
      factorAjusteLocalLambda: Number(factorAjusteLocalLambda.toFixed(3)),
      factorAjusteVisitanteLambda: Number(factorAjusteVisitanteLambda.toFixed(3))
    };
  }

  /**
   * Refresca las métricas espaciales y mapas de calor semana a semana tras una jornada finalizada.
   * Aplica una media móvil exponencial (EMA) sobre la altura de bloque, posesión y zonas activas.
   */
  static async refreshWeeklyTacticalData(
    jornadaNumero: number,
    partidosDisputados: Array<{ local: string; visitante: string; golesL: number; golesV: number }>
  ): Promise<{ updatedTeams: string[]; jornada: number }> {
    const updatedTeams: string[] = [];
    const ALPHA = 0.15; // Tasa de aprendizaje semanal (15% impacto de la jornada más reciente)

    for (const p of partidosDisputados) {
      for (const team of [p.local, p.visitante]) {
        const profile = await this.getTeamHeatmap(team, jornadaNumero - 1);
        const isHome = team === p.local;
        const goalsFor = isHome ? p.golesL : p.golesV;
        const goalsAgainst = isHome ? p.golesV : p.golesL;

        // Si el equipo tuvo un partido dominante con victoria holgada, su línea sube ligeramente
        let nuevaAltura = profile.alturaMediaLineaMetros;
        if (goalsFor > goalsAgainst) {
          nuevaAltura = (1 - ALPHA) * profile.alturaMediaLineaMetros + ALPHA * (profile.alturaMediaLineaMetros + 1.2);
        } else if (goalsFor < goalsAgainst) {
          nuevaAltura = (1 - ALPHA) * profile.alturaMediaLineaMetros + ALPHA * (profile.alturaMediaLineaMetros - 0.8);
        }

        // Posesión estimada
        const nuevaPosesion = (1 - ALPHA) * profile.posesionMediaPct + ALPHA * (isHome ? 53.0 : 47.0);

        const updatedProfile: PerfilTacticoEspacial = {
          ...profile,
          ultimaJornadaActualizada: jornadaNumero,
          alturaMediaLineaMetros: Number(nuevaAltura.toFixed(1)),
          posesionMediaPct: Number(nuevaPosesion.toFixed(1))
        };

        // Guardar
        this.localCache.set(team, updatedProfile);
        try {
          const cacheKey = `tactical:heatmap:${team.toLowerCase()}`;
          await valkey.set(cacheKey, JSON.stringify(updatedProfile), 'EX', 60 * 60 * 24 * 7);
        } catch {
          // noop
        }

        updatedTeams.push(team);
      }
    }

    return {
      updatedTeams,
      jornada: jornadaNumero
    };
  }
}
