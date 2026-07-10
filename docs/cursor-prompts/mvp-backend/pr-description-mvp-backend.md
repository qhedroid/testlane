# PR: mvp-backend → mvp-main

## Summary
Stands up the real backend and converts the entire fresh UI from localStorage-driven demo state onto it. Login/session now gates the app (NextAuth Credentials, JWT); every module — Dashboard, Test Cases, Test Plans, Test Runs, Defect links, Audit, Admin users — reads and writes real MySQL via new session-authenticated API routes; and a richly-seeded, explorable **Demo Project** (7th seed project, key `DEMO`) is the default landing project, with a "Create Demo Project" button that deep-clones it on demand. The UI entry point is `/login` → `/DEMO/dashboard`. Screens were not rewritten: `FreshProvider` syncs reducer state from the API per active project and write actions call the API optimistically with temp-id → real-id reconciliation, so every screen (including the protected three-pane Runs execution UX) kept its existing code.

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
- `TestPlanService`: CRUD + `setPlanCases` (static list — the schema has no dynamic-query storage; see Caveats), `PLAN-<nnn>` refs
- `DashboardService` + route (server-side aggregation — ultimately unused by the UI, see Caveats)
- `AuditService` (`recordAudit` retrofitted into every case/plan mutation + `listAuditLog`) and `DefectService` (`run_defect_links` CRUD)

### Real project picker + Demo Project

