#!/usr/bin/env bash
# Bring up the full dev stack after a container restart (ephemeral cloud session).
# Rebuilds postgres if needed, migrates, seeds, and starts API + Web.
set -e
ROOT="/home/user/folha-riopreto/portal"
API="$ROOT/apps/api"
WEB="$ROOT/apps/web"
PGDATA="/tmp/pgdata"
PGBIN="/usr/lib/postgresql/16/bin"

echo "==> Postgres"
chown -R postgres:postgres "$PGDATA" 2>/dev/null || true
if [ -f "$PGDATA/PG_VERSION" ]; then
  su postgres -c "$PGBIN/pg_ctl -D $PGDATA -l /tmp/pglog.log start" 2>/dev/null || echo "   (already running)"
else
  rm -rf "$PGDATA"; mkdir -p "$PGDATA"; chown postgres:postgres "$PGDATA"
  su postgres -c "$PGBIN/initdb -D $PGDATA" >/dev/null
  su postgres -c "$PGBIN/pg_ctl -D $PGDATA -l /tmp/pglog.log start"
fi
sleep 3

echo "==> Database + schema"
cd "$API"
# Ensure database exists (owner = current os user, trust auth on localhost)
psql "postgresql://portal@localhost:5432/postgres" -tc "SELECT 1" >/dev/null 2>&1 || \
  su "$(whoami)" -c "createdb portal_dev" 2>/dev/null || true
./node_modules/.bin/prisma generate >/dev/null 2>&1
./node_modules/.bin/prisma migrate deploy
# Seed only if no users
USERS=$(psql "postgresql://portal@localhost:5432/portal_dev" -tc "SELECT count(*) FROM users;" 2>/dev/null | xargs || echo 0)
if [ "$USERS" = "0" ] || [ -z "$USERS" ]; then
  echo "==> Seeding"
  node --import tsx prisma/seed.ts || true
else
  echo "==> Seed present ($USERS users)"
fi

echo "==> Starting servers"
cd "$API"; nohup node --import tsx src/index.ts > /tmp/claude-0/api.log 2>&1 &
cd "$WEB"; nohup ./node_modules/.bin/vite --host 0.0.0.0 --port 5173 > /tmp/claude-0/web.log 2>&1 &
sleep 5
echo "==> Health"
curl -s http://localhost:3333/api/health && echo
curl -s -o /dev/null -w "web: %{http_code}\n" http://localhost:5173
echo "Done. Login: admin@portal.local / Admin@123"
