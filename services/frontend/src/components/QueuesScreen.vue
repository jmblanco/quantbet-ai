<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue';
import axios from 'axios';
import {
  Activity,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Layers,
  Database,
  Radio,
  Sliders,
  Shield,
  Zap,
  Cpu
} from 'lucide-vue-next';

interface QueueReport {
  name: string;
  isPaused: boolean;
  waiting: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
}

const queues = ref<QueueReport[]>([]);
const loading = ref(true);
const autoRefresh = ref(true);

let timer: number | null = null;

const QUEUE_METADATA: Record<string, {
  title: string;
  description: string;
  icon: any;
  color: string;
  cadence: string;
}> = {
  'sync-live': {
    title: 'Sincronización en Directo SELAE & % LAE',
    description: 'Scraping de marcadores 1X2, goles en vivo, bote acumulado y porcentajes de sellado oficiales.',
    icon: Radio,
    color: 'emerald',
    cadence: 'Automático: Cada 60s en juego'
  },
  'tactical-refresh': {
    title: 'Refresco Táctico & Mapas de Calor 3x3',
    description: 'Cálculo de ocupación zonal, altura de bloque defensivo y carriles preferentes de los 42 clubes.',
    icon: Sliders,
    color: 'sky',
    cadence: 'Automático: Post-Jornada semanal'
  },
  'bayesian-feedback': {
    title: 'Calibración Bayesiana Elo & Goles Esperados',
    description: 'Ajuste probabilístico online de ratings de ataque (λ) y defensa (μ) basado en factor sorpresa.',
    icon: Zap,
    color: 'violet',
    cadence: 'Automático: Post-Jornada semanal'
  },
  'squad-audit': {
    title: 'Auditoría de Plantillas & Bajas Médicas',
    description: 'Verificación de onces iniciales y ausencias médicas ponderadas de Primera y Segunda División.',
    icon: Shield,
    color: 'amber',
    cadence: 'Automático: Previa de jornada (24h y 1h antes)'
  },
  'historical-ingest': {
    title: 'Ingesta Masiva de Datasets Históricos',
    description: 'Carga asíncrona de 10+ temporadas (2014-2026, 6.428 partidos) en PostgreSQL.',
    icon: Database,
    color: 'rose',
    cadence: 'Automático: Inicio de temporada / Daemon'
  }
};

const totalActive = computed(() => queues.value.reduce((acc, q) => acc + q.active, 0));
const totalWaiting = computed(() => queues.value.reduce((acc, q) => acc + q.waiting, 0));
const totalCompleted = computed(() => queues.value.reduce((acc, q) => acc + q.completed, 0));
const totalFailed = computed(() => queues.value.reduce((acc, q) => acc + q.failed, 0));

async function fetchStatus(showLoading = false) {
  if (showLoading) loading.value = true;
  try {
    const { data } = await axios.get('/api/queues/status');
    if (data.success && data.queues) {
      queues.value = data.queues;
    }
  } catch (err: any) {
    console.error('Error fetching queue status:', err);
  } finally {
    loading.value = false;
  }
}

function startPolling() {
  if (timer) clearInterval(timer);
  timer = window.setInterval(() => {
    if (autoRefresh.value) {
      fetchStatus(false);
    }
  }, 3500);
}

onMounted(async () => {
  await fetchStatus(true);
  startPolling();
});

