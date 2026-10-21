# API de actividades

Backend de cuestionarios, sesiones y resultados de ProfeLink. La fase 1 dejó NestJS, Prisma y el modelo en PostgreSQL. La fase 2 expone el CRUD de cuestionarios, preguntas y opciones. Las partidas, las imágenes binarias y la autenticación real siguen fuera de esta API.

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

Un cuestionario con sesiones no se puede borrar en cascada (`ON DELETE RESTRICT`) y tiene `eliminadoEn` para un borrado lógico. Al iniciar una partida, la fase correspondiente debe copiar las preguntas en `preguntasInstantanea`. Así una edición posterior no cambia lo que ya se jugó.
