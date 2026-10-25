# QuantBet AI / Quiniela IA Platform

Plataforma cuantitativa e inteligente para el modelado probabilístico, estimación de valor esperado (Expected Value) y reducción combinatoria oficial de apuestas y loterías (con foco inicial en La Quiniela 1X2, expandible a Primitiva, Bonoloto y Euromillones).

## Arquitectura del Proyecto

- **Stack Tecnológico**:
  - **Backend**: Node.js 22 + TypeScript + Fastify + Prisma ORM (Puerto 3333).
  - **Frontend**: Vue 3 + Vite + Tailwind CSS (Puerto 5173).
  - **Base de Datos**: PostgreSQL 16 Alpine (Persistencia de temporadas, jornadas, partidos y escrutinios).
  - **Caché & Colas**: Valkey 8.0 Alpine (Redis open-source).
- **Motores Matemáticos**:
  - `src/core/math/poisson.ts`: Distribución Bivariada de Poisson con corrección de bajas anotaciones Dixon & Coles ($\tau$).
  - `src/core/math/expected-value.ts`: Cruce de probabilidades reales del modelo contra porcentajes apostados por el público SELAE para detectar trampas de masa y sorpresas de alto valor.
  - `src/core/math/fatigue.ts`: Penalización de goles esperados y concesión defensiva por congestión de calendario europeo (<72h descanso).
  - `src/core/math/bayesian-feedback.ts`: Aprendizaje online continuo y actualización estocástica de fuerzas de ataque ($\alpha$) y defensa ($\beta$) post-jornada con amortiguación bayesiana.
  - `src/core/math/reductions.ts`: Reductor combinatorio (Greedy Set-Cover con distancia Hamming) con filtros estadísticos de varianza y exportación a `.QUI`.

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
npm test           # Ejecutar suites de Vitest

# Frontend
cd services/frontend
npm run dev        # Servidor Vite en http://localhost:5173
npm run build      # Compilación de producción
```
