# Imágenes y Docker Hub

No se publicó ninguna imagen. El repositorio no contiene usuario, token ni un namespace de Docker Hub. El 2026-11-09 (noche) `docker images` solo listó las imágenes de migración `profelink-local-preparar-auth:latest` y `profelink-local-preparar-actividades:latest`. No existen en esta máquina `proyectofinalparadigma-auth-service`, `proyectofinalparadigma-actividades` ni `proyectofinalparadigma-frontend` para etiquetar y subir. El despliegue actual tampoco usa un registry: `deploy/profelink-deploy.sh` carga las imágenes en el Droplet con `docker load`.

## Nombres locales que ya construye Compose

| Servicio | Imagen local |
| --- | --- |
| Autenticación | `proyectofinalparadigma-auth-service` |
| Actividades | `proyectofinalparadigma-actividades` |
| Frontend | `proyectofinalparadigma-frontend` |

El tag por defecto es `latest`, o el valor de `IMAGE_TAG`. Esos nombres salen de `docker-compose.yml` y `docker-compose.prod.yml`. No existen en Docker Hub hasta que alguien con sesión iniciada los suba.

## Lo que falta para publicarlos

1. Una cuenta de Docker Hub y autorización explícita para subir.
2. `docker login` en la máquina que vaya a publicar. La contraseña no se guarda en el repositorio.
3. Construir desde la raíz y etiquetar con el namespace real del equipo, por ejemplo:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml build
docker tag proyectofinalparadigma-auth-service:latest <namespace>/profelink-auth-service:latest
docker tag proyectofinalparadigma-actividades:latest <namespace>/profelink-actividades:latest
docker tag proyectofinalparadigma-frontend:latest <namespace>/profelink-frontend:latest
docker push <namespace>/profelink-auth-service:latest
docker push <namespace>/profelink-actividades:latest
docker push <namespace>/profelink-frontend:latest
```

`<namespace>` no está definido en el código. No lo reemplaces por un nombre inventado.

La construcción de producción también exige `.env.production` y los `.env` de Supabase del servidor. No uses esa construcción para experimentar contra la base publicada.
