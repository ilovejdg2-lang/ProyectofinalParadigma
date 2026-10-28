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

| Rol | Correo | Contraseña por Defecto | Permisos |
|---|---|---|---|
| **Docente** (`teacher`) | `profesor@una.cr` | `Profesor123!` | Crear/editar cuestionarios y preguntas, crear y controlar salas en vivo |
| **Estudiante** (`student`) | `estudiante@est.una.ac.cr` | `Estudiante123!` | Unirse a salas, enviar respuestas en vivo, ver clasificación |
| **Administrador** (`admin`) | `admin@una.cr` | `Admin123!` | Administrar políticas de dominio e instituciones |

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
- Canal WebSocket en vivo: `ws://localhost:5002/canal?codigo=ABCDEF`
- Pruebas unitarias: `npm test`

### C. Frontend Web (`frontend`)
```bash
cd frontend
npm install
npm run dev
```
- Interfaz web: `http://localhost:5173`

### D. Cliente Adicional de Demostración (`cliente-adicional`)
Abre `cliente-adicional/index.html` en el navegador para probar el login, la rotación de refresh tokens, el consumo con Bearer token y el WebSocket de salas.

---

## 3. Despliegue con Docker Compose

```bash
docker compose up --build
```

---

## 4. Documentación Detallada

- [Flujos de Autenticación y Criptografía RS256](file:///docs/auth.md)
- [Protocolo de Eventos en Tiempo Real](file:///docs/eventos-en-vivo.md)
- [Registro de Decisiones de Arquitectura (ADR)](file:///docs/decisiones/arquitectura.md)
