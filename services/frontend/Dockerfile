# ==============================================================================
# Multi-stage Dockerfile para el Frontend de QuantBet AI (Vue 3 + Vite + Nginx)
# ==============================================================================

# Etapa 1: Compilación de activos estáticos
FROM node:22-alpine AS builder

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci

# Copiar código fuente y compilar producción
COPY . .
RUN npm run build

# Etapa 2: Servidor HTTP Nginx ultraligero
FROM nginx:alpine

# Limpiar directorio web por defecto
RUN rm -rf /usr/share/nginx/html/*

# Copiar bundle compilado
COPY --from=builder /app/dist /usr/share/nginx/html

# Copiar configuración con soporte SPA y proxy inverso a /api
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

HEALTHCHECK --interval=15s --timeout=3s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1/healthz || exit 1

CMD ["nginx", "-g", "daemon off;"]
