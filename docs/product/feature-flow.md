# Relay — Feature Flow Map

*Living document · Last verified: 2026-07-03 · Branch: `mvp-final-close-out`*

Product and implementation flow map for the team. Complements authoritative contracts in `docs/_authoritative/**` with journey-oriented status and test checklists.

**For developers and agents:** Update this file whenever routes, module status, persistence, or user journeys change. Pair with [`user-guide.md`](user-guide.md).

---

## Modules and routes

**Canonical pattern:** `/:projectKey/:moduleSlug` — project key is uppercase in URLs (e.g. `DP`, `CTMS`).

| Module | Slug | Screen component | Route(s) | Data state |
|--------|------|------------------|----------|------------|
| Dashboard | `dashboard` | `DashboardScreen` | `/:key/dashboard` | Mock seed (demo template only) |
| Test cases | `testcases` | `CasesScreen` | `/:key/testcases`, `/:key/testcases/tc/:caseKey` | Mock + localStorage |
| Test plans | `plans` | `PlansScreen` | `/:key/plans` | Mock seed |
| Test runs | `testruns` | `RunsScreen` | `/:key/testruns`, `/:key/testruns/tr/:runKey`, `/:key/testruns/tr/:runKey/tc/:caseKey` | Mock + localStorage |
| Defects | `defects` | `DefectsScreen` | `/:key/defects` | Mock + localStorage (local DEF-*) |
| Settings | `settings` | `SettingsScreen` | `/:key/settings` | Mock + localStorage (project settings editable) |
| Reports | `reports` | `ReportsScreen` | `/:key/reports` (`?view=exports` deep-link) | Derived from localStorage state + saved views |
| My Work | `mywork` | `MyWorkScreen` | `/:key/mywork` | Derived from localStorage state |
| Integrations | `integrations` | `PlaceholderScreen` | `/:key/integrations` | Placeholder |
| Audit | `audit` | `AuditScreen` | `/:key/audit` | Static seed |
| Admin | — | `AdminShell` + page content | `/admin`, `/admin/profile` … `/admin/audit-log` | Mock + localStorage |
| API runs | — | `ApiRunsWorkspace` | `/runs/api` | **API / MySQL** |

**Legacy unprefixed redirects** (`LegacyRouteRedirect`): `/dashboard`, `/cases`, `/runs`, `/plans`, etc. → `/:activeProjectKey/<module>`.

**Root:** `/` → `/DP/dashboard`.

**Exceptions:** `/runs/api`, `/api/*` — not project-prefixed.

**Route helpers:** `apps/web/src/fresh/lib/project-routes.ts`  
**Machine-readable metadata:** `apps/web/src/lib/relay/prototype-contracts.ts`

**Known route gap:** `/:key/cases` → **404** (slug renamed to `testcases`; unprefixed `/cases` still redirects).

---

## Main user journeys

### 1. First-time demo (no Docker)

```
/ → /DP/dashboard → browse testcases → open testruns/tr/00001 → execute case → seal run
```

### 2. Create and execute a new run

```
/:key/testcases (optional: select cases)
  → Create test run OR /:key/testruns → Create run modal
  → /:key/testruns/tr/:runKey
  → + Add cases (if empty)
  → select case → mark step/case results
  → Close test run (seal)
```

### 3. Manage test library

```
/:key/testcases
  → folder navigation → quick create / new case modal
  → row ⋯ menu (duplicate, edit, delete)
  → detail panel edit → persists localStorage
```

### 4. Multi-project workflow

```
ProjectSwitcher → select / create / add demo project
  → URL rewrites (/:oldKey/module → /:newKey/module)
  → scoped folders, cases, runs per project
```

### 5. Admin configuration

```
/admin/projects → select project → activate custom fields
/admin/custom-fields → define fields globally
/admin/users → invite user (localStorage)
Changes append to /admin/audit-log
```

### 6. API validation path (backend slice)

```
pnpm docker:up && pnpm db:migrate && pnpm db:seed
→ /runs/api → create run → update case result
→ pnpm api:validate
```

