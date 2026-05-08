#!/usr/bin/env sh
set -eu

BASE_URL="${BASE_URL:-http://localhost:3000}"
API_URL="${API_URL:-http://localhost:4000}"

echo "Checking backend health..."
curl -fsS "$API_URL/health" >/dev/null

echo "Checking frontend..."
curl -fsSI "$BASE_URL" >/dev/null

echo "Checking Agent Room route..."
curl -fsSI "$BASE_URL/agent-room" >/dev/null

echo "Healthcheck OK"
