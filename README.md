# AI Agent Platform By King

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
.env.production.example
ROADMAP.md
DEPLOYMENT.md
```

## Avvio locale

Prerequisiti: Node.js 22+, npm, PostgreSQL locale o Docker.

```bash
cp .env.example .env
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

Per sviluppo locale il mock AI e automatico se `OPENAI_API_KEY` resta vuota. Cambia `JWT_SECRET` prima di usare l'app fuori dalla tua macchina.

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

`docker-compose.yml` usa `NODE_ENV=development` di default per permettere un primo avvio locale con `.env.example`. Per produzione imposta esplicitamente `NODE_ENV=production`, un `JWT_SECRET` casuale e una `DATABASE_URL` reale. Il backend rifiuta placeholder noti in produzione.

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

## Deploy VPS

Checklist minima per una prima produzione interna:

- Punta un reverse proxy con TLS verso il frontend nginx (`FRONTEND_PORT`, default `3000`).
- Mantieni `/api` e `/health` proxyati dal frontend nginx verso il backend, oppure esponi il backend solo sulla rete privata.
- Imposta `NODE_ENV=production`, `JWT_SECRET` random, `POSTGRES_PASSWORD` robusta e `CORS_ORIGIN=https://tuo-dominio`.
- Se vuoi AI reale, imposta `OPENAI_API_KEY`, `OPENAI_MODEL` e `OPENAI_TIMEOUT_MS`.
- Esegui `docker compose up --build -d`; il backend applica `prisma migrate deploy`.
- Esegui il seed solo quando ti serve creare l'utente/agenti iniziali: `docker compose exec backend npx prisma db seed`.
- Configura backup Postgres del volume `postgres_data`; non cancellare volumi per aggiornare l'app.
- Tieni `.env` fuori da Git e gestisci secret tramite file protetti o secret manager del VPS.
- Lascia `SCHEDULER_ENABLED=false` finche il workflow manuale non e stabile.
- Verifica `http(s)://dominio/health`, login, smoke test, creazione task e approvazione bozza.

## Variabili env principali

