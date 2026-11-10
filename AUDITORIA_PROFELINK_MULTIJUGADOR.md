# Auditoría multijugador de ProfeLink

Fecha de la verificación: 9 de noviembre de 2026.

La partida se jugó contra el backend NestJS y PostgreSQL local. El frontend no estaba en simulación: `frontend/.env.local` apunta a autenticación, actividades y el canal WebSocket, con `VITE_USAR_SIMULACION=false`.

## Estado general

| Comprobación | Resultado |
|---|---|
| Frontend ejecutado | Sí. `http://127.0.0.1:5175` |
| Backend ejecutado | Sí. Autenticación en `http://127.0.0.1:5001` y actividades en `http://127.0.0.1:5002` |
| Base de datos conectada | Sí. `GET /salud` respondió `baseDatos: disponible` |
| Cuestionario creado | Sí. Diez preguntas, con tiempos distintos, desde la interfaz del docente |
| Sala creada | Sí. PIN de la partida normal: `PJVCQL` |
| Estudiantes conectados | 6 navegadores independientes en la partida normal. Además, 2 en desconexión y 6 en empates |
| Partida completada | Sí. Tres partidas completas |
| Puntuaciones verificadas | Sí. Coinciden con 1 punto por acierto y 0 por error, omisión o respuesta rechazada |
| Podio mostrado | Sí. Oro, plata y bronce con datos reales del backend |
| Pruebas responsive | Sí, de forma automática. Sin scroll horizontal en 320, 375, 430, 768, 1024, 1366 y 1920 px sobre el podio del docente, y en 320, 375 y 430 px sobre el podio del estudiante |

Docente y estudiantes usan la misma aplicación: `http://127.0.0.1:5175`.

- El docente crea el cuestionario, abre la sala en `/sala/:codigo` y avanza las preguntas.
- El estudiante entra en `/unirse` y juega en `/partida/:codigo`.

El puerto 5173 lo ocupa otro proyecto. ProfeLink está en 5175.

## Cómo se puntúa

El servidor otorga 1 punto por opción correcta y 0 si la respuesta es incorrecta, falta o llega después del cierre. El tiempo no modifica el puntaje. El cliente no puede enviar `puntos` ni `tardia`: el validador rechaza esos campos con HTTP 400. Una segunda respuesta del mismo participante a la misma pregunta responde 409. Una respuesta después de cerrar la pregunta también responde 409.

El empate se resuelve por puntaje, luego por aciertos y, si siguen iguales, por el nombre en orden alfabético español. Como el puntaje es igual al número de aciertos, el nombre es el desempate real.

## Evidencia de la partida

### Partida normal

- PIN: `PJVCQL`
- Estudiantes: 6, cada uno en su propio contexto de navegador
- Preguntas: 10
- Respuestas: una por participante y pregunta, salvo las omisiones y la pregunta en la que Fabio salió de la página
- Puntuación final:
  - Ana Rápida: 10
  - Bruno Lento: 10
  - Fabio Cortes: 9
  - Carmen Mixta: 5
  - Elena Silencio: 3
  - Diego Fallos: 0
- Podio: oro Ana Rápida (10), plata Bruno Lento (10), bronce Fabio Cortes (9)
- El desempate entre Ana y Bruno quedó en pantalla: el nombre en orden alfabético
- Un PIN inexistente (`ZZZZZZ`) fue rechazado
- Un estudiante que intentó entrar después de finalizar fue rechazado
- Al recargar, el podio del docente siguió mostrando a Ana Rápida

### Partida con desconexión

- Olga Sigue: 4 puntos
- Pablo Corta salió de la página durante una pregunta, volvió a entrar y terminó con 3 puntos, sin duplicarse
- El docente recargó durante una pregunta y recuperó la sala
- El podio mostró solo dos lugares, porque había dos participantes

### Partida con errores, tiempo sin respuesta y empate

- Ana Empate y Bruno Empate: 4 puntos cada uno. Oro Ana, plata Bruno
- Carmen Cero no respondió: 0 puntos y bronce
- Diego Mal respondió mal: 0 puntos
- Dos cuentas distintas, ambas llamadas Gemelo, quedaron en 0. Una intentó enviar la respuesta correcta junto con `puntos: 100` y `tardia: false`. El servidor rechazó el cuerpo (HTTP 400) y no sumó ese punto

### Concurrencia real

Clientes independientes por HTTP y WebSocket, no ventanas gráficas. Todas las respuestas fueron aceptadas y las identidades no se pisaron.

| Participantes | PIN | Unión | Con 2 puntos | Con 1 punto | Rechazadas | Identidades |
|---|---|---|---|---|---|---|
| 10 | U2WUQD | 4,5 s | 8 | 2 | 0 | 10 |
| 20 | GCCAFB | 10,3 s | 16 | 4 | 0 | 20 |
| 30 | W7CKET | 13,8 s | 24 | 6 | 0 | 30 |

Cada quinto jugador falló la primera pregunta a propósito y acertó la segunda, de ahí el punto único. El resto acertó las dos. El detalle está en `e2e/evidencias/concurrencia.json`.

### Capturas

En `e2e/evidencias/`:

