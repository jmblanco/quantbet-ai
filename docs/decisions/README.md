# Registro de Decisiones de Arquitectura (ADRs)

Este directorio documenta formalmente las decisiones arquitectónicas clave de la plataforma **QuantBet AI**:

| Código | Título | Estado | Fecha | Resumen de Decisión |
| :--- | :--- | :---: | :---: | :--- |
| **[ADR-0001](ADR-0001-stack-tecnologico-quiniela.md)** | Selección del Stack Tecnológico, Persistencia y Capa de ML | `Accepted` | 2026-10-24 | Adopción de Node.js 22 + Fastify, PostgreSQL 16, Valkey 8.0 y Vue 3 con Tailwind CSS. |
| **[ADR-0002](ADR-0002-modelado-alineaciones-estado-jugadores.md)** | Modelado de Alineaciones, Convocatorias y Estado de Jugadores | `Accepted` | 2026-10-26 | Estructuración de plantillas, sistemas tácticos, bajas clave y factores de devaluación ofensiva/defensiva. |
| **[ADR-0003](ADR-0003-mapas-calor-dinamicos-semanales.md)** | Integración de Mapas de Calor Tácticos Dinámicos | `Accepted` | 2026-10-26 | Matriz espacial 3x3 para captura de desequilibrios por bandas, altura de bloque y choques de estilo. |
| **[ADR-0004](ADR-0004-orquestacion-tareas-bullmq-valkey.md)** | Orquestación de Tareas Asíncronas en Background con BullMQ y Valkey | `Accepted` | 2026-10-26 | Sistema de 5 colas asíncronas con monitorización read-only en API y UI para tareas pesadas y recurrentes. |
| **[ADR-0005](ADR-0005-motor-entrenamiento-ml-multimodal.md)** | Motor de Entrenamiento Supervisado de Machine Learning Multimodal | `Accepted` | 2026-10-27 | Clasificador Softmax multivariado L2/Adam con 24 features (física Poisson, Elo, fatiga, bajas, mapas 3x3 y masa LAE). |
