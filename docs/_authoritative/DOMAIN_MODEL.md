# Domain model

*Branch: `demo/contract-aware-prototype` · June 2026*

Relay is **multi-project**: a **project** is the workspace boundary. Folders, test cases, plans, and runs belong to exactly one project. The UI may say "module" (CTMS, eTMF) but the canonical term is **project**.

This doc covers:
1. **Target invariants** (backend schema — backend-phase reference)
2. **Prototype model** (what the FRESH UI uses today)

Schema source: `packages/db/schema.ts`. Prototype types: `apps/web/src/fresh/data/demo-model.ts`.

---

## Identity conventions

| Kind | Target (MySQL) | Prototype (demo) |
|------|----------------|------------------|
| Primary key | ULID — 26-char string, app-generated | Opaque string (`case-…`, `run-…`, folder ids) |
| Human ref | `case_ref`, `run_ref`, `plan_ref` per project (e.g. `TC-1001`) | Display refs in seed strings; not enforced |
| Uniqueness | `(project_id, *_ref)` unique | N/A in localStorage |

**Invariant (target):** PKs are never reused. Human refs are unique within a project, not globally.

---

## Entity graph (target)

```
Organisation
  └── User (global_role)
  └── Project
        ├── ProjectRole (user + role override)
        ├── Folder (tree: parent_id nullable = root)
        ├── TestCase (+ TestCaseStep[])
        ├── TestPlan (+ TestPlanCase[] → TestCase)
        └── TestRun (+ TestRunCase[] snapshot, RunStepResult[], RunDefectLink[])
```

**Scoping rule:** Every folder, case, plan, and run has `project_id`. Queries and refs are always project-scoped.

**Run spawn invariant (target):** Creating a run copies case + step **snapshots** into `test_run_cases` / `run_case_step_snapshots`. Source case edits do not mutate sealed/historical run data. Result columns on run cases are mutable until the run is **sealed**.

**Audit invariant (target):** `audit_log` is append-only on mutations. No UI delete.

---

## Core entities (target)

| Entity | Key fields | Relationships |
|--------|------------|---------------|
| **Organisation** | id, slug, name | → users, projects |
| **User** | id, org_id, email, name, global_role | → project_roles |
| **Project** | id, org_id, slug, name, status | Owns folders, cases, plans, runs |
| **Folder** | id, project_id, parent_id, name, position | Tree under project; cases.folder_id |
| **TestCase** | id, case_ref, project_id, folder_id, title, priority, type, tags, … | → steps; in plans; snapshotted in runs |
| **TestPlan** | id, plan_ref, project_id, title, status, environment | → plan_cases; spawns runs |
| **TestRun** | id, run_ref, project_id, test_plan_id, status, sealed_at | → run_cases, assignees |
| **TestRunCase** | snapshot_* columns + status, comment, executed_by/at | Execution result at case level |
| **RunStepResult** | per step snapshot | Step-level execution (schema exists; API UI partial) |
| **RunDefectLink** | defect_ref, defect_url | External defect reference only |
| **Requirement** | — | **Not modeled** |

Roles (capability, not job title): `super_admin` > `admin` > `contributor` > `viewer`. Project-level override via `project_roles`.

---

## Prototype model (FRESH / localStorage)

State shape: `DemoState` in `demo-model.ts`, persisted via `FreshProvider` (`relay-demo-v2`, `schemaVersion: 6`).