Demo `/DP/testruns` and `/runs/api` are **intentionally separate** until wiring slice.

---

## Data persistence model

| Layer | Mechanism | Scope |
|-------|-----------|-------|
| Prototype UI | `FreshProvider` + `useReducer` | In-memory React state |
| Browser persistence | `localStorage` key **`relay-demo-v2`** | Survives refresh; per browser |
| Demo seed | `buildInitialDemoState()`, `demo-template.ts`, `seed.ts` | Initial load + “Add demo project” clone |
| API workspace | MySQL via `/api/runs/*` | `/runs/api` only |
| Static mock | `mock-data.ts`, seed arrays | Defects, settings preview, plan list, project audit |

**Not persisted in prototype:** test plans (seed only), project-level audit timeline, defects module data, reports/integrations placeholders.

**Active project sync:** `ProjectRouteSync` reads URL project key → `setActiveProject`. Switcher writes URL + state together.

---

## localStorage schema notes

| Field | Value |
|-------|-------|
| Key | `relay-demo-v2` |
| Current version | **`22`** (`DEMO_SCHEMA_VERSION` in `demo-model.ts`) |
| Migration file | `migrate-demo-state.ts` |
| On failure | Reset to seed (`buildInitialDemoState()`) |

### Version history (summary)

| Ver | Change |
|-----|--------|
| v2 | Multi-project blob |
| v3 | Required project `key`, Demo Project / `DP` |
| v4 | `runKey`, URL `/testruns/tr/:runKey` |
| v5 | `adminSettings` (global admin panel) |
| v6 | `Project.activeCustomFieldIds` |
| v7 | Case `template`, `references`, `summary`, `customFieldValues` |
| v8 | `Case.caseKey`, `nextCaseNumByProject` |
| v9 | Globally unique case ids (`newId('case')`) |
| v10 | `executionLog`, execution metadata on runs |
| v11 | `Case.createdAt` |
| v12 | `currentActorUserId`, user access fields, role permissions, silent invite statuses |
| v13 | `plansById`, `nextPlanNumByProject`, `TestPlan`/`TestQuery`/`QueryCondition` types, seed plans |
| v14 | `requirementsById`, `defectsById`, `Case.requirementIds`, `nextRequirementNumByProject`, `nextDefectNumByProject`, local REQ/DEF keys |
| v15 | `savedReportsById` — Reports-page named views (`SavedReport`) |
| v16 | `exportsById` — export history metadata + regeneration spec (`ExportArtifact`; blobs are session-only) |
| v17 | `DemoRun.rerunOf` lineage pointer (no backfill) |
| v18 | `Case.position` (manual order, backfilled from array order), `Case.archivedAt`, `Folder.archivedAt` |
| v19 | `scheduledRunsById` — `ScheduledRun` entity (simulated firing) |
| v20 | `dashboardLayoutByActor` — per-actor dashboard card order/hidden |
| v21 | `savedFiltersById` — `SavedFilter` per surface (testcases/testruns) |
| v22 | `caseVersionsById` — real per-case edit history (`CaseVersion`, cap 50) |

**Rule:** bump `DEMO_SCHEMA_VERSION` and add a migration step for every shape change.

**Key state fields:** `projectsById`, `activeProjectId`, `folders`, `cases`, `runs`, `currentRunIdByProject`, `nextRunNumByProject`, `nextCaseNumByProject`, `adminSettings`, `currentActorUserId`, `plansById`, `nextPlanNumByProject`, `requirementsById`, `defectsById`, `nextRequirementNumByProject`, `nextDefectNumByProject`.

Detail: [`docs/_authoritative/DOMAIN_MODEL.md`](../_authoritative/DOMAIN_MODEL.md), [`docs/claude/handoff.md`](../claude/handoff.md).

---

## Role / RBAC behaviour

### Target (backend — documented, not enforced in demo UI)

| Role | Capability (summary) |
|------|------------------------|
| `super_admin` | Platform-wide management |
| `admin` | Project management, seal/reopen runs |
| `contributor` | Execute runs, edit cases |
| `viewer` | Read-only |

