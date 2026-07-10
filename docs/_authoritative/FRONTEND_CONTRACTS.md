# Relay — Frontend screen contracts

*Branch: `demo/contract-aware-prototype`. Companion: [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md).*

This document defines what each visible screen shows, what data powers it today, and what future APIs are expected. **Do not treat mock screens as production-ready.**

---

## Dashboard

**Route:** `/:projectKey/dashboard` (legacy `/dashboard` → redirect)

**Current state:** Frontend prototype only.

**Real/API-backed, mock-backed, or placeholder:** Mock-backed (client-side aggregation from localStorage state).

**Data source:** `FreshProvider` — `activeRuns` (unsealed, unarchived), `activeCases`, `activeFolders`, `defectsById` via selectors in `DashboardScreen.tsx`.

**Data shown:** Five metric cards (Active Runs, Pass Rate, Open Failures, Blocked Cases, Run Coverage); expandable active-run cards (Overview/Assignees/Defects tabs); needs-attention list (unlinked failures); coverage-by-root-folder bars. **Zero test cases:** onboarding empty state. **No backend APIs wired.**

**User actions:** Expand/collapse run cards; switch card tabs; navigate to `/:projectKey/testruns` via New Run / attention links; export button (visual only).

**Future API contract:**
- `GET /api/dashboard/summary` — metric cards
- `GET /api/runs?status=active` — run cards
- `GET /api/attention-items` — needs-attention queue

**Known backend dependency:** Run list read API exists but is not wired to this screen.

**Out of scope:** Live metrics, real defect counts, authenticated user context.

**Notes for future backend implementation:** Keep dashboard read-only initially; aggregate from runs + defects services.

---

## Test Cases Library

**Route:** `/:projectKey/cases` (legacy `/cases`, `/test-cases` → redirect)

**Current state:** Frontend prototype only.

**Real/API-backed, mock-backed, or placeholder:** Mock-backed (`localStorage` for user-created cases).

**Data source:** `fresh/data/seed.ts` + `FreshProvider` + localStorage key `relay-demo-v2`. Cases and folders are filtered to **active project** via `listActiveProjectTestCases()` / `listActiveProjectFolders()`.

**Data shown:** Suite/folder tree, case table (ref, title, priority, type, last result, owner, steps), detail panel (details/attachments/**requirements create+link**/**defects view-only**/runs/history/activity), bulk selection bar. Breadcrumb uses active project name.

**User actions:** Folder navigation; status filter chips; search (toolbar); quick create; new case modal; row select / bulk bar; import shows empty state only; **Requirements tab** — create local REQ-* requirement and link to case; **Defects tab** — view-only list from run execution links. **Project switcher** in top bar (shared `ProjectSwitcher` component).

**Future API contract:**
- `GET /api/test-cases`
- `POST /api/test-cases`
- `GET /api/test-cases/:caseId`
- `PATCH /api/test-cases/:caseId`

**Data needed:** case ref, title, priority, type, module/folder/suite, owner, status, last updated, steps, tags.

**Known backend dependency:** `test_cases`, `test_case_steps`, `folders` tables exist; no read API.

**Out of scope:** Step execution, full defects CRUD, external requirement sync, audit history write, bulk import, clone/export.

**Notes for future backend implementation:** Align folder tree with `folders` table; preserve case ref generation pattern from seed.

---

## Test Plans

**Route:** `/:projectKey/plans` · `/:projectKey/plans/tp/:planKey` (legacy `/plans`, `/test-plans` → redirect)

**Current state:** Frontend prototype — fully implemented with localStorage persistence.

**Real/API-backed, mock-backed, or placeholder:** Mock-backed (FreshProvider + localStorage).

**Data source:** `FreshProvider` — `plansById: Record<string, TestPlan>`, `nextPlanNumByProject: Record<string, number>`. Seeded with two demo plans (TP-00001 Smoketest, TP-00002 Full Regression) for `seedTemplate: 'demo'` projects.

