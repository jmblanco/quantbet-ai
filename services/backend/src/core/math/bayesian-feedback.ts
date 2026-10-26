/**
 * Módulo de Retroalimentación Bayesiana y Actualización Online de Parámetros (Punto 1).
 * Implementa la recalibración continua de coeficientes de ataque (alpha) y defensa (beta)
 * estilo Dixon-Coles con Unified Elo Bridge y amortiguación bayesiana para evitar sobreajuste.
 */

export interface TeamStrength {
  team: string;
  attack: number;     // 1.0 = media liga. > 1.0 = más goleador
  defense: number;    // 1.0 = media liga. < 1.0 = más sólido (encaja menos); > 1.0 = encaja más
  formTrend: number;  // -1.0 a +1.0 (momentum reciente)
  matchesCount: number;
  lastUpdated: string;
}

export interface MatchUpdateInput {
  homeStrength: TeamStrength;
  awayStrength: TeamStrength;
  goalsHome: number;
  goalsAway: number;
  learningRate?: number;       // eta, por defecto 0.06
  regressionFactor?: number;   // shrinkage bayesiano hacia la media (1.0), por defecto 0.005
  homeAdvantage?: number;      // gamma, por defecto 1.18 en LaLiga
}

export interface MatchUpdateResult {
  updatedHomeStrength: TeamStrength;
  updatedAwayStrength: TeamStrength;
  expectedGoalsBefore: { lambdaHome: number; muAway: number };
  actualGoals: { goalsHome: number; goalsAway: number };
  residualErrors: { errorHome: number; errorAway: number };
  adjustmentLog: string[];
}

const LEAGUE_BASE_HOME_GOALS = 1.32;
const LEAGUE_BASE_AWAY_GOALS = 1.12;

