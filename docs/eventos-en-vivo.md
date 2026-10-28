# Protocolo de Comunicación en Vivo y Eventos en Tiempo Real

Este documento describe la especificación del canal en tiempo real implementado para las partidas de cuestionarios interactivos de **ProfeLink**.

---

## 1. Conexión y Autenticación del Canal

- **URL de Conexión**: `ws://<HOST_ACTIVIDADES>:<PORT>/canal?codigo=<CODIGO_SALA>&access_token=<JWT_TOKEN>`
- **Autenticación**:
  - En entornos WebSocket donde las cabeceras `Authorization` no pueden ser enviadas por el navegador, el cliente provee el token en el parámetro de consulta `access_token`.
  - El servidor valida la firma asimétrica **RS256** del token contra `auth-service` y vincula la conexión a la identidad verificada (`id`, `nombre`, `role`).

---

## 2. Aislamiento por Salas

- Cada sala se identifica por su código único de 6 caracteres (ej. `ABCDEF`).
- Los clientes solo reciben mensajes y cambios pertenecientes a la sala a la que se han suscrito.
- No se realizan emisiones indiscriminadas a nivel global.

---

## 3. Contrato de Eventos y Mensajería

### 3.1 Mensaje Principal de Estado (`sala`)
Para garantizar compatibilidad directa con el cliente React (`frontend/src/servicios/sala.ts`), cada actualización de la partida envía la instantánea completa vigente de la sala:

```json
{
  "sala": {
    "codigo": "ABCDEF",
    "cuestionarioId": "cuestionario-uuid",
    "titulo": "Programación Funcional",
    "anfitrionId": "perfil-demo-docente",
    "anfitrionNombre": "Docente de prueba",
    "estado": "pregunta",
    "preguntaActual": 0,
    "segundos": 20,
    "cierraEn": "2026-10-27T18:00:20.000Z",
    "participantes": [
      {
        "id": "part-uuid-1",
        "perfilId": "perfil-demo-estudiante",
        "nombre": "Estudiante de prueba",
        "conectado": true,
        "puntaje": 1,
        "aciertos": 1,
        "respuestas": []
      }
    ],
    "preguntas": [ ... ],
    "canal": "remoto"
  },
  "aviso": {
    "tipo": "pregunta-cambiada",
    "codigo": "ABCDEF",
    "ocurridoEn": "2026-10-27T18:00:00.000Z"
  }
}
```

### 3.2 Eventos de Dominio Emitidos

| Evento | Descripción | Payload |
|---|---|---|
| `Conectado` | Confirmación enviada al cliente al establecer el WebSocket | `{ evento, codigo, timestamp }` |
| `RoomCreated` | Sala abierta por el docente | `{ evento, codigo, ocurridoEn }` |
| `ParticipantJoined` | Estudiante o participante incorporado a la sala | `{ evento, codigo, ocurridoEn }` |
| `GameStarted` | Partida iniciada por el docente | `{ evento, codigo, ocurridoEn }` |
| `AnswerAccepted` | Respuesta registrada y validada | `{ evento, codigo, ocurridoEn }` |
| `QuestionClosed` | Fin del tiempo de respuesta o cierre forzado | `{ evento, codigo, ocurridoEn }` |
| `QuestionShown` | Avance a la siguiente pregunta de la sesión | `{ evento, codigo, ocurridoEn }` |
| `GameEnded` | Partida finalizada con resultados definitivos | `{ evento, codigo, ocurridoEn }` |

---

## 4. Sincronización del Tiempo y Reglas de Respuesta

1. **Fuente de verdad única**: El servidor es el único árbitro del tiempo. `cierraEn` se calcula en el servidor como `ahora + segundosLimite`.
2. **Cierre de Respuestas**: Las respuestas son rechazadas si el timestamp del servidor supera `cierraEn` o si la pregunta ya fue cerrada.
3. **Idempotencia**: Solo se admite una respuesta por participante por pregunta. Intentos duplicados se rechazan sin sumar puntuación.
4. **Ocultación de Respuestas Correctas**: Durante el tiempo que una pregunta permanece abierta (`estado = "pregunta"`), la solución correcta no se envía a los clientes para evitar trampas en inspección de red.

---

## 5. Reconexión y Recuperación de Estado

- Si un participante pierde la conexión temporalmente, el cliente reconecta al mismo endpoint (`ws://.../canal?codigo=...`).
- Al conectarse o llamar a `GET /sesiones-juego/:codigo`, el servidor detecta su identidad previa mediante el `sub` del JWT y reasigna su presencia (`conectado = true`) sin duplicar su participación ni alterar su puntaje.
- Si el docente se desconecta, la partida no se aborta; conserva su estado y al reconectarse el docente retoma el control.