**Data shown:**
- Left pane: filterable plan list — TP key, title, open run count, last run date; row ⋯ menu (Edit, Duplicate, Delete)
- Right pane: plan detail with two tabs:
  - *Overview* — three cards (details, open run, coverage %); run history table with result bars
  - *Test cases* — query group cards (condition/folder/static); live resolved-case preview panel

**User actions:** Create plan (modal); edit plan; duplicate plan; delete plan; add/edit/remove test query groups; spawn run from plan (modal pre-fills title + case count, creates run via `CREATE_RUN` with `planId`/`planName` stamped, navigates to `/testruns`).

**FreshProvider actions:** `ADD_PLAN`, `UPDATE_PLAN`, `DELETE_PLAN`, `DUPLICATE_PLAN`; `CREATE_RUN` extended with optional `planId`/`planName`.

**URL routing:** Plan key stripped to slug in URL (`TP-00001` → `/plans/tp/00001`). `planKeyToSlug`/`slugToPlanKey` in `demo-model.ts`. Project-switch guard (`projectMismatch`) on URL sync effects.

**Future API contract:**
- `GET /api/test-plans`
- `GET /api/test-plans/:planId`
- `POST /api/test-plans` (create)
- `PUT /api/test-plans/:planId` (update)
- `DELETE /api/test-plans/:planId`
- `POST /api/test-plans/:planId/spawn-run` (or reuse `POST /api/runs`)

**Known backend dependency:** `test_plans`, `test_plan_cases` tables exist; `createRun` service implements spawn.

**Out of scope:** Plan clone/export, version history, cross-plan coverage heatmap.

---

## Test Runs (demo execution UI)

**Route:** `/:projectKey/testruns` (no run selected) · `/:projectKey/testruns/tr/:runKey` (run selected, e.g. `/DP/testruns/tr/00001`)

Legacy `/runs` → redirect to `/:key/testruns` (no `/tr/…` segment).

**Current state:** Frontend prototype — **Shaun's v1.2 FRESH execution workspace** (primary demo route).

**Real/API-backed, mock-backed, or placeholder:** Mock-backed (in-memory `FreshProvider` + localStorage).

**Implementation:** `apps/web/src/fresh/screens/RunsScreen.tsx`, `fresh/components/TestRunsTopbar.tsx`, `fresh/components/CreateRunModal.tsx`, `fresh/styles/prototype-runs.css`.

**Run selection:** URL is the source of truth when `/tr/:runKey` is present. Without a run key, the page shows a “select a test run” state (or empty state when the project has no runs). Invalid `runKey` redirects to `/:projectKey/testruns`.

**Run keys:** Project-scoped 5-digit keys (`00001` … `99999`), stored on `DemoRun.runKey`. Seeded demo runs R1–R6 map to `00001`–`00006`. Counter: `nextRunNumByProject`.

**Data shown:** Run picker (with run key), header donuts, case list with filters, step results, keyboard shortcuts, tabs (details/comments/**defects create+link (Failed/Blocked)**/**requirements view-only**/history). Runs and cases are **active-project scoped**. Archived runs (`archivedAt`) hidden from default picker.

**Defects tab:** Create local `DEF-*` defect or link existing — enabled only when execution status is Failed or Blocked and run is not sealed. Persisted via `defectsById` + `CaseExecution.defects[]`.

**Requirements tab:** Read-only list from `Case.requirementIds[]` → `requirementsById`. No create/link in runs.

**User actions:**
- **Create run** — modal (name required, description optional); assigns next `runKey`, snapshots active project case ids into `caseOrder`, navigates to `/tr/:runKey`.
- **Duplicate run** — copies `caseOrder` only; fresh `executions`; new `runKey`; navigates to new run.
- **Archive / delete run** — store actions; delete confirms via dialog; active run clears selection and navigates to `/testruns`.
- **Close / re-open test run** — topbar seal toggle (`sealRun` / `unsealRun`); sealed runs block mutations in UI and reducer.
- **More… menu** — Edit, Close/Re-open, Duplicate, Show history, Reset all results, Create report, Export CSV/Excel, Delete, Create new run… — mostly UI placeholders except seal toggle, duplicate, delete, and create run entry points.
- Full demo execution flow per `DEMO.md` — in-memory/localStorage.
- **Project switcher** in top bar (same `ProjectSwitcher` as `/cases`); switching projects strips run selection (per-project key namespace).

