#!/bin/sh
set -e

echo "→ running migrations"
node /app/docker/migrate.mjs

echo "→ seeding settings and admin (idempotent)"
node /app/docker/seed.mjs || echo "seed step had a non-fatal issue; continuing"

echo "→ starting garden on port ${PORT:-3000}"
exec node /app/server.js
