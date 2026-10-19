## Purpose

Muestra el cierre de cada pregunta y la clasificación final de la sesión, usando el puntaje calculado por la API.

## ADDED Requirements

### Requirement: Cierre de pregunta
Al cerrar una pregunta, la interfaz MUST mostrar la respuesta correcta y el resultado de la persona. MUST presentar un punto por acierto y cero por error o falta de respuesta, según lo informado por el servicio.

#### Scenario: Acierto
- **WHEN** el servicio cierra la pregunta y la respuesta enviada coincide con la correcta
- **THEN** la interfaz muestra la respuesta correcta y un punto para esa pregunta

#### Scenario: Error o sin respuesta
- **WHEN** el servicio cierra la pregunta y la persona falló o no respondió
- **THEN** la interfaz muestra la respuesta correcta y cero puntos para esa pregunta

### Requirement: Clasificación final
Al terminar la sesión, la interfaz MUST mostrar la clasificación con el nombre de cada participante, su puntaje, sus aciertos y el puesto. MUST identificar a la persona actual y MUST permitir volver al inicio.

#### Scenario: Clasificación de la sesión
- **WHEN** la partida termina y el servicio entrega los resultados
- **THEN** la interfaz ordena a los participantes por el puntaje recibido y muestra el puesto de cada uno

#### Scenario: Resultados de otra sala
- **WHEN** la persona consulta los resultados de su sesión
- **THEN** la interfaz no mezcla participantes ni puntajes de otra sala

### Requirement: Resultados guardados
La interfaz MUST poder consultar después los resultados de una sesión terminada cuando el servicio los conserve.

#### Scenario: Consulta posterior
- **WHEN** la persona abre el historial de una partida ya terminada
- **THEN** la interfaz muestra la clasificación guardada por el servicio