| Entity | Prototype type | Notes |
|--------|----------------|-------|
| **Project** | `Project { id, name, key, description?, activeCustomFieldIds, projectSettings?, seedTemplate?, createdAt }` in `projectsById` | User-managed: **name** (required), **key** (required, uppercase, unique, `[A-Z0-9_-]`), **description** (optional). **activeCustomFieldIds** — subset of global `adminSettings.customFields` ids active for this project (seed DP: Priority, References, Is Automated). **projectSettings** — optional per-project inherit/override for org policies (re-open runs/milestones, edit results, report logo). Seed project: **Demo Project** / key **DP**. `seedTemplate: 'demo'` marks projects that show the seeded dashboard UI and were created from the immutable demo template (initial seed `DP` or clones `DP1`, `DP2`, …). URL routing uses `key` as first path segment. |
| **Folder** | `Folder { id, projectId, name, parentId? }` | Scoped to `projectId`. |
| **TestCase** | `Case { id, projectId, title, folderId, priority, type, steps[], tags[], assignee, … }` | Steps embed comments. |
| **TestPlan** | Static `PLANS` in seed | Not in `DemoState`; not linked to cases in state. |
| **TestRun** | `DemoRun { id, projectId, runKey, name, description?, planId, sealed, archivedAt?, caseOrder[], executions }` | `runKey` is project-scoped 5-digit display id for URLs. `executions` keyed by case id. `currentRunIdByProject` tracks picker per project (synced from URL when `/tr/:runKey` present). |
| **Execution** | `CaseExecution { status, stepResults, defects[], assignee }` | Full step-level in demo `/runs`. |
| **Defect** | String IDs on execution + `MOCK_DEFECTS` screen | Not a first-class entity in state. |
| **AdminSettings** | `AdminSettings` on `DemoState.adminSettings` | Global org admin panel state (profile, account, organization, API keys, users, roles, custom fields, automation, audit log). Persisted in `relay-demo-v2`. Seed: `admin-initial-settings.ts`. Mutations via `admin/*` actions in `FreshProvider`; audit log auto-appended on data mutations. |

### AdminSettings structure (prototype)

| Nested field | Type | Notes |
|--------------|------|-------|
| `profile` | displayName, language, regionalFormat, theme | Saved via `admin/saveProfile` |
| `account` | firstName, lastName, twoFactorMethods[] | Saved via `admin/saveAccount`; 2FA toggled via `admin/toggle2FA` |
| `organization` | fullName, reopen/edit policies, oauthEnabled | Saved via `admin/saveOrganization` (+ audit entry) |
| `apiKeys` | `AdminApiKey[]` | Created/deleted via admin actions; sorted by `createdAt` |
| `users` | `AdminUser[]` | Seed users + invited users (`admin-user-inv-*` ids) |
| `roles` | `AdminRole[]` | Built-in + custom roles |
| `customFields` | `AdminCustomField[]` | Seed + session-added fields |
| `automation` | retentionPeriod, sources[], fields[] | CRUD via admin actions |
| `auditLog` | `AuditLogEntry[]` | Append-only; numeric `timestamp`; relative display in UI |

### Prototype invariants (enforced in UI code)

1. **Multi-project isolation** — folders, cases, and runs carry `projectId`. Selectors (`listActiveProject*`) and `FreshProvider` scope `/cases` and `/testruns` to `activeProjectId`.
2. **Key-based routing** — canonical URLs are `/:projectKey/:module` (e.g. `/DP/dashboard`, `/CTMS/testruns`). `ProjectRouteSync` sets `activeProjectId` from URL key; switcher navigates to same module under new key. Legacy unprefixed paths (`/runs`, `/cases`, …) redirect client-side to active project's prefixed path.
3. **Active project persistence** — `activeProjectId`, `currentRunIdByProject`, and `nextRunNumByProject` survive reload via `relay-demo-v2`.
4. **Run URL routing** — selected run reflected at `/:projectKey/testruns/tr/:runKey` (5-digit `runKey`). No segment when no run selected. Invalid key → redirect to `/:projectKey/testruns`.
5. **Project keys** — unique across `projectsById`; stored uppercase; validated on create (`[A-Z0-9_-]`).
6. **Project delete** — **cascade delete**: removing a project deletes its folders, cases, and runs. If the active project is deleted, the store activates another project or creates `"Demo Project"` / `DP` when none remain.
7. **Dashboard scoping** — dashboard metrics (`RUN_CARDS`, attention/coverage panels) render only when `activeProject.seedTemplate === 'demo'`. Blank/user-created projects show a placeholder dashboard (zeroed summary cards + “Dashboard coming soon”).
8. **Demo template cloning** — “Add demo project” clones from an **immutable in-code template** (`demo-template.ts`), never from live store state. Keys are incremental: `DP1`, `DP2`, … (base seed remains `DP`). All cloned entity ids are remapped for full project isolation.
9. **Run case order** — `caseOrder[]` defines list order; executions map must align by case id.
10. **Run keys** — `runKey` assigned incrementally per project (`nextRunNumByProject`, starting at `00001`). Seeded R1–R6 → `00001`–`00006`.
11. **Sealed run** — when `DemoRun.sealed === true`, result/step/defect/comment mutations blocked in UI and `UPDATE_RUN_EXECUTION` reducer. Topbar Close/Re-open toggles seal state.
12. **Archived run** — when `archivedAt` set, run hidden from default picker list.
13. **Folder tree** — `parentId` nullable; descendant filtering via `folderDescendantIds()`.
14. **Status vocabulary** — case execution uses title-case (`Passed`, `Failed`, …); API uses lowercase enum (`pass`, `fail`, …) — mapping helpers in `demo-model.ts`.

