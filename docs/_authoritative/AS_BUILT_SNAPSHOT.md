# As-built snapshot

*Branch: `mvp-final-close-out` · 2026-07-03 · Repo wins over docs*

Concise record of **what Relay does today**. Target scope: [`ARCHITECTURE_BASELINE.md`](ARCHITECTURE_BASELINE.md). Frontend phase boundaries: [`MVP_FRONTEND_ONLY_SCOPE.md`](MVP_FRONTEND_ONLY_SCOPE.md).

---

## Stack

| Layer | Technology |
|-------|------------|
| App | Next.js 15 App Router, React 19 (`apps/web`) |
| Workspace | pnpm monorepo |
| Prototype UI | `apps/web/src/fresh/` (FRESH mockup parity) |
| State | React Context + `useReducer`; localStorage key `relay-demo-v2` (`schemaVersion: 22` — multi-project, admin access, actor, test plans, local requirements/defects, saved reports/filters, export history, re-run lineage, case ordering/archive, scheduled runs, dashboard layouts, case versions) |
| Backend (partial) | Drizzle ORM, MySQL 8, `@relay/db` |
| IDs (backend) | ULID |
| Auth (dev only) | `x-relay-user-id` header; `NEXT_PUBLIC_RELAY_USER_ID` |

---

## Routes

**Canonical pattern:** `/:projectKey/:module` — e.g. `/DP/dashboard`, `/CTMS/testruns`.

| Route | Data state | Component | Notes |
|-------|------------|-----------|-------|
| `/:projectKey/dashboard` | mock | `DashboardScreen` | Full metrics when `seedTemplate === 'demo'`; placeholder for other projects |
| `/:projectKey/cases` | mock + localStorage | `CasesScreen` | Scoped to active project |
| `/:projectKey/plans` | mock + localStorage | `PlansScreen` | Plan list + URL routing; CRUD modals; test case query groups; spawn run |
| `/:projectKey/plans/tp/:planKey` | mock + localStorage | `PlansScreen` | Plan detail (Overview + Test cases tabs) |
| **`/:projectKey/testruns`** | **mock + localStorage** | **`RunsScreen`** | **Primary demo** — run list; no run selected |
| **`/:projectKey/testruns/tr/:runKey`** | **mock + localStorage** | **`RunsScreen`** | **Primary demo** — full execution UX for selected run |
| **`/runs/api`** | **api** | **`ApiRunsWorkspace`** | MySQL; not project-prefixed |
| `/:projectKey/audit` | mock | `AuditScreen` | Static seed |
| `/:projectKey/defects` | mock + localStorage | `DefectsScreen` | Static `MOCK_DEFECTS` + local `DEF-*` from executions |
| `/:projectKey/settings` | mock + localStorage | `SettingsScreen` | Project settings section editable (`manageProjects` roles) |
| `/:projectKey/reports` | mock + localStorage | `ReportsScreen` | Real reporting: control bar, charts, drill-down, effectiveness, coverage, saved views, exports history (`?view=exports`) |
| `/:projectKey/mywork` | mock + localStorage | `MyWorkScreen` | Personal work queue, deep links into runs |
| `/:projectKey/integrations` | placeholder | `PlaceholderScreen` | |
| **`/admin`** | **mock + localStorage** | **`AdminShell`** | Global settings — actor switcher, sidebar nav |
| **`/admin/profile`** … **`/admin/audit-log`** | **mock + localStorage** | **`Admin*PageContent`** | Profile, org, projects, audit, etc. |
| **`/admin/users`** | **mock + localStorage** | **`AdminUsersPageContent`** | User management — invite, silent invite, edit, disable |
| **`/admin/roles`** | **mock + localStorage** | **`AdminRolesPageContent`** | Role management — built-in + custom, permission matrix |

**Legacy redirects** (client-side, via `LegacyRouteRedirect`): `/dashboard`, `/cases`, `/runs`, `/plans`, etc. → `/${activeProjectKey}/…`. Root `/` → `/DP/dashboard`.

**Seed project:** Demo Project (`key: DP`, `seedTemplate: 'demo'`) holds default dummy data. Cloned demo projects use keys `DP1`, `DP2`, … via “Add demo project”.

Aliases: `/test-cases` → cases module, `/test-plans` → plans module.

