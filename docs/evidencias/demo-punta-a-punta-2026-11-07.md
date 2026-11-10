# Evidencia de demo punta a punta — 2026-11-07

## Alcance

Prueba manual en producción de persistencia de cuestionario y recorrido de partida en vivo, usando dos sesiones ya iniciadas: docente y estudiante. No se modificó ni desplegó código durante esta prueba.

## Cuestionario y persistencia

- Entorno: `https://profelink.sinkro.dev`
- Título: **Demo QA ProfeLink 2026-11-07**
- Categoría: Paradigma funcional; dificultad: Medio.
- Preguntas: 2 de verdadero/falso.
  1. Función pura: respuesta correcta **Verdadero**.
  2. Conjunción lógica: respuesta correcta **Falso**.
- Resultado observado: después de guardar, se abrió el detalle del cuestionario con ambas preguntas. Se recargó la página y el mismo cuestionario y sus dos preguntas volvieron a mostrarse; esto confirma persistencia más allá del estado del formulario.

## Partida en vivo

1. El docente inició una sala para el cuestionario.
2. El estudiante ingresó con el código temporal de la sala; el panel docente pasó a mostrar **1 participante**.
3. El docente inició la partida; ambas vistas mostraron la primera pregunta.
4. El estudiante respondió Verdadero. El panel docente mostró que el participante respondió; al cerrar la pregunta, la vista estudiante mostró respuesta correcta y 1 punto.
5. En la segunda pregunta, el estudiante respondió Falso. El panel docente volvió a mostrar que respondió; al cerrar, la vista estudiante mostró Falso como correcta y 1 punto.
6. La partida terminó; la vista de resultados del estudiante mostró **puesto 1, 2 puntos y 2 aciertos**.
7. Se abrió el Historial del estudiante y apareció **Demo QA ProfeLink 2026-11-07** con **2 puntos**. El detalle de resultados de la sala volvió a mostrar 2 puntos y 2 aciertos, confirmando persistencia de la partida y su resultado.

## Prueba visual y límites

Durante la sesión se capturaron en la conversación de Codex las vistas finales de resultados del estudiante y de la sala del docente. No se generaron archivos de imagen locales, no se publicaron imágenes externas y no se alteró la configuración de Supabase.

La prueba cubre un estudiante y una partida corta; no es una prueba de carga ni de concurrencia.
