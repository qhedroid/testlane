# As-built snapshot

*Branch: `demo/contract-aware-prototype` · June 2026 · Repo wins over docs*

Concise record of **what Relay does today**. Target scope: [`ARCHITECTURE_BASELINE.md`](ARCHITECTURE_BASELINE.md). Frontend phase boundaries: [`MVP_FRONTEND_ONLY_SCOPE.md`](MVP_FRONTEND_ONLY_SCOPE.md).

---

## Stack

| Layer | Technology |
|-------|------------|
| App | Next.js 15 App Router, React 19 (`apps/web`) |
| Workspace | pnpm monorepo |
| Prototype UI | `apps/web/src/fresh/` (FRESH mockup parity) |
| State | React Context + `useReducer`; localStorage key `relay-demo-v2` |
| Backend (partial) | Drizzle ORM, MySQL 8, `@relay/db` |
| IDs (backend) | ULID |
| Auth (dev only) | `x-relay-user-id` header; `NEXT_PUBLIC_RELAY_USER_ID` |

---

## Routes

| Route | Data state | Component | Notes |
|-------|------------|-----------|-------|
| `/dashboard` | mock | `DashboardScreen` | Static seed |
| `/cases` | mock + localStorage | `CasesScreen` | User cases persist in browser |
| `/plans` | mock | `PlansScreen` | Spawn → `/runs`, no API |
| **`/runs`** | **mock + localStorage** | **`RunsScreen`** | **Primary demo** — full execution UX |
| **`/runs/api`** | **api** | **`ApiRunsWorkspace`** | MySQL; not in sidebar |
| `/audit` | mock | `AuditScreen` | Static seed timeline |
| `/defects` | mock | `DefectsScreen` | `MOCK_DEFECTS` |
| `/settings` | mock | `SettingsScreen` | Read-only preview |
| `/reports` | placeholder | `PlaceholderScreen` | |
| `/integrations` | placeholder | `PlaceholderScreen` | |

Aliases: `/test-cases` → `/cases`, `/test-plans` → `/plans`, `/` → `/dashboard`.

Machine-readable contracts: `apps/web/src/lib/relay/prototype-contracts.ts`.

---

## What works end-to-end

### Demo path (no Docker)

1. Open `http://localhost:3000` → dashboard.
2. Browse/create test cases (`/cases`) — persists in localStorage.
3. View plans (`/plans`) — spawn link opens `/runs`.
4. Execute runs (`/runs`) — case + step results, defect IDs, comments, sealed-run read-only; keyboard shortcuts P/F/B/S/D.
5. Cmd+K search over in-memory cases + seed runs/plans.

### API path (Docker + seed)

1. `pnpm docker:up && pnpm db:migrate && pnpm db:seed`
2. Open `/runs/api` — list runs, create run, record case-level Pass/Fail/Blocked/Skip + comment.
3. `pnpm api:validate` — contract checks against live server.

---

## HTTP API (backend slice — reference only for frontend phase)

| Method | Path | Used by |
|--------|------|---------|
| GET | `/api/health` | Validation |
| GET/POST | `/api/runs` | `/runs/api` |
| GET | `/api/runs/:runId` | `/runs/api` |
| POST | `/api/runs/:runId/cases/:runCaseId/result` | `/runs/api` |

Detail: [`docs/implementation/api-contracts.md`](../implementation/api-contracts.md) (backend-phase reference).

---

## Backend services (exist; mostly unwired to demo UI)

- `TestRunService.create()` — spawn run from plan, snapshot cases/steps, audit write
- `ExecutionService.updateCaseResult()` — case-level result + audit write
- `listProjectRuns`, `getRunDetail` — read paths for `/runs/api`
- RBAC in services (`assertMinProjectRole`); no login UI

MySQL schema: 20 tables in `packages/db/schema.ts`. Detail: [`docs/database/schema-rationale.md`](../database/schema-rationale.md) (backend-phase reference).

---

## Not built / prototype-only

| Item | Status |
|------|--------|
| Login / session | Not started |
| Demo `/runs` → API wiring | Not started |
| Case/plan/project CRUD APIs | Not started |
| Step-level results in `/runs/api` UI | Not exposed |
| Requirements | Not modeled |
| Export buttons | Visual only |
| Reports / Integrations | Placeholder |
| OpenSearch in app | No-op stub |
| Audit read API | Writes only; UI is mock seed |
| Defects screen create | Disabled |
| Real multi-project switching | Module label is local state only |

---

## Local commands

```bash
# UI demo only
pnpm install && pnpm dev          # http://localhost:3000

# API workspace
pnpm docker:up && pnpm db:migrate && pnpm db:seed
pnpm dev                          # then /runs/api

pnpm build
pnpm api:validate                 # needs dev server + seeded DB
```

Reset demo localStorage (browser console): `localStorage.removeItem('relay-demo-v2'); location.reload()`

---

## Key paths

```
apps/web/src/fresh/              # Demo UI (screens, seed, FreshProvider)
apps/web/src/components/api-runs/ # API workspace
apps/web/src/lib/relay/          # contracts, mock-data, api-client, config
packages/db/                     # schema, services, seed
mockup/Relay Mockup FRESH.html   # UX reference for FRESH screens
```
