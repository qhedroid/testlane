# Relay — User Guide

*Living document · Last verified: 9 July 2026 · Branch: `mvp-backend`*

This guide explains how to use Relay from a user perspective, as it works today in the browser against the real backend.

**For developers and agents:** When user-visible behaviour changes, update this file together with [`feature-flow.md`](feature-flow.md).

---

## What Relay is

Relay is a QA test execution platform for clinical-trials-style workspaces. It helps teams organise **test cases**, group them into **test plans**, execute them in **test runs**, track results, and review activity across **projects**.

As of `mvp-backend`, the app runs on a **real MySQL backend**: login gates the app, projects come from the database, and cases, plans, runs, execution results, and the audit log all read and write real API routes. The browser's localStorage acts as a cache plus the store for a handful of fields the database doesn't model yet (see "Data sources" below).

---

## Data sources

| Real (MySQL, via API) | Local-only (browser localStorage) |
|------------|-------------------|
| Login/session (NextAuth, seed users), project list, project cloning | The "Demo User" admin actor and Admin role *definitions* |
| Test cases + folders (full CRUD, `TC-<n>` refs, archived on delete) | Case comments, custom-field values, requirement links |
| Test plans (`PLAN-<nnn>` refs) and their resolved case lists | Plan query groups (the authoring model — their *result* syncs to the server) |
| Test runs — plan-spawned AND ad-hoc — results (P/F/B/S + notes), seal/reopen, archive, `RUN-<nnnn>` refs | Per-step results, the per-transition execution log, run descriptions |
| Audit log, Admin user list/invite/role/disable (global admins) | Defect entities (`DEF-*`), requirements, reports, custom fields admin |

Writes **wait for the server**: creates/edits/deletes commit locally only after the API confirms (failures surface as error toasts). The one exception is P/F/B/S result recording, which is optimistic for keyboard speed and rolls back automatically if the server rejects it. There is no localStorage-only fallback project any more — if the API is unreachable, the app shows a connect/retry screen.

**Reset the local cache:** visit any page with `?relay-reset=1` (or `localStorage.removeItem('relay-demo-v2')` in the console). This never touches the database — server data re-syncs on next load.

**Run locally:** `pnpm docker:up && pnpm db:migrate && pnpm db:seed && pnpm dev` → open http://127.0.0.1:3000 — you'll be redirected to `/login`. Sign in with any seed user (see "Login" below), which lands on `/DP/dashboard` — the richly-seeded Demo Project (the real DB project; slug `dp`).

---

## Project switching

Relay is **multi-project**. Each project has its own folders, test cases, and test runs.

- **URL pattern:** `/:projectKey/:module` — e.g. `/DP/testcases`, `/CTMS/testruns`.
- **Project switcher** appears in the top bar on every project screen (left of breadcrumbs).
- **Switch project:** pick another project from the dropdown. The URL rewrites to the same module under the new key (run/case selection is cleared when switching projects).
- **Create project:** *Create project…* — enter name, key (uppercase, unique), optional description. You land on the new project's dashboard (blank metrics unless you add a demo project).
- **Add demo project:** clones a full demo dataset with key `DP1`, `DP2`, … — useful for isolated walkthroughs.
- **Rename / delete:** pencil and trash icons on each row. Delete cascades all cases, folders, and runs in that project.

**Default seed project:** Demo Project (`DP`) — richest demo data.

---

## Navigation

### Sidebar

The left sidebar is the primary module navigator. Order (top to bottom):

1. **Dashboard**, **My Work**
2. **Testing** section — Test Cases, Test Plans, Test Runs, Milestones
3. **Traceability** section — Requirements, Defects, Reports, Audit History, AI Studio
4. **Project Settings** (bottom, above the user card) — opens the organisation admin area at `/admin` (sidebar swaps to the admin sub-nav, same behaviour as before)

**Removed in Phase 2:** the old *Pinned Modules* block (eTMF Module, API Gateway, Add shortcut) and the separate *Integrations* sidebar entry. The route `/:key/integrations` still exists as a placeholder page but is not linked from the sidebar.

### Global top bar

On every project screen, `FreshTopbar` renders a shared action cluster (in addition to screen-specific breadcrumbs and optional local actions):

