# Preparación del despliegue en DigitalOcean

Esta guía prepara ProfeLink para ejecutarse en el Droplet existente. El despliegue automático descrito abajo permanece deshabilitado hasta que una persona administradora configure el entorno protegido y active explícitamente `PRODUCTION_DEPLOY_ENABLED` en GitHub.

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

## Despliegue automático protegido desde `main`

`.github/workflows/deploy-production.yml` construye imágenes con tags únicos basados en el SHA del commit, el ID del workflow y el intento; transfiere los artefactos con ese mismo tag en el nombre y activa el comando fijo `deploy <tag>` en el Droplet. El helper exige que la identidad recibida, el nombre del artefacto y el tag del manifiesto firmado coincidan antes de ejecutar `docker load`; un manifiesto antiguo no puede reutilizarse bajo la identidad de otra ejecución. No publica imágenes en un registry ni copia `.env`, claves RSA o certificados desde GitHub. El servidor conserva los secretos de Supabase y las claves de autenticación. Los despliegues se serializan; cada release debe dejar saludables Auth, Actividades y frontend, o se intenta volver a la etiqueta anterior.

El workflow no hace nada mientras la variable de **repositorio** `PRODUCTION_DEPLOY_ENABLED` no sea exactamente `true`, y solo acepta la rama `main`. Debe ser de repositorio porque GitHub evalúa la condición del job antes de iniciar el job; las variables del entorno `production` se cargan después. Antes de activarlo, una persona administradora debe:

1. En **Settings → Environments**, crear `production`, permitir despliegues solo desde `main` y agregar al menos una persona revisora requerida. Activar **Prevent self-review** si está disponible. GitHub limita las aprobaciones requeridas en repositorios privados según el plan; verificar que el repositorio/plan permita la regla antes de habilitar el workflow. Sin la regla, no activar el despliegue automático.
2. En **Settings → Secrets and variables → Actions → Variables**, crear la variable de repositorio `PRODUCTION_DEPLOY_ENABLED` con valor `true` solo cuando el entorno y su aprobación estén configurados. Para pausar despliegues automáticos, cambiarla a otro valor o eliminarla.
3. Crear estas variables del entorno `production`:

   | Variable | Ejemplo de valor público |
   | --- | --- |
   | `DEPLOY_HOST` | IP o hostname del Droplet |
   | `DEPLOY_PORT` | `22` |
   | `SSH_KNOWN_HOSTS` | Línea de host key verificada, completa |
   | `FRONTEND_ORIGIN` | `https://profelink.sinkro.dev` |
   | `AUTH_PUBLIC_URL` | `https://auth.profelink.sinkro.dev` |
   | `ACTIVIDADES_PUBLIC_URL` | `https://api.profelink.sinkro.dev` |
   | `CANAL_PUBLIC_URL` | `wss://api.profelink.sinkro.dev/canal` |

4. Crear dos pares Ed25519 **separados y exclusivos para Actions**. Desde PowerShell:

   ```powershell
   ssh-keygen -t ed25519 -C "profelink-actions-upload" -f "$HOME\.ssh\profelink_actions_upload"
   ssh-keygen -t ed25519 -C "profelink-actions-trigger" -f "$HOME\.ssh\profelink_actions_trigger"
   ```

   Para automatización, dejar vacía la passphrase al crear estas claves. Nunca subir los archivos privados (`profelink_actions_upload` y `profelink_actions_trigger`) al repositorio ni pegarlos en el chat. Agregar su contenido como secretos del entorno `production`: `DEPLOY_UPLOAD_SSH_KEY` y `DEPLOY_TRIGGER_SSH_KEY`. Los archivos `.pub` son las claves públicas que se instalan en el Droplet.

