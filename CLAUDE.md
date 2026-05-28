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
make start-production   # + Traefik overlay (needs `docker network create web`)
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

`docker-compose.production.yml` runs the app behind **Traefik** (TLS via Let's
Encrypt, HSTS, no published host port — note the `ports: !override []`, since a plain
`[]` would be *appended* and leave 3000 exposed). `docker-compose.traefik.yml` is the
reverse-proxy stack (start once on the external `web` network). Full Raspberry-Pi /
ARM walkthrough and the home-network gotchas (open ports, CGNAT, Cloudflare Tunnel
alternative) are in `DEPLOY.md`. Because the session cookie is `Secure` under
`NODE_ENV=production`, admin login only works over HTTPS — don't serve prod over HTTP.

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

### Routing: two disjoint trees

- **Public** — `app/(site)/[lang]/...` is locale-prefixed (`/en`, `/de`); `localePrefix`
  is `"always"` (`lib/i18n/routing.ts`). `middleware.ts` runs `next-intl` to detect and
  rewrite locale. The `[lang]` layout calls `setRequestLocale(lang)` and `notFound()` on
  unknown locales.
- **Admin** — `app/admin/(dash)/...` is **English-only and NOT locale-prefixed**. The
  middleware matcher explicitly excludes `admin`, `api`, `uploads`, and `art`, so these
  never get a locale segment. Admin forms author both languages side-by-side via
  `components/admin/LocaleTabs.tsx`.

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
(redirects to `/admin/login` when unauthenticated).

### Server actions

Mutations live in `actions.ts` files colocated with admin routes (`"use server"`).
Convention: call `await requireAdmin()` first, perform the synchronous DB writes, then
`revalidatePath("/", "layout")` to refresh public + admin views. See
`app/admin/(dash)/journal/actions.ts` for the slug-collision and tag-upsert helpers
to mirror.

### Images

Uploads are **not** in `public/`. They live in `${DATA_DIR}/uploads` and are served by
the route handler `app/uploads/[filename]/route.ts` (filename is sanitized against
`/^[a-z0-9._-]+$/i` and `..`). `lib/images/pipeline.ts` (`storeImage`) uses sharp to
write a full-size WebP plus 320/768/1600-wide variants and computes a blurhash. The
upload entry point is `app/api/upload/route.ts`; server-action body limit is 25 MB
(`next.config.ts`).

### Migrations — two toolchains, keep in sync

- **Local:** `pnpm db:migrate` runs `lib/db/migrate.ts` (tsx) against the Drizzle
  migrator.
- **Docker:** `docker/entrypoint.sh` runs the plain-JS `docker/migrate.mjs` and
  `docker/seed.mjs` on container start (the build has no tsx). If you change the schema
  or seed logic, update **both** the TS scripts and their `.mjs` counterparts.

Generate SQL with `pnpm db:generate` (drizzle-kit → `lib/db/migrations/`).

### Other conventions

- Path alias `@/*` maps to the repo root (`tsconfig.json`).
- i18n UI strings are in `lib/i18n/messages/{en,de}.json`; read via `getTranslations`.
  Use `Link`/`redirect` from `lib/i18n/navigation.ts` (locale-aware) for public links;
  plain `next/link` is fine inside the admin tree.
- `next.config.ts` uses `output: "standalone"` for the Docker image and restricts
  `images` to local `/uploads/**` and `/art/**` patterns.
