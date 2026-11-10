# ProfeLink

Plataforma universitaria de cuestionarios interactivos de verdadero o falso. La autenticación y las actividades son servicios distintos: el primero emite JWT RS256 y el segundo valida la firma con el JWKS. No comparten tablas.

## Requisitos

- Node.js 22 para ejecutar un servicio fuera de Docker o las pruebas.
- Docker Compose 2.24.4 o posterior para la instalación local y para el overlay de producción.
- Una base PostgreSQL. En producción es Supabase y sus credenciales quedan en el servidor. En una máquina nueva, `scripts/iniciar.ps1` crea una base local sin esas credenciales.
- Las cuentas de demostración se piden por el canal privado del equipo. Este repositorio no publica contraseñas.

## Diagramas

- [Arquitectura desplegada](docs/entrega-persona-5.md). Ya existía; no hay una segunda copia.
- [Diagrama de clases](docs/diagramas/clases.md)
- [Modelo de datos](docs/diagramas/modelo-datos.md)

## Módulos

```text
ProyectofinalParadigma/
├── autenticacion/        Identidad, JWT RS256 y JWKS. Puerto 5001. Esquema auth_service.
├── actividades/          Cuestionarios, salas, resultados y WebSocket /canal. Puerto 5002. Esquema public.
├── frontend/             React + TypeScript. Puerto 5173 en desarrollo y 8080 dentro de Nginx.
├── cliente-adicional/    Cliente estático para consumir las APIs sin el código del frontend.
├── docs/                 Contratos, diagramas, despliegue y evidencia.
├── scripts/              Inicio y detención de la base local.
├── docker-compose.yml    Servicios contra la configuración Supabase del servidor.
├── docker-compose.prod.yml
├── docker-compose.observability.yml
└── docker-compose.local.yml
```

## Configuración

Copiá cada ejemplo y completá solo el entorno que te corresponde. Los `.env` reales no se versionan.

| Archivo | Uso |
| --- | --- |
| `.env.example` | Nombres de variables compartidas. Los valores de Supabase son marcadores. |
| `.env.production.example` | URLs públicas del Droplet. No lleva secretos. |
| `.env.local.example` | Nombre de la variable que el script local genera en `.local/entorno.env`. |
| `autenticacion/.env.example` | `DIRECT_URL` del session pooler de Supabase para el servicio de identidad. |
| `actividades/.env.example` | `DIRECT_URL` y credenciales distintas de Storage. |
| `frontend/.env.example` | URLs locales. `VITE_CANAL_URL` apunta a `/canal` y la simulación queda apagada. |

`docker-compose.yml` y `docker-compose.prod.yml` siguen leyendo `autenticacion/.env`, `actividades/.env` y el certificado de Supabase en el servidor. La instalación local no usa esos archivos.

## Instalación local nueva

Desde la raíz, con Docker en marcha:

```powershell
.\scripts\iniciar.ps1
```

```bash
./scripts/iniciar.sh
```

El script crea `.local/entorno.env` con una contraseña aleatoria, levanta PostgreSQL 16, aplica las migraciones, siembra el banco de actividades y construye autenticación, actividades y frontend.

- Frontend: `http://localhost:5173`
- Autenticación: `http://localhost:5001`
- JWKS: `http://localhost:5001/.well-known/jwks.json`
- Actividades: `http://localhost:5002`
- Canal: `ws://localhost:5002/canal?codigo=<CODIGO>`
- PostgreSQL local, solo en esta máquina: `127.0.0.1:54329`

Para detenerla sin borrar la base:

```powershell
.\scripts\detener.ps1
```

```bash
./scripts/detener.sh
```

Si la base local está vacía, `auth-service` crea las cuentas iniciales al arrancar. Las contraseñas no se escriben en este archivo: se piden por el canal privado. El banco sembrado pertenece al identificador `perfil-demo`. El arranque crea esa cuenta como `docente.demo@profelink.test`, junto con las cuentas de la UNA. Esas cuentas pueden crear sus propios cuestionarios. Subir una imagen nueva sigue exigiendo Supabase Storage; sin esas variables el servicio responde que el almacenamiento no está disponible. Las portadas ya sembradas son archivos estáticos del frontend.

