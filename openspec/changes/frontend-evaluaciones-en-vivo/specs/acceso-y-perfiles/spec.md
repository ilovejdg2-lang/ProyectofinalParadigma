## Purpose

Permite que una persona cree su perfil, entre a ProfeLink y use su nombre durante la partida, sin implementar el servicio de autenticación dentro de la interfaz.

## ADDED Requirements

### Requirement: Registro de perfil
La interfaz MUST permitir registrar un perfil con los datos que exija el servicio de autenticación y MUST mostrar un error claro cuando el registro sea rechazado.

#### Scenario: Registro aceptado
- **WHEN** la persona completa el formulario de registro con datos válidos y el servicio acepta el perfil
- **THEN** la interfaz deja a la persona autenticada y muestra su nombre

#### Scenario: Registro rechazado
- **WHEN** la persona envía el formulario y el servicio rechaza los datos
- **THEN** la interfaz conserva lo que se pueda corregir y muestra el motivo del rechazo sin navegar a una pantalla privada

### Requirement: Inicio y cierre de sesión
La interfaz MUST permitir iniciar sesión y cerrar sesión. MUST impedir el acceso a las pantallas privadas cuando no hay una sesión válida.

#### Scenario: Credenciales rechazadas
- **WHEN** la persona envía credenciales que el servicio no acepta
- **THEN** la interfaz permanece en el acceso y muestra un error de autenticación

#### Scenario: Acceso sin sesión
- **WHEN** una persona sin sesión abre una pantalla que exige cuenta
- **THEN** la interfaz la redirige al inicio de sesión y no muestra el contenido privado

#### Scenario: Cierre de sesión
- **WHEN** la persona autenticada elige cerrar sesión
- **THEN** la interfaz elimina la sesión local y vuelve a exigir autenticación para las pantallas privadas

### Requirement: Nombre visible en el juego
La interfaz MUST mostrar el nombre del perfil autenticado durante la sala y la partida.

#### Scenario: Nombre en la sala
- **WHEN** la persona autenticada entra a una sala
- **THEN** la interfaz muestra su nombre entre los datos de participación