Project-level override: `MAX(global_role, project_role)`.

Source: [`docs/_authoritative/ARCHITECTURE_BASELINE.md`](../_authoritative/ARCHITECTURE_BASELINE.md) § RBAC.

### Prototype today

| Area | Behaviour |
|------|-----------|
| Admin users/roles UI | Seed + CRUD in localStorage; audit log on mutations |
| Demo screens | **No role checks** — all actions available |
| Seal / reopen run | UI toggle only; no admin gate |
| `/runs/api` | Dev header `x-relay-user-id` / `NEXT_PUBLIC_RELAY_USER_ID`; service-layer RBAC on mutations |

---

## Feature status table

| Module / feature | Status | Persistence | Notes |
|------------------|--------|-------------|-------|
| Shell & navigation | **Implemented** | Client | Sidebar, module switcher, Cmd+K |
| Project switcher & CRUD | **Implemented** | localStorage | URL sync; cascade delete |
| Dashboard (demo template) | **Implemented** | Seed | Metrics for `seedTemplate: 'demo'` only |
| Dashboard (other projects) | **Placeholder** | — | “Coming soon” |
| Test cases — tree & table | **Implemented** | localStorage | Filters, pagination, search |
| Test cases — detail & CRUD | **Implemented** | localStorage | Tabs, custom fields, context menu |
| Test cases — URL sync | **Implemented** | — | `/testcases/tc/:caseKey` |
| Test plans — list & detail | **Implemented** | localStorage | URL routing; CRUD modals; Overview + Test cases tabs |
| Test plans — test case query groups | **Implemented** | localStorage | Condition/folder/static; live resolved-case preview |
| Test plans — spawn run | **Implemented** | localStorage | Modal pre-fills title + count; stamps planId on run |
| Test runs — list & picker | **Implemented** | localStorage | Search, archive hide |
| Test runs — create / edit / duplicate / delete | **Implemented** | localStorage | |
| Test runs — add cases to run | **Implemented** | localStorage | `AddCasesToRunModal` |
| Test runs — empty state | **Implemented** | — | Testiny-style |
| Test runs — execution UX | **Implemented** | localStorage | Steps, results, shortcuts |
| Test runs — seal / reopen | **Implemented** | localStorage | No RBAC gate |
| Test runs — URL sync | **Implemented** | — | `/tr/:runKey`, `/tc/:caseKey` |
| Test cases — requirements create/link | **Implemented** | localStorage | Requirements tab; REQ-* keys |
| Test cases — defects view-only | **Implemented** | localStorage | Derived from run execution links |
| Test runs — requirements view-only | **Implemented** | localStorage | From linked case requirements |
| Defects module screen | **Partial** | Mock + localStorage | Static TI-* + local DEF-*; create disabled |
| Defects in-run create/link | **Implemented** | localStorage | Failed/Blocked + unsealed only |
| Reports — control bar, KPIs, charts, drill-down | **Implemented** | Derived + localStorage | Trend buckets are runs (no sprint entity); saved views v15 |
| Reports — effectiveness metrics | **Implemented** | Derived | Defects/100 execs, flaky rate, time-to-first-result; escaped defects deliberately absent |
| Reports — requirements coverage rollup | **Implemented** | Derived | Badges also on case Requirements tab; no dedicated module |
| Export drawer (Dashboard/Audit/Runs/Reports) | **Implemented** | localStorage (metadata) | Real CSV; “PDF” = print-friendly HTML, “Excel” = CSV — labelled; blobs expire on reload; shareable link stub |
| Exports history view | **Implemented** | localStorage | Under Reports; re-generate expired artifacts |
| Re-runs (create, close-confirm, lineage, chain grouping) | **Implemented** | localStorage | `rerunOf` v17; source runs never mutated |
| Test cases — bulk actions (add to run/clone/move/assign/archive) | **Implemented** | localStorage | Archived view with restore |
| Test cases — move/copy dialog | **Implemented** | localStorage | Cross-project copy only (moves disabled by design) |
| Test cases — manual ordering + drag-and-drop | **Implemented** | localStorage | `Case.position` v18; column sort is temporary view |
| Folder menu (subfolder/rename/move/copy/archive) | **Implemented** | localStorage | Folder→folder drag re-nests |
| Rich text (markdown subset) | **Implemented** | Plain strings | Case/step/requirement/defect fields; no editor dependency |
| Scheduled runs | **Implemented (simulated)** | localStorage v19 | Fires on Plans load or manual check — no background job |
| My Work queue | **Implemented** | Derived | `/:key/mywork`; actor/assignee name mismatch handled via picker |
| Archived runs UI | **Implemented** | localStorage | Archive (sealed only) + Archived picker section + unarchive |
| Dashboard customise (per actor) | **Implemented** | localStorage v20 | Show/hide/reorder seed metric cards |
| Saved filters (cases + runs) | **Implemented** | localStorage v21 | Per project |
| Case version history + restore | **Implemented** | localStorage v22 | Real diffs, cap 50; Activity tab merged into same log |
| Admin — remove user (permanent) | **Implemented** | localStorage | Last-admin guard; no cascade (orphaned names by design) |
| Integrations (project) | **Placeholder** | — | |
| Settings (project) | **Implemented (settings section)** | localStorage | Policies editable with `manageProjects` roles; rest of page informational |
| Audit (project) | **Partial** | Static seed | Export button works (static timeline export) |
| Admin panel (all sections) | **Implemented** | localStorage | 11 routes under `/admin` |
| Admin — user management | **Implemented** | localStorage | Invite, silent invite, edit, disable/reactivate, project access |
| Admin — role management | **Implemented** | localStorage | Built-in + custom roles, permission matrix |
| Admin — demo actor / RBAC | **Partial** | localStorage | Enforced on admin user/role actions only |
| RBAC enforcement (project UI) | **Partial** | — | Project settings editing gated; runs/cases still ungated |
| Demo UI → MySQL wiring | **Missing** | — | Use `/runs/api` separately |
| Global search (OpenSearch) | **Missing** | — | Cmd+K is in-memory |
| Requirements / traceability | **Implemented (rollup)** | localStorage + derived | Create/link on cases; coverage badges + Reports card; no external sync |

