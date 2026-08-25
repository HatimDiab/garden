# The Garden Diary · Das Gartentagebuch

**EN** — A storybook-style website for a personal garden: a journal of daily
memories, photo albums, and a calendar of garden events — with a simple
password-protected admin UI for day-to-day upkeep. Bilingual (English + German)
throughout.

**DE** — Eine bilderbuchartige Website für einen privaten Garten: ein Tagebuch
täglicher Erinnerungen, Fotoalben und ein Kalender der Gartenereignisse — mit
einer einfachen, passwortgeschützten Verwaltungsoberfläche für die tägliche
Pflege. Durchgängig zweisprachig (Englisch + Deutsch).

**Stack:** Next.js 16 · TypeScript · Tailwind CSS v4 · SQLite + Drizzle ORM ·
custom session auth (oslojs) · Tiptap editor · Motion · sharp + blurhash ·
next-intl for EN/DE routing. Self-hosted via Docker.

## Quick start (local dev) · Schnellstart (lokale Entwicklung)

```bash
make install         # EN: pnpm install                      · DE: pnpm install
make setup           # EN: creates .env from .env.example    · DE: erzeugt .env aus .env.example
make dev             # EN: http://localhost:3000             · DE: http://localhost:3000
```

**EN** — On first run, the seed creates an admin user from `ADMIN_USERNAME` /
`ADMIN_PASSWORD` in `.env`. Sign in at `/admin/login`.

**DE** — Beim ersten Start wird ein Admin-Konto aus `ADMIN_USERNAME` /
`ADMIN_PASSWORD` in `.env` angelegt. Anmeldung unter `/admin/login`.

## Quick start (Docker) · Schnellstart (Docker)

```bash
make setup           # EN: copies .env.example → .env        · DE: kopiert .env.example → .env
# EN: edit .env (ADMIN_PASSWORD, SITE_TITLE, PORT, …)
# DE: .env anpassen (ADMIN_PASSWORD, SITE_TITLE, PORT, …)
make start           # EN: builds + starts the container     · DE: baut und startet den Container
make logs            # EN: follow logs                       · DE: Logs verfolgen
```

The app serves at `http://localhost:${PORT:-3000}` · Die App ist unter
`http://localhost:${PORT:-3000}` erreichbar.

## Production with Traefik · Produktivbetrieb mit Traefik

```bash
# EN: point DNS at this host; set GARDEN_HOST in .env
# DE: DNS auf diesen Host zeigen lassen; GARDEN_HOST in .env setzen
make start-production
```

**EN** — `make start-production` creates the `web` network itself if it is
missing, so the command is safe to re-run. **DE** — `make start-production` legt
das `web`-Netzwerk bei Bedarf selbst an; der Befehl kann beliebig oft laufen.

## Languages · Sprachen

**EN** — Every public route is locale-prefixed: `/en/journal`, `/de/journal`,
etc. Visiting `/` redirects to the visitor's preferred locale (Accept-Language,
then a cookie once they toggle). The header has an `EN | DE` pill that swaps
the first URL segment.

Content is stored bilingually: every journal entry, album, event, image caption,
and site setting has an English field and an optional German twin (`*_de`).
When a German translation is missing, the page falls back to the English text
and shows a small "nur auf Englisch" badge so readers aren't surprised.

The admin UI (under `/admin`) stays English-only but every form has an **EN/DE
tab strip** so the author fills in both languages side-by-side in a single save.

**DE** — Alle öffentlichen Routen sind mit einem Sprach-Präfix versehen:
`/en/journal`, `/de/journal` usw. `/` leitet auf die bevorzugte Sprache des
Besuchers weiter (zunächst Accept-Language, danach ein Cookie, sobald gewechselt
wird). In der Kopfzeile wechselt ein `EN | DE`-Schalter das erste URL-Segment.

Inhalte werden zweisprachig gespeichert: jeder Tagebucheintrag, jedes Album,
jeder Termin, jede Bildunterschrift und jede Einstellung hat ein englisches
Feld und ein optionales deutsches Zwillingsfeld (`*_de`). Fehlt eine deutsche
Übersetzung, zeigt die Seite den englischen Text mit einem kleinen Hinweis
„nur auf Englisch".

Die Verwaltung (`/admin`) ist weiterhin auf Englisch, jedes Formular hat jedoch
einen **EN/DE-Reiter**, sodass beide Sprachen gemeinsam in einem Speichervorgang
bearbeitet werden.

## Data · Daten

Everything lives in `./data` · Alles liegt in `./data`:

