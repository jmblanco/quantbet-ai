#!/usr/bin/env bash
# ==============================================================================
# Script de Despliegue y Actualización Automática para QuantBet AI
# ==============================================================================
set -euo pipefail

echo "=========================================================="
echo "🚀 Iniciando despliegue de QuantBet AI Platform..."
echo "=========================================================="

# 1. Asegurar archivo .env
if [ ! -f .env ]; then
  echo "⚠️ Archivo .env no encontrado. Copiando desde .env.example..."
  cp .env.example .env
fi

# 2. Descargar últimos cambios del repositorio
echo "📥 Comprobando actualizaciones de Git..."
git pull --ff-only origin main || echo "ℹ️ Continuando con la copia local..."

# 3. Compilar y levantar contenedores en segundo plano
echo "🐳 Construyendo y arrancando stack Docker..."
docker compose pull --ignore-pull-failures || true
docker compose up -d --build --remove-orphans

# 4. Esperar a que los contenedores estén saludables
echo "⏳ Esperando confirmación de Healthchecks..."
sleep 5

# Comprobar estado de los servicios
docker compose ps

echo "=========================================================="
echo "✅ Despliegue completado con éxito."
echo "🌐 Plataforma disponible en: http://localhost:${APP_PORT:-8080}"
echo "📚 Documentación Swagger en: http://localhost:${APP_PORT:-8080}/docs"
echo "=========================================================="
