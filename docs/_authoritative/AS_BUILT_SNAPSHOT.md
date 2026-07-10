# As-built snapshot

*Branch: `mvp-backend` · July 2026 · Repo wins over docs*

Concise record of **what Relay does today**. Target scope: [`ARCHITECTURE_BASELINE.md`](ARCHITECTURE_BASELINE.md).

---

## Stack

| Layer | Technology |
|-------|------------|
| App | Next.js 15 App Router, React 19 (`apps/web`) |
| Workspace | pnpm monorepo |
| UI | `apps/web/src/fresh/` |
| State | React Context + `useReducer` in `FreshProvider`, **synced from the real API for real projects** (reducer-sync + wait-for-server writes; P/F/B/S recording optimistic with rollback); localStorage key `relay-demo-v2` (`schemaVersion: 14`) acts as the offline cache + store for local-only fields |
| Backend | Drizzle ORM, MySQL 8, `@relay/db` (21 tables); OpenSearch container exists but client is a no-op stub |
| IDs (backend) | ULID |
| Auth | NextAuth.js Credentials provider, JWT session strategy (no DB adapter tables). `apps/web/src/middleware.ts` gates every page route and API route except `/login`, `/api/auth/*`, `/api/health`, `/api/runs/*`. `/api/runs/*` uses session-first auth with an `x-relay-user-id` dev-header **fallback** (kept for `pnpm api:validate` + cookie-less scripting) |

---

## Data architecture (mvp-backend)

Screens do NOT fetch their own data. `FreshProvider`:

1. Registers the real DB projects on mount (`GET /api/projects` → `REGISTER_REAL_PROJECTS`), dropping local-only projects when real ones exist. Default landing project: the seeded **Demo Project** (slug `dp`, key `DP` — a real DB project; there is no localStorage fallback project, and an unreachable/unseeded API shows a connect/retry gate instead).
2. Syncs the active real project's folders/cases/plans/runs into reducer state (`SYNC_REAL_PROJECT_DATA`), and the real users table into the Admin mock roster (`SYNC_REAL_USERS`, global-admin sessions only).
3. Write actions (`addCase`, `replaceCase`, `addPlan`, `sealRun`, …) **wait for the server**: the local dispatch happens only after the API confirms, so ids/refs are always server-generated and no temp-id reconciliation exists. Failures surface as dismissible error toasts. The one optimistic exception is `updateExecution` (P/F/B/S recording), which rolls back to the previous execution state if the API rejects the write.
4. **Hybrid rule:** fields with no DB tables stay localStorage-only and are merged across syncs: case comments, custom-field values, requirement links, references/template; plan `queries` (the authoring model — resolved case lists are pushed to `test_plan_cases`); run description, per-step results, execution log; Admin role definitions; "Demo User".

Entity refs come from the server: cases `TC-<n>` (unpadded), plans `PLAN-<nnn>`, runs `RUN-<nnnn>`.

---

## Routes

**Canonical pattern:** `/:projectKey/:module` — e.g. `/DP/dashboard`, `/CTMS/testruns`.

| Route | Data state | Component | Notes |
|-------|------------|-----------|-------|
| `/login` | real | `LoginScreen` | NextAuth credentials; gates the app |
| `/:projectKey/dashboard` | real (computed client-side) | `DashboardScreen` | Computes off synced reducer state |
| `/:projectKey/cases` | real + local-only fields | `CasesScreen` | Full CRUD wired to `/api/projects/:id/cases|folders` |
| `/:projectKey/plans`, `/plans/tp/:planKey` | real + local queries | `PlansScreen` | CRUD + spawn run wired; queries local, case lists pushed via `setPlanCases` |
| **`/:projectKey/testruns[/tr/:runKey]`** | **real + local-only fields** | **`RunsScreen`** | **Protected execution UX** — results/seal/archive/spawn wired to `/api/runs/*` |
| **`/runs/api`** | real | `ApiRunsWorkspace` | Legacy API workspace; session auth wins when logged in |
| `/:projectKey/audit` | real (screen-level fetch) | `AuditScreen` | Live `audit_log` for real projects |
| `/:projectKey/defects` | local + mock | `DefectsScreen` | No `defects` table — local entities; run defect links sync into executions |
| `/:projectKey/requirements`, `/mywork`, `/milestones`, `/reports`, `/aistudio` | mock/static | various | Visual shells |
| **`/admin/users`** | **real (admin session) + local fallback** | `AdminUsersPageContent` | List/invite/role/disable wired to `/api/users`; granular roles compress onto `globalRole` |
| `/admin/*` (rest) | mock + localStorage | `Admin*PageContent` | Role definitions, custom fields, etc. stay local |

