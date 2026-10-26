import { prisma } from '../infrastructure/db.js';
import { valkey } from '../infrastructure/cache.js';
import { PredictionService } from '../core/services/prediction-service.js';

async function run() {
  const service = new PredictionService();
  const jornadas = await prisma.jornada.findMany({
    where: { numero: { in: [16, 17] } },
    orderBy: { numero: 'asc' }
  });

  for (const j of jornadas) {
    console.log(`Recalibrating predictions for Jornada ${j.numero} with Unified Elo Bridge...`);
    await service.generateJornadaPredictions(j.id);
  }

  await valkey.del('cache:jornadas:list');
  console.log('✅ Recalibration of active matchdays complete.');
  await prisma.$disconnect();
}

run().catch(console.error);