```
data/
├── garden.db         # EN: SQLite DB (journal, albums, events, users)
│                     # DE: SQLite-Datenbank (Tagebuch, Alben, Termine, Benutzer)
└── uploads/          # EN: original + resized WebP images
                      # DE: Original- und skalierte WebP-Bilder
```

- `make backup`  → `backups/garden-YYYYMMDD-HHMMSS.tgz`
- `make restore FILE=backups/garden-XXXX.tgz`

## Features · Funktionen

- **Journal · Tagebuch** — EN: Tiptap rich editor, inline images, tags,
  draft/publish, bilingual body/title/slug. DE: Tiptap-Editor, eingebettete
  Bilder, Tags, Entwurf/Veröffentlicht, zweisprachiger Inhalt/Titel/Slug.
- **Gallery · Galerie** — EN: drag-drop uploads, albums, lightbox with keyboard
  + swipe, bilingual captions. DE: Drag-&-Drop-Uploads, Alben, Lightbox mit
  Tastatur + Wischgeste, zweisprachige Bildunterschriften.
- **Events · Termine** — EN: month calendar + upcoming list, linkable to
  albums/entries, localized weekdays + month names. DE: Monatskalender +
  kommende Termine, mit Alben/Einträgen verknüpfbar, lokalisierte Wochentage
  und Monatsnamen.
- **Admin · Verwaltung** — EN: single-password login, full CRUD, bilingual
  settings + password change. DE: Ein-Passwort-Anmeldung, vollständige
  Verwaltung, zweisprachige Einstellungen + Passwort ändern.
- **Image pipeline · Bildverarbeitung** — sharp → 320/768/1600 WebP +
  blurhash.
- **Auth · Anmeldung** — oslojs cookie sessions, argon2 passwords.
- **i18n** — next-intl, path-prefix routing (`/en`, `/de`), automatic
  EN fallback.

## Makefile targets · Make-Ziele

| target · Ziel | EN | DE |
|---|---|---|
| `make dev` | local Next dev server | lokaler Next-Entwicklungsserver |
| `make start` | build + run Docker container | Docker-Container bauen und starten |
| `make start-production` | with Traefik overlay | mit Traefik-Overlay |
| `make stop` / `restart` / `logs` / `status` | container lifecycle | Container-Lebenszyklus |
| `make backup` / `make restore FILE=…` | snapshot/restore `data/` | `data/` sichern/wiederherstellen |
| `make clean` | **destructive:** wipes container, image, data | **zerstörerisch:** entfernt Container, Image, Daten |

Run `make help` for a bilingual listing of every target.
`make help` zeigt alle Ziele zweisprachig an.

## Project layout · Projektstruktur

```
app/
├── (site)/
│   └── [lang]/          # EN: locale-prefixed public pages (/en, /de)
│                        # DE: sprachpräfixierte öffentliche Seiten (/en, /de)
├── admin/
│   ├── login/
│   └── (dash)/          # EN: authenticated admin routes (English-only)
│                        # DE: authentifizierte Verwaltungsrouten (nur Englisch)
├── api/upload/          # EN: image upload endpoint · DE: Bild-Upload-Endpunkt
└── uploads/[filename]/  # EN: serves images from data/uploads
                         # DE: liefert Bilder aus data/uploads
components/              # watercolor/, editor/, gallery/, events/, admin/, i18n/, ui/
lib/
├── auth/                # EN: sessions + password hashing
│                        # DE: Sessions + Passwort-Hashing
├── content.ts           # EN: pickText / pickLocaleSlug locale helpers
│                        # DE: pickText / pickLocaleSlug Lokalisierungs-Helfer
├── db/                  # EN: schema, client, migrations, seed (incl. *_de columns)
│                        # DE: Schema, Client, Migrationen, Seed (inkl. *_de-Spalten)
├── i18n/                # EN: routing, request config, messages/{en,de}.json, date wrapper
│                        # DE: Routing, Request-Config, Nachrichten, Datumswrapper
├── images/              # EN: sharp pipeline · DE: sharp-Pipeline
└── util/                # EN: ids, slugs · DE: IDs, Slugs
middleware.ts            # EN: next-intl locale detection & rewriting
                         # DE: Spracherkennung und -umleitung via next-intl
public/art/              # EN: watercolor SVG motifs · DE: Aquarell-SVG-Motive
docker/                  # EN: entrypoint + JS migration/seed scripts
                         # DE: Entrypoint + JS-Migrations-/Seed-Skripte
```