Machine-readable contracts: `apps/web/src/lib/relay/prototype-contracts.ts`.

---

## What works end-to-end

### Demo path (no Docker)

1. Open `http://localhost:3000` → `/DP/dashboard` (demo metrics).
2. Browse/create test cases (`/DP/cases`) — persists in localStorage; isolated per project.
3. Create/browse plans (`/DP/plans`) — full CRUD; test case query groups (condition/folder/static); spawn run modal pre-fills title and case count, creates run and navigates to `/DP/testruns`.
4. Execute runs — open `/DP/testruns/tr/00001` (or pick a run); full execution UX; scoped to active project. Run keys are per-project (`00001` …).
5. **Create / duplicate / delete runs** — modal create, More… menu duplicate/delete, topbar seal toggle.
6. **Project switching** — switcher rewrites URL (`/DP/testruns/tr/00001` → `/CTMS/testruns`; run selection stripped); create via modal (name/key/description); **Add demo project** clones template as `DP1`, `DP2`, …
7. Cmd+K search over active project's cases + runs.

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
| Requirements | **Modeled locally** (v14) — create/link on cases, view in runs, coverage rollup + badges (close-out Area H). No external sync |
| Export buttons | **Implemented** — shared drawer; real CSV, print-friendly HTML for "PDF" (labelled); session-only artifacts + regenerable history; shareable link stub |
| Reports | **Implemented** — `ReportsScreen` (close-out Areas A/J/H) |
| Integrations | Placeholder |
| Re-runs / lineage | **Implemented** — `rerunOf` chains, close-run confirmation, picker grouping |
| Scheduled runs | **Implemented (simulated)** — client-side firing only, no background job |
| Case organization | **Implemented** — bulk actions, move/copy dialog, manual order + DnD, case/folder archive |
| Rich text | **Implemented** — markdown subset on string fields, no schema change |
| Case version history | **Implemented** — real diffs + restore, cap 50/case (v22) |
| OpenSearch in app | No-op stub |
| Audit read API | Writes only; UI is mock seed |
| Defects screen create | Disabled (create from runs) |
| Real multi-project switching | **Implemented** — key-prefixed URLs + `ProjectSwitcher` + create modal + add demo project |
| Project settings screen | **Implemented** — editable section on `/:key/settings` (switcher menu item still disabled) |
| Admin panel (`/admin`) | **Implemented** — user/role management incl. permanent remove (no cascade), demo actor RBAC on admin actions, silent invite, permission matrix |

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

**Migration:** v1→v2 multi-project; v2→v3 adds `key`/`description`; v3→v4 adds `runKey`/URL run selection; v4→v5 adds `adminSettings`; v6–v11 case/run field additions; v12 user/role access (`currentActorUserId`, expanded admin models); v13 test plans (`plansById`, `nextPlanNumByProject`, seed plans); v14 local requirements/defects; v15 `savedReportsById`; v16 `exportsById`; v17 `DemoRun.rerunOf`; v18 `Case.position`/`Case.archivedAt`/`Folder.archivedAt`; v19 `scheduledRunsById`; v20 `dashboardLayoutByActor`; v21 `savedFiltersById`; v22 `caseVersionsById`. Failed migration resets to seed.

---

## Key paths

```
apps/web/src/fresh/              # Demo UI (screens, seed, FreshProvider, ProjectSwitcher)
apps/web/src/fresh/data/admin-initial-settings.ts  # AdminSettings seed data
apps/web/src/fresh/data/admin-reducer.ts     # admin/* reducer actions
apps/web/src/fresh/components/admin/  # Admin panel shell + page content components
apps/web/src/app/admin/          # Global /admin route group (not project-prefixed)
apps/web/src/fresh/lib/project-routes.ts  # Key-prefixed URL helpers
apps/web/src/fresh/data/demo-template.ts   # Immutable demo template clone
apps/web/src/fresh/data/demo-project-utils.ts  # Dashboard scoping + demo clone
apps/web/src/app/(app)/[projectKey]/    # Canonical routed pages
apps/web/src/components/api-runs/ # API workspace
apps/web/src/lib/relay/          # contracts, mock-data, api-client, config
packages/db/                     # schema, services, seed
mockup/Relay Mockup FRESH.html   # UX reference for FRESH screens
```
