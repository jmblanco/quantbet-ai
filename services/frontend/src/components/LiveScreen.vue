<script setup lang="ts">
import { computed } from 'vue';
import { 
  Trophy, 
  Clock, 
  Coins, 
  CheckCircle2, 
  XCircle, 
  Hourglass, 
  RotateCcw, 
  Flame,
  ArrowRight,
  TrendingUp,
  Activity
} from 'lucide-vue-next';

interface Prediccion {
  recomendacionSigno: string;
}

interface Partido {
  id: string;
  numeroCasilla: number;
  equipoLocal: string;
  equipoVisitante: string;
  golesLocal?: number | null;
  golesVisitante?: number | null;
  resultadoSigno?: string | null;
  predicciones: Prediccion[];
}

interface Jornada {
  id: string;
  numero: number;
  bote: string;
  recaudacion: string;
  estado: string;
  partidos: Partido[];
}

const props = defineProps<{
  jornada: Jornada;
  userSelections: Record<number, { 1: boolean; X: boolean; 2: boolean }>;
  syncing: boolean;
}>();

const emit = defineEmits<{
  (e: 'syncLive'): void;
}>();

const finishedMatches = computed(() => {
  return props.jornada.partidos.filter(p => !!p.resultadoSigno);
});

const pendingMatches = computed(() => {
  return props.jornada.partidos.filter(p => !p.resultadoSigno);
});

// Aciertos calculados frente a las selecciones del usuario
const userHits = computed(() => {
  let hits = 0;
  for (const p of finishedMatches.value) {
    const sel = props.userSelections[p.numeroCasilla];
    if (p.resultadoSigno && sel && sel[p.resultadoSigno as '1' | 'X' | '2']) {
      hits++;
    }
  }
  return hits;
});

const aiHits = computed(() => {
  let hits = 0;
  for (const p of finishedMatches.value) {
    const rec = p.predicciones[0]?.recomendacionSigno;
    if (p.resultadoSigno && rec && rec.includes(p.resultadoSigno)) {
      hits++;
    }
  }
  return hits;
});

// Tabla oficial de categorías y estimación de premios
const prizeCategories = computed(() => {
  const boteNum = Number(props.jornada.bote || 3442752);
  const recNum = Number(props.jornada.recaudacion || 4800000);

  return [
    { cat: 'Especial (15 Aciertos)', share: 'Bote Acumulado + 7,5%', estimated: `${boteNum.toLocaleString('es-ES')} €`, minHits: 15 },
    { cat: '1ª Categoría (14 Aciertos)', share: '16% de la recaudación', estimated: `${Math.round(recNum * 0.16 * 0.1).toLocaleString('es-ES')} €`, minHits: 14 },
    { cat: '2ª Categoría (13 Aciertos)', share: '7,5% de la recaudación', estimated: `${Math.round((recNum * 0.075) / 250).toLocaleString('es-ES')} €`, minHits: 13 },
    { cat: '3ª Categoría (12 Aciertos)', share: '7,5% de la recaudación', estimated: `${Math.round((recNum * 0.075) / 2200).toLocaleString('es-ES')} €`, minHits: 12 },
    { cat: '4ª Categoría (11 Aciertos)', share: '7,5% de la recaudación', estimated: `${Math.round((recNum * 0.075) / 12000).toLocaleString('es-ES')} €`, minHits: 11 },
    { cat: '5ª Categoría (10 Aciertos)', share: '9% de la recaudación', estimated: `${Math.round((recNum * 0.09) / 50000).toLocaleString('es-ES')} €`, minHits: 10 }
  ];
});
</script>

