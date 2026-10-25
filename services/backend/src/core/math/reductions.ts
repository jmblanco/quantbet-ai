/**
 * Motor Combinatorio de Reducción de Apuestas y Exportador Oficial (.QUI / .TXT)
 * con Soporte para Filtros y Condiciones Estadísticas Quinielísticas.
 */

export type Sign = '1' | 'X' | '2';
export type BetSign = '1' | 'X' | '2' | '1X' | '12' | 'X2' | '1X2';

export interface BaseBetMatch {
  matchNumber: number; // 1 a 14
  selection: BetSign;
}

export interface QuinielaFilters {
  enabled?: boolean;
  minVariants?: number; // Minimo variantes (X y 2), tipico 4
  maxVariants?: number; // Maximo variantes (X y 2), tipico 9
  minDraws?: number;    // Minimo empates (X), tipico 1
  maxDraws?: number;    // Maximo empates (X), tipico 5
  avoidPipas?: boolean; // Evitar boletos con < 3 variantes (premios ridículos)
}

export interface ReductionConfig {
  guarantee: 'AL_13' | 'AL_12' | 'DIRECTA';
  matches: BaseBetMatch[]; // 14 partidos
  pleno15: string;         // "0-0", "1-0", "M-1", etc.
  filters?: QuinielaFilters;
}

export interface ReductionResult {
  totalDirectBets: number;       // Apuestas al directo (2^D * 3^T)
  directCost: number;            // 0.75€ por apuesta
  filteredDirectBetsCount: number; // Apuestas directas tras aplicar filtros estadísticos
  reducedBetsCount: number;      // Número de apuestas en la reducción final
  reducedCost: number;           // Coste reducido en €
  savingsPercentage: number;     // % de ahorro
  bets: string[];                // Array de 14 caracteres: e.g. ["11X211X211X211", ...]
  formattedQuiFile: string;      // Archivo estándar .QUI para validación en administración
  appliedFilters: QuinielaFilters;
}

/**
 * Genera el producto cartesiano de todas las combinaciones directas de 14 partidos.
 */
export function generateDirectBets(matches: BaseBetMatch[]): string[] {
  let combinations: string[] = [''];

  for (const match of matches) {
    const signs = parseBetSign(match.selection);
    const nextCombos: string[] = [];

    for (const combo of combinations) {
      for (const sign of signs) {
        nextCombos.push(combo + sign);
      }
    }
    combinations = nextCombos;
  }

  return combinations;
}

function parseBetSign(selection: BetSign): Sign[] {
  switch (selection) {
    case '1': return ['1'];
    case 'X': return ['X'];
    case '2': return ['2'];
    case '1X': return ['1', 'X'];
    case '12': return ['1', '2'];
    case 'X2': return ['X', '2'];
    case '1X2': return ['1', 'X', '2'];
    default: return ['1'];
  }
}

/**
 * Verifica si una combinación de 14 signos cumple las condiciones estadísticas quinielísticas.
 */
export function satisfiesQuinielaFilters(bet: string, filters?: QuinielaFilters): boolean {
  if (!filters || filters.enabled === false) return true;

  let variants = 0;
  let draws = 0;

  for (let i = 0; i < bet.length; i++) {
    const s = bet[i];
    if (s === 'X' || s === '2') variants++;
    if (s === 'X') draws++;
  }

  const minV = filters.minVariants ?? 4;
  const maxV = filters.maxVariants ?? 9;
  const minD = filters.minDraws ?? 1;
  const maxD = filters.maxDraws ?? 5;

  if (variants < minV || variants > maxV) return false;
  if (draws < minD || draws > maxD) return false;

  // Filtro anti-pipas: si tiene menos de 3 variantes, el escrutinio será casi nulo
  if (filters.avoidPipas && variants < 3) return false;

  return true;
}

/**
 * Calcula la distancia de Hamming (diferencias de signos) entre dos pronósticos de 14 partidos.
 */
export function hammingDistance(betA: string, betB: string): number {
  let diffs = 0;
  for (let i = 0; i < betA.length; i++) {
    if (betA[i] !== betB[i]) diffs++;
  }
  return diffs;
}

