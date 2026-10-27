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
import { SquadService } from '../core/sports/squad-service.js';
import { HeatmapService } from '../core/sports/heatmap-service.js';
import { TeamsDirectoryService } from '../core/sports/teams-directory-service.js';
import { QueueManager } from '../infrastructure/queue-manager.js';
import { ModelTrainer } from '../core/ml/model-trainer.js';

async function enrichJornadaPartidos(jornada: any) {
  const enrichedPartidos = await Promise.all(jornada.partidos.map(async (partido: any) => {
    const isDisputed = !!partido.resultadoSigno;
    const squadReport = SquadService.getMatchSquadReport(
      partido.equipoLocal,
      partido.equipoVisitante,
      isDisputed
    );

    const heatmapComparison = await HeatmapService.getMatchTacticalComparison(
      partido.equipoLocal,
      partido.equipoVisitante,
      jornada.numero
    );

    const pred = partido.predicciones[0];
    if (!pred) {
      return {
        ...partido,
        squadReport,
        heatmapComparison
      };
    }

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

    if (squadReport.ventajaPlantilla !== 'EQUILIBRADO') {
      finalExplanation += ` [Plantillas: ${squadReport.resumenTactico}]`;
    }

    if (heatmapComparison.desequilibrioZonal) {
      finalExplanation += ` [Mapa Calor: ${heatmapComparison.desequilibrioZonal}]`;
    }

    return {
      ...partido,
      fatigueAlert,
      squadReport,
      heatmapComparison,
      predicciones: [
        {
          ...pred,
          verdictBadge: analysis.verdictBadge,
          explanation: finalExplanation,
          marketConsensus: analysis.marketConsensus
        }
      ]
    };
  }));

  return {
    ...jornada,
    partidos: enrichedPartidos
  };
}

