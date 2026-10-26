<script setup lang="ts">
import { ref, computed, watch } from 'vue';
import { 
  Sparkles, 
  Download, 
  Copy, 
  Check, 
  RotateCcw, 
  ShieldCheck, 
  Zap, 
  SlidersHorizontal, 
  Info, 
  ChevronDown, 
  ChevronUp, 
  Coins, 
  Clock, 
  Flame,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Eye,
  Layers,
  Filter,
  Award,
  Trophy,
  Activity,
  Cpu
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
  temporada?: {
    codigo: string;
  };
  autoFeedback?: {
    autoApplied: boolean;
    appliedAt: string;
    matchesEvaluated: number;
    adjustments: string[];
  } | null;
}

const props = defineProps<{
  jornada: Jornada;
  userSelections: Record<number, { 1: boolean; X: boolean; 2: boolean }>;
  pleno15Score: { home: string; away: string };
  guarantee: string;
  totalCost: number;
  totalBetsCount: number;
  reductionRatioPct: number;
  activePreset: string;
  executingFeedback?: boolean;
  lastFeedbackInfo?: any;
}>();

const emit = defineEmits<{
  (e: 'toggleSign', casilla: number, signo: '1' | 'X' | '2'): void;
  (e: 'setPleno15', side: 'home' | 'away', val: string): void;
  (e: 'applyPreset', preset: string): void;
  (e: 'downloadQui'): void;
  (e: 'copyPronostico'): void;
  (e: 'openMethodology'): void;
  (e: 'runBayesianFeedback', jornadaId?: string): void;
}>();

// Modo de vista: 'escrutinio' (si está finalizada) o 'boleto' (para jugar / simular)
const hasFinishedMatches = computed(() => {
  return props.jornada?.partidos?.some(p => p.resultadoSigno !== null && p.resultadoSigno !== undefined) || false;
});

const isJornadaFinalizada = computed(() => {
  return props.jornada?.estado === 'FINALIZADA' || (props.jornada?.partidos?.length > 0 && props.jornada.partidos.every(p => !!p.resultadoSigno));
});

const viewMode = ref<'boleto' | 'escrutinio'>(
  props.jornada?.estado === 'FINALIZADA' ? 'escrutinio' : 'boleto'
);

watch(() => props.jornada?.id, () => {
  if (props.jornada?.estado === 'FINALIZADA') {
    viewMode.value = 'escrutinio';
  } else {
    viewMode.value = 'boleto';
  }
});

// Aciertos de la IA sobre los partidos finalizados
const finishedMatches = computed(() => {
  if (!props.jornada?.partidos) return [];
  return props.jornada.partidos.filter(p => !!p.resultadoSigno);
});

const aiAccuracy = computed(() => {
  let hits = 0;
  for (const p of finishedMatches.value) {
    if (isMatchHit(p)) {
      hits++;
    }
  }
  const total = finishedMatches.value.length;
  return {
    hits,
    total,
    pct: total > 0 ? Math.round((hits / total) * 100) : 0
  };
});

function isMatchHit(p: Partido): boolean {
  if (!p.resultadoSigno) return false;
  const rec = p.predicciones[0]?.recomendacionSigno;
  if (!rec) return false;
  if (p.numeroCasilla === 15) {
    return rec === p.resultadoSigno || rec.includes(p.resultadoSigno);
  }
  return rec.includes(p.resultadoSigno);
}

// Categoría de premio estimada para los aciertos IA
const prizeCategoryLabel = computed(() => {
  const h = aiAccuracy.value.hits;
  if (h === 15) return 'Categoría Especial (15 Aciertos + Pleno)';
  if (h === 14) return '1ª Categoría (14 Aciertos)';
  if (h === 13) return '2ª Categoría (13 Aciertos)';
  if (h === 12) return '3ª Categoría (12 Aciertos)';
  if (h === 11) return '4ª Categoría (11 Aciertos)';
  if (h === 10) return '5ª Categoría (10 Aciertos)';
  return 'Fuera de premios oficiales (<10)';
});

// Retroalimentación automática obtenida de la jornada o del último evento
const effectiveFeedback = computed(() => {
  if (props.lastFeedbackInfo && props.lastFeedbackInfo.jornadaId === props.jornada?.id) {
    return props.lastFeedbackInfo;
  }
  return props.jornada?.autoFeedback;
});

// Toggle entre Vista Rápida (sin saturación) y Vista Cuántica (con desglose % y EV)
const detailedMode = ref(false);
const activeFilter = ref<'all' | 'fijos' | 'sorpresas' | 'fatiga'>('all');
const expandedCards = ref<Record<number, boolean>>({});
const showAdjustmentsModal = ref(false);

