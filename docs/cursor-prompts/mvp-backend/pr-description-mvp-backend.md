# PR: mvp-backend → mvp-main

## Summary
Stands up the real backend and converts the entire fresh UI from localStorage-driven demo state onto it, then hardens that conversion and moves the last remaining local-only data areas onto the DB. Login/session gates the app (NextAuth Credentials, JWT); every module — Dashboard, Test Cases, Test Plans, Test Runs, Defects, Requirements, Audit, Admin — reads and writes real MySQL via session-authenticated API routes; and a richly-seeded, explorable **Demo Project** (`DP`) is the real default landing project. The UI entry point is `/login` → `/DP/dashboard`. Screens were not rewritten: `FreshProvider` syncs reducer state from the API per active project and write actions call the API, so every screen (including the protected three-pane Runs execution UX) kept its existing code. Since the initial conversion, a hardening pass made writes wait-for-server (with one deliberate optimistic exception), replaced the localStorage fallback project with the real seeded `DP`, and moved the Dashboard onto a server summary endpoint; and **Candidate 1** added real tables for the eight data areas that were still localStorage-only — per-step results, run execution history/trends, case comments, requirements, defect entities, plan query definitions (closing GAP-01), and Admin role definitions + API keys. All work has been verified locally against real Docker MySQL.

---

## What's included

### Foundation — auth, RBAC, User/Project API

