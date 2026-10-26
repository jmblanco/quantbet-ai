/**
 * Módulo de Retroalimentación Bayesiana y Actualización Online de Parámetros (Punto 1).
 * Implementa la recalibración continua de coeficientes de ataque (alpha) y defensa (beta)
 * estilo Dixon-Coles con amortiguación bayesiana para evitar sobreajuste.
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

// Priors iniciales por categorías históricas
const HISTORICAL_PRIORS: Record<string, { attack: number; defense: number }> = {
  'Real Madrid CF': { attack: 1.75, defense: 0.78 },
  'Real Madrid': { attack: 1.75, defense: 0.78 },
  'FC Barcelona': { attack: 1.72, defense: 0.80 },
  'Barcelona': { attack: 1.72, defense: 0.80 },
  'Club Atlético de Madrid': { attack: 1.35, defense: 0.72 },
  'Atlético de Madrid': { attack: 1.35, defense: 0.72 },
  'Athletic Club': { attack: 1.25, defense: 0.88 },
  'Real Sociedad de Fútbol': { attack: 1.20, defense: 0.86 },
  'Real Sociedad': { attack: 1.20, defense: 0.86 },
  'Real Betis Balompié': { attack: 1.18, defense: 0.96 },
  'Real Betis': { attack: 1.18, defense: 0.96 },
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
  'Valencia': { attack: 1.02, defense: 1.10 }
};

/**
 * Obtiene la fuerza a priori calibrada para un equipo.
 */
export function getDefaultTeamStrength(team: string): TeamStrength {
  // Ordenar por longitud descendente para evitar que 'Espanyol de Barcelona' coincida con 'Barcelona'
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
 * Estima los goles esperados lambda y mu de un partido usando las fuerzas actuales.
 */
export function estimateMatchExpectedGoals(
  home: TeamStrength,
  away: TeamStrength,
  homeAdvantage: number = 1.08
): { lambdaHome: number; muAway: number } {
  const lambda = home.attack * away.defense * homeAdvantage * LEAGUE_BASE_HOME_GOALS;
  const mu = away.attack * home.defense * LEAGUE_BASE_AWAY_GOALS;

  return {
    lambdaHome: Math.max(0.2, Number(lambda.toFixed(2))),
    muAway: Math.max(0.2, Number(mu.toFixed(2)))
  };
}

/**
 * Ejecuta la retroalimentación online bayesiana a partir del resultado real de un partido.
 * Aplica Stochastic Gradient Adjustment con amortiguador no lineal para evitar anomalías.
 */
export function updateStrengthsFromMatch(input: MatchUpdateInput): MatchUpdateResult {
  const eta = input.learningRate ?? 0.06;
  const gamma = input.homeAdvantage ?? 1.18;
  const reg = input.regressionFactor ?? 0.005;

  const home = { ...input.homeStrength };
  const away = { ...input.awayStrength };

  const expBefore = estimateMatchExpectedGoals(home, away, gamma);
  const rawErrHome = input.goalsHome - expBefore.lambdaHome;
  const rawErrAway = input.goalsAway - expBefore.muAway;

  // Amortiguador suave no lineal (tanh) para que goleadas extremas (> 4 goles de diferencia)
  // no generen saltos explosivos en los parámetros de los equipos
  const dampenedErrHome = Math.tanh(rawErrHome / 2.0) * 2.0;
  const dampenedErrAway = Math.tanh(rawErrAway / 2.0) * 2.0;

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