---

## Dependencies between modules

```mermaid
flowchart LR
  Admin[Admin panel] --> CF[Custom fields]
  CF --> TC[Test cases]
  TC --> TR[Test runs]
  TP[Test plans] -->|spawn run stamps planId| TR
  TR --> Dash[Dashboard metrics]
  TR --> Audit[Audit mock]
  TR -.->|in-run only| Def[Defects]
  API["/runs/api"] -.->|parallel path| TR
```

| Dependency | Detail |
|------------|--------|
| Admin → Test cases | `activeCustomFieldIds` controls which custom fields render |
| Test cases → Test runs | Cases referenced in `run.caseOrder`; create-run from cases toolbar |
| Test plans → Test runs | Spawn run creates a run with `planId`/`planName` stamped; plan's query groups resolve case list for scope display |
| Test runs → Dashboard | Run cards read seed metrics, not live run state |
| Project scope | All case/run/folder selectors filter by `activeProjectId` |
| Schema migrations | Any model change affects all modules using `FreshProvider` |

---

## Known limitations

- Frontend-only phase — no demo UI API wiring ([`MVP_FRONTEND_ONLY_SCOPE.md`](../_authoritative/MVP_FRONTEND_ONLY_SCOPE.md))
- `/DP/cases` 404; use `/DP/testcases`
- Run spawn does not snapshot case steps immutably (edits to cases after spawn affect the same case objects in a run)
- Run spawn does not snapshot case steps immutably (edits affect same case objects)
- Project settings in switcher disabled
- CasesScreen project-switch flicker (BUG-02) — deferred
- Authoritative docs may lag code ([`AS_BUILT_SNAPSHOT.md`](../_authoritative/AS_BUILT_SNAPSHOT.md) still references `/cases` slug in places)

---

## Future backend / API requirements

