import { PrismaClient } from '@prisma/client';
import { syncLiveQuiniela } from '../src/ingestion/live-quiniela-service.js';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Inicializando datos de La Quiniela...');

  try {
    // Sincronizar la jornada real en curso con predicciones Dixon-Coles y EV
    await syncLiveQuiniela();
    console.log('🎉 Jornada en curso inicializada y pronosticada con éxito.');
  } catch (err: any) {
    console.error('⚠️ Error al inicializar jornada en vivo:', err.message);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
