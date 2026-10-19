## Purpose

Permite al anfitrión abrir una sala con código y a los participantes unirse con su perfil para responder una pregunta de verdadero o falso a la vez.

## ADDED Requirements

### Requirement: Sala del anfitrión
La interfaz del anfitrión MUST mostrar el cuestionario, el código, la lista y la cantidad de participantes, el estado de la sala y el estado de conexión. MUST permitir copiar el código e iniciar la partida. MUST impedir que un participante controle una sala ajena.

#### Scenario: Sala sin participantes
- **WHEN** el anfitrión abre una sala y nadie se ha unido
- **THEN** la interfaz muestra el código y un mensaje de que todavía no hay participantes

#### Scenario: Participante se une
- **WHEN** otra persona entra con el código de esa sala
- **THEN** la interfaz del anfitrión actualiza la lista y la cantidad sin recargar la página

#### Scenario: Código de otra sala
- **WHEN** existen dos salas al mismo tiempo
- **THEN** cada interfaz muestra solo los participantes y eventos de su propio código

#### Scenario: Participante intenta controlar la sala
- **WHEN** un participante abre la vista de control de una sala que no organiza
- **THEN** la interfaz no le ofrece iniciar ni avanzar la partida

### Requirement: Ingreso del participante
La interfaz MUST pedir el código de la sala a una persona ya autenticada y MUST mostrar un error claro si el código no existe o la conexión falla.

#### Scenario: Código inválido
- **WHEN** la persona envía un código que el servicio no reconoce
- **THEN** la interfaz informa que la sala no está disponible y no entra a una partida

### Requirement: Pregunta en vivo
Durante la partida, la interfaz MUST mostrar el número de pregunta, el total, el enunciado, la imagen cuando exista, el tiempo restante y dos acciones grandes: Verdadero y Falso. MUST reflejar la respuesta elegida y el envío.

#### Scenario: Respuesta dentro del tiempo
- **WHEN** el participante elige Verdadero o Falso antes de que cierre la pregunta
- **THEN** la interfaz envía una sola respuesta, marca la opción elegida y pasa a espera

#### Scenario: Intento de responder otra vez
- **WHEN** el participante ya envió su respuesta de la pregunta actual
- **THEN** la interfaz no permite enviar otra respuesta para esa pregunta

#### Scenario: Respuesta tardía
- **WHEN** el participante intenta responder después del cierre o el servicio rechaza la respuesta por tiempo
- **THEN** la interfaz informa que la respuesta llegó tarde y no la presenta como aceptada

### Requirement: Avance del anfitrión y reconexión
La interfaz MUST esperar el avance del anfitrión después del cierre de la pregunta. Al recuperar la conexión, MUST mostrar el estado vigente de la misma sesión sin duplicar a la persona.

#### Scenario: Espera entre preguntas
- **WHEN** el participante ya respondió y el anfitrión todavía no avanza
- **THEN** la interfaz muestra un estado de espera y no cambia de pregunta por su cuenta

#### Scenario: Reconexión
- **WHEN** la persona recupera la conexión durante la misma sesión
- **THEN** la interfaz vuelve a esa sala y muestra la pregunta o el resultado vigente, sin crear otra participación
