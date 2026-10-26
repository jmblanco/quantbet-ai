<script setup lang="ts">
import { ref, computed } from 'vue';
import { 
  X, 
  Flame, 
  Users, 
  AlertCircle, 
  ShieldAlert, 
  Activity, 
  Compass, 
  CheckCircle2, 
  TrendingUp, 
  Layers,
  Star,
  Clock,
  Sparkles
} from 'lucide-vue-next';

interface Jugador {
  nombre: string;
  dorsal: number;
  posicion: 'POR' | 'DEF' | 'MED' | 'DEL';
  esClave?: boolean;
  esCapitan?: boolean;
}

interface BajaJugador {
  jugador: string;
  posicion: 'POR' | 'DEF' | 'MED' | 'DEL';
  tipo: 'LESION' | 'SANCION' | 'DUDA' | 'ROTACION';
  motivo: string;
  gravedad: 'CRITICA' | 'MODERADA' | 'LEVE';
  esClave: boolean;
  tiempoEstimado?: string;
}

interface AlineacionEquipo {
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

interface PuntoCalor {
  x: number;
  y: number;
  intensidad: number;
  radio: number;
  label: string;
}

interface ZonasOcupacion {
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

interface PerfilTacticoEspacial {
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

interface MatchSquadReport {
  local: AlineacionEquipo;
  visitante: AlineacionEquipo;
  resumenTactico: string;
  ventajaPlantilla: 'LOCAL' | 'VISITANTE' | 'EQUILIBRADO';
}

interface MatchTacticalHeatmapComparison {
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
  resultadoSigno?: string | null;
  golesLocal?: number | null;
  golesVisitante?: number | null;
  predicciones: any[];
  squadReport?: MatchSquadReport;
  heatmapComparison?: MatchTacticalHeatmapComparison;
}

const props = defineProps<{
  partido: Partido | null;
  isOpen: boolean;
}>();

const emit = defineEmits<{
  (e: 'close'): void;
}>();

// Pestañas internas del modal
type ViewMode = 'pizarra' | 'calor' | 'bajas' | 'choque';
const activeMode = ref<ViewMode>('pizarra');

// Equipo seleccionado para visualización (local o visitante)
const selectedTeamSide = ref<'local' | 'visitante'>('local');

const currentSquad = computed(() => {
  if (!props.partido?.squadReport) return null;
  return selectedTeamSide.value === 'local' 
    ? props.partido.squadReport.local 
    : props.partido.squadReport.visitante;
});

const currentHeatmap = computed(() => {
  if (!props.partido?.heatmapComparison) return null;
  return selectedTeamSide.value === 'local' 
    ? props.partido.heatmapComparison.local 
    : props.partido.heatmapComparison.visitante;
});

// Coordenadas calculadas en el campo para la formación según sistema
interface PlayerPitchCoord {
  jugador: Jugador;
  topPct: number;  // 0% (fondo) a 90% (delantera)
  leftPct: number; // 0% (izq) a 100% (der)
}

const pitchPlayerCoords = computed<PlayerPitchCoord[]>(() => {
  const squad = currentSquad.value;
  if (!squad || !squad.titulares || squad.titulares.length === 0) return [];

  const titulares = squad.titulares;
  const por = titulares.filter(p => p.posicion === 'POR');
  const def = titulares.filter(p => p.posicion === 'DEF');
  const med = titulares.filter(p => p.posicion === 'MED');
  const del = titulares.filter(p => p.posicion === 'DEL');

  const coords: PlayerPitchCoord[] = [];

  // Portero
  por.forEach((p) => {
    coords.push({ jugador: p, topPct: 88, leftPct: 50 });
  });

  // Defensas
  const defCount = def.length || 4;
  def.forEach((p, idx) => {
    const step = 80 / (defCount + 1);
    const left = 10 + step * (idx + 1);
    coords.push({ jugador: p, topPct: 68, leftPct: left });
  });

  // Centrocampistas
  const medCount = med.length || 3;
  med.forEach((p, idx) => {
    const step = 84 / (medCount + 1);
    const left = 8 + step * (idx + 1);
    // Escalonar mediocentros defensivos y ofensivos
    const top = medCount > 3 && idx % 2 === 1 ? 44 : 48;
    coords.push({ jugador: p, topPct: top, leftPct: left });
  });

  // Delanteros
  const delCount = del.length || 3;
  del.forEach((p, idx) => {
    const step = 80 / (delCount + 1);
    const left = 10 + step * (idx + 1);
    coords.push({ jugador: p, topPct: 22, leftPct: left });
  });

  return coords;
});
</script>

<template>
  <div 
    v-if="isOpen && partido" 
    class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in"
    @click.self="emit('close')"
  >
    <div class="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden">
      <!-- HEADER DEL MODAL -->
      <div class="flex items-center justify-between p-4 sm:p-5 border-b border-slate-800/80 bg-slate-950/40">
        <div class="flex items-center gap-3">
          <div class="h-10 w-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 font-bold font-mono text-sm">
            #{{ partido.numeroCasilla }}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h3 class="text-base sm:text-lg font-black text-white">
                {{ partido.equipoLocal }} <span class="text-slate-500 font-normal">vs</span> {{ partido.equipoVisitante }}
              </h3>
              <span v-if="partido.resultadoSigno" class="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Marcador: {{ partido.golesLocal }}-{{ partido.golesVisitante }} [{{ partido.resultadoSigno }}]
              </span>
            </div>
            <p class="text-xs text-slate-400">
              Análisis Táctico Espacial, Alineaciones y Mapa de Calor • Refresco Semanal Continuo
            </p>
          </div>
        </div>