**Seed projects (DB):** CTMS, eTMF, Viewer, SSO/IAM, Reporting, API Gateway, and **Demo Project** (`DP`, slug `dp`) — richly seeded (4 folders, 14 cases, 2 plans, 4 runs at every lifecycle stage). "Create Demo Project" deep-clones it via `POST /api/projects/:id/clone`. The old localStorage-only fallback project has been removed entirely.

---

## What works end-to-end (Docker + seed + login)

1. `pnpm docker:up && pnpm db:migrate && pnpm db:seed && pnpm dev`
2. Log in (`ssevume@ti.com` / `relay-dev-2026` — see README "Local dev login") → `/DP/dashboard`.
3. Cases: browse seeded cases, quick-add/edit/delete — persists to MySQL, audited.
4. Plans: seeded plans with case lists; create/edit/duplicate/delete; query groups resolve locally and sync to `test_plan_cases`; spawn run creates a real snapshotted run.
5. Runs: full three-pane execution UX over real runs; P/F/B/S results persist; seal/reopen/archive; duplicate.
6. Audit: live event log per project. Admin users: real roster, invite/role/disable (as global admin).
7. `pnpm api:validate` — contract checks via the dev-header fallback.

---

## HTTP API

| Method | Path | Auth |
|--------|------|------|
| GET | `/api/health` | none |
| GET/POST | `/api/auth/[...nextauth]` | — |
| GET/POST | `/api/runs` · GET/PATCH `/api/runs/:runId` · POST `/api/runs/:runId/cases/:runCaseId/result` | session-first, dev-header fallback |
| GET/POST/DELETE | `/api/runs/:runId/cases/:runCaseId/defects[/:linkId]` | session-first, dev-header fallback |
| GET/POST | `/api/users` · PATCH `/api/users/:userId` | session (global admin) |
| GET/POST | `/api/projects` · POST `/api/projects/:projectId/roles` · POST `/api/projects/:projectId/clone` | session |
| GET/POST | `/api/projects/:projectId/cases[/:caseId GET/PATCH/DELETE]` | session |
| GET/POST | `/api/projects/:projectId/folders` | session |
| GET/POST | `/api/projects/:projectId/plans[/:planId GET/PATCH/DELETE]` · PUT `…/plans/:planId/cases` | session |
| GET | `/api/projects/:projectId/dashboard` | session — feeds the Dashboard KPI strip + donut (richer widgets still compute client-side off synced state) |
| GET | `/api/projects/:projectId/audit` | session |

Contracts: [`FRONTEND_CONTRACTS.md`](FRONTEND_CONTRACTS.md).

---

## Backend services

`TestRunService` (create/updateRun + ref generation), `ExecutionService` (case results), run read paths (`listProjectRuns` incl. per-case results + defect refs, `getRunDetail`), `TestCaseService`, `TestPlanService`, `DashboardService` (feeds the Dashboard KPI strip/donut), `AuditService` (`recordAudit` called by every mutation + `listAuditLog`), `DefectService` (run defect links only), `UserService`, `ProjectService`, `ProjectCloneService`. RBAC via `assertMinProjectRole` / global-role checks throughout.

---

## Not built / local-only (documented gaps)

| Item | Status |
|------|--------|
| Ad-hoc (plan-less) run creation | Local-only — server `createRun` requires a test plan |
| Per-step results + step comments in fresh UI | Local-only (`run_step_results` exist server-side but aren't wired) |
| Execution log (per-transition history) | Local-only — no append-only table |
| Defects as first-class entities | No `defects` table; only `run_defect_links` are real |
| Requirements | Not modeled |
| Admin role definitions / custom fields / API keys / automation | Local mock (`AdminSettings`) |
| Custom Fields backend | Separate branch (`mvp-custom-fields`) — untouched |
| OpenSearch | No-op stub; search runs on client-side filtering |
| Reports / Integrations / My Work / Milestones / AI Studio | Visual shells |
| Optimistic writes | Demo-only; revisit before production |

---

## Local commands

```bash
pnpm docker:up && pnpm db:migrate && pnpm db:seed
pnpm dev                          # http://localhost:3000 → /login
pnpm build
pnpm api:validate                 # needs dev server + seeded DB
```

Reset local cache: visit any page with `?relay-reset=1` (clears localStorage only — never the DB).

---

## Key paths

```
apps/web/src/fresh/data/FreshProvider.tsx   # reducer-sync + write-through core
apps/web/src/lib/relay/                     # project/case/plan/run/audit/user clients + adapters
apps/web/src/middleware.ts                  # session gate
apps/web/src/lib/api/                       # route helpers: auth (session-first), schemas, errors
apps/web/src/app/api/                       # all API routes
apps/web/src/fresh/screens/                 # screens (RunsScreen = protected execution UX)
packages/db/                                # schema, services, seed (incl. demo-project-seed.ts)
docs/claude/mvp-backend/                    # branch plan + progress (session-resumable state)
```
