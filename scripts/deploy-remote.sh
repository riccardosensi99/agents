#!/usr/bin/env sh
set -eu

DEPLOY_ENV="${DEPLOY_ENV:?Set DEPLOY_ENV to development or production}"
APP_DIR="${APP_DIR:?Set APP_DIR to the remote repository path}"
BRANCH="${BRANCH:?Set BRANCH to deploy}"
ENV_FILE="${ENV_FILE:?Set ENV_FILE to the remote env file path}"
COMPOSE_PROJECT_NAME="${COMPOSE_PROJECT_NAME:?Set COMPOSE_PROJECT_NAME}"
BASE_URL="${BASE_URL:?Set BASE_URL for frontend healthcheck}"
API_URL="${API_URL:?Set API_URL for backend healthcheck}"
RUN_SEED="${RUN_SEED:-false}"

case "$DEPLOY_ENV" in
  development|production) ;;
  *)
    echo "DEPLOY_ENV must be development or production" >&2
    exit 1
    ;;
esac

cd "$APP_DIR"

echo "Deploying $DEPLOY_ENV from branch $BRANCH"
git fetch origin "$BRANCH"
git checkout "$BRANCH"
git pull --ff-only origin "$BRANCH"

docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$ENV_FILE" build
docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$ENV_FILE" up -d --remove-orphans
docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$ENV_FILE" exec -T backend npx prisma migrate deploy

if [ "$RUN_SEED" = "true" ]; then
  docker compose --project-name "$COMPOSE_PROJECT_NAME" --env-file "$ENV_FILE" exec -T backend npx prisma db seed
fi

BASE_URL="$BASE_URL" API_URL="$API_URL" ./scripts/healthcheck.sh

echo "Deploy $DEPLOY_ENV complete"
