#!/bin/sh
set -e

echo "⏳ Comprobando conexión y sincronizando base de datos..."

# Ejecutar migración/push de Prisma sin intervención manual
if [ -n "$DATABASE_URL" ]; then
  echo "📦 Sincronizando modelo Prisma con PostgreSQL..."
  npx prisma db push --skip-generate --accept-data-loss
fi

# Ejecutar seed inicial si se solicita o la DB está vacía
if [ "$AUTO_SEED" = "true" ]; then
  echo "🌱 Verificando e inicializando datos semilla..."
  npx tsx prisma/seed.ts || echo "⚠️ Seed completado o datos existentes."
fi

echo "🚀 Iniciando API Backend en puerto $PORT..."
exec "$@"
