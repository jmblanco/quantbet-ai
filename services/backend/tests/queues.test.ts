import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { QueueEvents } from 'bullmq';
import { QueueManager, QUEUE_NAMES, bullConnection } from '../src/infrastructure/queue-manager.js';

describe('BullMQ & Valkey Asynchronous Queues Architecture', () => {
  let queueManager: QueueManager;
  let squadQueueEvents: QueueEvents;

  beforeAll(async () => {
    queueManager = QueueManager.getInstance();
    await queueManager.initialize();
    squadQueueEvents = new QueueEvents(QUEUE_NAMES.SQUAD_AUDIT, { connection: bullConnection });
  });

  afterAll(async () => {
    if (squadQueueEvents) await squadQueueEvents.close();
    await queueManager.closeAll();
  });

  it('debe inicializar las 5 colas especializadas con conexión a Valkey', () => {
    expect(queueManager.queues.size).toBe(5);
    expect(queueManager.queues.has(QUEUE_NAMES.SYNC_LIVE)).toBe(true);
    expect(queueManager.queues.has(QUEUE_NAMES.TACTICAL_REFRESH)).toBe(true);
    expect(queueManager.queues.has(QUEUE_NAMES.BAYESIAN_FEEDBACK)).toBe(true);
    expect(queueManager.queues.has(QUEUE_NAMES.SQUAD_AUDIT)).toBe(true);
    expect(queueManager.queues.has(QUEUE_NAMES.HISTORICAL_INGEST)).toBe(true);
  });

  it('debe inicializar los workers para cada una de las colas', () => {
    expect(queueManager.workers.size).toBe(5);
    for (const queueName of Object.values(QUEUE_NAMES)) {
      expect(queueManager.workers.has(queueName), `Falta worker para ${queueName}`).toBe(true);
    }
  });

  it('debe devolver métricas estructuradas de estado para todas las colas', async () => {
    const status = await queueManager.getQueuesStatus();
    expect(status).toHaveLength(5);
    for (const q of status) {
      expect(q).toHaveProperty('name');
      expect(q).toHaveProperty('isPaused');
      expect(q).toHaveProperty('waiting');
      expect(q).toHaveProperty('active');
      expect(q).toHaveProperty('completed');
      expect(q).toHaveProperty('failed');
      expect(typeof q.waiting).toBe('number');
    }
  });

  it('debe encolar y procesar con éxito un trabajo en la cola de auditoría de plantillas', async () => {
    const job = await queueManager.dispatchJob(
      QUEUE_NAMES.SQUAD_AUDIT,
      'test-audit-real-madrid',
      { equipo: 'Real Madrid' }
    );

    expect(job).toBeDefined();
    expect(job.id).toBeDefined();
    expect(job.name).toBe('test-audit-real-madrid');

    // Esperar a que el worker procese el job
    const result = await job.waitUntilFinished(squadQueueEvents, 5000);
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
    expect(result.equipo).toBe('Real Madrid');
  });

  it('debe permitir pausar y reanudar una cola dinámicamente', async () => {
    const isPaused = await queueManager.toggleQueuePause(QUEUE_NAMES.TACTICAL_REFRESH, true);
    expect(isPaused).toBe(true);

    const isResumed = await queueManager.toggleQueuePause(QUEUE_NAMES.TACTICAL_REFRESH, false);
    expect(isResumed).toBe(false);
  });
});