| Control | Behaviour |
|---------|-----------|
| **Search** (⌘K) | In-memory search over the active project's cases and runs |
| **New test case** | Opens the New case modal |
| **New test run** | Opens the Create run modal |
| **AI Studio** (sparkles icon) | Navigates to `/:key/aistudio` |
| **Notifications** (bell icon) | Visual only — no real notifications |
| **Help** (?) | Opens keyboard-shortcuts overlay |

Screen-specific actions live elsewhere when the mockup moved them out of the shared bar — e.g. Test Cases keeps Create test run / Import / Quick create / New case in the **case-list pane toolbar**; Test Runs keeps **Close test run**, **Edit**, **Report**, and **More…** in its own **page-head** below the top bar, not in the global cluster.

---

## Dashboard

**Route:** `/DP/dashboard` (replace `DP` with your project key)

The dashboard is a briefing screen built from the Phase 2 Compass layout. All metrics are computed from live `FreshProvider` data (active unsealed, unarchived runs and project cases) — not the mockup's static demo numbers.

**KPI strip** (top row): Executed %, Passed, Failed, Blocked, Open runs, and a 30-day pass-trend sparkline. Week-over-week delta labels appear when `executionLog` has dated history; otherwise Passed/Failed show **"As of today"** and the results-over-time chart notes a snapshot with no dated history in seed data.

**Completion panel:** Donut chart (Passed / Failed / Blocked / Not run) with legend, plus **Lowest coverage by folder** rows when folder data exists.

**Results over time:** Line chart with **7d / 30d / 90d** chips; cumulative passed and failed lines from live selectors.

**Results by assignee:** Horizontal stacked bars per assignee (pass / fail / blocked) for executed cases in open runs.

**Open test runs:** Clickable list with run key, name, assignee avatar, mini result bar, and executed/total fraction — each row links to that run in Test Runs.

**Milestones:** Static placeholder slice (three demo milestones with status badges) linking to **All →** `/milestones`. Not computed from live run state.

**Needs attention:** Unlinked failures (failed executions with no linked defect), sorted most-recent first; *Link defect* rows navigate to Test Runs.

**Brand-new project (zero test cases):** Centered “Add your first test cases” empty state with link to Test Cases — not a wall of zero metrics.

**Actions:** Top-bar *Export* is visual only; *New Run* opens Test Runs. No expandable run cards or Critical filter chips (removed in Phase 2 rebuild).

---

## Test cases

**Route:** `/DP/testcases`

**Legacy redirects:** `/cases` and `/test-cases` redirect to `/:activeProjectKey/testcases`.  
**Note:** `/DP/cases` (old project-prefixed slug) returns **404** — use `/DP/testcases`.

Three-pane layout: **folder tree** (left) → **case table** (centre) → **detail panel** (right, opens on row select).

**Case-list toolbar** (centre pane header): folder title plus **Create test run** ▾, **Import**, **Quick create**, **New case**, and a contextual **Details** button when one row is selected. These actions moved here from the global top bar in Phase 2 — behaviour unchanged.

**Browse:** expand/collapse folders; use folder search; filter by status chips; keyword search in the toolbar row below the pane header.

**Create cases:**
- *Quick create* — paste titles, press Enter to add multiple cases quickly.
- *New case* modal — full fields including steps (Action/Expected or BDD Given/When/Then).

**Case detail:** metadata (assignee, template, priority, custom fields), tabs (Details, Attachments, Defects, Requirements, Runs, History, Activity), ← → arrows to move between cases. Deep link: `/DP/testcases/tc/<caseKey>` (URL omits the `TC-` prefix).

**Requirements tab (create/link):** From the selected case, open *Requirements*. Create a local demo requirement (title + optional description) — it is saved to localStorage and linked to the case automatically. Use *Link existing…* to attach another project requirement. Requirements use keys like `REQ-00001`. No external Jira or integration sync.

**Defects tab (view-only):** Shows defects linked to this case from test run executions (including legacy seed `TI-*` references). You cannot create or link defects here — use Test Runs when a case fails or is blocked.

**Row actions (⋯ menu):** Duplicate, Edit, Copy to, Move to, Open folder, Delete.

