# Especificación de Autenticación y Emisión de Credenciales

Este documento detalla la arquitectura, flujos criptográficos, modelos de datos y políticas de seguridad implementadas en `auth-service` para la plataforma **ProfeLink**.

---

## 1. Principios y Supuestos de Diseño

1. **Servicio Independiente y Autónomo**:
   - `auth-service` es una API desacoplada, desplegable de forma autónoma.
   - Posee su propia base de datos (PostgreSQL/Supabase o almacén seguro). Ningún otro servicio consulta su base de datos.
2. **Criptografía Asimétrica (RS256)**:
   - Los tokens JWT son firmados con una clave privada RSA de 2048 bits usando el algoritmo `RS256`.
   - La API de actividades (`actividades` / `kahoot-api`) y los clientes externos no conocen secretos compartidos; únicamente descargan y validan la clave pública expuesta en `/.well-known/jwks.json`.
   - Soporte automático para rotación de claves mediante el identificador `kid` en los encabezados JWT.
3. **Roles y Políticas de Dominio Escalables**:
   - La asignación de roles (`teacher`, `student`, `admin`) no depende de cadenas de texto quemadas en el código (*hardcoded*).
   - Se modela mediante la entidad `EmailDomainPolicy`, permitiendo añadir nuevas instituciones o colegios insertando registros en la base de datos.
   - El cliente **nunca** puede elegir su propio rol en la petición de registro.

---

## 2. Claims del Access Token (JWT)

| Claim | Tipo | Descripción | Ejemplo |
|---|---|---|---|
| `iss` | string | Emisor del token | `http://localhost:5001` |
| `aud` | string | Audiencia esperada | `profelink-actividades` |
| `sub` | string (UUID) | Identificador único del usuario | `c8b74681-79b8-4e89-9fc0-0d3a77884d8a` |
| `email` | string | Correo normalizado | `profesor@una.cr` |
| `name` | string | Nombre para mostrar | `Docente de prueba` |
| `role` | string | Rol asignado | `teacher` \| `student` \| `admin` |
| `inst` | string? | Identificador de institución | `inst-una` |
| `jti` | string (UUID) | Identificador único del token | `...` |
| `iat` | number | Timestamp de emisión (Unix) | `1730000000` |
| `exp` | number | Timestamp de expiración (15 minutos) | `1730000900` |

---

## 3. Endpoints REST (`auth-service`)

### 3.1 Registro de Usuario
- **Ruta**: `POST /api/v1/auth/register` (alias: `POST /perfiles`)
- **Cuerpo**:
  ```json
  {
    "nombre": "Docente Carlos",
    "correo": "carlos.mora@una.cr",
    "contrasena": "Segura1234!"
  }
  ```
- **Regla de asignación de rol**:
  1. Se normaliza el correo (`trim` + minúsculas) y se extrae el dominio (ej. `una.cr`).
  2. Se busca la política en `EmailDomainPolicy`:
     - Dominio `una.cr` → rol `teacher` (con verificación requerida).
     - Dominio `est.una.ac.cr` → rol `student`.
     - Dominio externo (ej. `gmail.com`) → rol `student` si `REGISTRATION_MODE="open"`, o rechazo si `REGISTRATION_MODE="domains-only"`.
  3. La contraseña se protege mediante **bcrypt** con factor de costo 10.
  4. Si `EMAIL_AUTO_VERIFY=true` (entorno local/demo), la cuenta se activa inmediatamente. Si no, queda en `PendingVerification`.

### 3.2 Inicio de Sesión
- **Ruta**: `POST /api/v1/auth/login` (alias: `POST /sesiones`)
- **Cuerpo**:
  ```json
  {
    "correo": "profesor@una.cr",
    "contrasena": "Profesor123!"
  }
  ```
- **Respuesta** (`200 OK`):
  ```json
  {
    "token": "eyJhbGciOiJSUzI1NiIs...",
    "refreshToken": "7a8b9c0d...",
    "perfil": {
      "id": "perfil-demo-docente",
      "nombre": "Docente de prueba",
      "correo": "profesor@una.cr",
      "rol": "teacher",
      "emailVerificado": true
    }
  }
  ```

### 3.3 Rotación de Refresh Token y Detección de Reutilización
- **Ruta**: `POST /api/v1/auth/refresh`
- **Cuerpo**: `{ "refreshToken": "..." }`
- **Garantías de Seguridad**:
  - Los refresh tokens son opacos (256 bits criptográficos aleatorios). En la base de datos se almacena únicamente su **hash SHA-256**.
  - **Rotación en cada uso**: Al invocar `/refresh`, el refresh token presentado se marca como revocado con puntero al nuevo (`replacedBy`).
  - **Detección de Reutilización**: Si un atacante o cliente interceptado intenta reutilizar un refresh token que ya fue rotado, el servicio detecta la anomalía y **revoca de inmediato toda la familia (`familyId`) de tokens de ese usuario**, obligándolo a autenticarse de nuevo.

### 3.4 Cierre de Sesión (Logout)
- **Ruta**: `POST /api/v1/auth/logout` (alias: `DELETE /sesiones/actual`)
- Revoca el refresh token y su familia activa.

### 3.5 Perfil (`/me`)
- **Ruta**: `GET /api/v1/auth/me` (alias: `GET /sesiones/actual`)
- **Cabecera**: `Authorization: Bearer <access_token>`

### 3.6 Metadatos Públicos
- `GET /.well-known/jwks.json`: Expone las claves públicas RSA en formato RFC 7517.
- `GET /.well-known/openid-configuration`: Metadatos del emisor (`issuer`, `jwks_uri`, etc.).
- `GET /health/live`, `GET /health/ready`, `GET /salud`: Estado del servicio.

### 3.7 Cambio de Contraseña
- **Ruta**: `PUT /api/v1/auth/change-password` (alias: `PUT /perfiles/password`)
- **Cabecera**: `Authorization: Bearer <access_token>`
- **Cuerpo**:
  ```json
  {
    "contrasenaActual": "Profesor123!",
    "nuevaContrasena": "NuevaClave2026*"
  }
  ```
- **Garantías de Seguridad**:
  - Valida la contraseña actual contra el hash almacenado mediante `bcrypt.compare`.
  - Exige una longitud mínima de 8 caracteres para la nueva clave.
  - Hashea la nueva contraseña con `bcrypt` (factor de costo 10).
  - **Revoca inmediatamente todas las sesiones y refresh tokens activos** del usuario para mitigar posibles sesiones comprometidas.

---

## 4. Usuarios de Demostración Sembrados

| Rol | Correo | Contraseña por Defecto | Nombre |
|---|---|---|---|
| `teacher` | `profesor@una.cr` | `Profesor123!` | Docente de prueba |
| `student` | `estudiante@est.una.ac.cr` | `Estudiante123!` | Estudiante de prueba |
| `admin` | `admin@una.cr` | `Admin123!` | Administrador ProfeLink |
