# Relay — User Guide

*Living document · Last verified: June 2026 · Branch: `mvp-requirements-defects-slice`*

This guide explains how to use Relay from a user perspective. It describes the **frontend prototype** as it works today in the browser.

**For developers and agents:** When user-visible behaviour changes, update this file together with [`feature-flow.md`](feature-flow.md).

---

## What Relay is

Relay is a QA test execution platform for clinical-trials-style workspaces. It helps teams organise **test cases**, group them into **test plans**, execute them in **test runs**, track results, and review activity across **projects**.

The current app is a **frontend prototype**: most data lives in your browser (demo seed + localStorage). A separate API-backed workspace exists at `/runs/api` for backend validation but is not the primary demo experience.

---

## Frontend prototype caveat

| What works | What is simulated |
|------------|-------------------|
| Full UI walkthrough without Docker | No real login or SSO |
| Create/edit cases and runs in the browser | Data is not shared across users or machines |
| Step-level execution, sealing, project switching | Legacy seed TI-* defect refs on some runs; no real Jira sync |
| Admin panel forms persist in localStorage | **Demo RBAC** on user/role admin screens via actor switcher |
| `/runs/api` persists to MySQL when Docker is running | Demo test runs UI is not wired to MySQL |

**Reset demo data** (browser console):

```javascript
localStorage.removeItem('relay-demo-v2')
location.reload()
```

**Run locally:** `pnpm install && pnpm dev` → open http://127.0.0.1:3000 (redirects to `/DP/dashboard`).

---

## Project switching

Relay is **multi-project**. Each project has its own folders, test cases, and test runs.

- **URL pattern:** `/:projectKey/:module` — e.g. `/DP/testcases`, `/CTMS/testruns`.
- **Project switcher** appears in the top bar on Test Cases and Test Runs. It shows the active project name.
- **Switch project:** pick another project from the dropdown. The URL rewrites to the same module under the new key (run/case selection is cleared when switching projects).
- **Create project:** *Create project…* — enter name, key (uppercase, unique), optional description. You land on the new project's dashboard (blank metrics unless you add a demo project).
- **Add demo project:** clones a full demo dataset with key `DP1`, `DP2`, … — useful for isolated walkthroughs.
- **Rename / delete:** pencil and trash icons on each row. Delete cascades all cases, folders, and runs in that project.

**Default seed project:** Demo Project (`DP`) — richest demo data.

---

## Dashboard

**Route:** `/DP/dashboard` (replace `DP` with your project key)

The dashboard is a briefing screen: what needs attention and how runs are progressing.

**All projects** compute metrics from live `FreshProvider` data (active unsealed, unarchived runs and project cases).

**Metric cards:** Active Runs, Pass Rate (of executed cases — shows `—` when none executed), Open Failures (unlinked failed executions), Blocked Cases, Run Coverage (% of cases in active runs that have been executed at least once).

**Active runs column:** Expandable run cards with Overview / Assignees / Defects tabs; filter chips *All* and *Critical* (runs with failures). Dropped mock-only fields: stalled status, due date, environment.

**Needs attention:** Unlinked failures (Failed executions with no linked defect), sorted most-recent first; empty state when none.

**Coverage by folder:** Root-level folder breakdown (including unfiled cases row when applicable); overall % matches Run Coverage metric card.

**Brand-new project (zero test cases):** Centered “Add your first test cases” empty state with link to Test Cases — not a wall of zero metrics.

**Actions:** expand/collapse run cards; open Test Runs via *New Run* or attention links. Export buttons are visual only. “Link defect” in the attention panel navigates to Test Runs (no inline link action).

---

## Test cases

**Route:** `/DP/testcases`

**Legacy redirects:** `/cases` and `/test-cases` redirect to `/:activeProjectKey/testcases`.  
**Note:** `/DP/cases` (old project-prefixed slug) returns **404** — use `/DP/testcases`.

Three-pane layout: **folder tree** (left) → **case table** (centre) → **detail panel** (right, opens on row select).

**Browse:** expand/collapse folders; use folder search; filter by status chips; keyword search in the toolbar.

**Create cases:**
- *Quick create* — paste titles, press Enter to add multiple cases quickly.
- *New case* modal — full fields including steps (Action/Expected or BDD Given/When/Then).

**Case detail:** metadata (assignee, template, priority, custom fields), tabs (Details, Attachments, Defects, Requirements, Runs, History, Activity), ← → arrows to move between cases. Deep link: `/DP/testcases/tc/<caseKey>` (URL omits the `TC-` prefix).

