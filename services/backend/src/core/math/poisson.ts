/**
 * Modelo Bivariado de Poisson & Dixon-Coles para cálculo de probabilidades 1X2.
 */

export interface GoalExpectancy {
  lambdaHome: number; // Expectativa de goles equipo local (>= 0.1)
  muAway: number;     // Expectativa de goles equipo visitante (>= 0.1)
  rho?: number;       // Parámetro de correlación Dixon-Coles (típico: -0.1 a 0.0)
}

export interface MatchProbabilities {
  prob1: number;      // Probabilidad de victoria local (0 a 1)
  probX: number;      // Probabilidad de empate (0 a 1)
  prob2: number;      // Probabilidad de victoria visitante (0 a 1)
  matrix: number[][]; // Matriz de probabilidades de marcador exacto [golesLocal][golesVisitante]
  mostLikelyScore: { home: number; away: number; probability: number };
}

/**
 * Función factorial memoizada para números pequeños (0 a 12 goles).
 */
const FACTORIAL_CACHE: number[] = [1, 1, 2, 6, 24, 120, 720, 5040, 40320, 362880, 3628800, 39916800, 479001600];

function factorial(n: number): number {
  if (n < 0) return 1;
  if (n < FACTORIAL_CACHE.length) return FACTORIAL_CACHE[n];
  let res = FACTORIAL_CACHE[FACTORIAL_CACHE.length - 1];
  for (let i = FACTORIAL_CACHE.length; i <= n; i++) res *= i;
  return res;
}

/**
 * Función de densidad de probabilidad (PMF) de Poisson:
 * P(k; lambda) = (lambda^k * e^(-lambda)) / k!
 */
export function poissonPmf(k: number, lambda: number): number {
  if (k < 0 || lambda <= 0) return 0;
  return (Math.pow(lambda, k) * Math.exp(-lambda)) / factorial(k);
}

/**
 * Factor de ajuste Dixon-Coles tau(x, y, lambda, mu, rho) para marcadores bajos:
 * tau(0, 0) = 1 - (lambda * mu * rho)
 * tau(0, 1) = 1 + (lambda * rho)
 * tau(1, 0) = 1 + (mu * rho)
 * tau(1, 1) = 1 - rho
 * tau(x, y) = 1 en otros casos.
 */
function dixonColesTau(x: number, y: number, lambda: number, mu: number, rho: number): number {
  if (rho === 0) return 1.0;
  if (x === 0 && y === 0) return 1 - lambda * mu * rho;
  if (x === 0 && y === 1) return 1 + lambda * rho;
  if (x === 1 && y === 0) return 1 + mu * rho;
  if (x === 1 && y === 1) return 1 - rho;
  return 1.0;
}

/**
 * Calcula las probabilidades 1X2 y la matriz de marcadores exactos hasta maxGoals (default: 8).
 */
export function calculateMatchProbabilities(
  input: GoalExpectancy,
  maxGoals: number = 7
): MatchProbabilities {
  const lambda = Math.max(0.05, input.lambdaHome);
  const mu = Math.max(0.05, input.muAway);
  const rho = input.rho ?? -0.05; // -0.05 es un sesgo típico empírico en ligas europeas

  let prob1 = 0;
  let probX = 0;
  let prob2 = 0;

  const matrix: number[][] = [];
  let maxScoreProb = -1;
  let bestScore = { home: 0, away: 0, probability: 0 };

  for (let x = 0; x <= maxGoals; x++) {
    matrix[x] = [];
    const pX = poissonPmf(x, lambda);

    for (let y = 0; y <= maxGoals; y++) {
      const pY = poissonPmf(y, mu);
      const tau = dixonColesTau(x, y, lambda, mu, rho);
      const scoreProb = Math.max(0, pX * pY * tau);

      matrix[x][y] = scoreProb;

      if (scoreProb > maxScoreProb) {
        maxScoreProb = scoreProb;
        bestScore = { home: x, away: y, probability: scoreProb };
      }

      if (x > y) prob1 += scoreProb;
      else if (x === y) probX += scoreProb;
      else prob2 += scoreProb;
    }
  }

  // Normalizar la suma a 1.0 (para absorber la cola residual de marcadores > maxGoals)
  const total = prob1 + probX + prob2;
  const norm1 = prob1 / total;
  const normX = probX / total;
  const norm2 = prob2 / total;

  return {
    prob1: Number(norm1.toFixed(4)),
    probX: Number(normX.toFixed(4)),
    prob2: Number(norm2.toFixed(4)),
    matrix,
    mostLikelyScore: bestScore
  };
}
