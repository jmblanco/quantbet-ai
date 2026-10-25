/**
 * Motor de Cálculo de Esperanza Matemática (Expected Value) y Detección de Valor.
 * Cruza la probabilidad real estimada por el modelo con los porcentajes apostados por el público en SELAE.
 */

export interface EvInput {
  prob1: number;         // 0 a 1 (Modelo)
  probX: number;         // 0 a 1 (Modelo)
  prob2: number;         // 0 a 1 (Modelo)
  pctLae1: number;       // 0 a 100 (SELAE)
  pctLaeX: number;       // 0 a 100 (SELAE)
  pctLae2: number;       // 0 a 100 (SELAE)
}

export interface SignEvAnalysis {
  sign: '1' | 'X' | '2';
  probModel: number;     // e.g. 0.45
  pctLae: number;        // e.g. 30.0
  evRatio: number;       // e.g. 1.500 (> 1.0 es valor positivo)
  isOverbet: boolean;    // El público lo sobrevalora
  hasValue: boolean;     // El modelo le da más probabilidad de lo que el público juega
}

export interface MatchValueAnalysis {
  signs: {
    '1': SignEvAnalysis;
    'X': SignEvAnalysis;
    '2': SignEvAnalysis;
  };
  recommendedSign: '1' | 'X' | '2' | '1X' | '12' | 'X2' | '1X2';
  confidenceScore: number; // 0 a 100
  notes: string;
  verdictBadge: 'FIJO DE BANCO' | 'SUPERFAVORITO' | 'TRAMPA DE MASA' | 'SORPRESA RENTABLE' | 'PARTIDO EQUILIBRADO';
  explanation: string;
  marketConsensus: {
    prob1: number;
    probX: number;
    prob2: number;
  };
}

