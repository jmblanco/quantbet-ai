# ==============================================================================
# Multi-stage Dockerfile para Backend QuantBet AI (Node.js 22 + Fastify + Prisma)
# ==============================================================================

# Etapa 1: Compilación de TypeScript y cliente Prisma
FROM node:22-alpine AS builder

WORKDIR /app

RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

# Generar cliente Prisma
COPY prisma ./prisma/
RUN npx prisma generate

# Copiar fuentes y compilar TS
COPY tsconfig.json ./
COPY src ./src/
RUN npm run build

# Etapa 2: Imagen de producción final
FROM node:22-alpine AS runner

WORKDIR /app

RUN apk add --no-cache openssl

ENV NODE_ENV=production
ENV PORT=3333
ENV HOST=0.0.0.0

# Copiar dependencias y artefactos compilados
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY docker-entrypoint.sh ./

RUN chmod +x docker-entrypoint.sh

EXPOSE 3333

HEALTHCHECK --interval=15s --timeout=5s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3333/api/health').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

ENTRYPOINT ["./docker-entrypoint.sh"]
CMD ["node", "dist/index.js"]
