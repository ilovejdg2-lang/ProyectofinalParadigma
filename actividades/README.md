# API de actividades

Backend de cuestionarios, sesiones y resultados de ProfeLink. La fase 1 dejó NestJS, Prisma y el modelo en PostgreSQL. La fase 2 expone el CRUD de cuestionarios, preguntas y opciones. La fase 3 sube imágenes al bucket público de Supabase Storage. La fase 4 crea salas, incorpora participantes e inicia la partida. Las respuestas, las puntuaciones y la autenticación real siguen fuera de esta API.

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
- `DATABASE_URL`: transaction pooler, puerto **6543**. Queda guardada para más adelante y **esta fase no la usa**.

Un proceso NestJS de larga duración encaja con el session pooler. El adaptador `@prisma/adapter-pg` no desactiva las prepared statements cuando la URL lleva `pgbouncer=true`, y el transaction pooler de Supabase está pensado para funciones efímeras. Las migraciones tampoco pueden correr por el puerto 6543.

No hace falta crear otro proyecto Supabase ni levantar PostgreSQL en local.

## Comandos

```bash
npm install
npm run prisma:generate
npm run start:dev
```

| Comando | Uso |
|---|---|
| `npm run start:dev` | API en el puerto `PORT` (5002) |
| `npm run build` | Compila TypeScript |
| `npm run prisma:generate` | Genera el cliente de Prisma |
| `npm run prisma:validate` | Valida `schema.prisma` |
| `npm run db:estado` | Comprueba la conexión y lista tablas de `public` |
| `npm run db:deploy` | Aplica las migraciones ya revisadas |
| `npm run db:seed` | Carga los cuestionarios de demostración |

`GET /salud` responde `{ "estado": "ok", "baseDatos": "disponible" | "no-configurada" | "no-disponible" }` y no incluye la cadena de conexión.

## Cuestionarios

| Método | Ruta | Acceso |
|---|---|---|
| `GET` | `/cuestionarios` | Público. Acepta `texto`, `categoria`, `dificultad` y `autor` |
| `GET` | `/cuestionarios/:id` | Público. Con un token verificado del propietario incluye las soluciones |
| `GET` | `/mis-cuestionarios` | Autenticado. Solo los cuestionarios de esa identidad |
| `POST` | `/cuestionarios` | Autenticado. Crea el cuestionario, sus preguntas y sus opciones |
| `PUT` | `/cuestionarios/:id` | Propietario |
| `DELETE` | `/cuestionarios/:id` | Propietario. Borrado lógico (`eliminadoEn`) y responde 204 |

Las consultas públicas omiten `correcta` y `respuestaCorrecta`. El propietario autenticado las recibe en el detalle, en su listado y al crear o editar. El editor del frontend todavía pide el detalle sin `Authorization`, así que no verá las soluciones hasta que esa petición lleve el token.

El cuerpo usa la forma del frontend: título, descripción, categoría, etiquetas, dificultad, imagen opcional, preguntas y opciones. `autorId` no se acepta en el cuerpo; sale de la identidad verificada. Un identificador de pregunta u opción que ya exista en otro cuestionario responde 409. Si la pregunta ya tiene respuestas de una partida, su contenido no se puede cambiar ni borrar.

Los errores usan `{ "mensaje": "..." }`. Sin un verificador de identidad real, las rutas privadas responden 401. Si PostgreSQL no está disponible, el catálogo responde 503.

## Imágenes

`POST /imagenes` recibe el campo `archivo` y exige la misma autenticación que crear un cuestionario. La respuesta es `{ "url": "..." }`, la URL pública del bucket. Esa URL se puede enviar después en `imagenUrl` del cuestionario o de una pregunta; el CRUD reutiliza el metadato y no crea otro registro.

El backend acepta JPEG, PNG, WebP y GIF de hasta 5 MB, y comprueba la firma del archivo. Un SVG válido se convierte en memoria a PNG y solo ese PNG se sube al bucket; el archivo original no se guarda. El frontend todavía permite seleccionar archivos de hasta 15 MB: el límite real de esta API es 5 MB y conviene alinearlo después. Un archivo más grande responde 413. Sin `SUPABASE_URL`, `SUPABASE_SECRET_KEY` y `SUPABASE_STORAGE_BUCKET`, la subida responde 503. Las pruebas sustituyen el almacenamiento y no escriben objetos en el bucket.

## Sesiones de juego

| Método | Ruta | Acceso |
|---|---|---|
| `POST` | `/sesiones-juego` | Autenticado. Cuerpo `{ "cuestionarioId": "..." }` |
| `GET` | `/sesiones-juego/:codigo` | Autenticado. Estado vigente, sin crear participantes |
| `POST` | `/sesiones-juego/:codigo/participantes` | Autenticado. Entra o reconecta al perfil verificado |
| `POST` | `/sesiones-juego/:codigo/iniciar` | Solo el anfitrión, y solo desde `esperando` |

El código tiene seis caracteres del alfabeto `A-Z` y `2-9`, sin `0`, `1`, `I` ni `O`. La unicidad la garantiza el índice de PostgreSQL; si choca, se genera otro hasta ocho veces. Cualquier identidad verificada puede ser anfitrión de un cuestionario que exista, no esté eliminado y tenga preguntas con al menos dos opciones y una sola correcta.

