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

## Rootless Docker: karl owns everything

The strongest option, and the one this repo's units are written for: a `dockerd`
running as an unprivileged `karl` account in its own user namespace, started at
boot by systemd's *user* manager.

Nothing here runs as root, and **karl is not in the `docker` group**. That group
is root-equivalent on the host — a member can `docker run -v /:/host` and take
the machine — so joining it would undo the whole point. The common
`User=karl` + docker-group pattern does not reduce privilege; it makes karl
permanently root-capable.

### 1. Provision the host (one command)

Clone the repo somewhere first, then:

```bash
sudo make provision-rootless
```

Override the account if you want different names:

```bash
sudo make provision-rootless SERVICE_USER=karl SERVICE_GROUP=www
```

Every step is guarded, so re-running it is safe. It does:

- installs `uidmap`, `dbus-user-session`, `docker-ce-rootless-extras`
- creates the `www` group and the `karl` account — real home (rootless needs
  `~/.local/share/docker` and `~/.config/systemd/user`), password locked, so no
  interactive login
- adds subordinate uid/gid ranges (`100000-165535`) for the user namespace
- `loginctl enable-linger karl` — **this is what makes the units start at boot**
  without anyone logging in
- writes `net.ipv4.ip_unprivileged_port_start=80` to `/etc/sysctl.d/99-garden.conf`,
  because a rootless daemon cannot bind :80/:443 otherwise. Note this lets any
  unprivileged process bind from 80 up; the narrower option is
  `setcap cap_net_bind_service=+ep $(which rootlesskit)`
- runs `dockerd-rootless-setuptool.sh install` as karl and enables karl's
  `docker` user service

Verify:

```bash
sudo -u karl -i docker info --format '{{.SecurityOptions}}'   # expect rootless
```

### 2. Project into place

```bash
sudo git clone https://github.com/HatimDiab/garden.git /opt/garden
sudo cp ~/garden/.env /opt/garden/.env      # keep your settings
sudo cp -a ~/garden/data /opt/garden/       # keep database + uploads
sudo chown -R karl:www /opt/garden
```

### 3. Configure `.env` for rootless

**PUID/PGID must be `0` here — this is the counter-intuitive part.** In a
rootless daemon the container's uid 0 is mapped to the host account running
dockerd, i.e. karl. So uid 0 *inside* the container is karl *outside*, and
files on the bind mount come out owned by karl. Setting PUID to karl's real
numeric uid would instead map to a subordinate uid in the 100000+ range, and
the container could not write `./data`.

```bash
sudo -u karl tee -a /opt/garden/.env >/dev/null <<EOF
PUID=0
PGID=0
DOCKER_SOCK=/run/user/$(id -u karl)/docker.sock
GARDEN_HOST=garden.example.com
ACME_EMAIL=you@example.com
EOF
```

Delete any earlier `PUID=`/`PGID=` lines so each key appears once.
`DOCKER_SOCK` is what points the Traefik socket-proxy at karl's socket instead
of the system one.

### 4. Install and enable the units

```bash
sudo -u karl -i make -C /opt/garden install-service
```

That installs both units into `~karl/.config/systemd/user/`, reloads, and
enables them. It refuses to run as root, checks the rootless socket exists, and
warns if lingering is off.

### 5. Verify — including across a reboot

```bash
sudo -u karl -i make -C /opt/garden service-status
ps -eo user,comm | grep -E 'dockerd|node|traefik'    # all karl, no root
sudo reboot
# after it returns:
sudo -u karl -i systemctl --user is-active traefik garden
```

`ps` showing `karl dockerd` rather than `root dockerd` is the proof the model is
what you asked for.

### Day-to-day

```bash
sudo -u karl -i systemctl --user restart garden
sudo -u karl -i systemctl --user reload garden      # rebuild image, restart
sudo -u karl -i journalctl --user -u garden -f
sudo -u karl -i make -C /opt/garden uninstall-service
```

### Two compose projects, one directory

Both stacks live in `/opt/garden`, so by default they would share the compose
project name `garden` and each would treat the other's containers as orphans.
The Traefik unit passes `-p traefik`, and the app unit omits `--remove-orphans`.
Keep both if you edit the units.

### Production serves by hostname only

`docker-compose.production.yml` publishes **no host port** (`ports: !override []`)
and Traefik routes on `Host(\`${GARDEN_HOST}\`)`. The Pi's LAN address is not a
way in — `http://192.168.x.x:3000` is refused by design, and only
`https://${GARDEN_HOST}` works. That needs a public domain pointed at this Pi and
port 80 reachable for the Let's Encrypt HTTP-01 challenge.

For LAN access instead, drop `-f docker-compose.production.yml` from the unit's
`ExecStart` (or just use `make start`), which publishes port 3000.

### Rootless caveats worth knowing

- Overlay networking and some `sysctl`s are restricted; this stack needs neither.
- Bind mounts must live somewhere karl can read and write — `/opt/garden` is
  chowned to `karl:www` above for exactly that reason.
- `docker` run by any *other* user talks to the system daemon, not karl's. Always
  go through `sudo -u karl -i`, or the containers appear to vanish.

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
