# Relay — Frontend screen contracts

*Branch: `mvp-final-close-out` (2026-07-03). Companion: [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md).*

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

**Known backend dependency:** Seed users/projects exist; no settings API; no real auth.

**Out of scope:** SSO configuration, API keys, billing.

---

## Reports

**Route:** `/:projectKey/reports` (`?view=exports` opens the exports history view)

**Current state:** Frontend prototype — fully implemented (`ReportsScreen`, close-out Areas A/H/J).

**Real/API-backed, mock-backed, or placeholder:** Derived from FreshProvider state + localStorage persistence for saved views/export history.

**Data shown:** Control bar (scope: project/plan/run; range: last 3/6/12/all runs; compare toggle); KPI strip; SVG pass-rate line chart with progress overlay; failures-by-module stacked bars; drill-down failure table with removable chips and Link-defect action; run summaries + top failing cases tables; Effectiveness panel (defects/100 executions, flaky rate, time-to-first-result); Requirements coverage panel; saved reports rail; Exports (this browser) history table.

**User actions:** change scope/range/compare; chart drill-down; create-and-link defect from drill-down rows (unsealed runs only); save/apply/rename/delete named report views; open export drawer; download/re-generate/delete export artifacts.

**Data note:** trend buckets are runs — there is no sprint entity. All numbers reconcile with live `runs`/`executions`/`executionLog` state; nothing is fabricated.

**Future API contract:** `GET /api/reports`, `GET /api/reports/execution-summary` (server-side generation replaces client computation).

## My Work

**Route:** `/:projectKey/mywork`

**Current state:** Frontend prototype — implemented (`MyWorkScreen`, close-out Area G). Read + navigate only.

**Data shown:** Run-grouped executions assigned to the selected person (execution assignee falling back to case assignee, normalised); per-run status counts; Continue deep-link to `/testruns/tr/:runKey/tc/:caseKey`.

**Known quirk:** admin demo-actor names don't map 1:1 onto demo team assignee names; the screen exposes a "work queue for" picker and defaults to the actor when their name maps.

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

---

## MVP close-out additions (branch `mvp-final-close-out`, schema v15–v22)

Contract-level record of every new type, field, reducer action, and context method added by the 14-area close-out. Persistence is FreshProvider + localStorage `relay-demo-v2` throughout.

### New/changed `DemoState` fields

| Field | Version | Shape |
|---|---|---|
| `savedReportsById` | v15 | `Record<string, SavedReport>` — Reports named views (scopeType project/plan/run, rangeRuns, compare) |
| `exportsById` | v16 | `Record<string, ExportArtifact>` — export metadata + `regen` spec; file blobs live in an in-memory registry and expire on reload |
| `DemoRun.rerunOf` | v17 | `string?` — lineage pointer to the source run |
| `Case.position` / `Case.archivedAt` / `Folder.archivedAt` | v18 | manual order (project-wide float) and archive markers |
| `scheduledRunsById` | v19 | `Record<string, ScheduledRun>` — cadence once/daily/weekly/monthly, `nextRunAt`, `defaultAssignee?`, `active`, `spawnedRunIds` |
| `dashboardLayoutByActor` | v20 | `Record<actorUserId, DashboardLayout>` (`order: string[]`, `hidden: string[]`) |
| `savedFiltersById` | v21 | `Record<string, SavedFilter>` — per-surface payloads (`caseFilter`/`runFilter`); deliberately not `TestQuery`-shaped (documented in `demo-model.ts`) |
| `caseVersionsById` | v22 | `Record<caseId, CaseVersion[]>` — pre-edit snapshots + human-readable diffs, cap 50 per case |

### New reducer actions and context methods

| Area | Actions | Context methods |
|---|---|---|
| A Reports | `SAVE_REPORT`, `RENAME_SAVED_REPORT`, `DELETE_SAVED_REPORT` | `saveReport`, `renameSavedReport`, `deleteSavedReport`, `activeSavedReports` |
| B Export | `RECORD_EXPORT`, `DELETE_EXPORT` | `recordExport`, `deleteExport`, `activeExports` (+ `export-utils.ts`: `buildExportContent`, `registerExportBlob`, `downloadExport`, `regenerateExport`) |
| C Re-runs | `CREATE_RERUN` | `createRerun` (+ `run-utils.ts`: `runChainRootId`, `runChainMembers`) |
| D Organization | `MOVE_CASES`, `COPY_CASES`, `REORDER_CASES`, `ASSIGN_CASES`, `ARCHIVE_CASES`, `UNARCHIVE_CASES`, `UPDATE_FOLDER`, `MOVE_FOLDER`, `COPY_FOLDER`, `ARCHIVE_FOLDER` | `moveCases`, `copyCases`, `reorderCases`, `assignCases`, `archiveCases`, `unarchiveCases`, `renameFolder`, `moveFolder`, `copyFolder`, `archiveFolder` |
| E Rich text | — (no schema/action change; behaviour on existing string fields) | components `RichTextField` / `RichTextView` |
| F Scheduling | `ADD_SCHEDULED_RUN`, `UPDATE_SCHEDULED_RUN`, `DELETE_SCHEDULED_RUN`, `FIRE_DUE_SCHEDULED_RUNS` | `addScheduledRun`, `updateScheduledRun`, `deleteScheduledRun`, `checkDueScheduledRuns`, `activeScheduledRuns` |
| G My Work | — (derived) | uses existing selectors; route `mywork` added to `MODULE_SLUGS` |
| H Coverage | — (derived) | `report-utils.ts`: `resolveRequirementCoverage(state, projectId)` |
| I Archived runs | `UNARCHIVE_RUN` (UI wired to existing `ARCHIVE_RUN`) | `unarchiveRun` |
| J Effectiveness/dashboard | `SET_DASHBOARD_LAYOUT` | `dashboardLayout`, `setDashboardLayout` (+ `report-utils.ts`: `computeEffectiveness`) |
| K Saved filters | `SAVE_FILTER`, `RENAME_SAVED_FILTER`, `DELETE_SAVED_FILTER` | `listSavedFilters(surface)`, `saveFilter`, `renameSavedFilter`, `deleteSavedFilter` |
| L Versioning | `RESTORE_CASE_VERSION` (capture hooked into `REPLACE_CASE`) | `getCaseVersions`, `restoreCaseVersion` |
| M User removal | `admin/removeUser` | `removeAdminUser` (guarded by existing `isFinalEffectiveAdmin`; audit entry mirrors disable) |
| N Project settings | — (reuses `UPDATE_PROJECT_SETTINGS`) | editing gated on existing `manageProjects` permission key |

### Honesty/limitation notes (contractual)

- "PDF" export output is a **print-friendly HTML document**; "Excel" output is **CSV** — labelled in the UI, toast, and history.
- Export artifacts are session blob URLs — **expire on reload**; history entries persist and can be re-generated from current data via the stored `regen` spec.
- Scheduled-run firing is **simulated** (Plans-screen load or manual check). No background job exists.
- Reports trend buckets are **runs**; no sprint entity exists.
- "Escaped defects" is intentionally not computed (no release boundary in the model).
- User removal does **not cascade** — historical assignee/testedBy/audit strings remain as orphaned names.
- Cross-project **move** of cases is disabled by design (copy only); folder move/copy is same-project only.
- `/admin/projects` panel itself remains RBAC-ungated (pre-existing); the new project-scoped settings section IS gated.
