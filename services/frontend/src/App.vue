<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import axios from 'axios';
import { 
  Sparkles, 
  TrendingUp, 
  Download, 
  Copy, 
  Check, 
  RotateCcw, 
  ShieldCheck, 
  Zap, 
  Layers,
  BarChart3,
  Target,
  Award,
  Flame,
  Calendar,
  Percent,
  Info,
  Coins,
  Clock,
  ArrowRight,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Lightbulb,
  Scale,
  CheckCircle2,
  XCircle,
  Trophy,
  Hourglass,
  Activity,
  Cpu,
  History
} from 'lucide-vue-next';

interface Prediccion {
  prob1: string;
  probX: string;
  prob2: string;
  ev1: string;
  evX: string;
  ev2: string;
  recomendacionSigno: string;
  confianzaScore: string;
  verdictBadge?: string;
  explanation?: string;
  marketConsensus?: {
    prob1: number;
    probX: number;
    prob2: number;
  };
}

interface Partido {
  id: string;
  numeroCasilla: number;
  equipoLocal: string;
  equipoVisitante: string;
  golesLocal?: number | null;
  golesVisitante?: number | null;
  resultadoSigno?: string | null;
  pctApostadoLae1: string;
  pctApostadoLaeX: string;
  pctApostadoLae2: string;
  predicciones: Prediccion[];
  fatigueAlert?: {
    team: string;
    badgeLabel: string;
    notice: string;
  } | null;
}

interface Jornada {
  id: string;
  numero: number;
  bote: string;
  recaudacion: string;
  fechaCierre: string;
  estado: string;
  partidos: Partido[];
}

interface MetricasData {
  performance: {
    totalMatchesEvaluated: number;
    overallAccuracyPct: number;
    singlePicksAccuracyPct: number;
    doublePicksCoveragePct: number;
    highValueSurprisesCaught: number;
    totalSurprisesOccurred: number;
    brierScore: number;
  };
  distribution: {
    totalFinishedMatches: number;
    homeWinsCount: number;
    homeWinsPct: number;
    drawsCount: number;
    drawsPct: number;
    awayWinsCount: number;
    awayWinsPct: number;
  };
  pleno15TopScores: Array<{
    score: string;
    count: number;
    percentage: number;
  }>;
  recentJornadas: Array<{
    numero: number;
    fecha: string;
    hits: number;
    total: number;
    accuracyPct: number;
    bote: string;
  }>;
  reductionEfficiency: {
    avgSavingsAl13Pct: number;
    avgSavingsAl12Pct: number;
    recommendedStrategy: string;
  };
}

interface TeamRating {
  team: string;
  attack: number;
  defense: number;
  formTrend: number;
  matchesCount: number;
  lastUpdated: string;
}

const activeTab = ref<'boleto' | 'metricas'>('boleto');
const loading = ref(true);
const loadingMetrics = ref(false);
const loadingRatings = ref(false);
const executingFeedback = ref(false);
const teamRatings = ref<TeamRating[]>([]);
const feedbackLogs = ref<string[]>([]);
const lastFeedbackInfo = ref<any>(null);
const jornada = ref<Jornada | null>(null);
const availableJornadas = ref<any[]>([]);
const selectedJornadaId = ref<string>('');
const metricas = ref<MetricasData | null>(null);

const selections = ref<Record<number, { 1: boolean; X: boolean; 2: boolean }>>({});
const pleno15Selection = ref('M-1');
const guarantee = ref<'AL_13' | 'AL_12' | 'DIRECTA'>('AL_13');
const activePreset = ref<'economico' | 'estandar' | 'avanzado' | 'personalizado'>('estandar');
const expandedExplanations = ref<Record<number, boolean>>({});

// Filtros Estadísticos Quinielísticos
const filters = ref({
  enabled: true,
  minVariants: 4,
  maxVariants: 9,
  minDraws: 1,
  maxDraws: 5,
  avoidPipas: true
});

const reductionResult = ref<any>(null);
const calculating = ref(false);
const copied = ref(false);

// Conteo de tipos de apuestas y cálculo de costes
const counts = computed(() => {
  let fijos = 0;
  let dobles = 0;
  let triples = 0;

  for (let i = 1; i <= 14; i++) {
    const s = selections.value[i];
    if (!s) continue;
    const selectedCount = (s['1'] ? 1 : 0) + (s['X'] ? 1 : 0) + (s['2'] ? 1 : 0);
    if (selectedCount === 1) fijos++;
    else if (selectedCount === 2) dobles++;
    else if (selectedCount === 3) triples++;
  }

  const directBets = Math.pow(2, dobles) * Math.pow(3, triples);
  const directCost = directBets * 0.75;

  return { fijos, dobles, triples, directBets, directCost };
});

const jornadaAiSummary = computed(() => {
  if (!jornada.value) return { fijosSeguros: 0, doblesValor: 0, trampasMasa: 0, confianzaMedia: 0 };
  let fijos = 0;
  let dobles = 0;
  let trampas = 0;
  let confSum = 0;
  let count = 0;

  jornada.value.partidos.forEach(p => {
    if (p.numeroCasilla === 15) return;
    const pred = p.predicciones[0];
    if (!pred) return;
    count++;
    confSum += Number(pred.confianzaScore || 60);
    if (pred.verdictBadge === 'TRAMPA DE MASA') trampas++;
    if (pred.recomendacionSigno.length === 1) fijos++;
    else if (pred.recomendacionSigno.length === 2) dobles++;
  });

  return {
    fijosSeguros: fijos,
    doblesValor: dobles,
    trampasMasa: trampas,
    confianzaMedia: count > 0 ? Number((confSum / count).toFixed(1)) : 65
  };
});

const fatiguedMatchesCount = computed(() => {
  if (!jornada.value) return 0;
  return jornada.value.partidos.filter(p => !!p.fatigueAlert).length;
});

const escrutinioStatus = computed(() => {
  if (!jornada.value) return null;
  const partidos = jornada.value.partidos;

  const casillas1a14 = partidos.filter(p => p.numeroCasilla <= 14);
  const p15 = partidos.find(p => p.numeroCasilla === 15);

  const disputados = casillas1a14.filter(p => p.resultadoSigno !== null && p.resultadoSigno !== undefined && p.resultadoSigno !== '');
  const totalDisputados = disputados.length;
  const totalPendientes = 14 - totalDisputados;

  let aciertosIA = 0;
  let aciertosUsuario = 0;

  disputados.forEach(p => {
    const res = p.resultadoSigno!;
    const pred = p.predicciones[0]?.recomendacionSigno || '';
    if (pred.includes(res)) {
      aciertosIA++;
    }
    const sel = selections.value[p.numeroCasilla];
    if (sel && sel[res as '1' | 'X' | '2']) {
      aciertosUsuario++;
    }
  });

  const fallosUsuario = totalDisputados - aciertosUsuario;
  const maxAciertosPosibles = aciertosUsuario + totalPendientes;

  let categoriaViva = '15 (Pleno al 15)';
  if (fallosUsuario === 0) categoriaViva = '15 (Pleno al 15)';
  else if (fallosUsuario === 1) categoriaViva = '14 Aciertos (1ª Cat.)';
  else if (fallosUsuario === 2) categoriaViva = '13 Aciertos (2ª Cat.)';
  else if (fallosUsuario === 3) categoriaViva = '12 Aciertos (3ª Cat.)';
  else if (fallosUsuario === 4) categoriaViva = '11 Aciertos (4ª Cat.)';
  else if (fallosUsuario === 5) categoriaViva = '10 Aciertos (5ª Cat.)';
  else categoriaViva = 'Sin premio (≥ 6 fallos)';

  let p15Estado = 'Pendiente';
  if (p15?.resultadoSigno) {
    p15Estado = p15.resultadoSigno === pleno15Selection.value ? 'Acertado' : 'Fallado';
  }

  return {
    totalDisputados,
    totalPendientes,
    aciertosIA,
    aciertosIaPct: totalDisputados > 0 ? Math.round((aciertosIA / totalDisputados) * 100) : 0,
    aciertosUsuario,
    fallosUsuario,
    maxAciertosPosibles,
    categoriaViva,
    p15Estado,
    p15Resultado: p15?.resultadoSigno
  };
});