<template>
  <div class="space-y-6 animate-fade-in">
    <!-- PANEL DE RESUMEN EN VIVO -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <!-- Tarjeta 1: Estado del Sorteo -->
      <div class="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Estado Jornada {{ jornada.numero }}</span>
          <span
            class="px-2.5 py-0.5 rounded-full text-[10px] font-black flex items-center gap-1 border"
            :class="pendingMatches.length === 0 || jornada.estado === 'FINALIZADA' ? 'bg-slate-800 text-slate-300 border-slate-700' : 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'"
          >
            <span v-if="pendingMatches.length > 0 && jornada.estado !== 'FINALIZADA'" class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
            <span>{{ pendingMatches.length === 0 || jornada.estado === 'FINALIZADA' ? 'FINALIZADA' : 'EN JUEGO' }}</span>
          </span>
        </div>

        <div class="flex items-baseline gap-2">
          <span class="text-3xl font-black text-white font-mono">{{ finishedMatches.length }} / 15</span>
          <span class="text-xs text-slate-400">partidos disputados</span>
        </div>

        <p class="text-xs text-slate-300">
          <span v-if="pendingMatches.length === 0">
            Todos los 15 encuentros de la jornada han concluido con escrutinio oficial.
          </span>
          <span v-else>
            Queda <strong class="text-amber-400 font-mono">{{ pendingMatches.length }}</strong> encuentro decisivo por jugarse: 
            <strong>{{ pendingMatches.map(p => p.equipoLocal + ' vs ' + p.equipoVisitante).slice(0, 2).join(', ') }}</strong>.
          </span>
        </p>

        <button
          @click="emit('syncLive')"
          :disabled="syncing"
          class="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition border border-slate-700 cursor-pointer disabled:opacity-50"
        >
          <RotateCcw class="h-3.5 w-3.5 text-emerald-400" :class="{ 'animate-spin': syncing }" />
          <span>{{ syncing ? 'Sincronizando con SELAE...' : 'Actualizar Resultados en Directo' }}</span>
        </button>
      </div>

      <!-- Tarjeta 2: Aciertos en Tiempo Real -->
      <div class="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Rendimiento de tu Boleto</span>
          <Trophy class="h-4 w-4 text-amber-400" />
        </div>

        <div class="flex items-baseline gap-2">
          <span class="text-3xl font-black text-emerald-400 font-mono">{{ userHits }} / {{ finishedMatches.length }}</span>
          <span class="text-xs text-slate-400">aciertos confirmados</span>
        </div>

        <p class="text-xs text-slate-300">
          Rendimiento del motor IA: <strong class="text-white font-mono">{{ aiHits }} aciertos</strong> sobre los 14 ya disputados ({{ Math.round((aiHits / Math.max(1, finishedMatches.length)) * 100) }}% de efectividad).
        </p>

        <div class="p-2 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-emerald-400 flex items-center gap-1.5">
          <CheckCircle2 class="h-3.5 w-3.5 shrink-0" />
          <span>Tu jugada aspira a categoría de premios al terminar esta noche.</span>
        </div>
      </div>

      <!-- Tarjeta 3: Bote Oficial en Juego -->
      <div class="glass-panel p-5 rounded-3xl border border-slate-800 space-y-3">
        <div class="flex items-center justify-between">
          <span class="text-xs font-bold text-slate-400 uppercase tracking-wider">Bote Acumulado</span>
          <Coins class="h-4 w-4 text-amber-400" />
        </div>

        <div class="text-3xl font-black text-amber-400 font-mono">
          {{ Number(jornada.bote || 3442752).toLocaleString('es-ES') }} €
        </div>

        <p class="text-xs text-slate-400">
          Recaudación provisional del sorteo: <strong>{{ Number(jornada.recaudacion || 4800000).toLocaleString('es-ES') }} €</strong>.
        </p>

        <div class="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-300 flex items-center gap-1.5">
          <Flame class="h-3.5 w-3.5 shrink-0" />
          <span>Bote de Primera División con Pleno al 15 acumulado.</span>
        </div>
      </div>
    </div>

    <!-- SECCIÓN: TABLA DE CATEGORÍAS & PREMIOS ESTIMADOS -->
    <div class="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
      <div class="flex items-center justify-between">
        <div>
          <h3 class="text-lg font-bold text-white tracking-tight flex items-center gap-2">
            <Trophy class="h-5 w-5 text-amber-400" />
            <span>Escalafón de Premios Oficiales Estimados</span>
          </h3>
          <p class="text-xs text-slate-400">Proyección matemática de reparto según los aciertos logrados en la Jornada {{ jornada.numero }}</p>
        </div>
      </div>

      <div class="overflow-x-auto">
        <table class="w-full text-left text-xs">
          <thead>
            <tr class="border-b border-slate-800 text-slate-400 uppercase font-mono text-[10px]">
              <th class="py-2.5 px-3">Categoría</th>
              <th class="py-2.5 px-3">Aciertos Necesarios</th>
              <th class="py-2.5 px-3">Fondo de Premios</th>
              <th class="py-2.5 px-3 text-right">Premio Estimado</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-slate-800/60 font-mono">
            <tr 
              v-for="p in prizeCategories" 
              :key="p.cat"
              :class="userHits >= p.minHits ? 'bg-emerald-500/5 text-emerald-300 font-bold' : 'text-slate-300'"
              class="hover:bg-slate-800/40 transition"
            >
              <td class="py-3 px-3 font-sans font-medium flex items-center gap-2">
                <span v-if="userHits >= p.minHits" class="h-2 w-2 rounded-full bg-emerald-400"></span>
                <span>{{ p.cat }}</span>
              </td>
              <td class="py-3 px-3">{{ p.minHits }} aciertos</td>
              <td class="py-3 px-3 text-slate-400">{{ p.share }}</td>
              <td class="py-3 px-3 text-right font-black text-amber-400">{{ p.estimated }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <!-- SECCIÓN: MARCADORES Y RESULTADOS OFICIALES DE LA JORNADA -->
    <div class="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
      <h3 class="text-lg font-bold text-white tracking-tight flex items-center gap-2">
        <Activity class="h-5 w-5 text-emerald-400" />
        <span>Escrutinio Partido a Partido (15 Casillas)</span>
      </h3>

      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        <div
          v-for="p in jornada.partidos"
          :key="p.id"
          class="p-3.5 rounded-2xl border transition"
          :class="p.resultadoSigno ? 'bg-slate-900/80 border-slate-800' : 'bg-amber-500/5 border-amber-500/30 shadow-lg shadow-amber-500/5'"
        >
          <div class="flex items-center justify-between text-xs mb-2">
            <span class="font-mono font-bold text-slate-400">
              Casilla {{ p.numeroCasilla === 15 ? 'P-15' : p.numeroCasilla }}
            </span>

            <span
              v-if="p.resultadoSigno"
              class="px-2 py-0.5 rounded-md text-[10px] font-black bg-slate-800 text-slate-300 font-mono"
            >
              FINALIZADO
            </span>
            <span
              v-else
              class="px-2 py-0.5 rounded-md text-[10px] font-black bg-amber-500 text-slate-950 font-mono animate-pulse"
            >
              EN JUEGO HOY 21:00h
            </span>
          </div>

          <div class="flex items-center justify-between text-sm font-bold text-white my-1">
            <span class="truncate">{{ p.equipoLocal }}</span>
            <span v-if="p.golesLocal !== null && p.golesVisitante !== null" class="font-mono text-base px-2 text-emerald-400">
              {{ p.golesLocal }} - {{ p.golesVisitante }}
            </span>
            <span v-else class="text-xs text-amber-400 font-mono px-2">vs</span>
            <span class="truncate text-right">{{ p.equipoVisitante }}</span>
          </div>

          <div class="flex items-center justify-between text-xs pt-2 mt-2 border-t border-slate-800/80">
            <span class="text-slate-400 text-[11px]">
              Signo Oficial: <strong class="text-white font-mono">{{ p.resultadoSigno || 'Pendiente' }}</strong>
            </span>
            <span class="text-slate-400 text-[11px]">
              IA Sugirió: <strong class="text-emerald-400 font-mono">{{ p.predicciones[0]?.recomendacionSigno || '1' }}</strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
