# VPS Deployment Guide

This guide targets a single VPS internal production deployment with Docker Compose, PostgreSQL and Redis. It does not enable automatic social publishing.

## 1. Server Prerequisites

- Ubuntu LTS or similar Linux VPS.
- Docker Engine and Docker Compose plugin.
- A domain pointing to the VPS.
- Reverse proxy with TLS: Caddy, Traefik or Nginx.
- Firewall allowing only SSH, HTTP and HTTPS publicly.

## 2. Production Env

Copy and edit the production env template:

```bash
cp .env.production.example .env
```

Required production values:

- `NODE_ENV=production`
- `JWT_SECRET`: at least 32 random characters, never a placeholder.
- `POSTGRES_PASSWORD`: long random password.
- `CORS_ORIGIN`: final HTTPS origin.
- `OPENAI_API_KEY`: set only when using real OpenAI calls.

Optional integrations remain disabled unless explicitly configured:

- `TELEGRAM_ENABLED=false`
- `LINKEDIN_ENABLED=false`
- `SCHEDULER_ENABLED=false`

## 3. Build And Start

```bash
docker compose up --build -d
docker compose exec backend npx prisma migrate deploy
docker compose exec backend npx prisma db seed
./scripts/healthcheck.sh
```

Do not remove Docker volumes during normal deploys. PostgreSQL data lives in the `postgres_data` volume.

## 4. Reverse Proxy / TLS Checklist

- Proxy `/` to frontend container/port.
- Proxy `/api/*` to backend or keep frontend nginx proxy if exposing only frontend.
- Enable HTTPS and redirect HTTP to HTTPS.
- Keep request body limit at least 1 MB.
- Preserve `X-Forwarded-*` headers.
- For Telegram webhook, forward `/api/telegram/webhook` to backend.

## 5. Firewall Checklist

- Allow SSH from trusted IPs where possible.
- Allow 80/443 publicly.
- Do not expose Postgres or Redis publicly.
- If Compose publishes DB ports for maintenance, bind them only to localhost or close them in firewall.

## 6. Backups

Create a backup:

```bash
BACKUP_DIR=/var/backups/agents ./scripts/backup-postgres.sh
```

Restore example:

```bash
cat /var/backups/agents/agents-YYYYMMDD-HHMMSS.dump | docker compose exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists
```

Test restores periodically on a separate environment.

## 7. Deploy Updates

```bash
git pull
docker compose up --build -d
docker compose exec backend npx prisma migrate deploy
./scripts/healthcheck.sh
```

Rollback uses Git branch/commit checkout plus rebuild. Never run destructive DB commands unless a tested backup exists.

## 8. Telegram Setup

1. Create bot with BotFather.
2. Set `TELEGRAM_ENABLED=true`.
3. Set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_WEBHOOK_URL`.
4. Configure webhook with Telegram using the secret token.
5. Generate a draft and confirm the approval message arrives.

Telegram only approves, rejects or requests revision of drafts. It never publishes content.

## 9. LinkedIn Preparation

LinkedIn is currently architecture-only:

- OAuth env placeholders exist.
- Approved LinkedIn drafts can be mapped to a future payload.
- Publishing is guarded and disabled unless future manual publish flow is implemented.

Production publishing requires LinkedIn app review, OAuth token storage, refresh handling, rate limits and a manual confirmation flow.

## 10. Production Readiness Checklist

- [ ] `.env` contains no placeholders.
- [ ] `NODE_ENV=production` boots successfully.
- [ ] `docker compose up --build -d` passes.
- [ ] `npx prisma migrate deploy` passes.
- [ ] `npm run smoke` passes against the deployment.
- [ ] `./scripts/healthcheck.sh` passes.
- [ ] Backups are scheduled and restore tested.
- [ ] TLS is enabled.
- [ ] Firewall blocks DB/Redis from public internet.
- [ ] Social publishing remains disabled until intentionally implemented.

