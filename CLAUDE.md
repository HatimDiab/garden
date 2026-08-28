# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> The note above is load-bearing: this is **Next.js 16 + React 19**, newer than your
> training data. Before writing app/route/config code, read the relevant guide under
> `node_modules/next/dist/docs/`. Those docs only exist after `pnpm install` — if the
> directory is empty, install dependencies first.

## What this is

The Garden Diary — a bilingual (English/German) storybook site for a personal garden:
journal entries, photo albums, and an events calendar, with a password-protected admin
UI. Self-hosted via Docker. SQLite is the only datastore; uploaded images live on disk.

## Commands

Package manager is **pnpm**. The Makefile wraps the common flows (and prints bilingual
help via `make help`).

```bash
pnpm install            # or: make install
make setup              # copies .env.example → .env (see env caveat below)
make dev                # next dev on :3000, with DATA_DIR=./data
pnpm build              # next build (output: standalone)
pnpm lint               # eslint (flat config, eslint.config.mjs)

pnpm db:generate        # drizzle-kit generate — emits SQL into lib/db/migrations
pnpm db:migrate         # apply migrations locally (tsx lib/db/migrate.ts)
pnpm db:seed            # seed admin user + settings from .env

make start              # docker compose up --build (prod-style container)
make start-production   # + Traefik overlay (creates the `web` network if missing)
make backup             # tar data/ → backups/ ;  make restore FILE=...
```

There is **no test suite** in this repo. "Verify" means `pnpm lint` + `pnpm build`,
or running `make dev` and exercising the page.

### Env

`.env*` is gitignored except `.env.example` (un-ignored via `!.env.example`), which
`make setup` copies to `.env`. Vars: `ADMIN_USERNAME`, `ADMIN_PASSWORD` (seeds the
admin on first run), `SITE_TITLE`, `SITE_TAGLINE`, `PORT` (local container only),
`DATA_DIR`, plus `GARDEN_HOST` and `ACME_EMAIL` for the public HTTPS deploy.

### Deploying (public HTTPS)

Security headers (CSP, nosniff, frameDeny, Referrer-Policy, Permissions-Policy)
are set by `next.config.ts` `headers()` so they apply on the plain-HTTP LAN path
too; Traefik adds HSTS and a per-source rate limit on top for the public deploy.
The Traefik stack talks to Docker through a `tecnativa/docker-socket-proxy`
sidecar rather than mounting `/var/run/docker.sock` directly.

`docker-compose.production.yml` runs the app behind **Traefik** (TLS via Let's
Encrypt, HSTS, no published host port — note the `ports: !override []`, since a plain
`[]` would be *appended* and leave 3000 exposed). `docker-compose.traefik.yml` is the
reverse-proxy stack (start once on the external `web` network). Full Raspberry-Pi /
ARM walkthrough and the home-network gotchas (open ports, CGNAT, Cloudflare Tunnel
alternative) are in `DEPLOY.md`. The session cookie's `Secure` flag is set per-request
from `x-forwarded-proto` (or `localhost`), so plain-HTTP LAN access of the local Docker
container still keeps you logged in; HTTPS behind Traefik gets a Secure cookie.
The base compose publishes on `${BIND_ADDR:-0.0.0.0}` — set `BIND_ADDR=127.0.0.1`
to keep the admin UI off the LAN.

The container runs as `user: "${PUID:-1000}:${PGID:-1000}"`. `./data` is a bind
mount, so the **host** directory's ownership governs writes regardless of the uid
1001 `garden` user baked into the image; a mismatch fails as `SQLITE_CANTOPEN` in
`docker/migrate.mjs` and restart-loops the container. macOS hides this, real Linux
hosts do not. The `ensure-data` make target creates `./data` as the invoking user
so Docker cannot claim it for root first. Runtime writes go only to `/data`
(there is no `next/image` optimizer cache and no ISR), which is what makes running
as an arbitrary uid safe.

`deploy/garden.service` and `deploy/traefik.service` are systemd **user** units
for a rootless-Docker host: karl's own `dockerd`, started at boot via
`loginctl enable-linger`, with no root daemon and no `docker` group membership
(that group is root-equivalent). `make install-service` installs them into the
service account's `~/.config/systemd/user`; it refuses to run as root. Setup is
in DEPLOY.md.

Under rootless Docker `PUID`/`PGID` must be **0**, not the host uid: the
container's uid 0 maps to the account running dockerd, so 0 inside is karl
outside and bind-mounted files come out owned by karl. A real numeric uid would
map into the subordinate 100000+ range and could not write `./data`. Rootful
Docker wants the host uid:gid instead — the two setups need different values for
the same variables. `DOCKER_SOCK` likewise points the Traefik socket-proxy at
`/run/user/<uid>/docker.sock` rather than `/var/run/docker.sock`.

Both compose stacks share one directory, so they would default to the same
project name (`garden`) and each would treat the other's containers as orphans.
The Traefik stack must therefore always be invoked with `-p traefik`, and the app
stack must not use `--remove-orphans`.

## Architecture

### Bilingual content model — the central pattern

Every translatable column has an English field plus an optional German twin suffixed
`_de` (e.g. `title` / `title_de`, `slug` / `slug_de`, `body_html` / `body_html_de`).
Never read these columns directly in a page. Use the helpers in `lib/content.ts`:

- `pickText(row, "title", locale)` → `{ value, fellBack }`. When the German field is
  empty it returns the English value with `fellBack: true`; pages render a small
  "only in English" badge off that flag.
- `pickLocaleSlug(row, locale)` → the locale-appropriate slug for building links.

