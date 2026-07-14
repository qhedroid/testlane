# As-built snapshot

*Branch: `mvp-backend` · July 2026 · Repo wins over docs*

Concise record of **what Testlane does today**. Target scope: [`ARCHITECTURE_BASELINE.md`](ARCHITECTURE_BASELINE.md).

---

## Stack

| Layer | Technology |
|-------|------------|
| App | Next.js 15 App Router, React 19 (`apps/web`) |
| Workspace | pnpm monorepo |
| UI | `apps/web/src/fresh/` |
| State | React Context + `useReducer` in `FreshProvider`, **synced from the real API for real projects** (reducer-sync + wait-for-server writes; P/F/B/S recording optimistic with rollback); localStorage key `testlane-demo-v2` (`schemaVersion: 14`) acts as the offline cache + store for local-only fields |
| Backend | Drizzle ORM, MySQL 8, `@testlane/db` (27 tables; migrations through `0008`); OpenSearch container exists but client is a no-op stub |
| IDs (backend) | ULID |
| Auth | NextAuth.js Credentials provider, JWT session strategy (no DB adapter tables). `apps/web/src/middleware.ts` gates every page route and API route except `/login`, `/api/auth/*`, `/api/health`, `/api/runs/*`. `/api/runs/*` uses session-first auth with an `x-relay-user-id` dev-header **fallback** (kept for `pnpm api:validate` + cookie-less scripting) |

---

## Data architecture (mvp-backend)

Screens do NOT fetch their own data. `FreshProvider`:

1. Registers the real DB projects on mount (`GET /api/projects` → `REGISTER_REAL_PROJECTS`), dropping local-only projects when real ones exist. Default landing project: the seeded **Demo Project** (slug `dp`, key `DP` — a real DB project; there is no localStorage fallback project, and an unreachable/unseeded API shows a connect/retry gate instead).
2. Syncs the active real project's folders/cases/plans/runs into reducer state (`SYNC_REAL_PROJECT_DATA`), and the real users table into the Admin mock roster (`SYNC_REAL_USERS`, global-admin sessions only).
3. Write actions (`addCase`, `replaceCase`, `addPlan`, `sealRun`, …) **wait for the server**: the local dispatch happens only after the API confirms, so ids/refs are always server-generated and no temp-id reconciliation exists. Failures surface as dismissible error toasts. The one optimistic exception is `updateExecution` (P/F/B/S recording), which rolls back to the previous execution state if the API rejects the write.
4. **Hybrid rule:** most previously local-only data now has a real DB table and syncs from the server (see "Data-layer hardening + new tables" below). The fields that *still* have no backing table stay localStorage-only and are merged across syncs: custom-field values, case references/template, admin automation sources/fields, and "Demo User". Plan `queries` are now persisted server-side (`test_plans.query_definition`) but are still **resolved client-side**, with the resolved case list pushed to `test_plan_cases`.

Entity refs come from the server: cases `TC-<n>` (unpadded), plans `PLAN-<nnn>`, runs `RUN-<nnnn>`, requirements `REQ-<n>`, defects `DEF-<n>`.

### Data-layer hardening + new tables (Candidate 1)

Two follow-up passes moved the bulk of the remaining local-only data onto the real DB and tightened the write path:

- **Hardening pass.** DP is the **real seeded project** (slug `dp`), not a localStorage fallback — the old local-only fallback project is gone and the app shows a connect/retry BootGate when no real projects are reachable. Writes are **wait-for-server** (local dispatch happens only after the API confirms; the temp-id reconciliation layer was removed) — the one optimistic exception is P/F/B/S result recording, which rolls back on rejection. The Dashboard KPI strip + donut read the server summary endpoint (`GET /api/projects/:id/dashboard`); richer widgets still compute client-side off synced state. Ad-hoc (plan-less) runs now create **real** server runs (`test_runs.test_plan_id` is nullable — the run snapshots directly from supplied live case ids).
- **New tables (migrations `0002`–`0008`, hand-authored).** `test_runs.description` (`0002`); `run_step_results` is now **wired** (per-step results — the table existed but was dormant); `run_case_events` (`0003`, append-only per-case execution log powering trends); `case_comments` (`0004`, comments on the case definition — general + per-step, distinct from run-scoped `run_execution_comments`); `requirements` + `case_requirements` (`0005`); `defects` + a nullable `defect_id` FK on `run_defect_links` (`0006`); `test_plans.query_definition` (json, `0007` — GAP-01 resolution); org-scoped `role_definitions` + `api_keys` (`0008`).

**Now backed by the real DB** (was local-only): per-step results, execution log / trends, case comments, requirements + case links, defect entities (internal `DEF-<n>` defects; external free-text refs unchanged), plan query definitions, and admin role definitions + API keys. **Still local-only:** custom fields (owned by `mvp-custom-fields`) and admin automation sources/fields (deferred).

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
| `/:projectKey/defects` | real (`defects` table) + mock fallback | `DefectsScreen` | Internal `DEF-<n>` defects are real entities; run defect links carry a nullable `defect_id`; seed creates none yet, so real projects fall back to `MOCK_DEFECTS` until defects are created |
| `/:projectKey/requirements` | real (`requirements` table) | `RequirementsScreen` | Real `REQ-<n>` requirements + `case_requirements` links; seed creates none yet, so falls back to `STATIC_REQUIREMENTS` until created |
| `/mywork`, `/milestones`, `/reports`, `/aistudio` | mock/static | various | Visual shells |
| **`/admin/users`** | **real (admin session) + local fallback** | `AdminUsersPageContent` | List/invite/role/disable wired to `/api/users`; granular roles compress onto `globalRole` |
| **`/admin/roles`, `/admin/api-keys`** | **real (admin session) + local fallback** | `Admin*PageContent` | Role definitions + API keys wired to `/api/admin/roles`/`/api/admin/api-keys` (org-scoped); built-in roles guarded |
| `/admin/*` (rest) | mock + localStorage | `Admin*PageContent` | Custom fields, automation sources/fields stay local |