        <button 
          @click="emit('close')" 
          class="h-9 w-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition cursor-pointer"
        >
          <X class="h-5 w-5" />
        </button>
      </div>

      <!-- SELECTOR DE EQUIPO & VISTAS -->
      <div class="p-3 sm:px-5 bg-slate-950/60 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <!-- Switch Local / Visitante -->
        <div class="flex items-center p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            @click="selectedTeamSide = 'local'"
            :class="selectedTeamSide === 'local' ? 'bg-emerald-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
          >
            <span>🏠 {{ partido.equipoLocal }}</span>
            <span class="text-[10px] opacity-80">({{ partido.squadReport?.local.sistema || '4-3-3' }})</span>
          </button>
          <button
            @click="selectedTeamSide = 'visitante'"
            :class="selectedTeamSide === 'visitante' ? 'bg-emerald-500 text-slate-950 font-black shadow-md' : 'text-slate-400 hover:text-white'"
            class="px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer flex items-center gap-1.5"
          >
            <span>✈️ {{ partido.equipoVisitante }}</span>
            <span class="text-[10px] opacity-80">({{ partido.squadReport?.visitante.sistema || '4-4-2' }})</span>
          </button>
        </div>

        <!-- Modos de visualización -->
        <div class="flex items-center gap-1 p-1 rounded-xl bg-slate-900 border border-slate-800">
          <button
            @click="activeMode = 'pizarra'"
            :class="activeMode === 'pizarra' ? 'bg-slate-800 text-emerald-400 font-bold border border-slate-700' : 'text-slate-400 hover:text-white'"
            class="px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
          >
            <Users class="h-3.5 w-3.5" />
            <span>Once Inicial</span>
          </button>
          <button
            @click="activeMode = 'calor'"
            :class="activeMode === 'calor' ? 'bg-slate-800 text-amber-400 font-bold border border-slate-700' : 'text-slate-400 hover:text-white'"
            class="px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
          >
            <Flame class="h-3.5 w-3.5" />
            <span>Mapa de Calor</span>
          </button>
          <button
            @click="activeMode = 'bajas'"
            :class="activeMode === 'bajas' ? 'bg-slate-800 text-rose-400 font-bold border border-slate-700' : 'text-slate-400 hover:text-white'"
            class="px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
          >
            <ShieldAlert class="h-3.5 w-3.5" />
            <span>Bajas & Parte</span>
            <span v-if="(currentSquad?.bajas.length || 0) > 0" class="h-2 w-2 rounded-full bg-rose-500"></span>
          </button>
          <button
            @click="activeMode = 'choque'"
            :class="activeMode === 'choque' ? 'bg-slate-800 text-cyan-400 font-bold border border-slate-700' : 'text-slate-400 hover:text-white'"
            class="px-2.5 py-1.5 rounded-lg text-xs transition cursor-pointer flex items-center gap-1"
          >
            <Compass class="h-3.5 w-3.5" />
            <span>Duelo Táctico</span>
          </button>
        </div>
      </div>

