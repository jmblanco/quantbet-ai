import { prisma } from '../infrastructure/db.js';

interface SeasonReport {
  seasonCode: string;
  totalJornadas: number;
  totalMatches: number;
  directHitsAvg: number;
  doublesHitsAvg: number;
  jornadasWith10Plus: number;
  jornadasWith11Plus: number;
  jornadasWith12Plus: number;
  jornadasWith13Plus: number;
  jornadasWith14Plus: number;
  topJornadas: Array<{
    numero: number;
    hitsDirect: number;
    hitsDoubles: number;
    plenoReal: string;
    details: Array<{
      num: number;
      match: string;
      real: string;
      pred: string;
      isHitDirect: boolean;
      isHitDoubles: boolean;
    }>;
  }>;
}

async function analyzeSeason(seasonCode: string): Promise<SeasonReport | null> {
  const temporada = await prisma.temporada.findFirst({
    where: { codigo: seasonCode },
    include: {
      jornadas: {
        where: { estado: 'FINALIZADA' },
        orderBy: { numero: 'asc' },
        include: {
          partidos: {
            orderBy: { numeroCasilla: 'asc' },
            include: { predicciones: { take: 1 } }
          }
        }
      }
    }
  });

  if (!temporada || temporada.jornadas.length === 0) return null;

  let totalDirectHits = 0;
  let totalDoublesHits = 0;
  let validJornadas = 0;

  let count10 = 0;
  let count11 = 0;
  let count12 = 0;
  let count13 = 0;
  let count14 = 0;

  const jornadasData = [];

  for (const j of temporada.jornadas) {
    const matches14 = j.partidos.filter(p => p.numeroCasilla <= 14 && p.resultadoSigno !== null);
    if (matches14.length < 14) continue; // Solo jornadas completas de 14 partidos

    validJornadas++;

    // Ordenar los 14 partidos por incertidumbre (margen estrecho de probabilidades) para aplicar 4 dobles inteligentes de valor
    const rankedMatches = matches14.map(p => {
      const pred = p.predicciones[0];
      const p1 = Number(pred?.prob1 || 0.4);
      const pX = Number(pred?.probX || 0.3);
      const p2 = Number(pred?.prob2 || 0.3);
      const topProb = Math.max(p1, pX, p2);
      return { p, topProb, p1, pX, p2, pred };
    }).sort((a, b) => a.topProb - b.topProb); // Los de menor probabilidad máxima son los más difíciles

    const doubleMatchIds = new Set(rankedMatches.slice(0, 4).map(m => m.p.id));

    let hitsDirect = 0;
    let hitsDoubles = 0;
    const details = [];

    for (const p of matches14) {
      const pred = p.predicciones[0];
      const p1 = Number(pred?.prob1 || 0.4);
      const pX = Number(pred?.probX || 0.3);
      const p2 = Number(pred?.prob2 || 0.3);
      const topSign = p1 >= pX && p1 >= p2 ? '1' : (pX >= p2 ? 'X' : '2');

      const isDirectHit = topSign === p.resultadoSigno;
      if (isDirectHit) hitsDirect++;

      // Si es uno de los 4 dobles, cubrir con el segundo signo más probable o con valor
      let isDoubleHit = isDirectHit;
      if (doubleMatchIds.has(p.id)) {
        const remaining = (['1', 'X', '2'] as const).filter(s => s !== topSign);
        const secondSign = (remaining[0] === 'X' ? pX : (remaining[0] === '1' ? p1 : p2)) >=
                           (remaining[1] === 'X' ? pX : (remaining[1] === '1' ? p1 : p2)) ? remaining[0] : remaining[1];
        if (p.resultadoSigno === topSign || p.resultadoSigno === secondSign) {
          isDoubleHit = true;
        }
      }

      if (isDoubleHit) hitsDoubles++;

      details.push({
        num: p.numeroCasilla,
        match: `${p.equipoLocal} vs ${p.equipoVisitante}`,
        real: p.resultadoSigno!,
        pred: doubleMatchIds.has(p.id) ? `${topSign}*` : topSign,
        isHitDirect: isDirectHit,
        isHitDoubles: isDoubleHit
      });
    }

    totalDirectHits += hitsDirect;
    totalDoublesHits += hitsDoubles;

    if (hitsDoubles >= 10) count10++;
    if (hitsDoubles >= 11) count11++;
    if (hitsDoubles >= 12) count12++;
    if (hitsDoubles >= 13) count13++;
    if (hitsDoubles >= 14) count14++;

    const p15 = j.partidos.find(p => p.numeroCasilla === 15);
    jornadasData.push({
      numero: j.numero,
      hitsDirect,
      hitsDoubles,
      plenoReal: p15?.resultadoSigno || 'N/A',
      details
    });
  }

  return {
    seasonCode,
    totalJornadas: validJornadas,
    totalMatches: validJornadas * 14,
    directHitsAvg: validJornadas > 0 ? Number((totalDirectHits / validJornadas).toFixed(2)) : 0,
    doublesHitsAvg: validJornadas > 0 ? Number((totalDoublesHits / validJornadas).toFixed(2)) : 0,
    jornadasWith10Plus: count10,
    jornadasWith11Plus: count11,
    jornadasWith12Plus: count12,
    jornadasWith13Plus: count13,
    jornadasWith14Plus: count14,
    topJornadas: jornadasData.sort((a, b) => b.hitsDoubles - a.hitsDoubles).slice(0, 5)
  };
}