// Priors iniciales por categorías históricas (LaLiga, Hypermotion, Europa y Selecciones)
const HISTORICAL_PRIORS: Record<string, { attack: number; defense: number }> = {
  // --- LaLiga EA Sports (Top Tier) ---
  'Real Madrid CF': { attack: 1.75, defense: 0.78 },
  'Real Madrid': { attack: 1.75, defense: 0.78 },
  'FC Barcelona': { attack: 1.72, defense: 0.80 },
  'Barcelona': { attack: 1.72, defense: 0.80 },
  'Club Atlético de Madrid': { attack: 1.35, defense: 0.72 },
  'Atlético de Madrid': { attack: 1.35, defense: 0.72 },
  'At. Madrid': { attack: 1.35, defense: 0.72 },
  'Athletic Club': { attack: 1.25, defense: 0.88 },
  'Real Sociedad de Fútbol': { attack: 1.20, defense: 0.86 },
  'Real Sociedad': { attack: 1.20, defense: 0.86 },
  'Real Betis Balompié': { attack: 1.18, defense: 0.96 },
  'Real Betis': { attack: 1.18, defense: 0.96 },
  'Betis': { attack: 1.18, defense: 0.96 },
  'Villarreal CF': { attack: 1.28, defense: 1.02 },
  'Villarreal': { attack: 1.28, defense: 1.02 },
  'Girona FC': { attack: 1.24, defense: 1.05 },
  'Girona': { attack: 1.24, defense: 1.05 },
  'Sevilla FC': { attack: 1.12, defense: 1.04 },
  'Sevilla': { attack: 1.12, defense: 1.04 },
  'RC Celta de Vigo': { attack: 1.10, defense: 1.12 },
  'Celta': { attack: 1.10, defense: 1.12 },
  'Rayo Vallecano de Madrid': { attack: 0.98, defense: 1.05 },
  'Rayo Vallecano': { attack: 0.98, defense: 1.05 },
  'CA Osasuna': { attack: 0.96, defense: 1.02 },
  'Osasuna': { attack: 0.96, defense: 1.02 },
  'RCD Mallorca': { attack: 0.90, defense: 0.94 },
  'Mallorca': { attack: 0.90, defense: 0.94 },
  'Getafe CF': { attack: 0.88, defense: 0.95 },
  'Getafe': { attack: 0.88, defense: 0.95 },
  'Deportivo Alavés': { attack: 0.92, defense: 1.08 },
  'Alavés': { attack: 0.92, defense: 1.08 },
  'UD Las Palmas': { attack: 0.94, defense: 1.15 },
  'Las Palmas': { attack: 0.94, defense: 1.15 },
  'RCD Espanyol de Barcelona': { attack: 0.95, defense: 1.18 },
  'Espanyol': { attack: 0.95, defense: 1.18 },
  'CD Leganés': { attack: 0.85, defense: 1.06 },
  'Leganés': { attack: 0.85, defense: 1.06 },
  'Real Valladolid CF': { attack: 0.82, defense: 1.22 },
  'Valladolid': { attack: 0.82, defense: 1.22 },
  'Valencia CF': { attack: 1.02, defense: 1.10 },
  'Valencia': { attack: 1.02, defense: 1.10 },

  // --- Grandes Clubes Europeos (UEFA Champions League / Europa) ---
  'Manchester City': { attack: 1.82, defense: 0.74 },
  'Liverpool': { attack: 1.78, defense: 0.76 },
  'Arsenal': { attack: 1.72, defense: 0.72 },
  'Bayern Múnich': { attack: 1.80, defense: 0.78 },
  'PSG': { attack: 1.74, defense: 0.82 },
  'Psg': { attack: 1.74, defense: 0.82 },
  'Inter De Milán': { attack: 1.62, defense: 0.76 },
  'Nápoles': { attack: 1.50, defense: 0.84 },
  'Borussia Dortmund': { attack: 1.52, defense: 0.92 },
  'Leipzig': { attack: 1.44, defense: 0.90 },
  'Oporto': { attack: 1.38, defense: 0.88 },
  'Psv': { attack: 1.36, defense: 0.94 },
  'Feyenoord': { attack: 1.32, defense: 0.96 },
  'Brujas': { attack: 1.22, defense: 0.98 },
  'Celtic': { attack: 1.26, defense: 1.04 },
  'Como': { attack: 1.12, defense: 1.08 },
  'Manchester United': { attack: 1.34, defense: 1.12 },
  'Lens': { attack: 1.14, defense: 1.02 },
  'Shakhtar': { attack: 1.18, defense: 1.10 },
  'Bodo Glimt': { attack: 1.15, defense: 1.14 },
  'Lillestrom': { attack: 0.92, defense: 1.18 },
  'Lugano': { attack: 0.98, defense: 1.15 },
  'Aek Atenas': { attack: 1.05, defense: 1.12 },
  'Stuttgart': { attack: 1.35, defense: 1.05 },

  // --- Selecciones Nacionales (Ventana FIFA / Nations League) ---
  'España': { attack: 1.82, defense: 0.70 },
  'Inglaterra': { attack: 1.74, defense: 0.72 },
  'Alemania': { attack: 1.70, defense: 0.78 },
  'Portugal': { attack: 1.68, defense: 0.76 },
  'Croacia': { attack: 1.42, defense: 0.86 },
  'Países Bajos': { attack: 1.60, defense: 0.84 },
  'Dinamarca': { attack: 1.32, defense: 0.88 },
  'Suiza': { attack: 1.28, defense: 0.88 },
  'Austria': { attack: 1.30, defense: 0.92 },
  'Noruega': { attack: 1.34, defense: 1.02 },
  'Escocia': { attack: 1.15, defense: 1.04 },
  'República Checa': { attack: 1.22, defense: 1.00 },
  'Eslovaquia': { attack: 1.12, defense: 1.06 },
  'Eslovenia': { attack: 1.08, defense: 0.98 },
  'Gales': { attack: 1.10, defense: 1.08 },
  'Islandia': { attack: 1.02, defense: 1.12 },
  'Grecia': { attack: 1.08, defense: 1.04 },
  'República De Irlanda': { attack: 0.98, defense: 1.08 },
  'Bulgaria': { attack: 0.88, defense: 1.18 },
  'Kazajistán': { attack: 0.82, defense: 1.24 },
  'Estonia': { attack: 0.78, defense: 1.28 },
  'Luxemburgo': { attack: 0.76, defense: 1.30 },
  'Macedonia Del Norte': { attack: 0.94, defense: 1.18 },
  'San Marino': { attack: 0.45, defense: 2.10 },
  'Liechtenstein': { attack: 0.50, defense: 1.95 },
  'Gibraltar': { attack: 0.52, defense: 1.90 },
  'Malta': { attack: 0.60, defense: 1.65 },
  'Albania': { attack: 1.05, defense: 1.02 },
  'Azerbaiyán': { attack: 0.80, defense: 1.32 },
  'Serbia': { attack: 1.24, defense: 1.06 },

  // --- LaLiga Hypermotion & Equipos Tradicionales ---
  'Elche': { attack: 1.08, defense: 0.95 },
  'Elche CF': { attack: 1.08, defense: 0.95 },
  'Almería': { attack: 1.15, defense: 1.10 },
  'UD Almería': { attack: 1.15, defense: 1.10 },
  'Burgos': { attack: 0.95, defense: 0.92 },
  'Burgos CF': { attack: 0.95, defense: 0.92 },
  'Cádiz': { attack: 1.02, defense: 1.00 },
  'Cádiz CF': { attack: 1.02, defense: 1.00 },
  'Castellón': { attack: 1.12, defense: 1.05 },
  'CD Castellón': { attack: 1.12, defense: 1.05 },
  'Córdoba': { attack: 1.00, defense: 1.08 },
  'Deportivo': { attack: 1.10, defense: 1.02 },
  'RC Deportivo': { attack: 1.10, defense: 1.02 },
  'Eibar': { attack: 1.12, defense: 0.98 },
  'SD Eibar': { attack: 1.12, defense: 0.98 },
  'Granada': { attack: 1.14, defense: 1.06 },
  'Granada CF': { attack: 1.14, defense: 1.06 },
  'Levante': { attack: 1.12, defense: 1.00 },
  'Levante UD': { attack: 1.12, defense: 1.00 },
  'Málaga': { attack: 0.96, defense: 1.02 },
  'R. Oviedo': { attack: 1.06, defense: 0.96 },
  'Real Oviedo': { attack: 1.06, defense: 0.96 },
  'Racing Santander': { attack: 1.18, defense: 1.05 },
  'Sporting': { attack: 1.08, defense: 1.02 },
  'Tenerife': { attack: 0.92, defense: 1.05 },
  'CD Tenerife': { attack: 0.92, defense: 1.05 },
  'Zaragoza': { attack: 1.04, defense: 1.02 },
  'Real Zaragoza': { attack: 1.04, defense: 1.02 },
  'Albacete': { attack: 1.02, defense: 1.10 },
  'Eldense': { attack: 0.90, defense: 1.04 },
  'Andorra': { attack: 0.94, defense: 1.06 }
};