      <!-- CUERPO PRINCIPAL DEL MODAL (SCROLLABLE) -->
      <div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
        <!-- VISTA 1 & 2: CAMPO DE FÚTBOL CON ONCE O MAPA DE CALOR -->
        <div v-if="activeMode === 'pizarra' || activeMode === 'calor'" class="space-y-4">
          <!-- INFO BANNER DEL EQUIPO ACTIVO -->
          <div class="flex flex-wrap items-center justify-between gap-3 p-3 rounded-2xl bg-slate-950/70 border border-slate-800 text-xs">
            <div class="flex items-center gap-2">
              <span class="font-bold text-white text-sm">{{ currentSquad?.equipo }}</span>
              <span class="text-slate-400">• Entrenador: <strong class="text-slate-200">{{ currentSquad?.entrenador }}</strong></span>
              <span class="px-2 py-0.5 rounded font-mono text-[10px] font-bold" :class="currentSquad?.estado === 'CONFIRMADA' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'">
                {{ currentSquad?.estado }}
              </span>
            </div>

            <div class="flex items-center gap-3 text-slate-400 font-mono text-[11px]">
              <span>Sistema: <strong class="text-emerald-400">{{ currentSquad?.sistema }}</strong></span>
              <span>•</span>
              <span>Altura Bloque: <strong class="text-white">{{ currentHeatmap?.alturaMediaLineaMetros }}m</strong></span>
              <span>•</span>
              <span class="text-slate-400 flex items-center gap-1">
                <Clock class="h-3 w-3 text-emerald-400" />
                Refresco sem. J{{ currentHeatmap?.ultimaJornadaActualizada || 16 }}
              </span>
            </div>
          </div>

          <div class="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            <!-- PITCH DE FÚTBOL (CANVAS / SVG PROFESIONAL) -->
            <div class="lg:col-span-7 flex justify-center">
              <div class="relative w-full max-w-[420px] aspect-[2/3] rounded-3xl overflow-hidden border-2 border-emerald-700/60 shadow-2xl bg-gradient-to-b from-[#064e3b] via-[#043d2f] to-[#022c22] select-none p-3">
                <!-- CÉSPED CON FRANJAS REGLAMENTARIAS -->
                <div class="absolute inset-0 opacity-20 pointer-events-none flex flex-col">
                  <div v-for="i in 10" :key="i" :class="i % 2 === 0 ? 'bg-emerald-300/10' : 'bg-transparent'" class="flex-1"></div>
                </div>

                <!-- LÍNEAS DEL TERRENO DE JUEGO (BLANCAS SEMITRANSPARENTES) -->
                <svg class="absolute inset-0 w-full h-full pointer-events-none stroke-white/40 fill-none stroke-[1.5]" viewBox="0 0 100 150" preserveAspectRatio="none">
                  <!-- Línea perimetral -->
                  <rect x="5" y="5" width="90" height="140" />
                  <!-- Línea de medio campo -->
                  <line x1="5" y1="75" x2="95" y2="75" />
                  <!-- Círculo central -->
                  <circle cx="50" cy="75" r="14" />
                  <circle cx="50" cy="75" r="1" class="fill-white/70" />
                  <!-- Área Grande Rival (Arriba) -->
                  <rect x="22" y="5" width="56" height="24" />
                  <rect x="36" y="5" width="28" height="9" />
                  <circle cx="50" cy="18" r="0.8" class="fill-white/70" />
                  <path d="M 38 29 A 12 12 0 0 0 62 29" />
                  <!-- Área Grande Propia (Abajo) -->
                  <rect x="22" y="121" width="56" height="24" />
                  <rect x="36" y="136" width="28" height="9" />
                  <circle cx="50" cy="132" r="0.8" class="fill-white/70" />
                  <path d="M 38 121 A 12 12 0 0 1 62 121" />
                  <!-- Córners -->
                  <path d="M 5 9 A 4 4 0 0 0 9 5" />
                  <path d="M 91 5 A 4 4 0 0 0 95 9" />
                  <path d="M 5 141 A 4 4 0 0 0 9 145" />
                  <path d="M 91 145 A 4 4 0 0 0 95 141" />
                </svg>

