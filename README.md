# QuantBet AI Platform ⚽🎯

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-22.x-green.svg)](https://nodejs.org/)
[![Fastify](https://img.shields.io/badge/Fastify-5.x-black.svg)](https://fastify.dev/)
[![Vue.js](https://img.shields.io/badge/Vue.js-3.5-4FC08D.svg)](https://vuejs.org/)
[![Docker Compose](https://img.shields.io/badge/Docker-Compose-2496ED.svg)](https://www.docker.com/)

Plataforma cuantitativa y predictiva para **La Quiniela 1X2**, combinando modelado estadístico probabilístico (Dixon-Coles & Poisson bivariada), detección de ineficiencias de mercado (Expected Value frente a los porcentajes apostados por el público general de SELAE) y motor combinatorio de reducciones matemáticas con exportador oficial estándar `.QUI`.

El proyecto es **100% autocontenido y autosuficiente**, listo para ejecutarse en cualquier entorno local mediante Docker Compose.

---

## ✨ Características Principales

* **Modelo Estadístico Dixon-Coles & Poisson**: Estimación rigurosa de goles esperados ($\lambda, \mu$) con parámetro de corrección para empates a baja puntuación ($\tau$) y cálculo de matrices de marcadores exactos.
* **Detección de Valor Esperado ($EV$)**: Identificación de *Trampas de Masa* (equipos hiper-apostados con EV negativo) y *Sorpresas Rentables* para maximizar el retorno matemático de la apuesta.
* **Motor Combinatorio de Reducciones**: Algoritmo Set-Cover optimizado con distancia de Hamming para reducciones al 13, 12 y 11 con hasta un 75% de ahorro en el coste del boleto.
* **Exportador Oficial `.QUI`**: Generación directa de archivos `.QUI` compatibles con administraciones de lotería y la web oficial de Loterías y Apuestas del Estado.
* **Evaluación de Fatiga y Rotaciones**: Ajuste dinámico de probabilidades en función del calendario liguero y competiciones europeas.
* **Retroalimentación Bayesiana**: Ajuste adaptativo continuo de los pesos del modelo tras la resolución de cada jornada.
* **Interfaz Moderna (Dark Glassmorphism)**: UI reactiva en Vue 3 con desgloses de probabilidad tricolor, filtros analíticos, acciones rápidas y simulador interactivo de apuestas.

---

## 🛠️ Stack Tecnológico

| Capa | Tecnologías |
| :--- | :--- |
| **Frontend** | Vue 3, Vite, Tailwind CSS, Lucide Icons, Nginx Alpine |
| **Backend API** | Node.js 22, TypeScript, Fastify, Zod, OpenAPI / Swagger |
| **Base de Datos** | PostgreSQL 16 con Prisma ORM |
| **Caché & Memoria** | Valkey 8.0 Alpine |
| **Orquestación** | Docker Compose con red bridge aislada y volúmenes locales |

---

## 🚀 Puesta en Marcha con Docker Compose (Recomendado)

Levanta la plataforma completa (Frontend, Backend, PostgreSQL y Valkey) con un único comando:

```bash
# 1. Clonar el repositorio
git clone https://github.com/jmblanco/quantbet-ai.git
cd quantbet-ai

# 2. Levantar el stack completo
docker compose up -d --build
```

Una vez levantados los contenedores:
* **Aplicación Web**: [http://localhost:8080](http://localhost:8080)
* **Documentación OpenAPI / Swagger**: [http://localhost:8080/docs](http://localhost:8080/docs)
* **Healthcheck de Diagnóstico**: [http://localhost:8080/api/health](http://localhost:8080/api/health)

Para detener los servicios:
```bash
docker compose down
```

---

## 💻 Desarrollo Local (Sin Docker)

Si deseas trabajar en desarrollo local con recarga en caliente (*hot-reload*):

### 1. Iniciar Base de Datos y Caché
```bash
docker compose up -d postgres valkey
```

### 2. Backend (Node.js & Fastify)
```bash
cd services/backend
npm install
npm test            # Ejecuta los 16 tests unitarios con Vitest
npm run seed        # Inicializa la base de datos con partidos y predicciones de prueba
npm run dev         # Inicia la API en http://localhost:3333
```

### 3. Frontend (Vue 3 + Vite)
```bash
cd services/frontend
npm install
npm run dev         # Inicia el servidor de desarrollo en http://localhost:5173
```

---

## ⚙️ Variables de Entorno

Puedes personalizar los puertos y credenciales copiando `.env.example`:

| Variable | Valor por defecto | Descripción |
| :--- | :--- | :--- |
| `APP_PORT` | `8080` | Puerto público expuesto en el host (Frontend + API) |
| `POSTGRES_USER` | `quiniela_user` | Usuario de PostgreSQL |
| `POSTGRES_PASSWORD` | `quiniela_secret_pass` | Contraseña de PostgreSQL |
| `POSTGRES_DB` | `quiniela_db` | Nombre de la base de datos |
| `AUTO_SEED` | `true` | Carga automática de jornada y datos iniciales en primer arranque |

---

## 📁 Estructura del Repositorio

```text
quantbet-ai/
├── docker-compose.yml          # Definición multi-contenedor autocontenida
├── .env.example                # Variables de entorno modelo
├── CHANGELOG.md                # Registro formal de cambios (SemVer)
├── services/
│   ├── backend/                # API Fastify, Prisma, Dixon-Coles y Reducciones
│   │   ├── Dockerfile          # Multi-stage build Node 22 Alpine
│   │   ├── docker-entrypoint.sh # Sincronización automática de esquema Prisma
│   │   ├── prisma/             # Esquema relacional y seed
│   │   ├── src/                # Modelos matemáticos, servicios y rutas
│   │   └── tests/              # Suite de tests con Vitest
│   └── frontend/               # Single Page Application Vue 3
│       ├── Dockerfile          # Multi-stage build (Vite + Nginx Alpine)
│       ├── nginx.conf          # Servidor estático y reverse-proxy a /api
│       └── src/                # Componentes reactivos, estilos glassmorphism
```

---

## 📄 Licencia

Este proyecto está distribuido bajo la licencia [MIT](LICENSE).