5. Fijar `SSH_KNOWN_HOSTS` desde una fuente confiable y verificar su fingerprint contra la consola del Droplet antes de guardarla. No confiar en `ssh-keyscan` por sí solo ni desactivar `StrictHostKeyChecking`.
6. Configurar el acceso restringido del host una sola vez. El usuario `deploy` ya debe tener Compose v2.24.4 o posterior y los archivos de entorno de producción en `/home/deploy/profelink`.

   Desde la raíz del repo en PowerShell, transferir los archivos de configuración y scripts, y después las claves públicas:

   ```powershell
   ssh -i "$HOME\.ssh\profelink_do" deploy@<IP_DEL_DROPLET> "mkdir -p /home/deploy/profelink/deploy"
   scp -i "$HOME\.ssh\profelink_do" docker-compose.yml docker-compose.prod.yml deploy@<IP_DEL_DROPLET>:/home/deploy/profelink/
   scp -i "$HOME\.ssh\profelink_do" deploy\setup-github-deployment.sh deploy\profelink-deploy.sh deploy\profelink-deploy-trigger.sh deploy@<IP_DEL_DROPLET>:/home/deploy/profelink/deploy/
   scp -i "$HOME\.ssh\profelink_do" "$HOME\.ssh\profelink_actions_upload.pub" "$HOME\.ssh\profelink_actions_trigger.pub" deploy@<IP_DEL_DROPLET>:/home/deploy/profelink/
   ```

   En la sesión SSH del Droplet:

   ```bash
   cd ~/profelink
   chmod 700 deploy/setup-github-deployment.sh
   sudo ./deploy/setup-github-deployment.sh profelink_actions_upload.pub profelink_actions_trigger.pub
   ```

   El instalador crea una cuenta SFTP confinada a `/var/lib/profelink-ci-upload` y con inicio en `/incoming`; la raíz del chroot queda propiedad de `root` con modo `0755` (atravesable, pero no escribible por la cuenta), mientras que `.ssh` permanece `root:root` con modo `0700` y `authorized_keys` `root:root` con modo `0600`. Una lista permitida de operaciones habilita la carga de archivos, no lecturas, listados, borrados, creación de directorios ni acceso shell. La configuración de OpenSSH se valida con `sshd -t` y solo entonces se recarga el servicio; si la validación o la recarga falla, se restaura la configuración anterior y el helper de claves previo. Como el daemon no puede leer las claves bajo la identidad sin privilegios usada durante la autenticación, `AuthorizedKeysCommand` invoca un helper root-owned que solo entrega las claves de las dos cuentas de CI allowlisted; no expone un shell ni permite consultas para otros usuarios. La cuenta de activación usa una llave forzada a un comando fijo que acepta únicamente `deploy <SHA-40>-<run-id>-<run-attempt>`, valida el formato y pasa la identidad por stdin al script root-owned; la regla `sudo` permite solo el modo `--trigger`. Ninguna cuenta se agrega al grupo `docker` ni recibe shell SSH. El helper valida SHA-256 y exige que el tag firmado coincida con la identidad entregada por la ejecución protegida.
7. Probar los endpoints y, si corresponde, hacer una ejecución manual desde **Actions → Deploy production → Run workflow** seleccionando `main`. La variable `PRODUCTION_DEPLOY_ENABLED=true` debe estar configurada a nivel de repositorio y el entorno `production` debe tener sus revisores, secretos y variables.

Para comprobar la key host antes de registrarla en GitHub, obtener la línea con `ssh-keyscan` desde una red confiable y comparar su fingerprint (`ssh-keygen -lf <archivo>`) con la que muestra la consola del Droplet. Guardar la línea verificada completa en `SSH_KNOWN_HOSTS`; el workflow no usa `ssh-keyscan` durante el despliegue.

### Rollback

El servidor mantiene un enlace `markers-current` en `/var/lib/profelink` que apunta a una generación coherente de `active-release` y `previous-release`; el enlace se cambia atómicamente solo después de que el conjunto de servicios pasa salud. Los marcadores planos anteriores se leen para migración y se reemplazan en la próxima actualización exitosa. Los tags de Actions combinan el SHA del commit con el ID del workflow y su intento; un reintento no reemplaza la imagen activa. En la primera ejecución automatizada, el script usa `latest` como rollback de transición solo si las tres imágenes `latest` ya existen localmente. En ejecuciones posteriores valida que la release activa esté disponible y conserva temporalmente sus referencias de imagen mientras carga el archivo. La release anterior puede haberse podado: no bloquea el despliegue y, al completarse, el marcador anterior pasa a referir a la release activa actual. Cada chequeo de salud también compara el ID de imagen de cada contenedor con el ID esperado para esa release. Si no están disponibles las imágenes de la release activa o no se confirma la identidad/salud de los servicios, el despliegue se detiene o restaura la versión activa sin cambiar los marcadores.

Si una versión no pasa salud, el script intenta restaurar la anterior automáticamente. Para solicitar un rollback manual desde el usuario `deploy` del Droplet, ejecutá el mismo helper root-owned:

```bash
sudo /usr/local/sbin/profelink-deploy --rollback
```

El helper comprueba que estén disponibles las imágenes de la release destino y de la release activa, aplica la anterior y espera a que los tres servicios estén saludables. Solo entonces cambia atómicamente los marcadores; si la operación falla, conserva los marcadores e intenta restaurar la release que estaba activa. `latest` sigue siendo un tag válido de rollback. Las imágenes locales no se eliminan automáticamente para conservar la posibilidad de volver atrás.
