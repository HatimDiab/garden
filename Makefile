.PHONY: help setup start start-traefik start-production ensure-network ensure-data install-service uninstall-service service-status stop restart logs status backup restore clean dev install build

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
	@echo "  make build            EN: rebuild image and restart container"
	@echo "                        DE: Image neu bauen und Container neu starten"
	@echo "  make start-traefik    EN: create 'web' network + start Traefik + start app"
	@echo "                        DE: 'web'-Netzwerk anlegen, Traefik und App starten"
	@echo "  make start-production EN: start with Traefik overlay ('web' network auto-created)"
	@echo "                        DE: mit Traefik-Overlay starten ('web'-Netzwerk wird automatisch angelegt)"
	@echo "  make install-service  EN: install+enable rootless systemd user units (run as the service user)"
	@echo "                        DE: rootlose systemd-User-Units installieren und aktivieren (als Dienstkonto)"
	@echo "  make service-status   EN: status of the systemd user units"
	@echo "                        DE: Status der systemd-User-Units"
	@echo "  make uninstall-service EN: disable and remove the systemd user units"
	@echo "                        DE: systemd-User-Units deaktivieren und entfernen"
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

# Create ./data as the invoking user. If Docker creates it first, it lands
# root-owned and the container (running as PUID:PGID) cannot write the database.
ensure-data:
	@mkdir -p data/uploads

start: setup ensure-data
	docker compose up -d --build
	@port=$$(grep -E '^PORT=' .env 2>/dev/null | cut -d= -f2); \
	  port=$${port:-3000}; \
	  echo ""; \
	  echo "→ EN: Garden running at http://localhost:$$port"; \
	  echo "→ DE: Garten läuft unter http://localhost:$$port"; \
	  echo "→ EN: Admin                http://localhost:$$port/admin/login"; \
	  echo "→ DE: Verwaltung           http://localhost:$$port/admin/login"

# Creating the network is safe to repeat — `docker network create web` on its own
# errors once it exists, so guard it and both targets can be re-run at will.
ensure-network:
	@docker network inspect web >/dev/null 2>&1 || docker network create web

start-traefik: setup ensure-network
	docker compose -f docker-compose.traefik.yml up -d
	$(MAKE) start-production

start-production: setup ensure-network ensure-data
	docker compose -f docker-compose.yml -f docker-compose.production.yml up -d --build

# --- systemd user units (rootless Docker) --------------------------------
# Run these AS THE SERVICE ACCOUNT (e.g. `sudo -u karl -i make install-service`),
# never with sudo — they install into that account's own ~/.config/systemd/user.
UNIT_DIR := $(HOME)/.config/systemd/user

install-service:
	@test "$$(id -u)" != "0" || (echo "EN: run as the service user, not root" && 	  echo "DE: als Dienstkonto ausführen, nicht als root" && exit 1)
	@command -v docker >/dev/null || (echo "EN: docker not found on PATH" && exit 1)
	@test -S "$${XDG_RUNTIME_DIR:-/run/user/$$(id -u)}/docker.sock" || 	  (echo "⚠  EN: rootless docker socket not found — run dockerd-rootless-setuptool.sh install first"; 	   echo "⚠  DE: rootloser Docker-Socket fehlt — zuerst dockerd-rootless-setuptool.sh install ausführen"; exit 1)
	@mkdir -p "$(UNIT_DIR)"
	install -m 644 deploy/traefik.service "$(UNIT_DIR)/traefik.service"
	install -m 644 deploy/garden.service  "$(UNIT_DIR)/garden.service"
	systemctl --user daemon-reload
	systemctl --user enable --now traefik.service garden.service
	@loginctl show-user "$$(id -un)" -p Linger | grep -q 'Linger=yes' || ( 	  echo ""; 	  echo "⚠  EN: lingering is OFF — units will NOT start at boot."; 	  echo "   Run as an admin:  sudo loginctl enable-linger $$(id -un)"; 	  echo "⚠  DE: Linger ist AUS — Units starten NICHT beim Hochfahren."; 	  echo "   Als Administrator:  sudo loginctl enable-linger $$(id -un)")
	@echo "→ EN: installed. Check with 'make service-status'."
	@echo "→ DE: installiert. Prüfen mit 'make service-status'."

service-status:
	@systemctl --user status traefik.service garden.service --no-pager || true
	@echo ""
	@loginctl show-user "$$(id -un)" -p Linger

uninstall-service:
	@test "$$(id -u)" != "0" || (echo "EN: run as the service user, not root" && exit 1)
	-systemctl --user disable --now garden.service traefik.service
	rm -f "$(UNIT_DIR)/garden.service" "$(UNIT_DIR)/traefik.service"
	systemctl --user daemon-reload
	@echo "→ EN: removed. Data in ./data is untouched."
	@echo "→ DE: entfernt. Daten in ./data bleiben erhalten."

stop:
	docker compose down

restart:
	docker compose restart

build: setup
	docker compose up -d --build
	@port=$$(grep -E '^PORT=' .env 2>/dev/null | cut -d= -f2); \
	  port=$${port:-3000}; \
	  echo ""; \
	  echo "→ EN: rebuilt and restarted at http://localhost:$$port"; \
	  echo "→ DE: neu gebaut und neu gestartet unter http://localhost:$$port"

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