                <!-- CAPA A: MAPA DE CALOR TÉRMICO -->
                <div v-if="activeMode === 'calor' && currentHeatmap" class="absolute inset-0 pointer-events-none overflow-hidden">
                  <!-- Puntos calientes gaussianos -->
                  <div
                    v-for="(punto, idx) in currentHeatmap.puntosCalientes"
                    :key="idx"
                    class="absolute rounded-full transform -translate-x-1/2 -translate-y-1/2 blur-2xl transition-all duration-700"
                    :style="{
                      left: `${punto.y}%`,
                      top: `${100 - punto.x}%`,
                      width: `${punto.radio * 4}%`,
                      height: `${punto.radio * 4}%`,
                      background: `radial-gradient(circle, rgba(239, 68, 68, ${punto.intensidad * 0.85}) 0%, rgba(245, 158, 11, ${punto.intensidad * 0.6}) 40%, rgba(16, 185, 129, ${punto.intensidad * 0.3}) 75%, transparent 100%)`
                    }"
                  ></div>

                  <!-- Línea de altura de bloque defensivo -->
                  <div 
                    class="absolute left-0 right-0 border-b-2 border-dashed border-cyan-400/80 flex items-center justify-between px-3"
                    :style="{ bottom: `${(currentHeatmap.alturaMediaLineaMetros / 105) * 100}%` }"
                  >
                    <span class="text-[9px] font-mono font-black bg-cyan-950/80 text-cyan-300 px-1.5 py-0.5 rounded border border-cyan-500/40">
                      Línea Defensiva: {{ currentHeatmap.alturaMediaLineaMetros }}m
                    </span>
                    <span class="text-[9px] font-mono text-cyan-300 bg-cyan-950/80 px-1 rounded">
                      {{ currentHeatmap.tipoBloque.replace('_', ' ') }}
                    </span>
                  </div>

                  <!-- Etiquetas interactivas de zonas calientes -->
                  <div
                    v-for="(punto, idx) in currentHeatmap.puntosCalientes"
                    :key="'lbl-' + idx"
                    class="absolute pointer-events-auto transform -translate-x-1/2 -translate-y-1/2 cursor-pointer group"
                    :style="{
                      left: `${punto.y}%`,
                      top: `${100 - punto.x}%`
                    }"
                  >
                    <div class="h-3 w-3 rounded-full bg-amber-400 border-2 border-white shadow-lg animate-ping absolute opacity-60"></div>
                    <div class="h-3 w-3 rounded-full bg-amber-400 border-2 border-white shadow-md relative"></div>
                    <div class="absolute left-1/2 -translate-x-1/2 top-4 whitespace-nowrap px-2 py-0.5 rounded-md bg-slate-950/90 text-white text-[10px] font-bold border border-slate-700 shadow-xl opacity-0 group-hover:opacity-100 transition duration-150 z-20 pointer-events-none">
                      {{ punto.label }} (Intensidad {{ Math.round(punto.intensidad * 100) }}%)
                    </div>
                  </div>
                </div>