**Bulk actions:** select rows → bulk bar for batch operations.

**Create test run from cases:** case-list toolbar *Create test run* ▾ — scope to current folder or all cases; name the run; navigates to Test Runs.

User-created cases **persist to MySQL** per project (real projects); comments, custom-field values, and requirement links stay browser-local.

---

## Test plans

**Route:** `/DP/plans` · `/DP/plans/tp/<planKey>` (e.g. `TP-00001`)

**Legacy redirects:** `/plans`, `/test-plans`.

Test plans organise test cases into named groups (queries) and let you spawn a targeted test run from them.

**Plan list:** Shows TP key, title, open run count, and last run date. Click a row to open the plan detail. The ⋯ menu on each row lets you Edit, Duplicate, or Delete.

**Create a plan:** Click *New plan* to open the create modal. Enter a title and optional description.

**Plan detail — Overview tab:** Three summary cards (plan details, current open run, coverage %). Run history table shows past runs spawned from this plan with result bars.

**Plan detail — Test cases tab:** Add query groups to define which cases the plan covers. Three query types:
- *Condition* — field/operator/value filter (e.g. Priority = Critical). All conditions on a group use AND logic.
- *Folder* — all cases inside a selected folder (descendants included).
- *Static* — an explicit hand-picked list of cases.

The right panel shows a live preview of all resolved cases across all query groups (deduplicated).

**Spawn run:** Click *Spawn run* to open the spawn modal. It pre-fills a run title and shows the case count in scope. Confirming creates a new run (stamped with this plan's ID) and navigates directly to Test Runs.

Plan export and version history are not available in the prototype.

---

## Test runs

**Route:** `/DP/testruns` (no run selected) · `/DP/testruns/tr/<runKey>` (run selected, e.g. `00001`)

**Legacy redirect:** `/runs` → `/:key/testruns`.

Primary execution workspace. Run keys are five-digit, per-project (`00001`, `00002`, …).

**Page head** (below the global top bar): *Test runs* title and subline, plus run-specific actions — **Close test run** / **Re-open**, **Edit**, **Report** (visual), and **More…** (duplicate, delete, export placeholders, etc.). These are no longer in the shared top bar.

**Run picker:** search and switch runs in the queue pane. Archived runs are hidden from the default list.

**Create run:** *Create run* modal — name required, optional description. Empty runs are supported. After create, the app navigates to the new run URL.

**Add cases to run:** on a run with few or no cases, use *+ Add cases* to open a searchable, folder-grouped picker.

**Duplicate / delete / archive:** via the *More…* menu. Delete asks for confirmation.

**Empty run state:** Testiny-style empty state when a run has no cases — prompts you to add cases.

---

## Test execution

Open a run at `/DP/testruns/tr/<runKey>`.

**Case list:** filter by All / Not run / Fail / Blocked; folder grouping; status indicators and sparklines.

**Select a case:** execution panel shows Details (with steps), History, Comments, Defects, and related tabs. Deep link: `/DP/testruns/tr/<runKey>/tc/<caseKey>`.

**Mark results:**
- Step buttons: Pass / Fail / Blocked / Skip
- Footer case result buttons and keyboard shortcuts (`P` `F` `B` `S`)
- Arrow keys navigate between cases (↑↓ in current build)

**Seal run:** *Close test run* in the screen's page-head (or More… menu) locks mutations — results and steps become read-only. *Re-open* reverses this (prototype has no role check).

**Defect linking (Failed/Blocked only):** On the execution panel *Defects* tab, create a local demo defect (`DEF-00001`, …) or link an existing one — only when the case result is **Failed** or **Blocked** and the run is not sealed. Passed, Skipped, and Not run disable create/link with helper text. Defects persist in localStorage and appear on the case Defects tab (view-only) and Defects module list.

**Requirements (view-only in runs):** The execution panel *Requirements* tab shows requirements linked to the underlying test case. Manage requirements from Test Cases — no create/link controls in Test Runs.

**More… menu items:** Edit run, duplicate, reset results, export/report options — many are UI placeholders; create, duplicate, delete, and seal/re-open are functional.

---

## Defects

**Route:** `/DP/defects`

Table-first layout with a toolbar (**All defects**, shown count, search, severity filter, status chips, and a **Details** toggle). The table uses shared Compass styling (ID, Defect, Severity, Status, Assignee with avatar, Case, Run, Opened). Click a row to open the right **detail panel** (close with X; reopen via Details when hidden).

Locally created demo defects (`DEF-*` from failed/blocked executions) appear alongside static `TI-*` mock rows for the active project. Search and status/severity filters work as before.

**New defect** in the top bar remains disabled — create defects from Test Runs during execution instead. No Jira sync. No page-level title block (consistent with Dashboard / Test Cases / Test Plans).

---

## My Work

**Route:** `/DP/mywork`

Personal work queue with KPI tiles (assigned cases, not run yet, blocked, defects to verify), a **Your Test Queue** panel grouped by run, and **Defects Involving You**. Static demo content only — no real assignment or notification wiring.

---

## Milestones

**Route:** `/DP/milestones`

Milestone cards with status, target date, aggregate progress, and linked test runs. Static demo content — not computed from live run state.

---

## Requirements (list view)

**Route:** `/DP/requirements`

Read-only table of project requirements with coverage status and linked case counts. Uses live `requirementsById` data when you have created requirements in Test Cases; otherwise shows a static demo list matching `REQ-*` key format.

Create and link requirements from **Test Cases** (Requirements tab) or view them read-only during **Test Runs** execution — this page does not add new create/edit flows.

---

## AI Studio

**Route:** `/DP/aistudio`

Demo AI workspace: prompt input, quick-action cards, draft preview with Accept/Edit/Discard, and recent generations list. **No real AI calls** — Generate and action buttons are visual only.

---

## Login

**Route:** `/login` (top-level, not project-prefixed)

Real authentication gate (NextAuth Credentials provider, JWT session). Visiting any app route while logged out redirects here with a `callbackUrl` back to where you were headed. Sign in with a seed user's email and the shared local-dev password (`relay-dev-2026` — see `README.md`'s "Local dev login" section for all eight accounts, e.g. `ssevume@ti.com`) to continue. The "Continue with TransPerfect SSO" button is a visual placeholder only.

