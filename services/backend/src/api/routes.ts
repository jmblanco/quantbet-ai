import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { prisma } from '../infrastructure/db.js';
import { valkey } from '../infrastructure/cache.js';
import { PredictionService } from '../core/services/prediction-service.js';
import { MetricsService } from '../core/services/metrics-service.js';
import { processReduction, BaseBetMatch } from '../core/math/reductions.js';
import { calculateExpectedValue } from '../core/math/expected-value.js';
import { evaluateTeamFatigue } from '../core/math/fatigue.js';
import { ingestHistoricalData } from '../ingestion/historical-loader.js';
import { syncLiveQuiniela } from '../ingestion/live-quiniela-service.js';

function enrichJornadaPartidos(jornada: any) {
  const enrichedPartidos = jornada.partidos.map((partido: any) => {
    const pred = partido.predicciones[0];
    if (!pred) return partido;

    const homeFatigue = evaluateTeamFatigue({ team: partido.equipoLocal });
    const awayFatigue = evaluateTeamFatigue({ team: partido.equipoVisitante });

    const analysis = calculateExpectedValue({
      prob1: Number(pred.prob1),
      probX: Number(pred.probX),
      prob2: Number(pred.prob2),
      pctLae1: Number(partido.pctApostadoLae1 ?? 33.3),
      pctLaeX: Number(partido.pctApostadoLaeX ?? 33.3),
      pctLae2: Number(partido.pctApostadoLae2 ?? 33.3)
    });

    let finalExplanation = analysis.explanation;
    let fatigueAlert: { team: string; badgeLabel: string; notice: string } | null = null;

    if (homeFatigue.hasFatigue || awayFatigue.hasFatigue) {
      const fatigued = homeFatigue.hasFatigue ? partido.equipoLocal : partido.equipoVisitante;
      const fObj = homeFatigue.hasFatigue ? homeFatigue : awayFatigue;
      fatigueAlert = {
        team: fatigued,
        badgeLabel: fObj.badgeLabel || '⚡ FATIGA EUROPEA',
        notice: fObj.warningNotice || ''
      };
      finalExplanation += ` [Factor Calendario: ${fatigued} ${fObj.warningNotice}]`;
    }

    return {
      ...partido,
      fatigueAlert,
      predicciones: [
        {
          ...pred,
          verdictBadge: analysis.verdictBadge,
          explanation: finalExplanation,
          marketConsensus: analysis.marketConsensus
        }
      ]
    };
  });

  return {
    ...jornada,
    partidos: enrichedPartidos
  };
}

