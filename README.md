# QuantBet AI Platform ⚽🎯

Plataforma cuantitativa y predictiva para **La Quiniela 1X2**, combinando modelos probabilísticos (Dixon-Coles & Poisson), detección de trampas de masa en los porcentajes oficiales de SELAE (Expected Value) y motor combinatorio de reducciones con exportador estándar `.QUI`.

Diseñado con arquitectura **100% autocontenida y portable** para despliegues instantáneos en cualquier equipo con **Dockhand**, **Docker Compose** o entornos en la nube.

---

## 🛠️ Arquitectura y Stack Tecnológico

- **Infraestructura Autocontenida**: Docker Compose multi-servicio con red bridge privada `quiniela_network` y volúmenes persistentes.
- **Frontend & Ingress**: **Vue 3 + Vite + Tailwind CSS + Nginx Alpine** actuando como servidor estático y proxy inverso integrado hacia la API en un único puerto (`APP_PORT=8080`).
- **Core Backend**: **Node.js 22 + TypeScript + Fastify** con OpenAPI/Swagger en tiempo real.
- **Base de Datos & Caché**: **PostgreSQL 16** con Prisma ORM + **Valkey 8.0** (Caché en memoria RAM de ultra-baja latencia).
- **Motor Matemático / IA**:
  - `poisson.ts`: Modelado bivariado de Dixon-Coles con corrección de empates para estimación de $P(1), P(X), P(2)$ y marcadores exactos.
  - `expected-value.ts`: Detección de signos sobre-apostados por el público general vs sorpresas de alta rentabilidad matemática ($EV$).
  - `reductions.ts`: Motor combinatorio de reducción al 13 y al 12 (algoritmo Set-Cover con distancia de Hamming) y exportador `.QUI`.

---

## 🚀 Despliegue en 1 Clic (Dockhand / Docker Compose)

El stack es completamente autónomo y no requiere pasos manuales de configuración:

```bash
# 1. Clonar el repositorio
git clone <url-del-repositorio>
cd quiniela-ia-platform

# 2. Desplegar con el script automatizado
./deploy.sh       # En Linux / Mac
# .\deploy.ps1    # En Windows PowerShell
```

O directamente mediante Docker Compose:
```bash
docker compose up -d --build
```

- **Plataforma Web**: [http://localhost:8080](http://localhost:8080)
- **Documentación OpenAPI / Swagger**: [http://localhost:8080/docs](http://localhost:8080/docs)
- **Healthcheck del Sistema**: [http://localhost:8080/api/health](http://localhost:8080/api/health)

> 📖 **Guía Completa para Dockhand**: Consulta [`DOCKHAND_DEPLOY.md`](./DOCKHAND_DEPLOY.md) para vincular el repositorio Git en la interfaz de Dockhand y configurar despliegues automáticos con Webhooks.

---

## 💻 Desarrollo Local (Sin Docker)

Si deseas trabajar en desarrollo local con recarga en caliente:

### 1. Levantar solo Base de Datos y Caché
```bash
docker compose up -d postgres valkey
```

### 2. Backend (Node.js & Fastify)
```bash
cd services/backend
npm install
npm test            # 16 tests unitarios con Vitest
npm run seed        # Inicializa la base de datos y calcula predicciones
npm run dev         # Inicia la API en http://localhost:3333
```

### 3. Frontend (Vue 3 + Vite)
```bash
cd services/frontend
npm install
npm run dev         # Inicia Vite en http://localhost:5173
```

---

## 📁 Estructura del Repositorio

```text
quiniela-ia-platform/
├── docker-compose.yml          # Stack autocontenido (Frontend, Backend, Postgres, Valkey)
├── deploy.sh                   # Script de despliegue automatizado para Linux/macOS
├── deploy.ps1                  # Script de despliegue automatizado para Windows
├── DOCKHAND_DEPLOY.md          # Guía técnica de despliegue en Dockhand y CI/CD
├── .env.example                # Plantilla de variables de entorno
├── .github/workflows/
│   └── deploy.yml              # CI/CD: Tests + Webhook Trigger para Dockhand
├── services/
│   ├── backend/                # API Fastify, Prisma, TypeScript, Motor Matemático
│   │   ├── Dockerfile          # Multi-stage build Node 22 Alpine
│   │   ├── docker-entrypoint.sh # Auto-migración Prisma y seed
│   │   ├── prisma/             # Esquema relacional y script seed
│   │   ├── src/                # Ingesta, servicios, modelos de Poisson/EV
│   │   └── tests/              # Suites de tests de Vitest
│   └── frontend/               # Single Page Application Vue 3
│       ├── Dockerfile          # Multi-stage build (Vite + Nginx Alpine)
│       ├── nginx.conf          # Configuración SPA y reverse proxy a /api
│       └── src/                # Componentes Vue 3, dock de apuestas, diseño dark
```
