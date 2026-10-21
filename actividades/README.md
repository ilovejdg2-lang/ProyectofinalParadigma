# API de actividades

ProfeLink es una aplicación de cuestionarios en vivo, del estilo de una partida por sala: un docente publica actividades, abre una sala y los participantes responden pregunta por pregunta.

Esta API es el trabajo de la Persona 2. Guarda cuestionarios, preguntas, opciones e imágenes, y administra las sesiones de juego, las respuestas, las puntuaciones y los resultados. No registra usuarios, no abre un canal en vivo y no dibuja la partida.

Tecnologías: NestJS 11, TypeScript, Prisma 7, PostgreSQL en Supabase y Supabase Storage. El cliente de Prisma se genera en `src/generated/prisma`. No hay prefijo global: las rutas cuelgan de la raíz del servidor, por defecto `http://localhost:5002`.

**Estado: implementación de la API de actividades finalizada, pendiente de integración y validaciones externas.**

El detalle de las cinco fases y de lo que sigue en manos de otras personas está al final.

## Arquitectura

```text
actividades/
  prisma/schema.prisma
  prisma/migrations/20261021013000_inicial/
  prisma/seed.ts
  prisma/estado.ts
  src/main.ts                 CORS y puerto
  src/app.module.ts           módulos y filtro global de errores
  src/autenticacion/          contrato de identidad externa
  src/comun/                  validación y errores { mensaje }
  src/cuestionarios/          catálogo y CRUD
  src/preguntas/              reglas de preguntas y opciones
  src/imagenes/               carga, SVG a PNG y Storage
  src/sesiones-juego/         salas, respuestas, cierre y avance
  src/resultados/             historial y clasificación
  src/prisma/                 conexión con PostgreSQL
  src/salud/                  GET /salud
  test/                       e2e y dobles en memoria
```

| Módulo | Responsabilidad |
|---|---|
| Cuestionarios | Listar, crear, editar y borrar lógicamente. Arma el JSON público y, para el propietario, el detalle con soluciones. |
| Preguntas | No tiene rutas propias. Valida enunciados, opciones, orden y tiempo, y sintetiza Verdadero/Falso cuando una pregunta llega sin opciones. |
| Imágenes | Recibe el archivo, comprueba firma y tamaño, convierte un SVG válido a PNG y guarda el metadato. El binario va a Storage, no a PostgreSQL. |
| Sesiones de juego | Crea la sala, incorpora participantes, inicia, registra respuestas, cierra la pregunta y avanza o finaliza. |
| Resultados | Lee sesiones ya `finalizada` para el historial y la clasificación. No recalcula puntos. |
| Autenticación externa | `VerificadorIdentidad` y `IdentidadGuard`. No hay tabla de usuarios. |
| Prisma | Abre PostgreSQL con `DIRECT_URL`. Si no hay cadena, la API arranca y las rutas que escriben o leen datos responden 503. |

`PrismaModule` y `AutenticacionModule` son globales. `AvisoSesiones` solo vive dentro de sesiones de juego. Los errores HTTP salen como `{ "mensaje": "..." }`.

## Configuración

1. Copia el ejemplo y completa las cadenas en tu máquina:

```bash
cp .env.example .env
```

En Windows PowerShell:

```powershell
Copy-Item .env.example .env
```

2. En Supabase, abre **Connect → ORM → Prisma** y pega las dos cadenas en `.env`.

- `DIRECT_URL`: session pooler, puerto **5432**. La usa NestJS, Prisma Migrate y el seed.
- `DATABASE_URL`: transaction pooler, puerto **6543**. Queda guardada y **NestJS no la usa**.

Un proceso NestJS de larga duración encaja con el session pooler. El adaptador `@prisma/adapter-pg` no desactiva las prepared statements cuando la URL lleva `pgbouncer=true`, y el transaction pooler de Supabase está pensado para funciones efímeras. Las migraciones tampoco pueden correr por el puerto 6543.

