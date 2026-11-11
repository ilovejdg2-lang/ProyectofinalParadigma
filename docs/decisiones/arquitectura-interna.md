# Arquitectura del sistema y organización interna

Documento de justificación para la defensa del Proyecto 2. Complementa el [ADR de autenticación y tokens](arquitectura.md) y el [diagrama de despliegue](../entrega-persona-5.md).

## 1. Estilo de arquitectura del sistema

**Decisión:** dos backends desplegables por separado más un frontend web. No es un monolito único ni una malla grande de microservicios.

| Componente | Rol | Puerto local | Despliegue |
| --- | --- | --- | --- |
| `autenticacion/` | Identidad, registro, login, JWT RS256, JWKS | 5001 | API independiente |
| `actividades/` | Cuestionarios, imágenes, salas, reglas de partida, resultados, WebSocket `/canal` | 5002 | API independiente |
| `frontend/` | React: pantallas de acceso, edición, sala y partida | 5173 / 8080 | Estático (Nginx) |
| PostgreSQL (+ Storage en producción) | Datos e imágenes | Compose / Supabase | Infraestructura |

### Cómo se comunica el frontend

1. REST a autenticación: registro, login, refresh, perfil.
2. REST a actividades: cuestionarios, sesiones, respuestas, resultados, imágenes.
3. WebSocket a `actividades` en `/canal`: unión a sala, pregunta activa, cierre, clasificación y estado vigente.

El frontend no importa código fuente de los backends. Solo consume contratos por red (URLs en variables de entorno). Otro proyecto puede hacer lo mismo: el `cliente-adicional/` es la prueba de consumo independiente.

### Límites y contratos

- **Límite de datos:** `auth_service` (usuarios, tokens) y `public` (cuestionarios, salas, resultados) no se cruzan. Actividades no lee la base de usuarios.
- **Límite de confianza:** el access token lleva `aud: profelink-actividades`. Actividades valida firma con JWKS; no comparte la clave privada.
- **Límite de superficie en vivo:** el canal WebSocket autentica al participante y aísla mensajes por código de sala.
- **Despliegue independiente:** cada API tiene su Dockerfile, OpenAPI y health check. Compose las orquesta, pero cada una puede arrancar sola apuntando a su configuración.

### Por qué este estilo (beneficio y costo)

| Beneficio | Costo |
| --- | --- |
| Cumple autonomía del servicio de actividades: ProfeLink u otro cliente consume REST/WS sin tocar la BD ni el código | Hay que desplegar y vigilar dos APIs |
| Autenticación evoluciona (claves, políticas de correo) sin redesplegar el motor de juego | Latencia y configuración de JWKS entre servicios |
| Frontera clara para la rúbrica: permisos, puntaje y tiempo viven en actividades | El frontend debe conocer dos bases URL |

**Alternativas descartadas**

- *Monolito modular único:* más simple de arrancar, pero mezcla identidad y reglas de juego en un solo proceso y una sola unidad de despliegue; el enunciado exige autenticación como API aparte.
- *Muchos microservicios* (cuestionarios, salas, resultados, imágenes por servicio): exceso de red y operación para el tamaño del curso; el aislamiento útil ya se logra con auth + actividades.

---

## 2. Organización interna elegida

### Resumen

| Proyecto | Organización interna | Motivo |
| --- | --- | --- |
| `actividades` | **Vertical Slice** (módulos por capacidad) | Cada capacidad del enunciado (cuestionarios, sala, resultados, imágenes) cambia junta: HTTP, reglas y persistencia |
| `autenticacion` | **N-Capas** (con puerto de persistencia) | Un solo dominio de identidad; conviene separar entrada HTTP, casos de uso, dominio y almacén |
| `frontend` | **Capas de presentación** + adaptadores HTTP/WS | La UI no calcula puntaje ni valida permisos; solo orquesta pantallas y contratos |

No adoptamos Clean Architecture completa (entidades ricas + casos de uso + múltiples adaptadores por puerto) en actividades: el costo de indirección no aportaba frente a NestJS modular por feature. En autenticación sí aparece un puerto (`AlmacenUsuarios`) cercano a hexagonal, sin llegar a Clean pura.

---

## 3. Vertical Slice en `actividades`

Cada carpeta bajo `actividades/src/` es un *slice* que agrupa lo necesario para una capacidad:

```text
actividades/src/
├── sesiones-juego/     Sala, partida en vivo, respuestas, avance
├── cuestionarios/      CRUD de cuestionarios del propietario
├── preguntas/          Validación y persistencia de preguntas
├── resultados/         Clasificación y partidas terminadas
├── imagenes/           Carga, validación y almacenamiento
├── banco-preguntas/    Reutilización de preguntas
├── cursos/             Agrupación académica opcional
├── autenticacion/      Guard JWT / JWKS (adaptador de entrada compartido)
├── prisma/             Acceso a datos compartido
└── comun/              Filtro de errores y pipe de validación
```

Dentro de un slice típico (`sesiones-juego`):

| Pieza | Archivo(s) | Responsabilidad |
| --- | --- | --- |
| Entrada HTTP | `sesiones-juego.controller.ts`, `dto/*` | Crear sala, unirse, iniciar, responder, avanzar |
| Entrada en vivo | `canal-websocket.service.ts`, `aviso-sesiones.ts` | Suscripción a sala y difusión de cambios |
| Casos de uso | `sesiones-juego.service.ts` | Orquesta estado de sesión, permisos de anfitrión y flujo de preguntas |
| Reglas del juego | `calificacion.ts`, `ritmo-partida` (plazos), presentación de sala | Acierto, puntos, plazo vencido, una respuesta por pregunta |
| Acceso a datos | `PrismaService` vía el servicio del slice | Lectura/escritura de sesión, participantes y respuestas |