### Schema migration (localStorage)

| Version | Shape | Migration |
|---------|-------|-----------|
| *(none / 1)* | `module: string`, flat folders/cases/runs | → v2 multi-project blob |
| **2** | Multi-project without required keys | → v3: seed renamed to Demo Project / `DP`; all projects get required `key`; optional `description`; legacy `DEMO` key migrated to `DP` |
| **3** | `Project { name, key, description?, seedTemplate? }`, key-based URLs | Current through early v4 work |
| **4** | `DemoRun.runKey`, `description?`, `archivedAt?`, `nextRunNumByProject`, URL `/testruns/tr/:runKey` | v3→v4 assigns run keys per project (seed R1–R6 → 00001–00006); initializes counters. |
| **5** | `DemoState.adminSettings: AdminSettings` | v4→v5 adds global admin panel state from `initialAdminSettings`; existing localStorage blobs without `adminSettings` receive seed on load. |
| **6** | `Project.activeCustomFieldIds`, optional `Project.projectSettings` | **Current.** v5→v6 adds `activeCustomFieldIds: []` to projects missing it. Fresh seed sets DP active fields to Priority, References, Is Automated. |

**Project store actions (prototype):** `UPDATE_PROJECT` (name/key/description), `UPDATE_ACTIVE_CUSTOM_FIELDS` (`projects/updateActiveCustomFields`), `UPDATE_PROJECT_SETTINGS` (`projects/updateSettings`).

On migration failure: `console.error` and fall back to `buildInitialDemoState()` (seeded **Demo Project** / `DP`).

### Prototype gaps vs target

| Target invariant | Prototype today |
|------------------|-----------------|
| Multi-project isolation | **Implemented** — client-side projects with per-project folders/cases/runs |
| Normalized ULIDs everywhere | Opaque demo ids |
| Human refs per project | Partially shown in seed copy only |
| Plan → run spawn via API | Navigation only |
| Run snapshots immutable | In-memory edits mutate same case objects |
| Requirements / traceability | Absent |

---

## When wiring demo → API

Preserve these mappings:

| Prototype | API / DB |
|-----------|----------|
| `DemoRun.id` | `test_runs.id` |
| Case id in `caseOrder` | `test_run_cases.id` (run case row, not source case) |
| `CaseExecution.status` | `test_run_cases.status` enum (normalize case) |
| `stepResults[stepId]` | `run_step_results` |
| `defects[]` strings | `run_defect_links.defect_ref` |
| `state.module` | `projects.id` / project switcher (real scoping) |
| `projectsById` / `activeProjectId` | `projects` table + session context |
| `Folder.projectId` | `folders.project_id` |
| `Case.projectId` | `test_cases.project_id` |
| `DemoRun.projectId` | `test_runs.project_id` |

Do not collapse demo `/runs` into `/runs/api` layout — wire data behind Shaun's UI per [`MVP_FRONTEND_ONLY_SCOPE.md`](MVP_FRONTEND_ONLY_SCOPE.md).
