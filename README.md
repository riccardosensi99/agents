# AI Agent Platform

Dashboard full-stack per gestire agenti AI personali: creazione agenti, task manuali, bozze, approvazioni e controllo Supervisor. Il MVP non pubblica su Instagram o LinkedIn e non usa asset esterni o personaggi protetti da copyright.

## Stack

- Frontend: React, TypeScript, Vite, TailwindCSS, Framer Motion
- Backend: Node.js, TypeScript, Express, Zod, JWT
- Database: PostgreSQL, Prisma
- Scheduler: node-cron, disattivato di default
- AI: OpenAI opzionale via env, mock automatico senza API key
- Deploy: Docker Compose con Postgres, Redis, backend e frontend nginx

## Struttura

```text
apps/
  backend/
    prisma/
    src/
      modules/
      services/
      scheduler/
  frontend/
    src/
      api/
      components/
      pages/
docker-compose.yml
.env.example
```

## Avvio locale

Prerequisiti: Node.js 22+, npm, PostgreSQL locale.

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

URL locali:

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:4000`
- Healthcheck: `http://localhost:4000/health`

Credenziali seed:

- Email: `owner@example.com`
- Password: `changeme123`

## Avvio con Docker

```bash
cp .env.example .env
docker compose up --build
```

URL Docker:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:4000`
- Postgres: `localhost:5433`
- Redis: `localhost:6380`

Il container backend esegue `prisma migrate deploy` all'avvio. Dopo il primo avvio, esegui il seed:

```bash
docker compose exec backend npx prisma db seed
```

## Variabili env principali

- `DATABASE_URL`: connessione PostgreSQL per sviluppo locale.
- `JWT_SECRET`: segreto JWT. Cambiarlo in produzione.
- `OPENAI_API_KEY`: se vuoto, il backend usa risposte mock deterministiche.
- `OPENAI_MODEL`: modello OpenAI configurabile.
- `SCHEDULER_ENABLED`: `false` di default. Se `true`, crea task schedulati per InstaSpark e LinkForge.
- `VITE_API_URL`: URL API usato in build frontend. In Docker resta `/api` e nginx fa proxy al backend.

## API principali

- `GET /api/agents`
- `GET /api/agents/:id`
- `POST /api/agents`
- `PATCH /api/agents/:id`
- `POST /api/agents/:id/tasks`
- `GET /api/tasks`
- `GET /api/tasks/:id`
- `POST /api/tasks/:id/run`
- `GET /api/drafts`
- `PATCH /api/drafts/:id`
- `POST /api/drafts/:id/approve`
- `POST /api/drafts/:id/reject`
- `POST /api/drafts/:id/request-revision`
- `GET /api/system/status`

Tutte le route operative richiedono `Authorization: Bearer <token>`. Usa `POST /api/auth/login` per ottenere il token.

## Primo task via API

```bash
TOKEN=$(curl -s http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@example.com","password":"changeme123"}' | jq -r .token)

AGENT_ID=$(curl -s http://localhost:4000/api/agents \
  -H "Authorization: Bearer $TOKEN" | jq -r '.data[] | select(.slug=="instaspark") | .id')

TASK_ID=$(curl -s http://localhost:4000/api/agents/$AGENT_ID/tasks \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title":"Idee Instagram freelance","prompt":"Genera 3 idee post Instagram per promuovere i miei servizi da freelance full-stack"}' | jq -r .data.id)

curl -s -X POST http://localhost:4000/api/tasks/$TASK_ID/run \
  -H "Authorization: Bearer $TOKEN"
```

## Guardrail MVP

- Nessuna pubblicazione reale sui social.
- Ogni bozza social resta in approvazione manuale.
- Gli avatar sono componenti SVG/CSS originali nel codice.
- Lo scheduler e spento di default.