export async function registerRoutes(app: FastifyInstance) {
  const predictionService = new PredictionService();
  const metricsService = new MetricsService();

  // Retroalimentación Bayesiana Automática:
  // Al arrancar o registrar rutas, asegura que todas las jornadas finalizadas hayan recalibrado el modelo
  predictionService.autoRetrofeedAllFinishedJornadas().catch(err => {
    console.error('Error en retroalimentación automática al iniciar:', err);
  });

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
    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate');

    const jornadas = await prisma.jornada.findMany({
      orderBy: [
        { temporada: { codigo: 'desc' } },
        { numero: 'desc' }
      ],
      include: {
        temporada: true,
        juego: true
      }
    });

    return reply.send(jornadas);
  });

  // 3. Jornada actual en curso (Hero de la app)
  app.get('/api/jornadas/actual', {
    schema: {
      description: 'Obtiene la jornada activa oficial de SELAE con pronósticos completos de IA',
      tags: ['Jornadas']
    }
  }, async (req, reply) => {
    reply.header('Cache-Control', 'no-store, no-cache, must-revalidate');

    // Buscar primero la jornada activa en juego hoy de la temporada 2026-2027
    let jornada = await prisma.jornada.findFirst({
      where: {
        temporada: { activa: true },
        estado: 'EN_JUEGO'
      },
      orderBy: { numero: 'desc' },
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
      // Si no hay ninguna en juego, priorizar la última jornada oficial con escrutinio (Jornada 16)
      jornada = await prisma.jornada.findFirst({
        where: {
          temporada: { activa: true },
          numero: 16
        },
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
      jornada = await prisma.jornada.findFirst({
        where: {
          temporada: { activa: true },
          estado: 'PROGRAMADA'
        },
        orderBy: { numero: 'asc' },
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

    if (!jornada || jornada.partidos.length < 15) {
      await syncLiveQuiniela();
      jornada = await prisma.jornada.findFirst({
        where: { numero: 16, temporada: { activa: true } },
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

    const enriched = await enrichJornadaPartidos(jornada);
    return reply.send(enriched);
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

    const body = (req.body as { jornadaId?: string } | undefined) ?? {};
    let jornada = null;

    if (body.jornadaId) {
      jornada = await prisma.jornada.findUnique({
        where: { id: body.jornadaId },
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
      jornada = await prisma.jornada.findFirst({
        where: {
          temporada: { activa: true },
          OR: [
            { estado: 'EN_JUEGO' },
            { numero: 16 }
          ]
        },
        orderBy: { numero: 'desc' },
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
      jornada = await prisma.jornada.findFirst({
        where: { estado: { in: ['PROGRAMADA', 'EN_JUEGO', 'FINALIZADA'] } },
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

    return reply.send({
      message: 'Jornada en curso sincronizada con éxito',
      jornada: jornada ? await enrichJornadaPartidos(jornada) : null
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

    let autoFeedback: any = null;
    try {
      const autoFeedbackRaw = await valkey.get(`bayesian:retrofeed:applied:${id}`);
      autoFeedback = autoFeedbackRaw ? JSON.parse(autoFeedbackRaw) : null;
    } catch (e) {}

    const isComplete = jornada.estado === 'FINALIZADA' || (jornada.partidos.length === 15 && jornada.partidos.every(p => !!p.resultadoSigno));
    if (!autoFeedback && isComplete) {
      autoFeedback = await predictionService.applyBayesianFeedbackFromJornada(jornada.id);
    }

    const enriched = await enrichJornadaPartidos(jornada);

    return reply.send({
      ...enriched,
      autoFeedback
    });
  });

  // 5b. Mapa de calor y perfil espacial de un equipo
  app.get('/api/equipos/:equipo/heatmap', {
    schema: {
      description: 'Obtiene el mapa de calor espacial, puntos calientes y ocupación zonal de un equipo',
      tags: ['Táctica'],
      params: {
        type: 'object',
        properties: {
          equipo: { type: 'string' }
        },
        required: ['equipo']
      }
    }
  }, async (req, reply) => {
    const { equipo } = req.params as { equipo: string };
    const data = await HeatmapService.getTeamHeatmap(equipo);
    return reply.send(data);
  });

  // 5c. Directorio de Equipos con Datos Agregados (Primera y Segunda División)
  app.get('/api/equipos', {
    schema: {
      description: 'Directorio completo de equipos de Primera y Segunda División con rendimiento, mapas de calor agregados y plantillas',
      tags: ['Táctica'],
      querystring: {
        type: 'object',
        properties: {
          division: { type: 'string', enum: ['PRIMERA', 'SEGUNDA'] },
          q: { type: 'string' }
        }
      }
    }
  }, async (req, reply) => {
    const query = req.query as { division?: 'PRIMERA' | 'SEGUNDA'; q?: string };
    const teams = await TeamsDirectoryService.getAllTeams({
      division: query?.division,
      query: query?.q
    });
    return reply.send({
      total: teams.length,
      equipos: teams
    });
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
    let body = (req.body as any) || {};

    // Normalización flexible para soportar tanto esquema matches como userSelections
    if (Array.isArray(body.userSelections) && !body.matches) {
      body.matches = body.userSelections.map((signs: string[], idx: number) => ({
        matchNumber: idx + 1,
        selection: (Array.isArray(signs) ? signs.slice().sort().join('') : signs) || '1'
      }));
    }

    if (body.pleno15Score && !body.pleno15) {
      body.pleno15 = `${body.pleno15Score.home ?? '0'}-${body.pleno15Score.away ?? '0'}`;
    }

    if (body.guarantee === 'DIRECTO') {
      body.guarantee = 'DIRECTA';
    }

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

    const parseResult = reductionSchema.safeParse(body);
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
      result: {
        ...result,
        fileContent: result.formattedQuiFile
      }
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

  // ==========================================================================
  // 7. OBSERVABILIDAD Y TELEMETRÍA DE COLAS BULLMQ (SÓLO LECTURA)
  // Las colas se ejecutan de forma autónoma y desatendida en background.
  // No se exponen APIs de disparo manual ni mutación externa.
  // ==========================================================================

  app.get('/api/queues/status', {
    schema: {
      description: 'Telemetría de solo lectura: Métricas de estado de las colas BullMQ en background (waiting, active, completed, failed, delayed)',
      tags: ['Colas']
    }
  }, async (req, reply) => {
    const status = await QueueManager.getInstance().getQueuesStatus();
    return reply.send({
      success: true,
      timestamp: new Date().toISOString(),
      queues: status
    });
  });

  // ==========================================================================
  // 8. MODELO DE MACHINE LEARNING ENSEMBLE MULTIMODAL
  // ==========================================================================

  app.get('/api/ml/model-status', {
    schema: {
      description: 'Estado, métricas de validación y pesos de importancia del modelo ML multimodal entrenado',
      tags: ['Machine Learning']
    }
  }, async (req, reply) => {
    const artifact = await ModelTrainer.getOrLoadModel();
    return reply.send({
      version: artifact.version,
      metrics: artifact.metrics,
      topFeatures: artifact.metrics.featureImportances.slice(0, 10)
    });
  });

  app.post('/api/ml/train', {
    schema: {
      description: 'Dispara un re-entrenamiento del modelo de Machine Learning sobre todas las jornadas históricas',
      tags: ['Machine Learning']
    }
  }, async (req, reply) => {
    const artifact = await ModelTrainer.trainFromHistoricalDatabase(60);
    await valkey.del('cache:metricas:global');
    return reply.send({
      message: 'Modelo de Machine Learning re-entrenado exitosamente',
      artifact
    });
  });
}
