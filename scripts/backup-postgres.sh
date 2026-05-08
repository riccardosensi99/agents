#!/usr/bin/env sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-./backups}"
COMPOSE_SERVICE="${POSTGRES_SERVICE:-postgres}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-agents}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/${POSTGRES_DB}-${STAMP}.dump"

mkdir -p "$BACKUP_DIR"

echo "Creating PostgreSQL backup: $OUT"
docker compose exec -T "$COMPOSE_SERVICE" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$OUT"
echo "Backup complete: $OUT"
