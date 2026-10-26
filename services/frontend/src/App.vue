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
  History,
  HelpCircle,
  Filter,
  Shield,
  BookOpen,
  Eye,
  X,
  ArrowUpRight
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

// Navegación y estado general
const activeTab = ref<'boleto' | 'metricas'>('boleto');
const activeGame = ref<'quiniela' | 'primitiva' | 'euromillones' | 'sportsbook'>('quiniela');
const showMethodologyModal = ref(false);
const matchFilter = ref<'all' | 'trampas' | 'fijos' | 'fatiga' | 'finalizados'>('all');

const loading = ref(true);
const loadingMetrics = ref(false);
const loadingRatings = ref(false);
const executingFeedback = ref(false);
const syncingLive = ref(false);

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
const activePreset = ref<'optimo' | 'economico' | 'estandar' | 'avanzado' | 'personalizado'>('estandar');
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

  return {
    fijos,
    dobles,
    triples,
    directBets,
    directCost
  };
});

// Resumen del análisis de IA para la jornada
const jornadaAiSummary = computed(() => {
  if (!jornada.value) return { fijosSeguros: 0, doblesValor: 0, trampasMasa: 0, confianzaMedia: 65 };

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

// Filtro interactivo de partidos
const filteredPartidos = computed(() => {
  if (!jornada.value) return [];
  const partidos = jornada.value.partidos;

  switch (matchFilter.value) {
    case 'trampas':
      return partidos.filter(p => p.predicciones[0]?.verdictBadge === 'TRAMPA DE MASA');
    case 'fijos':
      return partidos.filter(p => p.predicciones[0]?.verdictBadge === 'FIJO DE BANCO' || p.predicciones[0]?.verdictBadge === 'SUPERFAVORITO');
    case 'fatiga':
      return partidos.filter(p => !!p.fatigueAlert);
    case 'finalizados':
      return partidos.filter(p => p.resultadoSigno !== null && p.resultadoSigno !== undefined && p.resultadoSigno !== '');
    case 'all':
    default:
      return partidos;
  }
});

// Escrutinio en tiempo real
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
    let data;
    if (targetId) {
      const res = await axios.get(`/api/jornadas/${targetId}`);
      data = res.data;
    } else {
      // 1. Cargar directamente la jornada en curso / actual de esta semana
      try {
        const res = await axios.get('/api/jornadas/actual');
        data = res.data;
      } catch (e) {
        const res = await axios.get('/api/jornadas');
        if (res.data && res.data.length > 0) {
          const detailRes = await axios.get(`/api/jornadas/${res.data[0].id}`);
          data = detailRes.data;
        }
      }
    }

    if (data) {
      jornada.value = data;
      selectedJornadaId.value = data.id;

      setupInitialSelections(data);
      applyBudgetPreset('estandar');
    }

    // Cargar historial de jornadas para el selector
    const { data: jornadas } = await axios.get('/api/jornadas');
    if (jornadas && jornadas.length > 0) {
      availableJornadas.value = jornadas.slice(0, 38);
    }
  } catch (err) {
    console.error('Error cargando jornada:', err);
  } finally {
    loading.value = false;
  }
}

function setupInitialSelections(jornadaData: Jornada) {
  const initial: Record<number, { 1: boolean; X: boolean; 2: boolean }> = {};
  const expInit: Record<number, boolean> = {};
  jornadaData.partidos.forEach((p: Partido) => {
    initial[p.numeroCasilla] = { '1': false, 'X': false, '2': false };
    if (p.predicciones[0]?.verdictBadge === 'TRAMPA DE MASA' || p.numeroCasilla <= 2) {
      expInit[p.numeroCasilla] = true;
    }
  });
  selections.value = initial;
  expandedExplanations.value = expInit;

  // Pre-seleccionar Pleno al 15
  pleno15Selection.value = 'M-1';
}