function toggleExplanation(casilla: number) {
  expandedCards.value[casilla] = !expandedCards.value[casilla];
}

const filteredPartidos = computed(() => {
  if (!props.jornada || !props.jornada.partidos) return [];
  const partidos = props.jornada.partidos;

  if (activeFilter.value === 'fijos') {
    return partidos.filter(p => {
      const pred = p.predicciones[0];
      return pred && pred.recomendacionSigno.length === 1;
    });
  }
  if (activeFilter.value === 'sorpresas') {
    return partidos.filter(p => {
      const pred = p.predicciones[0];
      return pred && (pred.verdictBadge?.includes('SORPRESA') || Number(pred.evX) > 1.2 || Number(pred.ev2) > 1.2);
    });
  }
  if (activeFilter.value === 'fatiga') {
    return partidos.filter(p => !!p.fatigueAlert);
  }
  return partidos;
});

const copied = ref(false);
function handleCopy() {
  emit('copyPronostico');
  copied.value = true;
  setTimeout(() => { copied.value = false; }, 2000);
}
</script>

<template>
  <div class="space-y-6 pb-28">
    <!-- SELECTOR DE MODO (SI TIENE PARTIDOS JUGADOS O ESTÁ FINALIZADA) -->
    <div v-if="hasFinishedMatches" class="flex flex-wrap items-center justify-between gap-3 p-2 bg-slate-900/80 rounded-2xl border border-slate-800">
      <div class="flex items-center gap-1.5">
        <button
          @click="viewMode = 'escrutinio'"
          :class="viewMode === 'escrutinio' ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white'"
          class="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
        >
          <Award class="h-4 w-4" />
          <span>Escrutinio Real vs IA</span>
          <span class="px-2 py-0.5 rounded-lg text-[10px] font-mono font-black" :class="viewMode === 'escrutinio' ? 'bg-slate-950/30 text-slate-950' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'">
            {{ aiAccuracy.hits }}/{{ aiAccuracy.total }} Aciertos
          </span>
        </button>

        <button
          @click="viewMode = 'boleto'"
          :class="viewMode === 'boleto' ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white'"
          class="px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer"
        >
          <Sparkles class="h-4 w-4" />
          <span>{{ isJornadaFinalizada ? 'Simulador de Boleto' : 'Boleto IA de la Semana' }}</span>
        </button>
      </div>

      <div class="flex items-center gap-2 text-xs text-slate-400 px-2 font-mono">
        <span class="h-2 w-2 rounded-full" :class="isJornadaFinalizada ? 'bg-slate-500' : 'bg-emerald-400 animate-ping'"></span>
        <span>{{ isJornadaFinalizada ? 'Jornada Finalizada Oficial' : 'Jornada en Vivo' }}</span>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- VISTA 1: ESCRUTINIO & AUDITORÍA HISTÓRICA  -->
    <!-- ========================================== -->
    <div v-if="viewMode === 'escrutinio'" class="space-y-6 animate-fade-in">
      <!-- HERO DE ESCRUTINIO -->
      <section class="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-slate-800">
        <div class="absolute -right-20 -top-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -left-20 -bottom-20 w-72 h-72 bg-teal-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div class="space-y-3">
            <div class="flex flex-wrap items-center gap-2">
              <span class="px-2.5 py-1 text-[11px] font-black rounded-xl bg-emerald-500 text-slate-950 flex items-center gap-1.5 shadow-md shadow-emerald-500/20">
                <Award class="h-3.5 w-3.5" />
                AUDITORÍA DE PRECISIÓN IA
              </span>
              <span class="px-2.5 py-1 text-[11px] font-extrabold rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                JORNADA {{ jornada.numero }} • {{ jornada.temporada?.codigo || '2026-2027' }}
              </span>
              <span class="text-xs text-slate-400 font-mono">
                Cierre: {{ new Date(jornada.fechaCierre || '').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) }}
              </span>
            </div>

            <h1 class="text-2xl sm:text-4xl font-black text-white tracking-tight flex flex-wrap items-center gap-3">
              Escrutinio Real frente a Estimación IA
            </h1>

            <p class="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Comparativa entre los marcadores oficiales de SELAE y las recomendaciones del modelo matemático Dixon-Coles. El modelo se <strong>retroalimenta automáticamente</strong> tras cada jornada concluida para calibrar las fuerzas de ataque y defensa sin necesidad de reentrenar de cero ni requerir acción manual.
            </p>
          </div>

          <!-- Tarjeta de Aciertos y Estado de Retroalimentación Automática -->
          <div class="bg-slate-950/80 p-5 rounded-2xl border border-slate-800 shrink-0 space-y-3 min-w-[280px]">
            <div class="flex items-center justify-between text-xs text-slate-400">
              <span class="font-bold text-slate-200">Aciertos del Modelo:</span>
              <span class="font-mono text-emerald-400 font-black text-sm">{{ aiAccuracy.pct }}% Efectividad</span>
            </div>

            <div class="flex items-baseline gap-2">
              <span class="text-3xl font-black text-emerald-400 font-mono">{{ aiAccuracy.hits }} / {{ aiAccuracy.total }}</span>
              <span class="text-xs text-slate-400">partidos acertados</span>
            </div>

            <div class="p-2 rounded-xl bg-slate-900 border border-slate-800 text-[11px] text-teal-300 flex items-center gap-1.5">
              <Trophy class="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span class="font-semibold">{{ prizeCategoryLabel }}</span>
            </div>

            <!-- ESTADO DE RETROALIMENTACIÓN BAYESIANA AUTOMÁTICA -->
            <div class="pt-2 border-t border-slate-800/80 space-y-2">
              <div class="flex items-center justify-between text-[11px]">
                <span class="text-slate-300 font-bold flex items-center gap-1.5">
                  <Cpu class="h-3.5 w-3.5 text-teal-400" />
                  <span>Calibración Bayesiana:</span>
                </span>
                <span class="px-2 py-0.5 rounded-md text-[10px] font-black bg-teal-500/10 text-teal-300 border border-teal-500/20 flex items-center gap-1">
                  <CheckCircle2 class="h-3 w-3 text-emerald-400" />
                  <span>AUTOMÁTICA</span>
                </span>
              </div>

              <div class="text-[10px] text-slate-400 leading-tight">
                Parámetros de ataque (&alpha;) y defensa (&beta;) actualizados tras la finalización de los partidos.
              </div>

              <div class="flex items-center justify-between pt-1">
                <button 
                  v-if="effectiveFeedback?.adjustments"
                  @click="showAdjustmentsModal = !showAdjustmentsModal"
                  class="text-teal-400 hover:text-teal-300 underline text-[11px] cursor-pointer flex items-center gap-1"
                >
                  <span>{{ showAdjustmentsModal ? 'Ocultar ajustes' : `Ver ${effectiveFeedback.adjustments.length} variaciones` }}</span>
                  <component :is="showAdjustmentsModal ? ChevronUp : ChevronDown" class="h-3 w-3" />
                </button>
                <span v-else class="text-[10px] text-slate-500">Ajustes consolidados</span>

                <button
                  @click="emit('runBayesianFeedback', jornada.id)"
                  :disabled="executingFeedback"
                  title="Forzar recalibración manual si es necesario"
                  class="text-[10px] text-slate-500 hover:text-slate-300 flex items-center gap-1 cursor-pointer transition disabled:opacity-50"
                >
                  <RotateCcw class="h-3 w-3" :class="{ 'animate-spin': executingFeedback }" />
                  <span>Recalibrar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- DESGLOSE DE VARIACIONES DE RETROALIMENTACIÓN AUTOMÁTICA -->
      <div v-if="showAdjustmentsModal && effectiveFeedback?.adjustments" class="p-4 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-xs text-teal-300 space-y-2 animate-fade-in">
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2 font-black text-white">
            <CheckCircle2 class="h-4 w-4 text-emerald-400" />
            <span>Ajustes Bayesianos aplicados automáticamente para la Jornada {{ jornada.numero }}:</span>
          </div>
          <span class="text-[11px] font-mono text-slate-400">{{ effectiveFeedback.adjustments.length }} clubes ajustados</span>
        </div>

        <div class="mt-2 pt-2 border-t border-teal-500/20 max-h-48 overflow-y-auto space-y-1 font-mono text-[11px]">
          <div v-for="(adj, idx) in effectiveFeedback.adjustments" :key="idx" class="text-slate-300">
            {{ adj }}
          </div>
        </div>
      </div>

      <!-- LISTA DE PARTIDOS EN ESCRUTINIO (REAL VS IA) -->
      <div class="space-y-3">
        <div
          v-for="partido in jornada.partidos"
          :key="partido.id"
          class="glass-card rounded-2xl p-4 transition duration-200 border border-slate-800/80 hover:border-slate-700"
          :class="isMatchHit(partido) ? 'border-l-4 border-l-emerald-500' : (partido.resultadoSigno ? 'border-l-4 border-l-rose-500/80' : 'border-l-4 border-l-slate-700')"
        >
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <!-- Identificador y Equipos -->
            <div class="flex items-center gap-3.5 min-w-0">
              <span class="flex items-center justify-center h-8 w-8 rounded-xl bg-slate-800 font-black text-xs text-slate-300 shrink-0 font-mono">
                {{ partido.numeroCasilla === 15 ? 'P15' : partido.numeroCasilla }}
              </span>

              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                    {{ partido.equipoLocal }} <span class="text-slate-500 font-normal">vs</span> {{ partido.equipoVisitante }}
                  </span>

                  <!-- Badge Sorpresa / Fatiga -->
                  <span
                    v-if="partido.predicciones[0]?.verdictBadge"
                    class="hidden sm:inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0"
                    :class="partido.predicciones[0].verdictBadge.includes('BANCO') ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'"
                  >
                    {{ partido.predicciones[0].verdictBadge }}
                  </span>
                </div>

                <div class="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                  <span>
                    IA recomendó: <strong class="text-teal-300 font-mono">{{ partido.predicciones[0]?.recomendacionSigno || '1' }}</strong>
                  </span>
                  <span>•</span>
                  <span>Confianza: <strong class="text-slate-300 font-mono">{{ Math.round(Number(partido.predicciones[0]?.confianzaScore || 65)) }}%</strong></span>
                  <button
                    @click="toggleExplanation(partido.numeroCasilla)"
                    class="text-slate-400 hover:text-emerald-400 text-[11px] underline ml-1 cursor-pointer flex items-center gap-0.5"
                  >
                    <span>{{ expandedCards[partido.numeroCasilla] ? 'Ocultar' : 'Ver análisis' }}</span>
                    <component :is="expandedCards[partido.numeroCasilla] ? ChevronUp : ChevronDown" class="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>

            <!-- RESULTADO REAL VS ESTIMACIÓN IA -->
            <div class="flex items-center gap-3 shrink-0 self-end sm:self-center">
              <!-- Marcador Real -->
              <div v-if="partido.resultadoSigno" class="text-right">
                <span class="text-[10px] text-slate-500 block uppercase font-mono font-bold">Resultado</span>
                <div class="flex items-center gap-2">
                  <span class="text-sm font-black text-white font-mono">
                    {{ partido.golesLocal ?? '-' }} - {{ partido.golesVisitante ?? '-' }}
                  </span>
                  <span class="px-2 py-0.5 rounded-lg text-xs font-black bg-slate-900 border border-slate-700 text-amber-400 font-mono">
                    {{ partido.resultadoSigno }}
                  </span>
                </div>
              </div>

              <!-- Badge de Acierto / Fallo -->
              <div v-if="partido.resultadoSigno">
                <span
                  v-if="isMatchHit(partido)"
                  class="px-3 py-1.5 rounded-xl text-xs font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1.5 shadow-sm"
                >
                  <CheckCircle2 class="h-4 w-4 text-emerald-400" />
                  <span>ACIERTO</span>
                </span>
                <span
                  v-else
                  class="px-3 py-1.5 rounded-xl text-xs font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1.5 shadow-sm"
                >
                  <XCircle class="h-4 w-4 text-rose-400" />
                  <span>FALLO</span>
                </span>
              </div>

              <div v-else class="px-3 py-1.5 rounded-xl text-xs font-bold bg-amber-500/10 text-amber-300 border border-amber-500/20 flex items-center gap-1.5">
                <Clock class="h-3.5 w-3.5 text-amber-400 animate-pulse" />
                <span>Por disputar</span>
              </div>
            </div>
          </div>

          <!-- Explicación desplegable -->
          <div v-if="expandedCards[partido.numeroCasilla]" class="mt-3 pt-3 border-t border-slate-800/60 text-xs text-slate-300 bg-slate-950/50 p-3 rounded-xl animate-fade-in">
            <p class="leading-relaxed">
              {{ partido.predicciones[0]?.explanation || 'Estimación probabilística basada en la tasa de goles esperados Dixon-Coles y el sesgo de las apuestas SELAE.' }}
            </p>
            <div v-if="partido.predicciones[0]" class="mt-2 grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
              <div class="bg-slate-900 p-1.5 rounded-lg">1: {{ (Number(partido.predicciones[0].prob1) * 100).toFixed(0) }}% (EV {{ partido.predicciones[0].ev1 }})</div>
              <div class="bg-slate-900 p-1.5 rounded-lg">X: {{ (Number(partido.predicciones[0].probX) * 100).toFixed(0) }}% (EV {{ partido.predicciones[0].evX }})</div>
              <div class="bg-slate-900 p-1.5 rounded-lg">2: {{ (Number(partido.predicciones[0].prob2) * 100).toFixed(0) }}% (EV {{ partido.predicciones[0].ev2 }})</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ========================================== -->
    <!-- VISTA 2: BOLETO INTELIGENTE INTERACTIVO    -->
    <!-- ========================================== -->
    <div v-else class="space-y-6 animate-fade-in">
      <!-- HERO COMPACTO & DE IMPACTO -->
      <section class="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-slate-800">
        <div class="absolute -right-20 -top-20 w-72 h-72 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div class="absolute -left-20 -bottom-20 w-72 h-72 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div class="space-y-3">
            <div class="flex flex-wrap items-center gap-2">
              <span class="px-2.5 py-1 text-[11px] font-black rounded-xl bg-emerald-500 text-slate-950 flex items-center gap-1.5 shadow-md shadow-emerald-500/20">
                <CheckCircle2 class="h-3.5 w-3.5" />
                BOLETO RELLENADO POR IA
              </span>
              <span class="px-2.5 py-1 text-[11px] font-extrabold rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                <Clock class="h-3.5 w-3.5 animate-pulse" />
                JORNADA {{ jornada.numero }} • {{ jornada.temporada?.codigo || '2026-2027' }}
              </span>
              <span class="text-xs text-slate-400 font-mono">
                Cierre: {{ new Date(jornada.fechaCierre || '').toLocaleDateString('es-ES', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' }) }}
              </span>
            </div>

            <h1 class="text-2xl sm:text-4xl font-black text-white tracking-tight flex flex-wrap items-center gap-3">
              Quiniela de Esta Semana
              <span class="text-slate-600 font-light">|</span>
              <span class="text-amber-400 font-black flex items-center gap-2">
                <Coins class="h-7 w-7 text-amber-400" />
                {{ Number(jornada.bote || 3442752).toLocaleString('es-ES') }} € en Bote
              </span>
            </h1>

            <p class="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Las 15 casillas han sido pronosticadas mediante modelos bivariados de <strong>Dixon-Coles</strong> optimizando el <strong>Expected Value (EV)</strong> frente al sesgo del público. Elige tu presupuesto, ajusta casillas a tu gusto y descarga el boleto oficial.
            </p>
          </div>

          <!-- Presets de Presupuesto Rápido (4 opciones claras) -->
          <div class="bg-slate-950/80 p-4 rounded-2xl border border-slate-800 shrink-0 space-y-2.5">
            <div class="flex items-center justify-between text-xs text-slate-400">
              <span class="font-bold text-slate-200 flex items-center gap-1.5">
                <SlidersHorizontal class="h-3.5 w-3.5 text-emerald-400" />
                Presupuesto Recomendado:
              </span>
              <button 
                @click="emit('openMethodology')"
                class="text-emerald-400 hover:underline flex items-center gap-1 text-[11px] cursor-pointer"
              >
                <HelpCircle class="h-3 w-3" />
                <span>¿Cómo funciona?</span>
              </button>
            </div>

            <div class="grid grid-cols-2 gap-2">
              <button
                @click="emit('applyPreset', 'directo')"
                :class="activePreset === 'directo' ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20' : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800'"
                class="px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex flex-col text-left"
              >
                <span>Directo (14 Fijos)</span>
                <span class="text-[11px] opacity-80">0,75 € (1 apuesta)</span>
              </button>

              <button
                @click="emit('applyPreset', 'economico')"
                :class="activePreset === 'economico' ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20' : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800'"
                class="px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex flex-col text-left"
              >
                <span>Económico (1 Doble)</span>
                <span class="text-[11px] opacity-80">1,50 € (2 apuestas)</span>
              </button>

              <button
                @click="emit('applyPreset', 'estandar')"
                :class="activePreset === 'estandar' ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20' : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800'"
                class="px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex flex-col text-left relative"
              >
                <span class="flex items-center gap-1">
                  <span>Estándar IA (4 Dobles)</span>
                  <span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
                </span>
                <span class="text-[11px] opacity-80">3,00 € (Al 13 • -75%)</span>
              </button>

              <button
                @click="emit('applyPreset', 'avanzado')"
                :class="activePreset === 'avanzado' ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20' : 'bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-800'"
                class="px-3 py-2 rounded-xl text-xs font-semibold transition cursor-pointer flex flex-col text-left"
              >
                <span>Avanzado (7 Dobles)</span>
                <span class="text-[11px] opacity-80">12,00 € (Al 13 • -87%)</span>
              </button>
            </div>
          </div>
        </div>
      </section>

      <!-- BARRA DE CONTROLES & FILTROS (REDUCCIÓN DE RUIDO VISUAL) -->
      <div class="flex flex-wrap items-center justify-between gap-4 p-3 bg-slate-900/60 rounded-2xl border border-slate-800">
        <div class="flex items-center gap-1.5">
          <button
            @click="activeFilter = 'all'"
            :class="activeFilter === 'all' ? 'bg-slate-800 text-white font-bold' : 'text-slate-400 hover:text-slate-200'"
            class="px-3 py-1.5 rounded-xl text-xs transition cursor-pointer"
          >
            Todos (15)
          </button>
          <button
            @click="activeFilter = 'fijos'"
            :class="activeFilter === 'fijos' ? 'bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30' : 'text-slate-400 hover:text-slate-200'"
            class="px-3 py-1.5 rounded-xl text-xs transition cursor-pointer"
          >
            Fijos de Banco
          </button>
          <button
            @click="activeFilter = 'sorpresas'"
            :class="activeFilter === 'sorpresas' ? 'bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30' : 'text-slate-400 hover:text-slate-200'"
            class="px-3 py-1.5 rounded-xl text-xs transition cursor-pointer"
          >
            Sorpresas con Valor
          </button>
          <button
            @click="activeFilter = 'fatiga'"
            :class="activeFilter === 'fatiga' ? 'bg-blue-500/20 text-blue-300 font-bold border border-blue-500/30' : 'text-slate-400 hover:text-slate-200'"
            class="px-3 py-1.5 rounded-xl text-xs transition cursor-pointer"
          >
            Fatiga Champions
          </button>
        </div>

        <!-- Switch Modo Detallado / Modo Simple -->
        <div class="flex items-center gap-2">
          <button
            @click="detailedMode = !detailedMode"
            class="flex items-center gap-2 px-3 py-1.5 rounded-xl border transition text-xs font-semibold cursor-pointer"
            :class="detailedMode ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300' : 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800'"
          >
            <Eye class="h-3.5 w-3.5" />
            <span>{{ detailedMode ? 'Vista Cuántica (Detalle Activo)' : 'Vista Rápida (Limpia)' }}</span>
          </button>
        </div>
      </div>

      <!-- BANNER DE ESTADO EN VIVO (PARTIDOS DISPUTADOS & ACIERTOS IA EN TIEMPO REAL) -->
      <div v-if="hasFinishedMatches && !isJornadaFinalizada" class="p-3.5 sm:p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs animate-fade-in shadow-lg">
        <div class="flex items-center gap-2.5">
          <span class="relative flex h-2.5 w-2.5">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span class="font-bold text-white">Escrutinio en Directo:</span>
          <span class="text-slate-300 font-mono">{{ finishedMatches.length }} de 15 partidos ya disputados</span>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <div class="flex items-center gap-1.5 font-mono">
            <span class="text-slate-400">Efectividad IA en curso:</span>
            <span class="px-2.5 py-0.5 rounded-lg font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
              <CheckCircle2 class="h-3.5 w-3.5 text-emerald-400" />
              <span>{{ aiAccuracy.hits }} / {{ finishedMatches.length }} Aciertos ({{ aiAccuracy.pct }}%)</span>
            </span>
          </div>
          <span class="text-amber-400 font-mono font-semibold text-[11px] bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
            • {{ 15 - finishedMatches.length }} por disputar
          </span>
        </div>
      </div>

      <!-- LISTADO DE CASILLAS DEL BOLETO -->
      <div class="space-y-3">
        <div
          v-for="partido in filteredPartidos"
          :key="partido.id"
          class="glass-card rounded-2xl p-4 transition duration-200 border border-slate-800/80 hover:border-slate-700"
          :class="[
            partido.resultadoSigno
              ? (isMatchHit(partido) ? 'border-l-4 border-l-emerald-500' : 'border-l-4 border-l-rose-500/70')
              : 'border-l-4 border-l-amber-500/60'
          ]"
        >
          <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <!-- Identificador y Equipos -->
            <div class="flex items-center gap-3.5 min-w-0">
              <span class="flex items-center justify-center h-8 w-8 rounded-xl bg-slate-800 font-black text-xs text-slate-300 shrink-0 font-mono">
                {{ partido.numeroCasilla === 15 ? 'P15' : partido.numeroCasilla }}
              </span>

              <div class="min-w-0">
                <div class="flex items-center gap-2">
                  <span class="text-sm sm:text-base font-bold text-white tracking-tight truncate">
                    {{ partido.equipoLocal }} <span class="text-slate-500 font-normal">vs</span> {{ partido.equipoVisitante }}
                  </span>

                  <!-- Badges Compactos -->
                  <span
                    v-if="partido.predicciones[0]?.verdictBadge"
                    class="hidden sm:inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider shrink-0"
                    :class="partido.predicciones[0].verdictBadge.includes('BANCO') ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-300 border border-amber-500/20'"
                  >
                    {{ partido.predicciones[0].verdictBadge }}
                  </span>
                  <span
                    v-if="partido.fatigueAlert"
                    class="hidden sm:inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 shrink-0"
                  >
                    ⚡ Fatiga
                  </span>
                </div>

                <!-- Subtexto de recomendación y toggle explicativo -->
                <div class="flex flex-wrap items-center gap-2.5 text-xs text-slate-400 mt-1">
                  <span>
                    IA sugiere: <strong class="text-emerald-400 font-mono">{{ partido.predicciones[0]?.recomendacionSigno || '1' }}</strong>
                  </span>
                  <span>•</span>
                  <span>Confianza: <strong class="text-slate-300 font-mono">{{ Math.round(Number(partido.predicciones[0]?.confianzaScore || 65)) }}%</strong></span>

                  <!-- INDICADOR DE ACIERTO/FALLO EN PARTIDO YA DISPUTADO DE LA JORNADA EN CURSO -->
                  <span v-if="partido.resultadoSigno" class="flex items-center gap-1.5 ml-1">
                    <span>•</span>
                    <span class="font-mono text-slate-300">
                      Marcador: <strong class="text-white">{{ partido.golesLocal ?? '-' }}-{{ partido.golesVisitante ?? '-' }}</strong> [{{ partido.resultadoSigno }}]
                    </span>
                    <span
                      v-if="isMatchHit(partido)"
                      class="px-2 py-0.2 rounded text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 shadow-sm"
                    >
                      <CheckCircle2 class="h-3 w-3 text-emerald-400" />
                      <span>ACIERTO IA</span>
                    </span>
                    <span
                      v-else
                      class="px-2 py-0.2 rounded text-[10px] font-black bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-1 shadow-sm"
                    >
                      <XCircle class="h-3 w-3 text-rose-400" />
                      <span>FALLO IA</span>
                    </span>
                  </span>

                  <!-- INDICADOR DE PARTIDO PENDIENTE -->
                  <span v-else class="flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.2 rounded-md border border-amber-500/20 ml-1">
                    <Clock class="h-3 w-3 text-amber-400 animate-pulse" />
                    <span>Por disputar (Hoy 21:00h)</span>
                  </span>

                  <button
                    @click="toggleExplanation(partido.numeroCasilla)"
                    class="text-slate-400 hover:text-emerald-400 text-[11px] underline ml-auto sm:ml-1 cursor-pointer flex items-center gap-0.5"
                  >
                    <span>{{ expandedCards[partido.numeroCasilla] ? 'Ocultar' : 'Ver análisis' }}</span>
                    <component :is="expandedCards[partido.numeroCasilla] ? ChevronUp : ChevronDown" class="h-3 w-3" />
                  </button>
                </div>
              </div>
            </div>

            <!-- Selector de Signos 1-X-2 (Casillas 1-14) -->
            <div v-if="partido.numeroCasilla < 15" class="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
              <button
                v-for="signo in (['1', 'X', '2'] as const)"
                :key="signo"
                @click="emit('toggleSign', partido.numeroCasilla, signo)"
                :class="[
                  userSelections[partido.numeroCasilla]?.[signo]
                    ? 'bg-emerald-500 text-slate-950 font-black shadow-lg shadow-emerald-500/20 border-emerald-400'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 border-slate-700/80',
                  partido.predicciones[0]?.recomendacionSigno.includes(signo) && !userSelections[partido.numeroCasilla]?.[signo]
                    ? 'border-emerald-500/40 text-emerald-400 bg-emerald-500/5'
                    : '',
                  partido.resultadoSigno === signo
                    ? 'ring-2 ring-amber-400/80'
                    : ''
                ]"
                class="h-10 w-11 sm:h-11 sm:w-12 rounded-xl border text-sm sm:text-base font-extrabold transition-all duration-150 flex items-center justify-center cursor-pointer font-mono relative"
              >
                <span>{{ signo }}</span>
                <!-- Marcador de signo oficial si ya se jugó -->
                <span
                  v-if="partido.resultadoSigno === signo"
                  class="absolute -top-1.5 -right-1.5 h-3.5 w-3.5 rounded-full bg-amber-400 text-slate-950 text-[8px] font-black flex items-center justify-center shadow-sm"
                  title="Signo Oficial Disputado"
                >
                  ✓
                </span>
              </button>
            </div>

            <!-- Selector Pleno al 15 (Goles Local y Visitante) -->
            <div v-else class="flex items-center gap-3 shrink-0 self-end sm:self-center">
              <!-- Goles Local -->
              <div class="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <span class="text-[10px] text-slate-500 font-bold px-1.5 uppercase font-mono">Loc</span>
                <button
                  v-for="score in ['0', '1', '2', 'M']"
                  :key="score"
                  @click="emit('setPleno15', 'home', score)"
                  :class="pleno15Score.home === score ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'"
                  class="h-8 w-8 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer font-mono"
                >
                  {{ score }}
                </button>
              </div>

              <!-- Goles Visitante -->
              <div class="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                <span class="text-[10px] text-slate-500 font-bold px-1.5 uppercase font-mono">Vis</span>
                <button
                  v-for="score in ['0', '1', '2', 'M']"
                  :key="score"
                  @click="emit('setPleno15', 'away', score)"
                  :class="pleno15Score.away === score ? 'bg-emerald-500 text-slate-950 font-black' : 'text-slate-400 hover:text-white'"
                  class="h-8 w-8 rounded-lg text-xs font-bold transition flex items-center justify-center cursor-pointer font-mono"
                >
                  {{ score }}
                </button>
              </div>
            </div>
          </div>

          <!-- Explicación desplegable bajo demanda -->
          <div v-if="expandedCards[partido.numeroCasilla]" class="mt-3 pt-3 border-t border-slate-800/60 text-xs text-slate-300 bg-slate-950/50 p-3 rounded-xl animate-fade-in">
            <p class="leading-relaxed">
              {{ partido.predicciones[0]?.explanation || 'Estimación probabilística basada en la tasa de goles esperados y el valor relativo frente a las apuestas SELAE.' }}
            </p>
            <div v-if="partido.fatigueAlert" class="mt-2 text-amber-300 text-[11px] font-semibold flex items-center gap-1.5">
              <Zap class="h-3.5 w-3.5" />
              <span>{{ partido.fatigueAlert.notice }}</span>
            </div>
          </div>

          <!-- Desglose de Probabilidades & EV (Sólo visible en Vista Cuántica) -->
          <div v-if="detailedMode && partido.predicciones[0]" class="mt-3 pt-3 border-t border-slate-800/60 grid grid-cols-3 gap-2 text-center text-xs">
            <div class="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <div class="text-[10px] text-slate-400 font-mono">Signo 1</div>
              <div class="font-bold text-white">{{ (Number(partido.predicciones[0].prob1) * 100).toFixed(0) }}%</div>
              <div :class="Number(partido.predicciones[0].ev1) > 1.0 ? 'text-emerald-400 font-black' : 'text-slate-400'" class="text-[10px] font-mono">
                EV {{ partido.predicciones[0].ev1 }}
              </div>
            </div>

            <div class="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <div class="text-[10px] text-slate-400 font-mono">Signo X</div>
              <div class="font-bold text-white">{{ (Number(partido.predicciones[0].probX) * 100).toFixed(0) }}%</div>
              <div :class="Number(partido.predicciones[0].evX) > 1.0 ? 'text-emerald-400 font-black' : 'text-slate-400'" class="text-[10px] font-mono">
                EV {{ partido.predicciones[0].evX }}
              </div>
            </div>

            <div class="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80">
              <div class="text-[10px] text-slate-400 font-mono">Signo 2</div>
              <div class="font-bold text-white">{{ (Number(partido.predicciones[0].prob2) * 100).toFixed(0) }}%</div>
              <div :class="Number(partido.predicciones[0].ev2) > 1.0 ? 'text-emerald-400 font-black' : 'text-slate-400'" class="text-[10px] font-mono">
                EV {{ partido.predicciones[0].ev2 }}
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- STICKY BOTTOM ACTION BAR (CTA PRINCIPAL DE MARKETING & EXPORTACIÓN) -->
      <div class="fixed bottom-0 inset-x-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 py-3 px-4 shadow-2xl">
        <div class="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div class="flex items-center gap-6 text-xs text-slate-300">
            <div>
              <span class="text-slate-500 block text-[10px] uppercase font-bold">Apuestas</span>
              <span class="text-base font-black text-white font-mono">{{ totalBetsCount }}</span>
            </div>

            <div>
              <span class="text-slate-500 block text-[10px] uppercase font-bold">Garantía</span>
              <span class="text-base font-bold text-emerald-400 font-mono">{{ guarantee }}</span>
            </div>

            <div>
              <span class="text-slate-500 block text-[10px] uppercase font-bold">Coste Oficial</span>
              <span class="text-lg font-black text-emerald-400 font-mono">{{ totalCost.toFixed(2) }} €</span>
            </div>

            <div v-if="reductionRatioPct > 0" class="hidden md:block">
              <span class="text-slate-500 block text-[10px] uppercase font-bold">Ahorro Reducción</span>
              <span class="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                -{{ reductionRatioPct }}% vs Directo
              </span>
            </div>
          </div>

          <div class="flex items-center gap-2.5 w-full sm:w-auto">
            <button
              @click="handleCopy"
              class="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 text-xs font-bold transition cursor-pointer"
            >
              <component :is="copied ? Check : Copy" class="h-4 w-4 text-emerald-400" />
              <span>{{ copied ? '¡Copiado!' : 'Copiar Pronóstico' }}</span>
            </button>

            <button
              @click="emit('downloadQui')"
              class="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs sm:text-sm transition shadow-lg shadow-emerald-500/25 cursor-pointer"
            >
              <Download class="h-4 w-4" />
              <span>Descargar Archivo .QUI</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
