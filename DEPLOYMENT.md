# VPS Deployment Guide

This guide targets a single VPS deployment with separated development and production Docker Compose projects. It does not enable automatic social publishing.

## 1. Server Prerequisites

- Ubuntu LTS or similar Linux VPS.
- Docker Engine and Docker Compose plugin.
- A domain pointing to the VPS.
- Reverse proxy with TLS: Caddy, Traefik or Nginx.
- Firewall allowing only SSH, HTTP and HTTPS publicly.
- Two checked-out working trees on the VPS, one for `develop` and one for `main`, or one repository that the deploy job can fast-forward to the target branch.

## 2. Branch And Environment Model

- Feature branches open PRs into `develop`.
- Push/merge to `develop` runs CI and deploys the development environment through GitHub Environment `development`.
- Promotion to production happens by merging `develop` into `main`.
- Push/merge to `main` runs CI and deploys through GitHub Environment `production`.
- Configure required reviewers on the GitHub `production` environment to add a manual approval gate before production deploys.

CI runs on PRs and on pushes to both `develop` and `main`. Deploy jobs are separate from CI and use SSH to run `scripts/deploy-remote.sh` on the VPS.

## 3. Environment Files

Development and production must use different Compose project names, host ports, databases, Redis instances and env files.

Development:

```bash
cp .env.dev.example .env.dev
```

Production:

```bash
cp .env.production.example .env.production
```

Recommended default separation:

| Environment | Compose project | Frontend | Backend | Postgres | Redis |
| --- | --- | --- | --- | --- | --- |
| development | `ai-agent-platform-dev` | `13000` | `14000` | `15432` | `16379` |
| production | `ai-agent-platform-prod` | `23000` | `24000` | `25432` | `26379` |

Required values:

- `NODE_ENV=production`
- `COMPOSE_PROJECT_NAME`: unique per environment.
- `JWT_SECRET`: at least 32 random characters, never a placeholder.
- `POSTGRES_PASSWORD`: long random password.
- `CORS_ORIGIN`: final HTTPS origin for that environment.
- `REDIS_URL`: Redis connection used by the production rate limiter.
- `OPENAI_API_KEY`: set only when using real OpenAI calls.

Optional integrations remain disabled unless explicitly configured:

- `TELEGRAM_ENABLED=false`
- `LINKEDIN_ENABLED=false`
- `SCHEDULER_ENABLED=false`

## 4. Build And Start Manually

```bash
docker compose --project-name ai-agent-platform-dev --env-file .env.dev up --build -d
docker compose --project-name ai-agent-platform-dev --env-file .env.dev exec backend npx prisma migrate deploy
BASE_URL=https://dev.your-domain.example API_URL=https://dev.your-domain.example ./scripts/healthcheck.sh
```

Use the production project/env file for production:

```bash
docker compose --project-name ai-agent-platform-prod --env-file .env.production up --build -d
docker compose --project-name ai-agent-platform-prod --env-file .env.production exec backend npx prisma migrate deploy
BASE_URL=https://your-domain.example API_URL=https://your-domain.example ./scripts/healthcheck.sh
```

Do not remove Docker volumes during normal deploys. Docker Compose prefixes volumes with the project name, so dev and production get separate `postgres_data` volumes when project names differ.

## 5. GitHub Actions Deploy Setup

Create GitHub Environments:

- `development`: used by pushes to `develop`.
- `production`: used by pushes to `main`; configure required reviewers for the approval gate.

Set these secrets separately in each environment:

| Secret | Meaning |
| --- | --- |
| `DEPLOY_HOST` | VPS hostname or IP |
| `DEPLOY_PORT` | SSH port, usually `22` |
| `DEPLOY_USER` | SSH user |
| `DEPLOY_SSH_KEY` | Private SSH key allowed to deploy |
| `DEPLOY_APP_DIR` | Remote repo path, for example `/srv/agents-dev/app` |
| `DEPLOY_ENV_FILE` | Remote env path, for example `/srv/agents-dev/.env.dev` |
| `DEPLOY_COMPOSE_PROJECT_NAME` | `ai-agent-platform-dev` or `ai-agent-platform-prod` |

