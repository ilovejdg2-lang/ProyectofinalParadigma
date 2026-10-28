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
