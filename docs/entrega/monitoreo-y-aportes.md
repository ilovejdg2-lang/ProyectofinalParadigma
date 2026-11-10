# Monitoreo y autores en Git

## OpenTelemetry y Grafana

`docker-compose.observability.yml` agrega `grafana/otel-lgtm:0.39.0` y publica Grafana solo en `127.0.0.1:3000`.

| Servicio | Trazas en el repositorio | Observado en Grafana |
| --- | --- | --- |
| `actividades` | `actividades/src/instrumentation.ts` arranca el SDK si existe `OTEL_EXPORTER_OTLP_ENDPOINT`. El overlay ya le asigna `OTEL_SERVICE_NAME=actividades` y el endpoint `http://otel-lgtm:4318`. | El registro anterior dice que se vieron trazas de `actividades` en Tempo. Esta sesión no abrió Grafana. |
| `auth-service` | Desde esta entrega, `autenticacion/src/instrumentation.ts` usa el mismo criterio: sin endpoint no exporta. El overlay ahora también le asigna `OTEL_SERVICE_NAME=auth-service`. | No. El cambio de Compose no se desplegó. No hay una traza de autenticación observada. |
| `frontend` | Nginx sirve archivos estáticos. No hay SDK de OpenTelemetry en el navegador ni en `frontend/nginx.conf`. | No. Las llamadas que el navegador hace a `actividades` pueden aparecer en las trazas de ese servicio cuando el exportador está activo. Las llamadas a autenticación solo aparecerán después de un despliegue que incluya el cambio de arriba. |

El endpoint de Grafana no está publicado en Internet. Consultarlo exige un túnel al puerto 3000 del Droplet. No se abrió ese túnel.

## Autores que aparecen en Git

Salida de `git shortlog -sn --all` el 2026-11-09. Son cadenas de autor distintas. No se unieron alias ni se asignaron partes de la rúbrica que el historial no muestra.

| Autor en Git | Commits en `--all` |
| --- | --- |
| Maria del Mar Diaz Ruiz | 37 |
| Bryan Pérez | 23 |
| Samir Campos Diaz | 12 |
| SamCocho127 | 6 |
| yeissonalb | 6 |
| mdmdiaz25 | 2 |
| Brayan Pérez | 1 |
| Fatima Carrillo | 1 |
| fati | 1 |

Rutas en las que cada cadena tiene al menos un commit. La lista sale de `git log --pretty=format:%an -- <ruta>` y no describe el contenido de cada commit.

| Ruta | Autores |
| --- | --- |
| `frontend/` | Bryan Pérez, fati, Maria del Mar Diaz Ruiz, yeissonalb |
| `autenticacion/` | Bryan Pérez, fati, yeissonalb |
| `actividades/` | Bryan Pérez, fati, SamCocho127, yeissonalb |
| `docs/`, `deploy/` y `docker-compose.yml` | Bryan Pérez, yeissonalb |
| `cliente-adicional/` | Bryan Pérez, yeissonalb |
| `openspec/` | Maria del Mar Diaz Ruiz |

Si un nombre no está en la tabla, este documento no le atribuye trabajo.
