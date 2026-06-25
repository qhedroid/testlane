# Relay — User Guide

*Living document · Last verified: June 2026 · Branch: `mvp-user-role-access`*

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
| Step-level execution, sealing, project switching | Plans, defects list, and some audit data are static seed |
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

**Demo projects** (`seedTemplate: 'demo'`): metric cards, expandable run cards (Overview / Assignees / Defects tabs), needs-attention list, module coverage bars.

**Other projects:** summary cards with zeros and a “Dashboard coming soon” placeholder.

**Actions:** expand/collapse run cards; open Test Runs via *New Run* or attention links. Export buttons are visual only.

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

**Case detail:** metadata (assignee, template, priority, custom fields), tabs (Details, History, etc.), ← → arrows to move between cases. Deep link: `/DP/testcases/tc/<caseKey>` (URL omits the `TC-` prefix).

**Row actions (⋯ menu):** Duplicate, Edit, Copy to, Move to, Open folder, Delete.

**Bulk actions:** select rows → bulk bar for batch operations.

**Create test run from cases:** toolbar *Create test run* — scope to current folder or all cases; name the run; navigates to Test Runs.

User-created cases **persist** in localStorage per project.

---

## Test plans

**Route:** `/DP/plans`

**Legacy redirects:** `/plans`, `/test-plans`.

Static demo plans (Active / Draft) with status, case count, owner, and last updated.

**Plan detail tabs:** Overview, Included suites, Run history.

**Spawn run:** link navigates to `/DP/testruns` — it does **not** create a run automatically. Use Test Runs to create or select a run.

Plan editing, cloning, and export are not available in the prototype.

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

**Defect linking:** link defects from within a case execution (in-memory IDs; not synced to the Defects module screen).

**More… menu items:** Edit run, duplicate, reset results, export/report options — many are UI placeholders; create, duplicate, delete, and seal/re-open are functional.

---

## Defects

**Route:** `/DP/defects`

Mock defect table (ID, title, severity, status, module, owner) with search and filters. Detail panel shows linked case/run.

**New defect** button is disabled. In-run defect linking during execution works separately from this screen.

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
- Dashboard metrics only for demo-template projects

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
