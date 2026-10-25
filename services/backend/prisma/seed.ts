import { PrismaClient } from '@prisma/client';
import { PredictionService } from '../src/core/services/prediction-service.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Inicializando datos semilla de La Quiniela...');

  // 1. Crear Juego QUINIELA
  const quiniela = await prisma.juego.upsert({
    where: { codigo: 'QUINIELA' },
    update: {},
    create: {
      codigo: 'QUINIELA',
      nombre: 'La Quiniela 1X2',
      activo: true
    }
  });

  // 2. Crear Temporada actual
  const temporada = await prisma.temporada.upsert({
    where: { codigo: '2024-2025' },
    update: {},
    create: {
      codigo: '2024-2025',
      activa: true
    }
  });

  // 3. Crear Jornada 32
  const fechaCierre = new Date();
  fechaCierre.setDate(fechaCierre.getDate() + 3); // Cierre en 3 días

  const jornada = await prisma.jornada.upsert({
    where: {
      juegoId_temporadaId_numero: {
        juegoId: quiniela.id,
        temporadaId: temporada.id,
        numero: 32
      }
    },
    update: {},
    create: {
      juegoId: quiniela.id,
      temporadaId: temporada.id,
      numero: 32,
      fechaCierre,
      bote: 2500000.00,
      recaudacion: 4800000.00,
      estado: 'PROGRAMADA'
    }
  });

  // 4. Crear los 15 partidos con porcentajes reales representativos de SELAE
  const partidosData = [
    { num: 1, local: 'Real Madrid', away: 'FC Barcelona', lae1: 52.0, laeX: 24.0, lae2: 24.0 },
    { num: 2, local: 'Atlético de Madrid', away: 'Sevilla FC', lae1: 68.0, laeX: 20.0, lae2: 12.0 },
    { num: 3, local: 'Athletic Club', away: 'Real Sociedad', lae1: 45.0, laeX: 30.0, lae2: 25.0 },
    { num: 4, local: 'Real Betis', away: 'Villarreal CF', lae1: 42.0, laeX: 31.0, lae2: 27.0 },
    { num: 5, local: 'Valencia CF', away: 'Girona FC', lae1: 34.0, laeX: 33.0, lae2: 33.0 },
    { num: 6, local: 'Celta de Vigo', away: 'CA Osasuna', lae1: 48.0, laeX: 29.0, lae2: 23.0 },
    { num: 7, local: 'RCD Mallorca', away: 'Deportivo Alavés', lae1: 50.0, laeX: 32.0, lae2: 18.0 },
    { num: 8, local: 'Rayo Vallecano', away: 'UD Las Palmas', lae1: 55.0, laeX: 28.0, lae2: 17.0 },
    { num: 9, local: 'Getafe CF', away: 'RCD Espanyol', lae1: 46.0, laeX: 34.0, lae2: 20.0 },
    { num: 10, local: 'Real Valladolid', away: 'CD Leganés', lae1: 39.0, laeX: 35.0, lae2: 26.0 },
    { num: 11, local: 'Real Zaragoza', away: 'Real Oviedo', lae1: 41.0, laeX: 33.0, lae2: 26.0 },
    { num: 12, local: 'Sporting de Gijón', away: 'Racing de Santander', lae1: 38.0, laeX: 32.0, lae2: 30.0 },
    { num: 13, local: 'Levante UD', away: 'Elche CF', lae1: 44.0, laeX: 31.0, lae2: 25.0 },
    { num: 14, local: 'SD Eibar', away: 'CD Tenerife', lae1: 58.0, laeX: 25.0, lae2: 17.0 },
    { num: 15, local: 'Granada CF', away: 'Málaga CF', lae1: 45.0, laeX: 30.0, lae2: 25.0 } // Pleno al 15
  ];

  for (const p of partidosData) {
    await prisma.partido.upsert({
      where: {
        jornadaId_numeroCasilla: {
          jornadaId: jornada.id,
          numeroCasilla: p.num
        }
      },
      update: {
        pctApostadoLae1: p.lae1,
        pctApostadoLaeX: p.laeX,
        pctApostadoLae2: p.lae2
      },
      create: {
        jornadaId: jornada.id,
        numeroCasilla: p.num,
        equipoLocal: p.local,
        equipoVisitante: p.away,
        pctApostadoLae1: p.lae1,
        pctApostadoLaeX: p.laeX,
        pctApostadoLae2: p.lae2
      }
    });
  }

  // 5. Ejecutar motor de predicción IA y Expected Value
  console.log('🧠 Ejecutando motor de predicción Dixon-Coles y Expected Value...');
  const predictionService = new PredictionService();
  const predictions = await predictionService.generateJornadaPredictions(jornada.id);

  console.log(`✅ ${predictions.length} predicciones calculadas y guardadas exitosamente.`);
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