Una persona nueva solo entra mientras la sala está en `esperando`. Quien ya participa puede volver a entrar en `pregunta` o `cerrada` y recupera el mismo registro. `finalizada` rechaza la entrada. El cuerpo no puede fijar `anfitrionId` ni `perfilId`.

Al iniciar se copian preguntas y opciones en `preguntasInstantanea`, se fija `iniciadaEn` y `cierraEn` con el reloj del servidor, y el estado pasa a `pregunta`. Esa copia no se vuelve a leer del cuestionario editable. Mientras la sesión está en `pregunta` o `cerrada`, no se pueden quitar las preguntas ni las opciones de esa copia, aunque todavía no tengan respuestas; el enunciado, el texto, el orden y la solución del cuestionario vivo sí se pueden editar, y la partida sigue usando la instantánea. La respuesta pública no incluye `correcta` ni `respuestaCorrecta` de la pregunta abierta ni de las que todavía no se juegan. En `esperando` tampoco envía enunciados ni opciones. El arreglo `preguntas` conserva el total de casillas, con las futuras vacías. En `cerrada` o `finalizada` solo se revelan las preguntas de índice menor o igual a `preguntaActual`. Mientras la pregunta está abierta, cada participante ve su propia selección y solo `aceptada` de las demás. Una partida `finalizada` solo la pueden leer el anfitrión y sus participantes.

`POST /sesiones-juego/:codigo/respuestas` guarda la selección del participante sobre la pregunta abierta. El cuerpo es `{ "opcionId" }` o `{ "valor": true | false }`. Un punto se concede al cerrar, si la instantánea marca esa opción o ese valor. Una respuesta repetida, tardía o posterior al cierre responde 409. `POST .../cerrar` y `POST .../avanzar` son del anfitrión. Si no quedan preguntas, avanzar finaliza la sesión y guarda un `Resultado` por participante. `GET /resultados` lista las partidas terminadas del anfitrión o del participante, sin duplicarlas. `GET /resultados/:codigo` es la clasificación.

Unirse, iniciar, responder, cerrar y avanzar bloquean la fila de la sesión con `SELECT … FOR UPDATE` hasta cerrar la transacción. El índice único `(participanteId, preguntaId)` impide dos respuestas de la misma pregunta.

`AvisoSesiones` recibe `sala-creada`, `participante-incorporado`, `partida-iniciada`, `respuesta-aceptada`, `pregunta-cerrada`, `pregunta-cambiada` y `sesion-finalizada` solo después de confirmar la transacción. La lista en memoria se pierde al reiniciar el proceso. No abre un canal en vivo. Una entrega fiable entre procesos necesitaría un outbox, que no está implementado.

## Migraciones

La migración inicial está en `prisma/migrations/20261021013000_inicial`. Solo crea objetos de ProfeLink. No borra tablas.

No uses `prisma migrate dev` contra Supabase: ese comando crea una base sombra con `CREATE DATABASE`, y el pooler no lo permite. Si Prisma ofrece resetear la base, recházalo.

Cuando `.env` esté listo:

```bash
npm run db:estado
npm run db:deploy
npm run db:seed
npm run db:seed
```

La segunda ejecución del seed no debe duplicar filas: los identificadores de demostración son fijos y el script hace upsert.

La migración también activa RLS y revoca el acceso de los roles `anon` y `authenticated`. Así la Data API de Supabase no entrega estas tablas con la clave anónima. El rol con el que se conecta NestJS es el dueño de las tablas y sigue pudiendo consultarlas. No pongas la clave `service_role` en el frontend: ese rol ignora RLS.

Esas reglas (índice parcial, checks y RLS) no caben en `schema.prisma`. Una migración futura generada con `migrate dev` puede proponer borrarlas. Hay que revisar el SQL y quitar esos `DROP` antes de aplicarla.

## Autenticación

No hay registro, login ni tabla de usuarios. `autorId`, `anfitrionId` y `perfilId` guardan el id externo que entregará el otro servicio. El tipo está en `src/autenticacion/identidad-externa.ts`.

`VerificadorIdentidad` es el punto de extensión. La implementación activa no acepta tokens, así que crear, editar, borrar y consultar los cuestionarios propios responde 401. Las pruebas sustituyen ese proveedor. `perfil-demo` no abre ninguna ruta.

Los datos de demostración pertenecen a `perfil-demo` / `Docente de prueba`, el mismo id ficticio del frontend. No es una cuenta real. Cuando exista autenticación, "Mis cuestionarios" solo los verá un perfil con ese id.

## Historial de partidas

Un cuestionario con sesiones no se puede borrar en cascada (`ON DELETE RESTRICT`) y tiene `eliminadoEn` para un borrado lógico. Ese borrado no elimina las preguntas, así que una partida ya iniciada puede seguir registrando respuestas. Al iniciar, la sala guarda la copia en `preguntasInstantanea`. Al cerrar cada pregunta se conceden los puntos y, al terminar, queda un resultado por participante.
