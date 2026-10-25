# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.
El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [1.0.0] - 2026-10-25

### Añadido
- **Motor Matemático e IA**:
  - Modelo de Dixon-Coles y distribución Poisson bivariada para estimar probabilidades de 1X2 y marcadores exactos.
  - Cálculo de Expected Value ($EV$) contrastando probabilidad de la IA frente a porcentajes de apuestas oficiales de SELAE.
  - Algoritmo de reducciones combinatorias al 13, 12 y 11 mediante Set-Cover y distancia de Hamming.
  - Exportador a formato oficial `.QUI` para validación de apuestas directas y reducidas.
  - Módulo de evaluación de fatiga y rotaciones de plantilla por calendario europeo / liguero.
  - Retroalimentación bayesiana con factor de aprendizaje adaptativo según resultados reales.
- **Backend API (Node.js 22 + Fastify + Prisma + TypeScript)**:
  - Documentación interactiva OpenAPI / Swagger en `/docs`.
  - Endpoint de salud y diagnóstico en `/api/health`.
  - Persistencia relacional con PostgreSQL 16 y almacenamiento en memoria ultrarrápido con Valkey 8.0.
  - Ingesta automática y script de datos semilla (`prisma/seed.ts`).
  - Suite de 16 tests unitarios con Vitest cubriendo matemáticas, reducciones, fatiga y métricas.
- **Frontend & UX (Vue 3 + Vite + Tailwind CSS + Lucide Icons)**:
  - Identidad de marca **QuantBet AI** con logotipo vectorial SVG y soporte multijuego futuro.
  - Diseño *Dark Glassmorphism* con efectos ambientales y de resplandor.
  - Barra de probabilidad proporcional tricolor (1, X, 2) en cada partido.
  - Filtros rápidos en parrilla (`Trampas EV`, `Fijos IA`, `Fatiga`, `Finalizados`).
  - Acciones rápidas: `Auto-IA` y `Blindar Trampas`.
  - Dock flotante persistente con cálculo en vivo de costes, reducciones, porcentaje de ahorro y descarga directa del `.QUI`.
  - Modal educativo interactivo con desglose del método matemático.
- **Infraestructura Autocontenida (Docker Compose)**:
  - Configuración Docker Compose 100% independiente para ejecución local.
  - Imagen Frontend con Nginx Alpine que sirve la SPA y actúa como reverse proxy hacia la API en un único puerto (`8080`).
  - Imagen Backend con inicialización automática de base de datos (`prisma db push`) y auto-seed.
