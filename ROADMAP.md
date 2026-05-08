# AI Agent Platform - Production Roadmap

Roadmap per portare la piattaforma a una prima versione deployabile e operativa. Le integrazioni social restano protette da guardrail: nessuna pubblicazione automatica.

## Project

- Nome desiderato: `AI Agent Platform - Production Roadmap`
- Stato: GitHub CLI non autenticata localmente; usare le issue GitHub e questo file come backlog se il Project non puo essere creato automaticamente.
- Labels suggerite: `feature`, `bug`, `chore`, `backend`, `frontend`, `devops`, `telegram`, `linkedin`, `security`, `production`, `high-priority`

## Sprint 1 - Core Stabilization

Obiettivo: stabilizzare cio che esiste prima di aggiungere integrazioni.

| Ticket | Priorita | Labels | Acceptance criteria |
| --- | --- | --- | --- |
| Fix Brand Profile save error handling | High | bug, frontend, high-priority | Validation 400 mostra field error; success toast su save; nessun falso backend offline. |
| Ensure task -> AI -> draft -> Overseer -> approval flow is stable | High | backend, high-priority | Il flow completo funziona con mock e OpenAI; errori task sono loggati; nessuna doppia esecuzione. |
| Add smoke test for full operational flow | High | chore, backend | Smoke copre login, agent CRUD minimo, task run, draft, review, approval. |
| Verify Docker production build | High | devops, production | `docker compose up --build` parte; frontend/backend rispondono; migrations applicate. |
| Verify env validation in production mode | High | security, production | `NODE_ENV=production` fallisce senza secret obbligatori e placeholder insicuri. |
| Improve frontend success/error feedback consistency | Medium | frontend | Operazioni importanti mostrano loading, success/error toast e messaggi chiari. |

## Sprint 2 - Agent Management UI

Obiettivo: permettere di creare e gestire agenti dalla UI.

| Ticket | Priorita | Labels | Acceptance criteria |
| --- | --- | --- | --- |
| Add create agent form | High | feature, frontend | Da Agents si crea un agente con validazione e toast; compare in dashboard. |
| Add edit agent form | High | feature, frontend | Modifica ruolo, descrizione, status, avatar e config da UI. |
| Add agent prompt/config editor | High | feature, frontend, backend | Config JSON validata; prompt base salvato in `config`. |
| Add avatar type selector | Medium | feature, frontend | Scelta archetype/palette/visual role; fallback per custom agents. |
| Add agent status controls | Medium | feature, frontend | Idle/paused-like/error controls senza rompere task running. |
| Add validation frontend/backend | High | frontend, backend | Limiti coerenti con Zod; errori campo mostrati. |
| Add agent detail improvements | Medium | frontend | Detail mostra config, platform target, task e draft collegati. |
| Add tests/smoke checks for agent CRUD | High | chore, backend | Smoke crea/modifica agente custom e assegna task. |

## Sprint 2B - Agent Avatars & Visual Identity

Obiettivo: trasformare gli avatar agenti da placeholder a mini character RPG originali, senza asset o design protetti.

Guardrail: non usare Pokemon reali, trainer Pokemon reali, sprite sheet Pokemon, asset Nintendo/Game Freak, design riconoscibili o palette copiate.

