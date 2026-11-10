# Monitoreo y autores en Git

## OpenTelemetry y Grafana

`docker-compose.observability.yml` agrega `grafana/otel-lgtm:0.39.0` y publica Grafana solo en `127.0.0.1:3000`.

| Servicio | Trazas en el repositorio | Observado en Grafana |
| --- | --- | --- |
| `actividades` | `actividades/src/instrumentation.ts` arranca el SDK si existe `OTEL_EXPORTER_OTLP_ENDPOINT`. En Compose el servicio se llama `actividades` y exporta a `http://otel-lgtm:4318`. | Sí, en Tempo local. El 2026-11-10 la API local exportó a `127.0.0.1:4320` y Tempo listó trazas con `rootServiceName=actividades`. |
| `auth-service` | `autenticacion/src/instrumentation.ts` usa el mismo criterio. En Compose el servicio se llama `auth-service`. | Sí, en la misma consulta. Tempo listó trazas con `rootServiceName=auth-service`. |
| `frontend` | Nginx sirve archivos estáticos. No hay SDK de OpenTelemetry en el navegador. | No emite trazas propias. Las llamadas que hace a las APIs quedan en las trazas de esos servicios. |

Grafana local está en `127.0.0.1:3020` (`profelink-local-otel`, saludable). No está publicado en Internet. En el Droplet sigue haciendo falta un túnel; no se abrió ese túnel.

## Autores que aparecen en Git

`.mailmap` agrupa los alias del mismo integrante. `git shortlog` muestra un solo nombre por persona. El historial de cada commit no se reescribe.

| Persona | Alias que ya no se listan aparte |
| --- | --- |
| Maria del Mar Diaz Ruiz | `mdmdiaz25` |
| Bryan Pérez | `Brayan Pérez` |
| Samir Campos Diaz | `SamCocho127` |
| Fatima Carrillo | `fati` |

Salida agrupada de `git shortlog -sn --all` después del mailmap. `yeissonalb` queda con el nombre que usó en los commits.

| Autor en Git | Commits en `--all` |
| --- | --- |
| Maria del Mar Diaz Ruiz | 40 |
| Bryan Pérez | 24 |
| Samir Campos Diaz | 18 |
| yeissonalb | 6 |
| Fatima Carrillo | 2 |

Rutas en las que cada persona tiene al menos un commit, ya con `.mailmap` (`git log --pretty=format:%aN`). No describe el contenido de cada commit.

| Ruta | Autores |
| --- | --- |
| `frontend/` | Bryan Pérez, Fatima Carrillo, Maria del Mar Diaz Ruiz, yeissonalb |
| `autenticacion/` | Bryan Pérez, Fatima Carrillo, Maria del Mar Diaz Ruiz, yeissonalb |
| `actividades/` | Bryan Pérez, Fatima Carrillo, Maria del Mar Diaz Ruiz, Samir Campos Diaz, yeissonalb |
| `docs/`, `deploy/` y `docker-compose.yml` | Bryan Pérez, Maria del Mar Diaz Ruiz, yeissonalb |
| `cliente-adicional/` | Bryan Pérez, Maria del Mar Diaz Ruiz, yeissonalb |
| `openspec/` | Maria del Mar Diaz Ruiz |

Si un nombre no está en la tabla, este documento no le atribuye trabajo.
