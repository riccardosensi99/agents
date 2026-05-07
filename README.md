# AI Agent Platform

Dashboard full-stack per gestire agenti AI personali: creazione agenti, task manuali, bozze, approvazioni e controllo Supervisor. Il MVP non pubblica su Instagram o LinkedIn e non usa asset esterni o personaggi protetti da copyright.

## Stack

- Frontend: React, TypeScript, Vite, TailwindCSS, Framer Motion, Phaser 3
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
      game/
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
- Agent Room: `http://localhost:5173/agent-room`
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
- Agent Room: `http://localhost:3000/agent-room`
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

## Agent Room

La vista `Agent Room` trasforma gli agenti in creature companion originali dentro una control room 2D Phaser. Non usa asset esterni e non contiene nomi, sprite o elementi coperti da copyright.

Percorsi:

- Dev server: `http://localhost:5173/agent-room`
- Docker/nginx: `http://localhost:3000/agent-room`

La scena legge dati reali dagli endpoint esistenti:

- `GET /api/agents`
- `GET /api/tasks`
- `GET /api/drafts`
- `GET /api/system/status`

Il polling e impostato a 5 secondi in `apps/frontend/src/App.tsx`. La struttura e pronta per sostituire il polling con WebSocket o SSE centralizzando il refresh dati senza cambiare la scena Phaser.

File principali:

- `apps/frontend/src/pages/AgentRoomPage.tsx`: pagina e controlli stanza.
- `apps/frontend/src/components/agent-room/AgentRoomCanvas.tsx`: bootstrap Phaser e fallback card.
- `apps/frontend/src/components/agent-room/AgentDetailModal.tsx`: modal click agente.
- `apps/frontend/src/components/agent-room/SpeechBubble.tsx`: hover bubble.
- `apps/frontend/src/game/AgentRoomScene.ts`: preload, create, update e disegno della room.
- `apps/frontend/src/game/AgentSprite.ts`: creatura placeholder e animazioni.
- `apps/frontend/src/game/agentMovement.ts`: intenti e target movimento.
- `apps/frontend/src/game/roomConfig.ts`: zone, coordinate e intervallo polling.

## Sostituire gli avatar placeholder con sprite sheet

Gli avatar attuali sono texture generate runtime in `AgentRoomScene.generateAgentTextures()`. Per passare a sprite sheet reali:

1. Aggiungi i file in `apps/frontend/public/sprites/`.
2. In `AgentRoomScene.preload()` carica gli sheet con `this.load.spritesheet("agent-instaspark", "/sprites/instaspark.png", { frameWidth, frameHeight })`.
3. In `create()` crea le animazioni Phaser (`idle`, `walk`, `working`, `thinking`, `error`, `waiting_approval`).
4. In `AgentSprite.ts` sostituisci `scene.add.image(...)` con `scene.add.sprite(...)` e mappa `setMode()` alle animazioni.

Mantieni nomi e design originali: niente asset protetti o personaggi riconoscibili di franchise esistenti.

## Aggiungere nuovi agenti

1. Crea l'agente via `POST /api/agents` o aggiungilo al seed Prisma.
2. Assegna un `slug` e un `avatarType` originali.
3. Aggiungi una texture placeholder o sprite sheet per `agent-<avatarType>` in `AgentRoomScene`.
4. Se serve un comportamento dedicato, estendi `agentMovement.ts` con una nuova destinazione o velocita.
5. Il frontend lo mostrera automaticamente perche la stanza usa `GET /api/agents`.

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
- Gli avatar sono componenti SVG/CSS e texture Phaser generate nel codice, tutte originali.
- Lo scheduler e spento di default.