- `01-sala-docente.png`
- `02-estudiantes-conectados.png`
- `03-espera-estudiante.png`
- `04-pregunta-activa.png`
- `05-resultado-parcial.png`
- `06-podio-docente.png`
- `07-podio-estudiante.png`
- `08-podio-320.png`
- `09-podio-reconexion.png`
- `10-podio-empate.png`

### Pruebas automatizadas

`npx playwright test partida.spec.ts` terminó con **3 passed (5.7 min)**. El reporte HTML quedó en `e2e/reporte`.

## Problemas y correcciones

| Problema | Archivo | Causa | Solución | Prueba | Estado |
|---|---|---|---|---|---|
| El frontend podía jugar en simulación local | `frontend/.env.local`, `frontend/src/configuracion/entorno.ts` | Sin variables, la app no usaba el backend | Se apuntó autenticación, actividades y el canal, y se apagó la simulación | Las tres partidas y la concurrencia pegaron a los puertos 5001 y 5002 | Corregido |
| El detalle del cuestionario mostraba 20 segundos en todas las preguntas | `actividades/src/cuestionarios/presentacion.ts` | La API guardaba `segundos`, pero no lo devolvía | La pregunta pública incluye `segundos` | La interfaz mostró 90 y 60 segundos después de guardar | Corregido |
| Guardar el cuestionario no salía del editor | `frontend/src/paginas/EditorCuestionario.tsx` | El bloqueo de salida se activaba en el mismo instante de la navegación | La navegación ocurre después de marcar el borrador como limpio | El docente llegó al detalle y pudo editar y borrar | Corregido |
| Los estudiantes no recibían el final de la partida | `actividades/src/sesiones-juego/canal-websocket.service.ts`, `sesiones-juego.service.ts` | El aviso final se leía con una identidad de sistema y la sala finalizada lo rechazaba | Cada socket recibe su propia vista de la sala | Los seis estudiantes vieron “Partida terminada” y el mismo podio | Corregido |
| No había podio | `frontend/src/componentes/Podio.tsx` | Los resultados eran una lista plana | Podio con oro, plata y bronce, animación y el resto de la clasificación | Capturas 06, 07, 09 y 10, y las aserciones de orden | Corregido |
| El anfitrión no podía volver a entrar a la sala | `sesiones-juego.service.ts` | Unirse lo trataba como un participante nuevo | Si ya es el anfitrión, la sala se devuelve sin duplicarlo | El docente recargó a mitad de pregunta y siguió | Corregido |
| Un corte del socket impedía responder y no se reconectaba | `frontend/src/servicios/sala.ts` | El cierre del socket pausaba también el HTTP | El HTTP sigue disponible y el socket se reabre solo | Pablo recuperó la partida y su puntaje | Corregido |
| El docente no veía a un estudiante desconectado | `canal-websocket.service.ts` | Cerrar la pestaña no siempre se reflejaba, y un socket mudo podía quedar abierto | Al cerrar se marca la presencia. Un latido cierra sockets que no responden | Al ir a una página en blanco, Pablo apareció como desconectado y no se duplicó al volver | Corregido |
| Guardar diez preguntas fallaba con un error genérico | `cuestionarios.service.ts`, `sesiones-juego.service.ts`, `prisma.service.ts` | La transacción vencía a los 5 s en una base local lenta y el pool era de 5 conexiones | El guardado espera hasta 90 s, las partidas hasta 20 s y el pool admite 20 conexiones | El cuestionario de diez preguntas se guardó y las tres partidas terminaron | Corregido |
| El editor no permitía elegir el tiempo de cada pregunta | `EditorCuestionario.tsx`, `entrada-cuestionario.dto.ts` | El tiempo existía en la base, pero la pantalla lo dejaba fijo | Cada pregunta guarda un entero entre 5 y 120 segundos y la ronda usa ese valor | El detalle mostró los tiempos guardados | Corregido |

## Problemas pendientes

No declaro el sistema libre de fallos.

- Subir imágenes no funciona en este entorno. El almacenamiento de Supabase está apagado a propósito para no usar el proyecto remoto. Las preguntas de la auditoría no llevaron imagen.
- Dos estudiantes pueden mostrarse con el mismo nombre. La identidad real es la cuenta, no el nombre visible. La partida de empates lo dejó así, con dos filas “Gemelo”.
- Quien no estaba en la sala no puede entrar después de que la partida empezó. Quien ya estaba sí puede volver.
- El tiempo límite cierra la respuesta, pero no cambia los puntos.
- Apagar la red desde Playwright no cierra un WebSocket que ya está abierto. Salir de la página sí lo hace, y el servidor lo registra. El latido cubre un socket que deja de responder.
- La base local puede tardar decenas de segundos en guardar un cuestionario grande. El guardado ya no se corta a los 5 segundos, pero sigue siendo secuencial.
- El responsive se comprobó con la prueba de scroll horizontal y con la captura a 320 px. No hubo una revisión visual manual de cada pantalla en cada ancho.
- El registro de autenticación llegó a fallar una vez por un corte de la conexión con PostgreSQL. Al reintentar, el servicio respondió y las partidas siguieron. El mensaje del servicio dice “Supabase” aunque la base usada fue la local.

## Servidores que quedaron en ejecución

- Aplicación: `http://127.0.0.1:5175`
- Autenticación: `http://127.0.0.1:5001`
- Actividades y canal en vivo: `http://127.0.0.1:5002` y `ws://127.0.0.1:5002/canal`