**Phase 1 foundation — real login, RBAC, User/Project API** ([`b430e50`](https://github.com/qhedroid/Relay/commit/b430e50))
- NextAuth.js Credentials provider with JWT session strategy (no DB adapter tables — deliberate, IAM replaces this later); all seed users get bcryptjs password hashes with a shared local-dev password
- New `apps/web/src/middleware.ts` session gate on every route except `/login`, `/api/auth/*`, `/api/health`, `/api/runs/*`
- New `UserService`/`ProjectService` + `/api/users/*`, `/api/projects/*`, `/api/projects/:id/roles` routes with real RBAC (`assertMinProjectRole()`, global-admin checks)
- `LoginScreen` wired to real `signIn()`; new top-level `/login` route; `UserMenu` sign-out in the top bar

**Seed users renamed to the real team** ([`4e5ad45`](https://github.com/qhedroid/Relay/commit/4e5ad45))
- 8 real team members across DB seed and Admin panel, with granular-role → `globalRole` compression mapping

### Module backends

**Phase 2/3/5/6 backends — cases, plans, dashboard, defects, audit** ([`7fc415e`](https://github.com/qhedroid/Relay/commit/7fc415e))
- `TestCaseService` (+ folders): full CRUD, transactional `TC-<n>` ref generation, delete = archive; routes under `/api/projects/:id/cases|folders`
- `TestPlanService`: CRUD + `setPlanCases`, `PLAN-<nnn>` refs
- `DashboardService` + route (server-side aggregation)
- `AuditService` (`recordAudit` retrofitted into every case/plan mutation + `listAuditLog`) and `DefectService` (`run_defect_links` CRUD)

### Real project picker + Demo Project

**Real project picker** ([`2403930`](https://github.com/qhedroid/Relay/commit/2403930))
- `FreshProvider` registers real DB projects on mount, replacing the client-only demo project; real projects use DB ULIDs as ids and slug-derived keys

**Demo Project seed + cloning** ([`119850a`](https://github.com/qhedroid/Relay/commit/119850a))
- Richly-seeded project: nested folders, cases with 1–8 steps, plans, runs across every lifecycle stage, defect links, per-user project roles
- Generic `ProjectCloneService.cloneProject()` + `POST /api/projects/:id/clone`; "Create Demo Project" button in the switcher

**Hydration + redirect fixes** ([`4ca5bfa`](https://github.com/qhedroid/Relay/commit/4ca5bfa), [`47caed6`](https://github.com/qhedroid/Relay/commit/47caed6))
- Fixed a real SSR/localStorage hydration mismatch (deferred localStorage read to post-mount HYDRATE) and the double-redirect flicker on real-project URLs (`realProjectsLoaded` gate in `ProjectRouteSync`)

### Screen-wiring (reducer-sync + write-through)

**Cases** ([`644f959`](https://github.com/qhedroid/Relay/commit/644f959))
- New `case-client.ts` with all adapters: priority/type casing, assignee name ↔ `assignedTo` ULID (static seed-user map), server refs as caseKeys
- `FreshProvider`: `SYNC_REAL_PROJECT_DATA` + write-through on `addCase`/`updateCase`/`replaceCase`/`deleteCase`/`addFolder`
- `listCases()` returns full `CaseDetail[]` (avoids N+1 on load)

**Plans, Audit, Admin users + glitch fixes** ([`c654f82`](https://github.com/qhedroid/Relay/commit/c654f82))
- Plans: client-side query resolution pushes the case list via `setPlanCases`; `slugToPlanKey` taught the `PLAN-` prefix; `listPlans` excludes archived + returns caseIds
- Audit: `AuditScreen` fetches the live `audit_log` for real projects (HTML-escaped display adapter)
- Admin users: real users sync into the panel by name-match; invite/role-change/disable write through with role compression

**Feedback round — ti.com emails, fake-user purge, banner removal** ([`48d3f0e`](https://github.com/qhedroid/Relay/commit/48d3f0e))
- All 8 seed emails → `(initial)(surname)@ti.com` across seed, Admin panel, mock data, README; fake-user references purged; prototype banner removed from all screens

**Runs — final screen, protected UX** ([`3cb0d27`](https://github.com/qhedroid/Relay/commit/3cb0d27))
- `/api/runs/*` auth is session-first with `x-relay-user-id` dev-header fallback (keeps `pnpm api:validate` + `/runs/api` working)
- `listProjectRuns` returns per-case results + active defect refs; new `updateRun()` + `PATCH /api/runs/:runId` (seal/reopen/archive/title/dueDate, audited)
- New `run-client.ts`; runs join the provider sync; write-through on result recording, spawn-from-plan, duplicate, seal/unseal, archive/delete, edit
- `RunsScreen.tsx` changed only for URL runKey reconcile-follow — execution UX untouched and manually regression-verified

### Data-layer hardening pass

**DP = the real seeded project; localStorage fallback removed** ([`64dc539`](https://github.com/qhedroid/Relay/commit/64dc539))
- The seeded DB project (slug `dp`, key `DP`) is now the default landing project; the client-only fallback project is deleted; a `BootGate` connect/retry screen replaces it when the API is unreachable

**Wait-for-server writes; optimistic P/F/B/S with rollback** ([`8a5f9d7`](https://github.com/qhedroid/Relay/commit/8a5f9d7))
- The temp-id reconciliation layer was removed (−226 lines); all writes now wait for the server and surface dismissible error toasts on failure — **except** P/F/B/S result recording, which stays optimistic with rollback (execution feel is protected)

**Dashboard uses the server summary; sync freshness + memo perf** ([`25c34f2`](https://github.com/qhedroid/Relay/commit/25c34f2))
- KPI strip/donut now consume `GET /api/projects/:id/dashboard` (previously unused); 30s per-project sync freshness window; provider selector memos narrowed for referential stability

**Ad-hoc runs on the server, DP2 clone keys, workspace reset** ([`1aba200`](https://github.com/qhedroid/Relay/commit/1aba200))
- `TestRunService.createRun()`'s `testPlanId` is now optional — ad-hoc, plan-less runs snapshot directly from a supplied case list and create real server runs; clone keys are sequential (`DP2`, `DP3`…); a global-admin "Reset workspace…" action (`POST /api/admin/reset`, `WorkspaceResetService`) restores the seeded baseline from the UI

### Candidate 1 — the remaining local-only data onto the real DB

**Persist remaining local-only data on the real backend** ([`9e5ed55`](https://github.com/qhedroid/Relay/commit/9e5ed55)) — eight areas, migrations `0002`–`0008` (hand-authored to match the repo convention):
- **Per-step results** — wired the previously-dormant `run_step_results` (new `ExecutionService.updateStepResult()`, `POST /api/runs/:runId/cases/:runCaseId/steps/:stepSnapshotId/result`, synced back per run-case via a live-step-id ↔ snapshot-id mapping)
- **Run descriptions** — added `test_runs.description`
- **Execution log / trends** — new append-only `run_case_events`; makes the Dashboard's passed/failed-this-week and week-over-week trend work for real synced runs (they were empty before); seed backfilled so the demo's two sealed runs show a genuine 2-point trend
- **Case comments** — one `case_comments` table with a nullable step FK (step + general comments)
- **Requirements + case links** — new `requirements` + `case_requirements` (`REQ-<n>` refs), `GET/POST /api/projects/:id/requirements` + case-link route
- **Defect entities** — new `defects` table (`DEF-<n>`) + a nullable `defect_id` FK on `run_defect_links`; internal defects are first-class rows while external free-text ref linking is untouched
- **Plan query definitions — GAP-01 RESOLVED** — durable `test_plans.query_definition` (json); definitions are now portable across browsers/reseed; client-side resolution + `test_plan_cases` (the run-spawn source of truth) unchanged
- **Admin role definitions + API keys** — org-scoped `role_definitions` + `api_keys` tables, `AdminSettingsService`, `/api/admin/roles[/:roleId]` + `/api/admin/api-keys[/:keyId]`, seeded from the built-in roster; synced into the Admin panel under the same global-admin gate as users

**Connection-pool fix** ([`1f1faae`](https://github.com/qhedroid/Relay/commit/1f1faae))
- The mysql2 pool + Drizzle client are stashed on `globalThis` so they survive Next.js dev hot-reloads instead of leaking a new pool (and its open connections) on every HMR re-evaluation — fixes intermittent "Too many connections" in dev

### Documentation

**Branch scoping + Claude-executed plan** ([`7a42f41`](https://github.com/qhedroid/Relay/commit/7a42f41), [`250fa2b`](https://github.com/qhedroid/Relay/commit/250fa2b))
- `CLAUDE.md` backend-build phase; resumable plan/progress state at `docs/claude/mvp-backend/`

**Living-docs sync** ([`62565a0`](https://github.com/qhedroid/Relay/commit/62565a0), [`f053a85`](https://github.com/qhedroid/Relay/commit/f053a85), + this PR's docs commit)
- `AS_BUILT_SNAPSHOT.md`, `FRONTEND_CONTRACTS.md`, `user-guide.md`, `feature-flow.md` synced to the backend-backed reality, including all Candidate 1 tables/endpoints and the resolved GAP-01; `known-bugs.md` GAP-01 marked resolved

---

## ⚠️ Caveats
- **One optimistic write path remains, by design:** P/F/B/S result recording is optimistic with rollback to protect the execution feel. Every other write is wait-for-server with an error toast on failure.
- **Still local-only (deliberate):** custom fields (owned by the separate `mvp-custom-fields` branch) and Admin **automation** sources/fields (deferred — only role definitions + API keys were backed this pass).
- **Clone completeness:** `ProjectCloneService` does not deep-clone `case_comments`, `case_requirements`, or `defects` entities (it does clone `run_case_events` and remaps `query_definition`). Moot for the default demo (the seed creates none of those on the source); flagged as a follow-up.
- **Plan queries don't auto-re-resolve server-side** when cases change (the deliberately-not-done half of GAP-01): `test_plan_cases` refreshes when the plan is next edited in a browser — same freeze-on-edit behaviour as run-spawn.
- **Dev-header fallback on `/api/runs/*`** remains for `pnpm api:validate`; remove when scripts move to token auth. In a logged-in browser the session overrides `/runs/api`'s dev-actor header.
- **API keys store a masked display value only** — no real secret management (hashing / one-time reveal); demo parity.
- **Re-running `pnpm db:seed` wipes and re-creates all seed-org projects**, including any cloned Demo Projects. New migrations must be applied first (`pnpm db:migrate` runs `0002`–`0008` before seeding).
- **`?relay-reset=1`** clears the localStorage cache only (never the DB).

---

## Testing
- **Build:** `pnpm build` clean (29 pages, full API route table); `tsc --noEmit` clean for `@relay/db` and `@relay/web` at every phase.
- **Migrations:** hand-authored `0002`–`0008` (journal in sync); applied via `pnpm db:migrate` before seeding.
- **localStorage:** key `relay-demo-v2`, schema **v14 unchanged** — no migration needed; localStorage is a cache + a store for the two genuinely-local features (custom fields, admin automation).
- **Manual verification (Shaun, local, real Docker MySQL — full pass):**
  - Login/logout, seeded projects, `/DP/dashboard` landing; `BootGate` when the API is down
  - Cases/Plans CRUD persisting across reloads with real refs; audit rows written
  - Runs: seeded runs at every lifecycle stage; P/F/B/S + **per-step** results persist; run descriptions persist; ad-hoc (plan-less) runs create real snapshotted runs; seal/reopen/archive; **protected execution UX regression verified** (P/F/B/S keys, arrow nav, auto-advance, detail panes, filters)
  - Dashboard trends (passed/failed this week, week-over-week) reflect real execution events
  - Case comments (general + per-step), requirements + case links, and defect entities persist across reloads; external Jira-style defect linking still works
  - Plans: authored queries survive reload / another browser as real queries and resolve to the same cases
  - Admin (as global admin): real roles + API keys with create/edit/delete persisting; mock fallback as a non-admin session
  - `/runs/api` + `pnpm api:validate` still working via header fallback