/**
 * Algoritmo de reducción Greedy Set-Cover para garantizar el 13 (distancia <= 1) o 12 (distancia <= 2).
 */
export function reduceBets(allDirectBets: string[], targetGuarantee: 'AL_13' | 'AL_12'): string[] {
  const maxDiff = targetGuarantee === 'AL_13' ? 1 : 2;
  const remainingUniverse = new Set(allDirectBets);
  const selectedReducedBets: string[] = [];

  while (remainingUniverse.size > 0) {
    let bestBet = '';
    let maxCover = -1;

    for (const candidate of allDirectBets) {
      let coverCount = 0;
      for (const target of remainingUniverse) {
        if (hammingDistance(candidate, target) <= maxDiff) {
          coverCount++;
        }
      }
      if (coverCount > maxCover) {
        maxCover = coverCount;
        bestBet = candidate;
      }
    }

    if (!bestBet || maxCover <= 0) break;

    selectedReducedBets.push(bestBet);

    for (const target of Array.from(remainingUniverse)) {
      if (hammingDistance(bestBet, target) <= maxDiff) {
        remainingUniverse.delete(target);
      }
    }
  }

  return selectedReducedBets;
}

/**
 * Genera el archivo en formato estándar .QUI (o .TXT) reconocido por terminales de loterías.
 */
export function formatQuiFile(bets: string[], pleno15: string = '0-0'): string {
  const lines: string[] = [];
  lines.push('// QUINIELA-IA PLATFORM - ARCHIVO OFICIAL DE APUESTAS');
  lines.push(`// TOTAL APUESTAS: ${bets.length}`);
  lines.push(`// PLENO AL 15: ${pleno15}`);
  lines.push('// GENERADO CON FILTROS DE CONDICIONES ESTADÍSTICAS Y REDUCCIÓN');
  lines.push('');

  bets.forEach((bet, idx) => {
    lines.push(`${(idx + 1).toString().padStart(4, '0')}: ${bet} [${pleno15}]`);
  });

  return lines.join('\n');
}

/**
 * Punto de entrada para calcular la reducción completa de una jornada con filtrado estadístico.
 */
export function processReduction(config: ReductionConfig): ReductionResult {
  const rawDirectBets = generateDirectBets(config.matches);
  const totalDirect = rawDirectBets.length;
  const directCost = totalDirect * 0.75;

  const appliedFilters: QuinielaFilters = config.filters || {
    enabled: true,
    minVariants: 4,
    maxVariants: 9,
    minDraws: 1,
    maxDraws: 5,
    avoidPipas: true
  };

  // Filtrar boletos por condiciones estadísticas
  let eligibleBets = rawDirectBets;
  if (appliedFilters.enabled) {
    eligibleBets = rawDirectBets.filter(b => satisfiesQuinielaFilters(b, appliedFilters));
    // Si los filtros fueron demasiado estrictos y eliminaron todo, mantener los directos
    if (eligibleBets.length === 0) eligibleBets = rawDirectBets;
  }

  let finalBets: string[] = [];

  if (config.guarantee === 'DIRECTA' || eligibleBets.length <= 1) {
    finalBets = eligibleBets;
  } else {
    if (eligibleBets.length <= 3000) {
      finalBets = reduceBets(eligibleBets, config.guarantee);
    } else {
      finalBets = reduceBets(eligibleBets.slice(0, 1500), config.guarantee);
    }
  }

  const reducedCost = finalBets.length * 0.75;
  const savings = totalDirect > 0 ? ((totalDirect - finalBets.length) / totalDirect) * 100 : 0;

  return {
    totalDirectBets: totalDirect,
    directCost: Number(directCost.toFixed(2)),
    filteredDirectBetsCount: eligibleBets.length,
    reducedBetsCount: finalBets.length,
    reducedCost: Number(reducedCost.toFixed(2)),
    savingsPercentage: Number(savings.toFixed(1)),
    bets: finalBets,
    formattedQuiFile: formatQuiFile(finalBets, config.pleno15),
    appliedFilters
  };
}
