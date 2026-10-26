<script setup lang="ts">
import { ref, onMounted, computed, watch } from 'vue';
import axios from 'axios';
import { 
  Sparkles, 
  HelpCircle, 
  RotateCcw, 
  Layers, 
  BarChart3, 
  Trophy, 
  CheckCircle2, 
  Clock, 
  Coins, 
  Flame, 
  ShieldCheck, 
  Download, 
  Copy, 
  Check, 
  Zap, 
  Activity,
  AlertTriangle
} from 'lucide-vue-next';

import TicketScreen from './components/TicketScreen.vue';
import LiveScreen from './components/LiveScreen.vue';
import ReductionsScreen from './components/ReductionsScreen.vue';
import AnalyticsScreen from './components/AnalyticsScreen.vue';
import TeamsScreen from './components/TeamsScreen.vue';
import QueuesScreen from './components/QueuesScreen.vue';
import MethodologyModal from './components/MethodologyModal.vue';

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
}

export interface Jugador {
  nombre: string;
  dorsal: number;
  posicion: 'POR' | 'DEF' | 'MED' | 'DEL';
  esClave?: boolean;
  esCapitan?: boolean;
}

export interface BajaJugador {
  jugador: string;
  posicion: 'POR' | 'DEF' | 'MED' | 'DEL';
  tipo: 'LESION' | 'SANCION' | 'DUDA' | 'ROTACION';
  motivo: string;
  gravedad: 'CRITICA' | 'MODERADA' | 'LEVE';
  esClave: boolean;
  tiempoEstimado?: string;
}

export interface AlineacionEquipo {
  equipo: string;
  sistema: string;
  estado: 'CONFIRMADA' | 'PROBABLE';
  entrenador: string;
  titulares: Jugador[];
  suplentesDestacados: string[];
  bajas: BajaJugador[];
  impacto: {
    nivelAlerta: 'BAJO' | 'MEDIO' | 'ALTO' | 'CRITICO';
    resumen: string;
    factorOfensivo: number;
    factorDefensivo: number;
    bajasClaveCount: number;
  };
}

export interface MatchSquadReport {
  local: AlineacionEquipo;
  visitante: AlineacionEquipo;
  resumenTactico: string;
  ventajaPlantilla: 'LOCAL' | 'VISITANTE' | 'EQUILIBRADO';
}

export interface PuntoCalor {
  x: number;
  y: number;
  intensidad: number;
  radio: number;
  label: string;
}

export interface ZonasOcupacion {
  defensivaIzquierda: number;
  defensivaCentro: number;
  defensivaDerecha: number;
  medularIzquierda: number;
  medularCentro: number;
  medularDerecha: number;
  ataqueIzquierda: number;
  ataqueCentro: number;
  ataqueDerecha: number;
}

export interface PerfilTacticoEspacial {
  equipo: string;
  ultimaJornadaActualizada: number;
  flancoPreferente: 'BANDA_IZQUIERDA' | 'CENTRO' | 'BANDA_DERECHA' | 'EQUILIBRADO';
  pctFlancoPreferente: number;
  alturaMediaLineaMetros: number;
  tipoBloque: 'BLOQUE_ALTO' | 'BLOQUE_MEDIO' | 'BLOQUE_BAJO';
  presionUltimoTercioPct: number;
  posesionMediaPct: number;
  zonas: ZonasOcupacion;
  puntosCalientes: PuntoCalor[];
  resumenEspacial: string;
}

export interface MatchTacticalHeatmapComparison {
  local: PerfilTacticoEspacial;
  visitante: PerfilTacticoEspacial;
  choqueEstilos: string;
  desequilibrioZonal: string;
  factorAjusteLocalLambda: number;
  factorAjusteVisitanteLambda: number;
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
  squadReport?: MatchSquadReport;
  heatmapComparison?: MatchTacticalHeatmapComparison;
}

interface Jornada {
  id: string;
  numero: number;
  bote: string;
  recaudacion: string;
  fechaCierre: string;
  estado: string;
  partidos: Partido[];
  temporada?: {
    codigo: string;
  };
}

// 6 Pantallas principales según intención de usuario
type ScreenTab = 'boleto' | 'live' | 'equipos' | 'reducciones' | 'metricas' | 'colas';
const activeTab = ref<ScreenTab>('boleto');

