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

State shape: `DemoState` in `demo-model.ts`, persisted via `FreshProvider` (`relay-demo-v2`).

| Entity | Prototype type | Notes |
|--------|----------------|-------|
| **Project** | `state.module: string` | Label only (e.g. `"CTMS"`). Not a structured entity; switcher sets string from seed `MODULES`. |
| **Folder** | `Folder { id, name, parentId? }` | No project_id — single implicit workspace per browser session. |
| **TestCase** | `Case { id, title, folderId, priority, type, steps[], tags[], assignee, … }` | Steps embed comments. |
| **TestPlan** | Static `PLANS` in seed | Not in `DemoState`; not linked to cases in state. |
| **TestRun** | `DemoRun { id, name, planId, sealed, caseOrder[], executions }` | `executions` keyed by case id. |
| **Execution** | `CaseExecution { status, stepResults, defects[], assignee }` | Full step-level in demo `/runs`. |
| **Defect** | String IDs on execution + `MOCK_DEFECTS` screen | Not a first-class entity in state. |

### Prototype invariants (enforced in UI code)

1. **Single workspace session** — one `module` string + one folder/case/run graph per localStorage blob.
2. **Run case order** — `caseOrder[]` defines list order; executions map must align by case id.
3. **Sealed run** — when `DemoRun.sealed === true`, result/step/defect mutations are blocked (`isRunSealed` in `RunsScreen`).
4. **Folder tree** — `parentId` nullable; descendant filtering via `folderDescendantIds()`.
5. **Status vocabulary** — case execution uses title-case (`Passed`, `Failed`, …); API uses lowercase enum (`pass`, `fail`, …) — mapping helpers in `demo-model.ts`.

### Prototype gaps vs target

| Target invariant | Prototype today |
|------------------|-----------------|
| Multi-project isolation | One implicit project per browser; module string is cosmetic |
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

Do not collapse demo `/runs` into `/runs/api` layout — wire data behind Shaun's UI per [`MVP_FRONTEND_ONLY_SCOPE.md`](MVP_FRONTEND_ONLY_SCOPE.md).