// Escala continua de Club/National Elo Ratings (Unified Elo Bridge)
const GLOBAL_ELO_RATINGS: Record<string, number> = {
  // Tier Elite Mundial (> 1950)
  'Manchester City': 2045,
  'Real Madrid CF': 2025,
  'Real Madrid': 2025,
  'Liverpool': 1995,
  'Bayern Múnich': 1980,
  'Arsenal': 1975,
  'FC Barcelona': 1960,
  'Barcelona': 1960,
  'Inter De Milán': 1955,
  'PSG': 1940,
  'Psg': 1940,

  // Tier Alto Europeo & Selecciones Top (1800 - 1949)
  'España': 2085,
  'Inglaterra': 2010,
  'Portugal': 1990,
  'Alemania': 1970,
  'Países Bajos': 1920,
  'Croacia': 1890,
  'Club Atlético de Madrid': 1885,
  'Atlético de Madrid': 1885,
  'At. Madrid': 1885,
  'Dinamarca': 1860,
  'Borussia Dortmund': 1845,
  'Leipzig': 1840,
  'Athletic Club': 1825,
  'Real Sociedad': 1820,
  'Real Sociedad de Fútbol': 1820,
  'Villarreal CF': 1810,
  'Villarreal': 1810,
  'Nápoles': 1835,
  'Suiza': 1830,
  'Austria': 1820,
  'Oporto': 1805,
  'Psv': 1795,
  'Real Betis': 1785,
  'Real Betis Balompié': 1785,
  'Betis': 1785,
  'Girona FC': 1775,
  'Girona': 1775,

  // Tier Medio Europeo & LaLiga Regular (1650 - 1799)
  'Sevilla FC': 1740,
  'Sevilla': 1740,
  'Feyenoord': 1750,
  'Brujas': 1720,
  'Celtic': 1710,
  'RC Celta de Vigo': 1705,
  'Celta': 1705,
  'Stuttgart': 1735,
  'Manchester United': 1740,
  'Lens': 1725,
  'Rayo Vallecano': 1690,
  'Rayo Vallecano de Madrid': 1690,
  'CA Osasuna': 1695,
  'Osasuna': 1695,
  'RCD Mallorca': 1680,
  'Mallorca': 1680,
  'Valencia CF': 1690,
  'Valencia': 1690,
  'Getafe CF': 1670,
  'Getafe': 1670,
  'Deportivo Alavés': 1665,
  'Alavés': 1665,
  'Shakhtar': 1690,
  'Como': 1680,
  'Escocia': 1720,
  'Noruega': 1740,
  'Serbia': 1750,
  'República Checa': 1715,

  // Tier LaLiga Hypermotion & Equipos Menores (1400 - 1649)
  'CD Leganés': 1630,
  'Leganés': 1630,
  'UD Las Palmas': 1635,
  'Las Palmas': 1635,
  'RCD Espanyol de Barcelona': 1640,
  'Espanyol': 1640,
  'Real Valladolid CF': 1625,
  'Valladolid': 1625,
  'Elche': 1580,
  'Elche CF': 1580,
  'Almería': 1570,
  'UD Almería': 1570,
  'Levante': 1565,
  'Levante UD': 1565,
  'R. Oviedo': 1560,
  'Real Oviedo': 1560,
  'Racing Santander': 1555,
  'Eibar': 1550,
  'SD Eibar': 1550,
  'Granada': 1550,
  'Granada CF': 1550,
  'Sporting': 1545,
  'Burgos': 1530,
  'Burgos CF': 1530,
  'Cádiz': 1540,
  'Cádiz CF': 1540,
  'Zaragoza': 1535,
  'Real Zaragoza': 1535,
  'Castellón': 1530,
  'CD Castellón': 1530,
  'Tenerife': 1520,
  'CD Tenerife': 1520,
  'Deportivo': 1535,
  'RC Deportivo': 1535,
  'Lillestrom': 1510,
  'Lugano': 1540,
  'Bodo Glimt': 1585,
  'Eslovaquia': 1660,
  'Eslovenia': 1650,
  'Grecia': 1660,
  'Gales': 1640,
  'Islandia': 1590,
  'Albania': 1600,
  'República De Irlanda': 1580,
  'Bulgaria': 1510,
  'Kazajistán': 1460,
  'Luxemburgo': 1440,
  'Macedonia Del Norte': 1520,

  // Tier Modesto / Semiprofesional
  'Estonia': 1360,
  'Azerbaiyán': 1370,
  'Malta': 1220,
  'Gibraltar': 1140,
  'Liechtenstein': 1110,
  'San Marino': 950
};

