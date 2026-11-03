# Multi-stage Dockerfile para auth-service (ProfeLink)
FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY tsconfig*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

RUN npm ci

COPY src ./src
RUN npx prisma generate
RUN npm run build

RUN npm prune --omit=dev --ignore-scripts

# Etapa de Producción
FROM node:22-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5001

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

# Usuario no-root para seguridad
RUN mkdir -p /app/datos/keys && chown node:node /app/datos/keys
USER node

EXPOSE 5001

HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:5001/health/live || exit 1

CMD ["node", "dist/main.js"]