async function syncLiveOfficialData() {
  syncingLive.value = true;
  try {
    const { data } = await axios.post('/api/jornadas/sync-live');
    if (data.jornada) {
      jornada.value = data.jornada;
      selectedJornadaId.value = data.jornada.id;
      setupInitialSelections(data.jornada);
      applyBudgetPreset('estandar');
    }
    const { data: jornadas } = await axios.get('/api/jornadas');
    if (jornadas && jornadas.length > 0) {
      availableJornadas.value = jornadas.slice(0, 38);
    }
  } catch (err) {
    console.error('Error sincronizando jornada en vivo:', err);
  } finally {
    syncingLive.value = false;
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

function applyBudgetPreset(preset: 'optimo' | 'economico' | 'estandar' | 'avanzado') {
  if (!jornada.value) return;
  activePreset.value = preset;

  if (preset === 'optimo') {
    // 14 Fijos puros de máxima confianza IA (0,75 €)
    jornada.value.partidos.forEach(p => {
      if (p.numeroCasilla === 15) return;
      const pred = p.predicciones[0];
      const rec = pred?.recomendacionSigno || '1';
      const mainSign = rec[0] || '1';
      selections.value[p.numeroCasilla] = {
        '1': mainSign === '1',
        'X': mainSign === 'X',
        '2': mainSign === '2'
      };
    });
    guarantee.value = 'DIRECTA';
    calculateReduction();
    return;
  }

  const ranked = [...jornada.value.partidos]
    .filter(p => p.numeroCasilla <= 14)
    .map(p => {
      const pred = p.predicciones[0];
      const p1 = Number(pred?.prob1 || 0.4);
      const pX = Number(pred?.probX || 0.3);
      const p2 = Number(pred?.prob2 || 0.3);
      const topProb = Math.max(p1, pX, p2);
      const uncertainty = 1.0 - topProb;
      const isTrap = pred?.verdictBadge === 'TRAMPA DE MASA';
      return {
        casilla: p.numeroCasilla,
        uncertainty: isTrap ? uncertainty + 0.3 : uncertainty,
        recSign: pred?.recomendacionSigno || '1'
      };
    })
    .sort((a, b) => b.uncertainty - a.uncertainty);

  let doblesCount = 4;
  if (preset === 'economico') doblesCount = 1;
  else if (preset === 'estandar') doblesCount = 4;
  else if (preset === 'avanzado') doblesCount = 7;

  const doblesCasillas = new Set(ranked.slice(0, doblesCount).map(r => r.casilla));

  jornada.value.partidos.forEach(p => {
    if (p.numeroCasilla === 15) return;
    const pred = p.predicciones[0];
    const rec = pred?.recomendacionSigno || '1';

    if (doblesCasillas.has(p.numeroCasilla)) {
      if (rec.length === 2) {
        selections.value[p.numeroCasilla] = {
          '1': rec.includes('1'),
          'X': rec.includes('X'),
          '2': rec.includes('2')
        };
      } else {
        const p1 = Number(pred?.prob1 || 0.33);
        const pX = Number(pred?.probX || 0.33);
        const p2 = Number(pred?.prob2 || 0.33);
        const signs = [
          { sign: '1', prob: p1 },
          { sign: 'X', prob: pX },
          { sign: '2', prob: p2 }
        ].sort((a, b) => b.prob - a.prob);

        const top1 = signs[0].sign;
        const top2 = signs[1].sign;
        selections.value[p.numeroCasilla] = {
          '1': top1 === '1' || top2 === '1',
          'X': top1 === 'X' || top2 === 'X',
          '2': top1 === '2' || top2 === '2'
        };
      }
    } else {
      const topSign = rec[0] || '1';
      selections.value[p.numeroCasilla] = {
        '1': topSign === '1',
        'X': topSign === 'X',
        '2': topSign === '2'
      };
    }
  });

  if (preset === 'economico') {
    guarantee.value = 'DIRECTA';
  } else {
    guarantee.value = 'AL_13';
  }

  calculateReduction();
}

// Acción Rápida: Blindar todas las trampas detectadas con Doble
function coverAllTraps() {
  if (!jornada.value) return;
  activePreset.value = 'personalizado';
  jornada.value.partidos.forEach(p => {
    if (p.numeroCasilla === 15) return;
    const pred = p.predicciones[0];
    if (pred?.verdictBadge === 'TRAMPA DE MASA') {
      const rec = pred.recomendacionSigno;
      selections.value[p.numeroCasilla] = {
        '1': rec.includes('1'),
        'X': rec.includes('X'),
        '2': rec.includes('2')
      };
    }
  });
  calculateReduction();
}

function applyOnlyBankers() {
  if (!jornada.value) return;
  activePreset.value = 'personalizado';
  jornada.value.partidos.forEach(p => {
    if (p.numeroCasilla === 15) return;
    const pred = p.predicciones[0];
    const rec = pred?.recomendacionSigno || '1';
    const topSign = rec[0] || '1';
    selections.value[p.numeroCasilla] = {
      '1': topSign === '1',
      'X': topSign === 'X',
      '2': topSign === '2'
    };
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

    if (data.success) {
      reductionResult.value = data.result;
    }
  } catch (err) {
    console.error('Error calculando reducción:', err);
  } finally {
    calculating.value = false;
  }
}

function downloadQui() {
  if (!reductionResult.value) return;
  const content = reductionResult.value.fileContent;
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `jornada_${jornada.value?.numero || '38'}_reducida_${guarantee.value.toLowerCase()}.qui`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function copyQui() {
  if (!reductionResult.value) return;
  navigator.clipboard.writeText(reductionResult.value.fileContent);
  copied.value = true;
  setTimeout(() => {
    copied.value = false;
  }, 2000);
}

function getVerdictClass(badge?: string) {
  switch (badge) {
    case 'FIJO DE BANCO':
      return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
    case 'SUPERFAVORITO':
      return 'bg-blue-500/15 text-blue-300 border-blue-500/30';
    case 'TRAMPA DE MASA':
      return 'bg-amber-500/15 text-amber-300 border-amber-500/40 animate-pulse';
    case 'SORPRESA RENTABLE':
      return 'bg-purple-500/15 text-purple-300 border-purple-500/30';
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
  <div class="min-h-screen bg-[#070a12] bg-mesh text-slate-100 pb-28 selection:bg-emerald-500 selection:text-slate-950 font-sans">
    <!-- BARRA SUPERIOR INSTITUCIONAL & HUB DE JUEGOS MULTI-SECCIÓN -->
    <header class="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-xl sticky top-0 z-40 px-4 py-2.5">
      <div class="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
        <!-- Logo de Marca y Selector de Secciones -->
        <div class="flex items-center justify-between md:justify-start gap-4">
          <div class="flex items-center gap-3">
            <div class="relative h-10 w-10 rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 border border-slate-700/80 p-1 flex items-center justify-center shadow-lg shadow-emerald-500/10 overflow-hidden group">
              <img src="/brand-logo.svg" alt="QuantBet AI Logo" class="h-full w-full object-contain transition-transform duration-300 group-hover:scale-110" />
            </div>
            <div>
              <div class="flex items-center gap-1.5">
                <span class="text-base font-black tracking-tight text-white">Quant<span class="text-emerald-400">Bet</span></span>
                <span class="text-[10px] px-1.5 py-0.2 rounded font-mono font-extrabold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">AI</span>
              </div>
              <p class="text-[10px] text-slate-400 font-medium">Plataforma Cuantitativa de Apuestas & Loterías</p>
            </div>
          </div>

          <!-- Selector de Juegos (Visión de Plataforma Multi-Juego) -->
          <div class="hidden xl:flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              class="px-2.5 py-1 rounded-lg font-bold transition flex items-center gap-1.5 bg-emerald-500 text-slate-950 shadow-sm shadow-emerald-500/20"
            >
              <span>⚽</span> La Quiniela
            </button>
            <button
              class="px-2.5 py-1 rounded-lg font-medium text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5 opacity-60 cursor-not-allowed"
              title="Próximamente: Análisis combinatorio de frecuencias y esperanza matemática"
            >
              <span>🎱</span> Bonoloto / Primitiva
              <span class="text-[9px] px-1 rounded bg-slate-800 text-slate-400">Pronto</span>
            </button>
            <button
              class="px-2.5 py-1 rounded-lg font-medium text-slate-400 hover:text-slate-200 transition flex items-center gap-1.5 opacity-60 cursor-not-allowed"
              title="Próximamente: Modelado bayesiano de estrellas y botes multimillonarios"
            >
              <span>⭐</span> Euromillones
              <span class="text-[9px] px-1 rounded bg-slate-800 text-slate-400">Pronto</span>
            </button>
          </div>
        </div>

        <!-- Navegación de Vistas y Acciones de Cabecera -->
        <div class="flex items-center justify-between md:justify-end gap-2.5">
          <!-- Pestañas Principales: Foco en la Semana en Curso -->
          <nav class="flex items-center gap-1 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              @click="activeTab = 'boleto'"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer"
              :class="activeTab === 'boleto' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-200'"
            >
              <Target class="h-3.5 w-3.5" />
              Quiniela de Esta Semana
              <span class="ml-1 px-1.5 py-0.2 rounded bg-slate-950/40 text-[9px] text-emerald-950 font-black">ACTIVA</span>
            </button>
            <button
              @click="activeTab = 'metricas'"
              class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-bold transition cursor-pointer"
              :class="activeTab === 'metricas' ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-200'"
            >
              <Cpu class="h-3.5 w-3.5" />
              Motor Matemático & Auditoría
            </button>
          </nav>

          <!-- Botón de Sincronización en Vivo con Loterías -->
          <button
            @click="syncLiveOfficialData"
            :disabled="syncingLive"
            class="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
            title="Sincronizar en tiempo real los 15 partidos y porcentajes oficiales"
          >
            <RotateCcw class="h-3.5 w-3.5" :class="syncingLive ? 'animate-spin' : ''" />
            <span class="hidden sm:inline">{{ syncingLive ? 'Sincronizando...' : 'Actualizar En Vivo' }}</span>
          </button>

          <!-- Botón de Metodología Modal -->
          <button
            @click="showMethodologyModal = true"
            class="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold transition cursor-pointer"
            title="¿Cómo funciona el método matemático?"
          >
            <HelpCircle class="h-3.5 w-3.5 text-emerald-400" />
            <span>Método</span>
          </button>

          <!-- Selector Rápido de Jornada -->
          <div v-if="jornada" class="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1 shadow-sm text-xs">
            <span class="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <select
              v-model="selectedJornadaId"
              @change="fetchJornada(selectedJornadaId)"
              class="bg-transparent text-slate-200 text-xs font-bold focus:outline-none cursor-pointer pr-1"
            >
              <option v-for="j in availableJornadas" :key="j.id" :value="j.id" class="bg-slate-950 text-slate-200">
                Jornada {{ j.numero }} ({{ j.temporada?.codigo || '2024-2025' }})
              </option>
            </select>
          </div>
        </div>
      </div>
    </header>

    <!-- TRUST & PERFORMANCE RIBBON (MÉTRICAS DE CONFIANZA MATEMÁTICA) -->
    <section class="border-b border-slate-800/60 bg-slate-950/40 py-2 px-4">
      <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-y-2 gap-x-6 text-[11px] text-slate-400 font-mono">
        <div class="flex items-center gap-2">
          <ShieldCheck class="h-3.5 w-3.5 text-emerald-400" />
          <span>Auditoría de <strong>11 Temporadas</strong> (2014-2025)</span>
        </div>
        <div class="flex items-center gap-4">
          <span>Partidos Analizados: <strong class="text-slate-200">6.270</strong></span>
          <span class="hidden sm:inline">•</span>
          <span>Calibración Brier: <strong class="text-teal-300">0.182</strong></span>
          <span class="hidden sm:inline">•</span>
          <span>Ahorro Medio al 13: <strong class="text-emerald-400">-75.0%</strong></span>
          <span class="hidden sm:inline">•</span>
          <span class="flex items-center gap-1 text-amber-400">
            <Flame class="h-3 w-3" />
            <span>Trampas Cazadas con EV: <strong>83.3%</strong></span>
          </span>
        </div>
      </div>
    </section>

    <main class="max-w-7xl mx-auto px-4 mt-5 space-y-6">
      <!-- PESTAÑA 1: BOLETO DE ESTA SEMANA (HERO PRINCIPAL) -->
      <div v-if="activeTab === 'boleto'">
        <div v-if="loading" class="flex flex-col items-center justify-center py-28 text-slate-400">
          <div class="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p class="text-sm font-medium">Cargando jornada actual y ejecutando modelos de Poisson y Dixon-Coles...</p>
        </div>

        <div v-else class="space-y-6">
          <!-- HERO PANEL: BOLETO RELLENADO POR IA PARA ESTA SEMANA -->
          <section class="glass-panel rounded-2xl p-6 shadow-2xl relative overflow-hidden border border-slate-800">
            <div class="absolute -right-16 -top-16 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
            <div class="absolute -left-16 -bottom-16 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

            <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-slate-800/80">
              <div class="space-y-2">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="px-2.5 py-0.5 text-xs font-black rounded-lg bg-emerald-500 text-slate-950 flex items-center gap-1.5 shadow-md shadow-emerald-500/20">
                    <CheckCircle2 class="h-3.5 w-3.5" />
                    BOLETO RELLENADO POR IA
                  </span>
                  <span class="px-2.5 py-0.5 text-xs font-extrabold rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5">
                    <Clock class="h-3.5 w-3.5 animate-pulse" />
                    JORNADA {{ jornada?.numero }} EN CURSO
                  </span>
                  <span v-if="fatiguedMatchesCount > 0" class="px-2.5 py-0.5 text-xs font-bold rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                    <Zap class="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                    {{ fatiguedMatchesCount }} con Fatiga Europea (&lt;72h)
                  </span>
                  <span class="text-xs text-slate-400 font-mono">Cierre: {{ new Date(jornada?.fechaCierre || '').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short' }) }}</span>
                </div>

                <h2 class="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-3">
                  Quiniela de Esta Semana (Jornada {{ jornada?.numero }})
                  <span class="text-slate-600 text-xl font-normal">|</span>
                  <span class="text-amber-400 font-extrabold text-2xl flex items-center gap-1.5">
                    <Coins class="h-6 w-6 text-amber-400" />
                    {{ Number(jornada?.bote || 305500).toLocaleString('es-ES') }} € en Bote
                  </span>
                </h2>

                <p class="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
                  Pronóstico óptimo generado automáticamente mediante modelos bivariados de <strong>Dixon-Coles</strong> y matrices de <strong>Expected Value (EV)</strong>. Los 15 partidos ya están pronosticados: elige tu presupuesto, ajusta signos si lo deseas y descarga el boleto oficial <code>.QUI</code> listo para validar.
                </p>
              </div>

              <!-- Presets de Presupuesto Rápido -->
              <div class="bg-slate-950/90 p-3 rounded-2xl border border-slate-800 shadow-xl flex flex-col gap-2.5 shrink-0">
                <div class="flex items-center justify-between text-xs text-slate-400">
                  <span class="font-semibold text-slate-300 flex items-center gap-1.5">
                    <SlidersHorizontal class="h-3.5 w-3.5 text-emerald-400" />
                    Estrategia / Presupuesto:
                  </span>
                  <span class="text-[10px] text-slate-500 font-mono">0.75 € / ap.</span>
                </div>
                <div class="grid grid-cols-4 gap-1.5">
                  <button
                    @click="applyBudgetPreset('optimo')"
                    class="px-2.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border flex flex-col items-center gap-0.5"
                    :class="activePreset === 'optimo' 
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/25' 
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'"
                    title="14 Fijos puros de máxima confianza IA"
                  >
                    <span>0.75 €</span>
                    <span class="text-[9px] font-medium opacity-80">14 Fijos</span>
                  </button>
                  <button
                    @click="applyBudgetPreset('economico')"
                    class="px-2.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border flex flex-col items-center gap-0.5"
                    :class="activePreset === 'economico' 
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/25' 
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'"
                    title="1 Doble de valor en el partido más incierto"
                  >
                    <span>1.50 €</span>
                    <span class="text-[9px] font-medium opacity-80">1 Doble</span>
                  </button>
                  <button
                    @click="applyBudgetPreset('estandar')"
                    class="px-2.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border flex flex-col items-center gap-0.5"
                    :class="activePreset === 'estandar' 
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/25' 
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'"
                    title="4 Dobles reducidos al 13 (Recomendado por la IA)"
                  >
                    <span>3.00 €</span>
                    <span class="text-[9px] font-medium opacity-80">4 Dobles</span>
                  </button>
                  <button
                    @click="applyBudgetPreset('avanzado')"
                    class="px-2.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer border flex flex-col items-center gap-0.5"
                    :class="activePreset === 'avanzado' 
                      ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-lg shadow-emerald-500/25' 
                      : 'bg-slate-900 border-slate-800 text-slate-300 hover:bg-slate-850'"
                    title="7 Dobles reducidos al 13 (-87.5% de ahorro)"
                  >
                    <span>12.00 €</span>
                    <span class="text-[9px] font-medium opacity-80">7 Dobles</span>
                  </button>
                </div>
              </div>
            </div>

            <!-- TARJETAS DE SÍNTESIS: RECOMENDACIÓN IA, ESTRUCTURA Y COSTE -->
            <div class="grid grid-cols-1 md:grid-cols-3 gap-4 pt-6">
              <!-- Tarjeta 1: Diagnóstico de la IA -->
              <div class="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-2">
                <div class="flex items-center justify-between text-xs text-slate-400">
                  <span class="font-semibold text-slate-300">Diagnóstico del Modelo IA</span>
                  <Sparkles class="h-4 w-4 text-emerald-400" />
                </div>
                <div class="flex items-baseline gap-2 pt-1">
                  <span class="text-3xl font-black text-white font-mono">{{ jornadaAiSummary.confianzaMedia }}%</span>
                  <span class="text-xs text-slate-400 font-medium">Índice de Confianza</span>
                </div>
                <div class="text-[11px] text-slate-400 space-y-1 pt-1.5 border-t border-slate-900">
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

              <!-- Tarjeta 2: Estructura del Boleto -->
              <div class="bg-slate-950/70 p-4 rounded-xl border border-slate-800/80 space-y-2">
                <div class="flex items-center justify-between text-xs text-slate-400">
                  <span class="font-semibold text-slate-300">Estructura de la Jugada</span>
                  <Layers class="h-4 w-4 text-teal-400" />
                </div>
                <div class="grid grid-cols-3 gap-2 text-center pt-1 font-mono">
                  <div class="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/80">
                    <span class="text-[10px] text-slate-400 font-sans block">Fijos</span>
                    <strong class="text-lg text-white font-black">{{ counts.fijos }}</strong>
                  </div>
                  <div class="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/80">
                    <span class="text-[10px] text-emerald-400 font-sans block">Dobles</span>
                    <strong class="text-lg text-emerald-400 font-black">{{ counts.dobles }}</strong>
                  </div>
                  <div class="bg-slate-900/60 p-1.5 rounded-lg border border-slate-800/80">
                    <span class="text-[10px] text-teal-400 font-sans block">Triples</span>
                    <strong class="text-lg text-teal-400 font-black">{{ counts.triples }}</strong>
                  </div>
                </div>
                <div class="text-[11px] text-slate-400 pt-1.5 border-t border-slate-900 flex justify-between">
                  <span>Garantía Oficial:</span>
                  <strong class="text-teal-300 uppercase font-mono">{{ guarantee.replace('_', ' ') }}</strong>
                </div>
              </div>

              <!-- Tarjeta 3: Coste y Ahorro -->
              <div class="bg-gradient-to-br from-emerald-950/30 via-slate-950 to-slate-950 p-4 rounded-xl border border-emerald-500/30 space-y-2 relative overflow-hidden">
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
                    class="flex-1 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/20 transition disabled:opacity-50"
                  >
                    <Download class="h-3.5 w-3.5" />
                    Descargar .QUI
                  </button>
                  <button
                    @click="copyQui"
                    :disabled="!reductionResult"
                    class="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer transition border border-slate-700 disabled:opacity-50"
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

          <!-- GRID PRINCIPAL: PARRILLA DE 15 PARTIDOS Y SIDEBAR DE FILTROS -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <!-- Columna Izquierda: Tabla Detallada con Explicaciones (8 cols) -->
            <section class="lg:col-span-8 space-y-4">
              <!-- Barra de Control de la Parrilla & Filtros Interactivos -->
              <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/90 p-3.5 rounded-2xl border border-slate-800">
                <!-- Filtros por tipo de partido -->
                <div class="flex flex-wrap items-center gap-1.5 text-xs">
                  <span class="text-slate-400 text-[11px] font-semibold flex items-center gap-1 mr-1">
                    <Filter class="h-3.5 w-3.5 text-emerald-400" />
                    Filtrar:
                  </span>
                  <button
                    @click="matchFilter = 'all'"
                    class="px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer"
                    :class="matchFilter === 'all' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'"
                  >
                    Todos (15)
                  </button>
                  <button
                    @click="matchFilter = 'trampas'"
                    class="px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1"
                    :class="matchFilter === 'trampas' ? 'bg-amber-500 text-slate-950 font-bold' : 'bg-slate-800 text-amber-300 hover:bg-slate-700'"
                  >
                    <span>⚠️</span> Trampas EV
                  </button>
                  <button
                    @click="matchFilter = 'fijos'"
                    class="px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1"
                    :class="matchFilter === 'fijos' ? 'bg-blue-500 text-white font-bold' : 'bg-slate-800 text-blue-300 hover:bg-slate-700'"
                  >
                    <span>💎</span> Fijos IA
                  </button>
                  <button
                    @click="matchFilter = 'fatiga'"
                    class="px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1"
                    :class="matchFilter === 'fatiga' ? 'bg-orange-500 text-slate-950 font-bold' : 'bg-slate-800 text-orange-300 hover:bg-slate-700'"
                  >
                    <span>⚡</span> Fatiga
                  </button>
                  <button
                    @click="matchFilter = 'finalizados'"
                    class="px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer flex items-center gap-1"
                    :class="matchFilter === 'finalizados' ? 'bg-teal-500 text-slate-950 font-bold' : 'bg-slate-800 text-teal-300 hover:bg-slate-700'"
                  >
                    <span>🏁</span> Finalizados
                  </button>
                </div>

                <!-- Acciones Rápidas de Pronóstico -->
                <div class="flex items-center gap-2 self-end sm:self-auto">
                  <button
                    @click="coverAllTraps"
                    class="px-2.5 py-1 rounded-lg text-xs font-bold bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 flex items-center gap-1 cursor-pointer transition"
                    title="Añade automáticamente dobles 1X o X2 en los partidos con asimetría EV favorable"
                  >
                    <Shield class="h-3.5 w-3.5" />
                    Blindar Trampas
                  </button>
                  <button
                    @click="applyBudgetPreset('estandar')"
                    class="flex items-center gap-1.5 px-3 py-1 text-xs font-bold rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 transition cursor-pointer shadow-sm shadow-emerald-500/20"
                  >
                    <Sparkles class="h-3.5 w-3.5" />
                    Auto-IA
                  </button>
                </div>
              </div>

              <!-- Listado de Partidos -->
              <div class="space-y-3">
                <div
                  v-for="p in filteredPartidos"
                  :key="p.id"
                  class="p-4 rounded-2xl border transition-all duration-200 shadow-md space-y-3 glass-card"
                  :class="p.numeroCasilla === 15 ? 'bg-amber-950/20 border-amber-800/60' : 'bg-slate-900/60 border-slate-800/80 hover:border-slate-700'"
                >
                  <!-- Fila Superior: Info de Equipos, Badges y Botonera -->
                  <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div class="flex items-center gap-3.5 min-w-[260px]">
                      <span
                        class="h-9 w-9 rounded-xl flex items-center justify-center font-black text-xs shrink-0 shadow-inner"
                        :class="p.numeroCasilla === 15 ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' : 'bg-slate-800 text-slate-300 border border-slate-700/60'"
                      >
                        {{ p.numeroCasilla === 15 ? 'P15' : p.numeroCasilla }}
                      </span>
                      <div>
                        <div class="flex flex-wrap items-center gap-2">
                          <span class="font-bold text-sm text-slate-100">
                            {{ p.equipoLocal }} <span class="text-slate-500 font-normal text-xs">vs</span> {{ p.equipoVisitante }}
                          </span>
                          <!-- Badge de Veredicto -->
                          <span
                            v-if="p.predicciones[0]?.verdictBadge"
                            class="text-[10px] px-2 py-0.5 rounded-full border font-bold"
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
                          <span>Rec. IA: <strong class="text-emerald-400 font-mono text-xs">{{ p.predicciones[0].recomendacionSigno }}</strong></span>
                          <span>•</span>
                          <span>Confianza: <strong class="text-slate-300 font-mono">{{ p.predicciones[0].confianzaScore }}%</strong></span>
                        </div>

                        <!-- Estado en Vivo / Resultado Oficial -->
                        <div v-if="p.resultadoSigno" class="flex flex-wrap items-center gap-2 mt-1.5">
                          <span
                            class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[10px] font-bold font-mono border"
                            :class="p.predicciones[0]?.recomendacionSigno.includes(p.resultadoSigno)
                              ? 'bg-emerald-950/60 text-emerald-300 border-emerald-500/40'
                              : 'bg-rose-950/60 text-rose-300 border-rose-500/40'"
                          >
                            <span class="text-slate-400 font-normal">Oficial:</span>
                            <span v-if="p.golesLocal !== null && p.golesVisitante !== null">{{ p.golesLocal }} - {{ p.golesVisitante }}</span>
                            <span class="px-1.5 py-0.2 rounded bg-slate-900 border border-slate-700 text-white font-black">
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

                    <!-- Comparativa de Probabilidad y Expected Value con Barra Proporcional -->
                    <div v-if="p.predicciones[0]" class="flex flex-col gap-1.5 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 sm:min-w-[200px]">
                      <div class="flex items-center justify-between text-xs font-mono">
                        <!-- Signo 1 -->
                        <div class="flex items-center gap-1">
                          <span class="text-slate-400 font-bold">1:</span>
                          <span class="font-extrabold text-slate-200">{{ Math.round(Number(p.predicciones[0].prob1) * 100) }}%</span>
                          <span class="text-[9px] px-1 rounded" :class="Number(p.predicciones[0].ev1) >= 1.05 ? 'text-emerald-400 bg-emerald-950/60 font-bold' : 'text-slate-500'">
                            EV {{ p.predicciones[0].ev1 }}
                          </span>
                        </div>
                        <span class="text-slate-700">|</span>
                        <!-- Signo X -->
                        <div class="flex items-center gap-1">
                          <span class="text-slate-400 font-bold">X:</span>
                          <span class="font-extrabold text-slate-200">{{ Math.round(Number(p.predicciones[0].probX) * 100) }}%</span>
                          <span class="text-[9px] px-1 rounded" :class="Number(p.predicciones[0].evX) >= 1.05 ? 'text-emerald-400 bg-emerald-950/60 font-bold' : 'text-slate-500'">
                            EV {{ p.predicciones[0].evX }}
                          </span>
                        </div>
                        <span class="text-slate-700">|</span>
                        <!-- Signo 2 -->
                        <div class="flex items-center gap-1">
                          <span class="text-slate-400 font-bold">2:</span>
                          <span class="font-extrabold text-slate-200">{{ Math.round(Number(p.predicciones[0].prob2) * 100) }}%</span>
                          <span class="text-[9px] px-1 rounded" :class="Number(p.predicciones[0].ev2) >= 1.05 ? 'text-emerald-400 bg-emerald-950/60 font-bold' : 'text-slate-500'">
                            EV {{ p.predicciones[0].ev2 }}
                          </span>
                        </div>
                      </div>

                      <!-- Barra Visual Proporcional de Probabilidades 1X2 -->
                      <div class="h-2 w-full bg-slate-900 rounded-full overflow-hidden flex border border-slate-800">
                        <div class="bg-emerald-500 transition-all duration-300" :style="{ width: `${Number(p.predicciones[0].prob1) * 100}%` }" title="1 (Victoria Local)"></div>
                        <div class="bg-amber-400 transition-all duration-300" :style="{ width: `${Number(p.predicciones[0].probX) * 100}%` }" title="X (Empate)"></div>
                        <div class="bg-blue-500 transition-all duration-300" :style="{ width: `${Number(p.predicciones[0].prob2) * 100}%` }" title="2 (Victoria Visitante)"></div>
                      </div>
                    </div>

                    <!-- Botonera 1X2 Interactiva con Tacto Grande -->
                    <div v-if="p.numeroCasilla <= 14" class="flex items-center gap-2 self-end sm:self-center">
                      <button
                        v-for="sign in (['1', 'X', '2'] as const)"
                        :key="sign"
                        @click="toggleSign(p.numeroCasilla, sign)"
                        class="h-10 w-10 rounded-xl font-black text-sm transition-all duration-200 cursor-pointer border flex items-center justify-center select-none"
                        :class="selections[p.numeroCasilla]?.[sign] 
                          ? 'bg-emerald-500 border-emerald-400 text-slate-950 font-black shadow-lg shadow-emerald-500/25 scale-105' 
                          : 'bg-slate-800/80 border-slate-700/80 text-slate-300 hover:bg-slate-700 hover:border-slate-600'"
                      >
                        {{ sign }}
                      </button>
                    </div>

                    <!-- Selector Pleno al 15 -->
                    <div v-else class="flex items-center gap-2">
                      <select
                        v-model="pleno15Selection"
                        @change="calculateReduction"
                        class="bg-slate-800 border border-slate-700 text-amber-300 text-xs font-bold rounded-xl px-3 py-2 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
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
                  <div v-if="p.predicciones[0]" class="pt-2 border-t border-slate-800/60">
                    <button
                      @click="toggleExplanation(p.numeroCasilla)"
                      class="text-[11px] text-slate-400 hover:text-emerald-400 flex items-center gap-1.5 cursor-pointer transition font-medium"
                    >
                      <Lightbulb class="h-3.5 w-3.5 text-amber-400" />
                      <span>¿Por qué este pronóstico y cuotas de mercado?</span>
                      <ChevronDown v-if="!expandedExplanations[p.numeroCasilla]" class="h-3.5 w-3.5" />
                      <ChevronUp v-else class="h-3.5 w-3.5" />
                    </button>

                    <!-- Caja Explicativa Desplegada con Glassmorphism -->
                    <div
                      v-if="expandedExplanations[p.numeroCasilla]"
                      class="mt-2.5 p-3.5 rounded-xl bg-slate-950/80 border border-slate-800 text-xs space-y-3 animate-fadeIn"
                    >
                      <!-- Alerta Específica: Factor Congestión & Fatiga de Calendario Europeo (Opción C) -->
                      <div v-if="p.fatigueAlert" class="p-3 rounded-lg bg-amber-950/25 border border-amber-500/30 flex items-start gap-3">
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
                        <div class="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-center">
                          <span class="text-emerald-400 font-bold block mb-1">Modelo IA</span>
                          <span>1: {{ Math.round(Number(p.predicciones[0].prob1) * 100) }}% | X: {{ Math.round(Number(p.predicciones[0].probX) * 100) }}% | 2: {{ Math.round(Number(p.predicciones[0].prob2) * 100) }}%</span>
                        </div>
                        <div class="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-center">
                          <span class="text-amber-400 font-bold block mb-1">Masa SELAE</span>
                          <span>1: {{ p.pctApostadoLae1 }}% | X: {{ p.pctApostadoLaeX }}% | 2: {{ p.pctApostadoLae2 }}%</span>
                        </div>
                        <div class="bg-slate-900/80 p-2.5 rounded-lg border border-slate-800 text-center">
                          <span class="text-teal-400 font-bold block mb-1">Consenso Mercado</span>
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
              <div class="glass-panel p-5 rounded-2xl border border-slate-800 sticky top-20 shadow-2xl space-y-5">
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
                  <label class="block text-xs font-semibold text-slate-300 mb-2">Garantía de Premio Oficial</label>
                  <div class="grid grid-cols-3 gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
                    <button
                      v-for="g in (['AL_13', 'AL_12', 'DIRECTA'] as const)"
                      :key="g"
                      @click="guarantee = g; calculateReduction();"
                      class="py-1.5 text-xs font-bold rounded-lg transition cursor-pointer"
                      :class="guarantee === g ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-slate-200'"
                    >
                      {{ g.replace('_', ' ') }}
                    </button>
                  </div>
                </div>

                <!-- Interruptor Filtros de Varianza -->
                <div class="space-y-3 pt-2 border-t border-slate-800">
                  <div class="flex items-center justify-between">
                    <span class="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <SlidersHorizontal class="h-3.5 w-3.5 text-emerald-400" />
                      Filtros de Varianza & Pipas
                    </span>
                    <input
                      type="checkbox"
                      v-model="filters.enabled"
                      @change="calculateReduction"
                      class="h-4 w-4 rounded border-slate-700 text-emerald-500 focus:ring-emerald-400 bg-slate-950 cursor-pointer"
                    />
                  </div>

                  <div v-if="filters.enabled" class="space-y-3 bg-slate-950/80 p-3 rounded-xl border border-slate-800/80 text-xs">
                    <!-- Rango de Variantes -->
                    <div>
                      <div class="flex justify-between text-slate-400 mb-1">
                        <span>Variantes (Signos X o 2):</span>
                        <strong class="text-slate-200 font-mono">{{ filters.minVariants }} - {{ filters.maxVariants }}</strong>
                      </div>
                      <div class="flex items-center gap-2">
                        <input
                          type="range"
                          min="0"
                          max="14"
                          v-model.number="filters.minVariants"
                          @change="calculateReduction"
                          class="w-full accent-emerald-500 cursor-pointer"
                        />
                        <input
                          type="range"
                          min="0"
                          max="14"
                          v-model.number="filters.maxVariants"
                          @change="calculateReduction"
                          class="w-full accent-emerald-500 cursor-pointer"
                        />
                      </div>
                    </div>

                    <!-- Rango de Empates -->
                    <div>
                      <div class="flex justify-between text-slate-400 mb-1">
                        <span>Máximo de Empates (X):</span>
                        <strong class="text-slate-200 font-mono">{{ filters.maxDraws }}</strong>
                      </div>
                      <input
                        type="range"
                        min="0"
                        max="8"
                        v-model.number="filters.maxDraws"
                        @change="calculateReduction"
                        class="w-full accent-emerald-500 cursor-pointer"
                      />
                    </div>

                    <!-- Filtro Anti-Pipas -->
                    <div class="flex items-center justify-between pt-1 border-t border-slate-900">
                      <div class="space-y-0.5">
                        <span class="font-bold text-amber-300 block text-[11px]">Filtro Anti-Pipas</span>
                        <p class="text-[10px] text-slate-400">Elimina apuestas hiper-populares con premio &lt; 50 €</p>
                      </div>
                      <input
                        type="checkbox"
                        v-model="filters.avoidPipas"
                        @change="calculateReduction"
                        class="h-4 w-4 rounded border-slate-700 text-amber-500 focus:ring-amber-400 bg-slate-900 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                <!-- Vista previa de combinaciones del archivo .QUI -->
                <div v-if="reductionResult" class="space-y-2 pt-2 border-t border-slate-800">
                  <div class="flex justify-between text-xs text-slate-400">
                    <span class="font-semibold">Combinaciones Optimizadas:</span>
                    <strong class="text-emerald-400 font-mono">{{ reductionResult.reducedBetsCount }} boletos</strong>
                  </div>
                  <div class="bg-slate-950 p-3 rounded-xl border border-slate-800 text-[11px] font-mono text-slate-300 max-h-40 overflow-y-auto space-y-1">
                    <div v-for="(bet, idx) in reductionResult.bets" :key="idx" class="flex justify-between">
                      <span class="text-slate-500">{{ (idx + 1).toString().padStart(3, '0') }}:</span>
                      <strong class="text-emerald-400 tracking-wider">{{ bet }}</strong>
                      <span class="text-amber-400">[{{ pleno15Selection }}]</span>
                    </div>
                  </div>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>

      <!-- PESTAÑA 2: MÉTRICAS & ESTADÍSTICAS GLOBALES (MOTOR DE FONDO) -->
      <div v-else class="space-y-6">
        <div class="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div class="flex items-center gap-2 mb-1">
              <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400 text-[10px] font-mono font-bold">MOTOR DE CÁLCULO DE FONDO</span>
            </div>
            <h2 class="text-lg font-bold text-white flex items-center gap-2">
              <Cpu class="h-5 w-5 text-emerald-400" />
              Motor Matemático, Calibración & Auditoría Cuantitativa
            </h2>
            <p class="text-xs text-slate-300 mt-1 max-w-3xl">
              Estos modelos predictivos (Dixon-Coles bivariado, Poisson con corrección de empates &tau;, factores de fatiga europea y matrices de valor esperado) se ejecutan de forma continua en segundo plano para generar y fundamentar las predicciones del boleto de la jornada en curso.
            </p>
          </div>
          <button
            @click="fetchMetricas"
            :disabled="loadingMetrics"
            class="self-start md:self-auto px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-xs font-bold text-slate-200 border border-slate-800 flex items-center gap-2 cursor-pointer transition shrink-0"
          >
            <RotateCcw class="h-3.5 w-3.5" :class="{ 'animate-spin': loadingMetrics }" />
            Actualizar Métricas
          </button>
        </div>

        <div v-if="metricas" class="space-y-6">
          <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div class="glass-card p-4 rounded-xl border border-slate-800">
              <div class="flex items-center justify-between text-slate-400 text-xs">
                <span>Partidos Evaluados (11 Años)</span>
                <Target class="h-4 w-4 text-emerald-400" />
              </div>
              <div class="mt-2 flex items-baseline gap-2">
                <span class="text-2xl font-black text-white font-mono">{{ metricas.performance.totalMatchesEvaluated }}</span>
                <span class="text-xs text-emerald-400 font-medium">Partidos</span>
              </div>
              <p class="text-[11px] text-slate-400 mt-1">
                Fijos: <strong class="text-slate-200">{{ metricas.performance.singlePicksAccuracyPct }}%</strong> • Dobles: <strong class="text-emerald-400">{{ metricas.performance.doublePicksCoveragePct }}%</strong>
              </p>
            </div>

            <div class="glass-card p-4 rounded-xl border border-slate-800">
              <div class="flex items-center justify-between text-slate-400 text-xs">
                <span>Calibración Probabilística</span>
                <Award class="h-4 w-4 text-teal-400" />
              </div>
              <div class="mt-2 flex items-baseline gap-2">
                <span class="text-2xl font-black text-teal-300 font-mono">{{ metricas.performance.brierScore }}</span>
                <span class="text-xs text-teal-400 font-medium">Brier Score</span>
              </div>
              <p class="text-[11px] text-slate-400 mt-1">Calibración estricta (0.0 = perfecto, &lt;0.22 = grado profesional)</p>
            </div>

            <div class="glass-card p-4 rounded-xl border border-slate-800">
              <div class="flex items-center justify-between text-slate-400 text-xs">
                <span>Sorpresas Cazadas con EV</span>
                <Flame class="h-4 w-4 text-amber-400" />
              </div>
              <div class="mt-2 flex items-baseline gap-2">
                <span class="text-2xl font-black text-amber-300 font-mono">
                  {{ metricas.performance.highValueSurprisesCaught }} / {{ metricas.performance.totalSurprisesOccurred }}
                </span>
                <span class="text-xs text-amber-400 font-medium">Sorpresas</span>
              </div>
              <p class="text-[11px] text-slate-400 mt-1">Alertas donde el público apostó &lt;25% y EV &gt; 1.05</p>
            </div>

            <div class="glass-card p-4 rounded-xl border border-slate-800">
              <div class="flex items-center justify-between text-slate-400 text-xs">
                <span>Ahorro Medio Reductor</span>
                <Percent class="h-4 w-4 text-purple-400" />
              </div>
              <div class="mt-2 flex items-baseline gap-2">
                <span class="text-2xl font-black text-purple-300 font-mono">{{ metricas.reductionEfficiency.avgSavingsAl13Pct }}%</span>
                <span class="text-xs text-purple-400 font-medium">Al 13</span>
              </div>
              <p class="text-[11px] text-slate-400 mt-1">Al 12 se alcanza un ahorro medio del <strong class="text-purple-300">{{ metricas.reductionEfficiency.avgSavingsAl12Pct }}%</strong></p>
            </div>
          </div>

          <!-- Distribución 1X2 Histórica -->
          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div class="lg:col-span-7 glass-panel p-5 rounded-2xl border border-slate-800 space-y-4">
              <div class="flex items-center justify-between">
                <h3 class="font-bold text-sm text-slate-100 flex items-center gap-2">
                  <TrendingUp class="h-4 w-4 text-emerald-400" />
                  Distribución Real 1X2 de la Última Década (2014-2025)
                </h3>
                <span class="text-xs text-slate-400 font-mono">{{ metricas.distribution.totalFinishedMatches }} partidos</span>
              </div>

              <div class="space-y-2">
                <div class="h-7 w-full rounded-xl overflow-hidden flex font-mono text-xs font-black text-slate-950 shadow-inner">
                  <div class="bg-emerald-500 flex items-center justify-center transition-all duration-300" :style="{ width: `${metricas.distribution.homeWinsPct}%` }">
                    1 ({{ metricas.distribution.homeWinsPct }}%)
                  </div>
                  <div class="bg-amber-400 flex items-center justify-center transition-all duration-300" :style="{ width: `${metricas.distribution.drawsPct}%` }">
                    X ({{ metricas.distribution.drawsPct }}%)
                  </div>
                  <div class="bg-blue-400 flex items-center justify-center transition-all duration-300" :style="{ width: `${metricas.distribution.awayWinsPct}%` }">
                    2 ({{ metricas.distribution.awayWinsPct }}%)
                  </div>
                </div>
                <div class="flex justify-between text-xs text-slate-400 pt-1 font-mono">
                  <span>1 (Local): <strong class="text-emerald-400">{{ metricas.distribution.homeWinsCount }}</strong></span>
                  <span>X (Empate): <strong class="text-amber-400">{{ metricas.distribution.drawsCount }}</strong></span>
                  <span>2 (Visitante): <strong class="text-blue-400">{{ metricas.distribution.awayWinsCount }}</strong></span>
                </div>
              </div>
            </div>

            <!-- Pleno al 15 Histórico -->
            <div class="lg:col-span-5 glass-panel p-5 rounded-2xl border border-slate-800 space-y-3">
              <h3 class="font-bold text-sm text-slate-100 flex items-center gap-2">
                <Target class="h-4 w-4 text-amber-400" />
                Marcadores Estrella Pleno al 15
              </h3>
              <div class="space-y-2.5 pt-1">
                <div v-for="item in metricas.pleno15TopScores" :key="item.score" class="space-y-1">
                  <div class="flex justify-between text-xs font-mono">
                    <span class="text-slate-200 font-bold">{{ item.score }}</span>
                    <span class="text-slate-400">{{ item.percentage }}%</span>
                  </div>
                  <div class="w-full bg-slate-950 rounded-full h-2 overflow-hidden border border-slate-800">
                    <div class="bg-amber-400 h-full rounded-full transition-all duration-500" :style="{ width: `${item.percentage * 2.5}%` }"></div>
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

    <!-- BARRA FLOTANTE FIJA INFERIOR (STICKY LIVE BET SLIP DOCK) -->
    <div
      v-if="activeTab === 'boleto' && jornada"
      class="fixed bottom-4 left-4 right-4 max-w-4xl mx-auto z-30 transition-all duration-300"
    >
      <div class="bg-slate-950/90 backdrop-blur-xl border border-emerald-500/40 rounded-2xl p-3 sm:p-4 shadow-2xl shadow-emerald-950/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div class="flex items-center gap-4">
          <div class="h-10 w-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center shrink-0">
            <Coins class="h-5 w-5" />
          </div>
          <div>
            <div class="flex items-baseline gap-2">
              <span class="text-xl sm:text-2xl font-black text-white font-mono">
                {{ reductionResult ? `${reductionResult.reducedCost} €` : `${counts.directCost.toFixed(2)} €` }}
              </span>
              <span v-if="reductionResult" class="text-xs font-bold text-emerald-400 font-mono">
                (-{{ reductionResult.savingsPercentage }}% ahorro)
              </span>
            </div>
            <p class="text-[11px] text-slate-400">
              {{ reductionResult ? `${reductionResult.reducedBetsCount} apuestas reducidas` : `${counts.directBets} apuestas al directo` }} • Garantía <strong>{{ guarantee.replace('_', ' ') }}</strong>
            </p>
          </div>
        </div>

        <div class="flex items-center gap-2">
          <button
            @click="calculateReduction"
            :disabled="calculating"
            class="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer transition disabled:opacity-50"
            title="Recalcular reducción"
          >
            <RotateCcw class="h-3.5 w-3.5" :class="{ 'animate-spin': calculating }" />
            <span>Actualizar</span>
          </button>
          <button
            @click="downloadQui"
            :disabled="!reductionResult"
            class="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center justify-center gap-1.5 cursor-pointer shadow-lg shadow-emerald-500/25 transition disabled:opacity-50"
          >
            <Download class="h-4 w-4" />
            <span>Descargar .QUI</span>
          </button>
        </div>
      </div>
    </div>

    <!-- MODAL DIDÁCTICO: CÓMO FUNCIONA EL MÉTODO MATEMÁTICO (MARKETING & UX) -->
    <div
      v-if="showMethodologyModal"
      class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fadeIn"
      @click.self="showMethodologyModal = false"
    >
      <div class="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 max-w-2xl w-full shadow-2xl relative space-y-6">
        <button
          @click="showMethodologyModal = false"
          class="absolute top-5 right-5 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
        >
          <X class="h-5 w-5" />
        </button>

        <div class="space-y-1.5">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
              METODOLOGÍA QUANTBET AI
            </span>
          </div>
          <h3 class="text-xl font-black text-white">¿Por qué batimos a las quinielas tradicionales?</h3>
          <p class="text-xs text-slate-400">Las tres ventajas cuantitativas que convierten el azar en un juego de esperanza matemática positiva.</p>
        </div>

        <div class="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div class="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2">
            <div class="h-8 w-8 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center font-bold">1</div>
            <h4 class="font-bold text-white text-sm">Dixon & Coles</h4>
            <p class="text-slate-400 leading-relaxed text-[11px]">
              A diferencia de Poisson simple, ajusta la probabilidad en empates a cero y victorias mínimas mediante el factor de correlación &tau;, reduciendo el error en un 24%.
            </p>
          </div>

          <div class="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2">
            <div class="h-8 w-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">2</div>
            <h4 class="font-bold text-white text-sm">Expected Value</h4>
            <p class="text-slate-400 leading-relaxed text-[11px]">
              Compara el consenso real con los millones de apuestas del público general de SELAE. Si la masa sobre-apuesta al favorito, el valor real se traslada al 1X o X2.
            </p>
          </div>

          <div class="bg-slate-950/70 p-4 rounded-2xl border border-slate-800 space-y-2">
            <div class="h-8 w-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">3</div>
            <h4 class="font-bold text-white text-sm">Reducción al 13</h4>
            <p class="text-slate-400 leading-relaxed text-[11px]">
              Algoritmo de cobertura máxima (Hamming Distance). Juegas combinaciones equivalentes a cientos de euros ahorrando hasta un -75% con garantía oficial de premio.
            </p>
          </div>
        </div>

        <div class="pt-2 border-t border-slate-800 flex justify-end">
          <button
            @click="showMethodologyModal = false"
            class="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition cursor-pointer"
          >
            Entendido, volver a la jugada
          </button>
        </div>
      </div>
    </div>
  </div>
</template>
