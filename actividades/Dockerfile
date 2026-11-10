FROM node:22-alpine AS builder
WORKDIR /app

COPY package*.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma/

# El lockfile lo resolvió npm 11.21.2. npm 10, el de node:22-alpine, lo rechaza.
RUN npm install -g npm@11.21.2 && npm ci

COPY nest-cli.json ./
COPY tsconfig*.json ./
COPY src ./src

RUN npm run build

RUN npm prune --omit=dev --ignore-scripts

FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5002

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

USER node
EXPOSE 5002

CMD ["node", "dist/main.js"]