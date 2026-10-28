# Registro de Decisiones de Arquitectura (ADR)

Este documento justifica las decisiones técnicas y de diseño tomadas para la separación de servicios, criptografía, autorización y tiempo real en **ProfeLink**.

---

## 1. Despliegue de `auth-service` como Servicio Independiente

### Contexto
El sistema requiere autenticación de usuarios y gestión de actividades interactivas (cuestionarios y salas). Existían dos alternativas:
1. Modelo monolítico: una sola aplicación con tablas de usuarios, cuestionarios y salas.
2. Servicios desacoplados: `auth-service` como proveedor de identidad (IdP) y `actividades` como API de recursos protegidos.

### Decisión
Adoptar **dos servicios desacoplados**. `auth-service` se encarga exclusivamente de la identidad, credenciales, políticas de dominio y emisión de tokens. `actividades` consume tokens sin acceso directo a la base de datos de usuarios.

### Beneficios
- **Autonomía y Despliegue Independiente**: `auth-service` puede evolucionar, escalar o rotar claves sin reiniciar ni redistribuir `actividades`.
- **Principio de Mínimo Privilegio**: La base de datos de actividades no guarda contraseñas, hashes ni refresh tokens.
- **Auditoría Clara de Audiencia**: El access token emitido especifica explícitamente `aud: profelink-actividades`.

### Costos / Mitigaciones
- Necesidad de validación por red o clave pública. Se mitiga implementando el estándar **RS256 con JWKS** público en memoria o cacheado.

---

## 2. Criptografía Asimétrica: RS256 vs HS256

### Contexto
En arquitecturas distribuidas, validar tokens firmados con algoritmos simétricos (`HS256`) requiere que todos los servicios compartan la misma clave secreta (`JWT_SECRET`).

### Decisión
Utilizar **RS256** (RSA Signature with SHA-256):
- La clave privada reside estrictamente dentro de `auth-service`.
- La clave pública se expone abiertamente a través de `/.well-known/jwks.json`.
- `actividades` valida la firma usando únicamente la clave pública.

### Beneficios
- **Seguridad**: Si el servicio de actividades fuera vulnerado, el atacante no podría falsificar ni firmar nuevos tokens.
- **Rotación sin tiempo de inactividad**: El encabezado `kid` permite introducir nuevas claves públicas en el JWKS manteniendo la vigencia de las anteriores.

---

## 3. Modelo Escalable de Dominios de Correo

### Contexto
El sistema debía permitir diferenciar docentes de estudiantes. Inicialmente se consideró verificar `if (email.endsWith('@una.cr'))` directamente en el código fuente.

### Decisión
Crear la entidad `EmailDomainPolicy` en base de datos:
- `una.cr` → `teacher` (docente).
- `est.una.ac.cr` → `student` (estudiante).
- Dominios externos → `student` en modo abierto (`open`), o rechazo en modo institucional (`domains-only`).

### Beneficios
- **Cero código para nuevas instituciones**: Para incorporar un nuevo colegio, universidad o facultad, solo se inserta una fila en la base de datos sin necesidad de desplegar una nueva versión.
- **Prevención de escalamiento de privilegios**: El rol nunca se acepta desde el cuerpo de la petición del cliente; siempre es calculado y verificado por el servidor.

---

## 4. Rotación de Refresh Tokens con Detección de Reutilización

### Contexto
Para evitar que el usuario deba reingresar credenciales frecuentemente sin mantener access tokens de larga vida (lo cual representa un riesgo de seguridad), se requiere un mecanismo de renovación seguro.

### Decisión
- **Access tokens cortos**: 15 minutos de validez.
- **Refresh tokens de 7 días**: Opcionales, almacenados hasheados con SHA-256 y asociados a una `familyId`.
- **Rotación en cada uso**: Cada llamada a `/refresh` emite un nuevo refresh token e invalida el anterior.
- **Detección de Reutilización**: Si un refresh token ya revocado es presentado nuevamente, se detecta un posible robo de credenciales y se revoca toda la familia de sesiones asociadas.
