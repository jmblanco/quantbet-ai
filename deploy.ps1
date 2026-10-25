# ==============================================================================
# Script de Despliegue y Actualización Automática para PowerShell (Windows)
# ==============================================================================
$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "🚀 Iniciando despliegue de QuantBet AI Platform..." -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan

# 1. Asegurar archivo .env
if (-not (Test-Path ".env")) {
    Write-Host "⚠️ Archivo .env no encontrado. Copiando desde .env.example..." -ForegroundColor Yellow
    Copy-Item ".env.example" ".env"
}

# 2. Descargar últimos cambios
Write-Host "📥 Comprobando actualizaciones de Git..." -ForegroundColor Gray
try {
    git pull --ff-only origin main
} catch {
    Write-Host "ℹ️ Continuando con la versión local..." -ForegroundColor Gray
}

# 3. Compilar y levantar contenedores
Write-Host "🐳 Construyendo y arrancando stack Docker..." -ForegroundColor Blue
docker compose up -d --build --remove-orphans

# 4. Estado de servicios
Start-Sleep -Seconds 3
docker compose ps

Write-Host "==========================================================" -ForegroundColor Green
Write-Host "✅ Despliegue completado con éxito." -ForegroundColor Green
Write-Host "🌐 Plataforma disponible en: http://localhost:8080" -ForegroundColor Green
Write-Host "📚 Documentación Swagger en: http://localhost:8080/docs" -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green