**Future API contract:** Same as `/runs/api` — wire this UI to existing HTTP routes without replacing the layout.

**Known backend dependency:** None for demo. Docker optional.

**Out of scope:** Persisting results to MySQL from this route (use `/runs/api` until wired).

**Notes:** **Do not swap this route back to the legacy three-pane UI.** Extend Shaun's screen toward API integration.

---

## Test Runs (API workspace)

**Route:** `/runs/api`

**Current state:** **API-backed** — MySQL via existing HTTP routes.

**Real/API-backed, mock-backed, or placeholder:** API-backed.

**Data source:** `GET/POST /api/runs`, `GET /api/runs/:runId`, `POST /api/runs/:runId/cases/:runCaseId/result`.

**Implementation:** `apps/web/src/components/api-runs/ApiRunsWorkspace.tsx`.

**Data shown:** Run list with progress; case list with filters/search; case detail with result buttons and execution comment.

**User actions:** Create run; update case result; save comment (persisted).

**Known backend dependency:** Docker MySQL, migrations, seed. Auth via `NEXT_PUBLIC_RELAY_USER_ID`.

**Notes:** Preserved for `pnpm api:validate` and backend integration testing. Not the stakeholder demo surface.

---

## Login & Authentication (`mvp-backend` Phase 1)

**Route:** `/login` (top-level; `/:projectKey/login` redirects here).

**Current state:** **Real, API-backed.** NextAuth.js Credentials provider, JWT session strategy (no DB adapter tables — session state lives in an encrypted cookie, not `sessions`/`accounts`/`verification_tokens` tables).

**Auth gate:** `apps/web/src/middleware.ts` requires a valid session for every route except `/login`, `/api/auth/*`, `/api/runs/*` (still on the legacy header), `/api/health`, `/_next/*`, `/fonts/*`. Logged-out visits redirect to `/login?callbackUrl=<original path>`.

**Endpoints:**

| Method | Path | Body | Response | Notes |
|--------|------|------|----------|-------|
| GET/POST | `/api/auth/[...nextauth]` | NextAuth-managed | NextAuth-managed | Sign-in/sign-out/session/CSRF endpoints, standard NextAuth v4 surface |

**Client usage:** `signIn('credentials', { email, password, redirect: false })` / `signOut({ callbackUrl: '/login' })` from `next-auth/react`; `useSession()` for the top-bar `UserMenu`.

**Seed credentials:** all six seed users share one local-dev password, `relay-dev-2026` (see `README.md` "Local dev login"). Hashed with `bcryptjs`, cost factor 12, stored in `users.password_hash`.

---

## User API (`mvp-backend` Phase 1)

**Real, API-backed.** Gated by `resolveSessionActor()` (real session) + an admin-or-above global-role check in `UserService.ts` — not `assertMinProjectRole()`, since there's no project scope for a user list.

| Method | Path | Body | Success | Error codes |
|--------|------|------|---------|-------------|
| GET | `/api/users` | — | `{ data: { users: UserSummary[] } }` | `INSUFFICIENT_PERMISSIONS` (403) |
| POST | `/api/users` | `{ orgId, email, name, globalRole, password }` | `{ data: UserSummary }` (201) | `INSUFFICIENT_PERMISSIONS` (403), `EMAIL_TAKEN` (409), `VALIDATION_ERROR` (400) |
| PATCH | `/api/users/:userId` | `{ name?, globalRole?, isActive? }` | `{ data: UserSummary }` | `INSUFFICIENT_PERMISSIONS` (403), `USER_NOT_FOUND` (404), `LAST_ADMIN` (409), `VALIDATION_ERROR` (400) |

`UserSummary`: `{ id, name, email, globalRole, isActive, lastLoginAt }`.

**Not yet wired to any fresh screen** — `/admin/users` still reads/writes the localStorage `AdminSettings` blob (unification is a later phase).

---

## Project API (`mvp-backend` Phase 1)