No hace falta crear otro proyecto Supabase ni levantar PostgreSQL en local para desarrollar esta API. Una base distinta sí haría falta para pruebas de concurrencia: está descrito en [Pruebas](#pruebas).

| Variable | Uso |
|---|---|
| `DIRECT_URL` | Conexión de NestJS, migraciones y seed. No se imprime en las respuestas. |
| `DATABASE_URL` | Reservada. Esta API no la consulta. |
| `PORT` | Puerto HTTP. Por defecto `5002`, el mismo que `VITE_ACTIVIDADES_URL`. |
| `FRONTEND_URL` | Origen CORS. Por defecto `http://localhost:5173`. Métodos `GET`, `POST`, `PUT`, `DELETE` y `OPTIONS`. |
| `SUPABASE_URL` | Proyecto de Storage. |
| `SUPABASE_SECRET_KEY` | Clave secreta solo de este backend. No va al frontend. |
| `SUPABASE_STORAGE_BUCKET` | Bucket público. El previsto es `profelink-imagenes`. |

La plantilla con valores de ejemplo está en `.env.example`. No copies contraseñas a este README ni al repositorio.

## Comandos

```bash
npm install
npm run prisma:generate
npm run start:dev
```

| Comando | Uso |
|---|---|
| `npm run start:dev` | API en el puerto `PORT` (5002), con recarga |
| `npm run start` | API sin recarga |
| `npm run start:prod` | `node dist/main`, después de `npm run build` |
| `npm run build` | Compila TypeScript |
| `npm run lint` | ESLint sobre `src` y `test` |
| `npm test` | Pruebas unitarias con Jest |
| `npm run test:e2e` | Pruebas e2e. El script ya incluye `--experimental-vm-modules`, necesario para Prisma 7 |
| `npm run prisma:generate` | Genera el cliente de Prisma. También corre en `postinstall` |
| `npm run prisma:validate` | Valida `schema.prisma` |
| `npm run db:estado` | Comprueba la conexión y lista tablas de `public` |
| `npm run db:deploy` | Aplica las migraciones ya revisadas (`prisma migrate deploy`) |
| `npm run db:seed` | Carga los cuestionarios de demostración |

`GET /salud` responde `{ "estado": "ok", "baseDatos": "disponible" | "no-configurada" | "no-disponible" }` y no incluye la cadena de conexión.

## Endpoints

Todas las respuestas de error usan `{ "mensaje": "..." }`. Un campo que el DTO no declara responde 400. Sin verificador real, cualquier ruta con `IdentidadGuard` responde 401 `{ "mensaje": "La sesión no es válida." }`. Si PostgreSQL no está listo, las rutas de datos responden 503 `{ "mensaje": "La base de datos no está disponible." }`. Un fallo no previsto responde 500 `{ "mensaje": "Ocurrió un error inesperado." }`.

Los `POST` de NestJS responden **201** cuando tienen éxito. `DELETE /cuestionarios/:id` responde **204** sin cuerpo.

### Salud

| Método | Ruta | Autenticación | Permiso | Éxito |
|---|---|---|---|---|
| `GET` | `/salud` | No | Cualquiera | 200 |

```json
{ "estado": "ok", "baseDatos": "disponible" }
```

`baseDatos` también puede ser `no-configurada` o `no-disponible`. El cuerpo no contiene host, usuario ni contraseña.

### Cuestionarios

| Método | Ruta | Autenticación | Permiso | Éxito |
|---|---|---|---|---|
| `GET` | `/cuestionarios` | No | Catálogo público, sin eliminados y sin soluciones | 200 |
| `GET` | `/cuestionarios/:id` | Opcional | Público sin soluciones. Con identidad verificada del propietario, incluye soluciones | 200 |
| `GET` | `/mis-cuestionarios` | Bearer | Solo los cuestionarios de esa identidad, con soluciones | 200 |
| `POST` | `/cuestionarios` | Bearer | Cualquier identidad verificada. `autorId` sale del token, no del cuerpo | 201 |
| `PUT` | `/cuestionarios/:id` | Bearer | Solo el propietario | 200 |
| `DELETE` | `/cuestionarios/:id` | Bearer | Solo el propietario. Borrado lógico | 204 |

Consulta pública: `GET /cuestionarios?texto=&categoria=&dificultad=&autor=`. `dificultad` es `facil`, `medio` o `dificil`. `autor` filtra por el nombre visible, no por el id.

Cuerpo de alta y edición:

```json
{
  "titulo": "Funciones puras",
  "descripcion": "Repaso breve de funciones sin efectos externos.",
  "categoria": "Programación",
  "etiquetas": ["funciones"],
  "dificultad": "facil",
  "imagenUrl": "https://ejemplo.supabase.co/storage/v1/object/public/profelink-imagenes/portada.png",
  "preguntas": [
    {
      "id": "p1",
      "enunciado": "Una función pura no tiene efectos externos.",
      "respuestaCorrecta": true,
      "orden": 1,
      "segundos": 20,
      "opciones": [
        { "id": "p1a", "texto": "Verdadero", "correcta": true },
        { "id": "p1b", "texto": "Falso", "correcta": false }
      ]
    }
  ]
}
```

`id` de cuestionario, pregunta y opción es opcional. Si viene y cumple `^[A-Za-z0-9:_-]{1,80}$`, se conserva; si no, el servidor genera un UUID. Un id ya usado en otro registro responde 409 `{ "mensaje": "Ya existe un registro con ese identificador." }`.

Respuesta pública de una pregunta, sin soluciones:

```json
{
  "id": "p1",
  "enunciado": "Una función pura no tiene efectos externos.",
  "orden": 1,
  "opciones": [
    { "id": "p1a", "texto": "Verdadero" },
    { "id": "p1b", "texto": "Falso" }
  ]
}
```

El propietario, en `GET /mis-cuestionarios`, en el detalle con su identidad y al crear o editar, recibe además `respuestaCorrecta` y `correcta` en cada opción. El cuestionario completo incluye `autorId`, `autorNombre`, `esDemostracion`, `actualizadoEn` y, si hay archivo, `imagenUrl`.

El editor del frontend todavía pide el detalle sin `Authorization`, así que no verá las soluciones hasta que esa petición lleve el token. Hoy, además, el verificador activo no acepta ningún token: aunque el encabezado venga, el detalle sale sin soluciones y las rutas con guarda responden 401.

Errores propios de esta familia:

| Código | Cuándo |
|---|---|
| 400 | Validación de título, descripción, categoría, etiquetas, dificultad o preguntas. El texto es el de la regla incumplida, o `Los datos del cuestionario no son válidos.` |
| 403 | Editar o borrar un cuestionario de otra persona. `Solo quien creó el cuestionario puede editarlo.` o `... eliminarlo.` |
| 404 | `No se encontró el cuestionario.` Incluye uno ya eliminado. |
| 409 | Id repetido; pregunta u opción ya respondida; pregunta u opción de una instantánea activa. Ver [Reglas de negocio](#reglas-de-negocio). |
| 409 | `No se puede modificar el cuestionario porque ya forma parte de una partida.` cuando PostgreSQL rechaza el cambio por clave foránea (`P2003` o `P2025`). |

### Imágenes

| Método | Ruta | Autenticación | Permiso | Éxito |
|---|---|---|---|---|
| `POST` | `/imagenes` | Bearer | Cualquier identidad verificada | 201 `{ "url": "..." }` |

`multipart/form-data` con un solo campo `archivo`. JPEG, PNG, WebP, GIF y SVG. El tope es **5 MB**. Se comprueba la firma del archivo, no solo la extensión. Un SVG válido se convierte en memoria a PNG y solo ese PNG se sube; el SVG no se guarda. La URL pública puede enviarse después como `imagenUrl` de un cuestionario o de una pregunta: el CRUD reutiliza el metadato si esa URL ya existe.

| Código | Mensaje orientativo |
|---|---|
| 400 | `Selecciona una imagen.`, `El archivo de imagen está vacío.` o `Usa una imagen JPG, PNG, WEBP, GIF o SVG.` |
| 400 | SVG rechazado por la revisión de contenido o por un fallo de conversión. |
| 413 | `La imagen supera 5 MB.` |
| 503 | `El almacenamiento de imágenes no está disponible.` Faltan `SUPABASE_URL`, `SUPABASE_SECRET_KEY` o `SUPABASE_STORAGE_BUCKET`. |

Las pruebas sustituyen el almacenamiento y no escriben objetos en el bucket.

### Sesiones de juego

El código de sala tiene seis caracteres de `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (sin `0`, `1`, `I` ni `O`). Las rutas normalizan el código con `trim` y mayúsculas.

| Método | Ruta | Autenticación | Permiso | Cuerpo | Éxito |
|---|---|---|---|---|---|
| `POST` | `/sesiones-juego` | Bearer | Identidad verificada. El cuestionario debe existir, no estar eliminado y ser jugable | `{ "cuestionarioId": "..." }` | 201, sala en `esperando` |
| `GET` | `/sesiones-juego/:codigo` | Bearer | Cualquiera que conozca el código, salvo una partida `finalizada` | — | 200, estado vigente. No crea participantes |
| `POST` | `/sesiones-juego/:codigo/participantes` | Bearer | Identidad verificada. El perfil sale del token | `{}` | 201, entra o reconecta |
| `POST` | `/sesiones-juego/:codigo/iniciar` | Bearer | Solo el anfitrión, desde `esperando`, con al menos un participante | `{}` | 201, estado `pregunta` |
| `POST` | `/sesiones-juego/:codigo/respuestas` | Bearer | Participante de la sala, pregunta abierta y dentro del plazo | `{ "opcionId": "p1a" }` o `{ "valor": true }` | 201, sala actualizada |
| `POST` | `/sesiones-juego/:codigo/cerrar` | Bearer | Solo el anfitrión, estado `pregunta` | `{}` | 201, estado `cerrada` |
| `POST` | `/sesiones-juego/:codigo/avanzar` | Bearer | Solo el anfitrión, estado `cerrada` | `{}` | 201, siguiente pregunta o `finalizada` |

El anfitrión puede responder solo si también se unió como participante. El cuerpo de una respuesta no acepta `puntos` ni `preguntaId`: la pregunta es siempre la abierta. Un campo extra responde 400.

Sala al crearla, todavía sin contenido de las preguntas. El arreglo conserva una casilla vacía por pregunta para que el frontend pueda decir «Pregunta 1 de N»:

```json
{
  "codigo": "AB23CD",
  "cuestionarioId": "demo-funcional",
  "titulo": "Funciones puras",
  "anfitrionId": "perfil-ana",
  "anfitrionNombre": "Ana",
  "estado": "esperando",
  "preguntaActual": 0,
  "segundos": 20,
  "cierraEn": null,
  "canal": "remoto",
  "participantes": [],
  "preguntas": [
    { "id": "p1", "enunciado": "", "orden": 1, "opciones": [] }
  ]
}
```

Pregunta abierta. Hay enunciado y opciones, sin `correcta` ni `respuestaCorrecta`. `cierraEn` es ISO-8601 del servidor.

```json
{
  "estado": "pregunta",
  "preguntaActual": 0,
  "segundos": 20,
  "cierraEn": "2026-10-21T05:00:20.000Z",
  "participantes": [
    {
      "id": "participante-1",
      "perfilId": "perfil-luis",
      "nombre": "Luis",
      "conectado": true,
      "puntaje": 0,
      "aciertos": 0,
      "respuestas": [
        {
          "preguntaId": "p1",
          "valor": null,
          "opcionId": "p1a",
          "aceptada": true,
          "tardia": false,
          "puntos": 0
        }
      ]
    }
  ]
}
```

Ese `opcionId` solo viaja a quien lo envió. Quien consulta la sala y no es ese participante ve la misma respuesta sin `opcionId` y con `valor: null`, pero con `aceptada: true`. Así se puede mostrar «Respondió» sin revelar la elección. Al cerrar o finalizar, las selecciones de las preguntas ya jugadas vuelven a incluirse.

Errores propios:

| Código | Mensaje |
|---|---|
| 400 | `Elige un cuestionario.` |
| 400 | `El cuestionario no tiene preguntas.` o `El cuestionario no está listo para jugar.` |
| 400 | `Elige una respuesta.` o `Esa opción no pertenece a la pregunta.` |
| 403 | `Solo el anfitrión puede iniciar la partida.` |
| 403 | `No estás unido a esta sala.` |
| 403 | `Solo el anfitrión puede cerrar la pregunta.` |
| 403 | `Solo el anfitrión puede avanzar la partida.` |
| 403 | `No puedes ver los resultados de esta partida.` También en `GET` de una sala `finalizada` ajena. |
| 404 | `No se encontró el cuestionario.` o `No hay una sala con ese código.` |
| 409 | `La partida ya fue iniciada.` Una persona nueva no entra después de `esperando`. |
| 409 | `Esta partida ya finalizó.` o `La partida ya finalizó.` |
| 409 | `Todavía no hay participantes.` |
| 409 | `El cuestionario ya no está disponible.` |
| 409 | `La pregunta ya está cerrada. La respuesta no se acepta.` |
| 409 | `El tiempo de respuesta terminó.` |
| 409 | `Ya enviaste una respuesta para esta pregunta.` |
| 409 | `No hay una pregunta abierta.` o `Cierra la pregunta antes de avanzar.` |
| 409 | `No se pudo crear la sala. Intenta de nuevo.` Tras ocho choques del código. |

### Resultados

| Método | Ruta | Autenticación | Permiso | Éxito |
|---|---|---|---|---|
| `GET` | `/resultados` | Bearer | Sesiones `finalizada` en las que la identidad es anfitrión o participante. Si es ambos, sale una sola vez | 200, arreglo. Vacío si no hay |
| `GET` | `/resultados/:codigo` | Bearer | Anfitrión o participante de esa partida terminada | 200 |

El historial ordena por `finalizadaEn` descendente. La clasificación ordena por `puntaje` descendente, luego `aciertos` descendente y, al empatar, `nombre` con `localeCompare(..., 'es')`.

```json
{
  "codigo": "AB23CD",
  "titulo": "Funciones puras",
  "finalizadaEn": "2026-10-21T05:10:00.000Z",
  "anfitrionId": "perfil-ana",
  "participantes": [
    {
      "id": "participante-1",
      "perfilId": "perfil-luis",
      "nombre": "Luis",
      "conectado": true,
      "puntaje": 1,
      "aciertos": 1,
      "respuestas": []
    }
  ]
}
```

| Código | Mensaje |
|---|---|
| 403 | `No puedes ver los resultados de esta partida.` |
| 404 | `Esta sesión todavía no tiene resultados guardados.` Si no existe o todavía no está `finalizada`. |

## Modelo de datos

Ocho tablas en `public`. Los identificadores son texto: UUID nuevos o ids estables de la demostración (`demo-funcional`, `f1`). Las fechas son `timestamptz`.

```text
Imagen 1───* Cuestionario
Imagen 1───* Pregunta
Cuestionario 1───* Pregunta 1───* Opcion
Cuestionario 1───* SesionJuego 1───* Participante 1───* Respuesta
Participante 1───1 Resultado
SesionJuego 1───* Resultado
Pregunta 1───* Respuesta
Opcion 0..1───* Respuesta
```

| Tabla | Qué guarda | Integridad relevante |
|---|---|---|
| `Imagen` | Metadatos: nombre, URL, MIME y tamaño. Sin binario. | `Cuestionario.imagenId` y `Pregunta.imagenId` usan `ON DELETE SET NULL`. |
| `Cuestionario` | Título, descripción, categoría, etiquetas, dificultad, autor externo y `eliminadoEn`. | Índice por autor, categoría y borrado. Una sesión no puede quedar huérfana: `ON DELETE RESTRICT`. |
| `Pregunta` | Enunciado (máx. 280), orden, `respuestaCorrecta`, segundos opcionales e imagen. | Única por `(cuestionarioId, orden)`. Borrar el cuestionario en cascada está restringido. |
| `Opcion` | Texto (máx. 280), orden y `correcta`. | Única por `(preguntaId, orden)`. Índice único parcial `Opcion_una_correcta_por_pregunta`: una sola opción correcta por pregunta. |
| `SesionJuego` | Código de 6 caracteres, título copiado, anfitrión, estado, pregunta actual, segundos, `cierraEn` e instantánea JSON. | `codigo` único y `CHECK (char_length(codigo) = 6)`. Estados: `esperando`, `pregunta`, `cerrada`, `finalizada`. |
| `Participante` | Perfil externo, nombre, conexión, `puntaje` y `aciertos`. | Único `(sesionId, perfilId)`. |
| `Respuesta` | Pregunta, opción o valor booleano, `aceptada`, `tardia` y `puntos`. | Única `(participanteId, preguntaId)`. `CHECK (opcionId IS NOT NULL OR valor IS NOT NULL)`. Claves a pregunta y opción con `ON DELETE RESTRICT`. |
| `Resultado` | `puntuacion`, `aciertos`, `incorrectas` y `finalizadoEn`. | Único `(sesionId, participanteId)` y `participanteId` único. |

`preguntasInstantanea` se escribe solo al iniciar, versión 1:

```json
{
  "version": 1,
  "preguntas": [
    {
      "id": "p1",
      "enunciado": "Una función pura no tiene efectos externos.",
      "orden": 1,
      "respuestaCorrecta": true,
      "segundos": 20,
      "opciones": [
        { "id": "p1a", "texto": "Verdadero", "orden": 1, "correcta": true },
        { "id": "p1b", "texto": "Falso", "orden": 2, "correcta": false }
      ]
    }
  ]
}
```

Esa copia es la fuente de verdad del enunciado, de las opciones y de la solución de esa partida. No se devuelve cruda. Las respuestas siguen apuntando a las filas originales de `Pregunta` y `Opcion`, así que esos identificadores tienen que seguir existiendo para poder insertar una respuesta.

La migración también activa RLS y revoca el acceso de los roles `anon` y `authenticated`. La Data API de Supabase no entrega estas tablas con la clave anónima. El rol con el que se conecta NestJS es el dueño de las tablas y sigue pudiendo consultarlas. No pongas la clave `service_role` en el frontend: ese rol ignora RLS.

El índice parcial, los `CHECK` y RLS no caben en `schema.prisma`. Una migración futura generada con `migrate dev` puede proponer borrarlas. Hay que revisar el SQL y quitar esos `DROP` antes de aplicarla.

## Reglas de negocio

### Cuestionarios

Crear y editar exigen al menos una pregunta. El título va de 3 a 80 caracteres, la descripción de 10 a 400, la categoría hasta 80 y como máximo 20 etiquetas de 40. Cada pregunta tiene un orden entero único, un enunciado de 5 a 280 caracteres, entre 2 y 6 opciones y exactamente una correcta. `segundos`, si se envía, va de 5 a 120. Si la pregunta llega sin opciones, el servidor agrega Verdadero y Falso a partir de `respuestaCorrecta`, con ids `{id}:verdadero` y `{id}:falso`.

`autorId` y `autorNombre` no se aceptan en el cuerpo. Salen de la identidad verificada. Las consultas públicas omiten `correcta` y `respuestaCorrecta`.

Editar un cuestionario con partidas:

- Se puede cambiar título, descripción, enunciado, texto de una opción que conserva su id, `correcta`, segundos, imagen, orden y se pueden agregar preguntas.
- No se puede quitar ni sustituir el id de una pregunta o de una opción que aparezca en la instantánea de una sesión `pregunta` o `cerrada`, aunque todavía nadie haya respondido. El mensaje es `No se puede quitar una pregunta o una opción de una partida que ya comenzó.`
- Si la pregunta ya tiene filas en `Respuesta`, tampoco se cambia su contenido ni se borra. El mensaje es `No se puede modificar una pregunta que ya tiene respuestas en una partida.`
- Una sesión `esperando` todavía no tiene instantánea: el inicio volverá a leer el cuestionario vivo, así que esos ids no quedan fijados.
- Una sesión `finalizada` no bloquea por sí sola la estructura. Si ya hay respuestas, sigue valiendo el bloqueo de contenido.

El borrado es lógico: pone `eliminadoEn` y deja preguntas y opciones. Por eso una partida ya iniciada puede seguir registrando respuestas. Un cuestionario eliminado desaparece del catálogo, no se puede volver a abrir en una sala nueva y responder 404 al pedirlo. No se borra en cascada.

### Imágenes

El bucket previsto es público, de 5 MB, para JPEG, PNG, WebP y GIF. El SVG entra solo como formato de carga y sale como PNG. La URL resultante es la que el cuestionario referencia.

### Salas y estados

Cualquier identidad verificada puede ser anfitrión de un cuestionario jugable. El código choca contra el índice único y se reintenta hasta ocho veces.

Estados: `esperando` → `pregunta` → `cerrada` → `pregunta` de la siguiente, o `finalizada` si era la última.

- Una persona nueva solo entra en `esperando`.
- Quien ya participa puede volver a entrar en `pregunta` o `cerrada`. Se actualizan nombre y `conectado`, y se conserva el mismo registro.
- `finalizada` rechaza la entrada.
- Iniciar exige ser anfitrión y tener al menos un participante. Copia la instantánea, pone `iniciadaEn` y calcula `cierraEn` con el reloj del servidor. Los segundos son los de la pregunta si están entre 5 y 120; si no, 20.
- Un segundo inicio simultáneo no pasa de `esperando`: la actualización condicionada responde 409 y no duplica la copia.

Unirse, iniciar, responder, cerrar y avanzar bloquean la fila `SesionJuego` con `SELECT id FROM "SesionJuego" WHERE codigo = … FOR UPDATE` y mantienen el mismo orden de bloqueo. El índice único `(participanteId, preguntaId)` impide dos respuestas de la misma pregunta.

### Respuestas, tiempo y puntuación

La selección se aplica a la pregunta abierta de la instantánea. Si viene `opcionId`, tiene que pertenecer a esa pregunta. Si no, se usa `valor` booleano y se compara con `respuestaCorrecta` de la instantánea. No se actualiza el cuestionario original.

El plazo lo decide `new Date()` del proceso después de bloquear la fila, no el reloj del navegador ni `now()` de PostgreSQL. El milisegundo exacto de `cierraEn` todavía es válido. Después responde 409 y no se guarda la respuesta. Una respuesta tardía no suma puntos porque no existe.

Al cerrar, cada respuesta aceptada y correcta recibe **1 punto**. Una respuesta incorrecta queda en **0**. Quien no respondió no tiene fila y también queda en **0**. No hay bonus por velocidad, rachas ni XP. `Participante.puntaje` y `Participante.aciertos` se recalculan como la suma absoluta de sus `Respuesta.puntos`, de modo que repetir un cierre que no llegó a confirmarse no duplica el puntaje. Un segundo cierre, con la pregunta ya `cerrada`, responde 409.

Avanzar solo desde `cerrada`. Si quedan preguntas, incrementa `preguntaActual`, toma los segundos de la nueva pregunta y renueva `cierraEn`. Dos avances a la vez no pueden saltarse una pregunta: la actualización exige el estado `cerrada` y el mismo `preguntaActual`. En la última pregunta, el mismo `POST .../avanzar` finaliza: estado `finalizada`, `finalizadaEn`, `cierraEn` nulo y un `Resultado` por participante, también si está desconectado. `puntuacion` copia `puntaje`, `aciertos` copia los aciertos e `incorrectas` es el máximo entre 0 y las preguntas jugadas menos los aciertos. Si falla el alta de resultados, la transacción se revierte y se puede reintentar. Un segundo finalizado no duplica filas.

El título del historial es la copia de la sesión. Borrar lógicamente el cuestionario no borra esa historia.

Mientras la sala está `cerrada` y aún no `finalizada`, una identidad verificada que conozca el código puede ver la solución de las preguntas ya cerradas. Las posteriores siguen vacías. Una sala `finalizada` solo la leen el anfitrión y sus participantes.

## Contrato de autenticación — Persona 3

No hay registro, login ni tabla de usuarios. `autorId`, `anfitrionId` y `perfilId` guardan el id externo. El tipo está en `src/autenticacion/identidad-externa.ts`:

```ts
interface IdentidadExterna {
  id: string
  nombre: string
}
```

`VerificadorIdentidad.verificar(token)` debe comprobar el Bearer y devolver esa identidad, o `null` si la firma, el emisor o la audiencia no sirven. `IdentidadGuard` lee `Authorization: Bearer …`, llama al verificador y deja la identidad en la solicitud. Sin token o con `null`, responde 401 `{ "mensaje": "La sesión no es válida." }`.

La implementación registrada hoy es `VerificadorIdentidadPendiente`: ignora el token y resuelve `null`. **No hay integración JWT.** Mientras siga así, crear, editar, borrar, listar los propios cuestionarios, subir imágenes y todas las rutas de salas y resultados responden 401. Las pruebas sustituyen el proveedor. `perfil-demo` no abre ninguna ruta.

`GET /cuestionarios` y `GET /salud` son públicas. `GET /cuestionarios/:id` también lo es; el encabezado solo cambia la visibilidad de las soluciones cuando el verificador reconoce al propietario.

Los datos de demostración pertenecen a `perfil-demo` / `Docente de prueba`, el mismo id ficticio del frontend. No es una cuenta real. Cuando exista autenticación, «Mis cuestionarios» solo los verá un perfil con ese id.

Rutas que esperan Bearer y el permiso que deberá respetar el verificador:

| Rutas | Permiso |
|---|---|
| `GET /mis-cuestionarios`, `POST /cuestionarios`, `POST /imagenes` | Identidad verificada. |
| `PUT` y `DELETE /cuestionarios/:id` | La misma identidad que `autorId`. |
| `POST /sesiones-juego` y `GET /sesiones-juego/:codigo` | Identidad verificada. En `finalizada`, anfitrión o participante. |
| `POST .../participantes` y `POST .../respuestas` | Identidad verificada. Responder exige estar unido. |
| `POST .../iniciar`, `.../cerrar` y `.../avanzar` | `anfitrionId` de esa sala. |
| `GET /resultados` y `GET /resultados/:codigo` | Anfitrión o participante de la partida terminada. |

No corresponde a esta API implementar el verificador.

## Contrato de eventos — Persona 3

`AvisoSesiones.confirmar` se llama **después** de confirmar la transacción. No abre WebSocket ni publica en otro proceso. La implementación actual, `AvisoSesionesLocal`, acumula avisos en un arreglo de memoria. Ese arreglo se pierde al reiniciar el proceso y no es una entrega fiable. Un outbox transaccional queda pendiente y no está implementado.

```ts
interface AvisoConfirmado {
  tipo: CambioSesion
  codigo: string
  ocurridoEn: string
}
```

| `tipo` | Cuándo |
|---|---|
| `sala-creada` | La sala quedó persistida. |
| `participante-incorporado` | Alta nueva o reconexión. |
| `partida-iniciada` | Pasó de `esperando` a `pregunta`. |
| `respuesta-aceptada` | La respuesta quedó guardada. |
| `pregunta-cerrada` | El anfitrión cerró la pregunta y se calcularon los puntos. |
| `pregunta-cambiada` | Avanzó a otra pregunta. |
| `sesion-finalizada` | Avanzar en la última pregunta guardó los resultados. |

El aviso no incluye la sala ni las selecciones. Quien lo reciba debe volver a pedir `GET /sesiones-juego/:codigo` con la identidad del espectador, para respetar la privacidad de la pregunta abierta.

`VITE_CANAL_URL` del frontend apunta a un WebSocket (`ws://localhost:5002/salas` en el ejemplo). Esta API no expone ese canal. Conectarlo es trabajo de la Persona 3.

## Integración con frontend — Persona 1

El cliente HTTP ya está esbozado en `frontend/src/servicios/actividades.ts` y `sala.ts`. La base es `VITE_ACTIVIDADES_URL` (`http://localhost:5002` en `.env.example`). Las demás variables de ese ejemplo son `VITE_AUTH_URL`, `VITE_CANAL_URL` y `VITE_USAR_SIMULACION`.

Con `VITE_USAR_SIMULACION` distinto de `false` —y ese es el valor de ejemplo, `true`— la interfaz no llama a esta API. Para usar el módulo hay que ponerla en `false` y enviar `Authorization: Bearer <token>` en todas las rutas protegidas de las tablas anteriores. El catálogo `GET /cuestionarios` no lleva token y nunca incluye soluciones. El detalle del propietario sí necesita el Bearer cuando el verificador exista.

La sala se recupera con `GET /sesiones-juego/:codigo`. No hace falta otro recurso de estado. El JSON usa `canal: "remoto"`, `preguntas[preguntaActual]`, casillas futuras vacías y `cierraEn`. El anfitrión puede pintar «Respondió» con `respuesta.aceptada`. El jugador resalta su opción con su propio `respuesta.opcionId`. Después del cierre, `puntos` de esa respuesta es 0 o 1.

Diferencias entre la simulación local y esta API:

| Tema | Simulación | API |
|---|---|---|
| Canal | `simulado`, con `BroadcastChannel` | `remoto`. No hay WebSocket aquí. |
| Soluciones | Se copian al crear la sala | Se copian al iniciar, dentro de la instantánea, y no salen en la pregunta abierta ni en las futuras. |
| Entrada tardía | Puede incorporar gente nueva ya iniciada la partida | Solo reconecta a quien ya estaba. Una alta nueva después de `esperando` es 409. |
| Selección ajena | Puede incluir el `opcionId` de todos | Con la pregunta abierta, cada quien ve solo la suya. |
| Resultados | Quien conoce el código puede leerlos | Solo anfitrión o participante. Si no, 403. |
| Imágenes | El cliente acepta hasta 15 MB y sigue ofreciendo SVG | El límite real es 5 MB. El SVG se acepta y se guarda como PNG. Conviene alinear el cliente a 5 MB. |

El cliente HTTP traduce 403, 404 y 409 a tipos propios, pero el texto visible sigue siendo `mensaje`. Un 400 llega como error de conexión con ese mismo texto.

## Integración con motor de juego — Persona 4

La puntuación oficial es la de esta API: **1 punto por acierto y 0 por error o por no responder.** Se decide al cerrar, con la instantánea, y queda en `Respuesta.puntos`, `Participante.puntaje` y `Participante.aciertos`. El resultado final repite esos números y agrega `incorrectas`.

Para pintar la clasificación, `GET /resultados/:codigo` ya entrega los participantes ordenados por puntaje, aciertos y nombre. El historial es `GET /resultados`. No hace falta volver a sumar en el cliente; si se reordena, el mismo criterio está en `ordenarClasificacion`.

Las animaciones, la gamificación visual, la experiencia, las insignias y cualquier bonus que no sea ese punto quedan fuera de esta API.

## Integración e infraestructura — Persona 5

Dependencias externas de este módulo: PostgreSQL de Supabase por `DIRECT_URL`, y Supabase Storage por `SUPABASE_URL`, `SUPABASE_SECRET_KEY` y `SUPABASE_STORAGE_BUCKET`. El resto de las variables está en [Configuración](#configuración). `@nestjs/config` está fijado en `^4.0.4` porque una versión ESM posterior rompe el arranque.

Arranque local, con `.env` ya completo:

```bash
npm install
npm run db:estado
npm run db:deploy
npm run db:seed
npm run start:dev
```

`db:deploy` solo aplica `prisma/migrations/20261021013000_inicial`. Esa migración crea objetos de ProfeLink y no borra tablas ajenas. La segunda ejecución de `db:seed` no duplica filas: los identificadores de demostración son fijos y el script hace upsert.

No uses `prisma migrate dev` ni `prisma migrate reset` contra Supabase. `migrate dev` intenta `CREATE DATABASE` para una base sombra y el pooler no lo permite. Si Prisma ofrece resetear la base, hay que rechazarlo. Tampoco uses `db push`.

Docker, el despliegue, CI/CD, el monitoreo y las pruebas globales de carga no forman parte de este módulo.

## Pruebas

| Comando | Qué ejecuta |
|---|---|
| `npm test` | Unitarias en `src/**/*.spec.ts`: cuestionarios, sesiones, partidas, imágenes, conversión SVG y salud. Usan dobles en memoria. |
| `npm run test:e2e` | HTTP con Supertest. CRUD, imágenes, sesiones, partidas y salud sustituyen Prisma y el verificador. El catálogo público lee el seed real si `DIRECT_URL` está configurada. |
| `npm run lint` | ESLint. |
| `npm run build` | Compilación NestJS. |
| `npm run db:estado` | Conectividad de lectura contra la base configurada. |

La última pasada de esta etapa dejó en verde las unitarias, las e2e, ESLint y `nest build`. El catálogo público comprobó en Supabase, en solo lectura, que `demo-funcional` existe y que el JSON no trae `correcta` ni `respuestaCorrecta`. Las escrituras de cuestionarios, imágenes, salas, respuestas y resultados de esas pruebas no tocaron la base compartida: el almacenamiento de imágenes también está sustituido.

No se ejecutó una partida completa de extremo a extremo contra servicios reales. Tampoco se ejecutó `SELECT … FOR UPDATE` sobre PostgreSQL real. Las carreras cubiertas por el doble en memoria son dos respuestas simultáneas del mismo participante, una respuesta coincidiendo con el cierre, dos avances simultáneos, un fallo al guardar resultados y el reintento sin duplicar puntos. El doble cierre simultáneo queda cubierto ahí por la actualización condicionada al estado. Eso no sustituye una prueba con conexiones y transacciones reales.

Para hacerla falta una base distinta de la compartida de ProfeLink, un rol dueño con permiso de crear el esquema y de `SELECT … FOR UPDATE`, aplicar solo la migración existente con `npm run db:deploy`, y una variable aparte que no reemplace `DIRECT_URL`. Crear esa base o cambiar `.env` requiere autorización. No se ha creado.

## Estado de la etapa 2

**Estado: implementación de la API de actividades finalizada, pendiente de integración y validaciones externas.**

| Fase | Qué quedó implementado |
|---|---|
| 1 | NestJS, Prisma 7, esquema, migración inicial, seed, salud y conexión por `DIRECT_URL`. |
| 2 | CRUD de cuestionarios, preguntas y opciones, con borrado lógico y ocultación de soluciones. |
| 3 | Subida a Storage y conversión de SVG a PNG. |
| 4 | Salas, incorporación, reconexión, inicio e instantánea. |
| 5 | Respuestas, cierre, un punto por acierto, avance, finalización, historial y clasificación. La revisión posterior protege los ids de una instantánea activa y oculta la selección ajena mientras la pregunta está abierta. |

Sigue fuera de este módulo, a cargo de otros integrantes:

| Persona | Pendiente |
|---|---|
| 1. Frontend | Dejar la simulación, enviar Bearer también en el detalle del propietario, alinear el tope de 15 MB con los 5 MB de la API y tratar como opcional el `opcionId` ajeno durante la pregunta abierta. |
| 3. Autenticación y canal | Implementar `VerificadorIdentidad` con JWT. Sustituir la lista en memoria de `AvisoSesiones` por una entrega fiable y el WebSocket de `VITE_CANAL_URL`. |
| 4. Motor de juego | Animaciones, gamificación visual, XP, insignias y cualquier puntuación distinta de 1 o 0. |
| 5. Infraestructura | Docker, despliegue, CI/CD, monitoreo, pruebas de carga y, si se autoriza, la base aislada para concurrencia real. |

Hasta que el verificador exista, las operaciones protegidas responden 401. Hasta que exista el canal, el cliente solo ve cambios al volver a consultar la sala.
