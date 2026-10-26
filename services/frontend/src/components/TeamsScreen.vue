<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import axios from 'axios';
import { 
  Search, 
  Shield, 
  Flame, 
  Users, 
  TrendingUp, 
  MapPin, 
  Compass, 
  Activity, 
  ChevronRight, 
  CheckCircle2, 
  AlertTriangle,
  Star,
  Clock,
  Sparkles,
  Trophy
} from 'lucide-vue-next';

import TacticalPitchModal from './TacticalPitchModal.vue';

interface RendimientoEquipo {
  partidosJugados: number;
  victorias: number;
  empates: number;
  derrotas: number;
  golesFavor: number;
  golesContra: number;
  diferenciaGoles: number;
  puntos: number;
  xGMedio: number;
  ratingElo: number;
  racha: ('V' | 'E' | 'D')[];
}

interface FichaEquipo {
  id: string;
  nombre: string;
  nombreCorto: string;
  division: 'PRIMERA' | 'SEGUNDA';
  estadio: string;
  ciudad: string;
  entrenador: string;
  sistema: string;
  colorPrimario: string;
  rendimiento: RendimientoEquipo;
  heatmap: any;
  squad: any;
}

const loading = ref(true);
const teams = ref<FichaEquipo[]>([]);
const searchQuery = ref('');
const activeFilter = ref<'ALL' | 'PRIMERA' | 'SEGUNDA'>('ALL');

// Modal de Pizarra Táctica individual
const selectedTeamForModal = ref<any | null>(null);
const showTacticalModal = ref(false);

async function loadTeams() {
  loading.value = true;
  try {
    const res = await axios.get('/api/equipos');
    teams.value = res.data.equipos || [];
  } catch (err) {
    console.error('Error cargando directorio de equipos:', err);
  } finally {
    loading.value = false;
  }
}

onMounted(() => {
  loadTeams();
});

const filteredTeams = computed(() => {
  return teams.value.filter(t => {
    // Filtro por división
    if (activeFilter.value !== 'ALL' && t.division !== activeFilter.value) {
      return false;
    }
    // Filtro por búsqueda de texto
    if (searchQuery.value.trim()) {
      const q = searchQuery.value.toLowerCase().trim();
      const matchName = t.nombre.toLowerCase().includes(q) || t.nombreCorto.toLowerCase().includes(q);
      const matchCoach = t.entrenador.toLowerCase().includes(q);
      const matchCity = t.ciudad.toLowerCase().includes(q);
      const matchStadium = t.estadio.toLowerCase().includes(q);
      return matchName || matchCoach || matchCity || matchStadium;
    }
    return true;
  });
});

function openTeamTactics(team: FichaEquipo) {
  // Construir objeto pseudo-partido para reutilizar el modal táctico
  selectedTeamForModal.value = {
    numeroCasilla: 1,
    equipoLocal: team.nombre,
    equipoVisitante: 'Rival Referencia',
    squadReport: {
      local: team.squad,
      visitante: team.squad,
      resumenTactico: `${team.nombre} bajo la dirección de ${team.entrenador} con esquema ${team.sistema}.`,
      ventajaPlantilla: 'EQUILIBRADO'
    },
    heatmapComparison: {
      local: team.heatmap,
      visitante: team.heatmap,
      choqueEstilos: `Esquema táctico ${team.heatmap.tipoBloque.replace('_', ' ')} con línea de presión a ${team.heatmap.alturaMediaLineaMetros}m.`,
      desequilibrioZonal: `Ataque preferente por ${team.heatmap.flancoPreferente.replace('BANDA_', '')} (${team.heatmap.pctFlancoPreferente}% de las acciones).`,
      factorAjusteLocalLambda: 1.0,
      factorAjusteVisitanteLambda: 1.0
    }
  };
  showTacticalModal.value = true;
}
</script>

