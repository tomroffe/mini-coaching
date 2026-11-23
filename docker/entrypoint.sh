#!/bin/sh
set -e
echo "Running migrations..."
node_modules/.bin/tsx --env-file-if-exists=.env src/db/migrate.ts
if [ -n "$SEED_ADMIN_EMAIL" ]; then
  echo "Seeding (idempotent)..."
  node_modules/.bin/tsx --env-file-if-exists=.env src/db/seed/index.ts
fi
exec node server.js