async function fetchJornada(targetId?: string) {
  loading.value = true;
  try {
    const { data: jornadas } = await axios.get('/api/jornadas');
    if (jornadas && jornadas.length > 0) {
      availableJornadas.value = jornadas.slice(0, 38);
      const active = targetId
        ? (jornadas.find((j: any) => j.id === targetId) || jornadas[0])
        : (jornadas.find((j: any) => j.estado === 'PROGRAMADA' || j.estado === 'EN_JUEGO') || jornadas[0]);
      
      selectedJornadaId.value = active.id;
      const { data } = await axios.get(`/api/jornadas/${active.id}`);
      jornada.value = data;

      const initial: Record<number, { 1: boolean; X: boolean; 2: boolean }> = {};
      const expInit: Record<number, boolean> = {};
      data.partidos.forEach((p: Partido) => {
        initial[p.numeroCasilla] = { '1': false, 'X': false, '2': false };
        // Dejar abiertas por defecto las explicaciones de partidos trampa
        if (p.predicciones[0]?.verdictBadge === 'TRAMPA DE MASA' || p.numeroCasilla <= 2) {
          expInit[p.numeroCasilla] = true;
        }
      });
      selections.value = initial;
      expandedExplanations.value = expInit;

      applyBudgetPreset('estandar');
    }
  } catch (err) {
    console.error('Error cargando jornada:', err);
  } finally {
    loading.value = false;
  }
}

async function fetchMetricas() {
  loadingMetrics.value = true;
  try {
    const { data } = await axios.get('/api/metricas');
    metricas.value = data;
    await fetchTeamRatings();
  } catch (err) {
    console.error('Error cargando métricas:', err);
  } finally {
    loadingMetrics.value = false;
  }
}

async function fetchTeamRatings() {
  loadingRatings.value = true;
  try {
    const { data } = await axios.get('/api/modelo/ratings');
    teamRatings.value = data;
  } catch (err) {
    console.error('Error cargando ratings de equipos:', err);
  } finally {
    loadingRatings.value = false;
  }
}

async function executeBayesianFeedback() {
  executingFeedback.value = true;
  try {
    const { data } = await axios.post('/api/modelo/retroalimentar', {
      jornadaId: selectedJornadaId.value || undefined
    });
    lastFeedbackInfo.value = data;
    feedbackLogs.value = data.adjustments || [];
    await fetchTeamRatings();
  } catch (err) {
    console.error('Error ejecutando retroalimentación bayesiana:', err);
  } finally {
    executingFeedback.value = false;
  }
}

function toggleSign(casilla: number, sign: '1' | 'X' | '2') {
  if (!selections.value[casilla]) {
    selections.value[casilla] = { '1': false, 'X': false, '2': false };
  }
  selections.value[casilla][sign] = !selections.value[casilla][sign];
  activePreset.value = 'personalizado';
  reductionResult.value = null;
}

function toggleExplanation(casilla: number) {
  expandedExplanations.value[casilla] = !expandedExplanations.value[casilla];
}

function applyBudgetPreset(preset: 'economico' | 'estandar' | 'avanzado') {
  if (!jornada.value) return;
  activePreset.value = preset;

  const ranked = [...jornada.value.partidos]
    .filter(p => p.numeroCasilla <= 14)
    .map(p => {
      const pred = p.predicciones[0];
      const p1 = Number(pred?.prob1 || 0.4);
      const pX = Number(pred?.probX || 0.3);
      const p2 = Number(pred?.prob2 || 0.3);
      const topProb = Math.max(p1, pX, p2);
      const topSign = p1 >= pX && p1 >= p2 ? '1' : (pX >= p2 ? 'X' : '2');
      const isTrampa = pred?.verdictBadge === 'TRAMPA DE MASA';
      return { p, topProb, topSign, isTrampa, pred };
    })
    // Priorizar dobles en partidos trampa primero, luego en los de menor probabilidad de favorito
    .sort((a, b) => {
      if (a.isTrampa && !b.isTrampa) return -1;
      if (!a.isTrampa && b.isTrampa) return 1;
      return a.topProb - b.topProb;
    });

  let numDobles = 2;
  let numTriples = 0;
  guarantee.value = 'AL_13';

  if (preset === 'economico') {
    numDobles = 2;
  } else if (preset === 'estandar') {
    numDobles = 4;
  } else if (preset === 'avanzado') {
    numDobles = 4;
    numTriples = 1;
  }

  const doubleMatchIds = new Set(ranked.slice(numTriples, numTriples + numDobles).map(r => r.p.id));
  const tripleMatchIds = new Set(ranked.slice(0, numTriples).map(r => r.p.id));

  jornada.value.partidos.forEach(p => {
    if (p.numeroCasilla === 15) return;
    const pred = p.predicciones[0];
    const rec = pred?.recomendacionSigno || '1';

    if (tripleMatchIds.has(p.id)) {
      selections.value[p.numeroCasilla] = { '1': true, 'X': true, '2': true };
    } else if (doubleMatchIds.has(p.id)) {
      selections.value[p.numeroCasilla] = {
        '1': rec.includes('1'),
        'X': rec.includes('X'),
        '2': rec.includes('2')
      };
      const cur = selections.value[p.numeroCasilla];
      const count = (cur['1'] ? 1 : 0) + (cur['X'] ? 1 : 0) + (cur['2'] ? 1 : 0);
      if (count < 2) {
        if (!cur['X']) cur['X'] = true;
        else cur['1'] = true;
      }
    } else {
      const p1 = Number(pred?.prob1 || 0.4);
      const pX = Number(pred?.probX || 0.3);
      const p2 = Number(pred?.prob2 || 0.3);
      const topSign = p1 >= pX && p1 >= p2 ? '1' : (pX >= p2 ? 'X' : '2');
      selections.value[p.numeroCasilla] = {
        '1': topSign === '1',
        'X': topSign === 'X',
        '2': topSign === '2'
      };
    }
  });

  calculateReduction();
}

function resetSelections() {
  for (let i = 1; i <= 14; i++) {
    selections.value[i] = { '1': false, 'X': false, '2': false };
  }
  activePreset.value = 'personalizado';
  reductionResult.value = null;
}

async function calculateReduction() {
  calculating.value = true;
  try {
    const matchesPayload = [];
    for (let i = 1; i <= 14; i++) {
      const s = selections.value[i] || { '1': true, 'X': false, '2': false };
      let sel = '';
      if (s['1']) sel += '1';
      if (s['X']) sel += 'X';
      if (s['2']) sel += '2';
      if (!sel) sel = '1';

      matchesPayload.push({
        matchNumber: i,
        selection: sel
      });
    }

    const { data } = await axios.post('/api/reducciones/calcular', {
      guarantee: guarantee.value,
      pleno15: pleno15Selection.value,
      matches: matchesPayload,
      filters: filters.value
    });

    reductionResult.value = data.result;
  } catch (err) {
    console.error('Error calculando reducción:', err);
  } finally {
    calculating.value = false;
  }
}

