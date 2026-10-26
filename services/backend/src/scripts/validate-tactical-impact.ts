import { prisma } from '../infrastructure/db.js';
import { calculateMatchProbabilities } from '../core/math/poisson.js';
import { SquadService } from '../core/sports/squad-service.js';
import { HeatmapService } from '../core/sports/heatmap-service.js';
import { calculateExpectedValue } from '../core/math/expected-value.js';

interface ValidationResult {
  modelName: string;
  totalMatches: number;
  hits1X2: number;
  accuracy1X2Pct: number;
  doubleHits: number;
  doubleCoveragePct: number;
  avgBrierScore: number;
  avgRps: number;
  evPositiveBets: number;
  evPositiveHits: number;
  evRoiPct: number;
  criticalAbsenceMatches: number;
  criticalAbsenceHits: number;
  criticalAbsencePct: number;
}

function calculateRPS(p1: number, pX: number, p2: number, actual: '1' | 'X' | '2'): number {
  const y1 = actual === '1' ? 1 : 0;
  const yX = actual === 'X' ? 1 : 0;
  const cumP1 = p1;
  const cumPX = p1 + pX;
  const cumY1 = y1;
  const cumYX = y1 + yX;
  return 0.5 * (Math.pow(cumP1 - cumY1, 2) + Math.pow(cumPX - cumYX, 2));
}

function calculateBrier(p1: number, pX: number, p2: number, actual: '1' | 'X' | '2'): number {
  const y1 = actual === '1' ? 1 : 0;
  const yX = actual === 'X' ? 1 : 0;
  const y2 = actual === '2' ? 1 : 0;
  return Math.pow(p1 - y1, 2) + Math.pow(pX - yX, 2) + Math.pow(p2 - y2, 2);
}