**Real project picker** ([`2403930`](https://github.com/qhedroid/Relay/commit/2403930))
- `FreshProvider` registers real DB projects on mount, replacing the client-only "Demo Project (DP)"; real projects use DB ULIDs as ids and slug-derived keys

**Demo Project seed + cloning** ([`119850a`](https://github.com/qhedroid/Relay/commit/119850a))
- 7th seed project: 4 folders (one nested), 14 cases (steps 1–8), 2 plans, 4 runs across every lifecycle stage, defect links, per-user project roles
- Generic `ProjectCloneService.cloneProject()` + `POST /api/projects/:id/clone`; "Create Demo Project" button in the switcher; `DEMO` becomes the default landing project

**Hydration + redirect fixes** ([`4ca5bfa`](https://github.com/qhedroid/Relay/commit/4ca5bfa), [`47caed6`](https://github.com/qhedroid/Relay/commit/47caed6))
- Fixed a real SSR/localStorage hydration mismatch (deferred localStorage read to post-mount HYDRATE) and the double-redirect flicker on real-project URLs (`realProjectsLoaded` gate in `ProjectRouteSync`)

### Screen-wiring (reducer-sync + optimistic write-through)

**Cases** ([`644f959`](https://github.com/qhedroid/Relay/commit/644f959))
- New `case-client.ts` with all adapters: priority/type casing, assignee name ↔ `assignedTo` ULID (static seed-user map), server refs as caseKeys
- `FreshProvider`: `SYNC_REAL_PROJECT_DATA` + `RECONCILE_CASE/FOLDER`; optimistic write-through on `addCase`/`updateCase`/`replaceCase`/`deleteCase`/`addFolder` with pending-create promise chaining
- Hybrid rule established: comments, custom-field values, requirement links stay localStorage-backed and merge across syncs
- `listCases()` returns full `CaseDetail[]` (avoids N+1 on load)

**Plans, Audit, Admin users + glitch fixes** ([`c654f82`](https://github.com/qhedroid/Relay/commit/c654f82))
- Plans: queries stay local (authoring model); every queries change resolves client-side and pushes the case list via `setPlanCases`; `slugToPlanKey` taught the `PLAN-` prefix; `listPlans` excludes archived + returns caseIds
- Audit: `AuditScreen` fetches the live `audit_log` for real projects (HTML-escaped display adapter)
- Admin users: real users sync into the panel by name-match; invite/role-change/disable write through with role compression; role definitions stay local
- Create-path glitch fixes: detail panel and folder selection follow temp-id reconciliation via new `resolveEntityId`

**Feedback round — ti.com emails, fake-user purge, banner removal** ([`48d3f0e`](https://github.com/qhedroid/Relay/commit/48d3f0e))
- All 8 seed emails → `(initial)(surname)@ti.com` across seed, Admin panel, mock data, README
- Every fake-user reference purged from code and demo data; `SYNC_REAL_USERS` drops stale localStorage users (Demo User + in-flight invites survive)
- Prototype banner removed from all 13 screens; component deleted

**Runs — final screen, protected UX** ([`3cb0d27`](https://github.com/qhedroid/Relay/commit/3cb0d27))
- `/api/runs/*` auth is session-first with `x-relay-user-id` dev-header fallback (keeps `pnpm api:validate` + `/runs/api` working)
- `listProjectRuns` returns per-case results + active defect refs; new `updateRun()` + `PATCH /api/runs/:runId` (seal/reopen/archive/title/dueDate, audited)
- New `run-client.ts`; runs join the provider sync (`RUN-<nnnn>` refs); write-through on result recording, spawn-from-plan, duplicate, seal/unseal, archive/delete, edit
- `RunsScreen.tsx` changed only for URL runKey reconcile-follow — execution UX untouched and manually regression-verified (P/F/B/S, arrows, auto-advance)

### Documentation

**Branch scoping + Claude-executed plan** ([`7a42f41`](https://github.com/qhedroid/Relay/commit/7a42f41), [`250fa2b`](https://github.com/qhedroid/Relay/commit/250fa2b))
- `CLAUDE.md` backend-build phase; resumable plan/progress state at `docs/claude/mvp-backend/`

**Living-docs sync + PR description** (this branch's final commit)
- `AS_BUILT_SNAPSHOT.md` rewritten; `FRONTEND_CONTRACTS.md` module-API contracts; `user-guide.md`/`feature-flow.md` synced to the backend-backed reality

---

## ⚠️ Caveats
- **Optimistic writes:** UI updates before the server confirms; failures surface in the console only. Standing note to revisit (wait-for-server) before any production use.
- **Local-only gaps (documented, deliberate):** ad-hoc plan-less runs (server `createRun` requires a plan); per-step results + step comments; the per-transition execution log; run descriptions; defect *entities* (only run↔defect links have a table); requirements; Admin role definitions/custom fields/API keys.
- **GAP-01:** plan query groups have no server storage — resolved case lists are synced instead (`test_plan_cases`), so plans don't re-resolve server-side if cases change while nobody has the plan open.
- **`DashboardService` + `/api/projects/:id/dashboard` are unused** by the UI (Dashboard computes client-side off synced state) — kept as reference surface; candidate for removal in a cleanup.
- **Dev-header fallback on `/api/runs/*`** remains for `pnpm api:validate`; remove when scripts move to token auth. In a logged-in browser the session overrides `/runs/api`'s dev-actor header picker.
- **`?relay-reset=1`** clears the localStorage cache only (never the DB).
- The old localStorage-only `DP` project remains as an offline fallback; candidate for removal in a cleanup pass.
- Re-running `pnpm db:seed` wipes and re-creates all seed-org projects, including any cloned Demo Projects.

---

## Testing
- **Build:** `pnpm build` clean (29 pages, full API route table); `tsc --noEmit` clean for `@relay/db` and `@relay/web` at every phase.
- **localStorage:** key `relay-demo-v2`, schema **v14 unchanged** — no migration needed; localStorage is now a cache + local-only-field store.
- **Manual smoke checks (Shaun, local, real Docker MySQL):**
  - Login/logout, seeded projects, `/DEMO/dashboard` landing
  - Cases/Plans CRUD persisting across reloads with real refs; audit rows written
  - Runs: seeded runs at every lifecycle stage; P/F/B/S results persist; spawn-from-plan creates real snapshotted runs; seal/reopen/archive; **protected execution UX regression verified** (P/F/B/S keys, arrow nav, auto-advance, detail panes, filters)
  - Admin users: real roster (as admin), mock fallback (as viewer), invite/role/disable round-trips
  - `/runs/api` + `pnpm api:validate` still working via header fallback