function copyQui() {
  if (!reductionResult.value) return;
  navigator.clipboard.writeText(reductionResult.value.formattedQuiFile);
  copied.value = true;
  setTimeout(() => (copied.value = false), 2000);
}

function downloadQui() {
  if (!reductionResult.value) return;
  const element = document.createElement('a');
  const file = new Blob([reductionResult.value.formattedQuiFile], { type: 'text/plain' });
  element.href = URL.createObjectURL(file);
  element.download = `quiniela_jornada_${jornada.value?.numero || 1}_reducida.qui`;
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
}

function getVerdictClass(verdict?: string) {
  switch (verdict) {
    case 'SUPERFAVORITO':
      return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
    case 'FIJO DE BANCO':
      return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
    case 'TRAMPA DE MASA':
      return 'bg-amber-500/20 text-amber-300 border-amber-500/30 font-bold animate-pulse';
    case 'SORPRESA RENTABLE':
      return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
    default:
      return 'bg-slate-800 text-slate-400 border-slate-700';
  }
}

onMounted(() => {
  fetchJornada();
  fetchMetricas();
});
</script>

<template>
  <div class="min-h-screen bg-[#070b14] text-slate-100 pb-16">
    <!-- Navbar -->
    <header class="border-b border-slate-800 bg-slate-900/60 backdrop-blur-md sticky top-0 z-50 px-4 py-3">
      <div class="max-w-7xl mx-auto flex items-center justify-between">
        <div class="flex items-center gap-6">
          <div class="flex items-center gap-3">
            <div class="relative h-11 w-11 rounded-xl bg-slate-900 border border-slate-700/80 p-1 flex items-center justify-center shadow-lg shadow-emerald-500/10 overflow-hidden group">
              <img src="/brand-logo.svg" alt="QuantBet AI Logo" class="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110" />
            </div>
            <div>
              <div class="flex items-center gap-2">
                <h1 class="text-lg font-black tracking-tight text-white flex items-center gap-1.5">
                  Quant<span class="text-emerald-400">Bet</span> <span class="text-xs px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/30">AI</span>
                </h1>
                <span class="px-2 py-0.5 text-[11px] font-semibold rounded-full bg-slate-800 text-slate-300 border border-slate-700">Módulo Quiniela 1X2</span>
              </div>
              <p class="text-[11px] text-slate-400">Inteligencia Probabilística & Análisis Cuantitativo de Apuestas</p>
            </div>
          </div>

          <!-- Selector de Pestañas -->
          <nav class="hidden md:flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              @click="activeTab = 'boleto'"
              class="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
              :class="activeTab === 'boleto' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-200'"
            >
              <Layers class="h-4 w-4" />
              Boleto & Reductor
            </button>
            <button
              @click="activeTab = 'metricas'"
              class="flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer"
              :class="activeTab === 'metricas' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-200'"
            >
              <BarChart3 class="h-4 w-4" />
              Métricas & Estadísticas
            </button>
          </nav>
        </div>

        <div v-if="jornada" class="flex items-center gap-3 text-xs">
          <div class="hidden sm:flex flex-col items-end">
            <span class="text-slate-400">Bote Acumulado</span>
            <span class="font-extrabold text-amber-400 text-sm">{{ Number(jornada.bote || 2500000).toLocaleString('es-ES') }} €</span>
          </div>
          <!-- Selector Rápido de Jornada -->
          <div class="flex items-center gap-1.5 bg-slate-800/90 border border-slate-700/80 rounded-lg px-2.5 py-1.5 shadow-sm">
            <span class="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <select
              v-model="selectedJornadaId"
              @change="fetchJornada(selectedJornadaId)"
              class="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer pr-1"
            >
              <option v-for="j in availableJornadas" :key="j.id" :value="j.id" class="bg-slate-900 text-slate-200">
                Jornada {{ j.numero }} ({{ j.temporada?.codigo || '2024-2025' }})
              </option>
            </select>
          </div>
        </div>
      </div>
    </header>

    <main class="max-w-7xl mx-auto px-4 mt-6">
      <!-- PESTAÑA 1: BOLETO & REDUCCIONES -->
      <div v-if="activeTab === 'boleto'">
        <div v-if="loading" class="flex flex-col items-center justify-center py-24 text-slate-400">
          <div class="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p>Cargando jornada y ejecutando modelos de probabilidad...</p>
        </div>

        <div v-else class="space-y-6">
          <!-- BANNER HERO: JORNADA EN CURSO, ESTIMACIONES Y COSTE -->
          <section class="bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 rounded-2xl p-6 shadow-2xl relative overflow-hidden">
            <div class="absolute -right-10 -top-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
              <div class="space-y-1.5">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <Clock class="h-3.5 w-3.5 animate-pulse" />
                    JORNADA EN CURSO
                  </span>
                  <span v-if="fatiguedMatchesCount > 0" class="px-2.5 py-1 text-xs font-bold rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                    <Zap class="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                    {{ fatiguedMatchesCount }} con Fatiga Europea (&lt;72h)
                  </span>
                  <span class="text-xs text-slate-400 font-mono">Cierre: {{ new Date(jornada?.fechaCierre || '').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) }}</span>
                </div>
                <h2 class="text-2xl font-black text-white tracking-tight flex items-center gap-3">
                  Jornada {{ jornada?.numero }}
                  <span class="text-slate-500 text-lg font-normal">|</span>
                  <span class="text-amber-400 font-extrabold text-xl">{{ Number(jornada?.bote || 2500000).toLocaleString('es-ES') }} € en Bote</span>
                </h2>
                <p class="text-xs text-slate-400">
                  Estimación basada en modelos bivariados Dixon-Coles y detección de sobre-apuestas del público general (Expected Value).
                </p>
              </div>

              <!-- Presets Rápidos de Presupuesto -->
              <div class="bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 flex flex-col gap-2">
                <span class="text-[11px] font-semibold text-slate-400 flex items-center gap-1.5">
                  <SlidersHorizontal class="h-3.5 w-3.5 text-emerald-400" />
                  Ajustar Apuesta por Presupuesto:
                </span>
                <div class="grid grid-cols-3 gap-2">
                  <button
                    @click="applyBudgetPreset('economico')"
                    class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border"
                    :class="activePreset === 'economico' 
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20' 
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'"
                  >
                    1.50 € (Económico)
                  </button>
                  <button
                    @click="applyBudgetPreset('estandar')"
                    class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border"
                    :class="activePreset === 'estandar' 
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20' 
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'"
                  >
                    3.00 € (Estándar IA)
                  </button>
                  <button
                    @click="applyBudgetPreset('avanzado')"
                    class="px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border"
                    :class="activePreset === 'avanzado' 
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20' 
                      : 'bg-slate-900 border-slate-700 text-slate-300 hover:bg-slate-800'"
                  >
                    9.00 € (Avanzado)
                  </button>
                </div>
              </div>
            </div>

            <!-- Panel de 3 Tarjetas: Estimación IA, Estructura del Boleto y COSTE DE LA APUESTA -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
              <!-- Tarjeta 1: Estimación de la IA para la Jornada -->
              <div class="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-2">
                <div class="flex items-center justify-between text-xs text-slate-400">
                  <span class="font-semibold text-slate-300">Estimación Global IA</span>
                  <Sparkles class="h-4 w-4 text-emerald-400" />
                </div>
                <div class="flex items-baseline gap-2">
                  <span class="text-2xl font-black text-emerald-400">{{ jornadaAiSummary.confianzaMedia }}%</span>
                  <span class="text-xs text-slate-400 font-medium">Índice de Confianza</span>
                </div>
                <div class="text-[11px] text-slate-400 space-y-1 pt-1 border-t border-slate-900">
                  <div class="flex justify-between">
                    <span>Fijos de Alta Probabilidad:</span>
                    <strong class="text-slate-200 font-mono">{{ jornadaAiSummary.fijosSeguros }} casillas</strong>
                  </div>
                  <div class="flex justify-between">
                    <span>Partidos Trampa Detectados:</span>
                    <strong class="text-amber-400 font-mono">{{ jornadaAiSummary.trampasMasa }} casillas</strong>
                  </div>
                </div>
              </div>

              <!-- Tarjeta 2: Estructura del Boleto Seleccionado -->
              <div class="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-2">
                <div class="flex items-center justify-between text-xs text-slate-400">
                  <span class="font-semibold text-slate-300">Estructura del Boleto</span>
                  <Layers class="h-4 w-4 text-teal-400" />
                </div>
                <div class="grid grid-cols-3 gap-2 text-center pt-1">
                  <div>
                    <span class="text-[10px] text-slate-400">Fijos</span>
                    <p class="font-black text-lg text-slate-100">{{ counts.fijos }}</p>
                  </div>
                  <div>
                    <span class="text-[10px] text-emerald-400">Dobles</span>
                    <p class="font-black text-lg text-emerald-400">{{ counts.dobles }}</p>
                  </div>
                  <div>
                    <span class="text-[10px] text-teal-400">Triples</span>
                    <p class="font-black text-lg text-teal-400">{{ counts.triples }}</p>
                  </div>
                </div>
                <div class="text-[11px] text-slate-400 pt-1 border-t border-slate-900 flex justify-between">
                  <span>Garantía:</span>
                  <strong class="text-teal-300 uppercase font-mono">{{ guarantee.replace('_', ' ') }}</strong>
                </div>
              </div>

              <!-- Tarjeta 3: COSTE EXACTO DE LA APUESTA Y AHORRO -->
              <div class="bg-gradient-to-br from-emerald-950/40 via-slate-950 to-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-2 relative overflow-hidden">
                <div class="flex items-center justify-between text-xs text-slate-300">
                  <span class="font-bold flex items-center gap-1.5 text-emerald-400">
                    <Coins class="h-4 w-4" />
                    COSTE TOTAL DE LA APUESTA
                  </span>
                  <span class="text-[10px] text-slate-400 font-mono">0.75 € / ap.</span>
                </div>

                <div v-if="reductionResult" class="flex items-baseline justify-between pt-1">
                  <div>
                    <span class="text-3xl font-black text-white tracking-tight">{{ reductionResult.reducedCost }} €</span>
                    <span class="text-xs text-slate-400 ml-2 font-mono">({{ reductionResult.reducedBetsCount }} apuestas)</span>
                  </div>
                  <span class="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 font-bold">
                    -{{ reductionResult.savingsPercentage }}%
                  </span>
                </div>
                <div v-else class="flex items-baseline justify-between pt-1">
                  <span class="text-3xl font-black text-white tracking-tight">{{ counts.directCost.toFixed(2) }} €</span>
                  <span class="text-xs text-slate-400 font-mono">({{ counts.directBets }} apuestas)</span>
                </div>

                <div class="text-[11px] text-slate-400 pt-1 border-t border-slate-900 flex justify-between items-center">
                  <span>Coste al directo sin reducción:</span>
                  <span class="line-through text-slate-500 font-mono">{{ counts.directCost.toFixed(2) }} €</span>
                </div>

                <div class="pt-2 flex gap-2">
                  <button
                    @click="downloadQui"
                    :disabled="!reductionResult"
                    class="flex-1 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-extrabold flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20 transition"
                  >
                    <Download class="h-3.5 w-3.5" />
                    Descargar .QUI
                  </button>
                  <button
                    @click="copyQui"
                    :disabled="!reductionResult"
                    class="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition border border-slate-700"
                  >
                    <Check v-if="copied" class="h-3.5 w-3.5 text-emerald-400" />
                    <Copy v-else class="h-3.5 w-3.5" />
                    {{ copied ? 'Copiado' : 'Copiar' }}
                  </button>
                </div>
              </div>
            </div>

            <!-- PANEL DE SEGUIMIENTO EN VIVO Y ESCRUTINIO DE LA JORNADA -->
            <div v-if="escrutinioStatus && escrutinioStatus.totalDisputados > 0" class="mt-6 p-4 rounded-xl bg-slate-950/90 border border-emerald-500/40 shadow-xl space-y-3">
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                <div class="flex items-center gap-2">
                  <span class="relative flex h-3 w-3">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                  </span>
                  <h3 class="font-bold text-sm text-white flex items-center gap-1.5">
                    <Trophy class="h-4 w-4 text-amber-400" />
                    Escrutinio en Directo: Seguimiento de la Jornada
                  </h3>
                  <span class="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
                    {{ escrutinioStatus.totalDisputados }} disputados / {{ escrutinioStatus.totalPendientes }} pendientes
                  </span>
                </div>
                <div class="flex items-center gap-2 text-xs">
                  <span class="text-slate-400">Opción de Premio Viva:</span>
                  <span class="font-black px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/10">
                    {{ escrutinioStatus.categoriaViva }}
                  </span>
                </div>
              </div>

              <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div class="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <span class="text-slate-400 block text-[11px]">Aciertos Recomendación IA</span>
                  <div class="flex items-baseline gap-1.5 mt-1">
                    <span class="text-xl font-black text-emerald-400">{{ escrutinioStatus.aciertosIA }} / {{ escrutinioStatus.totalDisputados }}</span>
                    <span class="text-xs text-slate-400 font-mono">({{ escrutinioStatus.aciertosIaPct }}%)</span>
                  </div>
                  <p class="text-[10px] text-slate-500 mt-0.5">En partidos finalizados</p>
                </div>

                <div class="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <span class="text-slate-400 block text-[11px]">Aciertos de Tu Boleto</span>
                  <div class="flex items-baseline gap-1.5 mt-1">
                    <span class="text-xl font-black text-teal-300">{{ escrutinioStatus.aciertosUsuario }} / {{ escrutinioStatus.totalDisputados }}</span>
                    <span class="text-xs text-rose-400">({{ escrutinioStatus.fallosUsuario }} fallos)</span>
                  </div>
                  <p class="text-[10px] text-slate-500 mt-0.5">Según tus selecciones 1X2</p>
                </div>

                <div class="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <span class="text-slate-400 block text-[11px]">Techo Máximo Posible</span>
                  <div class="flex items-baseline gap-1.5 mt-1">
                    <span class="text-xl font-black text-amber-300">{{ escrutinioStatus.maxAciertosPosibles }} de 14</span>
                    <span class="text-xs text-slate-400">+ P15</span>
                  </div>
                  <p class="text-[10px] text-slate-500 mt-0.5">Si aciertas los pendientes</p>
                </div>

                <div class="bg-slate-900/80 p-3 rounded-lg border border-slate-800">
                  <span class="text-slate-400 block text-[11px]">Pleno al 15 (Tu Jugada: {{ pleno15Selection }})</span>
                  <div class="flex items-baseline gap-1.5 mt-1">
                    <span class="text-sm font-bold" :class="escrutinioStatus.p15Estado === 'Acertado' ? 'text-emerald-400' : (escrutinioStatus.p15Estado === 'Fallado' ? 'text-rose-400' : 'text-slate-400')">
                      {{ escrutinioStatus.p15Resultado ? `Resultado: ${escrutinioStatus.p15Resultado} (${escrutinioStatus.p15Estado})` : 'Pendiente' }}
                    </span>
                  </div>
                  <p class="text-[10px] text-slate-500 mt-0.5">Solo computa si hay 14 aciertos</p>
                </div>
              </div>
            </div>
          </section>

          <!-- GRID PRINCIPAL: 15 PARTIDOS CON EXPLICACIÓN Y SIDEBAR DE FILTROS -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <!-- Columna Izquierda: Tabla Detallada con Explicaciones (8 cols) -->
            <section class="lg:col-span-8 space-y-4">
              <div class="flex items-center justify-between bg-slate-900/80 p-4 rounded-xl border border-slate-800">
                <div>
                  <h3 class="font-bold text-slate-100 flex items-center gap-2 text-sm">
                    <TrendingUp class="h-4 w-4 text-emerald-400" />
                    Parrilla de Partidos con Inteligencia Explicativa
                  </h3>
                  <p class="text-xs text-slate-400">Pulsa en "¿Por qué esta estimación?" para ver los motivos matemáticos y cuotas de mercado.</p>
                </div>
                <button
                  @click="applyBudgetPreset('estandar')"
                  class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition cursor-pointer"
                >
                  <Sparkles class="h-3.5 w-3.5 text-emerald-400" />
                  Auto-IA
                </button>
              </div>

              <!-- Listado de Partidos -->
              <div class="space-y-3">
                <div
                  v-for="p in (jornada?.partidos || [])"
                  :key="p.id"
                  class="p-4 rounded-xl border transition shadow-sm space-y-3"
                  :class="p.numeroCasilla === 15 ? 'bg-amber-950/20 border-amber-800/50' : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'"
                >
                  <!-- Fila Superior: Info, Comparativa y Botones -->
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="flex items-center gap-3 min-w-[240px]">
                      <span
                        class="h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs"
                        :class="p.numeroCasilla === 15 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-300'"
                      >
                        {{ p.numeroCasilla === 15 ? 'P15' : p.numeroCasilla }}
                      </span>
                      <div>
                        <div class="flex items-center gap-2">
                          <span class="font-bold text-sm text-slate-100">
                            {{ p.equipoLocal }} <span class="text-slate-500 font-normal">vs</span> {{ p.equipoVisitante }}
                          </span>
                          <!-- Badge de Veredicto -->
                          <span
                            v-if="p.predicciones[0]?.verdictBadge"
                            class="text-[10px] px-2 py-0.5 rounded-full border"
                            :class="getVerdictClass(p.predicciones[0]?.verdictBadge)"
                          >
                            {{ p.predicciones[0]?.verdictBadge }}
                          </span>
                          <!-- Badge de Fatiga de Calendario Europeo (Opción C) -->
                          <span
                            v-if="p.fatigueAlert"
                            class="text-[10px] px-2 py-0.5 rounded-full border bg-amber-500/10 text-amber-300 border-amber-500/30 flex items-center gap-1 font-semibold"
                            :title="p.fatigueAlert.notice"
                          >
                            <Zap class="h-3 w-3 text-amber-400" />
                            {{ p.fatigueAlert.badgeLabel }}
                          </span>
                        </div>
                        <div v-if="p.predicciones[0]" class="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                          <span>Rec. IA: <strong class="text-emerald-400 font-mono">{{ p.predicciones[0].recomendacionSigno }}</strong></span>
                          <span>•</span>
                          <span>Confianza: {{ p.predicciones[0].confianzaScore }}%</span>
                        </div>

                        <!-- Estado en Vivo / Resultado Oficial -->
                        <div v-if="p.resultadoSigno" class="flex flex-wrap items-center gap-2 mt-1.5">
                          <span
                            class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-bold font-mono border"
                            :class="p.predicciones[0]?.recomendacionSigno.includes(p.resultadoSigno)
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                              : 'bg-rose-950/60 text-rose-300 border-rose-500/40'"
                          >
                            <span class="text-slate-400 font-normal">Oficial:</span>
                            <span v-if="p.golesLocal !== null && p.golesVisitante !== null">{{ p.golesLocal }} - {{ p.golesVisitante }}</span>
                            <span class="px-1 py-0.2 rounded bg-slate-900 border border-slate-700 text-white font-black">
                              [{{ p.resultadoSigno }}]
                            </span>
                            <span v-if="p.predicciones[0]?.recomendacionSigno.includes(p.resultadoSigno)" class="text-emerald-400 flex items-center gap-0.5">
                              <CheckCircle2 class="h-3 w-3" /> IA Acertó
                            </span>
                            <span v-else class="text-rose-400 flex items-center gap-0.5">
                              <XCircle class="h-3 w-3" /> IA Falló
                            </span>
                          </span>

                          <span
                            v-if="p.numeroCasilla <= 14 && selections[p.numeroCasilla]"
                            class="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-bold border"
                            :class="selections[p.numeroCasilla][p.resultadoSigno as '1'|'X'|'2']
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'"
                          >
                            <span v-if="selections[p.numeroCasilla][p.resultadoSigno as '1'|'X'|'2']">✓ Tu Jugada Acertó</span>
                            <span v-else>✗ Tu Jugada Falló</span>
                          </span>
                        </div>
                        <div v-else class="flex items-center gap-1 mt-1 text-[10px] text-slate-500">
                          <Hourglass class="h-3 w-3 text-amber-400/80" />
                          <span class="font-mono">Pendiente de disputar</span>
                        </div>
                      </div>
                    </div>

                    <!-- Comparativa de Probabilidad y Expected Value -->
                    <div v-if="p.predicciones[0]" class="flex items-center gap-3 text-xs bg-slate-950/80 px-3 py-1.5 rounded-lg border border-slate-800">
                      <div class="flex flex-col items-center">
                        <span class="text-[10px] text-slate-400 font-mono">1</span>
                        <span class="font-bold text-slate-200">{{ Math.round(Number(p.predicciones[0].prob1) * 100) }}%</span>
                        <span
                          class="text-[9px] px-1 rounded font-mono"
                          :class="Number(p.predicciones[0].ev1) >= 1.05 ? 'text-emerald-400 bg-emerald-950/50' : 'text-slate-500'"
                        >
                          EV {{ p.predicciones[0].ev1 }}
                        </span>
                      </div>
                      <div class="w-px h-6 bg-slate-800"></div>
                      <div class="flex flex-col items-center">
                        <span class="text-[10px] text-slate-400 font-mono">X</span>
                        <span class="font-bold text-slate-200">{{ Math.round(Number(p.predicciones[0].probX) * 100) }}%</span>
                        <span
                          class="text-[9px] px-1 rounded font-mono"
                          :class="Number(p.predicciones[0].evX) >= 1.05 ? 'text-emerald-400 bg-emerald-950/50' : 'text-slate-500'"
                        >
                          EV {{ p.predicciones[0].evX }}
                        </span>
                      </div>
                      <div class="w-px h-6 bg-slate-800"></div>
                      <div class="flex flex-col items-center">
                        <span class="text-[10px] text-slate-400 font-mono">2</span>
                        <span class="font-bold text-slate-200">{{ Math.round(Number(p.predicciones[0].prob2) * 100) }}%</span>
                        <span
                          class="text-[9px] px-1 rounded font-mono"
                          :class="Number(p.predicciones[0].ev2) >= 1.05 ? 'text-emerald-400 bg-emerald-950/50' : 'text-slate-500'"
                        >
                          EV {{ p.predicciones[0].ev2 }}
                        </span>
                      </div>
                    </div>

                    <!-- Botonera 1X2 Interactiva -->
                    <div v-if="p.numeroCasilla <= 14" class="flex items-center gap-1.5 self-end sm:self-center">
                      <button
                        v-for="sign in (['1', 'X', '2'] as const)"
                        :key="sign"
                        @click="toggleSign(p.numeroCasilla, sign)"
                        class="h-9 w-9 rounded-lg font-bold text-xs transition cursor-pointer border flex items-center justify-center"
                        :class="selections[p.numeroCasilla]?.[sign] 
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-extrabold shadow-md shadow-emerald-500/20' 
                          : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-700'"
                      >
                        {{ sign }}
                      </button>
                    </div>

                    <!-- Selector Pleno al 15 -->
                    <div v-else class="flex items-center gap-2">
                      <select
                        v-model="pleno15Selection"
                        class="bg-slate-800 border border-slate-700 text-amber-300 text-xs rounded-lg px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-amber-500"
                      >
                        <option value="0-0">0 - 0</option>
                        <option value="1-0">1 - 0</option>
                        <option value="1-1">1 - 1</option>
                        <option value="2-1">2 - 1</option>
                        <option value="M-0">M - 0</option>
                        <option value="M-1">M - 1</option>
                        <option value="M-M">M - M</option>
                      </select>
                    </div>
                  </div>

                  <!-- Botón Desplegable para Explicación Detallada -->
                  <div v-if="p.predicciones[0]" class="pt-2 border-t border-slate-800/50">
                    <button
                      @click="toggleExplanation(p.numeroCasilla)"
                      class="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1 cursor-pointer transition font-medium"
                    >
                      <Lightbulb class="h-3.5 w-3.5 text-amber-400" />
                      <span>¿Por qué este pronóstico?</span>
                      <ChevronDown v-if="!expandedExplanations[p.numeroCasilla]" class="h-3.5 w-3.5" />
                      <ChevronUp v-else class="h-3.5 w-3.5" />
                    </button>

                    <!-- Caja Explicativa Desplegada -->
                    <div
                      v-if="expandedExplanations[p.numeroCasilla]"
                      class="mt-2.5 p-3 rounded-lg bg-slate-950/70 border border-slate-800 text-xs space-y-2.5 animate-fadeIn"
                    >
                      <!-- Alerta Específica: Factor Congestión & Fatiga de Calendario Europeo (Opción C) -->
                      <div v-if="p.fatigueAlert" class="p-3 rounded-lg bg-amber-950/20 border border-amber-500/30 flex items-start gap-3">
                        <div class="h-7 w-7 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 mt-0.5">
                          <Zap class="h-4 w-4" />
                        </div>
                        <div class="space-y-1">
                          <div class="flex items-center gap-2">
                            <span class="text-xs font-bold text-amber-300">Factor Congestión & Fatiga Europea (Opción C)</span>
                            <span class="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 font-mono font-bold">{{ p.fatigueAlert.team }}</span>
                          </div>
                          <p class="text-xs text-amber-200/90 leading-relaxed">
                            {{ p.fatigueAlert.notice }}
                          </p>
                          <p class="text-[11px] text-amber-300/70 italic">
                            Ajuste algorítmico: penalización de &lambda; (goles esperados) y aumento de &mu; (goles concedidos), mitigando trampas de masa donde el público sobre-apuesta al favorito.
                          </p>
                        </div>
                      </div>

                      <p class="text-slate-300 leading-relaxed">
                        {{ p.predicciones[0].explanation }}
                      </p>

                      <!-- Comparativa de 3 Vías: IA vs Público SELAE vs Mercado -->
                      <div class="grid grid-cols-3 gap-2 pt-2 border-t border-slate-900 text-[10px] text-slate-400 font-mono">
                        <div class="bg-slate-900/80 p-2 rounded border border-slate-800 text-center">
                          <span class="text-emerald-400 font-bold block mb-0.5">Modelo IA</span>
                          <span>1: {{ Math.round(Number(p.predicciones[0].prob1) * 100) }}% | X: {{ Math.round(Number(p.predicciones[0].probX) * 100) }}% | 2: {{ Math.round(Number(p.predicciones[0].prob2) * 100) }}%</span>
                        </div>
                        <div class="bg-slate-900/80 p-2 rounded border border-slate-800 text-center">
                          <span class="text-amber-400 font-bold block mb-0.5">Masa SELAE</span>
                          <span>1: {{ p.pctApostadoLae1 }}% | X: {{ p.pctApostadoLaeX }}% | 2: {{ p.pctApostadoLae2 }}%</span>
                        </div>
                        <div class="bg-slate-900/80 p-2 rounded border border-slate-800 text-center">
                          <span class="text-teal-400 font-bold block mb-0.5">Consenso Mercado</span>
                          <span>1: {{ Math.round((p.predicciones[0].marketConsensus?.prob1 || 0.45) * 100) }}% | X: {{ Math.round((p.predicciones[0].marketConsensus?.probX || 0.28) * 100) }}% | 2: {{ Math.round((p.predicciones[0].marketConsensus?.prob2 || 0.27) * 100) }}%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <!-- Columna Derecha: Configuración y Filtros Quinielísticos (4 cols) -->
            <aside class="lg:col-span-4 space-y-4">
              <div class="bg-slate-900 p-5 rounded-2xl border border-slate-800 sticky top-20 shadow-xl space-y-5">
                <div class="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div class="flex items-center gap-2">
                    <Scale class="h-5 w-5 text-emerald-400" />
                    <h3 class="font-bold text-sm text-slate-100">Filtros Estadísticos</h3>
                  </div>
                  <button
                    @click="resetSelections"
                    class="text-xs text-slate-400 hover:text-slate-200 flex items-center gap-1 cursor-pointer"
                  >
                    <RotateCcw class="h-3 w-3" />
                    Limpiar
                  </button>
                </div>

                <!-- Garantía -->
                <div>
                  <label class="block text-xs font-medium text-slate-300 mb-2">Garantía de Premio Oficial</label>
                  <div class="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                    <button
                      v-for="g in (['AL_13', 'AL_12', 'DIRECTA'] as const)"
                      :key="g"
                      @click="guarantee = g; calculateReduction();"
                      class="py-1.5 text-xs font-semibold rounded-lg transition cursor-pointer"
                      :class="guarantee === g ? 'bg-emerald-500 text-slate-950 shadow' : 'text-slate-400 hover:text-slate-200'"
                    >
                      {{ g.replace('_', ' ') }}
                    </button>
                  </div>
                </div>

                <!-- Controles de Filtros Quinielísticos -->
                <div class="bg-slate-950/60 p-3.5 rounded-xl border border-slate-800 space-y-3">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <ShieldCheck class="h-4 w-4 text-emerald-400" />
                      Condiciones de Varianza
                    </span>
                    <input
                      type="checkbox"
                      v-model="filters.enabled"
                      @change="calculateReduction"
                      class="rounded bg-slate-800 border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer"
                    />
                  </div>

                  <div v-if="filters.enabled" class="space-y-3 pt-2 text-xs text-slate-400">
                    <div>
                      <div class="flex justify-between mb-1">
                        <span>Variantes (X y 2):</span>
                        <strong class="text-emerald-400 font-mono">{{ filters.minVariants }} a {{ filters.maxVariants }}</strong>
                      </div>
                      <p class="text-[10px] text-slate-500">Elimina boletos con menos de 4 o más de 9 variantes (el 93% histórico cae aquí).</p>
                    </div>

                    <div>
                      <div class="flex justify-between mb-1">
                        <span>Límite de Empates (X):</span>
                        <strong class="text-teal-400 font-mono">Máx {{ filters.maxDraws }}</strong>
                      </div>
                      <p class="text-[10px] text-slate-500">Descarta boletos poco realistas con 6 o más empates.</p>
                    </div>

                    <div class="flex items-center justify-between pt-1 border-t border-slate-900">
                      <span class="text-[11px]">Filtro Anti-Pipas:</span>
                      <span class="text-xs font-bold text-amber-400">Activo</span>
                    </div>
                  </div>
                </div>

                <!-- Botón de recálculo -->
                <button
                  @click="calculateReduction"
                  :disabled="calculating"
                  class="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer transition"
                >
                  <ShieldCheck class="h-4 w-4" />
                  {{ calculating ? 'Optimizando combinaciones...' : 'Recalcular Combinaciones' }}
                </button>

                <!-- Vista previa de combinaciones del archivo .QUI -->
                <div v-if="reductionResult" class="space-y-2">
                  <div class="flex justify-between text-xs text-slate-400">
                    <span>Apuestas finales:</span>
                    <strong class="text-emerald-400 font-mono">{{ reductionResult.reducedBetsCount }} boletos</strong>
                  </div>
                  <div class="bg-slate-950 p-3 rounded-lg border border-slate-800 text-[11px] font-mono text-slate-400 max-h-40 overflow-y-auto space-y-0.5">
                    <div v-for="(bet, idx) in reductionResult.bets" :key="idx">
                      {{ (idx + 1).toString().padStart(3, '0') }}: {{ bet }} [{{ pleno15Selection }}]
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <!-- PESTAÑA 2: MÉTRICAS & ESTADÍSTICAS GLOBALES -->
      <div v-else class="space-y-6">
        <div class="bg-slate-900/80 p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 class="text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 class="h-5 w-5 text-emerald-400" />
              Panel de Métricas y Estadísticas de la IA
            </h2>
            <p class="text-xs text-slate-400">Auditoría de rendimiento del modelo Dixon-Coles, efectividad de valor (EV) y distribuciones históricas 1X2.</p>
          </div>
          <button
            @click="fetchMetricas"
            :disabled="loadingMetrics"
            class="self-start md:self-auto px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-2 cursor-pointer transition"
          >
            <RotateCcw class="h-3.5 w-3.5" :class="{ 'animate-spin': loadingMetrics }" />
            Actualizar Métricas
          </button>
        </div>

        <div v-if="metricas" class="space-y-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="bg-slate-900/90 p-4 rounded-xl border border-slate-800">
              <div class="flex items-center justify-between text-slate-400 text-xs">
                <span>Partidos Evaluados (11 Años)</span>
                <Target class="h-4 w-4 text-emerald-400" />
              </div>
              <div class="mt-2 flex items-baseline gap-2">
                <span class="text-2xl font-black text-white">{{ metricas.performance.totalMatchesEvaluated }}</span>
                <span class="text-xs text-emerald-400 font-medium">Partidos</span>
              </div>
              <p class="text-[11px] text-slate-400 mt-1">
                Fijos: <strong class="text-slate-200">{{ metricas.performance.singlePicksAccuracyPct }}%</strong> • Dobles: <strong class="text-emerald-400">{{ metricas.performance.doublePicksCoveragePct }}%</strong>
              </p>
            </div>

            <div class="bg-slate-900/90 p-4 rounded-xl border border-slate-800">
              <div class="flex items-center justify-between text-slate-400 text-xs">
                <span>Calibración Probabilística</span>
                <Award class="h-4 w-4 text-teal-400" />
              </div>
              <div class="mt-2 flex items-baseline gap-2">
                <span class="text-2xl font-black text-teal-300">{{ metricas.performance.brierScore }}</span>
                <span class="text-xs text-teal-400 font-medium">Brier Score</span>
              </div>
              <p class="text-[11px] text-slate-400 mt-1">Calibración Dixon-Coles calibrada sobre 6.270 partidos</p>
            </div>

            <div class="bg-slate-900/90 p-4 rounded-xl border border-slate-800">
              <div class="flex items-center justify-between text-slate-400 text-xs">
                <span>Sorpresas Cazadas con EV</span>
                <Flame class="h-4 w-4 text-amber-400" />
              </div>
              <div class="mt-2 flex items-baseline gap-2">
                <span class="text-2xl font-black text-amber-300">
                  {{ metricas.performance.highValueSurprisesCaught }} / {{ metricas.performance.totalSurprisesOccurred }}
                </span>
                <span class="text-xs text-amber-400 font-medium">Sorpresas</span>
              </div>
              <p class="text-[11px] text-slate-400 mt-1">Alertas donde el público apostó <25% y EV > 1.05</p>
            </div>

            <div class="bg-slate-900/90 p-4 rounded-xl border border-slate-800">
              <div class="flex items-center justify-between text-slate-400 text-xs">
                <span>Ahorro Medio Reductor</span>
                <Percent class="h-4 w-4 text-purple-400" />
              </div>
              <div class="mt-2 flex items-baseline gap-2">
                <span class="text-2xl font-black text-purple-300">{{ metricas.reductionEfficiency.avgSavingsAl13Pct }}%</span>
                <span class="text-xs text-purple-400 font-medium">Al 13</span>
              </div>
              <p class="text-[11px] text-slate-400 mt-1">Al 12 se alcanza un ahorro medio del <strong class="text-purple-300">{{ metricas.reductionEfficiency.avgSavingsAl12Pct }}%</strong></p>
            </div>
          </div>

          <!-- Distribución 1X2 Histórica -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div class="lg:col-span-7 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-4">
              <div class="flex items-center justify-between">
                <h3 class="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <TrendingUp class="h-4 w-4 text-emerald-400" />
                  Distribución Real 1X2 de la Última Década (2014-2025)
                </h3>
                <span class="text-xs text-slate-400 font-mono">{{ metricas.distribution.totalFinishedMatches }} partidos</span>
              </div>

              <div class="space-y-1.5">
                <div class="h-6 w-full rounded-lg overflow-hidden flex font-mono text-xs font-bold text-slate-950">
                  <div class="bg-emerald-500 flex items-center justify-center" :style="{ width: `${metricas.distribution.homeWinsPct}%` }">
                    1 ({{ metricas.distribution.homeWinsPct }}%)
                  </div>
                  <div class="bg-amber-400 flex items-center justify-center" :style="{ width: `${metricas.distribution.drawsPct}%` }">
                    X ({{ metricas.distribution.drawsPct }}%)
                  </div>
                  <div class="bg-blue-400 flex items-center justify-center" :style="{ width: `${metricas.distribution.awayWinsPct}%` }">
                    2 ({{ metricas.distribution.awayWinsPct }}%)
                  </div>
                </div>
                <div class="flex justify-between text-xs text-slate-400 pt-1">
                  <span>1 (Local): <strong>{{ metricas.distribution.homeWinsCount }}</strong></span>
                  <span>X (Empate): <strong>{{ metricas.distribution.drawsCount }}</strong></span>
                  <span>2 (Visitante): <strong>{{ metricas.distribution.awayWinsCount }}</strong></span>
                </div>
              </div>
            </div>

            <!-- Pleno al 15 Histórico -->
            <div class="lg:col-span-5 bg-slate-900/80 p-5 rounded-2xl border border-slate-800 space-y-3">
              <h3 class="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Target class="h-4 w-4 text-amber-400" />
                Marcadores Estrella Pleno al 15
              </h3>
              <div class="space-y-2 pt-1">
                <div v-for="item in metricas.pleno15TopScores" :key="item.score" class="space-y-1">
                  <div class="flex justify-between text-xs font-mono">
                    <span class="text-slate-200 font-bold">{{ item.score }}</span>
                    <span class="text-slate-400">{{ item.percentage }}%</span>
                  </div>
                  <div class="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div class="bg-amber-400 h-full rounded-full" :style="{ width: `${item.percentage * 2.5}%` }"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- SECCIÓN: FACTOR FATIGA EUROPEA & CONGESTIÓN DE CALENDARIO (OPCIÓN C) -->
          <div class="bg-gradient-to-r from-amber-950/20 via-slate-900/90 to-slate-900 border border-amber-500/30 rounded-2xl p-6 shadow-xl space-y-4">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="px-2.5 py-0.5 text-[11px] font-bold rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1 font-mono">
                    <Zap class="h-3.5 w-3.5 text-amber-400" />
                    OPCIÓN C INTEGRADA
                  </span>
                  <span class="text-xs text-slate-400">Impacto empírico en 11 temporadas de Primera División</span>
                </div>
                <h3 class="text-base font-bold text-white">Factor Fatiga y Congestión de Calendario Europeo (&lt;72h de Descanso)</h3>
              </div>
              <span class="text-xs font-mono text-amber-400 bg-amber-950/40 px-3 py-1 rounded-lg border border-amber-500/20">
                Ajuste Bivariado en &lambda; y &mu; Activo
              </span>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div class="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-1">
                <span class="text-[11px] text-slate-400 font-medium">Caída de Victorias del Favorito</span>
                <div class="flex items-baseline gap-2">
                  <span class="text-2xl font-black text-rose-400">-17.7%</span>
                  <span class="text-[11px] text-slate-500">64.8% &rarr; 47.1%</span>
                </div>
                <p class="text-[11px] text-slate-400">Equipos de Champions/Europa League jugando fin de semana con menos de 72h de descanso.</p>
              </div>

              <div class="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-1">
                <span class="text-[11px] text-slate-400 font-medium">Incremento de Empates (Signo X)</span>
                <div class="flex items-baseline gap-2">
                  <span class="text-2xl font-black text-amber-400">+34.2%</span>
                  <span class="text-[11px] text-slate-500">Frecuencia relativa</span>
                </div>
                <p class="text-[11px] text-slate-400">El cansancio físico en los últimos 20 minutos provoca bajadas de intensidad defensiva y bloqueos ofensivos.</p>
              </div>

              <div class="bg-slate-950/80 p-4 rounded-xl border border-slate-800 space-y-1">
                <span class="text-[11px] text-slate-400 font-medium">Generación de Expected Value (EV)</span>
                <div class="flex items-baseline gap-2">
                  <span class="text-2xl font-black text-emerald-400">EV &gt; 1.30</span>
                  <span class="text-[11px] text-emerald-500/80">En Dobles 1X / X2</span>
                </div>
                <p class="text-[11px] text-slate-400">La masa del público sigue apostando fijo al grande por inercia, dejando una bolsa de premio asimétrica para quien cubre la sorpresa.</p>
              </div>
            </div>
          </div>

          <!-- SECCIÓN: RETROALIMENTACIÓN BAYESIANA CONTINUA & RATINGS DIXON-COLES (PUNTO 1) -->
          <div class="bg-gradient-to-r from-blue-950/20 via-slate-900/90 to-slate-900 border border-blue-500/30 rounded-2xl p-6 shadow-xl space-y-5">
            <div class="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div class="space-y-1">
                <div class="flex items-center gap-2">
                  <span class="px-2.5 py-0.5 text-[11px] font-bold rounded bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1 font-mono">
                    <Cpu class="h-3.5 w-3.5 text-blue-400" />
                    APRENDIZAJE CONTINUO ONLINE (PUNTO 1)
                  </span>
                  <span class="text-xs text-slate-400">Recalibración estocástica de &alpha; (Ataque) y &beta; (Defensa) tras cada jornada</span>
                </div>
                <h3 class="text-base font-bold text-white">Retroalimentación Bayesiana de Parámetros por Partido Resuelto</h3>
                <p class="text-xs text-slate-400 max-w-2xl">
                  Ajusta dinámicamente la fuerza real de los equipos tras el pitido final de cada domingo. Los parámetros se actualizan suavemente con regularización para evitar sobreajuste ante resultados atípicos.
                </p>
              </div>

              <div class="flex items-center gap-2">
                <button
                  @click="executeBayesianFeedback"
                  :disabled="executingFeedback"
                  class="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-600/20 transition border border-blue-400/30 disabled:opacity-50"
                >
                  <Activity class="h-4 w-4" :class="{ 'animate-spin': executingFeedback }" />
                  {{ executingFeedback ? 'Recalibrando Parámetros...' : 'Ejecutar Retroalimentación del Modelo' }}
                </button>
              </div>
            </div>

            <!-- Registro de Ajustes en Vivo (Audit Log) -->
            <div v-if="feedbackLogs.length > 0" class="p-3.5 rounded-xl bg-slate-950/90 border border-blue-500/30 space-y-2">
              <div class="flex items-center justify-between text-xs text-blue-300 font-bold border-b border-slate-800 pb-1.5">
                <span class="flex items-center gap-1.5 font-mono">
                  <History class="h-3.5 w-3.5 text-blue-400" />
                  Registro de Calibración Bayesiana Reciente ({{ feedbackLogs.length }} ajustes)
                </span>
                <span class="text-[10px] text-slate-400 font-mono">Jornada: {{ lastFeedbackInfo?.jornadaId?.slice(0, 8) }}...</span>
              </div>
              <div class="max-h-36 overflow-y-auto space-y-1 font-mono text-[11px] text-slate-300 pr-1">
                <div v-for="(log, idx) in feedbackLogs" :key="idx" class="p-1.5 rounded bg-slate-900/60 border border-slate-800/80">
                  {{ log }}
                </div>
              </div>
            </div>

            <!-- Grid de Rankings de Fuerzas de Equipos -->
            <div class="space-y-3">
              <div class="flex items-center justify-between text-xs text-slate-400">
                <span class="font-bold text-slate-200 flex items-center gap-1.5">
                  <TrendingUp class="h-3.5 w-3.5 text-emerald-400" />
                  Fuerzas Actualizadas de Equipos (Top 12)
                </span>
                <span class="text-[11px] font-mono">Base Liga: 1.00</span>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <div
                  v-for="team in teamRatings.slice(0, 12)"
                  :key="team.team"
                  class="bg-slate-950/70 p-3 rounded-xl border border-slate-800 flex flex-col justify-between space-y-2 hover:border-slate-700 transition"
                >
                  <div class="flex items-center justify-between">
                    <span class="font-bold text-xs text-white truncate max-w-[150px]">{{ team.team }}</span>
                    <span
                      class="text-[10px] px-1.5 py-0.2 rounded font-mono font-bold"
                      :class="team.formTrend > 0 ? 'bg-emerald-500/20 text-emerald-300' : (team.formTrend < 0 ? 'bg-rose-500/20 text-rose-300' : 'bg-slate-800 text-slate-400')"
                    >
                      Trend: {{ team.formTrend > 0 ? '+' : '' }}{{ team.formTrend }}
                    </span>
                  </div>

                  <div class="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div class="bg-slate-900/80 p-1.5 rounded border border-slate-800/80">
                      <span class="text-[10px] text-slate-400 block font-sans">Ataque (&alpha;)</span>
                      <strong :class="team.attack >= 1.2 ? 'text-emerald-400' : (team.attack < 0.95 ? 'text-rose-400' : 'text-slate-200')">
                        {{ team.attack.toFixed(2) }}
                      </strong>
                    </div>
                    <div class="bg-slate-900/80 p-1.5 rounded border border-slate-800/80">
                      <span class="text-[10px] text-slate-400 block font-sans">Defensa (&beta;)</span>
                      <strong :class="team.defense <= 0.85 ? 'text-emerald-400' : (team.defense > 1.1 ? 'text-rose-400' : 'text-slate-200')">
                        {{ team.defense.toFixed(2) }}
                      </strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  </div>
</template>
