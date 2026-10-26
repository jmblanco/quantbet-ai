<script setup lang="ts">
import { ref, computed } from 'vue';
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
  HelpCircle,
  Eye,
  Layers,
  Filter
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
}>();

const emit = defineEmits<{
  (e: 'toggleSign', casilla: number, signo: '1' | 'X' | '2'): void;
  (e: 'setPleno15', side: 'home' | 'away', val: string): void;
  (e: 'applyPreset', preset: string): void;
  (e: 'downloadQui'): void;
  (e: 'copyPronostico'): void;
  (e: 'openMethodology'): void;
}>();

// Toggle entre Vista Rápida (sin saturación) y Vista Cuántica (con desglose % y EV)
const detailedMode = ref(false);
const activeFilter = ref<'all' | 'fijos' | 'sorpresas' | 'fatiga'>('all');
const expandedCards = ref<Record<number, boolean>>({});

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

    <!-- LISTADO DE CASILLAS DEL BOLETO -->
    <div class="space-y-3">
      <div
        v-for="partido in filteredPartidos"
        :key="partido.id"
        class="glass-card rounded-2xl p-4 transition duration-200 border border-slate-800/80 hover:border-slate-700"
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
              <div class="flex items-center gap-3 text-xs text-slate-400 mt-0.5">
                <span>
                  IA sugiere: <strong class="text-emerald-400 font-mono">{{ partido.predicciones[0]?.recomendacionSigno || '1' }}</strong>
                </span>
                <span>•</span>
                <span>Confianza: <strong class="text-slate-300 font-mono">{{ Math.round(Number(partido.predicciones[0]?.confianzaScore || 65)) }}%</strong></span>
                <button
                  @click="toggleExplanation(partido.numeroCasilla)"
                  class="text-slate-400 hover:text-emerald-400 text-[11px] underline ml-1 cursor-pointer flex items-center gap-0.5"
                >
                  <span>{{ expandedCards[partido.numeroCasilla] ? 'Ocultar' : 'Ver por qué' }}</span>
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
                  : ''
              ]"
              class="h-10 w-11 sm:h-11 sm:w-12 rounded-xl border text-sm sm:text-base font-extrabold transition-all duration-150 flex items-center justify-center cursor-pointer font-mono"
            >
              {{ signo }}
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
</template>
