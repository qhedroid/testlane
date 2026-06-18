# Relay — Frontend screen contracts

*Branch: `demo/contract-aware-prototype`. Companion: [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md).*

This document defines what each visible screen shows, what data powers it today, and what future APIs are expected. **Do not treat mock screens as production-ready.**

---

## Dashboard

**Route:** `/:projectKey/dashboard` (legacy `/dashboard` → redirect)

**Current state:** Frontend prototype only.

**Real/API-backed, mock-backed, or placeholder:** Mock-backed.

**Data source:** `apps/web/src/fresh/data/seed.ts` (`RUN_CARDS`, `ATTENTION_ITEMS`, `COVERAGE_ITEMS`) — rendered only when `activeProject.seedTemplate === 'demo'` (`projectHasDemoDashboard` in `demo-project-utils.ts`).

**Data shown:** When demo template: active run count cards, sprint subtitle, expandable run cards (overview/assignees/defects tabs), needs-attention list, module coverage bars. **Non-demo projects:** zeroed summary metric cards + “Dashboard coming soon” placeholder (no seeded metrics).

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

**Data shown:** Suite/folder tree, case table (ref, title, priority, type, last result, owner, steps), detail panel (details/history/activity), bulk selection bar. Breadcrumb uses active project name.

**User actions:** Folder navigation; status filter chips; search (toolbar); quick create; new case modal; row select / bulk bar; import shows empty state only. **Project switcher** in top bar (shared `ProjectSwitcher` component).

**Future API contract:**
- `GET /api/test-cases`
- `POST /api/test-cases`
- `GET /api/test-cases/:caseId`
- `PATCH /api/test-cases/:caseId`

**Data needed:** case ref, title, priority, type, module/folder/suite, owner, status, last updated, steps, tags.

**Known backend dependency:** `test_cases`, `test_case_steps`, `folders` tables exist; no read API.

**Out of scope:** Step execution, defects workflow, audit history write, bulk import, clone/export.

**Notes for future backend implementation:** Align folder tree with `folders` table; preserve case ref generation pattern from seed.

---

## Test Plans

**Route:** `/:projectKey/plans` (legacy `/plans`, `/test-plans` → redirect)

**Current state:** Frontend prototype only.

**Real/API-backed, mock-backed, or placeholder:** Mock-backed.

**Data source:** `fresh/data/seed.ts` (`PLANS`).

**Data shown:** Plan list (active/draft), status pill, case count, owner, last updated, detail tabs (overview, included suites, run history).

**User actions:** Select plan; switch tabs; spawn run link navigates to `/:projectKey/testruns` (does **not** call `POST /api/runs`).

**Future API contract:**
- `GET /api/test-plans`
- `GET /api/test-plans/:planId`
- `POST /api/test-plans/:planId/spawn-run` (or reuse `POST /api/runs`)

**Known backend dependency:** `test_plans`, `test_plan_cases` tables exist; `createRun` service implements spawn.

**Out of scope:** Plan edit, clone, export, version history.

---

## Test Runs (demo execution UI)

**Route:** `/:projectKey/testruns` (no run selected) · `/:projectKey/testruns/tr/:runKey` (run selected, e.g. `/DP/testruns/tr/00001`)

Legacy `/runs` → redirect to `/:key/testruns` (no `/tr/…` segment).

**Current state:** Frontend prototype — **Shaun's v1.2 FRESH execution workspace** (primary demo route).

**Real/API-backed, mock-backed, or placeholder:** Mock-backed (in-memory `FreshProvider` + localStorage).

**Implementation:** `apps/web/src/fresh/screens/RunsScreen.tsx`, `fresh/components/TestRunsTopbar.tsx`, `fresh/components/CreateRunModal.tsx`, `fresh/styles/prototype-runs.css`.

**Run selection:** URL is the source of truth when `/tr/:runKey` is present. Without a run key, the page shows a “select a test run” state (or empty state when the project has no runs). Invalid `runKey` redirects to `/:projectKey/testruns`.

**Run keys:** Project-scoped 5-digit keys (`00001` … `99999`), stored on `DemoRun.runKey`. Seeded demo runs R1–R6 map to `00001`–`00006`. Counter: `nextRunNumByProject`.

**Data shown:** Run picker (with run key), header donuts, case list with filters, step results, keyboard shortcuts, tabs (details/steps/activity/history/comments/defects). Runs and cases are **active-project scoped**. Archived runs (`archivedAt`) hidden from default picker.

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

**Data source:** `apps/web/src/lib/relay/mock-data.ts` (`MOCK_DEFECTS`).

**Data shown:** Defect table (ID, title, severity, status, module, owner); detail panel with linked case/run, timestamps.

**User actions:** Search; filter by status/severity; select row for detail; new defect button disabled (placeholder).

**Future API contract:**
- `GET /api/defects`
- `POST /api/defects`
- `PATCH /api/defects/:defectId`
- `POST /api/defects/:defectId/link-case`

**Known backend dependency:** No defects schema or API.

**Out of scope:** Jira sync, workflow transitions, attachments.

**Notes:** In-run defect linking works in demo `/runs` (in-memory IDs) but is not wired to this screen.

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

**Known backend dependency:** Seed users/projects exist; no settings API; no real auth.

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
| `apps/web/src/fresh/data/seed.ts` | Dashboard seed metrics (demo-template projects only) |
| `apps/web/src/fresh/data/demo-template.ts` | Immutable demo template + clone helpers |
| `apps/web/src/fresh/data/demo-project-utils.ts` | Dashboard scoping + demo project clone |
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

Mock and placeholder screens display a **source banner** (`PrototypeBanner` component):

- **Frontend prototype** — yellow banner, mock data
- **API-backed** — blue banner on `/runs/api`
- **Planned module** — grey banner on reports/integrations
