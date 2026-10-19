## Purpose

Permite descubrir cuestionarios de verdadero o falso y administrar los cuestionarios propios, incluidas sus preguntas e imágenes, usando la API de actividades.

## ADDED Requirements

### Requirement: Catálogo de cuestionarios
La interfaz MUST mostrar un catálogo con título, descripción breve, autor, cantidad de preguntas, categoría, indicador de verdadero o falso e imagen disponible. MUST permitir buscar y filtrar los cuestionarios mostrados.

#### Scenario: Búsqueda con resultados
- **WHEN** la persona escribe un texto que coincide con cuestionarios disponibles
- **THEN** la interfaz muestra solo los cuestionarios que cumplen la búsqueda

#### Scenario: Búsqueda sin resultados
- **WHEN** la búsqueda o los filtros no encuentran cuestionarios
- **THEN** la interfaz muestra un estado vacío y no inventa resultados

#### Scenario: Error al cargar el catálogo
- **WHEN** el servicio de cuestionarios no responde o responde con error
- **THEN** la interfaz muestra el error y una forma de reintentar

### Requirement: Detalle y selección
La interfaz MUST permitir abrir el detalle de un cuestionario y, si la persona tiene permiso, iniciar o seleccionar ese cuestionario para una sala.

#### Scenario: Ver detalle
- **WHEN** la persona elige ver un cuestionario del catálogo
- **THEN** la interfaz muestra sus datos y sus preguntas sin cantidades inventadas de participantes o partidas

### Requirement: Gestión de cuestionarios propios
La interfaz MUST permitir crear, consultar, editar y eliminar los cuestionarios de la persona autenticada. MUST pedir confirmación antes de eliminar y MUST avisar antes de descartar cambios sin guardar.

#### Scenario: Guardar un cuestionario válido
- **WHEN** la persona completa título, descripción y al menos una pregunta válida y confirma el guardado
- **THEN** la interfaz envía el cuestionario al servicio y lo muestra entre sus cuestionarios

#### Scenario: Faltan datos obligatorios
- **WHEN** la persona intenta guardar sin título, sin descripción o sin la respuesta correcta de una pregunta
- **THEN** la interfaz no envía el cuestionario e indica qué datos faltan

#### Scenario: Eliminar con confirmación
- **WHEN** la persona pide eliminar un cuestionario o una pregunta propia y confirma
- **THEN** la interfaz solicita la eliminación al servicio y actualiza la lista

#### Scenario: Cancelar con cambios pendientes
- **WHEN** la persona cancela la edición y existen cambios sin guardar
- **THEN** la interfaz pide confirmación antes de descartarlos

### Requirement: Preguntas de verdadero o falso con imagen
Cada pregunta MUST tener enunciado y respuesta correcta de verdadero o falso. La imagen MUST ser opcional. La interfaz MUST validar el formato y el tamaño antes de enviarla y MUST mostrar la imagen desde la URL devuelta por el servicio.

#### Scenario: Pregunta sin imagen
- **WHEN** la persona guarda una pregunta con enunciado y respuesta correcta, sin archivo
- **THEN** la interfaz acepta la pregunta y no exige una imagen

#### Scenario: Imagen rechazada
- **WHEN** la persona adjunta un archivo con formato o tamaño no permitido
- **THEN** la interfaz no lo envía y explica el motivo

#### Scenario: Imagen disponible para otros dispositivos
- **WHEN** el servicio acepta la imagen y devuelve su URL
- **THEN** la interfaz usa esa URL para mostrarla y no depende de un archivo local del navegador