export async function registerRoutes(app: FastifyInstance) {
  const predictionService = new PredictionService();
  const metricsService = new MetricsService();

  // 1. Healthcheck
  app.get('/api/health', {
    schema: {
      description: 'Estado de salud del backend, PostgreSQL y Valkey',
      tags: ['Sistema']
    }
  }, async (req, reply) => {
    let dbStatus = 'DOWN';
    let valkeyStatus = 'DOWN';

    try {
      await prisma.$queryRaw`SELECT 1`;
      dbStatus = 'UP';
    } catch (e: any) {
      dbStatus = `ERROR: ${e.message}`;
    }

    try {
      const pong = await valkey.ping();
      if (pong === 'PONG') valkeyStatus = 'UP';
    } catch (e: any) {
      valkeyStatus = `ERROR: ${e.message}`;
    }

    return reply.send({
      status: dbStatus === 'UP' && valkeyStatus === 'UP' ? 'HEALTHY' : 'DEGRADED',
      services: {
        database: dbStatus,
        valkey: valkeyStatus
      },
      timestamp: new Date().toISOString()
    });
  });

  // 2. Listar jornadas
  app.get('/api/jornadas', {
    schema: {
      description: 'Listado de jornadas disponibles con estado y botes',
      tags: ['Jornadas']
    }
  }, async (req, reply) => {
    // Intentar leer de la caché de Valkey
    const cacheKey = 'cache:jornadas:list';
    const cached = await valkey.get(cacheKey);
    if (cached) {
      return reply.send(JSON.parse(cached));
    }

    const jornadas = await prisma.jornada.findMany({
      orderBy: { fechaCierre: 'desc' },
      include: {
        temporada: true,
        juego: true
      }
    });

    await valkey.set(cacheKey, JSON.stringify(jornadas), 'EX', 30); // 30s TTL
    return reply.send(jornadas);
  });

  // 3. Jornada actual en curso (Hero de la app)
  app.get('/api/jornadas/actual', {
    schema: {
      description: 'Obtiene la jornada activa de esta semana con pronósticos completos de IA',
      tags: ['Jornadas']
    }
  }, async (req, reply) => {
    let jornada = await prisma.jornada.findFirst({
      where: {
        estado: { in: ['PROGRAMADA', 'EN_JUEGO'] }
      },
      orderBy: { fechaCierre: 'desc' },
      include: {
        temporada: true,
        juego: true,
        partidos: {
          orderBy: { numeroCasilla: 'asc' },
          include: {
            predicciones: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        }
      }
    });

    if (!jornada || jornada.partidos.length < 15) {
      await syncLiveQuiniela();
      jornada = await prisma.jornada.findFirst({
        where: { estado: { in: ['PROGRAMADA', 'EN_JUEGO'] } },
        orderBy: { fechaCierre: 'desc' },
        include: {
          temporada: true,
          juego: true,
          partidos: {
            orderBy: { numeroCasilla: 'asc' },
            include: {
              predicciones: { orderBy: { createdAt: 'desc' }, take: 1 }
            }
          }
        }
      });
    }

    if (!jornada) {
      return reply.status(404).send({ error: 'No se encontró ninguna jornada activa' });
    }

    return reply.send(enrichJornadaPartidos(jornada));
  });

  // 4. Sincronización en vivo de la jornada actual bajo demanda
  app.post('/api/jornadas/sync-live', {
    schema: {
      description: 'Sincroniza en tiempo real los 15 partidos y porcentajes LAE de la jornada oficial',
      tags: ['Jornadas']
    }
  }, async (req, reply) => {
    await syncLiveQuiniela();
    await valkey.del('cache:jornadas:list');

    const jornada = await prisma.jornada.findFirst({
      where: { estado: { in: ['PROGRAMADA', 'EN_JUEGO'] } },
      orderBy: { fechaCierre: 'desc' },
      include: {
        temporada: true,
        juego: true,
        partidos: {
          orderBy: { numeroCasilla: 'asc' },
          include: {
            predicciones: { orderBy: { createdAt: 'desc' }, take: 1 }
          }
        }
      }
    });

    return reply.send({
      message: 'Jornada en curso sincronizada con éxito',
      jornada: jornada ? enrichJornadaPartidos(jornada) : null
    });
  });

  // 5. Detalle de jornada con partidos, porcentajes LAE y predicciones IA
  app.get('/api/jornadas/:id', {
    schema: {
      description: 'Detalle de una jornada específica con predicciones de IA y análisis EV',
      tags: ['Jornadas'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, async (req, reply) => {
    const { id } = req.params as { id: string };

    const jornada = await prisma.jornada.findUnique({
      where: { id },
      include: {
        temporada: true,
        juego: true,
        partidos: {
          orderBy: { numeroCasilla: 'asc' },
          include: {
            predicciones: {
              orderBy: { createdAt: 'desc' },
              take: 1
            }
          }
        }
      }
    });

    if (!jornada) {
      return reply.status(404).send({ error: 'Jornada no encontrada' });
    }

    return reply.send(enrichJornadaPartidos(jornada));
  });

  // 4. Recalcular predicciones IA para una jornada
  app.post('/api/jornadas/:id/recalcular-predicciones', {
    schema: {
      description: 'Fuerza la ejecución del modelo probabilístico y análisis de valor',
      tags: ['Predicciones'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string' }
        },
        required: ['id']
      }
    }
  }, async (req, reply) => {
    const { id } = req.params as { id: string };

    try {
      const results = await predictionService.generateJornadaPredictions(id);
      // Invalidar caché
      await valkey.del('cache:jornadas:list');
      return reply.send({
        success: true,
        message: 'Predicciones recalculadas con éxito',
        partidosActualizados: results.length,
        results
      });
    } catch (e: any) {
      return reply.status(500).send({ error: e.message });
    }
  });

  // 4b. Obtener ratings y fuerzas de equipos (Ataque y Defensa Dixon-Coles)
  app.get('/api/modelo/ratings', {
    schema: {
      description: 'Ratings dinámicos de ataque y defensa por equipo calibrados mediante aprendizaje bayesiano online',
      tags: ['Modelo']
    }
  }, async (req, reply) => {
    const ratings = await predictionService.getAllTeamRatings();
    return reply.send(ratings);
  });

  // 4c. Ejecutar retroalimentación bayesiana sobre una jornada resuelta (Punto 1)
  app.post('/api/modelo/retroalimentar', {
    schema: {
      description: 'Ajusta automáticamente los parámetros de ataque y defensa tras los partidos resueltos de una jornada sin reentrenar de cero',
      tags: ['Modelo']
    }
  }, async (req, reply) => {
    const body = (req.body || {}) as { jornadaId?: string };
    let targetJornadaId = body.jornadaId;

    if (!targetJornadaId) {
      const finishedMatch = await prisma.partido.findFirst({
        where: {
          golesLocal: { not: null },
          golesVisitante: { not: null }
        },
        orderBy: { createdAt: 'desc' }
      });
      if (finishedMatch) {
        targetJornadaId = finishedMatch.jornadaId;
      }
    }

    if (!targetJornadaId) {
      return reply.status(400).send({ error: 'No se encontró ninguna jornada con partidos disputados.' });
    }

    const feedbackResult = await predictionService.applyBayesianFeedbackFromJornada(targetJornadaId);
    return reply.send({
      success: true,
      jornadaId: targetJornadaId,
      ...feedbackResult
    });
  });

  // 5. Motor de Reducciones Interactivas y Generador .QUI
  app.post('/api/reducciones/calcular', {
    schema: {
      description: 'Calcula la reducción combinatoria al 13 o 12 y genera el fichero .QUI oficial',
      tags: ['Reducciones']
    }
  }, async (req, reply) => {
    const reductionSchema = z.object({
      guarantee: z.enum(['AL_13', 'AL_12', 'DIRECTA']),
      pleno15: z.string().default('0-0'),
      matches: z.array(
        z.object({
          matchNumber: z.number().min(1).max(14),
          selection: z.enum(['1', 'X', '2', '1X', '12', 'X2', '1X2'])
        })
      ).length(14),
      filters: z.object({
        enabled: z.boolean().default(true),
        minVariants: z.number().default(4),
        maxVariants: z.number().default(9),
        minDraws: z.number().default(1),
        maxDraws: z.number().default(5),
        avoidPipas: z.boolean().default(true)
      }).optional()
    });

    const parseResult = reductionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return reply.status(400).send({
        error: 'Esquema de boletos inválido. Debe enviar exactamente 14 partidos con selecciones válidas.',
        details: parseResult.error.errors
      });
    }

    const { guarantee, matches, pleno15, filters } = parseResult.data;

    const result = processReduction({
      guarantee,
      matches: matches as BaseBetMatch[],
      pleno15,
      filters
    });

    return reply.send({
      success: true,
      result
    });
  });

  // 6. Métricas y Estadísticas Globales de IA y Temporada
  app.get('/api/metricas', {
    schema: {
      description: 'Métricas de precisión de la IA, calibración de probabilidad, distribución 1X2 y estadísticas del Pleno al 15',
      tags: ['Métricas']
    }
  }, async (req, reply) => {
    const cacheKey = 'cache:metricas:global';
    const cached = await valkey.get(cacheKey);
    if (cached) {
      return reply.send(JSON.parse(cached));
    }

    const metrics = await metricsService.getMetrics();
    await valkey.set(cacheKey, JSON.stringify(metrics), 'EX', 60); // 60s TTL
    return reply.send(metrics);
  });

  // 7. Disparar Ingesta Masiva del Histórico
  app.post('/api/ingesta/historico', {
    schema: {
      description: 'Descarga e ingesta temporadas históricas reales con partidos y predicciones IA',
      tags: ['Ingesta']
    }
  }, async (req, reply) => {
    // Ejecutar en background o sincrónico
    ingestHistoricalData().then(async () => {
      await valkey.del('cache:metricas:global');
      await valkey.del('cache:jornadas:list');
    }).catch(err => {
      console.error('Error en ingesta histórica asíncrona:', err);
    });

    return reply.send({
      success: true,
      message: 'Ingesta masiva del histórico iniciada con éxito en segundo plano.'
    });
  });
}
