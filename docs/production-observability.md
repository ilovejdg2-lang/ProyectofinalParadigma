# Production traces and Grafana access

The production Activities service exports its existing OpenTelemetry traces to Tempo over the private `profelink-observability` Docker network. Grafana is published only on the Droplet loopback interface; do not add a public Caddy route or open port 3000/4318 in UFW.

## First-time setup on the Droplet

Run these commands in the SSH session as `deploy` from `~/profelink`. The admin password is generated on the Droplet and must not be committed or pasted into chat:

```bash
install -d -m 700 ~/profelink/secrets
umask 077
openssl rand -base64 36 > ~/profelink/secrets/grafana_admin_password
# Grafana runs as UID 472; the parent directory stays private to deploy.
chmod 644 ~/profelink/secrets/grafana_admin_password
```

The file itself is readable by the Grafana container, while the host directory remains mode `700`. If the file is regenerated later, preserve those permissions.

The candidate overlay is staged as `~/profelink/docker-compose.prod.observability.yml` so the existing home-directory copy is preserved. Back up the active configuration, then install the reviewed overlay into the fixed app configuration location used by the deploy service. Keep the source and remote copies in sync when changing Activities' OTLP environment:

```bash
backup="/etc/profelink/docker-compose.prod.yml.before-observability.$(date -u +%Y%m%d%H%M%S)"
sudo cp -a /etc/profelink/docker-compose.prod.yml "$backup" && \
  sudo install -m 644 ~/profelink/docker-compose.prod.observability.yml /etc/profelink/docker-compose.prod.yml
echo "Backup: $backup"
```

Create the shared private network once, then start the separate observability project and recreate Activities so its SDK begins exporting spans. The network is external to both Compose projects and is not removed by either project going down:

```bash
sudo docker network inspect profelink-observability >/dev/null 2>&1 || \
  sudo docker network create profelink-observability

sudo docker compose -p profelink-observability \
  --project-directory /home/deploy/profelink \
  -f /home/deploy/profelink/docker-compose.observability.prod.yml \
  up -d

sudo docker compose -p proyectofinalparadigma \
  --env-file /home/deploy/profelink/.env.production \
  -f /etc/profelink/docker-compose.yml \
  -f /etc/profelink/docker-compose.prod.yml \
  up -d --no-deps --no-build --force-recreate actividades
```

Confirm both observability containers and Activities are running, then check:

```bash
sudo docker compose -p profelink-observability \
  --project-directory /home/deploy/profelink \
  -f /home/deploy/profelink/docker-compose.observability.prod.yml ps
sudo docker compose -p proyectofinalparadigma \
  --env-file /home/deploy/profelink/.env.production \
  -f /etc/profelink/docker-compose.yml \
  -f /etc/profelink/docker-compose.prod.yml ps actividades
curl -fsS http://127.0.0.1:5002/salud
curl -fsS http://127.0.0.1:3000/api/health
```

## Open Grafana privately

From PowerShell on your computer, keep this SSH tunnel open:

```powershell
ssh -N -L 3000:127.0.0.1:3000 -i "$HOME\.ssh\profelink_do" deploy@165.245.235.241
```

Visit `http://localhost:3000` and sign in as `admin`. Read the initial password only in the Droplet's SSH session with `cat ~/profelink/secrets/grafana_admin_password`; do not send it to chat or store it in GitHub. Change it after first login. Select the provisioned **Tempo** data source and use **Explore** to query recent traces for service `actividades`.

## Operational limits

- Tempo uses a single-node local Docker volume (`profelink-tempo-data`). This survives container replacement, but is not a host-loss backup or high-availability design. Grafana recommends object storage for production-scale Tempo workloads.
- Tempo's default block retention is 14 days. Confirm disk headroom periodically (`df -h /`, `docker stats --no-stream`) and adjust the retention before the trace volume grows materially.
- Grafana data is persisted in `profelink-grafana-data`; its admin password file is separate and private on the Droplet.
- Neither OTLP nor Tempo's query API has a published host port. Only the Grafana UI binds to `127.0.0.1:3000` and is reachable remotely through SSH port forwarding.
