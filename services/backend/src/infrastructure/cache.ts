import Redis from 'ioredis';

const valkeyUrl = process.env.VALKEY_URL || 'redis://localhost:6379';

export const valkey = new Redis(valkeyUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
});

valkey.on('connect', () => {
  console.log('✅ Conectado a Valkey (Caché & Colas) con éxito');
});

valkey.on('error', (err) => {
  console.warn('⚠️ Error de conexión con Valkey:', err.message);
});
