# Frontend de ProfeLink

Interfaz para descubrir cuestionarios, crear preguntas de verdadero o falso y jugar una partida en vivo. El aspecto sigue la pantalla de curso de ProfeLink: fondo oscuro, azul eléctrico y navegación lateral. La partida usa un código grande, temporizador y dos botones, Verdadero y Falso.

Esta carpeta no implementa el servicio de autenticación ni las reglas de seguridad del backend. Esas piezas viven en APIs separadas. La interfaz solo llama a sus contratos.

## Requisitos

- Node.js 22 o superior

## Inicio

```bash
cd frontend
npm install
copy .env.example .env.local
npm run dev
```

Con `VITE_USAR_SIMULACION=true`, o si las URL no están definidas, la aplicación usa adaptadores locales. La pantalla lo indica. No es el canal en vivo ni la API real.

Cuenta de prueba, solo para la simulación:

- Correo: `docente.demo@profelink.test`
- Contraseña: `Demo-2026`

## Variables

| Variable | Uso |
| --- | --- |
| `VITE_AUTH_URL` | API de autenticación |
| `VITE_ACTIVIDADES_URL` | API de cuestionarios, imágenes, sesiones y resultados |
| `VITE_CANAL_URL` | WebSocket de la sala |
| `VITE_USAR_SIMULACION` | `false` para usar las API anteriores |

## Contratos que consume

Autenticación:

- `POST /perfiles`
- `POST /sesiones`
- `GET /sesiones/actual`
- `DELETE /sesiones/actual`

Actividades:

- `GET /cuestionarios`
- `GET /cuestionarios/:id`
- `GET /mis-cuestionarios`
- `POST /cuestionarios` y `PUT /cuestionarios/:id`
- `DELETE /cuestionarios/:id`
- `POST /imagenes` con el archivo. La respuesta debe incluir `url`.

Sesiones:

- `POST /sesiones-juego`
- `POST /sesiones-juego/:codigo/participantes`
- `GET /sesiones-juego/:codigo`
- `POST /sesiones-juego/:codigo/iniciar`
- `POST /sesiones-juego/:codigo/respuestas` con `{ "valor": true }`
- `POST /sesiones-juego/:codigo/cerrar`
- `POST /sesiones-juego/:codigo/avanzar`
- `GET /resultados` y `GET /resultados/:codigo`

El canal envía mensajes `{ "sala": { ... } }` del código suscrito. Al reconectar, la pantalla vuelve a pedir `GET /sesiones-juego/:codigo`.

La validación definitiva de permisos, tiempo y puntaje corresponde a la API. La interfaz impide un segundo envío en la misma pregunta y muestra el rechazo si el servicio lo devuelve.

## Comprobaciones

```bash
npm test
npm run lint
npm run typecheck
npm run build
```
