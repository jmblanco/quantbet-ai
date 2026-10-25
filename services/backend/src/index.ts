import fastify from 'fastify';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import dotenv from 'dotenv';
import { registerRoutes } from './api/routes.js';

dotenv.config();

const port = Number(process.env.PORT) || 3333;
const host = process.env.HOST || '0.0.0.0';

async function bootstrap() {
  const app = fastify({
    logger: true
  });

  // Habilitar CORS
  await app.register(cors, {
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
  });

  // Documentación OpenAPI / Swagger
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Quiniela IA API & Predicción de Valor',
        description: 'Core Backend para ingesta de datos, estimación con Dixon-Coles/Poisson, matrices de EV y reducciones oficiales.',
        version: '1.0.0'
      },
      servers: [
        { url: `http://localhost:${port}` }
      ]
    }
  });

  await app.register(swaggerUi, {
    routePrefix: '/docs',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true
    }
  });

  // Registrar Rutas de la API
  await registerRoutes(app);

  try {
    await app.listen({ port, host });
    console.log(`\n🚀 Servidor Quiniela IA Backend escuchando en http://${host}:${port}`);
    console.log(`📚 Documentación Swagger interactiva disponible en http://localhost:${port}/docs\n`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
}

bootstrap();