async function main() {
  console.log('🔍 Ejecutando análisis de predicciones y tasas de acierto en las quinielas...\n');

  const report2324 = await analyzeSeason('2023-2024');
  const report2425 = await analyzeSeason('2024-2025');

  const printReport = (r: SeasonReport) => {
    console.log(`========================================================================`);
    console.log(`🏆 TEMPORADA ${r.seasonCode} (${r.totalJornadas} Jornadas Completas, ${r.totalMatches} Partidos)`);
    console.log(`========================================================================`);
    console.log(`📊 Aciertos Medios por Jornada:`);
    console.log(`   - Pronóstico Simple (14 fijos): ${r.directHitsAvg}/14 aciertos (${((r.directHitsAvg / 14) * 100).toFixed(1)}%)`);
    console.log(`   - Estrategia IA (10 Fijos + 4 Dobles de Valor): ${r.doublesHitsAvg}/14 aciertos (${((r.doublesHitsAvg / 14) * 100).toFixed(1)}%)`);
    console.log(`\n🎟️ Desglose de Categorías de Premio Alcanzadas:`);
    console.log(`   - Jornadas con Premio (>= 10 aciertos): ${r.jornadasWith10Plus} de ${r.totalJornadas} (${((r.jornadasWith10Plus / r.totalJornadas) * 100).toFixed(1)}%)`);
    console.log(`   - Categoría de 11 aciertos: ${r.jornadasWith11Plus} jornadas`);
    console.log(`   - Categoría de 12 aciertos: ${r.jornadasWith12Plus} jornadas`);
    console.log(`   - Categoría de 13 aciertos: ${r.jornadasWith13Plus} jornadas`);
    console.log(`   - Categoría de 14 aciertos (Pleno al 14): ${r.jornadasWith14Plus} jornadas`);

    console.log(`\n🌟 MEJORES JORNADAS DE LA TEMPORADA:`);
    r.topJornadas.forEach((j, i) => {
      console.log(`   ${i + 1}. Jornada ${j.numero}: ${j.hitsDoubles}/14 aciertos con IA (${j.hitsDirect}/14 al directo) | Pleno 15: [${j.plenoReal}]`);
    });

    // Mostrar detalle del mejor boleto
    const best = r.topJornadas[0];
    if (best) {
      console.log(`\n📋 EJEMPLO EN DETALLE DE BOLETO GANADOR (Jornada ${best.numero} - ${best.hitsDoubles}/14 Aciertos):`);
      console.log(`-------------------------------------------------------------------------`);
      console.log(` # | Partido                             | Signo Real | Pronóstico | Acierto`);
      console.log(`-------------------------------------------------------------------------`);
      best.details.forEach(d => {
        const pName = d.match.padEnd(35, ' ');
        const check = d.isHitDoubles ? '✅ SÍ' : '❌ NO';
        console.log(` ${d.num.toString().padStart(2, ' ')}| ${pName} |     ${d.real}      |     ${d.pred.padEnd(6, ' ')} |  ${check}`);
      });
      console.log(`-------------------------------------------------------------------------\n`);
    }
  };

  if (report2425 && report2425.totalJornadas > 0) printReport(report2425);
  if (report2324) printReport(report2324);

  await prisma.$disconnect();
}

main();
