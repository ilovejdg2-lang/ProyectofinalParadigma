FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

# El lockfile lo resolvió npm 11.21.2. npm 10, el de node:22-alpine, lo rechaza.
RUN --mount=type=cache,target=/root/.npm npm install -g npm@11.21.2 && npm ci --no-audit --no-fund

COPY nest-cli.json ./
COPY tsconfig*.json ./
COPY src ./src

RUN npm run build

RUN npm prune --omit=dev --ignore-scripts

FROM node:22-alpine AS runner
WORKDIR /app

RUN apk add --no-cache su-exec \
 && mkdir -p /app/almacen-imagenes \
 && chown node:node /app/almacen-imagenes

ENV NODE_ENV=production
ENV PORT=5002
ENV ALMACEN_IMAGENES_DIR=/app/almacen-imagenes

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY docker-entrada.sh /usr/local/bin/docker-entrada.sh
RUN chmod +x /usr/local/bin/docker-entrada.sh

EXPOSE 5002

ENTRYPOINT ["docker-entrada.sh"]
CMD ["node", "dist/main.js"]