**Real, API-backed.** `listProjects`/`createProject` gated by a global admin-or-above check; `assignProjectRole` gated by `assertMinProjectRole(actorId, projectId, 'admin')` (reused from `packages/db/src/rbac/assert-min-role.ts`).

| Method | Path | Body | Success | Error codes |
|--------|------|------|---------|-------------|
| GET | `/api/projects` | — | `{ data: { projects: ProjectSummary[] } }` | `INSUFFICIENT_PERMISSIONS` (403) |
| POST | `/api/projects` | `{ orgId, slug, name, description? }` | `{ data: ProjectSummary }` (201) | `INSUFFICIENT_PERMISSIONS` (403), `DUPLICATE_SLUG` (409), `VALIDATION_ERROR` (400) |
| POST | `/api/projects/:projectId/roles` | `{ userId, role }` | `{ data: { ok: true } }` | `INSUFFICIENT_PERMISSIONS` (403), `PROJECT_NOT_FOUND` (404), `VALIDATION_ERROR` (400) |

`ProjectSummary`: `{ id, slug, name, description, status }`. `super_admin`/`admin` (global) see every active project in the org; `contributor`/`viewer` see only projects they hold a `project_roles` row for.

**Wired** — `FreshProvider` registers real projects on mount (`REGISTER_REAL_PROJECTS`); `ProjectSwitcher.tsx` shows them and offers "Create Demo Project" (`POST /api/projects/:id/clone`, any active user).

---

## Screen-wiring architecture + module APIs (`mvp-backend` Phases 2–7)

Screens don't fetch data themselves. `FreshProvider` syncs the active real project's data into reducer state and write actions call the API optimistically (local dispatch first, background call, temp-id → real-id reconcile). Clients + adapters live in `apps/web/src/lib/relay/{case,plan,run,audit,user}-client.ts` — each file's header documents its adapter decisions. Fields with no DB tables stay localStorage-only per case/plan/run (the "hybrid rule" — see `AS_BUILT_SNAPSHOT.md`).

**Cases + Folders** (session auth, nested routes):
- `GET/POST /api/projects/:projectId/cases` — list returns full `CaseDetail[]` (steps/tags/preconditions/description; unpaginated, archived excluded); create generates `TC-<n>` refs.
- `GET/PATCH/DELETE /api/projects/:projectId/cases/:caseId` — PATCH is whole-object-shaped (steps replaced wholesale); DELETE archives (`is_archived`), never hard-deletes.
- `GET/POST /api/projects/:projectId/folders`.
- Adapters: priority/type lowercase enums ↔ Capitalized UI strings; `assignee` display name ↔ `assignedTo` ULID via a static 8-seed-user map; server `caseRef` used directly as `caseKey`.

**Plans** (session auth, nested routes):
- `GET/POST /api/projects/:projectId/plans` — list excludes archived, includes ordered `caseIds`; refs `PLAN-<nnn>`.
- `GET/PATCH/DELETE …/plans/:planId`; `PUT …/plans/:planId/cases` (`setPlanCases`, wholesale replace).
- GAP-01 resolution: dynamic `queries` stay client-side; every queries change resolves locally (`resolvePlanCases`) and pushes the case list via `setPlanCases`, so `TestRunService.createRun()`'s dependency on `test_plan_cases` holds.

**Runs** (session-first auth with `x-relay-user-id` fallback, flat routes):
- `GET /api/runs?projectId=` — includes per-case results (`testCaseId`, `testRunCaseId`, status, comment, executor, active `defectRefs`); refs `RUN-<nnnn>`.
- `POST /api/runs` — requires `testPlanId` (snapshot transaction); ad-hoc runs are local-only.
- `PATCH /api/runs/:runId` — `{ projectId, status?: active|sealed|archived, title?, dueDate? }`; frontend "delete" = archive.
- `POST /api/runs/:runId/cases/:runCaseId/result` — `runCaseId` is the `test_run_cases` id (FreshProvider bridges from live case ids).

**Dashboard:** computed client-side off synced state; `GET /api/projects/:projectId/dashboard` exists but is unused by the UI.

