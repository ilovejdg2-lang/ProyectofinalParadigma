# Cliente adicional de demostración

Página estática que consume las APIs sin usar el código del frontend React:

1. `auth-service`: login, rotación del refresh token y lectura del perfil con JWT RS256.
2. `actividades`: catálogo público, cuestionarios del docente e historial.
3. Canal en vivo: `ws://<host>/canal?codigo=<CODIGO>`. El JWT no va en la URL. El navegador lo envía en `Sec-WebSocket-Protocol` como `profelink` y `profelink-bearer.<JWT>`. El servidor solo acepta al anfitrión o a un participante ya registrado en esa sala.

## Cómo probarlo

1. Tené en marcha la instalación local (`scripts/iniciar.ps1`) o los servicios que quieras apuntar. Para producción, usá las URLs públicas y una cuenta recibida por el canal privado. No pegues la contraseña en el archivo.
2. Serví la carpeta para evitar restricciones de `file://`:

```bash
npx serve cliente-adicional
```

3. Completá las URLs, el correo y la contraseña. Iniciá sesión.
4. Probá `GET /cuestionarios`, `GET /mis-cuestionarios` y `GET /resultados`.
5. Entrá a una sala de la que esa cuenta sea anfitrión o participante e indicá el código. El estado debe pasar a conectado sin que el token aparezca en la URL del socket.

## Comprobación del protocolo

```bash
node --test cliente-adicional/protocolo-canal.test.mjs
```

Esa prueba lee `index.html` y confirma que el ejemplo usa el subprotocolo y que no queda `access_token` en la página. No abre un WebSocket real.

## Lecturas concurrentes

Con los dos servicios en localhost:

```bash
node --test cliente-adicional/prueba-carga-lectura.test.mjs
node cliente-adicional/prueba-carga-lectura.mjs
```

El runner hace solo `GET`, limita el destino a loopback y no debe apuntarse a producción.
