## Why

ProfeLink necesita un área web para hacer evaluaciones cortas de verdadero o falso durante la clase. Este cambio cubre la interfaz con la que el docente descubre o crea cuestionarios y con la que el grupo juega una partida en vivo. El backend, la autenticación y el canal en tiempo real se consumen como servicios separados.

## What Changes

- Nueva aplicación React con la identidad visual de ProfeLink: fondo oscuro, azul eléctrico, paneles y navegación lateral.
- Pantalla para descubrir cuestionarios, buscarlos, filtrarlos y abrir su detalle.
- Pantallas para registrarse, iniciar sesión, cerrar sesión y ver el perfil con el nombre que se muestra en la partida.
- Pantallas para crear, consultar, editar y eliminar cuestionarios y preguntas de verdadero o falso, incluida la carga de una imagen.
- Sala del anfitrión con código, participantes conectados e inicio de la partida.
- Pantalla del participante para unirse con su perfil y el código, responder Verdadero o Falso una sola vez y esperar el avance del anfitrión.
- Pantalla de resultados por pregunta y clasificación final de la sesión.
- Clientes desacoplados para autenticación, actividades y eventos en vivo, preparados para las APIs del equipo.

## Capabilities

### New Capabilities

- `acceso-y-perfiles`: registro, inicio de sesión, cierre de sesión, perfil y protección de las pantallas que exigen cuenta.
- `cuestionarios`: catálogo, detalle y gestión de cuestionarios y preguntas de verdadero o falso, con imagen opcional.
- `sala-y-partida`: unirse a una sala, vista del anfitrión y respuesta en vivo de los participantes.
- `resultados`: respuesta correcta al cerrar la pregunta, puntaje visible y clasificación de la sesión.

### Modified Capabilities

- Ninguna. No existen especificaciones previas.

## Impact

- Código nuevo en `frontend/`, con React y TypeScript.
- Depende de un servicio de autenticación independiente y de la API de actividades para perfiles, cuestionarios, imágenes, sesiones y resultados.
- Depende del canal en vivo de esa API para recibir la pregunta, el cierre y el estado de la sala sin recargar.
- No incluye la implementación del backend, la base de datos, Docker Compose ni el despliegue. Esos componentes quedan fuera de este cambio.
