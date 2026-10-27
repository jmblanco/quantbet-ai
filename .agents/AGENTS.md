# QuantBet AI / Quiniela IA Platform

Plataforma cuantitativa e inteligente para el modelado probabilístico, estimación de valor esperado (Expected Value), auditoría táctica de plantillas, análisis espacial 3x3 y reducción combinatoria oficial de apuestas y loterías (con foco inicial en La Quiniela 1X2, expandible a sorteos numéricos).

## Arquitectura del Proyecto

- **Stack Tecnológico**:
  - **Backend**: Node.js 22 LTS + TypeScript + Fastify 5 + Prisma ORM (Puerto 3333).
  - **Frontend**: Vue 3.5 + Vite 6 + Tailwind CSS v4 (Puerto 5173).
  - **Base de Datos**: PostgreSQL 16 Alpine (Persistencia de temporadas, jornadas, partidos, cuotas y escrutinios).
  - **Caché & Colas**: Valkey 8.0 Alpine & BullMQ (5 colas asíncronas).
- **Motores Matemáticos & Machine Learning**:
  - `src/core/ml/feature-extractor.ts`: Vector continuo de 24 características (Dixon-Coles, Elo +65 campo, fatiga, bajas, mapas 3x3 y masa LAE).
  - `src/core/ml/model-trainer.ts`: Clasificador Softmax multivariado con regularización L2 y optimizador Adam (65.91% acierto en validación ciega).
  - `src/core/ml/ml-inference-service.ts`: Inferencia en tiempo real (< 1ms) con Blending Bayesiano (60% ML + 40% Prior Físico).
  - `src/core/sports/heatmap-generator.ts`: Cuadrícula espacial táctica 3x3, radar de puntos calientes y detección de choques de estilo.
  - `src/core/sports/squad-analyzer.ts`: Auditoría de alineaciones, detección de referentes y cálculo de impacto de bajas en xG.
  - `src/core/math/poisson.ts`: Distribución bivariada de Poisson con corrección Dixon-Coles ($\tau$).
  - `src/core/math/expected-value.ts`: Detección de trampas de masa y sorpresas rentables frente a los porcentajes apostados por el público SELAE.
  - `src/core/math/fatigue.ts`: Penalización de goles esperados y concesión defensiva por congestión de calendario europeo (<72h descanso).
  - `src/core/math/bayesian-feedback.ts`: Actualización adaptativa online de fuerzas post-jornada.
  - `src/core/math/reductions.ts`: Reductor combinatorio Set-Cover con distancia de Hamming y exportación oficial a formato `.QUI`.

## Integración con Global-Infra (Downstream Gateway)

Este proyecto cumple con el contrato técnico de `global-infra`:
- Conexión a la red Docker externa `gateway_net`.
- Hostname interno asignado: `quiniela_frontend` y `quiniela_backend`.
- Enrutamiento y TLS gestionado a través de Caddy Ingress Gateway (`quiniela.localhost` / `quiniela.{$TAILSCALE_DOMAIN}`).

## Comandos Principales

```bash
# Levantar dependencias (PostgreSQL + Valkey)
docker compose up -d

# Backend
cd services/backend
npm run dev        # Modo desarrollo con recarga en caliente
npm test           # Ejecutar los 40 tests unitarios con Vitest (100% verde)

# Frontend
cd services/frontend
npm run dev        # Servidor Vite en http://localhost:5173
npm run build      # Compilación de producción
```
