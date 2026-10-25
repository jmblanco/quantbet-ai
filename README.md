# Quiniela IA Platform ⚽🎯

Plataforma analítica y predictiva de **La Quiniela 1X2**, combinando modelos probabilísticos (Dixon-Coles & Poisson), detección de sesgos en los porcentajes oficiales de SELAE (Expected Value) y motor combinatorio de reducciones con exportador estándar `.QUI`.

---

## 🛠️ Arquitectura y Stack Tecnológico

- **Infraestructura**: Docker Compose con **PostgreSQL 16** y **Valkey 8** (reemplazo comunitario de Redis).
- **Core Backend**: **Node.js 22 + TypeScript + Fastify** con OpenAPI/Swagger en tiempo real.
- **ORM & Migraciones**: **Prisma ORM** con esquema relacional para temporadas, jornadas, partidos y predicciones.
- **Motor Matemático / IA**:
  - `poisson.ts`: Modelado bivariado de Dixon-Coles con corrección de empates para estimación de $P(1), P(X), P(2)$ y marcadores exactos.
  - `expected-value.ts`: Detección de signos sobre-apostados por el público general vs sorpresas de alta rentabilidad matemática ($EV$).
  - `reductions.ts`: Motor combinatorio de reducción al 13 y al 12 (algoritmo Set-Cover con distancia de Hamming) y exportador `.QUI`.
- **Frontend**: **Vue 3 + Vite + Tailwind CSS + Lucide Icons**, reactivo e interactivo.

---

## 🚀 Puesta en Marcha Rápida

### 1. Levantar Infraestructura (Docker)
```bash
docker compose up -d
```
Verifica que los contenedores `quiniela_postgres` (puerto 5432) y `quiniela_valkey` (puerto 6379) estén activos.

### 2. Backend (Node.js & Fastify)
```bash
cd services/backend
npm install
npm test            # Ejecuta los tests unitarios con Vitest
npm run seed        # Inicializa la base de datos con la jornada de prueba y ejecuta la IA
npm run dev         # Inicia el backend en http://localhost:3333
```
- **Documentación Swagger interactiva**: [http://localhost:3333/docs](http://localhost:3333/docs)
- **Endpoint de salud**: [http://localhost:3333/api/health](http://localhost:3333/api/health)

### 3. Frontend (Vue 3 + Vite)
```bash
cd services/frontend
npm install
npm run dev         # Inicia la interfaz web en http://localhost:5173
```
Abre en tu navegador [http://localhost:5173](http://localhost:5173) para ver el boleto interactivo, predicciones de IA y el simulador de reducciones.

---

## 📁 Estructura del Proyecto

```text
quiniela-ia-platform/
├── docker-compose.yml          # PostgreSQL 16 + Valkey 8
├── .env.example                # Variables de entorno modelo
├── services/
│   ├── backend/
│   │   ├── prisma/
│   │   │   ├── schema.prisma   # Modelado de datos
│   │   │   └── seed.ts         # Datos iniciales + cálculo IA
│   │   ├── src/
│   │   │   ├── core/math/      # Dixon-Coles, Poisson, EV, Reducciones
│   │   │   ├── core/services/  # PredictionService
│   │   │   ├── infrastructure/ # Conexión a Prisma y Valkey
│   │   │   └── api/routes.ts   # Endpoints REST y Swagger
│   │   └── tests/              # Tests TDD con Vitest
│   └── frontend/
│       ├── src/
│       │   ├── App.vue         # Interfaz reactiva del boleto y reducciones
│       │   └── style.css       # Tailwind CSS
│       └── vite.config.ts
```
