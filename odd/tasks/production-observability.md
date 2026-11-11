# Production traces on the DigitalOcean Droplet
Branch: `codex/production-observability`. Delivery: `ask-on-risk`; test runner: Docker Compose validation plus production smoke checks.

## Specs

### S1 — View production traces securely
User request: “siento que lo mejor es tenerlo en el droplet, ya que lo que queremos ver son las trazas de producción y el profe le dijo eso a un grupo”. The user authorized configuring observability on Droplet `165.245.235.241` as `deploy` using the existing `profelink_do` SSH key, with persistent storage, internal OTLP, Grafana available only through an SSH tunnel, and restarting Activities. User confirmed there are no active game sessions.

Acceptance: production Activities exports its existing OpenTelemetry spans to Tempo over the private Docker network; Grafana has a provisioned Tempo datasource; Tempo and Grafana data survive container recreation; Grafana binds only to `127.0.0.1:3000`; OTLP ports are not published to the host. Check: Compose config validation, service health, secured Grafana access, and an observed production trace.

### S2 — Bound the single-droplet operational footprint
Assumption: use a single-node monolithic Tempo with a named local volume and Tempo's 14-day default block retention for this low-volume academic deployment. This is persistent across container replacement, not high availability or a backup; Grafana recommends object storage for production workloads. Keep resource limits compatible with the observed Droplet headroom.

Acceptance: no external Grafana/OTLP exposure, service/resource state is checked after rollout, and the single-node/local-storage limitation is documented.

## Tasks
- T1 (S1-S2) — Add production observability Compose/config and operational notes; inline; complete; commits `ac9a8fd` and `25fbb2a`.
- T2 (S1-S2) — Deploy the config to the authorized Droplet and verify production traces; inline; pending; commit pending.

## Log
- L1 User request verbatim: “siento que lo mejor es tenerlo en el droplet, ya que lo que queremos ver son las trazas de producción y el profe le dijo eso a un grupo”. Authorization: “lo autorizo, y no te preocupes no hay partidas activas ahorita”.
- L2 Verified `origin/main` is `407045ba`; local checkout remains untouched. Droplet `profelink-demo` has 1.9 GiB RAM, ~1.3 GiB available, no swap, and 34 GiB disk available. Running app containers use ~255 MiB total (Activities ~104.5 MiB, auth ~148 MiB, frontend ~2.6 MiB) and were healthy with near-zero CPU. Production Compose currently routes no OTLP endpoint; local observability overlay preloads `actividades/dist/instrumentation.js` and sends OTLP/HTTP to the local-only LGTM demo bundle.
- L3 Official Grafana docs describe Docker Compose examples as testing/development and recommend object storage for production. Given the user's single-Droplet academic scope and the measured low application footprint, use local named-volume storage as an explicit limited single-node compromise; no existing telemetry data is overwritten.
- L4 Next: implement and validate production Compose/config in this clean worktree, then deploy through the authorized SSH identity; no push or merge is authorized by this request.
- L5 Independent verification found first-time observability startup would fail because both stacks treat the shared Docker network as external but setup did not create it. Corrected the Activities overlay to declare the network external and documented an idempotent `docker network inspect || docker network create` bootstrap before either stack starts. Run the targeted verifier recheck and Compose validation before delivery.
- L6 Verification: Compose config validation passed for the application and observability stacks; `git diff --check` passed; the independent verifier confirmed Tempo 3.1.1 config verification and baseline behavior preservation, and its targeted recheck proved network bootstrap idempotence plus successful dry-runs for both stacks. Grafana datasource YAML had structural readback only; its parser/runtime check and live production trace remain pending. No remote deploy was run.
- L7 Work-unit `ac9a8fd` was approved by the native review and acknowledged. For rollout, staged the new app overlay under a separate remote filename to preserve the existing home-directory copy and generated the Grafana password on the Droplet without displaying it. Updated the guide to back up the active `/etc/profelink/docker-compose.prod.yml` before install. The compose services have not yet been started.