<template>
  <div class="space-y-6 animate-fade-in pb-12">
    <!-- HERO HEADER DEL DIRECTORIO DE EQUIPOS -->
    <section class="glass-panel rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden border border-slate-800">
      <div class="absolute -right-20 -top-20 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div class="absolute -left-20 -bottom-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div class="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div class="space-y-2">
          <div class="flex items-center gap-2">
            <span class="px-2.5 py-1 text-[11px] font-black rounded-xl bg-blue-500/20 text-blue-300 border border-blue-500/30 flex items-center gap-1.5 font-mono">
              <Trophy class="h-3.5 w-3.5 text-blue-400" />
              LALIGA EA SPORTS & HYPERMOTION 2026/2027
            </span>
            <span class="px-2 py-0.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[11px] font-mono font-bold flex items-center gap-1">
              <Clock class="h-3 w-3" />
              Actualizado Jornada 16
            </span>
          </div>

          <h2 class="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Directorio Táctico & Datos Agregados de Clubes
          </h2>
          <p class="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
            Radiografía completa de los 42 equipos profesionales: sistemas de juego, onces titulares confirmados, mapas de calor espaciales, partes médicos y ratings de rendimiento.
          </p>
        </div>

        <!-- Buscador integrado -->
        <div class="w-full md:w-80">
          <div class="relative">
            <Search class="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              v-model="searchQuery"
              type="text"
              placeholder="Buscar club, entrenador o ciudad..."
              class="w-full pl-10 pr-4 py-2.5 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-white text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition shadow-inner"
            />
          </div>
        </div>
      </div>

      <!-- FILTROS POR DIVISIÓN -->
      <div class="mt-6 pt-5 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div class="flex items-center gap-2 p-1 rounded-2xl bg-slate-950/60 border border-slate-800">
          <button
            @click="activeFilter = 'ALL'"
            :class="activeFilter === 'ALL' ? 'bg-slate-800 text-white font-bold shadow' : 'text-slate-400 hover:text-white'"
            class="px-4 py-2 rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <span>Todos los Clubes</span>
            <span class="px-1.5 py-0.2 rounded-md bg-slate-900 text-slate-400 text-[10px] font-mono">42</span>
          </button>
          <button
            @click="activeFilter = 'PRIMERA'"
            :class="activeFilter === 'PRIMERA' ? 'bg-emerald-500 text-slate-950 font-black shadow-md shadow-emerald-500/20' : 'text-slate-400 hover:text-white'"
            class="px-4 py-2 rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <span>Primera División (EA Sports)</span>
            <span class="px-1.5 py-0.2 rounded-md bg-slate-900/60 text-[10px] font-mono" :class="activeFilter === 'PRIMERA' ? 'text-slate-950' : 'text-emerald-400'">20</span>
          </button>
          <button
            @click="activeFilter = 'SEGUNDA'"
            :class="activeFilter === 'SEGUNDA' ? 'bg-blue-500 text-slate-950 font-black shadow-md shadow-blue-500/20' : 'text-slate-400 hover:text-white'"
            class="px-4 py-2 rounded-xl text-xs transition cursor-pointer flex items-center gap-1.5"
          >
            <span>Segunda División (Hypermotion)</span>
            <span class="px-1.5 py-0.2 rounded-md bg-slate-900/60 text-[10px] font-mono" :class="activeFilter === 'SEGUNDA' ? 'text-slate-950' : 'text-blue-400'">22</span>
          </button>
        </div>

        <div class="text-xs text-slate-400 font-mono">
          Mostrando <strong class="text-white">{{ filteredTeams.length }}</strong> de 42 clubes
        </div>
      </div>
    </section>

    <!-- LOADING STATE -->
    <div v-if="loading" class="py-16 text-center space-y-3">
      <div class="h-8 w-8 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin mx-auto"></div>
      <p class="text-xs font-mono text-slate-400">Cargando mapas de calor y perfiles de los 42 clubes...</p>
    </div>

    <!-- GRID DE EQUIPOS -->
    <div v-else-if="filteredTeams.length > 0" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      <div
        v-for="team in filteredTeams"
        :key="team.id"
        class="glass-card rounded-3xl p-5 border border-slate-800/80 hover:border-slate-700 transition-all duration-200 flex flex-col justify-between gap-4 group"
      >
        <!-- CABECERA DE LA TARJETA -->
        <div class="space-y-3">
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3">
              <!-- Insignia del club con iniciales -->
              <div 
                class="h-12 w-12 rounded-2xl flex items-center justify-center font-black text-sm text-white shadow-lg border border-white/20 shrink-0 font-mono"
                :style="{ backgroundColor: team.colorPrimario || '#1e293b' }"
              >
                {{ team.nombreCorto }}
              </div>

              <div>
                <div class="flex items-center gap-2">
                  <h3 class="text-base font-black text-white group-hover:text-emerald-400 transition">
                    {{ team.nombre }}
                  </h3>
                  <span 
                    class="px-2 py-0.2 rounded text-[9px] font-mono font-bold"
                    :class="team.division === 'PRIMERA' ? 'bg-emerald-500/10 text-emerald-300 border border-emerald-500/20' : 'bg-blue-500/10 text-blue-300 border border-blue-500/20'"
                  >
                    {{ team.division === 'PRIMERA' ? '1ª División' : '2ª División' }}
                  </span>
                </div>
                <div class="flex items-center gap-2 text-[11px] text-slate-400 mt-0.5">
                  <span class="flex items-center gap-1">
                    <MapPin class="h-3 w-3 text-slate-500" />
                    {{ team.estadio }} ({{ team.ciudad }})
                  </span>
                </div>
              </div>
            </div>

            <!-- ELO RATING BADGE -->
            <div class="text-right shrink-0">
              <span class="text-[9px] text-slate-500 uppercase font-mono block">Elo Rating</span>
              <span class="text-xs font-black font-mono px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-white">
                {{ team.rendimiento.ratingElo }} pts
              </span>
            </div>
          </div>

          <!-- MÉTRICAS DE RENDIMIENTO COMPETITIVO -->
          <div class="grid grid-cols-4 gap-1.5 p-2.5 rounded-2xl bg-slate-950/60 border border-slate-800/80 text-center font-mono">
            <div>
              <span class="text-[9px] text-slate-500 block uppercase">Puntos</span>
              <span class="text-xs font-black text-white">{{ team.rendimiento.puntos }}</span>
            </div>
            <div>
              <span class="text-[9px] text-slate-500 block uppercase">V-E-D</span>
              <span class="text-xs font-bold text-slate-300">{{ team.rendimiento.victorias }}-{{ team.rendimiento.empates }}-{{ team.rendimiento.derrotas }}</span>
            </div>
            <div>
              <span class="text-[9px] text-slate-500 block uppercase">Goles</span>
              <span class="text-xs font-bold" :class="team.rendimiento.diferenciaGoles >= 0 ? 'text-emerald-400' : 'text-rose-400'">
                {{ team.rendimiento.golesFavor }}:{{ team.rendimiento.golesContra }}
              </span>
            </div>
            <div>
              <span class="text-[9px] text-slate-500 block uppercase">xG Medio</span>
              <span class="text-xs font-bold text-teal-400">{{ team.rendimiento.xGMedio }}</span>
            </div>
          </div>

          <!-- DATOS TÁCTICOS & ESPACIALES -->
          <div class="space-y-1.5 text-xs text-slate-300">
            <div class="flex items-center justify-between text-[11px]">
              <span class="text-slate-400 flex items-center gap-1">
                <Users class="h-3 w-3 text-emerald-400" />
                DT & Esquema:
              </span>
              <span class="font-bold text-white font-mono">
                {{ team.entrenador }} • {{ team.sistema }}
              </span>
            </div>

            <div class="flex items-center justify-between text-[11px]">
              <span class="text-slate-400 flex items-center gap-1">
                <Flame class="h-3 w-3 text-amber-400" />
                Flanco Preferente:
              </span>
              <span class="font-bold text-amber-300 font-mono">
                {{ team.heatmap.flancoPreferente.replace('BANDA_', '') }} ({{ team.heatmap.pctFlancoPreferente }}%)
              </span>
            </div>

            <div class="flex items-center justify-between text-[11px]">
              <span class="text-slate-400 flex items-center gap-1">
                <Activity class="h-3 w-3 text-cyan-400" />
                Línea Defensiva:
              </span>
              <span class="font-bold text-cyan-300 font-mono">
                {{ team.heatmap.alturaMediaLineaMetros }}m ({{ team.heatmap.tipoBloque.replace('_', ' ') }})
              </span>
            </div>

            <!-- ESTADO DE JUGADORES / PARTE MÉDICO -->
            <div class="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px]">
              <span class="text-slate-400">Parte Médico:</span>
              <span 
                v-if="team.squad.bajas && team.squad.bajas.length > 0"
                class="px-2 py-0.2 rounded-md font-bold text-[10px] flex items-center gap-1"
                :class="team.squad.impacto.nivelAlerta === 'CRITICO' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'"
              >
                <span>🚑 {{ team.squad.bajas.length }} {{ team.squad.bajas.length === 1 ? 'Baja' : 'Bajas' }}</span>
              </span>
              <span v-else class="text-emerald-400 font-bold text-[10px] flex items-center gap-1">
                <CheckCircle2 class="h-3 w-3" />
                <span>Plantilla al completo</span>
              </span>
            </div>

            <!-- DESTACADO DE JUGADORES CLAVE / REFERENTES REALES -->
            <div class="flex flex-wrap items-center gap-1.5 pt-1">
              <span class="text-[10px] text-slate-500 font-mono">Referentes:</span>
              <span
                v-for="refName in (team.squad.referentes && team.squad.referentes.length > 0 ? team.squad.referentes : team.squad.titulares.filter((p: any) => p.posicion === 'DEL' || p.posicion === 'MED').slice(-3).map((p: any) => p.nombre))"
                :key="refName"
                class="px-2 py-0.5 rounded-lg bg-slate-900 border border-slate-800 text-[10px] font-semibold text-slate-200 flex items-center gap-1 shadow-sm"
              >
                <Star class="h-2.5 w-2.5 text-amber-400 fill-amber-400 shrink-0" />
                <span>{{ refName }}</span>
              </span>
            </div>
          </div>
        </div>

        <!-- BOTÓN DE ACCIÓN / PIZARRA TÁCTICA -->
        <button
          @click="openTeamTactics(team)"
          class="w-full py-2.5 px-4 rounded-2xl bg-slate-900 hover:bg-emerald-500 hover:text-slate-950 text-slate-200 border border-slate-700/80 hover:border-emerald-400 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-sm group-hover:border-emerald-500/40"
        >
          <Compass class="h-4 w-4 text-emerald-400 group-hover:text-slate-950 transition" />
          <span>Abrir Pizarra & Mapa de Calor</span>
          <ChevronRight class="h-3.5 w-3.5 opacity-60 ml-auto" />
        </button>
      </div>
    </div>

    <!-- EMPTY STATE -->
    <div v-else class="py-16 text-center space-y-3 glass-card rounded-3xl p-8 border border-slate-800">
      <AlertTriangle class="h-10 w-10 text-amber-400 mx-auto" />
      <h3 class="text-base font-bold text-white">No se encontraron clubes para la búsqueda</h3>
      <p class="text-xs text-slate-400">Prueba con otro término de búsqueda o cambia el filtro de división.</p>
    </div>

    <!-- MODAL DE PIZARRA TÁCTICA DEL EQUIPO -->
    <TacticalPitchModal
      :partido="selectedTeamForModal"
      :isOpen="showTacticalModal"
      @close="showTacticalModal = false"
    />
  </div>
</template>