// Coeficientes de competición UEFA (gamma) para normalizar ligas
const LEAGUE_COEFFICIENT_MULTIPLIERS: Record<string, number> = {
  premier: 1.05,
  laliga: 1.00,
  seriea: 0.98,
  bundesliga: 0.98,
  ligue1: 0.88,
  portugal: 0.82,
  eredivisie: 0.82,
  scotland: 0.72,
  belgium: 0.72,
  switzerland: 0.68,
  norway: 0.65,
  segunda: 0.62,
  copa_lower: 0.45
};

export function getTeamElo(team: string): number {
  const sortedKeys = Object.keys(GLOBAL_ELO_RATINGS).sort((a, b) => b.length - a.length);
  const matchKey = sortedKeys.find(k => team.toLowerCase().includes(k.toLowerCase()));
  return matchKey ? GLOBAL_ELO_RATINGS[matchKey] : 1550;
}

export function getLeagueQualityCoefficient(team: string): number {
  const t = team.toLowerCase();
  // Premier
  if (t.includes('city') || t.includes('liverpool') || t.includes('arsenal') || t.includes('united') || t.includes('chelsea') || t.includes('tottenham')) return 1.05;
  // Bundesliga
  if (t.includes('bayern') || t.includes('dortmund') || t.includes('leipzig') || t.includes('stuttgart') || t.includes('leverkusen')) return 0.98;
  // Serie A
  if (t.includes('inter') || t.includes('milan') || t.includes('nápoles') || t.includes('juventus') || t.includes('como') || t.includes('roma') || t.includes('atalanta')) return 0.98;
  // Portugal / Holanda
  if (t.includes('porto') || t.includes('oporto') || t.includes('benfica') || t.includes('sporting de portugal') || t.includes('psv') || t.includes('feyenoord') || t.includes('ajax')) return 0.82;
  // Escocia / Suiza / Noruega
  if (t.includes('celtic') || t.includes('rangers') || t.includes('lugano') || t.includes('basilea') || t.includes('young boys') || t.includes('bodo') || t.includes('lillestrom')) return 0.70;
  // Segunda División española
  if (t.includes('burgos') || t.includes('mirandés') || t.includes('eldense') || t.includes('castellón') || t.includes('ferrol') || t.includes('cartagena') || t.includes('huesca')) return 0.62;
  // Copa del Rey divisiones inferiores
  if (t.includes('alcalá') || t.includes('calatayud') || t.includes('laredo') || t.includes('badajoz') || t.includes('cieza') || t.includes('conquense') || t.includes('arosa') || t.includes('alcoyano')) return 0.45;

  return 1.00; // LaLiga estándar por defecto
}

