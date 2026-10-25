# 🚢 Guía de Despliegue Autocontenido y Automatizado con Dockhand (`DOCKHAND_DEPLOY.md`)

Esta guía explica cómo desplegar la plataforma **QuantBet AI** como un **Stack 100% autocontenido e independiente** en cualquier máquina o servidor que disponga de **Dockhand** (o Docker Compose), sin depender de ninguna infraestructura externa.

---

## 🏗️ 1. Arquitectura del Stack Autocontenido

El proyecto no necesita proxys compartidos ni redes externas:
* **`frontend` (Vue 3 + Vite + Nginx Alpine)**:
  * Sirve los activos estáticos compilados de la SPA.
  * Actúa como proxy inverso interno: reenvía `/api/` hacia el contenedor del backend y expone un único puerto hacia el host (`APP_PORT=8080`).
* **`backend` (Node.js 22 + Fastify + Prisma + Dixon-Coles)**:
  * Motor matemático, ingesta y APIs.
  * Su script de arranque (`docker-entrypoint.sh`) inicializa automáticamente las tablas en PostgreSQL con Prisma (`prisma db push`) y carga los datos semilla de la jornada si está vacía (`AUTO_SEED=true`).
* **`postgres` (PostgreSQL 16 Alpine)**: Base de datos relacional con volumen persistente propio (`quiniela_postgres_data`).
* **`valkey` (Valkey 8.0 Alpine)**: Motor de caché en memoria RAM con volumen persistente (`quiniela_valkey_data`).
* **`quiniela_network`**: Red bridge interna privada donde conviven los 4 servicios.

---

## 🚀 2. Métodos de Despliegue en Dockhand

### Método 1: Stack Conectado a Git en Dockhand (Recomendado ⭐⭐⭐)
Dockhand permite vincular un repositorio Git para compilar y desplegar automáticamente la aplicación:

1. **Abrir Dockhand** en el equipo o servidor remoto (`http://<ip-servidor>:puerto-dockhand`).
2. Ir a la pestaña **Stacks** -> **Add Stack** -> Elegir opción **Repository** (Git).
3. Rellenar los campos del Stack:
   * **Name**: `quantbet-ai`
   * **Repository URL**: `https://github.com/<tu-usuario>/quiniela-ia-platform.git` (o la URL de tu repositorio privado).
   * **Repository Reference / Branch**: `main`
   * **Compose Path**: `docker-compose.yml`
4. **Variables de Entorno (Environment Variables)**:
   Pegar las variables del archivo `.env.example`:
   ```ini
   APP_PORT=8080
   POSTGRES_USER=quiniela_user
   POSTGRES_PASSWORD=tu_clave_secreta_aqui_123
   POSTGRES_DB=quiniela_db
   AUTO_SEED=true
   NODE_ENV=production
   ```
5. **Automatización de Despliegue (Auto-Update)**:
   * Activar el switch **Automatic updates / Polling** (por ejemplo, cada 5 minutos), o bien:
   * Copiar la **Webhook URL** generada por Dockhand para vincularla a GitHub.
6. Hacer clic en **Deploy the stack**. Dockhand clonará el repositorio, construirá las imágenes Docker y levantará todos los servicios de forma orquestada.

---

### Método 2: Despliegue Automatizado con GitHub Actions (CI/CD)
El repositorio incluye el workflow preconfigurado [`.github/workflows/deploy.yml`](file:///.github/workflows/deploy.yml):

1. En tu repositorio de GitHub, ve a **Settings** -> **Secrets and variables** -> **Actions**.
2. Añade un nuevo secreto llamado:
   * `DOCKHAND_WEBHOOK_URL`: La URL del webhook que te proporciona Dockhand en la configuración del Stack.
3. A partir de ese momento, cada vez que hagas un `git push` a la rama `main`:
   * GitHub Actions ejecutará los tests unitarios y la compilación.
   * Si todo es verde, disparará el Webhook de Dockhand.
   * Dockhand descargará el nuevo código, reconstruirá las imágenes y aplicará las migraciones sin tiempo de inactividad perceptible.

---

### Método 3: Despliegue Directo por Terminal (Script `deploy.sh`)
Si prefieres arrancar el stack manualmente por SSH en el servidor:

```bash
# Clonar el proyecto
git clone https://github.com/<tu-usuario>/quiniela-ia-platform.git
cd quiniela-ia-platform

# Dar permisos de ejecución y lanzar el script
chmod +x deploy.sh
./deploy.sh
```

*(En Windows PowerShell se puede ejecutar `.\deploy.ps1`)*.

---

## 🔍 3. Verificación del Despliegue

Una vez completado el despliegue, podrás verificarlo inmediatamente:

1. **Aplicación Web**: Accede desde el navegador a `http://<IP_DEL_EQUIPO>:8080`.
2. **Documentación Swagger / OpenAPI**: Accede a `http://<IP_DEL_EQUIPO>:8080/docs`.
3. **Healthcheck del Sistema**:
   ```bash
   curl http://localhost:8080/api/health
   ```
   Respuesta esperada:
   ```json
   {
     "status": "HEALTHY",
     "services": {
       "database": "UP",
       "valkey": "UP"
     },
     "timestamp": "2026-10-25T..."
   }
   ```

---

## 🛠️ 4. Gestión y Monitoreo en Dockhand

Desde la interfaz de Dockhand podrás:
* **Ver logs unificados o por contenedor**: Comprobar el log de `quiniela_backend` para ver las ingestas y cálculos en tiempo real.
* **Controlar consumo de recursos**: Memoria RAM (aprox. ~120 MB en total para todo el stack) y uso de CPU.
* **Reinicio o rollback**: Reiniciar cualquier contenedor o forzar una recompilación con un solo clic.
