# ProfeLink

Plataforma universitaria de cuestionarios interactivos de verdadero o falso.

## Arquitectura de Módulos

```text
ProyectofinalParadigma/
├── autenticacion/        API independiente de autenticación, emisión JWT RS256 y JWKS (puerto 5001)
├── actividades/          API de cuestionarios, preguntas, salas y resultados (puerto 5002)
│                         y canal de tiempo real WebSocket (/canal)
├── frontend/             Aplicación React + TypeScript (puerto 5173)
├── cliente-adicional/    Cliente externo de demostración para consumo sin código fuente
├── docs/                 Especificaciones (auth.md, eventos-en-vivo.md, decisiones de arquitectura)
└── docker-compose.yml    Orquestación de servicios en contenedores
```

---

## 1. Cuentas de Demostración Sembradas

Las cuentas de demostración son administradas por el equipo para la presentación. No publiques contraseñas en este repositorio; solicita las credenciales de prueba por un canal privado.

---

## 2. Puesta en Marcha Local

### A. Servicio de Autenticación (`auth-service`)
```bash
cd autenticacion
npm install
npm run prisma:generate
npm run build
npm run start:dev
```
- API REST: `http://localhost:5001`
- Claves públicas JWKS: `http://localhost:5001/.well-known/jwks.json`
- Swagger Docs: `http://localhost:5001/docs`
- Pruebas unitarias: `npm test`

### B. Servicio de Actividades y Canal en Vivo (`actividades`)
```bash
cd actividades
npm install
npm run build
npm run start:dev
```
- API REST: `http://localhost:5002`
- Canal WebSocket en vivo: `ws://localhost:5002/canal?codigo=ABCDEF`; el JWT del navegador se envía mediante `Sec-WebSocket-Protocol`, nunca como parámetro de URL.
- Pruebas unitarias: `npm test`

### C. Frontend Web (`frontend`)
```bash
cd frontend
npm install
npm run dev
```
- Interfaz web: `http://localhost:5173`

### D. Cliente Adicional (`cliente-adicional`)
Consulta su [guía de uso](cliente-adicional/README.md) para las pruebas REST independientes. Su ejemplo WebSocket aún requiere alinearse con el protocolo autenticado descrito en [eventos en vivo](docs/eventos-en-vivo.md); no envíes JWT en parámetros de URL.

---

## 3. Despliegue con Docker Compose

El siguiente comando inicia la configuración local de desarrollo:

```bash
docker compose up --build
```

La configuración preparada para el Droplet de DigitalOcean, Caddy, HTTPS y los subdominios se documenta en [Preparación del despliegue en DigitalOcean](docs/despliegue-digitalocean.md). Esa guía no implica que el proyecto ya esté publicado.

---

## 4. Documentación Detallada

- [Cierre de Persona 5: arquitectura, pruebas y pendientes](docs/entrega-persona-5.md)
- [Flujos de Autenticación y Criptografía RS256](docs/auth.md)
- [Protocolo de Eventos en Tiempo Real](docs/eventos-en-vivo.md)
- [Registro de Decisiones de Arquitectura (ADR)](docs/decisiones/arquitectura.md)
- [Preparación del despliegue en DigitalOcean](docs/despliegue-digitalocean.md)
