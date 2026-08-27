# Deploying on a Raspberry Pi (public HTTPS)

Puts the garden behind Traefik with automatic Let's Encrypt TLS, so the admin
login and `garden_session` cookie only ever travel over HTTPS.

## 0. Prerequisites (the parts that actually bite)

- **64-bit Raspberry Pi OS (arm64).** The image compiles native modules
  (`better-sqlite3`, `sharp`) in-container, so 64-bit is strongly recommended.
  A Pi 4/5 with ≥ 2 GB RAM runs `next build` comfortably.
- **A domain name** with an **A record → your public IP** (e.g.
  `garden.example.com`). Let's Encrypt cannot issue a cert for a bare IP or a
  `.local` / `.localhost` name.
- **Ports 80 and 443 reachable from the internet** — forward them on your
  router to the Pi. Port 80 is required for the Let's Encrypt HTTP-01 challenge.
- **Dynamic home IP?** Run a dynamic-DNS updater so the A record follows it.

> **CGNAT / blocked port 80?** Many home ISPs use carrier-grade NAT or block 80,
> which breaks both port-forwarding and HTTP-01. See *Alternative* below.

## 1. Configure

```bash
cp .env.example .env
# set at minimum:
#   ADMIN_PASSWORD=...                  # admin login password
#   GARDEN_HOST=garden.example.com      # your domain
#   ACME_EMAIL=you@example.com          # Let's Encrypt expiry notices
```

## 2. Start the reverse proxy (once)

The Traefik stack attaches to the external `web` network, so that has to exist
first. This form is safe to re-run — plain `docker network create web` errors
once the network is there:

```bash
docker network inspect web >/dev/null 2>&1 || docker network create web
docker compose -p traefik -f docker-compose.traefik.yml up -d   # Traefik on :80 / :443
```

Or skip both steps: `make start-traefik` ensures the network, starts Traefik,
and then runs `make start-production` for you.

## 3. Start the app

```bash
make start-production
```

Open `https://garden.example.com`. Traefik fetches a real certificate on the
first request (~30 s); `http://` is permanently redirected to `https://`, and an
HSTS header is sent.

## File ownership on `./data` (first-run gotcha)

SQLite and the uploads live in `./data`, bind-mounted to `/data`. A bind mount
takes the **host** directory's ownership, so whichever uid the container runs as
must own `./data` — a mismatch fails at startup with:

```
SqliteError: unable to open database file   (SQLITE_CANTOPEN)
```

and the container restart-loops. This never reproduces on macOS, where Docker
Desktop's filesystem layer papers over ownership; it bites on real Linux hosts
like the Pi.

The container therefore runs as `PUID:PGID` from `.env`, defaulting to
`1000:1000` — the first login user on Raspberry Pi OS, Debian and Ubuntu. Check
yours and set it if it differs:

```bash
id -u    # -> PUID
id -g    # -> PGID
```

`make start` / `make start-production` create `./data` themselves so it belongs
to you rather than to Docker. If a previous run already left it root-owned:

```bash
sudo chown -R "$(id -u):$(id -g)" data
```

## Running as a service user with auto-start

For an always-on Pi, give the app its own unprivileged account and let systemd
start it at boot.

**What runs as what.** The systemd units run as root, because they talk to the
Docker daemon. The *application* does not: `docker-compose.yml` sets
`user: "${PUID}:${PGID}"`, so the container runs as the unprivileged account
that owns the files.

Do **not** instead run the units as that account and add it to the `docker`
group. Membership in `docker` is equivalent to root on the host — a member can
start a container that bind-mounts `/` — so it would hand the service account
full privileges while looking like a hardening step.

### 1. Create the account

```bash
sudo groupadd --system www 2>/dev/null || true
sudo useradd --system --gid www --home-dir /opt/garden \
     --shell /usr/sbin/nologin karl
id karl        # note the uid, and the www gid
```

`--system` plus `nologin` means no password and no interactive login: `karl`
exists only to own files and run the container.

### 2. Move the project into place