| Module | Expected APIs (minimum) |
|--------|-------------------------|
| Auth | Session, SSO, user context |
| Projects | CRUD, membership, role assignment |
| Test cases | CRUD, folders, steps, bulk import |
| Test plans | CRUD, spawn run |
| Test runs | CRUD, seal, snapshot cases, case/step results |
| Defects | CRUD, case/run linking, external refs |
| Audit | Read paginated log; existing write path |
| Dashboard | Aggregates from runs + defects |
| Reports | Generation + export |
| Search | OpenSearch fan-out (cases, runs, plans) |

Per-screen detail: [`FRONTEND_CONTRACTS.md`](../_authoritative/FRONTEND_CONTRACTS.md).

---

## Manual test checklist per module

### Dashboard — `/:key/dashboard`

- [ ] Demo project shows run cards and attention list
- [ ] Non-demo project shows placeholder
- [ ] *New Run* / attention links open testruns
- [ ] No console errors on load

### Test cases — `/:key/testcases`

- [ ] Folder expand/collapse and folder search
- [ ] Quick create and New case modal persist after refresh
- [ ] Row ⋯ menu: duplicate, edit, delete
- [ ] Detail panel ← → navigation and URL `/tc/:caseKey`
- [ ] Filter panel and keyword search
- [ ] Create test run from toolbar
- [ ] Project switch → cases scoped to new project
- [ ] Legacy `/cases` redirects to `/:key/testcases`

### Test plans — `/:key/plans`

- [ ] Plan list renders; row select navigates to `/plans/tp/:planKey`
- [ ] Create plan modal — saves and selects new plan
- [ ] Edit plan modal — updates title/description
- [ ] Duplicate plan — copies with incremented key
- [ ] Delete plan — removes from list
- [ ] Overview tab — three cards (details, open run, coverage %); run history table
- [ ] Test cases tab — add condition/folder/static query groups; live resolved-case preview updates
- [ ] Spawn run modal — shows case count, pre-fills title, creates run, navigates to testruns
- [ ] Project switch clears plan selection; URL updates correctly

### Test runs — `/:key/testruns`

- [ ] Create run modal → navigates to `/tr/:runKey`
- [ ] Empty run shows empty state; Add cases modal works
- [ ] Run picker search and switch updates URL
- [ ] Step and case result buttons; sealed run blocks edits
- [ ] Duplicate and delete run
- [ ] Deep link `/tr/:runKey/tc/:caseKey`
- [ ] Project switch strips run selection; no flicker (RunsScreen)
- [ ] Legacy `/runs` redirects

### Defects — `/:key/defects`

- [ ] Table and detail panel render
- [ ] New defect button disabled

### Settings (legacy check) — `/:key/settings`

- [ ] Informational sections display; users preview table renders

### Reports — `/:key/reports`

- [ ] Control bar: scope (project/plan/run), range, compare toggle change all widgets
- [ ] Line-chart point and stacked-bar segment clicks open the drill-down with removable chips
- [ ] Drill-down Link defect creates + links a local defect (disabled on closed runs)
- [ ] Save as report → appears in left rail; apply/rename/delete work
- [ ] Effectiveness and Requirements coverage panels render (or honest empty states)
- [ ] Export button opens the drawer; Exports rail view lists artifacts; expired → Re-generate

### My Work — `/:key/mywork`

- [ ] Person picker defaults sensibly; run groups show counts; Continue deep-links to run+case
- [ ] Hide completed / include closed runs toggles filter correctly

### Export drawer (Dashboard / Audit / Test Runs / Reports)

- [ ] Scope trio renders with honest disabled states; format + contents + presets editable
- [ ] Generate produces a downloadable artifact and a toast; history records it
- [ ] “PDF” downloads as print-friendly HTML; “Excel”/CSV download as CSV

### Re-runs — `/:key/testruns`

- [ ] Close test run shows the confirmation dialog with Close / Close & create re-run / Cancel
- [ ] Create re-run modal: include options with live counts, custom picker, assignment, editable name
- [ ] New re-run starts Not-run with chosen cases; source run untouched
- [ ] Picker groups chains under origin; lineage strip in Details tab navigates between generations
- [ ] Archive (sealed runs only) hides the run; Archived section restores it