**Requirements tab (create/link):** From the selected case, open *Requirements*. Create a local demo requirement (title + optional description) — it is saved to localStorage and linked to the case automatically. Use *Link existing…* to attach another project requirement. Requirements use keys like `REQ-00001`. No external Jira or integration sync.

**Defects tab (view-only):** Shows defects linked to this case from test run executions (including legacy seed `TI-*` references). You cannot create or link defects here — use Test Runs when a case fails or is blocked.

**Row actions (⋯ menu):** Duplicate, Edit, Copy to, Move to, Open folder, Delete.

**Bulk actions:** select rows → bulk bar for batch operations.

**Create test run from cases:** toolbar *Create test run* — scope to current folder or all cases; name the run; navigates to Test Runs.

User-created cases **persist** in localStorage per project.

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

**Run picker:** search and switch runs in the top bar. Archived runs are hidden from the default list.

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

**Seal run:** *Close test run* in the top bar locks mutations — results and steps become read-only. *Re-open* reverses this (prototype has no role check).

**Defect linking (Failed/Blocked only):** On the execution panel *Defects* tab, create a local demo defect (`DEF-00001`, …) or link an existing one — only when the case result is **Failed** or **Blocked** and the run is not sealed. Passed, Skipped, and Not run disable create/link with helper text. Defects persist in localStorage and appear on the case Defects tab (view-only) and Defects module list.

**Requirements (view-only in runs):** The execution panel *Requirements* tab shows requirements linked to the underlying test case. Manage requirements from Test Cases — no create/link controls in Test Runs.

**More… menu items:** Edit run, duplicate, reset results, export/report options — many are UI placeholders; create, duplicate, delete, and seal/re-open are functional.

---

## Defects

**Route:** `/DP/defects`

Mock defect table (ID, title, severity, status, module, owner) with search and filters. Detail panel shows linked case/run. Locally created demo defects (`DEF-*` from failed/blocked executions) appear at the top of the list for the active project alongside static `TI-*` mock rows.

**New defect** button remains disabled — create defects from Test Runs during execution instead. No Jira sync.

---

## Reports

**Route:** `/DP/reports`

Placeholder screen — planned module message only. No report generation.

---

## Settings

**Route:** `/DP/settings`

Project settings preview with a link to the organisation **Relay settings area** (`/admin`). Shows a live summary of users from `adminSettings` (first five rows) and module list.

For user/role management, profile, organisation, and audit log, use `/admin/*`.

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
| `/DP/audit` | Static seed timeline — filter chips, export button (visual only) |
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

- No authentication — demo assumes a single local user
- No multi-user collaboration or server sync for the prototype UI
- Test plans are not editable and do not drive run creation automatically
- `/DP/cases` bookmark slug is obsolete (404)
- Project settings menu item in switcher is disabled (“coming soon”)
- Final Owner/Administrator cannot be disabled when they are the only effective admin remaining
- Reactivating a disabled user always sets status to **Active** (prior invite status is not preserved)
- Export, report generation, and most Integrations flows are visual placeholders
- CasesScreen may show brief flicker on project switch (known bug; RunsScreen fixed)
- Dashboard “Link defect” in needs-attention panel links to Test Runs only (no inline defect-link action)

See also [`docs/claude/known-bugs.md`](../claude/known-bugs.md) for active investigations.

---

## Mock / frontend-only behaviours

- All prototype modules show a **Frontend prototype** banner (yellow) except `/runs/api` (blue, API-backed)
- Cmd+K search queries active project's cases and runs in-memory
- Spawn-from-plan navigates only — no API call
- Sealing does not check admin role
- Duplicate run copies case order and resets executions; does not copy historical results

---

## Future backend behaviours

When the demo UI is wired to APIs (planned, not started for `/DP/testruns`):

- Login and session; RBAC enforced per action
- Test cases, plans, runs, and results persisted in MySQL
- Plan spawn creates a run via `POST /api/runs` with case snapshots
- Audit log read API for project and admin views
- Defects CRUD and external tracker integration
- Reports and exports generated server-side
- OpenSearch-backed global search

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
| Settings | `/:key/settings` | `/settings` |
| Reports | `/:key/reports` | `/reports` |
| Audit | `/:key/audit` | `/audit` |
| Admin | `/admin/*` | — |
| API workspace | `/runs/api` | — |
