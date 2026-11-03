# Preparación del despliegue en DigitalOcean

Esta guía prepara ProfeLink para ejecutarse en el Droplet existente. **No despliega el proyecto ni modifica el Caddyfile del servidor.** La publicación requiere una autorización explícita aparte.

## Topología

- `https://profelink.sinkro.dev`: interfaz React servida por Nginx sin privilegios.
- `https://auth.profelink.sinkro.dev`: API de autenticación.
- `https://api.profelink.sinkro.dev`: API de actividades y WebSocket.
- Caddy se ejecuta en el host y reenvía el tráfico a puertos publicados solo en `127.0.0.1`.
- Grafana permanece accesible únicamente desde el host en `127.0.0.1:3000`; no se publica en Internet.

Separar los servicios por hostname evita colisiones de rutas y permite que el frontend use sus variables `VITE_AUTH_URL`, `VITE_ACTIVIDADES_URL` y `VITE_CANAL_URL` sin cambiar código.

## Requisitos antes de desplegar

0. Instalar Docker Compose **2.24.4 o posterior**; `docker-compose.prod.yml` usa `!override` para reemplazar los puertos de desarrollo en vez de combinarlos.
1. En Name.com, crear registros **A** para `auth.profelink.sinkro.dev` y `api.profelink.sinkro.dev`, ambos apuntando a la IPv4 pública del Droplet. El registro de `profelink.sinkro.dev` ya debe apuntar al mismo Droplet.
2. Confirmar que los puertos 80 y 443 del Droplet son accesibles y que Caddy es el único proceso que escucha públicamente en ellos.
3. En el servidor, mantener fuera de Git los archivos `autenticacion/.env`, `actividades/.env` y `autenticacion/certs/supabase-root.crt`. Los dos `.env` contienen configuración y credenciales de Supabase; el certificado de CA debe estar presente porque ambos servicios lo montan.
4. Copiar `.env.production.example` como `.env.production`. No agregar credenciales a ese archivo de ejemplo: contiene solamente URLs públicas.

## Validar configuración local

Desde la raíz del repositorio, primero validar la composición sin iniciar contenedores:

```powershell
docker compose --env-file .env.production.example -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.observability.yml config --quiet
```

Para construir e iniciar en el servidor, después de completar los archivos de entorno y el certificado:

```bash
docker compose --env-file .env.production -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.observability.yml up -d --build
```

El overlay de producción reemplaza las publicaciones de puertos del Compose local: las APIs y el frontend quedan accesibles desde el host, no directamente desde Internet. El certificado raíz de Supabase y los `.env` no se hornean en las imágenes.

## Caddy del host

Revisar `deploy/Caddyfile.example` y fusionar esos tres bloques con el Caddyfile existente; **no reemplazar el archivo existente a ciegas**. Caddy administra HTTPS automáticamente cuando los hostnames resuelven al Droplet y los puertos HTTP/HTTPS están accesibles. El proxy inverso también admite WebSocket sin un bloque especial.

Después de fusionar y revisar la configuración en el servidor:

```bash
sudo caddy validate --config /etc/caddy/Caddyfile
sudo systemctl reload caddy
```

## Comprobaciones posteriores al despliegue

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.observability.yml ps
curl -fsS https://profelink.sinkro.dev/health
curl -fsS https://auth.profelink.sinkro.dev/health/ready
curl -fsS https://api.profelink.sinkro.dev/salud
```

Verificar además que una ruta interna de frontend cargue al refrescarla, que el login funcione, y que un anfitrión y un participante autorizado puedan conectarse a una sala por WebSocket. No abrir Grafana públicamente; para consultarlo, usar un túnel SSH al puerto local 3000.

## Retirada

Para retirar la versión en contenedores sin borrar datos persistentes:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.observability.yml down
```

No agregar `--volumes`: el volumen de claves RSA y el de Grafana deben conservarse durante una retirada normal.
