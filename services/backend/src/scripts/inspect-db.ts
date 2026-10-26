import { prisma } from '../infrastructure/db.js';

async function run() {
  const temporadas = await prisma.temporada.findMany();
  console.log('Temporadas:', temporadas.map(t => ({ id: t.id, codigo: t.codigo, activa: t.activa })));

  const jActual = await prisma.jornada.findFirst({
    where: { estado: 'EN_JUEGO' },
    include: { temporada: true, partidos: true }
  });

  if (jActual) {
    console.log('\nJornada en juego:', jActual.numero, 'Temporada:', jActual.temporada.codigo, 'Fecha:', jActual.fechaCierre);
    for (const p of jActual.partidos) {
      console.log(`Casilla ${p.numeroCasilla}: ${p.equipoLocal} vs ${p.equipoVisitante}`);
    }
  }

  // Comprobar si hay algún partido de Getafe
  const getafeMatches = await prisma.partido.findMany({
    where: {
      OR: [
        { equipoLocal: { contains: 'Getafe', mode: 'insensitive' } },
        { equipoVisitante: { contains: 'Getafe', mode: 'insensitive' } }
      ]
    },
    take: 5,
    include: { jornada: { include: { temporada: true } } },
    orderBy: { createdAt: 'desc' }
  });

  console.log('\nÚltimos partidos de Getafe:');
  for (const m of getafeMatches) {
    console.log(`Jornada ${m.jornada.numero} (${m.jornada.temporada.codigo}): ${m.equipoLocal} vs ${m.equipoVisitante} [${m.resultadoSigno || 'Pendiente'}]`);
  }

  await prisma.$disconnect();
}

run();