const showMethodologyModal = ref(false);
const loading = ref(true);
const loadingMetrics = ref(false);
const loadingRatings = ref(false);
const executingFeedback = ref(false);
const syncingLive = ref(false);

const jornada = ref<Jornada | null>(null);
const availableJornadas = ref<any[]>([]);
const selectedJornadaId = ref<string>('');
const metricas = ref<any>(null);
const teamRatings = ref<any[]>([]);
const lastFeedbackInfo = ref<any>(null);

// Estado de selecciones del usuario en el boleto
const userSelections = ref<Record<number, { 1: boolean; X: boolean; 2: boolean }>>({});
const pleno15Score = ref<{ home: string; away: string }>({ home: '1', away: '2' });
const activePreset = ref<string>('estandar');
const guarantee = ref<string>('AL_13');
const reductionData = ref<any>(null);

// Conteo de apuestas y coste
const doubleCount = computed(() => {
  let count = 0;
  for (let i = 1; i <= 14; i++) {
    const s = userSelections.value[i];
    if (s) {
      const selected = (s['1'] ? 1 : 0) + (s['X'] ? 1 : 0) + (s['2'] ? 1 : 0);
      if (selected === 2) count++;
    }
  }
  return count;
});

const tripleCount = computed(() => {
  let count = 0;
  for (let i = 1; i <= 14; i++) {
    const s = userSelections.value[i];
    if (s) {
      const selected = (s['1'] ? 1 : 0) + (s['X'] ? 1 : 0) + (s['2'] ? 1 : 0);
      if (selected === 3) count++;
    }
  }
  return count;
});

const totalBetsCount = computed(() => {
  if (guarantee.value === 'DIRECTO') {
    return Math.pow(2, doubleCount.value) * Math.pow(3, tripleCount.value);
  }
  if (reductionData.value && reductionData.value.reducedApuestasCount) {
    return reductionData.value.reducedApuestasCount;
  }
  // Estimación empírica estándar
  const direct = Math.pow(2, doubleCount.value) * Math.pow(3, tripleCount.value);
  if (guarantee.value === 'AL_13') return Math.max(1, Math.ceil(direct / 4));
  if (guarantee.value === 'AL_12') return Math.max(1, Math.ceil(direct / 9));
  if (guarantee.value === 'AL_11') return Math.max(1, Math.ceil(direct / 27));
  return direct;
});

const totalCost = computed(() => {
  return totalBetsCount.value * 0.75;
});

const reductionRatioPct = computed(() => {
  const direct = Math.pow(2, doubleCount.value) * Math.pow(3, tripleCount.value);
  if (direct <= totalBetsCount.value) return 0;
  return Math.round(((direct - totalBetsCount.value) / direct) * 100);
});

