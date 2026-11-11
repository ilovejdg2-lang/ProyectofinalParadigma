# Entrega del Proyecto 2

Trabajo hecho el 2026-11-09 sobre la rama `entrega/proyecto-2-rubrica`, creada desde `origin/development` en `835ca15`. No se hizo merge, no se desplegó, no se publicaron imágenes y no se escribieron datos en Supabase.

## Comandos de esta sesión

| Comando | Resultado |
| --- | --- |
| `curl` a `https://profelink.sinkro.dev/health`, `https://auth.profelink.sinkro.dev/health/ready` y `https://api.profelink.sinkro.dev/salud` | HTTP 200 en los tres. Solo lectura. |
| `openspec status --change frontend-evaluaciones-en-vivo --json` | Artefactos `proposal`, `specs`, `design` y `tasks` en `done`. Las tareas del archivo estaban todas marcadas. |
| `openspec validate --specs --json` | 4 specs válidas: `acceso-y-perfiles`, `cuestionarios`, `resultados`, `sala-y-partida`. |
| `docker compose -f docker-compose.local.yml config --quiet` | Salió sin error. La contraseña usada era un valor de prueba de la sesión, no un secreto del repositorio. |
| `docker info` | Falló: el pipe `dockerDesktopLinuxEngine` no existe. No se ejecutó `scripts/iniciar.ps1`. |
| `node --test cliente-adicional/protocolo-canal.test.mjs cliente-adicional/prueba-carga-lectura.test.mjs` | 5 pruebas, 0 fallos. No llaman a una API. |
| `npx jest src/instrumentation-order.spec.ts --runInBand` en `autenticacion/` | 1 prueba, 0 fallos. Comprueba el orden del import; no exporta trazas. |
| `npm run build` en `autenticacion/` | Compiló con el import de OpenTelemetry. |
| `git shortlog -sn --all` y `git log` por carpeta | Autores listados en [monitoreo-y-aportes.md](entrega/monitoreo-y-aportes.md). |

## Entregables

| Entregable | Estado |
| --- | --- |
| Diagrama de arquitectura | Ya estaba en `docs/entrega-persona-5.md`. No se duplicó. |
| Justificación N-Capas / Vertical Slice | `docs/decisiones/arquitectura-interna.md`: estilo del sistema, slices de actividades, N-Capas de autenticación, mapa para la defensa. |
| Diagrama de clases | Agregado en `docs/diagramas/clases.md`. Separa autenticación y actividades. |
| Modelo de datos | Agregado en `docs/diagramas/modelo-datos.md`, con los esquemas `auth_service` y `public`. |
| OpenSpec archivado | `openspec/changes/archive/2026-11-09-frontend-evaluaciones-en-vivo/`. Las specs vigentes quedaron en `openspec/specs/`. |
| README, `.env.example` y arranque | El README distingue el sitio ya publicado del workflow automático, que sigue apagado. La instalación local es `docker-compose.local.yml` más `scripts/iniciar.ps1` y `scripts/detener.ps1`. |
| Sitio publicado | Los tres health checks respondieron 200 el 2026-11-09. |
| Cuentas de demostración | Fuera del README. El script local escribe `.local/credenciales-demo.txt` (gitignored). |
| Cliente adicional | Usa `Sec-WebSocket-Protocol`. La corrida de evidencia abrió dos salas reales en localhost. |
| Docker Compose reproducible | Postgres local, migraciones y seed sí corrieron. `iniciar.ps1` se cortó en el `--build` de las APIs (npm ci + unpack tardaban más de una hora y el disco quedó en ~12 GB libres). Las APIs se usaron con `npm run start:prod` contra `127.0.0.1:54329`. |
| Matriz de evidencia | [matriz-evidencia.md](entrega/matriz-evidencia.md). Los seis casos se observaron en localhost el 2026-11-09 (noche). No son dispositivos físicos. |
| OpenTelemetry | Código listo en ambos servicios. Grafana `otel-lgtm` quedó en `127.0.0.1:3020` (contenedor unhealthy al arrancar). Esta corrida de evidencia se hizo **sin** `OTEL_EXPORTER_OTLP_ENDPOINT` para no bloquear el boot. El frontend estático no tiene SDK. |
| Docker Hub | No se subió ninguna imagen. Solo existen en local `profelink-local-preparar-auth` y `profelink-local-preparar-actividades`. Ver [docker-hub.md](entrega/docker-hub.md). |
| Aportes | Solo los nombres que aparecen en Git. |

## Sigue pendiente

1. Dejar que `.\scripts\iniciar.ps1` termine el `up --build` de auth, actividades, frontend y Grafana. Hoy se abortó por tiempo y disco; Postgres + migrar/sembrar sí ocurrió.
2. Demo con varios **dispositivos físicos**. Lo observado son 8 clientes Node en una sola máquina.
3. Trazas de `auth-service` en Grafana: hay que arrancar el servicio **con** `OTEL_EXPORTER_OTLP_ENDPOINT` cuando el collector de `otel-lgtm` ya esté sano, y buscar en Tempo. Esta corrida no lo hizo.
4. `docker login` + `docker push` con el namespace real. En local no hay imágenes `proyectofinalparadigma-auth-service` / `actividades` / `frontend` construidas para publicar.
