# Close Project 2 rubric gaps
Branch: codex/rubric-closeout from main ebbe61a. Delivery: ask-on-risk; no publication or production mutation without separate consent. Runner: Node 22, Jest, Nest build; documentation readback.
Forecast: approximately 300 authored lines excluding generated lockfile churn; revise as work is observed.

## Specs
- S1. User request: "entonces vamos con las cosas que nos faltan". Scope: close the gaps identified in the current rubric audit without claiming unobserved evidence.
- S2. Professor requirement: "Cada API debe contar con su OpenAPI / Scalar". Acceptance: authentication exposes OpenAPI JSON and Scalar while preserving existing /docs behavior; focused test, auth test suite and build.
- S3. Professor requirement: "diagramas de clases y de datos". Acceptance: the data-model diagram reflects the current minigames columns and enum, with structural comparison to the Prisma schema.
- S4. Professor requirement: "Prueben el flujo desde distintos dispositivos". Acceptance: produce a repeatable, truthful multi-device verification procedure and record evidence only when actually observed; do not relabel Node processes on one machine as physical devices.
- S5. Professor requirement: "Publiquen las imágenes del equipo en Docker Hub". Acceptance: publish only after the user supplies/authorizes the Docker Hub namespace and publishing credential/session; verify image digests and pullability. Until then, document the blocker honestly.
- S6. Professor requirement: oral defense/demo, 5 of 40 points. Acceptance: prepare a concise defense runbook grounded in verified features and evidence; actual grading remains unverified.

## Tasks
- T1 [S2] inline, implementation complete in 08fbe24: added Scalar/OpenAPI with /docs and /docs-json preserved; Node 22 Jest/build and live route smoke passed. Production verification remains pending deployment (Risk: item 5, dependency).
- T2 [S3] inline, complete in 0692a56: data diagram includes eight minigame fields and EstadoSesion.minijuego; structural comparison passed.
- T3 [S4,S6] inline, partial in 1f2ca9a: defense runbook prepared and team reports successful physical-device gameplay with matching questions/timers; supporting screenshots and device/network/browser metadata remain pending, and professor's grading is unknown.
- T4 [S5] inline, complete: public Docker Hub images for auth-service, actividades, and frontend were anonymously pull-verified with tags `:ebbe61a` and `:latest`; they were built from base commit `ebbe61a` and do not include this branch's later changes.

## Log
- L1 (2026-11-11): "entonces vamos con las cosas que nos faltan"
- L2 (2026-11-11): Current main ebbe61a audit: authentication has Swagger but not Scalar; docs say no Docker Hub images published; multi-device evidence is one-machine Node clients; data diagram predates minigames fields. Production app exists, but rubric completion cannot be claimed.
- L3 (2026-11-11): T1 RED: missing configuration module. Independent verifier found /docs-json regression (404); a new regression test observed RED, then separate JSON-only Swagger setup restored it. Node 22 Jest: 17 passed, 1 skipped; Node 22 build passed; live probe returned 200 for /docs, /docs-json, /openapi.json and /reference. Commit 08fbe24. Docker Desktop daemon unavailable; no image build.
- L4 (2026-11-11): T2 structural check compared eight new minigame field names and EstadoSesion.minijuego between Prisma schema and Mermaid document; all found. Commit 0692a56.
- L5 (2026-11-11): T3 documentation readback confirms guide distinguishes a physical-device run from prior one-PC Node clients and does not claim unobserved execution. Commit 1f2ca9a. T4 remains blocked on Docker Hub namespace and explicit publication authorization.
- L6 (2026-11-11): Native review approved and acknowledged for target sha256:1eb55a418e9aac6160a9f32afeeee72bd69a5c5e0831dc809fa9a646e3c715e6; three lenses returned no findings. Receipt is informational; no publish, push, merge, or deploy authority granted.
- L7 (2026-11-11): User authorized continuing the remaining closeout. Reconciled the matrix/runbook with the user's report that physical-device gameplay worked and with verified public Docker Hub tags. Kept the physical test as team-reported because screenshots/context were not supplied. The branch has five commits ahead of origin/main; Auth Scalar remains unmerged and production verification is pending.