- `DATABASE_URL`: connessione PostgreSQL per sviluppo locale.
- `JWT_SECRET`: segreto JWT. In produzione deve essere lungo almeno 32 caratteri e non puo essere un placeholder.
- `CORS_ORIGIN`: origine frontend ammessa dal backend, ad esempio `https://agents.example.com`.
- `RATE_LIMIT_WINDOW_MS` / `RATE_LIMIT_MAX`: finestra e soglia del rate limit API.
- `OPENAI_API_KEY`: se vuoto, il backend usa risposte mock deterministiche.
- `OPENAI_MODEL`: modello OpenAI configurabile.
- `OPENAI_TIMEOUT_MS`: timeout massimo per richiesta OpenAI.
- `SCHEDULER_ENABLED`: `false` di default. Se `true`, crea task e bozze schedulate per InstaSpark e LinkForge.
- `INSTAGRAM_CRON`: cron per task Instagram, default lunedi/mercoledi/venerdi alle 09:00.
- `LINKEDIN_CRON`: cron per task LinkedIn, default martedi/giovedi alle 09:00.
- `TELEGRAM_ENABLED`: `false` di default. Se `true`, invia bozze in approvazione a Telegram.
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`, `TELEGRAM_WEBHOOK_SECRET`, `TELEGRAM_WEBHOOK_URL`: configurazione bot e webhook Telegram.
- `LINKEDIN_ENABLED`: `false` di default. Prepara solo mapping/guardrail LinkedIn.
- `LINKEDIN_CLIENT_ID`, `LINKEDIN_CLIENT_SECRET`, `LINKEDIN_REDIRECT_URI`: placeholder OAuth LinkedIn per integrazione futura.
- `REDIS_URL`: store Redis per rate limit condiviso in produzione. In development/test il backend puo ripiegare sullo store in memoria se Redis non e disponibile.
- `VITE_API_URL`: URL API usato in build frontend. In Docker resta `/api` e nginx fa proxy al backend.

La validazione env avviene all'avvio backend in `apps/backend/src/config/env.ts`. Lo startup log mostra solo stato/config safe, mai `JWT_SECRET`, `OPENAI_API_KEY` o prompt completi.

## Workflow operativo agenti

La piattaforma ora e pensata per uso quotidiano:

1. Configura il Brand Profile in `Settings`.
2. Crea un task da `Tasks` o dal dettaglio agente.
3. Esegui il task manualmente o abilita lo scheduler via env.
4. InstaSpark o LinkForge genera una bozza con output JSON validato.
5. Overseer valuta la bozza con `qualityScore`, `riskLevel`, `feedback` e `recommendedAction`.
6. La bozza resta in `Approvals`.
7. Puoi approvare, rifiutare, modificare, chiedere revisione o rigenerare.

Nessun flusso pubblica su Instagram o LinkedIn. Le future API social dovranno partire dalle bozze approvate.

## OpenAI reale o mock

Senza `OPENAI_API_KEY`, il backend usa mock deterministici utili per sviluppo, smoke test e demo offline.

Con OpenAI reale:

```bash
OPENAI_API_KEY=sk-...
OPENAI_MODEL=gpt-4o-mini
OPENAI_TIMEOUT_MS=45000
```

Il client AI e centralizzato in `apps/backend/src/services/ai/aiClient.ts`.
I prompt sono separati in `apps/backend/src/prompts/` per renderli versionabili e sostituibili.
Gli agenti sono strutturati per una futura migrazione a OpenAI Agents SDK: prompt builder, output parser, service agente e task runner sono separati.
Gli errori OpenAI vengono loggati con task, agente, modello e durata; se la risposta non arriva o non passa lo schema Zod, il sistema usa il mock deterministico come fallback operativo.

## Brand Profile

Endpoint:

- `GET /api/settings/brand-profile`
- `PUT /api/settings/brand-profile`

Campi principali:

- chi sono / bio
- servizi offerti
- stack tecnico
- tono comunicativo
- target clienti
- obiettivi commerciali
- argomenti da spingere o evitare
- esempi di post buoni
- parole/frasi da evitare

Questo contesto viene passato a InstaSpark, LinkForge e Overseer.

## Gestione agenti

La pagina `Agents` permette di:

- creare agenti custom
- modificare nome, slug, ruolo, descrizione, status e avatar
- configurare `platformTarget` e `basePrompt` dentro `agent.config`
- assegnare task e vedere task/draft collegati

Gli agenti custom usano `avatarType` selezionabile. Se l'Agent Room non ha ancora uno sprite dedicato, usa un fallback generato nel codice senza asset esterni.

## Agent Room

La vista `Agent Room` trasforma gli agenti in creature companion originali dentro una control room 2D Phaser. Non usa asset esterni e non contiene nomi, sprite o elementi coperti da copyright.

Gli avatar Phaser sono generati runtime con texture pixel-art originali. Ogni agente supporta direzioni `down`, `up`, `left` e `right`, cicli `idle`/`walk` e stati visuali per working, thinking, error e waiting approval. Gli agenti custom senza sprite dedicato ricevono un fallback deterministico basato su id/slug/avatarType, con palette e silhouette coerenti ma non derivate da asset esterni.

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

Gli avatar attuali sono texture generate runtime da `registerAgentSpriteTextures()` e `ensureAgentSpriteTextures()` in `apps/frontend/src/game/AgentSprite.ts`. Per passare a sprite sheet reali:

1. Aggiungi i file in `apps/frontend/public/sprites/`.
2. Prepara sheet originali per ogni direzione (`down`, `up`, `right`, `left`) e modo (`idle`, `walk`, `working`, `thinking`, `error`, `waiting_approval`).
3. In `AgentRoomScene.preload()` carica gli sheet con `this.load.spritesheet("agent-instaspark", "/sprites/instaspark.png", { frameWidth, frameHeight })`, oppure sostituisci la registrazione runtime in `AgentSprite.ts`.
4. In `create()` crea le animazioni Phaser usando chiavi stabili, ad esempio `agent-instaspark-down-walk`.
5. In `AgentSprite.ts` sostituisci `scene.add.image(...)` con `scene.add.sprite(...)` e mappa `setMode()` + direzione alle animazioni.

Mantieni nomi e design originali: niente asset protetti o personaggi riconoscibili di franchise esistenti.

## Aggiungere nuovi agenti

1. Crea l'agente via `POST /api/agents` o aggiungilo al seed Prisma.
2. Assegna un `slug` e un `avatarType` originali.
3. Se non esiste uno sprite dedicato, il fallback custom genera automaticamente una variante originale e stabile.
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
- `POST /api/tasks/:id/retry`
- `POST /api/tasks/:id/cancel`
- `GET /api/drafts`
- `PATCH /api/drafts/:id`
- `POST /api/drafts/:id/approve`
- `POST /api/drafts/:id/reject`
- `POST /api/drafts/:id/request-revision`
- `POST /api/drafts/:id/regenerate`
- `POST /api/telegram/webhook`
- `POST /api/social/linkedin/drafts/:id/prepare`
- `GET /api/settings/brand-profile`
- `PUT /api/settings/brand-profile`
- `GET /api/system/status`
- `GET /api/system/notifications`
- `POST /api/system/notifications/:id/read`
- `POST /api/system/notifications/read-all`

Tutte le route operative richiedono `Authorization: Bearer <token>` tranne `POST /api/telegram/webhook`, protetta da `x-telegram-bot-api-secret-token`. Usa `POST /api/auth/login` per ottenere il token.

## Telegram approvals

Telegram e disattivato di default. Quando `TELEGRAM_ENABLED=true` e la configurazione e completa, ogni bozza social in `waiting_approval` invia un messaggio con:

- titolo, piattaforma e agente
- contenuto bozza
- score/risk/feedback Supervisor
- pulsanti inline: approva, rifiuta, chiedi revisione

Il webhook accetta solo richieste con header `x-telegram-bot-api-secret-token` uguale a `TELEGRAM_WEBHOOK_SECRET`. Le callback sono idempotenti tramite `TelegramApprovalAction.callbackId`.

## LinkedIn preparation

LinkedIn non pubblica contenuti in questa versione.

Disponibile solo la preparazione:

- env OAuth placeholder
- modello `SocialAccount`
- modello `PublishingAttempt`
- mapper da bozza approvata LinkedIn a payload futuro
- endpoint `POST /api/social/linkedin/drafts/:id/prepare`
- bottone UI disabilitato su bozze LinkedIn approvate

Guardrail: solo bozze approvate possono essere preparate; nessun auto-publish.

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

## Smoke test operativo

Con backend e frontend avviati:

```bash
npm run smoke
```

Lo smoke test fa:

- healthcheck
- login
- lettura Brand Profile
- verifica fallback Telegram disabled
- creazione/modifica agente custom
- task internal con agente custom
- creazione task InstaSpark
- run task in mock/OpenAI
- creazione bozza
- review Supervisor
- modifica bozza
- approvazione bozza

Variabili opzionali:

```bash
SMOKE_API_URL=http://localhost:4000/api
SMOKE_HEALTH_URL=http://localhost:4000/health
SMOKE_EMAIL=owner@example.com
SMOKE_PASSWORD=changeme123
```

## Test manuale feedback UI

Per verificare errori di validazione e messaggi operativi:

1. Avvia app e backend con Docker o dev server.
2. Entra in `Settings`.
3. Nel campo `Chi sono` del Brand Profile inserisci piu di 160 caratteri.
4. Premi `Salva profilo`.
5. Atteso: toast di warning/errore, errore sotto il campo, bordo campo evidenziato e contatore oltre limite.
6. Riduci il testo sotto 160 caratteri e salva di nuovo.
7. Atteso: toast `Profilo salvato correttamente`.

Lo stesso sistema di toast/loading/errori copre creazione e run task, retry/cancel, modifica/approval/revision/regenerate bozze, update agente, pausa agente e notifiche.

Errori da verificare durante sviluppo:

- Backend offline/CORS: ferma il backend e salva un form. Atteso: `Il backend non e raggiungibile.`
- Validation 400: `ownerName` oltre 160 caratteri. Atteso: errore campo, non messaggio offline.
- Auth 401: rimuovi o altera il token in localStorage. Atteso: `Sessione scaduta, effettua di nuovo il login.`
- Rate limit 429: abbassa temporaneamente `RATE_LIMIT_MAX` e ripeti richieste. Atteso: `Troppe richieste, riprova tra poco.`
- Response non JSON o shape inattesa: modifica temporaneamente una response dev. Atteso: `Risposta server non valida.`

In development il client logga in console `api.response`, `api.error_payload` e `api.normalize_error` senza includere request body o segreti.

## Roadmap

La roadmap production e in `ROADMAP.md`. Il Project GitHub desiderato e `AI Agent Platform - Production Roadmap`; se non e disponibile automazione Project, usa le issue GitHub e `ROADMAP.md` come backlog sprint.

## Stato production-readiness

Pronto per una prima produzione interna:

- auth JWT con env validata e rate limit Redis-backed in produzione
- task runner con lifecycle, retry falliti, cancel pending, lock anti doppio run e log eventi
- AI OpenAI reale se `OPENAI_API_KEY` esiste, mock deterministico se manca
- prompt separati e output validati con Zod
- Brand Profile usato da InstaSpark, LinkForge e Overseer
- workflow task -> bozza -> supervisor -> approvazione manuale con versioni
- notifiche interne DB/UI per bozze, failure e raccomandazioni Supervisor
- Telegram approvals disattivato di default con webhook sicuro
- LinkedIn publishing architecture preparata, senza pubblicazione reale
- Docker Compose con Postgres, Redis, nginx proxy `/api`, healthcheck backend

Resta da fare per produzione piena:

- worker separato per job lunghi
- ruoli/permessi piu granulari se entrano piu utenti
- backup/restore automatizzati e monitoraggio esterno
- audit trail piu dettagliato per publishing futuro
- WebSocket/SSE al posto del polling UI

## Cosa manca per social reali

Per pubblicare davvero servono ancora:

- OAuth/API Instagram e LinkedIn
- gestione account social per workspace
- mapping bozza approvata -> payload social
- queue/worker separati per publishing
- audit log dedicato alla pubblicazione
- retry e rate limit specifici delle API social

Questa versione prepara la pipeline fino all'approvazione manuale, senza pubblicare.

## Guardrail MVP

- Nessuna pubblicazione reale sui social.
- Ogni bozza social resta in approvazione manuale.
- Gli avatar sono componenti SVG/CSS e texture Phaser generate nel codice, tutte originali.
- Lo scheduler e spento di default.
