# Cliente Adicional de Demostración

Página web estática que demuestra el consumo externo e independiente de las APIs de **ProfeLink**:
1. `auth-service` (puerto `5001`): Registro, Login, Rotación de Refresh Token (7 días) y consulta de perfil mediante JWT firmado asimétricamente con **RS256**.
2. `actividades` (puerto `5002`): Consulta de catálogo público, cuestionarios protegidos para docentes (`/mis-cuestionarios`) e historial de resultados.
3. Canal WebSocket en vivo (`ws://localhost:5002/canal?codigo=ABCDEF`): Conexión directa y recepción de eventos en tiempo real.

## Uso

Simplemente abre `index.html` en cualquier navegador web o sírvelo con:

```bash
npx serve cliente-adicional
```

## Verificación concurrente de solo lectura

Con `auth-service` y `actividades` ejecutándose localmente, puedes verificar su disponibilidad y consultar el catálogo desde un cliente Node independiente:

```bash
node --test cliente-adicional/prueba-carga-lectura.test.mjs
node cliente-adicional/prueba-carga-lectura.mjs
```

La prueba envía 20 solicitudes `GET` con concurrencia máxima de 4 y comprueba `/health/ready`, `/salud`, `/banco-preguntas` y `/cuestionarios`. No registra, modifica ni elimina datos. Por seguridad, el cliente solo acepta destinos `localhost`, `127.0.0.1` o `::1`.

Para ajustar una ejecución local, usa `AUTH_URL`, `ACTIVITIES_URL`, `CONCURRENCY` e `ITERATIONS`. La concurrencia permitida es de 1 a 10 y las iteraciones de 4 a 100; no conviene aumentar esos límites para una comprobación de desarrollo.