                <!-- CAPA B: ONCE TITULAR EN EL CAMPO -->
                <div v-if="activeMode === 'pizarra'" class="absolute inset-0">
                  <div
                    v-for="item in pitchPlayerCoords"
                    :key="item.jugador.dorsal + item.jugador.nombre"
                    class="absolute transform -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer transition-all duration-300 hover:scale-110 z-10"
                    :style="{
                      left: `${item.leftPct}%`,
                      top: `${item.topPct}%`
                    }"
                  >
                    <!-- Ficha del futbolista -->
                    <div 
                      class="h-8 w-8 sm:h-9 sm:w-9 rounded-full flex items-center justify-center font-black text-xs font-mono shadow-xl border-2 transition"
                      :class="[
                        item.jugador.posicion === 'POR' ? 'bg-amber-500 text-slate-950 border-white' :
                        item.jugador.esClave ? 'bg-emerald-400 text-slate-950 border-amber-300 ring-2 ring-amber-400/50' :
                        'bg-slate-900 text-white border-emerald-400/80'
                      ]"
                    >
                      <span>{{ item.jugador.dorsal }}</span>
                      <Star v-if="item.jugador.esClave" class="h-2.5 w-2.5 text-amber-900 absolute -top-1 -right-1 fill-amber-400" />
                    </div>

                    <!-- Nombre y Posición -->
                    <div class="mt-1 px-1.5 py-0.2 rounded bg-slate-950/90 border border-slate-800 text-[9px] font-bold text-white whitespace-nowrap shadow-md max-w-[70px] truncate">
                      {{ item.jugador.nombre.split(' ').pop() }}
                    </div>
                  </div>
                </div>

                <!-- FLECHA DE DIRECCIÓN DE ATAQUE -->
                <div class="absolute bottom-2 left-3 flex items-center gap-1 text-[9px] font-mono font-bold text-emerald-300/70">
                  <span>▲ Sentido de ataque</span>
                </div>
              </div>
            </div>

            <!-- DETALLE TÁCTICO & ESTADÍSTICAS LATERALES -->
            <div class="lg:col-span-5 space-y-4">
              <!-- Rejilla de Ocupación Zonal 3x3 -->
              <div v-if="currentHeatmap" class="glass-card rounded-2xl p-4 border border-slate-800 space-y-3">
                <div class="flex items-center justify-between">
                  <h4 class="text-xs font-bold text-white flex items-center gap-1.5 uppercase font-mono">
                    <Flame class="h-3.5 w-3.5 text-amber-400" />
                    Ocupación Zonal (% del tiempo)
                  </h4>
                  <span class="text-[10px] text-slate-400 font-mono">Rejilla 3x3</span>
                </div>

                <div class="grid grid-cols-3 gap-1.5 text-center font-mono text-[11px]">
                  <!-- Ataque -->
                  <div class="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 font-bold">
                    <span class="text-[9px] block text-slate-400">At. Izq</span>
                    {{ currentHeatmap.zonas.ataqueIzquierda }}%
                  </div>
                  <div class="p-2 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold">
                    <span class="text-[9px] block text-slate-400">Área</span>
                    {{ currentHeatmap.zonas.ataqueCentro }}%
                  </div>
                  <div class="p-2 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 font-bold">
                    <span class="text-[9px] block text-slate-400">At. Der</span>
                    {{ currentHeatmap.zonas.ataqueDerecha }}%
                  </div>
                  <!-- Medular -->
                  <div class="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-bold">
                    <span class="text-[9px] block text-slate-400">Med. Izq</span>
                    {{ currentHeatmap.zonas.medularIzquierda }}%
                  </div>
                  <div class="p-2 rounded-lg bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-black">
                    <span class="text-[9px] block text-slate-400">Círculo</span>
                    {{ currentHeatmap.zonas.medularCentro }}%
                  </div>
                  <div class="p-2 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-bold">
                    <span class="text-[9px] block text-slate-400">Med. Der</span>
                    {{ currentHeatmap.zonas.medularDerecha }}%
                  </div>
                  <!-- Defensiva -->
                  <div class="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-bold">
                    <span class="text-[9px] block text-slate-400">Def. Izq</span>
                    {{ currentHeatmap.zonas.defensivaIzquierda }}%
                  </div>
                  <div class="p-2 rounded-lg bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold">
                    <span class="text-[9px] block text-slate-400">Zaga</span>
                    {{ currentHeatmap.zonas.defensivaCentro }}%
                  </div>
                  <div class="p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 font-bold">
                    <span class="text-[9px] block text-slate-400">Def. Der</span>
                    {{ currentHeatmap.zonas.defensivaDerecha }}%
                  </div>
                </div>

                <div class="text-[11px] text-slate-300 leading-relaxed bg-slate-950/60 p-2.5 rounded-xl border border-slate-800/80">
                  <span class="text-emerald-400 font-bold">Diagnóstico Espacial:</span> {{ currentHeatmap.resumenEspacial }}
                </div>
              </div>

              <!-- Métricas clave de rendimiento espacial -->
              <div v-if="currentHeatmap" class="space-y-2 text-xs">
                <div class="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                  <span class="text-slate-400">Flanco preferente de llegada:</span>
                  <span class="font-bold text-white font-mono flex items-center gap-1.5">
                    <span class="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px]">
                      {{ currentHeatmap.flancoPreferente.replace('BANDA_', '') }} ({{ currentHeatmap.pctFlancoPreferente }}%)
                    </span>
                  </span>
                </div>

                <div class="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                  <span class="text-slate-400">Presión en último tercio:</span>
                  <span class="font-bold text-amber-400 font-mono">{{ currentHeatmap.presionUltimoTercioPct }}% del tiempo</span>
                </div>

                <div class="p-3 rounded-2xl bg-slate-950/60 border border-slate-800/80 flex items-center justify-between">
                  <span class="text-slate-400">Posesión media de balón:</span>
                  <span class="font-bold text-emerald-400 font-mono">{{ currentHeatmap.posesionMediaPct }}%</span>
                </div>
              </div>

              <!-- Lista de suplentes y revulsivos -->
              <div v-if="currentSquad?.suplentesDestacados" class="p-3 rounded-2xl bg-slate-950/40 border border-slate-800/60">
                <span class="text-[10px] text-slate-500 uppercase font-mono font-bold block mb-1">Banquillo y Revulsivos</span>
                <p class="text-xs text-slate-400 leading-relaxed font-mono">
                  {{ currentSquad.suplentesDestacados.join(' • ') }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <!-- VISTA 3: PARTE MÉDICO Y DISCIPLINARIO (BAJAS, SANCIONES Y DUDAS) -->
        <div v-else-if="activeMode === 'bajas'" class="space-y-4">
          <div class="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 flex items-center justify-between">
            <div>
              <h4 class="text-sm font-black text-white flex items-center gap-2">
                <ShieldAlert class="h-4 w-4 text-rose-400" />
                Informe de Bajas de {{ currentSquad?.equipo }}
              </h4>
              <p class="text-xs text-slate-400 mt-0.5">
                {{ currentSquad?.impacto.resumen }}
              </p>
            </div>

            <div class="text-right">
              <span class="text-[10px] text-slate-500 uppercase font-mono block">Impacto en Gol (xG)</span>
              <span class="text-sm font-black font-mono" :class="currentSquad && currentSquad.impacto.factorOfensivo < 1.0 ? 'text-rose-400' : 'text-slate-300'">
                {{ currentSquad ? Math.round((currentSquad.impacto.factorOfensivo - 1.0) * 100) : 0 }}% ataque
              </span>
            </div>
          </div>

          <!-- LISTA DE BAJAS DEL EQUIPO -->
          <div v-if="currentSquad && currentSquad.bajas.length > 0" class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div 
              v-for="baja in currentSquad.bajas" 
              :key="baja.jugador"
              class="glass-card rounded-2xl p-4 border border-slate-800/80 flex items-start gap-3.5"
            >
              <div 
                class="h-10 w-10 rounded-xl flex items-center justify-center shrink-0 text-sm font-bold"
                :class="[
                  baja.tipo === 'LESION' ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' :
                  baja.tipo === 'SANCION' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' :
                  'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                ]"
              >
                <span v-if="baja.tipo === 'LESION'">🚑</span>
                <span v-else-if="baja.tipo === 'SANCION'">🟥</span>
                <span v-else>⚠️</span>
              </div>

              <div class="space-y-1 flex-1">
                <div class="flex items-center justify-between">
                  <span class="font-black text-white text-sm flex items-center gap-1.5">
                    {{ baja.jugador }}
                    <span v-if="baja.esClave" class="px-1.5 py-0.2 rounded bg-amber-400/20 text-amber-300 border border-amber-400/30 text-[9px] font-bold">
                      ⭐ CLAVE
                    </span>
                  </span>
                  <span class="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {{ baja.posicion }}
                  </span>
                </div>

                <p class="text-xs text-slate-300 leading-snug">
                  {{ baja.motivo }}
                </p>

                <div class="flex items-center gap-2 pt-1 text-[11px] font-mono text-slate-400">
                  <span class="text-slate-500">Estado:</span>
                  <span class="text-rose-400 font-semibold">{{ baja.tiempoEstimado || 'Baja confirmada' }}</span>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="p-8 text-center rounded-2xl bg-slate-950/40 border border-slate-800/60 text-slate-400 space-y-2">
            <CheckCircle2 class="h-8 w-8 text-emerald-400 mx-auto" />
            <p class="text-sm font-bold text-white">Plantilla al completo sin incidencias</p>
            <p class="text-xs">El cuerpo técnico de {{ currentSquad?.equipo }} cuenta con todos sus efectivos titulares disponibles.</p>
          </div>
        </div>

        <!-- VISTA 4: CHOQUE TÁCTICO CUÁNTICO (COMPARATIVA LOCAL VS VISITANTE) -->
        <div v-else-if="activeMode === 'choque' && partido.heatmapComparison" class="space-y-4">
          <div class="p-5 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-slate-900 to-blue-950/40 border border-slate-800 space-y-3">
            <div class="flex items-center gap-2">
              <Sparkles class="h-4 w-4 text-emerald-400" />
              <h4 class="text-sm font-black text-white uppercase tracking-wider font-mono">
                Análisis Táctico Comparativo IA
              </h4>
            </div>

            <p class="text-sm text-slate-200 leading-relaxed">
              {{ partido.heatmapComparison.choqueEstilos }}
            </p>

            <div class="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 text-xs text-emerald-300 leading-relaxed font-mono">
              <strong class="text-white">Desequilibrio Espacial:</strong> {{ partido.heatmapComparison.desequilibrioZonal }}
            </div>
          </div>

          <!-- COMPARATIVA DE MÉTRICAS VIS A VIS -->
          <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 text-center">
            <div class="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span class="text-[10px] text-slate-500 uppercase font-mono block">Altura de Presión</span>
              <div class="text-base font-black text-white font-mono">
                {{ partido.heatmapComparison.local.alturaMediaLineaMetros }}m <span class="text-slate-500 font-normal">vs</span> {{ partido.heatmapComparison.visitante.alturaMediaLineaMetros }}m
              </div>
              <span class="text-[10px] text-emerald-400 block font-mono">
                {{ partido.heatmapComparison.local.tipoBloque }} vs {{ partido.heatmapComparison.visitante.tipoBloque }}
              </span>
            </div>

            <div class="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span class="text-[10px] text-slate-500 uppercase font-mono block">Posesión Estimada</span>
              <div class="text-base font-black text-white font-mono">
                {{ partido.heatmapComparison.local.posesionMediaPct }}% <span class="text-slate-500 font-normal">vs</span> {{ partido.heatmapComparison.visitante.posesionMediaPct }}%
              </div>
              <span class="text-[10px] text-slate-400 block font-mono">Dominio territorial medio</span>
            </div>

            <div class="p-4 rounded-2xl bg-slate-950/60 border border-slate-800 space-y-1">
              <span class="text-[10px] text-slate-500 uppercase font-mono block">Ventaja Plantilla</span>
              <div class="text-base font-black text-emerald-400 font-mono">
                {{ partido.squadReport?.ventajaPlantilla || 'EQUILIBRADO' }}
              </div>
              <span class="text-[10px] text-slate-400 block font-mono">Por balance de bajas</span>
            </div>
          </div>
        </div>
      </div>

      <!-- FOOTER -->
      <div class="p-4 border-t border-slate-800 bg-slate-950/60 flex items-center justify-between text-xs text-slate-400">
        <div class="flex items-center gap-2">
          <Activity class="h-4 w-4 text-emerald-400" />
          <span>Datos tácticos alimentados semanalmente por la IA predictiva</span>
        </div>

        <button 
          @click="emit('close')"
          class="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold transition cursor-pointer"
        >
          Cerrar Pizarra
        </button>
      </div>
    </div>
  </div>
</template>