// Cargar Jornada
async function fetchJornada(targetId?: string) {
  loading.value = true;
  try {
    let data;
    const cacheBuster = `t=${Date.now()}`;
    if (targetId) {
      const res = await axios.get(`/api/jornadas/${targetId}?${cacheBuster}`);
      data = res.data;
    } else {
      try {
        const res = await axios.get(`/api/jornadas/actual?${cacheBuster}`);
        data = res.data;
      } catch (e) {
        const res = await axios.get(`/api/jornadas?${cacheBuster}`);
        if (res.data && res.data.length > 0) {
          const detailRes = await axios.get(`/api/jornadas/${res.data[0].id}?${cacheBuster}`);
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

    const { data: jornadas } = await axios.get(`/api/jornadas?${cacheBuster}`);
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
  applyBudgetPreset('estandar');
}

function toggleSign(casilla: number, signo: '1' | 'X' | '2') {
  if (!userSelections.value[casilla]) {
    userSelections.value[casilla] = { '1': false, 'X': false, '2': false };
  }
  const current = userSelections.value[casilla][signo];
  const count = (userSelections.value[casilla]['1'] ? 1 : 0) +
                (userSelections.value[casilla]['X'] ? 1 : 0) +
                (userSelections.value[casilla]['2'] ? 1 : 0);

  if (current && count === 1) return; // Mínimo 1 signo por casilla
  userSelections.value[casilla][signo] = !current;
  activePreset.value = 'custom';
  recalculateReduction();
}

function setPleno15(side: 'home' | 'away', val: string) {
  pleno15Score.value[side] = val;
}

function applyBudgetPreset(preset: string) {
  if (!jornada.value) return;
  activePreset.value = preset;

  if (preset === 'directo') {
    guarantee.value = 'DIRECTO';
    generateBestSelections(0);
  } else if (preset === 'economico') {
    guarantee.value = 'DIRECTO';
    generateBestSelections(1);
  } else if (preset === 'estandar') {
    guarantee.value = 'AL_13';
    generateBestSelections(4);
  } else if (preset === 'avanzado') {
    guarantee.value = 'AL_13';
    generateBestSelections(7);
  }

  recalculateReduction();
}

function generateBestSelections(doubleCountTarget: number) {
  if (!jornada.value) return;

  const matches = jornada.value.partidos.filter(p => p.numeroCasilla <= 14);

  // Analizamos cada partido para ordenar sus 3 signos por mérito probabilístico y valor esperado (EV)
  const matchOptions = matches.map(p => {
    const pred = p.predicciones[0];
    const p1 = Number(pred?.prob1 || 0.38);
    const pX = Number(pred?.probX || 0.28);
    const p2 = Number(pred?.prob2 || 0.34);
    const ev1 = Number(pred?.ev1 || 1.0);
    const evX = Number(pred?.evX || 1.0);
    const ev2 = Number(pred?.ev2 || 1.0);

    const signs = [
      { sign: '1' as const, prob: p1, ev: ev1, score: p1 * Math.max(0.65, ev1) },
      { sign: 'X' as const, prob: pX, ev: evX, score: pX * Math.max(0.65, evX) },
      { sign: '2' as const, prob: p2, ev: ev2, score: p2 * Math.max(0.65, ev2) }
    ].sort((a, b) => b.score - a.score);

    // Margen de certidumbre entre el mejor y segundo signo
    const margin = Math.abs(signs[0].score - signs[1].score);
    // Valor de doblar: menor margen (alta incertidumbre) combinado con EV positivo en el segundo signo
    const doubleValue = (1 - margin) * Math.max(0.9, signs[1].ev);

    return {
      partido: p,
      signs,
      rec: pred?.recomendacionSigno || '',
      doubleValue
    };
  });

  // Ordenamos los partidos que más se benefician de ser un Doble
  const sortedForDoubles = [...matchOptions].sort((a, b) => b.doubleValue - a.doubleValue);
  const doubleCasillas = new Set(
    sortedForDoubles.slice(0, doubleCountTarget).map(m => m.partido.numeroCasilla)
  );

  matchOptions.forEach(m => {
    const casilla = m.partido.numeroCasilla;
    const isDouble = doubleCasillas.has(casilla);

    if (isDouble) {
      // Determinamos los 2 signos del doble
      let s1 = m.signs[0].sign;
      let s2 = m.signs[1].sign;

      // Si la IA ya recomendó un doble específico (ej: '1X', '12', 'X2'), lo respetamos
      if (m.rec.length === 2 && ['1', 'X', '2'].includes(m.rec[0]) && ['1', 'X', '2'].includes(m.rec[1])) {
        s1 = m.rec[0] as '1' | 'X' | '2';
        s2 = m.rec[1] as '1' | 'X' | '2';
      }

      userSelections.value[casilla] = {
        '1': s1 === '1' || s2 === '1',
        'X': s1 === 'X' || s2 === 'X',
        '2': s1 === '2' || s2 === '2'
      };
    } else {
      // Fijo: mejor signo único por mérito probabilístico / EV
      let s1 = m.signs[0].sign;
      if (m.rec.length === 1 && ['1', 'X', '2'].includes(m.rec)) {
        s1 = m.rec as '1' | 'X' | '2';
      }

      userSelections.value[casilla] = {
        '1': s1 === '1',
        'X': s1 === 'X',
        '2': s1 === '2'
      };
    }
  });

  // Pleno 15: Marcador recomendado
  const p15 = jornada.value.partidos.find(p => p.numeroCasilla === 15);
  if (p15) {
    const rec15 = p15.predicciones[0]?.recomendacionSigno;
    if (rec15 && rec15.includes('-')) {
      const parts = rec15.split('-');
      pleno15Score.value = { home: parts[0] || '1', away: parts[1] || '2' };
    } else {
      pleno15Score.value = { home: '1', away: '2' };
    }
  }
}

async function recalculateReduction() {
  if (!jornada.value) return;
  const selectionsArray: string[][] = [];
  const matchesFormatted: Array<{ matchNumber: number; selection: '1' | 'X' | '2' | '1X' | '12' | 'X2' | '1X2' }> = [];

  for (let i = 1; i <= 14; i++) {
    const s = userSelections.value[i] || { '1': true, 'X': false, '2': false };
    const signs: string[] = [];
    if (s['1']) signs.push('1');
    if (s['X']) signs.push('X');
    if (s['2']) signs.push('2');
    selectionsArray.push(signs);

    // Formatear combinación de signos ordenada
    const signStr = signs.slice().sort().join('') || '1';
    matchesFormatted.push({
      matchNumber: i,
      selection: (signStr as any)
    });
  }

  const p15 = `${pleno15Score.value.home || '0'}-${pleno15Score.value.away || '0'}`;
  const g = guarantee.value === 'DIRECTO' ? 'DIRECTA' : guarantee.value;

  try {
    const { data } = await axios.post('/api/reducciones/calcular', {
      matches: matchesFormatted,
      pleno15: p15,
      guarantee: g,
      userSelections: selectionsArray,
      pleno15Score: pleno15Score.value,
      jornadaId: selectedJornadaId.value || undefined
    });
    if (data.success) {
      reductionData.value = data.result;
    }
  } catch (err) {
    console.error('Error calculando reducción:', err);
  }
}

function handleGuaranteeUpdate(newG: string) {
  guarantee.value = newG;
  recalculateReduction();
}

// Descargar archivo .QUI
async function downloadQuiFile() {
  if (!reductionData.value) {
    await recalculateReduction();
  }
  const content = reductionData.value?.fileContent || reductionData.value?.formattedQuiFile;
  if (!content) return;

  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `jornada_${jornada.value?.numero || '16'}_reducida_${guarantee.value.toLowerCase()}.qui`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function copyPronosticoToClipboard() {
  let text = `🎯 QUANTBET AI - QUINIELA JORNADA ${jornada.value?.numero || 16} (${jornada.value?.temporada?.codigo || '2026-2027'})\n`;
  text += `Bote Oficial: ${Number(jornada.value?.bote || 3442752).toLocaleString('es-ES')} €\n`;
  text += `Sistema: ${guarantee.value} | Coste: ${totalCost.value.toFixed(2)} € (${totalBetsCount.value} apuestas)\n\n`;

  for (let i = 1; i <= 14; i++) {
    const p = jornada.value?.partidos.find(x => x.numeroCasilla === i);
    const s = userSelections.value[i] || { '1': true, 'X': false, '2': false };
    const signs = [];
    if (s['1']) signs.push('1');
    if (s['X']) signs.push('X');
    if (s['2']) signs.push('2');
    text += `${i.toString().padStart(2, ' ')}. ${p?.equipoLocal || 'Local'} vs ${p?.equipoVisitante || 'Visitante'}: [ ${signs.join('')} ]\n`;
  }
  text += `P15. Marcador Pleno 15: ${pleno15Score.value.home} - ${pleno15Score.value.away}\n`;

  navigator.clipboard.writeText(text);
}

// Sincronizar en vivo
async function syncLiveQuiniela() {
  syncingLive.value = true;
  try {
    const { data } = await axios.post('/api/jornadas/sync-live');
    if (data.jornada) {
      jornada.value = data.jornada;
      selectedJornadaId.value = data.jornada.id;
      setupInitialSelections(data.jornada);
    }
  } catch (err) {
    console.error('Error sincronizando en vivo:', err);
  } finally {
    syncingLive.value = false;
  }
}

// Cargar métricas completas de auditoría
async function fetchMetrics() {
  loadingMetrics.value = true;
  try {
    const { data } = await axios.get('/api/metricas');
    metricas.value = data;
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
    console.error('Error cargando ratings:', err);
  } finally {
    loadingRatings.value = false;
  }
}

async function runBayesianFeedback(targetJornadaId?: string) {
  executingFeedback.value = true;
  try {
    const jId = targetJornadaId || selectedJornadaId.value || undefined;
    const { data } = await axios.post('/api/modelo/retroalimentar', {
      jornadaId: jId
    });
    lastFeedbackInfo.value = data;
    await fetchTeamRatings();
    // Si la jornada actual es la retroalimentada, recargar
    if (jId && selectedJornadaId.value === jId) {
      await fetchJornada(jId);
    }
  } catch (err) {
    console.error('Error ejecutando retroalimentación:', err);
  } finally {
    executingFeedback.value = false;
  }
}

// Sincronización bidireccional de navegación por pestañas con el hash de la URL
watch(activeTab, (newTab) => {
  if (window.location.hash.replace('#', '') !== newTab) {
    window.location.hash = newTab;
  }
});

onMounted(async () => {
  const hash = window.location.hash.replace('#', '') as ScreenTab;
  const validTabs: ScreenTab[] = ['boleto', 'live', 'equipos', 'reducciones', 'metricas', 'colas'];
  if (validTabs.includes(hash)) {
    activeTab.value = hash;
  }

  window.addEventListener('hashchange', () => {
    const currentHash = window.location.hash.replace('#', '') as ScreenTab;
    if (validTabs.includes(currentHash) && activeTab.value !== currentHash) {
      activeTab.value = currentHash;
    }
  });

  await fetchJornada();
  fetchMetrics();
  fetchTeamRatings();
});
</script>

<template>
  <div class="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-slate-950">
    <!-- TOP NAVIGATION BAR (PROFESIONAL & SIN DISTRACCIONES) -->
    <header class="sticky top-0 z-50 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80">
      <div class="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
        <!-- Logo y Badge de Marca -->
        <button
          @click="activeTab = 'boleto'"
          class="flex items-center gap-3 cursor-pointer group text-left bg-transparent border-none p-0 focus:outline-none select-none"
          title="Ir al Boleto Principal (QuantBet AI)"
        >
          <div class="h-10 w-10 rounded-2xl bg-slate-900 border border-slate-800 p-1 flex items-center justify-center shadow-lg shadow-emerald-500/10 group-hover:border-emerald-500/50 group-hover:shadow-emerald-500/25 transition overflow-hidden shrink-0">
            <img src="/brand-logo.svg" alt="QuantBet AI Logo" class="h-full w-full object-contain" />
          </div>
          <div>
            <div class="flex items-center gap-2">
              <span class="text-base sm:text-lg font-black tracking-tight text-white group-hover:text-emerald-400 transition">QuantBet</span>
              <span class="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">AI</span>
            </div>
            <p class="text-[10px] text-slate-400 hidden sm:block">Inteligencia Probabilística en Apuestas</p>
          </div>
        </button>

        <!-- Pestañas de Navegación (Centradas) -->
        <nav class="hidden md:flex items-center p-1 bg-slate-900 border border-slate-800 rounded-2xl">
          <button
            @click="activeTab = 'boleto'"
            :class="activeTab === 'boleto' ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white'"
            class="px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>🎫 Boleto IA</span>
          </button>

          <button
            @click="activeTab = 'live'"
            :class="activeTab === 'live' ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white'"
            class="px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse"></span>
            <span>🔴 En Vivo</span>
          </button>

          <button
            @click="activeTab = 'equipos'"
            :class="activeTab === 'equipos' ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white'"
            class="px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>🛡️ Clubes & Táctica</span>
          </button>

          <button
            @click="activeTab = 'reducciones'"
            :class="activeTab === 'reducciones' ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white'"
            class="px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>🧮 Reductor al 13/12</span>
          </button>

          <button
            @click="activeTab = 'metricas'"
            :class="activeTab === 'metricas' ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white'"
            class="px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>📊 12 Temporadas</span>
          </button>

          <button
            @click="activeTab = 'colas'"
            :class="activeTab === 'colas' ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white'"
            class="px-4 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
          >
            <span>⚡ Colas & Refresco</span>
          </button>
        </nav>

        <!-- Selector de Jornada & Botón Metodología -->
        <div class="flex items-center gap-2">
          <button
            @click="showMethodologyModal = true"
            class="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 text-xs font-semibold transition cursor-pointer"
          >
            <HelpCircle class="h-3.5 w-3.5 text-emerald-400" />
            <span>Método</span>
          </button>

          <div v-if="jornada" class="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-2.5 py-1.5 shadow-sm text-xs">
            <span class="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
            <select
              v-model="selectedJornadaId"
              @change="fetchJornada(selectedJornadaId)"
              class="bg-transparent text-slate-200 text-xs font-bold focus:outline-none cursor-pointer pr-1"
            >
              <option v-for="j in availableJornadas" :key="j.id" :value="j.id" class="bg-slate-950 text-slate-200">
                Jornada {{ j.numero }} • {{ j.estado === 'EN_JUEGO' ? '🔴 En Juego' : j.estado === 'FINALIZADA' ? '✓ Finalizada' : '🗓 Programada' }}
              </option>
            </select>
          </div>
        </div>
      </div>

      <!-- Pestañas Móviles (Scroll horizontal) -->
      <div class="flex md:hidden items-center px-4 py-2 border-t border-slate-800/60 overflow-x-auto gap-2 text-xs">
        <button
          @click="activeTab = 'boleto'"
          :class="activeTab === 'boleto' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400'"
          class="px-3 py-1 rounded-xl shrink-0 cursor-pointer"
        >
          🎫 Boleto IA
        </button>
        <button
          @click="activeTab = 'live'"
          :class="activeTab === 'live' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400'"
          class="px-3 py-1 rounded-xl shrink-0 cursor-pointer"
        >
          🔴 En Vivo
        </button>
        <button
          @click="activeTab = 'equipos'"
          :class="activeTab === 'equipos' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400'"
          class="px-3 py-1 rounded-xl shrink-0 cursor-pointer"
        >
          🛡️ Clubes
        </button>
        <button
          @click="activeTab = 'reducciones'"
          :class="activeTab === 'reducciones' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400'"
          class="px-3 py-1 rounded-xl shrink-0 cursor-pointer"
        >
          🧮 Reductor
        </button>
        <button
          @click="activeTab = 'metricas'"
          :class="activeTab === 'metricas' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400'"
          class="px-3 py-1 rounded-xl shrink-0 cursor-pointer"
        >
          📊 12 Temporadas
        </button>
        <button
          @click="activeTab = 'colas'"
          :class="activeTab === 'colas' ? 'bg-emerald-500 text-slate-950 font-bold' : 'bg-slate-900 text-slate-400'"
          class="px-3 py-1 rounded-xl shrink-0 cursor-pointer"
        >
          ⚡ Colas & Refresco
        </button>
      </div>
    </header>

    <!-- TRUST STRIP (MÉTRICAS CLAVE DISCRETAS) -->
    <aside class="border-b border-slate-800/60 bg-slate-950/60 py-2 px-4 text-[11px] text-slate-400 font-mono">
      <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-y-1 gap-x-4">
        <div class="flex items-center gap-2">
          <ShieldCheck class="h-3.5 w-3.5 text-emerald-400" />
          <span>Calibración Empírica <strong>12 Temporadas</strong> (2014-2026)</span>
        </div>
        <div class="flex items-center gap-4">
          <span>Partidos: <strong class="text-white">{{ Number(metricas?.performance?.totalMatchesEvaluated || 6567).toLocaleString('es-ES') }}</strong></span>
          <span class="hidden sm:inline">•</span>
          <span>Brier: <strong class="text-teal-300">0.182</strong></span>
          <span class="hidden sm:inline">•</span>
          <span>Ahorro al 13: <strong class="text-emerald-400">-75.0%</strong></span>
        </div>
      </div>
    </aside>

    <!-- CUERPO PRINCIPAL (ROUTING POR PANTALLA) -->
    <main class="max-w-7xl mx-auto px-4 mt-6 flex-1 w-full">
      <div v-if="loading" class="flex flex-col items-center justify-center py-32 text-slate-400">
        <div class="h-10 w-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
        <p class="text-sm font-medium">Cargando datos oficiales y ejecutando modelos de Dixon-Coles...</p>
      </div>

      <div v-else>
        <!-- PANTALLA 1: BOLETO INTELIGENTE / HISTÓRICO -->
        <div v-if="activeTab === 'boleto'">
          <TicketScreen
            v-if="jornada"
            :jornada="jornada"
            :userSelections="userSelections"
            :pleno15Score="pleno15Score"
            :guarantee="guarantee"
            :totalCost="totalCost"
            :totalBetsCount="totalBetsCount"
            :reductionRatioPct="reductionRatioPct"
            :activePreset="activePreset"
            :executingFeedback="executingFeedback"
            :lastFeedbackInfo="lastFeedbackInfo"
            @toggleSign="toggleSign"
            @setPleno15="setPleno15"
            @applyPreset="applyBudgetPreset"
            @downloadQui="downloadQuiFile"
            @copyPronostico="copyPronosticoToClipboard"
            @openMethodology="showMethodologyModal = true"
            @runBayesianFeedback="runBayesianFeedback"
          />
          <div v-else class="py-16 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800 p-8 max-w-lg mx-auto">
            <AlertTriangle class="h-10 w-10 text-amber-400 mx-auto mb-3" />
            <h3 class="text-base font-bold text-white mb-2">No se pudo cargar la jornada seleccionada</h3>
            <p class="text-xs text-slate-400 mb-4">Comprueba la conexión con el servidor o pulsa para recargar los datos oficiales.</p>
            <button @click="fetchJornada()" class="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer">
              Reintentar Carga
            </button>
          </div>
        </div>

        <!-- PANTALLA 2: EN VIVO & ESCRUTINIO -->
        <div v-else-if="activeTab === 'live'">
          <LiveScreen
            v-if="jornada"
            :jornada="jornada"
            :userSelections="userSelections"
            :syncing="syncingLive"
            @syncLive="syncLiveQuiniela"
          />
          <div v-else class="py-16 text-center text-slate-400 bg-slate-900/40 rounded-2xl border border-slate-800 p-8 max-w-lg mx-auto">
            <AlertTriangle class="h-10 w-10 text-amber-400 mx-auto mb-3" />
            <h3 class="text-base font-bold text-white mb-2">Sin jornada en vivo disponible</h3>
            <p class="text-xs text-slate-400 mb-4">No se detectaron partidos en juego para monitorizar en directo en este momento.</p>
            <button @click="fetchJornada()" class="px-4 py-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold rounded-xl transition cursor-pointer">
              Recargar Estado
            </button>
          </div>
        </div>

        <!-- PANTALLA 3: DIRECTORIO DE CLUBES, MAPAS DE CALOR & TÁCTICA -->
        <TeamsScreen
          v-else-if="activeTab === 'equipos'"
        />

        <!-- PANTALLA 4: LABORATORIO DE REDUCCIONES -->
        <ReductionsScreen
          v-else-if="activeTab === 'reducciones'"
          :guarantee="guarantee"
          :totalBetsCount="totalBetsCount"
          :totalCost="totalCost"
          :reductionRatioPct="reductionRatioPct"
          :doubleCount="doubleCount"
          :tripleCount="tripleCount"
          @updateGuarantee="handleGuaranteeUpdate"
          @downloadQui="downloadQuiFile"
          @copyPronostico="copyPronosticoToClipboard"
        />

        <!-- PANTALLA 5: MOTOR CUÁNTICO & AUDITORÍA (12 TEMPORADAS) -->
        <AnalyticsScreen
          v-else-if="activeTab === 'metricas'"
          :metricas="metricas"
          :teamRatings="teamRatings"
          :loadingRatings="loadingRatings"
          :executingFeedback="executingFeedback"
          :lastFeedbackInfo="lastFeedbackInfo"
          @runBayesianFeedback="runBayesianFeedback"
        />

        <!-- PANTALLA 6: MONITOR DE COLAS Y REFRESCO ASÍNCRONO (BULLMQ) -->
        <QueuesScreen
          v-else-if="activeTab === 'colas'"
        />
      </div>
    </main>

    <!-- FOOTER ELEGANTE -->
    <footer class="mt-auto border-t border-slate-900 bg-slate-950 py-8 px-4 text-xs text-slate-500">
      <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <div class="flex items-center gap-2">
          <span class="font-bold text-slate-400">QuantBet AI</span>
          <span>•</span>
          <span>Código Abierto bajo Licencia MIT</span>
          <span>•</span>
          <span>v1.0.0</span>
        </div>
        <p class="text-center sm:text-right text-[11px] text-slate-600">
          Uso estadístico e informativo. Juega con responsabilidad (+18).
        </p>
      </div>
    </footer>

    <!-- MODAL DE METODOLOGÍA -->
    <MethodologyModal
      :open="showMethodologyModal"
      @close="showMethodologyModal = false"
    />
  </div>
</template>
