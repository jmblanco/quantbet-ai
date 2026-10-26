<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  Layers, 
  Download, 
  Copy, 
  Check, 
  Sparkles, 
  TrendingUp, 
  ShieldCheck, 
  Percent, 
  Info,
  SlidersHorizontal,
  Flame
} from 'lucide-vue-next';

const props = defineProps<{
  guarantee: string;
  totalBetsCount: number;
  totalCost: number;
  reductionRatioPct: number;
  doubleCount: number;
  tripleCount: number;
}>();

const emit = defineEmits<{
  (e: 'updateGuarantee', g: string): void;
  (e: 'downloadQui'): void;
  (e: 'copyPronostico'): void;
}>();

// Opciones de garantías oficiales
const guarantees = [
  { id: 'AL_13', label: 'Reducida al 13 (Recomendada)', savings: '-75% coste', desc: '100% garantizado al 13 si se aciertan los signos base. 12% de opción al 14.' },
  { id: 'AL_12', label: 'Reducida al 12', savings: '-88% coste', desc: 'Máximo ahorro para jugar muchos dobles y triples. Garantiza premio si se acierta la base.' },
  { id: 'AL_11', label: 'Reducida al 11', savings: '-95% coste', desc: 'Sistemas masivos para peñas con bajo presupuesto por socio.' },
  { id: 'DIRECTO', label: 'Directa (Sin reducción)', savings: '0% ahorro', desc: 'Paga todas las combinaciones posibles al 100% (coste elevado).' }
];

const directBets = computed(() => {
  return Math.pow(2, props.doubleCount) * Math.pow(3, props.tripleCount);
});

const directCost = computed(() => {
  return directBets.value * 0.75;
});

const savingsEuros = computed(() => {
  return Math.max(0, directCost.value - props.totalCost);
});
</script>

<template>
  <div class="space-y-6 animate-fade-in">
    <!-- Header Explicativo -->
    <div class="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-800 space-y-3 relative overflow-hidden">
      <div class="absolute -right-16 -top-16 w-64 h-64 bg-purple-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div class="flex items-center gap-2 text-xs font-bold text-purple-400 uppercase tracking-wider">
        <Layers class="h-4 w-4" />
        <span>Matemática Combinatoria & Sistemas de Peñas</span>
      </div>

      <h2 class="text-2xl sm:text-3xl font-black text-white tracking-tight">
        Laboratorio de Reducciones Ortogonales
      </h2>

      <p class="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
        Las apuestas múltiples directas desperdician hasta un 87% del dinero en combinaciones que se solapan innecesariamente. Las reducciones oficiales de QuantBet AI aplican matrices de cobertura mínima que recortan el coste drásticamente manteniendo intacta la categoría del premio.
      </p>
    </div>

    <!-- Comparativa de Costes & Ahorro -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div class="glass-card p-5 rounded-2xl border border-slate-800 space-y-2">
        <span class="text-xs text-slate-400 uppercase font-bold">Si jugaras en Directo</span>
        <div class="text-2xl font-black text-slate-300 font-mono">
          {{ directCost.toFixed(2) }} €
        </div>
        <p class="text-xs text-slate-500">
          {{ directBets }} apuestas simples sin reducción
        </p>
      </div>

      <div class="glass-card p-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/5 space-y-2 shadow-lg shadow-emerald-500/5">
        <div class="flex items-center justify-between">
          <span class="text-xs text-emerald-400 uppercase font-bold">Coste con Reducción IA</span>
          <span class="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500 text-slate-950 font-mono">
            -{{ reductionRatioPct }}% AHORRO
          </span>
        </div>
        <div class="text-3xl font-black text-emerald-400 font-mono">
          {{ totalCost.toFixed(2) }} €
        </div>
        <p class="text-xs text-slate-300">
          Sólo <strong class="text-white font-mono">{{ totalBetsCount }}</strong> apuestas validadas oficialmente
        </p>
      </div>

      <div class="glass-card p-5 rounded-2xl border border-slate-800 space-y-2">
        <span class="text-xs text-slate-400 uppercase font-bold">Ahorro en tu Bolsillo</span>
        <div class="text-2xl font-black text-amber-400 font-mono">
          {{ savingsEuros.toFixed(2) }} €
        </div>
        <p class="text-xs text-slate-500">
          Dinero ahorrado para reinvertir en botes futuros
        </p>
      </div>
    </div>

    <!-- Selector de Garantía -->
    <div class="glass-panel p-6 rounded-3xl border border-slate-800 space-y-4">
      <h3 class="text-base font-bold text-white flex items-center gap-2">
        <SlidersHorizontal class="h-4 w-4 text-emerald-400" />
        <span>Selecciona la Garantía Matemática del Sistema:</span>
      </h3>

      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div
          v-for="g in guarantees"
          :key="g.id"
          @click="emit('updateGuarantee', g.id)"
          :class="guarantee === g.id ? 'border-emerald-500 bg-emerald-500/10 shadow-lg shadow-emerald-500/10' : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'"
          class="p-4 rounded-2xl border transition cursor-pointer space-y-2"
        >
          <div class="flex items-center justify-between">
            <span class="font-bold text-sm text-white">{{ g.label }}</span>
            <span class="px-2 py-0.5 rounded-md text-[11px] font-black font-mono" :class="guarantee === g.id ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-slate-400'">
              {{ g.savings }}
            </span>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            {{ g.desc }}
          </p>
        </div>
      </div>
    </div>

    <!-- Generación y Descarga -->
    <div class="glass-card p-6 rounded-3xl border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
      <div>
        <h4 class="text-base font-bold text-white">Descarga el Archivo .QUI de tu Sistema</h4>
        <p class="text-xs text-slate-400">Compatible con terminales oficiales de Loterías y Apuestas del Estado y plataformas web.</p>
      </div>

      <div class="flex items-center gap-3 w-full sm:w-auto">
        <button
          @click="emit('copyPronostico')"
          class="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold transition border border-slate-700 cursor-pointer"
        >
          <Copy class="h-4 w-4 text-emerald-400" />
          <span>Copiar Formato</span>
        </button>

        <button
          @click="emit('downloadQui')"
          class="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-black transition shadow-lg shadow-emerald-500/25 cursor-pointer"
        >
          <Download class="h-4 w-4" />
          <span>Descargar .QUI ({{ totalCost.toFixed(2) }} €)</span>
        </button>
      </div>
    </div>
  </div>
</template>