| Ticket | Priorita | Labels | Acceptance criteria |
| --- | --- | --- | --- |
| Redesign agent avatars as pixel-art dev/NPC characters | Medium | feature, frontend | Avatar sembrano operatori AI/dev, non emoji/blob. |
| Add avatar direction animations | Medium | feature, frontend | Supporto up/down/left/right o facing equivalente. |
| Add walking animation cycles | Medium | feature, frontend | Camminata leggibile, senza sliding evidente. |
| Add idle animation cycles | Medium | feature, frontend | Idle breathing/blinking differenziati. |
| Add blinking/breathing micro animations | Low | frontend | Micro animazioni soft e non distraenti. |
| Add workstation interaction animations | Medium | frontend | Working/thinking hanno interazioni con desk/monitor. |
| Add layered clothing/accessories system | Low | frontend | Struttura per outfit/accessori configurabili. |
| Add avatar customization support | Medium | frontend | Custom agents scelgono archetype, palette e visual role. |
| Add avatar rendering depth improvements | Medium | frontend | Depth e occlusion coerenti con la stanza. |
| Add fallback avatar generator for custom agents | High | frontend | Custom agent senza sprite non rompe Agent Room. |
| Prepare sprite sheet pipeline for future artists/assets | Medium | frontend, chore | Config documentata per sostituire placeholder con asset originali. |
| Improve Agent Room immersion and NPC feeling | Low | frontend | Solo refinements mirati, senza nuove feature enterprise. |

## Sprint 3 - Telegram Approvals

Obiettivo: approvare bozze da Telegram senza entrare nella dashboard.

| Ticket | Priorita | Labels | Acceptance criteria |
| --- | --- | --- | --- |
| Add Telegram bot env/config | High | backend, telegram | Env validate; disabled default; startup safe senza token. |
| Add Telegram notification service | High | backend, telegram | Service separato invia preview se configurato. |
| Send draft preview to Telegram | High | backend, telegram | Waiting approval genera messaggio con titolo, platform, agente, score, risk, feedback. |
| Add Telegram inline buttons | High | backend, telegram | Approva/rifiuta/revisione con callback payload sicuro. |
| Add secure callback handling | High | backend, telegram, security | Webhook secret verificato; niente secret nei log. |
| Add audit log for Telegram actions | High | backend, telegram | Azioni salvate con sorgente Telegram. |
| Add fallback if Telegram is disabled | High | backend, telegram | Sistema non crasha; log warning safe se configurazione incompleta. |
| Update README setup Telegram bot | Medium | docs, telegram | Setup bot/chat/webhook documentato. |

## Sprint 4 - LinkedIn Publishing Preparation

Obiettivo: preparare l'architettura LinkedIn API senza pubblicazione automatica.

| Ticket | Priorita | Labels | Acceptance criteria |
| --- | --- | --- | --- |
| Design social account model | Medium | backend, linkedin | Schema pronto per provider/account/token metadata. |
| Add LinkedIn OAuth config structure | Medium | backend, linkedin | Env placeholder validate; disabled default. |
| Add approved draft -> LinkedIn payload mapper | Medium | backend, linkedin | Mapper testabile da draft approvata a payload post. |
| Add manual publish action placeholder | Medium | frontend, linkedin | Bottone disabilitato/feature flagged con guardrail. |
| Add publishing audit log model | Medium | backend, linkedin | Tentativi/guardrail tracciabili. |
| Add social publishing guardrails | High | backend, security, linkedin | Nessun auto-publish; solo bozza approvata e conferma manuale futura. |
| Document LinkedIn API requirements | Medium | docs, linkedin | OAuth, scope, refresh token e rate limit documentati. |

## Sprint 5 - VPS Deploy Hardening

Obiettivo: preparare deploy production interno.

| Ticket | Priorita | Labels | Acceptance criteria |
| --- | --- | --- | --- |
| Add production docker compose docs | High | devops, production | Compose/proxy/env production documentati. |
| Add reverse proxy/TLS checklist | High | devops, security, production | Nginx/Caddy/Traefik, HTTPS e headers checklist. |
| Add Postgres backup docs/script | High | devops, production | Script backup e restore documentati. |
| Add healthcheck verification script | High | devops, production | Script verifica health/API/frontend. |
| Add restart policy docs | Medium | devops, production | Restart policy e update deploy documentati. |
| Add firewall checklist | High | devops, security, production | Porte e ufw/firewall documentati. |
| Add secrets management checklist | High | security, production | Secret generation/storage/rotation documentati. |
| Add production readiness checklist | High | production | Checklist finale prima deploy VPS. |

