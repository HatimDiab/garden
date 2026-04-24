.PHONY: help setup start start-production stop restart logs status backup restore clean dev install

help:
	@echo "The Garden Diary — make targets · Make-Ziele"
	@echo ""
	@echo "  make install          EN: pnpm install (local dev)"
	@echo "                        DE: pnpm install (lokale Entwicklung)"
	@echo "  make setup            EN: copy .env.example to .env if missing"
	@echo "                        DE: .env.example nach .env kopieren, falls nicht vorhanden"
	@echo "  make dev              EN: run Next.js dev server locally"
	@echo "                        DE: Next.js-Entwicklungsserver lokal starten"
	@echo ""
	@echo "  make start            EN: build + start Docker container"
	@echo "                        DE: Docker-Container bauen und starten"
	@echo "  make start-production EN: start with Traefik overlay (needs 'web' network)"
	@echo "                        DE: mit Traefik-Overlay starten (benötigt das Netzwerk 'web')"
	@echo "  make stop             EN: stop the container"
	@echo "                        DE: Container stoppen"
	@echo "  make restart          EN: restart the container"
	@echo "                        DE: Container neu starten"
	@echo "  make logs             EN: follow container logs"
	@echo "                        DE: Container-Logs verfolgen"
	@echo "  make status           EN: container health + ports"
	@echo "                        DE: Container-Zustand und Ports anzeigen"
	@echo ""
	@echo "  make backup           EN: tar data/ (db + uploads) into ./backups"
	@echo "                        DE: data/ (Datenbank + Uploads) nach ./backups sichern"
	@echo "  make restore FILE=x   EN: restore a backup tarball into data/"
	@echo "                        DE: Backup-Archiv in data/ wiederherstellen"
	@echo "  make clean            EN: DESTRUCTIVE — remove container, image, and data/"
	@echo "                        DE: ZERSTÖRERISCH — Container, Image und data/ entfernen"

install:
	pnpm install

setup:
	@test -f .env || (cp .env.example .env && \
	  echo "→ EN: created .env — edit ADMIN_PASSWORD and SITE_TITLE" && \
	  echo "→ DE: .env erstellt — ADMIN_PASSWORD und SITE_TITLE anpassen")

dev: setup
	DATA_DIR=./data pnpm dev

start: setup
	docker compose up -d --build
	@port=$$(grep -E '^PORT=' .env 2>/dev/null | cut -d= -f2); \
	  port=$${port:-3000}; \
	  echo ""; \
	  echo "→ EN: Garden running at http://localhost:$$port"; \
	  echo "→ DE: Garten läuft unter http://localhost:$$port"; \
	  echo "→ EN: Admin                http://localhost:$$port/admin/login"; \
	  echo "→ DE: Verwaltung           http://localhost:$$port/admin/login"

start-production: setup
	docker compose -f docker-compose.yml -f docker-compose.production.yml up -d --build

stop:
	docker compose down

restart:
	docker compose restart

logs:
	docker compose logs -f --tail=200

status:
	docker compose ps

backup:
	@mkdir -p backups
	@ts=$$(date +%Y%m%d-%H%M%S); \
	  tar -czf backups/garden-$$ts.tgz data; \
	  echo "→ backups/garden-$$ts.tgz"

restore:
	@test -n "$(FILE)" || (echo "EN: Usage: make restore FILE=backups/garden-XXXX.tgz" && \
	  echo "DE: Verwendung: make restore FILE=backups/garden-XXXX.tgz" && exit 1)
	@test -f "$(FILE)" || (echo "EN: File not found: $(FILE)" && \
	  echo "DE: Datei nicht gefunden: $(FILE)" && exit 1)
	@echo "⚠  EN: This will overwrite ./data — stopping container first."
	@echo "⚠  DE: ./data wird überschrieben — Container wird zuerst gestoppt."
	docker compose down || true
	rm -rf data
	tar -xzf "$(FILE)"
	@echo "→ EN: restored from $(FILE). Run 'make start' to bring it back up."
	@echo "→ DE: aus $(FILE) wiederhergestellt. 'make start' ausführen, um zu starten."

clean:
	@echo "⚠  EN: This will delete the container, image, and ALL data."
	@echo "⚠  DE: Dies löscht den Container, das Image und ALLE Daten."
	@printf "EN: Are you sure? / DE: Wirklich fortfahren? [y/N] " && read ans && [ "$$ans" = "y" ]
	docker compose down -v --rmi local || true
	rm -rf data .next node_modules