export function calculateExpectedValue(input: EvInput): MatchValueAnalysis {
  const pLae1 = Math.max(0.5, input.pctLae1) / 100;
  const pLaeX = Math.max(0.5, input.pctLaeX) / 100;
  const pLae2 = Math.max(0.5, input.pctLae2) / 100;

  const ev1 = Number((input.prob1 / pLae1).toFixed(3));
  const evX = Number((input.probX / pLaeX).toFixed(3));
  const ev2 = Number((input.prob2 / pLae2).toFixed(3));

  const signs: MatchValueAnalysis['signs'] = {
    '1': {
      sign: '1',
      probModel: input.prob1,
      pctLae: input.pctLae1,
      evRatio: ev1,
      isOverbet: ev1 < 0.85,
      hasValue: ev1 >= 1.05
    },
    'X': {
      sign: 'X',
      probModel: input.probX,
      pctLae: input.pctLaeX,
      evRatio: evX,
      isOverbet: evX < 0.85,
      hasValue: evX >= 1.05
    },
    '2': {
      sign: '2',
      probModel: input.prob2,
      pctLae: input.pctLae2,
      evRatio: ev2,
      isOverbet: ev2 < 0.85,
      hasValue: ev2 >= 1.05
    }
  };

  // Estimación de cuotas de mercado de consenso (despojadas de vig/margen)
  // Ensamble ponderado: 70% modelo Dixon-Coles calibrado + 30% masa de apuestas suavizada
  const m1 = Number((input.prob1 * 0.7 + pLae1 * 0.3).toFixed(2));
  const mX = Number((input.probX * 0.7 + pLaeX * 0.3).toFixed(2));
  const m2 = Number((1.0 - m1 - mX).toFixed(2));

  let recommendedSign: MatchValueAnalysis['recommendedSign'] = '1';
  let notes = '';
  let verdictBadge: MatchValueAnalysis['verdictBadge'] = 'PARTIDO EQUILIBRADO';
  let explanation = '';

  const maxProbSign = input.prob1 >= input.probX && input.prob1 >= input.prob2 ? '1' : (input.probX >= input.prob2 ? 'X' : '2');
  const maxProbVal = Math.max(input.prob1, input.probX, input.prob2);

  // 1. Superfavorito (> 65% de probabilidad)
  if (maxProbVal >= 0.65) {
    recommendedSign = maxProbSign;
    verdictBadge = 'SUPERFAVORITO';
    notes = `Fijo sólido a ${maxProbSign} (${(maxProbVal * 100).toFixed(1)}% prob).`;
    explanation = `Dominancia muy alta (${(maxProbVal * 100).toFixed(0)}% de probabilidad estimada). Aunque el público lo juega en masa, el riesgo de tropiezo es mínimo. Fijo de máxima seguridad para abaratar el boleto.`;
  }
  // 2. Fijo de Banco con Valor Positivo
  else if (maxProbVal >= 0.50 && signs[maxProbSign].evRatio >= 1.05) {
    recommendedSign = maxProbSign;
    verdictBadge = 'FIJO DE BANCO';
    notes = `Fijo con valor positivo a ${maxProbSign} (EV ${signs[maxProbSign].evRatio}).`;
    explanation = `El modelo estima un ${(maxProbVal * 100).toFixed(0)}% de probabilidad frente al ${(signs[maxProbSign].pctLae).toFixed(0)}% que juega la masa en SELAE. Está un ${((signs[maxProbSign].evRatio - 1) * 100).toFixed(0)}% mejor pagado de lo que debería. Fijo rentable.`;
  }
  // 3. Trampa de Masa: El favorito del público tiene EV pésimo (< 0.85)
  else if (signs['2'].isOverbet || signs['1'].isOverbet) {
    const overbetSign = signs['2'].isOverbet ? '2' : '1';
    const counterSignA = overbetSign === '2' ? '1' : '2';
    const counterSignB = 'X';

    // Ordenar los signos contra-consenso
    const counterSigns = [counterSignA, counterSignB].sort((a, b) => signs[b as '1'|'X'|'2'].evRatio - signs[a as '1'|'X'|'2'].evRatio);
    recommendedSign = counterSigns.sort().join('') as any;
    verdictBadge = 'TRAMPA DE MASA';
    notes = `Alerta de sobre-apuesta en el signo ${overbetSign}. Cobertura con ${recommendedSign}.`;
    explanation = `¡Atención! La masa de jugadores sobre-apuesta al ${overbetSign} (${signs[overbetSign].pctLae.toFixed(0)}% de los boletos), pero su probabilidad real es de solo ${(signs[overbetSign].probModel * 100).toFixed(0)}% (EV ${signs[overbetSign].evRatio}). Si tropieza, el bote se multiplica: cubrimos con el doble de valor ${recommendedSign}.`;
  }
  // 4. Sorpresa Rentable / Partido de Alta Incertidumbre
  else if (maxProbVal < 0.45) {
    const sortedByEv = (['1', 'X', '2'] as const).sort((a, b) => signs[b].evRatio - signs[a].evRatio);
    recommendedSign = [sortedByEv[0], sortedByEv[1]].sort().join('') as any;
    verdictBadge = 'SORPRESA RENTABLE';
    notes = `Partido igualado. Doble táctico de alto valor ${recommendedSign}.`;
    explanation = `Partido de pronóstico muy abierto. La IA selecciona los dos signos con mayor Expected Value (${recommendedSign}) para asegurar el acierto con el máximo retorno de premio.`;
  }
  // 5. Caso General
  else {
    const remaining = (['1', 'X', '2'] as const).filter(s => s !== maxProbSign);
    const secondSign = signs[remaining[0]].evRatio >= signs[remaining[1]].evRatio ? remaining[0] : remaining[1];
    
    if (signs[secondSign].hasValue) {
      recommendedSign = [maxProbSign, secondSign].sort().join('') as any;
      verdictBadge = 'SORPRESA RENTABLE';
      notes = `Doble de valor ${recommendedSign}.`;
      explanation = `Base probable al ${maxProbSign}, pero protegiendo con el signo ${secondSign} por su alto valor matemático (EV ${signs[secondSign].evRatio}).`;
    } else {
      recommendedSign = maxProbSign;
      verdictBadge = 'FIJO DE BANCO';
      notes = `Fijo al ${maxProbSign}.`;
      explanation = `Signo predominante con ${(maxProbVal * 100).toFixed(0)}% de probabilidad.`;
    }
  }

  // Puntuación de confianza (0-100)
  const confidenceScore = Number((maxProbVal * 70 + (signs[maxProbSign].evRatio >= 1 ? 30 : 10)).toFixed(1));

  return {
    signs,
    recommendedSign,
    confidenceScore: Math.min(100, Math.max(0, confidenceScore)),
    notes,
    verdictBadge,
    explanation,
    marketConsensus: {
      prob1: m1,
      probX: mX,
      prob2: m2
    }
  };
}