**Seed projects (DB):** **Demo Project** (`DP`, slug `dp`) — richly seeded (4 folders, 14 cases, 2 plans, 4 runs at every lifecycle stage) — plus five EMPTY projects: CTMS, eTMF, IAM, eFeasibility, GL. "Create Demo Project" deep-clones it via `POST /api/projects/:id/clone` (sequential keys: DP2, DP3, …). "Reset workspace…" (project switcher, global admin+) wipes everything and restores this baseline via `POST /api/admin/reset`. The old localStorage-only fallback project has been removed entirely.

---

## What works end-to-end (Docker + seed + login)

1. `pnpm docker:up && pnpm db:migrate && pnpm db:seed && pnpm dev`
2. Log in (`ssevume@ti.com` / `testlane-demo-2026` — see README "Local dev login") → `/DP/dashboard`.
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
| POST | `/api/runs/:runId/cases/:runCaseId/steps/:stepSnapshotId/result` | session-first, dev-header fallback |
| GET/POST/DELETE | `/api/runs/:runId/cases/:runCaseId/defects[/:linkId]` | session-first, dev-header fallback |
| GET/POST | `/api/users` · PATCH `/api/users/:userId` | session (global admin) |
| GET/POST | `/api/projects` · POST `/api/projects/:projectId/roles` · POST `/api/projects/:projectId/clone` | session |
| GET/POST | `/api/projects/:projectId/cases[/:caseId GET/PATCH/DELETE]` | session |
| POST | `/api/projects/:projectId/cases/:caseId/comments` | session |
| POST | `/api/projects/:projectId/cases/:caseId/requirements` (link) | session |
| GET/POST | `/api/projects/:projectId/requirements` | session |
| GET/POST | `/api/projects/:projectId/defects` | session |
| GET/POST | `/api/projects/:projectId/folders` | session |
| GET/POST | `/api/projects/:projectId/plans[/:planId GET/PATCH/DELETE]` · PUT `…/plans/:planId/cases` | session |
| GET | `/api/projects/:projectId/dashboard` | session — feeds the Dashboard KPI strip + donut (richer widgets still compute client-side off synced state) |
| GET | `/api/projects/:projectId/audit` | session |
| GET/POST | `/api/admin/roles` · PATCH/DELETE `/api/admin/roles/:roleId` | session (global admin) |
| GET/POST | `/api/admin/api-keys` · DELETE `/api/admin/api-keys/:keyId` | session (global admin) |
| POST | `/api/admin/reset` | session (global admin) — wipes + reseeds the workspace |

Contracts: [`FRONTEND_CONTRACTS.md`](FRONTEND_CONTRACTS.md).

---

## Backend services

`TestRunService` (create/updateRun incl. `description` + optional plan-less runs + ref generation), `ExecutionService` (case results + `updateStepResult` per-step results), run read paths (`listProjectRuns` incl. per-case results, per-step results, `run_case_events`, and defect refs; `getRunDetail`), `TestCaseService` (cases/folders + `addCaseComment`), `TestPlanService` (incl. `query_definition` persistence), `RequirementService` (`REQ-<n>` entities + case links), `DashboardService` (feeds the Dashboard KPI strip/donut), `AuditService` (`recordAudit` called by every mutation + `listAuditLog`), `DefectService` (first-class `DEF-<n>` defect entities + run defect links), `AdminSettingsService` (org-scoped role definitions + API keys, global-admin RBAC), `UserService`, `ProjectService`, `ProjectCloneService`, `WorkspaceResetService`. RBAC via `assertMinProjectRole` / global-role checks throughout.

---

## Not built / local-only (documented gaps)

| Item | Status |
|------|--------|
| Per-step results | **Real** — `run_step_results` wired via `ExecutionService.updateStepResult` (was dormant) |
| Execution log / trends | **Real** — append-only `run_case_events`; `executionLog` rebuilt from it, dashboard trends live |
| Case comments | **Real** — `case_comments` (general + per-step, on the case definition) |
| Defects as first-class entities | **Real** — `defects` table (`DEF-<n>`) + nullable `defect_id` FK on `run_defect_links`; external free-text refs unchanged |
| Requirements | **Real** — `requirements` + `case_requirements` link table (`REQ-<n>`) |
| Admin role definitions + API keys | **Real** — org-scoped `role_definitions` + `api_keys` (`AdminSettingsService`) |
| Admin automation sources/fields | Local mock (`AdminSettings`) — deferred |
| Custom Fields backend | Separate branch (`mvp-custom-fields`) — untouched, stays local |
| OpenSearch | No-op stub; search runs on client-side filtering |
| Reports / Integrations / My Work / Milestones / AI Studio | Visual shells |
| Cloning of new-table data | `ProjectCloneService` clones `run_case_events` + plan `query_definition` but not `case_comments`/`case_requirements`/`defects` — deferred cleanup |
| Optimistic writes | Now **wait-for-server** across all mutations; only P/F/B/S result recording stays optimistic (with rollback) — demo-only, revisit before production |

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