The old project-prefixed `/:key/login` route now just redirects here — login has no project context until after you're signed in.

A small user menu in the top bar (next to the project switcher) shows your name/email/role and has a **Sign Out** action.

---

## Reports

**Route:** `/DP/reports`

Reports and analytics demo with report-type chips (Run Summary, Requirements Coverage, Failure Trends, Flaky Cases, Tester Workload). Run Summary shows static execution metrics; other tabs show placeholder panels. Export is disabled — no report generation.

---

## Settings (project route)

**Route:** `/DP/settings`

This route is a **server redirect to `/admin`** — there is no standalone project settings screen anymore.

Use the sidebar's single **Project Settings** entry (bottom of the main nav) to open the organisation admin area. That swaps the sidebar to the admin sub-nav (profile, account, organisation, projects, users, roles, audit log, etc.) — the same global `/admin/*` behaviour as before, now with Compass visual polish from Phase 2.

For user/role management, profile, organisation settings, and the live admin audit log, use `/admin/*` directly.

---

## User management

**Route:** `/admin/users`

Organisation-wide user directory (not project-prefixed).

**Features:**
- Search, paginated table (User, Email, 2FA, Role, Status, Last login, Project access, Actions)
- **Invite user** modal — first/last name, email, role, project access, **silent invite** checkbox
- **Edit user** modal
- **Disable / reactivate** flows
- Statuses: Active, Pending invite, Silent created, Disabled

**Silent invite:** when checked, creates a user with status **Silent created** (no email sent — for dummy/internal test accounts). Unchecked → **Pending invite** (still no email in prototype).

**Demo actor switcher** (top bar): switch the current user role to test RBAC. Owner/Administrator can manage users; Editor and Run Executor can view but not manage; Viewer is read-only in admin.

---

## Role management

**Route:** `/admin/roles`

Built-in roles: Owner, Administrator, Project Administrator, Editor, Run Manager, Run Executor, Viewer.

**Features:**
- Role list with user counts, project-level flag, built-in flag
- **View** built-in roles — read-only permission matrix
- **Create / edit / delete** custom roles with permission checkboxes

