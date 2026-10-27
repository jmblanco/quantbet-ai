# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.
El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/),
y este proyecto se adhiere a [Semantic Versioning](https://semver.org/lang/es/).

## [1.0.0] - 2026-10-27

### Añadido
- **Motor de Machine Learning Ensemble Multimodal (ADR-0005)**:
  - Extractor de características unificado (`FeatureExtractor`) que sintetiza un vector continuo de **24 dimensiones**:
    - Probabilidades bivariadas y $\lambda, \mu$ de Dixon-Coles & Poisson.
    - Ratings Elo dinámicos con ventaja de campo (+65 puntos) y coeficientes UEFA.
    - Fatiga de calendario y acumulación de partidos.
    - Factores de impacto ofensivo y fragilidad defensiva por bajas de plantilla.
    - Mapas de calor espaciales 3x3 (altura media de bloque, asimetría de flanco y presión en último tercio).
    - Sesgo de masa SELAE y entropía de consenso.
  - Optimizador Adam con regularización L2 ($\lambda = 0.002$) y clasificador Softmax multivariado (`ModelTrainer`).
  - **65.91% de acierto out-of-sample** en validación cronológica ciega sobre partidos reales en PostgreSQL (Brier Score: 0.4548, Cross-Entropy Loss: 0.8694).
  - Inferencia en tiempo real (< 1ms) con Blending Bayesiano ($60\%$ ML Multimodal + $40\%$ Prior Físico).
  - Endpoints dedicados `GET /api/ml/model-status` y `POST /api/ml/train`.
  - Componente de métricas de modelo e importancia de variables con pesos desglosados en `AnalyticsScreen.vue`.
- **Auditoría de Plantillas y Bajas Clave (ADR-0002)**:
  - Sistemas tácticos (4-3-3, 4-2-3-1, 3-5-2, etc.) y estados de convocatoria (PROBABLE, CONFIRMADA).
  - Algoritmo de cálculo de **referentes de plantilla** ponderado por titularidad, estatus clave, dorsal y capitanía.
  - Clasificación de bajas por tipo y gravedad (LEVE, MODERADA, CRÍTICA) con cuantificación matemática de merma en xG y vulnerabilidad defensiva.
- **Mapas de Calor Tácticos Espaciales 3x3 (ADR-0003)**:
  - Cuadrícula táctica 3x3 con cálculo de puntos calientes (*hotspots*), radar de intensidad y choque de estilos de juego.
  - Identificación de flanco preferente de ataque vs debilidad de carril rival.
- **Orquestación Asíncrona con BullMQ y Valkey (ADR-0004)**:
  - 5 colas en segundo plano (`sync-live`, `tactical-refresh`, `bayesian-feedback`, `squad-audit`, `historical-ingest`).
  - Monitorización reactiva de estado en `GET /api/queues/status` y en la cabecera de la UI.
- **Escrutinio y Seguimiento en Directo (`LiveScreen.vue`)**:
  - Pestaña para seguimiento en vivo de partidos, goles, estado y actualización automática de marcadores.
  - Cálculo interactivo de aciertos en el pronóstico del usuario y proyección de premios oficiales.
  - Botón de sincronización forzada bajo demanda (`POST /api/jornadas/sync-live`).
- **Pronóstico Activo de la Jornada y Presets de Presupuesto**:
  - Carga inmediata y pre-rellenado automático del boleto oficial para los 15 partidos de la jornada activa (`GET /api/jornadas/actual`).
  - Presets de presupuesto instantáneo: 14 Fijos Directos (0,75 €), Económico (1 Doble - 1,50 €), Estándar IA (4 Dobles con reducción al 13 - 3,00 €) y Avanzado (7 Dobles / -87.5% de ahorro).
- **Reducciones Combinatorias y Exportador Oficial `.QUI`**:
  - Algoritmo Set-Cover con distancia de Hamming para reducciones al 13, 12 y 11.
  - Generador de ficheros `.QUI` conforme a la especificación estándar de Loterías y Apuestas del Estado.
- **Identidad de Marca e Interfaz Visual**:
  - Logotipo oficial de marca de **QuantBet AI** integrado en cabecera y assets.
  - Diseño Dark Glassmorphism, header adaptativo y dock flotante persistente con cálculo en vivo de costes y descargas.
  - Navegación optimizada por pestañas (Boleto Inteligente, En Vivo & Escrutinio, Métricas & ML, Ratings ClubElo).
- **Infraestructura y Calidad**:
  - Despliegue reproducible con Docker Compose multi-contenedor (Frontend Nginx, Fastify API, PostgreSQL 16 y Valkey 8.0).
  - Suite de **40 tests unitarios** en 11 archivos de prueba con Vitest (100% pasando).
  - Documentación OpenAPI / Swagger interactiva disponible en `/docs`.
  - 5 Registros de Decisiones de Arquitectura formalmente indexados en `docs/decisions/` (ADR-0001 a ADR-0005).
