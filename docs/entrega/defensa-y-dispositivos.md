# Guion de defensa y prueba entre dispositivos

Esta guía es un procedimiento, **no evidencia de una prueba ya realizada**. La
[matriz de evidencia](matriz-evidencia.md) registra ocho clientes Node en una
sola computadora; eso no demuestra que el flujo funcione entre teléfonos o
computadoras distintos.

## Preparación de la demostración

1. Confirmar que `https://profelink.sinkro.dev/health`,
   `https://auth.profelink.sinkro.dev/health/ready` y
   `https://api.profelink.sinkro.dev/salud` responden correctamente. Una
   respuesta de salud no demuestra por sí sola que la partida funcione.
2. Usar una cuenta docente y una cuenta estudiante **diferentes**. No mostrar
   contraseñas, JWT ni claves en capturas o pantalla compartida.
3. Abrir el sitio en dos dispositivos físicos conectados a redes distintas
   (por ejemplo, computadora por Wi-Fi y teléfono por datos móviles). Registrar
   tipo de dispositivo, navegador, red, fecha y hora; no registrar direcciones
   IP privadas ni credenciales.

## Recorrido que debe observarse

1. En el dispositivo docente, crear un cuestionario de prueba con dos
   preguntas, guardarlo, recargar la página y comprobar que sigue disponible.
2. Abrir una sala e introducir su código en el dispositivo estudiante.
   Comprobar que el docente ve al participante conectado.
3. Iniciar la partida, responder desde el estudiante y avanzar desde el
   docente. Comprobar que ambos dispositivos ven la misma pregunta y el
   resultado correspondiente.
4. Cerrar la partida, abrir el historial del estudiante, recargar y comprobar
   que el resultado persiste. Si se prueba reconexión, registrar por separado
   el corte de red y el estado tras recuperar la conexión.
5. Guardar capturas de las dos vistas sin tokens ni datos sensibles y anotar
   resultado observado, HTTP o mensaje de error, y cualquier paso no ejecutado.

No marcar este caso como completado si solo se usaron dos pestañas o procesos
en la misma computadora. Tampoco tomar la existencia de un endpoint como prueba
de su funcionamiento desde otra red.

## Explicación breve para la defensa

- **Problema y flujo:** un docente crea un cuestionario, abre una sala y el
  estudiante participa; el resultado queda persistido. La
  [demo del 2026-11-07](../evidencias/demo-punta-a-punta-2026-11-07.md) ya
  documenta el flujo con un docente y un estudiante, pero no la prueba física
  entre dispositivos.
- **Arquitectura:** frontend, Autenticación y Actividades son procesos
  separados. Autenticación emite JWT RS256; Actividades valida la firma con
  JWKS. Ver [arquitectura interna](../decisiones/arquitectura-interna.md).
- **Datos:** PostgreSQL separa `auth_service` de `public`; las imágenes
  subidas van a Supabase Storage. Ver [modelo de datos](../diagramas/modelo-datos.md).
- **Contratos:** ambos servicios deben mostrar su OpenAPI y Scalar. Verificar
  `https://auth.profelink.sinkro.dev/reference` y
  `https://api.profelink.sinkro.dev/reference` después de desplegar el cambio
  de Autenticación. Hasta entonces, no afirmar que Scalar ya está publicado en
  Autenticación.
- **Observabilidad:** las APIs instrumentadas exportaron trazas a Grafana/Tempo
  local, según [monitoreo y aportes](monitoreo-y-aportes.md). No presentar esa
  evidencia local como un panel público de producción.
- **Límites conocidos:** las imágenes todavía no están verificadas en Docker
  Hub y esta guía aún no documenta una ejecución real entre dispositivos.

La calificación de la defensa depende de la presentación y de las preguntas
del profesor; no puede certificarse solo con documentación.