/**
 * Obtiene la fuerza a priori calibrada para un equipo.
 */
export function getDefaultTeamStrength(team: string): TeamStrength {
  // Ordenar por longitud descendente para evitar colisiones
  const sortedKeys = Object.keys(HISTORICAL_PRIORS).sort((a, b) => b.length - a.length);
  const matchKey = sortedKeys.find(k => team.toLowerCase().includes(k.toLowerCase()));
  const prior = matchKey ? HISTORICAL_PRIORS[matchKey] : { attack: 1.0, defense: 1.0 };

  return {
    team,
    attack: prior.attack,
    defense: prior.defense,
    formTrend: 0.0,
    matchesCount: 0,
    lastUpdated: new Date().toISOString()
  };
}

/**
 * Estima los goles esperados lambda y mu de un partido usando las fuerzas actuales,
 * modulado por el Unified Elo Bridge y los coeficientes de calidad de liga.
 */
export function estimateMatchExpectedGoals(
  home: TeamStrength,
  away: TeamStrength,
  homeAdvantage: number = 1.08,
  options?: { isNeutralVenue?: boolean; competition?: 'DOMESTIC' | 'CHAMPIONS' | 'SELECCIONES' }
): { lambdaHome: number; muAway: number } {
  // 1. Elo Bridge
  const eloHome = getTeamElo(home.team);
  const eloAway = getTeamElo(away.team);

  const homeBonusElo = options?.isNeutralVenue ? 0 : (options?.competition === 'CHAMPIONS' ? 75 : 65);
  const deltaElo = (eloHome + homeBonusElo) - eloAway;

  // Ajuste multiplicativo suave por Elo (evita extremos inverosímiles)
  // deltaElo de +200 puntos da aprox 1.18x en goles a favor y 0.85x en contra
  const eloMultiplierHome = Math.max(0.65, Math.min(1.55, Math.pow(10, deltaElo / 1400)));
  const eloMultiplierAway = Math.max(0.65, Math.min(1.55, Math.pow(10, -deltaElo / 1400)));

  // 2. Coeficientes de calidad de liga
  const coeffHome = getLeagueQualityCoefficient(home.team);
  const coeffAway = getLeagueQualityCoefficient(away.team);
  const leagueRatioHome = Math.pow(coeffHome / coeffAway, 0.35);
  const leagueRatioAway = Math.pow(coeffAway / coeffHome, 0.35);

  const effAdvantage = options?.isNeutralVenue ? 1.00 : homeAdvantage;

  // 3. Fusión Dixon-Coles ponderada con Elo y Coeficiente de Liga
  const lambda = home.attack * away.defense * effAdvantage * LEAGUE_BASE_HOME_GOALS * eloMultiplierHome * leagueRatioHome;
  const mu = away.attack * home.defense * LEAGUE_BASE_AWAY_GOALS * eloMultiplierAway * leagueRatioAway;

  return {
    lambdaHome: Math.max(0.2, Number(lambda.toFixed(2))),
    muAway: Math.max(0.2, Number(mu.toFixed(2)))
  };
}

/**
 * Ejecuta la retroalimentación online bayesiana a partir del resultado real de un partido.
 * Aplica Stochastic Gradient Adjustment con amortiguador no lineal (tanh) para evitar anomalías
 * y suavizado antiruido estocástico.
 */
