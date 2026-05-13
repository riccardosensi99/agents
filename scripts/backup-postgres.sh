#!/usr/bin/env sh
set -eu

BACKUP_DIR="${BACKUP_DIR:-./backups}"
COMPOSE_SERVICE="${POSTGRES_SERVICE:-postgres}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:-}"
COMPOSE_ENV_FILE="${COMPOSE_ENV_FILE:-}"
POSTGRES_USER="${POSTGRES_USER:-postgres}"
POSTGRES_DB="${POSTGRES_DB:-agents}"
STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="$BACKUP_DIR/${POSTGRES_DB}-${STAMP}.dump"

mkdir -p "$BACKUP_DIR"

compose() {
  if [ -n "$COMPOSE_PROJECT_NAME" ] && [ -n "$COMPOSE_ENV_FILE" ]; then
    docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$COMPOSE_ENV_FILE" "$@"
  elif [ -n "$COMPOSE_PROJECT_NAME" ]; then
    docker compose --project-name "$COMPOSE_PROJECT_NAME" "$@"
  elif [ -n "$COMPOSE_ENV_FILE" ]; then
    docker compose --env-file "$COMPOSE_ENV_FILE" "$@"
  else
    docker compose "$@"
  fi
}

echo "Creating PostgreSQL backup: $OUT"
compose exec -T "$COMPOSE_SERVICE" pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" -Fc > "$OUT"
echo "Backup complete: $OUT"
