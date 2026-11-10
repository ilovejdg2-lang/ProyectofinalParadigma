## Context

El repositorio todavía no tiene la aplicación. Este diseño cubre solo el frontend. Los requisitos de comportamiento están en las especificaciones de acceso, cuestionarios, sala y resultados. La motivación está en `proposal.md`.

La interfaz debe ejecutarse aparte de la API de autenticación y de la API de actividades. Esas APIs todavía no están en este repositorio. Las URLs, los puertos y las credenciales salen de variables de entorno, con un ejemplo sin secretos.

## Goals / Non-Goals

**Goals:**

- Una aplicación React que recorra el flujo de clase: entrar, descubrir o crear un cuestionario, abrir la sala, responder y ver la clasificación.
- Pantallas separadas de los clientes que hablan con autenticación, actividades y el canal en vivo.
- Estados visibles de carga, vacío, error, espera, respuesta enviada y reconexión.
- Uso en computadora y celular, con la identidad oscura y azul de ProfeLink.

**Non-Goals:**

- Implementar la API, la base de datos, la validación definitiva del puntaje, Docker del sistema completo o el monitoreo.
- Calcular en el navegador el puntaje que la API debe confirmar. La interfaz muestra el puntaje recibido.
- Mezclar participantes o resultados de salas distintas.

## Decisions

### Clientes separados por servicio

La interfaz depende de tres contratos, no de código de los otros módulos:

- Autenticación: registro, inicio de sesión, cierre y sesión actual. El servicio es una API desplegada aparte y reconoce como audiencia a la API de actividades.
- Actividades: cuestionarios, imágenes, sesiones y resultados, por REST.
- Canal en vivo: suscripción a una sala para recibir unión de participantes, pregunta activa, cierre y estado, sin recargar.

Cada contrato tiene una interfaz y una implementación que llama a la red. Mientras la API no esté disponible, una implementación sustituta marcada como simulada permite probar las pantallas. La interfaz no afirma que hay tiempo real si el adaptador activo es el simulado.

Alternativa descartada: llamar a `fetch` dentro de cada pantalla. Eso mezclaría la presentación con el servicio y haría difícil cambiar la URL o las pruebas.

### Rutas protegidas por sesión

Las pantallas de gestión, sala, partida y resultados exigen sesión. La protección redirige al acceso; no consiste en ocultar botones. El nombre del perfil viaja con la sesión y se muestra en la sala.

Alternativa descartada: guardar solo un booleano local sin identificar a la persona. No alcanza para mostrar el nombre ni para que la API autorice al propietario.

### Imágenes por URL del servicio

El formulario valida formato y tamaño antes de enviar el archivo. Después de aceptarlo, la pantalla usa la URL que devuelve la API. No se usa una dirección local del navegador como origen definitivo de la imagen.

Alternativa descartada: guardar el archivo solo en el dispositivo. Los demás participantes no podrían verlo.

### Una sala por vista

La pantalla de sala y la de partida reciben el código y se suscriben solo a ese código. El anfitrión copia el código, ve la lista y decide cuándo iniciar y cuándo avanzar después del cierre. El participante envía una respuesta por pregunta y queda en espera. Si el servicio rechaza un reenvío o una respuesta tardía, la pantalla lo muestra.

Alternativa descartada: avanzar la pregunta con un temporizador local del participante. El anfitrión es quien cierra y avanza; el temporizador de la pantalla es informativo y la API decide si la respuesta es válida.

### Identidad visual

El fondo es negro o gris muy oscuro, los paneles son un tono más claros y la acción principal es azul eléctrico. El catálogo usa buscador, filtros y tarjetas. No se usa la paleta morada de la referencia de exploración ni un tablero de columnas.

## Risks / Trade-offs

- [Las APIs de los otros módulos pueden cambiar el contrato] → Los clientes viven en un solo lugar y las pantallas dependen de tipos propios. El cambio de contrato se documenta antes de ajustarlos.
- [Un adaptador simulado puede confundirse con la partida real] → La interfaz lo identifica como simulación y no muestra estadísticas inventadas de participantes.
- [La reconexión depende del estado que entregue el canal] → Al recuperar la conexión, la pantalla vuelve a pedir el estado de esa sala y no crea otro participante.
- [El puntaje mostrado y el puntaje guardado podrían diferir si la interfaz lo calcula] → La clasificación usa la respuesta del servicio. La regla visible es un punto por acierto y cero por error o falta de respuesta.

## Migration Plan

1. Agregar la aplicación en `frontend/` sin modificar los módulos de los otros integrantes.
2. Publicar `.env.example` con las URLs de autenticación, actividades y canal en vivo.
3. Mantener el adaptador simulado hasta que esas URLs respondan.
4. Retirar el adaptador simulado del arranque normal cuando la API real cubra el flujo. No hace falta migrar datos locales porque la persistencia pertenece a la API.

## Open Questions

- Los nombres exactos de los eventos en vivo y el mecanismo, SignalR o WebSocket, los define el módulo de la API. La interfaz solo necesita suscribirse, autenticarse en el canal y recuperar el estado de la sala.
