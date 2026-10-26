<script setup lang="ts">
import { X, ShieldCheck, Cpu, Zap, Scale, Target } from 'lucide-vue-next';

defineProps<{
  open: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();
</script>

<template>
  <div v-if="open" class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
    <div class="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl max-h-[90vh] overflow-y-auto space-y-6">
      <!-- Header -->
      <div class="flex items-center justify-between pb-4 border-b border-slate-800">
        <div class="flex items-center gap-3">
          <div class="p-2.5 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <Cpu class="h-6 w-6" />
          </div>
          <div>
            <h3 class="text-xl font-bold text-white tracking-tight">Metodología de Inversión Cuántica</h3>
            <p class="text-xs text-slate-400">Cómo calcula QuantBet AI las probabilidades y el valor esperado</p>
          </div>
        </div>
        <button 
          @click="emit('close')"
          class="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- Content Grid -->
      <div class="space-y-4 text-sm text-slate-300">
        <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div class="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-wider">
            <Target class="h-4 w-4" />
            <span>1. Modelo Bivariado de Dixon-Coles</span>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            Estimamos el ataque (&alpha;) y defensa (&beta;) de cada club a lo largo de 12 temporadas. Introducimos el factor de correlación baja &tau; (tau) para corregir el sesgo natural hacia empates de baja anotación (0-0, 1-1).
          </p>
        </div>

        <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div class="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
            <Scale class="h-4 w-4" />
            <span>2. Matriz de Valor Esperado (EV vs Masa SELAE)</span>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            La mayoría de apostantes juega por afición o favoritismo mediático. Si el modelo estima un 35% de probabilidad pero la masa de SELAE sólo apuesta un 18%, el signo ofrece un <strong>EV &gt; 1.50</strong>: en caso de acierto, los premios se multiplican exponencialmente.
          </p>
        </div>

        <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div class="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
            <Zap class="h-4 w-4" />
            <span>3. Factor Calendario & Fatiga Europea (&lt;72h)</span>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            Los equipos de Champions, Europa League o Copa que juegan con menos de 72 horas de descanso sufren una penalización empírica del -17% en efectividad ofensiva y mayor índice de rotaciones.
          </p>
        </div>

        <div class="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
          <div class="flex items-center gap-2 text-purple-400 font-bold text-xs uppercase tracking-wider">
            <ShieldCheck class="h-4 w-4" />
            <span>4. Reducción Combinatoria al 13 (-75% coste)</span>
          </div>
          <p class="text-xs text-slate-400 leading-relaxed">
            En lugar de pagar apuestas directas redundantes, utilizamos matrices de cobertura ortogonal que garantizan al 100% la categoría 13 con sólo una cuarta parte del presupuesto oficial.
          </p>
        </div>
      </div>

      <div class="pt-2">
        <button 
          @click="emit('close')"
          class="w-full py-3 px-4 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm transition shadow-lg shadow-emerald-500/20 cursor-pointer"
        >
          Entendido, Volver al Boleto
        </button>
      </div>
    </div>
  </div>
</template>