**Audit:** `GET /api/projects/:projectId/audit?limit=` — screen-level fetch in `AuditScreen` (deliberate exception: read-only feed). Every case/plan/run mutation writes `audit_log` rows.

**Users (Admin panel):** `GET/POST /api/users`, `PATCH /api/users/:userId` — synced into the Admin roster by name-match (global-admin sessions only; 403 falls back to local mock). Granular Admin roles compress onto `globalRole` (Owner→super_admin, Administrator→admin, Editor/Run Manager/Run Executor/Project Administrator→contributor, Viewer→viewer); role *definitions* stay local. Invites are created with the shared dev password.

---

## Audit History

**Route:** `/audit`

**Current state:** Frontend prototype only.

**Real/API-backed, mock-backed, or placeholder:** Mock-backed.

**Data source:** `fresh/data/seed.ts` (`AUDIT_EVENTS`).

**Data shown:** Audit timeline, event type icon, actor/action HTML, context line, timestamp. Filter chips (client-side).

**User actions:** Filter by event category; export button (visual only).

**Future API contract:**
- `GET /api/audit-events?module=&actor=&from=&to=`

**Known backend dependency:** `audit_log` table written on run create and case result update; **no read API**.

**Out of scope:** Real-time feed, pagination, export, write from UI.

---

## Defects

**Route:** `/defects`

**Current state:** Frontend prototype only.

**Real/API-backed, mock-backed, or placeholder:** Mock-backed.

**Data source:** `apps/web/src/lib/relay/mock-data.ts` (`MOCK_DEFECTS`) + `FreshProvider.defectsById` (local `DEF-*` from executions).

**Data shown:** Defect table (ID, title, severity, status, module, owner); detail panel. Local demo defects appear alongside static TI-* rows.

**User actions:** Search; filter by status/severity; select row for detail; new defect button disabled — create from Test Runs instead.

**Notes:** In-run defect create/link persists to localStorage and surfaces here for the active project. No Jira sync.

---

## Settings

**Route:** `/settings`

**Current state:** Frontend prototype only.

**Real/API-backed, mock-backed, or placeholder:** Mock-backed.

**Data source:** `apps/web/src/lib/relay/mock-data.ts` (workspace modules, users preview).

**Data shown:** Workspace fields (read-only), module list, users/roles table, local demo status notes.

**User actions:** View only — inputs are read-only.

**Future API contract:**
- `GET /api/workspace`
- `GET /api/users`
- `PATCH /api/workspace/settings`

**Known backend dependency:** Seed users/projects exist; no settings API yet. Real login/session now exists (`/login`, NextAuth) but this screen is not yet wired to the real `/api/users`/`/api/projects` routes.

**Out of scope:** SSO configuration, API keys, billing.

---

## Reports

**Route:** `/reports`

**Current state:** Placeholder screen.

**Real/API-backed, mock-backed, or placeholder:** Placeholder.

**Data shown:** Planned-module message and future API list.

**User actions:** Navigate back to dashboard.

**Future API contract:** `GET /api/reports`, `GET /api/reports/execution-summary`

**Out of scope:** All report generation until backend contract exists.

---

## Integrations

**Route:** `/integrations`

**Current state:** Placeholder screen.

**Real/API-backed, mock-backed, or placeholder:** Placeholder.

**Data shown:** Planned-module message.

**Future API contract:** `GET /api/integrations`, `POST /api/integrations/:provider/connect`

**Out of scope:** OAuth flows, webhooks, third-party SDKs.

---

## Shared: URL routing (project key prefix)

**Pattern:** `/:projectKey/:moduleSlug`

| Module slug | Screen | Legacy redirect |
|-------------|--------|-----------------|
| `dashboard` | Dashboard | `/dashboard` |
| `cases` | Test Cases | `/cases`, `/test-cases` |
| `testruns` | Test Runs (demo execution) | `/runs` |
| `plans` | Test Plans | `/plans`, `/test-plans` |
| `audit` | Audit History | `/audit` |
| `defects` | Defects | `/defects` |
| `settings` | Settings | `/settings` |
| `reports` | Reports (placeholder) | `/reports` |
| `integrations` | Integrations (placeholder) | `/integrations` |

