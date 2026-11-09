FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

ARG VITE_AUTH_URL
ARG VITE_ACTIVIDADES_URL
ARG VITE_CANAL_URL
ARG VITE_USAR_SIMULACION=false

ENV VITE_AUTH_URL=${VITE_AUTH_URL}
ENV VITE_ACTIVIDADES_URL=${VITE_ACTIVIDADES_URL}
ENV VITE_CANAL_URL=${VITE_CANAL_URL}
ENV VITE_USAR_SIMULACION=${VITE_USAR_SIMULACION}

RUN npm run build

FROM nginxinc/nginx-unprivileged:stable-alpine

COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 8080
