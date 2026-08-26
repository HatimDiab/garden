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
docker compose -f docker-compose.traefik.yml up -d   # Traefik on :80 / :443
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
