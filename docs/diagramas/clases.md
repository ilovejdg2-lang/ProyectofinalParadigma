# Diagrama de clases

Este diagrama describe las clases que el código registra hoy. El diagrama de despliegue ya está en [entrega-persona-5.md](../entrega-persona-5.md) y no se repite aquí.

`actividades` no importa clases de `autenticacion`. Recibe un JWT y valida la firma con la clave pública publicada en el JWKS. La clave privada y las tablas de usuarios permanecen en el servicio de autenticación.

## Autenticación

`AuthModule` registra `AlmacenUsuariosHibrido` como `AlmacenUsuarios`. Si PostgreSQL responde, ese almacén usa el esquema `auth_service`. Si no hay conexión, delega en `AlmacenUsuariosMemoria`. `VerificadorIdentidadPendiente` existe en el código de actividades, pero `AutenticacionModule` no lo registra: la implementación activa es `VerificadorIdentidadJwt`.

```mermaid
classDiagram
  class AuthController {
    +registrarStandard()
    +loginStandard()
    +refrescar()
    +logoutStandard()
    +jwks()
  }
  class AuthService {
    +registrar()
    +iniciarSesion()
    +refrescar()
    +cerrarSesion()
    +obtenerPerfil()
  }
  class KeysService {
    +firmarAccessToken()
    +obtenerJwks()
    +verificarAccessToken()
  }
  class AlmacenUsuarios {
    <<abstract>>
    +buscarPorEmail()
    +crearUsuario()
    +guardarRefreshToken()
  }
  class AlmacenUsuariosMemoria
  class AlmacenUsuariosHibrido
  class PrismaAuth

  AuthController --> AuthService
  AuthController --> KeysService
  AuthService --> AlmacenUsuarios
  AuthService --> KeysService
  AlmacenUsuarios <|-- AlmacenUsuariosMemoria
  AlmacenUsuarios <|-- AlmacenUsuariosHibrido
  AlmacenUsuariosHibrido --> PrismaAuth
  AlmacenUsuariosHibrido --> AlmacenUsuariosMemoria

  note for PrismaAuth "PostgreSQL, esquema auth_service"
```

## Actividades

`SesionesJuegoModule` registra `AvisoSesionesCanal` como `AvisoSesiones`. Después de confirmar una transacción, el canal emite solo a los sockets de esa sala. `CanalWebSocketService` acepta el JWT en `Sec-WebSocket-Protocol` (`profelink` y `profelink-bearer.<JWT>`) y consulta `AUTH_JWKS_URL`. No abre la base de usuarios.

`ImagenesModule` registra `AlmacenSupabase` como `AlmacenImagenes`. PostgreSQL guarda la metadata; el binario sale a Supabase Storage. `PrismaActividades` usa el esquema `public` y, si `DIRECT_URL` no está configurada, las lecturas de desarrollo caen en `AlmacenPersistenciaLocal`.

```mermaid
classDiagram
  class CuestionariosController
  class CuestionariosService
  class ImagenesController
  class ImagenesService
  class AlmacenImagenes {
    <<abstract>>
  }
  class AlmacenSupabase
  class SesionesJuegoController
  class SesionesJuegoService
  class AvisoSesiones {
    <<abstract>>
  }
  class AvisoSesionesCanal
  class CanalWebSocketService
  class ResultadosController
  class ResultadosService
  class BancoPreguntasController
  class BancoPreguntasService
  class IdentidadGuard
  class VerificadorIdentidad {
    <<abstract>>
  }
  class VerificadorIdentidadJwt
  class PrismaActividades
  class AlmacenPersistenciaLocal

  CuestionariosController --> CuestionariosService
  CuestionariosService --> PrismaActividades
  ImagenesController --> ImagenesService
  ImagenesService --> AlmacenImagenes
  AlmacenImagenes <|-- AlmacenSupabase
  SesionesJuegoController --> SesionesJuegoService
  SesionesJuegoService --> PrismaActividades
  SesionesJuegoService --> AvisoSesiones
  AvisoSesiones <|-- AvisoSesionesCanal
  AvisoSesionesCanal --> CanalWebSocketService
  CanalWebSocketService --> VerificadorIdentidad
  IdentidadGuard --> VerificadorIdentidad
  VerificadorIdentidad <|-- VerificadorIdentidadJwt
  ResultadosController --> ResultadosService
  ResultadosService --> PrismaActividades
  BancoPreguntasController --> BancoPreguntasService
  BancoPreguntasService --> PrismaActividades
  PrismaActividades --> AlmacenPersistenciaLocal : respaldoLocal

  note for PrismaActividades "PostgreSQL, esquema public"
```
