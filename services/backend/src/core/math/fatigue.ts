/**
 * Módulo de Factor Descanso, Fatiga y Calendario Europeo (Champions / Europa League / Copa del Rey).
 */

export interface TeamFatigueContext {
  team: string;
  hasMidweekMatch: boolean;
  midweekCompetition?: 'CHAMPIONS_LEAGUE' | 'EUROPA_LEAGUE' | 'CONFERENCE_LEAGUE' | 'COPA_DEL_REY';
  restHours: number;         // Horas de descanso desde el partido entre semana (ej. 66h, 72h, 96h)
  traveledAbroad: boolean;   // Si viajó fuera de España en competición europea
  rotationsExpected: boolean; // Si el entrenador suele rotar el once titular
}

export interface FatigueAdjustmentResult {
  hasFatigue: boolean;
  attackMultiplier: number;  // Multiplicador sobre lambda (<= 1.0 reduce poder goleador)
  defenseMultiplier: number; // Multiplicador sobre mu (>= 1.0 aumenta goles concedidos por cansancio)
  fatigueIndexPct: number;   // 0 a 100% de fatiga
  badgeLabel?: string;
  warningNotice?: string;
}

// Equipos españoles que habitualmente disputan competiciones europeas
const EUROPEAN_CONTENDERS = new Set([
  'Real Madrid CF',
  'Real Madrid',
  'FC Barcelona',
  'Barcelona',
  'Club Atlético de Madrid',
  'Atlético de Madrid',
  'Real Sociedad de Fútbol',
  'Real Sociedad',
  'Athletic Club',
  'Girona FC',
  'Girona',
  'Real Betis Balompié',
  'Real Betis',
  'Villarreal CF',
  'Villarreal',
  'Sevilla FC'
]);

/**
 * Evalúa el impacto de la fatiga física y el descanso entre semana en el rendimiento de un equipo.
 */
export function evaluateTeamFatigue(context: Partial<TeamFatigueContext> & { team: string }): FatigueAdjustmentResult {
  const isContender = Array.from(EUROPEAN_CONTENDERS).some(c => context.team.includes(c));
  const hasMidweek = context.hasMidweekMatch ?? isContender; // Si no se especifica, se infiere por su condición europea
  const restHours = context.restHours ?? (isContender ? 68 : 144);
  const traveled = context.traveledAbroad ?? (isContender && restHours < 75);

  if (!hasMidweek || restHours >= 120) {
    return {
      hasFatigue: false,
      attackMultiplier: 1.0,
      defenseMultiplier: 1.0,
      fatigueIndexPct: 0
    };
  }

  let penalty = 0;

  // Penalización por horas de descanso (< 72h es zona crítica FIFA/FIFPro)
  if (restHours < 72) {
    penalty += 0.10; // -10% de base
  } else if (restHours < 96) {
    penalty += 0.05;
  }

  // Penalización por viaje internacional (vuelo y cambio de rutina)
  if (traveled) {
    penalty += 0.04;
  }

  // Rotaciones esperadas de jugadores clave
  if (context.rotationsExpected || isContender) {
    penalty += 0.03;
  }

  const attackMult = Number((1.0 - penalty).toFixed(3));
  const defenseMult = Number((1.0 + (penalty * 0.75)).toFixed(3));
  const fatigueIndex = Math.min(100, Math.round(penalty * 500));

  let badgeLabel = '⚡ FATIGA EUROPEA';
  if (context.midweekCompetition === 'CHAMPIONS_LEAGUE' || (!context.midweekCompetition && isContender)) {
    badgeLabel = '⚡ FATIGA CHAMPIONS (68h)';
  } else if (context.midweekCompetition === 'EUROPA_LEAGUE') {
    badgeLabel = '⚡ FATIGA EUROPA LEAGUE (64h)';
  }

  const warningNotice = `Llega con solo ${restHours}h de descanso tras compromiso intersemanal${traveled ? ' con desplazamiento europeo' : ''}. Rendimiento ofensivo penalizado un -${Math.round(penalty * 100)}% y mayor probabilidad de rotaciones.`;

  return {
    hasFatigue: true,
    attackMultiplier: attackMult,
    defenseMultiplier: defenseMult,
    fatigueIndexPct: fatigueIndex,
    badgeLabel,
    warningNotice
  };
}

/**
 * Ajusta las expectativas goleadoras (lambda y mu) de Dixon-Coles aplicando el diferencial de fatiga de ambos equipos.
 */
export function applyFatigueToExpectedGoals(
  lambdaHome: number,
  muAway: number,
  homeTeam: string,
  awayTeam: string,
  enableFatigueAdjustment: boolean = true
): {
  adjustedLambdaHome: number;
  adjustedMuAway: number;
  homeFatigue: FatigueAdjustmentResult;
  awayFatigue: FatigueAdjustmentResult;
} {
  const homeFatigue = evaluateTeamFatigue({ team: homeTeam });
  const awayFatigue = evaluateTeamFatigue({ team: awayTeam });

  if (!enableFatigueAdjustment) {
    return {
      adjustedLambdaHome: lambdaHome,
      adjustedMuAway: muAway,
      homeFatigue,
      awayFatigue
    };
  }

  // Si el local tiene fatiga: su ataque se resiente y su defensa concede más
  let adjLambda = lambdaHome * homeFatigue.attackMultiplier * awayFatigue.defenseMultiplier;
  // Si el visitante tiene fatiga: su ataque se resiente y su defensa concede más
  let adjMu = muAway * awayFatigue.attackMultiplier * homeFatigue.defenseMultiplier;

  return {
    adjustedLambdaHome: Number(Math.max(0.4, adjLambda).toFixed(2)),
    adjustedMuAway: Number(Math.max(0.3, adjMu).toFixed(2)),
    homeFatigue,
    awayFatigue
  };
}