When adding a translatable column, add both the base and the `_de` twin to
`lib/db/schema.ts`, then route reads through `pickText`.

### Routing: one locale-prefixed tree

Everything user-facing lives under `app/(site)/[lang]/...` and is locale-prefixed
(`/en`, `/de`); `localePrefix` is `"always"` (`lib/i18n/routing.ts`). `proxy.ts`
(Next 16's renamed "middleware" convention) runs `next-intl` to detect and rewrite
locale. The `[lang]` layout calls `setRequestLocale(lang)` and `notFound()` on unknown
locales.

**Admin is part of that tree**, at `app/(site)/[lang]/admin/(dash)/...` — so admin
URLs are locale-prefixed too (`/en/admin/journal`, `/de/admin/journal`), and the admin
chrome is translated. Admin *content* forms still author both languages side-by-side
via `components/admin/LocaleTabs.tsx`. Use `redirect`/`Link` from
`lib/i18n/navigation.ts` inside admin as well, since the locale segment is required.

The proxy matcher is `["/((?!api|uploads|art|_next|.*\\..*).*)"]` — it excludes only
`api`, `uploads`, `art`, `_next`, and anything with a file extension. It does **not**
exclude `admin`.

Slug lookups query both columns: `where(or(eq(slug, x), eq(slugDe, x)))`.

### Data access is synchronous

`lib/db/client.ts` exports a Drizzle instance over `better-sqlite3` (WAL,
`foreign_keys=ON`). Queries are **synchronous** — call `.get()`, `.all()`, `.run()`
directly; do **not** `await` them. The DB file is `${DATA_DIR}/garden.db`
(`DATA_DIR` defaults to `./data`).

### Auth

`lib/auth/session.ts`: oslojs cookie sessions, argon2 password hashing. The session
token is random; only its sha256 hash is stored. Cookie is `garden_session`
(httpOnly, lax, 30-day sliding renewal). `getCurrentUser()` is wrapped in React
`cache()`. **Guard every admin server action and admin page** with `requireAdmin()`
(redirects to `/admin/login` when unauthenticated). API route handlers use
`getCurrentUser()` directly and return 401 instead, since a redirect is wrong for
a fetch.

`lib/auth/throttle.ts` rate-limits failed logins in SQLite (`login_attempts`),
keyed by both `user:<name>` and `ip:<addr>` so neither a targeted account nor a
username-rotating attacker slips through. Five free attempts, then exponential
lockout from 30s to 15min, decaying after an hour of quiet. The login action must
check `checkThrottle()` **before** hashing — each argon2 verify costs 19 MiB, so an
unthrottled login is a memory-exhaustion DoS as well as a brute-force hole. When
the username is unknown it still calls `verifyDummyPassword()` so the response
time does not reveal which accounts exist.

`ADMIN_PASSWORD` only *bootstraps* the admin user. Once that user exists the seed
leaves the stored hash alone, so a password changed in the UI survives restarts;
`ADMIN_PASSWORD_FORCE_RESET=1` is the explicit opt-in to overwrite it.

### Server actions

Mutations live in `actions.ts` files colocated with admin routes (`"use server"`).
Convention: call `await requireAdmin()` first, perform the synchronous DB writes, then
`revalidatePath("/", "layout")` to refresh public + admin views. See
`app/admin/(dash)/journal/actions.ts` for the slug-collision and tag-upsert helpers
to mirror.

### Images

Uploads are **not** in `public/`. They live in `${DATA_DIR}/uploads` and are served by
the route handler `app/uploads/[filename]/route.ts` (filename is sanitized against
`/^[a-z0-9._-]+$/i` and `..`), served with `nosniff`. `lib/images/pipeline.ts`
(`storeImage`) uses sharp to write a full-size WebP plus 320/768/1600-wide variants
and computes a blurhash. The upload entry point is `app/api/upload/route.ts`;
server-action body limit is 25 MB (`next.config.ts`).

Uploads must satisfy **both** a raster MIME type and a raster extension — an `||`
here would let `image/svg+xml` reach sharp, and librsvg is the one decoder in the
pipeline that parses untrusted markup rather than a bitmap. `storeImage` runs sharp
with `failOn: "warning"` and rejects anything that decodes as SVG.

### Migrations — two toolchains, keep in sync

- **Local:** `pnpm db:migrate` runs `lib/db/migrate.ts` (tsx) against the Drizzle
  migrator.
- **Docker:** `docker/entrypoint.sh` runs the plain-JS `docker/migrate.mjs` and
  `docker/seed.mjs` on container start (the build has no tsx). If you change the schema
  or seed logic, update **both** the TS scripts and their `.mjs` counterparts.

Generate SQL with `pnpm db:generate` (drizzle-kit → `lib/db/migrations/`).

**Check generated SQL before committing it.** `0001_bilingual.sql` was hand-written
and has no snapshot in `meta/`, so drizzle-kit diffs from `0000_snapshot.json` and
re-emits every `_de` column alongside whatever you actually added. Trim those
already-applied statements; `meta/0002_snapshot.json` records the real current
schema, so diffs from 0002 onward are clean. Both toolchains hash the `.sql` file
contents, so an edited-but-unapplied migration stays consistent between them.

### Other conventions

- Path alias `@/*` maps to the repo root (`tsconfig.json`).
- i18n UI strings are in `lib/i18n/messages/{en,de}.json`; read via `getTranslations`.
  Use `Link`/`redirect` from `lib/i18n/navigation.ts` (locale-aware) for public links;
  plain `next/link` is fine inside the admin tree.
- `next.config.ts` uses `output: "standalone"` for the Docker image and restricts
  `images` to local `/uploads/**` and `/art/**` patterns.