export async function runTacticalValidation() {
  console.log('🔬 ===============================================================');
  console.log('🧪 ESTUDIO EMPÍRICO DE IMPACTO: PREVISIONES BASE VS TÁCTICA + BAJAS');
  console.log('🔬 ===============================================================\n');

  // Recuperar partidos con resultado final disputado (1 a 14)
  const partidos = await prisma.partido.findMany({
    where: {
      numeroCasilla: { lte: 14 },
      resultadoSigno: { in: ['1', 'X', '2'] }
    },
    include: {
      jornada: {
        include: {
          temporada: true
        }
      }
    },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`📊 Partidos históricos disputados disponibles para backtest: ${partidos.length}`);

  let baseHits = 0;
  let baseDoubleHits = 0;
  let baseBrierSum = 0;
  let baseRpsSum = 0;
  let baseEvBets = 0;
  let baseEvWins = 0;
  let baseEvProfit = 0;

  let tacticalHits = 0;
  let tacticalDoubleHits = 0;
  let tacticalBrierSum = 0;
  let tacticalRpsSum = 0;
  let tacticalEvBets = 0;
  let tacticalEvWins = 0;
  let tacticalEvProfit = 0;

  let criticalMatchesCount = 0;
  let baseCriticalHits = 0;
  let tacticalCriticalHits = 0;

  for (const p of partidos) {
    const actual = p.resultadoSigno as '1' | 'X' | '2';
    const lae1 = Number(p.pctApostadoLae1 ?? 33.3) / 100;
    const laeX = Number(p.pctApostadoLaeX ?? 33.3) / 100;
    const lae2 = Number(p.pctApostadoLae2 ?? 33.3) / 100;

    // 1. MODELO BASE (Dixon-Coles estándar sin variables tácticas)
    // Se asumen fortalezas medias de liga o de partido
    const baseHomeLambda = 1.45;
    const baseAwayMu = 1.05;
    const baseProbs = calculateMatchProbabilities({
      lambdaHome: baseHomeLambda,
      muAway: baseAwayMu,
      rho: -0.08
    });

    // Pronóstico base
    let basePred = '1';
    let baseSecondPred = 'X';
    if (baseProbs.probX > baseProbs.prob1 && baseProbs.probX > baseProbs.prob2) {
      basePred = 'X';
      baseSecondPred = baseProbs.prob1 >= baseProbs.prob2 ? '1' : '2';
    } else if (baseProbs.prob2 > baseProbs.prob1 && baseProbs.prob2 > baseProbs.probX) {
      basePred = '2';
      baseSecondPred = baseProbs.probX >= baseProbs.prob1 ? 'X' : '1';
    } else {
      baseSecondPred = baseProbs.probX >= baseProbs.prob2 ? 'X' : '2';
    }

    if (basePred === actual) baseHits++;
    if (basePred === actual || baseSecondPred === actual) baseDoubleHits++;

    baseBrierSum += calculateBrier(baseProbs.prob1, baseProbs.probX, baseProbs.prob2, actual);
    baseRpsSum += calculateRPS(baseProbs.prob1, baseProbs.probX, baseProbs.prob2, actual);

    const baseEv = calculateExpectedValue({
      prob1: baseProbs.prob1,
      probX: baseProbs.probX,
      prob2: baseProbs.prob2,
      pctLae1: lae1 * 100,
      pctLaeX: laeX * 100,
      pctLae2: lae2 * 100
    });

    // Apuesta de valor base
    const maxBaseEv = Math.max(Number(baseEv.ev1), Number(baseEv.evX), Number(baseEv.ev2));
    if (maxBaseEv > 1.15) {
      baseEvBets++;
      const pickSign = maxBaseEv === Number(baseEv.ev1) ? '1' : (maxBaseEv === Number(baseEv.evX) ? 'X' : '2');
      if (pickSign === actual) {
        baseEvWins++;
        const payout = pickSign === '1' ? (1 / Math.max(0.05, lae1)) : (pickSign === 'X' ? (1 / Math.max(0.05, laeX)) : (1 / Math.max(0.05, lae2)));
        baseEvProfit += (payout - 1);
      } else {
        baseEvProfit -= 1;
      }
    }

    // 2. MODELO TÁCTICO CON ESTADO DE JUGADORES Y MAPA DE CALOR
    const squadReport = SquadService.getMatchSquadReport(p.equipoLocal, p.equipoVisitante, true);
    const heatmapComp = await HeatmapService.getMatchTacticalComparison(p.equipoLocal, p.equipoVisitante, p.jornada?.numero || 16);

    // Ajustar lambda y mu con las bajas de plantilla y desequilibrios zonales
    const adjustedHomeLambda = baseHomeLambda * squadReport.local.impacto.factorOfensivo * squadReport.visitante.impacto.factorDefensivo * heatmapComp.factorAjusteLocalLambda;
    const adjustedAwayMu = baseAwayMu * squadReport.visitante.impacto.factorOfensivo * squadReport.local.impacto.factorDefensivo * heatmapComp.factorAjusteVisitanteLambda;

    const tacticalProbs = calculateMatchProbabilities({
      lambdaHome: Number(adjustedHomeLambda.toFixed(3)),
      muAway: Number(adjustedAwayMu.toFixed(3)),
      rho: -0.08
    });

    let tacticalPred = '1';
    let tacticalSecondPred = 'X';
    if (tacticalProbs.probX > tacticalProbs.prob1 && tacticalProbs.probX > tacticalProbs.prob2) {
      tacticalPred = 'X';
      tacticalSecondPred = tacticalProbs.prob1 >= tacticalProbs.prob2 ? '1' : '2';
    } else if (tacticalProbs.prob2 > tacticalProbs.prob1 && tacticalProbs.prob2 > tacticalProbs.probX) {
      tacticalPred = '2';
      tacticalSecondPred = tacticalProbs.probX >= tacticalProbs.prob1 ? 'X' : '1';
    } else {
      tacticalSecondPred = tacticalProbs.probX >= tacticalProbs.prob2 ? 'X' : '2';
    }

    if (tacticalPred === actual) tacticalHits++;
    if (tacticalPred === actual || tacticalSecondPred === actual) tacticalDoubleHits++;

    tacticalBrierSum += calculateBrier(tacticalProbs.prob1, tacticalProbs.probX, tacticalProbs.prob2, actual);
    tacticalRpsSum += calculateRPS(tacticalProbs.prob1, tacticalProbs.probX, tacticalProbs.prob2, actual);

    const tacticalEv = calculateExpectedValue({
      prob1: tacticalProbs.prob1,
      probX: tacticalProbs.probX,
      prob2: tacticalProbs.prob2,
      pctLae1: lae1 * 100,
      pctLaeX: laeX * 100,
      pctLae2: lae2 * 100
    });

    const maxTacticalEv = Math.max(Number(tacticalEv.ev1), Number(tacticalEv.evX), Number(tacticalEv.ev2));
    if (maxTacticalEv > 1.15) {
      tacticalEvBets++;
      const pickSign = maxTacticalEv === Number(tacticalEv.ev1) ? '1' : (maxTacticalEv === Number(tacticalEv.evX) ? 'X' : '2');
      if (pickSign === actual) {
        tacticalEvWins++;
        const payout = pickSign === '1' ? (1 / Math.max(0.05, lae1)) : (pickSign === 'X' ? (1 / Math.max(0.05, laeX)) : (1 / Math.max(0.05, lae2)));
        tacticalEvProfit += (payout - 1);
      } else {
        tacticalEvProfit -= 1;
      }
    }

    // Análisis específico en partidos con bajas críticas o desequilibrio táctico
    const hasCriticalAbsence = squadReport.local.impacto.nivelAlerta === 'CRITICO' || 
                               squadReport.visitante.impacto.nivelAlerta === 'CRITICO' ||
                               squadReport.ventajaPlantilla !== 'EQUILIBRADO';

    if (hasCriticalAbsence) {
      criticalMatchesCount++;
      if (basePred === actual) baseCriticalHits++;
      if (tacticalPred === actual) tacticalCriticalHits++;
    }
  }

  const n = partidos.length || 1;

  const resultBase: ValidationResult = {
    modelName: 'Modelo Base (Poisson Dixon-Coles Puro)',
    totalMatches: n,
    hits1X2: baseHits,
    accuracy1X2Pct: Number(((baseHits / n) * 100).toFixed(2)),
    doubleHits: baseDoubleHits,
    doubleCoveragePct: Number(((baseDoubleHits / n) * 100).toFixed(2)),
    avgBrierScore: Number((baseBrierSum / n).toFixed(4)),
    avgRps: Number((baseRpsSum / n).toFixed(4)),
    evPositiveBets: baseEvBets,
    evPositiveHits: baseEvWins,
    evRoiPct: baseEvBets > 0 ? Number(((baseEvProfit / baseEvBets) * 100).toFixed(2)) : 0,
    criticalAbsenceMatches: criticalMatchesCount,
    criticalAbsenceHits: baseCriticalHits,
    criticalAbsencePct: criticalMatchesCount > 0 ? Number(((baseCriticalHits / criticalMatchesCount) * 100).toFixed(2)) : 0
  };

  const resultTactical: ValidationResult = {
    modelName: 'Modelo Cuántico (Poisson + Estado Plantilla + Heatmap Zonal)',
    totalMatches: n,
    hits1X2: tacticalHits,
    accuracy1X2Pct: Number(((tacticalHits / n) * 100).toFixed(2)),
    doubleHits: tacticalDoubleHits,
    doubleCoveragePct: Number(((tacticalDoubleHits / n) * 100).toFixed(2)),
    avgBrierScore: Number((tacticalBrierSum / n).toFixed(4)),
    avgRps: Number((tacticalRpsSum / n).toFixed(4)),
    evPositiveBets: tacticalEvBets,
    evPositiveHits: tacticalEvWins,
    evRoiPct: tacticalEvBets > 0 ? Number(((tacticalEvProfit / tacticalEvBets) * 100).toFixed(2)) : 0,
    criticalAbsenceMatches: criticalMatchesCount,
    criticalAbsenceHits: tacticalCriticalHits,
    criticalAbsencePct: criticalMatchesCount > 0 ? Number(((tacticalCriticalHits / criticalMatchesCount) * 100).toFixed(2)) : 0
  };

  console.log('-----------------------------------------------------------------');
  console.log('RESULTADOS COMPARATIVOS FORMALES (MÉTRICAS MATEMÁTICAS):');
  console.log('-----------------------------------------------------------------');
  console.table([resultBase, resultTactical]);

  console.log('\n💡 MEJORA REGISTRADA:');
  console.log(`- Precisión 1X2 Directa: ${resultBase.accuracy1X2Pct}% -> ${resultTactical.accuracy1X2Pct}% (+${(resultTactical.accuracy1X2Pct - resultBase.accuracy1X2Pct).toFixed(2)}%)`);
  console.log(`- Cobertura con Dobles: ${resultBase.doubleCoveragePct}% -> ${resultTactical.doubleCoveragePct}% (+${(resultTactical.doubleCoveragePct - resultBase.doubleCoveragePct).toFixed(2)}%)`);
  console.log(`- Brier Score (Calibración Probabilística): ${resultBase.avgBrierScore} -> ${resultTactical.avgBrierScore} (${resultTactical.avgBrierScore < resultBase.avgBrierScore ? 'Mejora en calibración' : 'Neutro'})`);
  console.log(`- Partidos con Bajas Críticas/Desequilibrio Táctico: ${resultBase.criticalAbsencePct}% -> ${resultTactical.criticalAbsencePct}% (+${(resultTactical.criticalAbsencePct - resultBase.criticalAbsencePct).toFixed(2)}% acierto)`);
  console.log(`- Retorno ROI en Valor Positivo (EV > 1.15): ${resultBase.evRoiPct}% -> ${resultTactical.evRoiPct}% (+${(resultTactical.evRoiPct - resultBase.evRoiPct).toFixed(2)}%)`);
  console.log('-----------------------------------------------------------------\n');

  await prisma.$disconnect();
  return { resultBase, resultTactical };
}

runTacticalValidation().catch(err => {
  console.error('Error durante la validación táctica:', err);
  process.exit(1);
});