El 2026-11-09 el motor de Docker Desktop sí estaba en marcha. `scripts/iniciar.ps1` levantó Postgres en `127.0.0.1:54329`, aplicó migraciones y sembró el banco. El `up --build` de las APIs se cortó porque `npm ci` dentro de Alpine tardaba más de una hora. Las APIs se usaron después con `npm run start:prod` contra esa base. Las cuentas locales quedan en `.local/credenciales-demo.txt`. El detalle está en [la entrega](docs/entrega-proyecto-2.md).

## Arranque manual, sin Docker

Hacen falta los `.env` de cada servicio. Para producción o para una base Supabase propia, usá los ejemplos de arriba. No apuntes una prueba de carga a la base publicada.

```bash
cd autenticacion
npm install
npm run prisma:generate
npm run db:deploy
npm run start:dev
```

```bash
cd actividades
npm install
npm run db:deploy
npm run db:seed
npm run start:dev
```

```bash
cd frontend
npm install
npm run dev
```

- Swagger de autenticación: `http://localhost:5001/docs`
- OpenAPI de actividades: `http://localhost:5002/openapi.json`
- Referencia Scalar: `http://localhost:5002/reference`

## Sitio publicado

El 2026-11-09 estos health checks públicos respondieron HTTP 200. La consulta fue de solo lectura y no modificó datos.

| Superficie | URL |
| --- | --- |
| Frontend | `https://profelink.sinkro.dev` |
| Salud del frontend | `https://profelink.sinkro.dev/health` |
| Autenticación | `https://auth.profelink.sinkro.dev` |
| Salud de autenticación | `https://auth.profelink.sinkro.dev/health/ready` |
| Actividades y WebSocket | `https://api.profelink.sinkro.dev` |
| Salud de actividades | `https://api.profelink.sinkro.dev/salud` |
| Canal público | `wss://api.profelink.sinkro.dev/canal` |

El workflow automático de GitHub sigue apagado hasta que `PRODUCTION_DEPLOY_ENABLED` sea exactamente `true`. La guía operativa está en [despliegue-digitalocean.md](docs/despliegue-digitalocean.md). Publicar imágenes o volver a desplegar requiere autorización aparte.

## Cuentas y datos de demostración

Pedí las credenciales por el canal privado del equipo. No están en el README ni en `cliente-adicional/index.html`.

Los datos de cuestionarios marcados como demostración salen de `actividades/prisma/seed.ts` y de `actividades/src/banco-preguntas/datos-banco.ts`. La partida manual del 2026-11-07 usó el título **Demo QA ProfeLink 2026-11-07** y quedó registrada en [evidencias/demo-punta-a-punta-2026-11-07.md](docs/evidencias/demo-punta-a-punta-2026-11-07.md).

## Cliente adicional

Seguí [cliente-adicional/README.md](cliente-adicional/README.md). El ejemplo abre el WebSocket con `['profelink', 'profelink-bearer.' + token]`. No se probó contra una sala real en esta sesión.

## Qué más revisar

- [Cierre de la entrega y pendientes](docs/entrega-proyecto-2.md)
- [Matriz de evidencia](docs/entrega/matriz-evidencia.md)
- [Imágenes y Docker Hub](docs/entrega/docker-hub.md)
- [Monitoreo y autores en Git](docs/entrega/monitoreo-y-aportes.md)
- [Spec archivado del frontend](openspec/changes/archive/2026-11-09-frontend-evaluaciones-en-vivo/)
- [Autenticación](docs/auth.md)
- [Eventos en vivo](docs/eventos-en-vivo.md)
- [Decisiones de arquitectura](docs/decisiones/arquitectura.md)
