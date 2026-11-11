# Matriz de evidencia

Registro del 2026-11-09 actualizado el 2026-11-09 (noche, hora local) con una corrida **solo en localhost**. Los seis casos de la rúbrica se ejecutaron con `node cliente-adicional/evidencia-local.mjs` contra `127.0.0.1:5001` y `127.0.0.1:5002`. El JSON observado quedó en `.local/evidencia-local.json` (ese archivo no se versiona).

No se enviaron partidas, cargas ni escrituras a producción. No se marcaron teléfonos físicos: los clientes eran procesos Node en esta máquina. La demo del 2026-11-07 (un docente y un estudiante) no se repitió.

Actualización del 2026-11-11: el equipo reportó una prueba real desde varios
dispositivos físicos. Durante las partidas vieron las mismas preguntas y el
mismo tiempo, y el flujo funcionó con normalidad. No se recibieron para esta
matriz capturas identificadas, fecha/hora exactas, navegadores ni redes; por eso
se conserva como resultado reportado por el equipo y no como evidencia
independientemente inspeccionada.

Para completar el expediente de evidencia física y preparar la defensa, seguir
[el guion de defensa y dispositivos](defensa-y-dispositivos.md).

| Caso | Qué hay registrado antes | Qué se observó el 2026-11-09 (noche) | Estado |
| --- | --- | --- | --- |
| Varios dispositivos o participantes | [Demo punta a punta](../evidencias/demo-punta-a-punta-2026-11-07.md): un docente y un estudiante. | El 2026-11-09, 8 participantes entraron a la sala `RMER3Z` desde clientes Node en esta máquina. En una prueba posterior, el equipo reportó varios dispositivos físicos, con preguntas y tiempos coincidentes y partidas normales. | Corrida local observada; prueba física reportada por el equipo. Falta adjuntar capturas y datos de contexto para que sea evidencia reproducible. |
| Imagen durante una partida | La demo del 2026-11-07 no menciona una imagen en vivo. | La pregunta en vivo de `RMER3Z` incluyó `/portadas/funcional.svg`. GET local a esa URL en el frontend Vite (`127.0.0.1:5175`): HTTP 200. | Observado en localhost. |
| Reconexión | Spec de memoria en `sesiones-juego.service.spec.ts`. | El segundo participante cerró el WebSocket y volvió a `RMER3Z`. Copias de su `perfilId` en la sala: 1. | Observado en localhost (corte de socket, no caída de red de un teléfono). |
| Aislamiento de salas | El servicio emite solo al conjunto de esa sala. | Sala A `RMER3Z` y sala B `BXPBRK`. El canal de A recibió 0 mensajes de B. El canal de B recibió 3 mensajes de su sala. Inicio B: 201. | Observado en localhost. |
| Consumo independiente de la API | El 2026-11-07 un runner local hizo 20 GET. | Cuatro GET desde el mismo proceso Node, fuera de React: `200, 200, 200, 200` (`/health/ready`, `/salud`, `/cuestionarios` dos veces). | Observado en localhost. |
| Máximo de participantes probado | No hay tope numérico en `SesionesJuegoService`. La demo tuvo un participante. | Se unieron 8 de 8 cuentas. El servicio no declara un tope; **8** es el máximo ejecutado en esta corrida. | Observado: 8. No es un límite de producto. |

Los health checks públicos del 2026-11-09, todos HTTP 200, solo confirman que el proceso responde. No sustituyen los casos de arriba.

## Publicación de imágenes

El 2026-11-11 se publicaron en Docker Hub y se verificó la descarga anónima de
las etiquetas `:ebbe61a` y `:latest` de `bryxxs/profelink-auth-service`,
`bryxxs/profelink-actividades` y `bryxxs/profelink-frontend`. Estas imágenes
parten del código base `ebbe61a`; no incluyen los cambios aún no integrados de
Scalar para Autenticación ni las actualizaciones documentales de esta rama.

| URL | Código |
| --- | --- |
| `https://profelink.sinkro.dev/health` | 200 |
| `https://auth.profelink.sinkro.dev/health/ready` | 200 |
| `https://api.profelink.sinkro.dev/salud` | 200 |