**Sync:** `ProjectRouteSync` (in app layout) parses URL key → `setActiveProject`. Unknown key → redirect to `/${activeProjectKey}/${module}` or `/DP/dashboard`.

**Helpers:** `apps/web/src/fresh/lib/project-routes.ts`, `useProjectHref()` hook.

**Exceptions:** `/runs/api` and `/api/*` are **not** project-prefixed. Root `/` redirects to `/DP/dashboard`.

---

## Shared: Project switcher (top bar)

**Component:** `apps/web/src/fresh/components/ProjectSwitcher.tsx`, `CreateProjectModal.tsx`

**Used on:** `/:projectKey/cases` (via `FreshTopbar`), `/:projectKey/testruns` (inline in `RunsScreen` top bar)

**Current state:** Frontend prototype — **fully functional** multi-project workspace with URL sync.

**Data source:** `FreshProvider` (`projectsById`, `activeProjectId`, project-scoped entities).

**Behavior:**
- Button always shows **active project name** (from store, synced with URL).
- Dropdown lists all projects; click selects, sets `activeProjectId`, and navigates to same module under new key.
- **Create project…** — opens modal (`CreateProjectModal`) with Name, Key (auto-uppercase, `[A-Z0-9_-]`, unique), Description (optional). On submit: create project, activate, navigate to `/:key/dashboard`. New projects have **no** `seedTemplate` (blank dashboard placeholder).
- **Add demo project** — clones the immutable demo template (`demo-template.ts`); assigns next available key `DP1`, `DP2`, …; name `Demo Project N`; sets `seedTemplate: 'demo'`; activates project; navigates to `/:key/dashboard`. Always uses pristine template, ignoring edits to existing demo projects in session.
- **Project settings** — menu item present, **disabled** (coming soon).
- **Rename** — pencil icon per row; inline save (name only).
- **Delete** — trash icon; `window.confirm`; **cascade delete**. Deleting active project activates another or creates Demo Project / `DP`.

**Selectors exposed on `useFresh()`:** `getActiveProject`, `getProjectByKey`, `isProjectKeyUnique`, `listProjects`, `listActiveProjectFolders`, `listActiveProjectTestCases`, `listActiveProjectRuns`, `addDemoProject`.

**Future API contract:**
- `GET /api/projects`
- `POST /api/projects`
- `PATCH /api/projects/:projectId`
- `DELETE /api/projects/:projectId`

---

## Shared mock data locations

| File | Purpose |
|------|---------|
| `apps/web/src/lib/relay/mock-data.ts` | Central mock exports + defects/settings data |
| `apps/web/src/lib/relay/prototype-contracts.ts` | Route metadata for agents |
| `apps/web/src/fresh/data/seed.ts` | Legacy dashboard seed arrays (unused by `DashboardScreen`; retained for reference) |
| `apps/web/src/fresh/data/demo-template.ts` | Immutable demo template + clone helpers |
| `apps/web/src/fresh/data/demo-project-utils.ts` | Demo project clone helpers |
| `apps/web/src/fresh/data/FreshProvider.tsx` | In-memory state (`relay-demo-v2`, schema v4) |
| `apps/web/src/fresh/data/run-utils.ts` | Run key helpers, v4 migration |
| `apps/web/src/fresh/components/TestRunsTopbar.tsx` | Seal, edit, report, More… menu |
| `apps/web/src/fresh/components/CreateRunModal.tsx` | Create run form |
| `apps/web/src/fresh/data/project-selectors.ts` | Active-project list helpers |
| `apps/web/src/fresh/lib/project-routes.ts` | Key-prefixed path helpers |
| `apps/web/src/fresh/components/ProjectSwitcher.tsx` | Top-bar project CRUD + switch |
| `apps/web/src/fresh/components/CreateProjectModal.tsx` | Create project form + validation |

---

## UI labelling convention

The per-screen source banner (`PrototypeBanner`) was **removed** on `mvp-backend` — screens are backend-wired now, so the "frontend prototype" labelling no longer applied. Remaining visual-shell modules (Reports, My Work, Milestones, AI Studio, Integrations) are identifiable by their static content only.