```bash
sudo git clone https://github.com/HatimDiab/garden.git /opt/garden
sudo cp ~/garden/.env /opt/garden/.env       # keep your settings
sudo cp -a ~/garden/data /opt/garden/        # keep database + uploads
sudo chown -R karl:www /opt/garden
```

### 3. Point the container at that account

```bash
sudo sed -i '/^PUID=/d;/^PGID=/d' /opt/garden/.env
printf 'PUID=%s\nPGID=%s\n' "$(id -u karl)" "$(getent group www | cut -d: -f3)" \
  | sudo tee -a /opt/garden/.env
```

Production also needs these in `.env`, or Traefik will not serve anything:

```
GARDEN_HOST=garden.example.com     # a real domain resolving to this Pi
ACME_EMAIL=you@example.com
```

### 4. Install and enable both units

The app is served *through* Traefik, so there are two stacks and two units.
`garden.service` declares `Requires=`/`After=traefik.service`, so enabling both
is enough — systemd handles the ordering at boot.

```bash
sudo cp /opt/garden/deploy/traefik.service /etc/systemd/system/
sudo cp /opt/garden/deploy/garden.service  /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now traefik.service garden.service
```

### 5. Verify

```bash
systemctl status traefik garden --no-pager
docker inspect garden-diary --format 'runs as: {{.Config.User}}'   # karl's uid:gid
docker ps
```

Then reboot once and confirm it comes back on its own:

```bash
sudo reboot
# after it returns:
systemctl is-enabled traefik garden     # enabled / enabled
systemctl is-active  traefik garden     # active / active
```

### Day-to-day

```bash
sudo systemctl start|stop|restart garden
sudo systemctl reload garden         # rebuild the image and restart
journalctl -u garden -f              # unit-level logs
docker compose -f /opt/garden/docker-compose.yml \
               -f /opt/garden/docker-compose.production.yml logs -f
```

`make backup` / `make restore` now need `sudo`, since `/opt/garden/data` belongs
to `karl:www` rather than to you.

### Two compose projects, one directory

Both stacks live in `/opt/garden`, so by default they would share the compose
project name `garden` and each would consider the other's containers orphans.
The Traefik unit therefore passes `-p traefik`, and the app unit deliberately
omits `--remove-orphans`. Keep both if you edit the units.

### Production serves by hostname only

`docker-compose.production.yml` publishes **no host port** (`ports: !override []`)
and Traefik routes on `Host(\`${GARDEN_HOST}\`)`. So in production the Pi's LAN
address is not a way in — `http://192.168.x.x:3000` will be refused by design,
and only `https://${GARDEN_HOST}` works. That needs a public domain pointed at
this Pi and port 80 reachable for the Let's Encrypt HTTP-01 challenge.

If you want LAN access instead, use `make start` (or a unit whose `ExecStart`
drops the `-f docker-compose.production.yml`), which publishes port 3000.

## Building on the Pi

`make start-production` builds locally (slow first time: native compiles +
`next build`). On a low-RAM Pi, build on a faster arm64 host and ship the image:

```bash
docker build --platform linux/arm64 -t garden-diary:latest .
docker save garden-diary:latest | gzip > garden.tgz
# copy to the Pi, then:
gunzip -c garden.tgz | docker load
```

## Alternative: Cloudflare Tunnel (no port-forwarding)

If you're behind CGNAT, can't open 80/443, or don't want to expose your home IP,
a Cloudflare Tunnel is the cleaner option: the Pi makes an outbound connection to
Cloudflare, which terminates TLS at the edge — no inbound ports, no Let's Encrypt
on the Pi, home IP stays hidden. Say the word and I'll swap Traefik for a
`cloudflared` service.

## Security notes for a publicly exposed Pi

- `/admin/login` is the only gate and it's now internet-reachable — use a strong
  `ADMIN_PASSWORD`.
- Traefik mounts the Docker socket read-only (standard, but a privileged
  surface); a docker-socket-proxy in front of it is the next hardening step.
- Keep the Pi OS and these images patched.
