#!/bin/sh
set -e
echo "Running migrations..."
node dist-db/migrate.mjs
if [ -n "$SEED_ADMIN_EMAIL" ]; then
  echo "Seeding (idempotent)..."
  node dist-db/seed.mjs
fi
exec node server.js