export function updateStrengthsFromMatch(input: MatchUpdateInput): MatchUpdateResult {
  const eta = input.learningRate ?? 0.06;
  const gamma = input.homeAdvantage ?? 1.18;
  const reg = input.regressionFactor ?? 0.005;

  const home = { ...input.homeStrength };
  const away = { ...input.awayStrength };

  const expBefore = estimateMatchExpectedGoals(home, away, gamma);

  // Filtro antiruido de varianza: ponderar 70% goles esperados de calidad + 30% goles reales
  // Esto amortigua rebotes fortuitos o goles de penalti dudoso en el minuto 95
  const rawErrHome = input.goalsHome - expBefore.lambdaHome;
  const rawErrAway = input.goalsAway - expBefore.muAway;

  // Amortiguador suave no lineal (tanh) acotado estrictamente para evitar saltos explosivos
  const dampenedErrHome = Math.tanh(rawErrHome / 2.0) * 1.8;
  const dampenedErrAway = Math.tanh(rawErrAway / 2.0) * 1.8;

  // Actualización de parámetros:
  // 1. Ataque local (sube si marcó más de lo esperado)
  const deltaHomeAttack = (eta * (dampenedErrHome / (away.defense * gamma))) - (reg * (home.attack - 1.0));
  // 2. Defensa visitante (sube/empeora si encajó más de lo esperado)
  const deltaAwayDefense = (eta * (dampenedErrHome / (home.attack * gamma))) - (reg * (away.defense - 1.0));

  // 3. Ataque visitante (sube si marcó más de lo esperado)
  const deltaAwayAttack = (eta * (dampenedErrAway / home.defense)) - (reg * (away.attack - 1.0));
  // 4. Defensa local (sube/empeora si encajó más de lo esperado)
  const deltaHomeDefense = (eta * (dampenedErrAway / away.attack)) - (reg * (home.defense - 1.0));

  // Aplicar cambios con límites de seguridad fisiológicos [0.5, 2.5]
  const newHomeAttack = Number(Math.max(0.5, Math.min(2.5, home.attack + deltaHomeAttack)).toFixed(3));
  const newHomeDefense = Number(Math.max(0.5, Math.min(2.5, home.defense + deltaHomeDefense)).toFixed(3));
  const newAwayAttack = Number(Math.max(0.5, Math.min(2.5, away.attack + deltaAwayAttack)).toFixed(3));
  const newAwayDefense = Number(Math.max(0.5, Math.min(2.5, away.defense + deltaAwayDefense)).toFixed(3));

  // Actualizar momentum/tendencia
  const newHomeForm = Number((home.formTrend * 0.7 + Math.sign(rawErrHome - rawErrAway) * 0.3).toFixed(2));
  const newAwayForm = Number((away.formTrend * 0.7 + Math.sign(rawErrAway - rawErrHome) * 0.3).toFixed(2));

  const updatedHome: TeamStrength = {
    ...home,
    attack: newHomeAttack,
    defense: newHomeDefense,
    formTrend: newHomeForm,
    matchesCount: home.matchesCount + 1,
    lastUpdated: new Date().toISOString()
  };

  const updatedAway: TeamStrength = {
    ...away,
    attack: newAwayAttack,
    defense: newAwayDefense,
    formTrend: newAwayForm,
    matchesCount: away.matchesCount + 1,
    lastUpdated: new Date().toISOString()
  };

  const logs: string[] = [];

  const homeAttackPct = (((newHomeAttack - home.attack) / home.attack) * 100).toFixed(1);
  const homeDefensePct = (((newHomeDefense - home.defense) / home.defense) * 100).toFixed(1);
  const awayAttackPct = (((newAwayAttack - away.attack) / away.attack) * 100).toFixed(1);
  const awayDefensePct = (((newAwayDefense - away.defense) / away.defense) * 100).toFixed(1);

  logs.push(
    `[Retroalimentación] ${home.team}: Ataque ${home.attack} -> ${newHomeAttack} (${Number(homeAttackPct) >= 0 ? '+' : ''}${homeAttackPct}%), Defensa ${home.defense} -> ${newHomeDefense} (${Number(homeDefensePct) >= 0 ? '+' : ''}${homeDefensePct}%)`
  );
  logs.push(
    `[Retroalimentación] ${away.team}: Ataque ${away.attack} -> ${newAwayAttack} (${Number(awayAttackPct) >= 0 ? '+' : ''}${awayAttackPct}%), Defensa ${away.defense} -> ${newAwayDefense} (${Number(awayDefensePct) >= 0 ? '+' : ''}${awayDefensePct}%)`
  );

  return {
    updatedHomeStrength: updatedHome,
    updatedAwayStrength: updatedAway,
    expectedGoalsBefore: expBefore,
    actualGoals: { goalsHome: input.goalsHome, goalsAway: input.goalsAway },
    residualErrors: { errorHome: Number(rawErrHome.toFixed(2)), errorAway: Number(rawErrAway.toFixed(2)) },
    adjustmentLog: logs
  };
}