### Test case organisation — `/:key/testcases`

- [ ] Bulk bar: add to run, clone, move, assign, archive all mutate state
- [ ] Move/Copy dialog: same-project move, cross-project copy only, option checkboxes honest
- [ ] Manual order persists after reload; column sort is temporary; drag row→row/row→folder/folder→folder
- [ ] Folder ⋯ menu: subfolder, rename, move, copy, archive (+ case-level unarchive restores ancestors)
- [ ] Rich text toolbar + preview on preconditions/summary/steps; markdown renders read-only incl. run panel
- [ ] History tab logs real edits with diffs; restore reverts content; Activity shows the same feed
- [ ] Saved filters save/apply/rename/delete on both cases and runs filter panels

### Scheduled runs — `/:key/plans`

- [ ] Schedule this plan… creates a schedule; panel lists it with next-fire time
- [ ] Check for due runs spawns runs for due schedules and advances/deactivates them
- [ ] Pause/resume, edit, delete work; simulation labelled

### Settings — `/:key/settings`

- [ ] Project settings section edits policies with a manage-projects role; read-only otherwise

### Integrations — `/:key/integrations`

- [ ] Placeholder banner and message

### Audit — `/:key/audit`

- [ ] Timeline renders; filter chips toggle (client-side)

### Admin — `/admin/users`, `/admin/roles`

- [ ] Remove user: confirmation modal states no-cascade limitation; final admin blocked; audit entry written
- [ ] Actor switcher: Owner can invite/edit/disable users
- [ ] Switch to Editor — invite button shows permission message
- [ ] Switch to Viewer — user management page read-only/denied
- [ ] Silent invite creates **Silent created** status; normal invite → **Pending invite**
- [ ] Role view shows built-in permission matrix (read-only)
- [ ] Create custom role with permissions; edit and delete
- [ ] Audit log records invite, edit, disable, role CRUD, actor switch

### API workspace — `/runs/api` (optional)

- [ ] Requires Docker + seed
- [ ] Create run; update case result
- [ ] `pnpm api:validate` passes

---

## Mandatory post-change smoke test (agents)

After every user-visible feature change, route change, schema/localStorage change, RBAC change, or module flow change, agents must:

1. Run `pnpm build`
2. Start `pnpm dev`
3. Browser smoke test affected routes **and** core regression routes (below)
4. Record WebM evidence where tooling supports it
5. Capture screenshots for failures
6. Write `/tmp/relay-qa-<branch-or-feature>/qa-report.md` with pass/fail summary, bugs, known limitations, push readiness
7. Do not push until evidence is reviewed or explicitly waived

Evidence lives under `/tmp/relay-qa-...` (not committed). Temporary Playwright scripts under `/tmp/` are fine; do not add permanent test dependencies in feature PRs unless already present.

**Core regression routes:** `/admin/users`, `/admin/roles`, `/admin/audit-log`, `/DP/settings`, `/DP/dashboard`, `/DP/testcases`, `/DP/testruns`, `/DP/plans`

**Admin / RBAC smoke behaviours:** user table load; silent invite → Silent created; normal invite → Pending invite; edit/disable/reactivate; final Owner/Admin guard; actor switcher; Editor/Viewer blocked; built-in roles + custom CRUD; audit entries; refresh preserves localStorage v12.

**Project smoke behaviours:** testcases/testruns/plans load; create/open run and add cases; project switch without flicker (when switcher available).

---

## Related documentation

| Doc | Role |
|-----|------|
| [`user-guide.md`](user-guide.md) | User-facing how-to |
| [`ux-philosophy.md`](ux-philosophy.md) | UX rationale (stable reference) |
| [`design-system.md`](design-system.md) | Visual tokens |
| [`changelog.md`](changelog.md) | Release history |
| [`docs/_authoritative/*`](../_authoritative/README.md) | Contracts and as-built truth |
| [`docs/claude/handoff.md`](../claude/handoff.md) | Active branch and schema session state |