onUnmounted(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <div class="space-y-6">
    <!-- ENCABEZADO Y CONTROLES DE LA SECCIÓN -->
    <div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-lg backdrop-blur-md">
      <div>
        <div class="flex items-center gap-2.5">
          <div class="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
            <Activity class="h-5 w-5" />
          </div>
          <div>
            <h2 class="text-base sm:text-lg font-black text-white flex items-center gap-2">
              <span>Estado de Ejecución y Refresco de Datos</span>
              <span class="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <span class="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                BullMQ + Valkey Activo
              </span>
            </h2>
            <p class="text-xs text-slate-400">
              Orquestación asíncrona de las 5 colas temáticas desacopladas con workers y reintentos exponenciales.
            </p>
          </div>
        </div>
      </div>

      <!-- Acciones de Cabecera -->
      <div class="flex items-center gap-3">
        <!-- Switch Auto-Refresh -->
        <label class="flex items-center gap-2 text-xs font-semibold text-slate-300 bg-slate-950/60 px-3 py-1.5 rounded-xl border border-slate-800 cursor-pointer select-none">
          <input type="checkbox" v-model="autoRefresh" class="rounded border-slate-700 text-emerald-500 focus:ring-0 cursor-pointer" />
          <span>Auto-refresco (3.5s)</span>
        </label>

        <!-- Botón Recargar -->
        <button
          @click="fetchStatus(true)"
          :disabled="loading"
          class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-bold transition disabled:opacity-50 cursor-pointer"
        >
          <RotateCcw class="h-3.5 w-3.5" :class="{ 'animate-spin': loading }" />
          <span>Actualizar</span>
        </button>
      </div>
    </div>

    <!-- TARJETAS DE MÉTRICAS GLOBALES -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <!-- Trabajos Activos -->
      <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3.5">
        <div class="h-10 w-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
          <Cpu class="h-5 w-5" />
        </div>
        <div>
          <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">En Ejecución</span>
          <span class="text-xl font-black text-white">{{ totalActive }}</span>
        </div>
      </div>

      <!-- En Espera -->
      <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3.5">
        <div class="h-10 w-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
          <Clock class="h-5 w-5" />
        </div>
        <div>
          <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">En Cola (Waiting)</span>
          <span class="text-xl font-black text-white">{{ totalWaiting }}</span>
        </div>
      </div>

      <!-- Completados -->
      <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3.5">
        <div class="h-10 w-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
          <CheckCircle2 class="h-5 w-5" />
        </div>
        <div>
          <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Completados</span>
          <span class="text-xl font-black text-white">{{ totalCompleted }}</span>
        </div>
      </div>

      <!-- Fallidos -->
      <div class="bg-slate-900/60 border border-slate-800/80 rounded-2xl p-4 flex items-center gap-3.5">
        <div class="h-10 w-10 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400 shrink-0">
          <AlertTriangle class="h-5 w-5" />
        </div>
        <div>
          <span class="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Fallidos</span>
          <span class="text-xl font-black text-white">{{ totalFailed }}</span>
        </div>
      </div>
    </div>

    <!-- LISTADO DE LAS 5 COLAS TEMÁTICAS -->
    <div class="space-y-3.5">
      <div class="flex items-center justify-between px-1">
        <h3 class="text-xs font-black uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
          <Layers class="h-3.5 w-3.5 text-emerald-400" />
          <span>Colas Especializadas en Valkey (Puerto 6379)</span>
        </h3>
        <span class="text-[11px] text-slate-500 font-mono">maxRetriesPerRequest: null • Exponential Backoff</span>
      </div>

      <div class="grid grid-cols-1 gap-3.5">
        <div
          v-for="q in queues"
          :key="q.name"
          class="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700/80 transition shadow-sm relative overflow-hidden"
        >
          <!-- Barra lateral de color -->
          <div
            class="absolute left-0 top-0 bottom-0 w-1.5"
            :class="q.isPaused ? 'bg-amber-500' : 'bg-emerald-500'"
          ></div>

          <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <!-- Info de la Cola -->
            <div class="flex items-start gap-3.5">
              <div class="h-10 w-10 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center shrink-0">
                <component
                  :is="QUEUE_METADATA[q.name]?.icon || Activity"
                  class="h-5 w-5 text-emerald-400"
                />
              </div>

              <div>
                <div class="flex flex-wrap items-center gap-2">
                  <h4 class="text-sm font-black text-white font-mono">{{ q.name }}</h4>
                  <span
                    class="text-[10px] font-black uppercase px-2 py-0.5 rounded-full"
                    :class="q.isPaused ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'"
                  >
                    {{ q.isPaused ? 'Pausada' : 'Operativa' }}
                  </span>
                  <span class="text-[10px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
                    ⏱️ {{ QUEUE_METADATA[q.name]?.cadence || 'Event-Driven' }}
                  </span>
                </div>

                <p class="text-xs text-slate-300 font-semibold mt-1">
                  {{ QUEUE_METADATA[q.name]?.title || q.name }}
                </p>
                <p class="text-[11px] text-slate-400 mt-0.5 max-w-2xl">
                  {{ QUEUE_METADATA[q.name]?.description }}
                </p>
              </div>
            </div>

            <!-- Métricas Numéricas de la Cola -->
            <div class="flex items-center gap-2.5 sm:gap-4 bg-slate-950/80 px-4 py-2.5 rounded-xl border border-slate-800/80 shrink-0 text-center">
              <div>
                <span class="text-[10px] text-slate-400 block font-bold uppercase">Activos</span>
                <span class="text-xs font-black text-blue-400">{{ q.active }}</span>
              </div>
              <div class="h-6 w-px bg-slate-800"></div>
              <div>
                <span class="text-[10px] text-slate-400 block font-bold uppercase">Espera</span>
                <span class="text-xs font-black text-amber-400">{{ q.waiting }}</span>
              </div>
              <div class="h-6 w-px bg-slate-800"></div>
              <div>
                <span class="text-[10px] text-slate-400 block font-bold uppercase">Completados</span>
                <span class="text-xs font-black text-emerald-400">{{ q.completed }}</span>
              </div>
              <div class="h-6 w-px bg-slate-800"></div>
              <div>
                <span class="text-[10px] text-slate-400 block font-bold uppercase">Fallidos</span>
                <span class="text-xs font-black" :class="q.failed > 0 ? 'text-red-400 font-black' : 'text-slate-400'">{{ q.failed }}</span>
              </div>
            </div>

            <!-- Estado de Ejecución en Background (Solo Lectura) -->
            <div class="flex items-center gap-2 shrink-0">
              <div class="px-3 py-1.5 rounded-xl bg-slate-950/80 border border-slate-800 text-[11px] font-semibold flex items-center gap-2">
                <span class="h-2 w-2 rounded-full" :class="q.active > 0 ? 'bg-blue-400 animate-pulse' : 'bg-emerald-400'"></span>
                <span :class="q.active > 0 ? 'text-blue-300' : 'text-slate-300'">
                  {{ q.active > 0 ? 'Procesando en Background' : 'Worker Activo (Daemon)' }}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- DIAGNÓSTICO DE INFRAESTRUCTURA & SALUD DEL SISTEMA -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-2">
      <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <div class="flex items-center gap-2 text-xs font-bold text-white mb-1.5">
          <span class="h-2 w-2 rounded-full bg-emerald-400"></span>
          <span>Broker Valkey (Redis 7+)</span>
        </div>
        <p class="text-[11px] text-slate-400">
          Puerto 6379 • Latencia &lt; 2ms. Gestiona las colas con persistencia RDB/AOF y almacenamiento de estados.
        </p>
      </div>

      <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <div class="flex items-center gap-2 text-xs font-bold text-white mb-1.5">
          <span class="h-2 w-2 rounded-full bg-emerald-400"></span>
          <span>Scheduler Repetible Activo</span>
        </div>
        <p class="text-[11px] text-slate-400">
          `scheduled-live-sync`: polling cada 60s en la cola `sync-live`. Dispara retroalimentación táctica al finalizar.
        </p>
      </div>

      <div class="bg-slate-900/60 border border-slate-800 rounded-2xl p-4">
        <div class="flex items-center gap-2 text-xs font-bold text-white mb-1.5">
          <span class="h-2 w-2 rounded-full bg-emerald-400"></span>
          <span>PostgreSQL Relacional</span>
        </div>
        <p class="text-[11px] text-slate-400">
          Puerto 5432 • Más de 6.428 partidos (2014-2026), 15 casillas y estimaciones Dixon-Coles actualizadas.
        </p>
      </div>
    </div>
  </div>
</template>