Set these variables separately in each environment:

| Variable | Meaning |
| --- | --- |
| `DEPLOY_PUBLIC_URL` | Public frontend URL for healthcheck and environment URL |
| `DEPLOY_API_URL` | API healthcheck URL; can be same public URL if nginx proxies `/health` |

Optional environment variable:

- `DEPLOY_RUN_SEED=true`: run Prisma seed after migrations. Keep `false` for normal production deploys.

The deploy workflow does not rewrite nginx. It only fast-forwards the selected branch, rebuilds containers, applies migrations and runs healthchecks.

## 6. Reverse Proxy / TLS Checklist

- Proxy `/` to frontend container/port.
- Proxy `/api/*` to backend or keep frontend nginx proxy if exposing only frontend.
- Enable HTTPS and redirect HTTP to HTTPS.
- Keep request body limit at least 1 MB.
- Preserve `X-Forwarded-*` headers.
- For Telegram webhook, forward `/api/telegram/webhook` to backend.
- Keep dev and production upstream ports separate. The example file `deploy/nginx-dev-prod.example.conf` uses dev ports `13000/14000` and production ports `23000/24000`.
- Manage TLS certificates at the host proxy layer. Application deploys should not regenerate nginx config.

## 7. Firewall Checklist

- Allow SSH from trusted IPs where possible.
- Allow 80/443 publicly.
- Do not expose Postgres or Redis publicly.
- If Compose publishes DB ports for maintenance, bind them only to localhost or close them in firewall.

## 8. Backups

Create a backup:

```bash
BACKUP_DIR=/var/backups/agents COMPOSE_PROJECT_NAME=ai-agent-platform-prod COMPOSE_ENV_FILE=.env.production ./scripts/backup-postgres.sh
```

Restore example:

```bash
cat /var/backups/agents/agents-YYYYMMDD-HHMMSS.dump | docker compose --project-name ai-agent-platform-prod --env-file .env.production exec -T postgres pg_restore -U "$POSTGRES_USER" -d "$POSTGRES_DB" --clean --if-exists
```

Test restores periodically on a separate environment.

## 9. Deploy Updates

```bash
DEPLOY_ENV=production \
APP_DIR=/srv/agents-prod/app \
BRANCH=main \
ENV_FILE=/srv/agents-prod/.env.production \
COMPOSE_PROJECT_NAME=ai-agent-platform-prod \
BASE_URL=https://your-domain.example \
API_URL=https://your-domain.example \
sh ./scripts/deploy-remote.sh
```

Rollback uses Git branch/commit checkout plus rebuild. Never run destructive DB commands unless a tested backup exists.

## 10. Telegram Setup

1. Create bot with BotFather.
2. Set `TELEGRAM_ENABLED=true`.
3. Set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_WEBHOOK_URL`.
4. Configure webhook with Telegram using the secret token.
5. Generate a draft and confirm the approval message arrives.

Telegram only approves, rejects or requests revision of drafts. It never publishes content.

## 11. LinkedIn Preparation

LinkedIn is currently architecture-only:

- OAuth env placeholders exist.
- Approved LinkedIn drafts can be mapped to a future payload.
- Publishing is guarded and disabled unless future manual publish flow is implemented.

Production publishing requires LinkedIn app review, OAuth token storage, refresh handling, rate limits and a manual confirmation flow.

## 12. Production Readiness Checklist

- [ ] `.env` contains no placeholders.
- [ ] `NODE_ENV=production` boots successfully.
- [ ] Dev and production use separate Compose project names and ports.
- [ ] GitHub Environments `development` and `production` have separate secrets.
- [ ] Production GitHub Environment requires manual approval.
- [ ] Nginx routes dev/prod domains to separate upstream ports.
- [ ] `docker compose up --build -d` passes.
- [ ] `npx prisma migrate deploy` passes.
- [ ] `npm run smoke` passes against the deployment.
- [ ] `./scripts/healthcheck.sh` passes.
- [ ] Backups are scheduled and restore tested.
- [ ] TLS is enabled.
- [ ] Firewall blocks DB/Redis from public internet.
- [ ] Social publishing remains disabled until intentionally implemented.
