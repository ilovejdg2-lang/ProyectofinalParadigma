# Modelo de datos

Hay dos esquemas PostgreSQL en la misma instancia de producción y, en la instalación local, en la misma base. No existe una clave foránea entre ellos. `actividades` no lee `passwordHash`, refresh tokens ni políticas de dominio.

La topología de procesos está en [entrega-persona-5.md](../entrega-persona-5.md).

## Esquema `auth_service`

Definido en `autenticacion/prisma/schema.prisma`. Lo usa solo `auth-service`.

```mermaid
erDiagram
  Institution ||--o{ User : agrupa
  Institution ||--o{ EmailDomainPolicy : publica
  User ||--o{ RefreshToken : rota
  User ||--o{ EmailVerificationToken : verifica

  Institution {
    string id PK
    string name
    boolean isActive
    datetime createdAt
  }
  EmailDomainPolicy {
    string id PK
    string domain UK
    string institutionId FK
    string defaultRole
    boolean autoGrantRole
    boolean requiresVerification
  }
  User {
    string id PK
    string email UK
    string passwordHash
    string displayName
    string role
    boolean emailVerified
    string institutionId FK
    string status
  }
  RefreshToken {
    string id PK
    string userId FK
    string tokenHash UK
    string familyId
    datetime expiresAt
    datetime revokedAt
    string replacedBy
  }
  EmailVerificationToken {
    string id PK
    string userId FK
    string tokenHash UK
    datetime expiresAt
    datetime usedAt
  }
```

`RefreshToken.tokenHash` guarda el hash del refresh token, no el token en claro. La clave privada RSA no está en estas tablas: vive en el volumen `profelink-auth-keys`.

## Esquema `public` de actividades

Definido en `actividades/prisma/schema.prisma`. `Imagen` guarda metadata. El binario de una imagen subida por la aplicación va a Supabase Storage. Las portadas sembradas apuntan a archivos estáticos del frontend, por ejemplo `/portadas/funcional.svg`.

```mermaid
erDiagram
  Imagen ||--o{ Cuestionario : porta
  Imagen ||--o{ Pregunta : ilustra
  Cuestionario ||--o{ Pregunta : contiene
  Pregunta ||--o{ Opcion : ofrece
  Cuestionario ||--o{ SesionJuego : se_juega
  SesionJuego ||--o{ Participante : reune
  SesionJuego ||--o{ Respuesta : recibe
  SesionJuego ||--o{ Resultado : cierra
  Participante ||--o{ Respuesta : envia
  Participante ||--o| Resultado : obtiene
  Pregunta ||--o{ Respuesta : evalua
  Opcion ||--o{ Respuesta : elige

  Imagen {
    string id PK
    string nombreArchivo
    string url
    string tipoMime
    int tamanoBytes
  }
  Cuestionario {
    string id PK
    string autorId
    string autorNombre
    string titulo
    string dificultad
    boolean esDemostracion
    string imagenId FK
    datetime eliminadoEn
  }
  Pregunta {
    string id PK
    string cuestionarioId FK
    string enunciado
    int orden
    boolean respuestaCorrecta
    int segundos
    string imagenId FK
  }
  Opcion {
    string id PK
    string preguntaId FK
    string texto
    int orden
    boolean correcta
  }
  SesionJuego {
    string id PK
    string codigo UK
    string cuestionarioId FK
    string anfitrionId
    string estado
    int preguntaActual
    json preguntasInstantanea
    string modalidad
    boolean minijuegosActivos
    stringArray tiposMinijuego
    int cadaPreguntas
    int duracionMinijuego
    boolean velocidadActiva
  }
  Participante {
    string id PK
    string sesionId FK
    string perfilId
    string nombre
    boolean conectado
    int puntaje
    int puntosMinijuegos
    int bonificacionVelocidad
  }
  Respuesta {
    string id PK
    string sesionId FK
    string participanteId FK
    string preguntaId FK
    string opcionId FK
    boolean valor
    boolean tardia
    int puntos
  }
  Resultado {
    string id PK
    string sesionId FK
    string participanteId UK
    int puntuacion
    int aciertos
    int incorrectas
  }
```

`SesionJuego.estado` usa el enum `EstadoSesion`: `esperando`, `pregunta`,
`cerrada`, `clasificacion` y `minijuego`. Las opciones de minijuegos se guardan
en `SesionJuego`; sus puntos y la bonificación de velocidad quedan asociados
a cada `Participante`.

## Referencias lógicas, sin clave foránea

| Columna en `public` | Identidad en `auth_service` | Uso |
| --- | --- | --- |
| `Cuestionario.autorId` | `User.id` | Dueño del cuestionario. El banco sembrado usa `perfil-demo`. |
| `SesionJuego.anfitrionId` | `User.id` | Docente que abre la sala. |
| `Participante.perfilId` | `User.id` | Participante autenticado. Hay un único par por sala. |

Esos tres valores viajan dentro del JWT (`sub`) después de que `auth-service` firma el token. `actividades` no puede hacer `JOIN` con `User`.