### Dónde están las reglas del juego

Viven en el slice `sesiones-juego`, no en el frontend:

- `calificacion.ts`: acierto Verdadero/Falso (u opción), puntos por acierto (regla base: 1 / 0), detección de plazo vencido.
- `sesiones-juego.service.ts`: rechaza segunda respuesta del mismo participante (conflicto), rechaza respuestas tardías o fuera de estado, solo el anfitrión inicia/avanza, aislamiento por código de sala.
- El cliente puede mostrar temporizador y botones; **la API decide** si la respuesta suma puntos.

### Flujo de una pregunta (defensa)

```text
Anfitrión POST .../avanzar
        │
        ▼
SesionesJuegoService cierra/abre pregunta y persiste estado
        │
        ▼
AvisoSesiones / CanalWebSocket emite a la sala (enunciado, imagen, plazo)
        │
        ▼
Participante recibe evento en /canal  +  puede POST .../respuestas
        │
        ▼
Service valida identidad, estado, plazo y unicidad → calificacion.ts → guarda puntaje
```

### Beneficio y costo del Vertical Slice

| Beneficio | Costo |
| --- | --- |
| Un cambio de “partida en vivo” toca un solo módulo y sus pruebas | Riesgo de duplicar utilidades si no se extraen a `comun/` o `calificacion.ts` |
| Encaja con NestJS (`Module` + `Controller` + `Service` por feature) | Menos “capas globales” visibles; hay que explicar el mapa de slices |
| Facilita que otro equipo consuma solo REST/WS sin conocer la estructura interna | Shared `PrismaModule` acopla slices a un mismo esquema (aceptable en un solo servicio) |

**Por qué no N-Capas global en actividades:** una capa de “repositorios” y otra de “casos de uso” para todas las features obligaría a cruzar carpetas en cada historia (sala + puntaje + WS). El enunciado cambia por capacidad, no por capa técnica.

**Por qué no Clean completa:** no hay múltiples UIs ni bases distintas que justifiquen puertos/adaptadores en cada slice; el almacenamiento de imágenes sí usa un puerto local (`AlmacenImagenes` → local o Supabase), que es el único punto claramente hexagonal.

---

## 4. N-Capas en `autenticacion`

```text
autenticacion/src/
├── auth/          Entrada HTTP + AuthService (aplicación)
├── dominio/       Política de dominios de correo y tipos
├── almacen/       Puerto AlmacenUsuarios + Prisma / memoria
├── crypto/        Claves RSA y firma JWT
└── prisma/        Cliente de base de datos
```

| Capa | Qué contiene |
| --- | --- |
| Entrada | `AuthController`, DTOs |
| Aplicación | `AuthService` (registrar, login, refresh, logout, perfil) |
| Dominio | `politica-dominio.ts`, roles derivados del correo |
| Infraestructura | `AlmacenUsuarios*`, `KeysService`, `PrismaService` |

### Beneficio y costo

| Beneficio | Costo |
| --- | --- |
| Se puede sustituir el almacén (memoria en pruebas, Prisma en ejecución) sin reescribir el login | Más archivos para un dominio relativamente acotado |
| La política de roles no depende de Express/Nest ni de SQL | Hay que mantener el contrato del puerto `AlmacenUsuarios` |

Esto acerca autenticación a **N-Capas con inversión de dependencia en persistencia**, no a Vertical Slice: casi todo el servicio es un solo slice de “identidad”.

---

## 5. Frontend: presentación y adaptadores

```text
frontend/src/
├── paginas/        Pantallas (acceso, editor, sala, partida, resultados)
├── juego/          UI de partida (botones V/F, temporizador, podio)
├── servicios/      Clientes HTTP/WS (autenticacion, actividades, sala)
├── dominio/        Tipos y validaciones de formulario visibles
├── contexto/       Sesión y proveedores de servicios
└── configuracion/  URLs desde variables de entorno
```

- **Entrada de usuario:** páginas y componentes.
- **Casos de uso del cliente:** hooks/páginas que llaman a `servicios/*`; no recalculan el puntaje oficial.
- **Acceso remoto:** `crearServicios.ts` elige adaptadores HTTP reales o simulación solo si faltan URLs o en pruebas.

La regla “un punto por acierto” puede mostrarse en UI, pero la fuente de verdad es `actividades`.

---

## 6. Mapa rápido para la defensa

| Pregunta del enunciado | Respuesta en este diseño |
| --- | --- |
| ¿Estilo de arquitectura? | Dos APIs independientes + frontend; no monolito ni microservicios finos |
| ¿Organización interna? | Vertical Slice en actividades; N-Capas en autenticación |
| ¿Dónde están las reglas del juego? | `actividades/src/sesiones-juego/` (`calificacion.ts` + service) |
| ¿Dónde están los casos de uso? | Services de cada slice / `AuthService` |
| ¿Entrada HTTP? | Controllers NestJS |
| ¿Entrada en vivo? | `CanalWebSocketService` en el slice de sesiones |
| ¿Acceso a datos? | Prisma; imágenes vía `AlmacenImagenes` |
| ¿Cómo un proyecto distinto consume esto? | OpenAPI + JWT de auth + REST/WS de actividades, como `cliente-adicional/` |

---

## 7. Relación con OpenSpec

Los specs en `openspec/specs/` (`acceso-y-perfiles`, `cuestionarios`, `sala-y-partida`, `resultados`) describen el comportamiento por capacidad. Esa partición coincide con los Vertical Slices de actividades y con las pantallas del frontend archivadas en `openspec/changes/archive/2026-11-09-frontend-evaluaciones-en-vivo/`.