**Prototype RBAC:** enforced on admin user/role actions only (via demo actor switcher). Project screens (`/DP/testruns`, etc.) are not gated yet.

Future backend will enforce RBAC at API and service layers per [`docs/_authoritative/ARCHITECTURE_BASELINE.md`](../_authoritative/ARCHITECTURE_BASELINE.md).

---

## Audit log

**Two surfaces:**

| Location | Data |
|----------|------|
| `/DP/audit` | Static seed timeline — **page header** (title, subtitle, Export CSV), filter chips (All events / Test Cases / Test Runs / Test Plans / Users), circular icon chips per event type, timestamps, and ref links in descriptions. Export is visual only. |
| `/admin/audit-log` | Live append-only log — user invite/silent create, edit, disable/reactivate, role CRUD, actor switch, org/API/custom-field mutations |

Neither connects to a read API yet. Backend writes audit rows on run create and case result update (`/runs/api` path only).

---

## Admin panel (organisation)

**Route:** `/admin` → redirects to `/admin/profile`

**Top bar:** Back to Relay · Current organisation name · **Demo role** switcher

**Sidebar (primary):** My profile, My account, Organisation, Projects, User management, Role management, Audit log

**More (planned placeholders):** API keys, Integrations, Custom fields, Automation

**Projects admin** (`/admin/projects`): manage custom field activation per project.

---

## Known limitations

- Real login/session now gates the app (see "Login" above), but `/api/runs/*` still uses the legacy `x-relay-user-id` header pending a later wiring phase
- No real SSO — the SSO button on `/login` is a visual placeholder
- Multi-user collaboration works at the database level (shared MySQL), but there is no live push — another user's changes appear after a reload/project switch
- `/DP/cases` bookmark slug is obsolete (404)
- `/:key/integrations` is a placeholder route only — not linked from the sidebar
- Final Owner/Administrator cannot be disabled when they are the only effective admin remaining
- Reactivating a disabled user always sets status to **Active** (prior invite status is not preserved)
- Export, report generation, and most Integrations flows are visual placeholders
- CasesScreen may show brief flicker on project switch (known bug; RunsScreen fixed)
- Dashboard “Link defect” in needs-attention panel links to Test Runs only (no inline defect-link action)

See also [`docs/claude/known-bugs.md`](../claude/known-bugs.md) for active investigations.

---

## Local-only behaviours (documented gaps)

- Cmd+K search queries the active project's cases and runs in-memory (no OpenSearch yet)
- Ad-hoc (plan-less) run creation stays local-only — the server requires a plan to snapshot
- Per-step results and the per-transition execution log are local-only
- Duplicate run: the server copy snapshots the plan's *current* case list; the local copy freezes the source's case order — they can differ slightly
- Defect entities (`DEF-*`) and requirements are local; only run↔defect *links* are real
- Sealing does not check admin role in the UI (the API enforces contributor+)

---

## Future backend behaviours

Remaining for later phases:

- Real SSO (IAM) replacing the credentials provider
- Defects CRUD and external tracker integration; requirements modeling
- Custom fields backend (separate `mvp-custom-fields` branch)
- Reports and exports generated server-side; OpenSearch-backed global search
- Non-optimistic writes (wait-for-server) before production use

Technical contracts: [`docs/_authoritative/FRONTEND_CONTRACTS.md`](../_authoritative/FRONTEND_CONTRACTS.md).

---

## Quick route reference

| Module | Canonical route | Legacy redirect |
|--------|-----------------|-----------------|
| Dashboard | `/:key/dashboard` | `/dashboard` |
| Test cases | `/:key/testcases` | `/cases`, `/test-cases` |
| Test plans | `/:key/plans` | `/plans`, `/test-plans` |
| Test runs | `/:key/testruns` | `/runs` |
| Defects | `/:key/defects` | `/defects` |
| Settings | `/:key/settings` → redirects to `/admin` | `/settings` |
| Reports | `/:key/reports` | `/reports` |
| Audit | `/:key/audit` | `/audit` |
| Admin | `/admin/*` | — |
| API workspace | `/runs/api` | — |
