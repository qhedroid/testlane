# Testlane — Architecture Consolidation Baseline
**Version 1.0 · May 2026 · Implementation Planning**

This document is the canonical architecture baseline for Testlane v1. It supersedes all prior partial specs, notes, and prototype assumptions. All implementation work should treat this as the single source of truth for scope, infrastructure, schema, and service design.

---

## 1. Document Reconciliation Summary

All five source files were read in full:

| File | Status |
|---|---|
| `README.md` | Aligned. Stack confirmed. "14 tables" reference is an undercount — see schema section. |
| `changelog.md` | Aligned. v1.2 correctly removed PostgreSQL and Meilisearch references. All docs now consistent. |
| `ux-philosophy.md` | Aligned with one discrepancy (see below). Retained in full. |
| `design-system.md` | Aligned. All tokens and component patterns confirmed. |
| `Testlane_Prototype_v1_2.html` | Primary source of truth for UX behaviour. One discrepancy with ux-philosophy.md confirmed and resolved. |

### Discrepancies Resolved

**Test Cases detail panel tab count.** `ux-philosophy.md` states the detail panel has six tabs (Details / Steps / Activity / History / Comments / Defects) to match the execution panel. The prototype's Test Cases detail panel only shows three tabs (Details / History / Activity). The prototype was a simplified demo — the philosophy doc is correct. **Resolution: implement the full six-tab pattern in the Test Cases detail panel.** Comments and Defects in the cases panel are case-scoped (not run-scoped), showing historical links and comments from all runs.

**"14 tables" in README.** The actual schema requires more. The README figure was aspirational, not audited. The schema below is the definitive count.

**"Quick Create" note in prototype.** The prototype comment says it creates a case "locally in session." This is prototype-only behaviour. In production, Quick Create submits immediately to the API and reflects in the audit log.

**Defects sidebar item.** Appears in the sidebar at reduced opacity. This is not a fully scoped MVP feature. **Resolution: sidebar item exists for wayfinding continuity, but the Defects view is deferred to Phase 2.** Defect *linking* within run execution is in scope at MVP (the D shortcut and Link defect button in the exec detail panel).

**"Stalled" run status.** Present in the prototype as a run state. Not explicitly defined. **Resolution: stalled is a manually-togglable flag applied by an Admin or Super Admin. Auto-detection based on inactivity is Phase 2.**

**Project vs Module terminology.** The project switcher uses "project," the sidebar uses "Pinned Modules," suite trees use module-like names. **Resolution: "project" is the canonical data model and API term. The UI may use "module" contextually (suite tree labels, pinned shortcuts) but entity names in code are always `project`.**

---

## 2. Final MVP Scope

Testlane v1 MVP covers exactly the following. Nothing else.

### In Scope

| Area | What it includes |
|---|---|
| **Projects** | First-class workspace scoping entity. CRUD, member management, project switcher. |
| **Test Cases** | Folders/suites (tree), case CRUD, steps, preconditions, tags, priority, type, assignment, bulk actions (archive, move, clone, add to run, assign). Six-tab detail panel. Quick Create. |
| **Test Plans** | Plan CRUD, case selection (individual cases), environment, assignees, spawning runs. Four-tab detail (Overview / Test Cases / Runs / Metrics). Draft and Active states. |
| **Test Runs** | Create from plan (snapshot), run selector dropdown, case list with filters and priority ordering, execution detail panel (six tabs), step-level result recording, case-level result recording, defect linking, comments within execution, run sealing (Admin and above), Super Admin reopen. |
| **Dashboard** | Five metric cards, active run cards (donut chart, expand/collapse, three tabs), Needs Attention widget (unlinked failures), module coverage row. |
| **Global Search** | Cmd K palette, fan-out across cases/runs/plans via OpenSearch, grouped results with highlighted matches, recent views (from MySQL, shown on palette open). |
| **Audit Log** | Append-only, automatic, all mutations across all entities. View in sidebar. Filterable by entity type, actor, date range. |
| **RBAC** | Four platform capability roles (Super Admin / Admin / Contributor / Viewer). Job titles are profile metadata only. Project-level role overrides, enforced at API and service layers. |
| **Auth** | In-house credentials-based session auth via NextAuth.js with MySQL session store. |

### Explicitly Out of Scope at MVP

- Reports / analytics (Phase 2)
- CI/CD integration and automation triggers (Phase 2)
- Integrations sidebar item — functional (Phase 2)
- Defects view (dedicated) (Phase 2)
- S3 file attachments (Phase 2)
- Email notifications via SES (Phase 2)
- Bulk import from CSV/TestRail/Testiny (Phase 2)
- Pinned Modules persistence across sessions (Phase 2 — static in prototype)
- Stalled run auto-detection (Phase 2 — manual flag at MVP)
- AI-assisted workflows (Future)

---

## 3. Final Infrastructure Direction

All of the below is confirmed and non-negotiable unless flagged as an open decision.

| Layer | Confirmed Decision |
|---|---|
| Cloud | AWS — mandatory, non-negotiable |
| Compute | ECS Fargate — recommended over App Runner (see ADR-002 below) |
| Database | Aurora MySQL 3.x — recommended over RDS MySQL 8.0 (see ADR-001 below) |
| ORM | Drizzle ORM, MySQL dialect |
| Search | AWS OpenSearch Service |
| CDN / Edge | CloudFront in front of the application |
| Container registry | Amazon ECR |
| Object storage | AWS S3 — Phase 2 |
| Email | AWS SES — Phase 2 |
| Secrets | AWS Secrets Manager |
| Load balancer | Application Load Balancer (ALB) |
| VPC | Private subnets for RDS and OpenSearch; public subnet for ALB only |

### ADR-001 — Aurora MySQL 3.x vs RDS MySQL 8.0

**Decision: Aurora MySQL 3.x (MySQL-compatible).**

Aurora is wire-compatible with MySQL 8.0, so Drizzle and all application code remain unchanged. Aurora delivers approximately 20% better read throughput, sub-30-second failover vs 60-120 seconds on Multi-AZ RDS, and Aurora Serverless v2 as an option for dev/staging environments to reduce idle cost. The storage cost premium (~20%) is justified for a production QA platform where availability and failover speed matter. Aurora Serverless v2 should be evaluated for non-production environments to control cost.

**If internal DevOps has a strong existing preference for RDS MySQL 8.0 Multi-AZ, that is acceptable. The schema and application code are identical either way.**

### ADR-002 — ECS Fargate vs App Runner

**Decision: ECS Fargate.**

Both can host Next.js containers. ECS Fargate gives full VPC integration with Aurora MySQL and OpenSearch in private subnets without requiring App Runner VPC connectors. ECS also supports future service mesh readiness, sidecar containers, and granular IAM task roles. App Runner is simpler to operate but introduces VPC connector overhead and provides less control as the platform grows. ECS Fargate with an ALB is the better long-term foundation for an enterprise internal platform.

### ADR-003 — OpenSearch Sync Strategy

**Decision: synchronous write-through in the service layer at MVP.**

Every mutation that affects a searchable entity (test case, test run, test plan) calls the OpenSearch client synchronously after the MySQL write commits. This keeps implementation simple and acceptable for an internal tool with predictable write volumes. If write latency becomes a concern in Phase 2, migrate to an asynchronous SQS + Lambda fan-out pattern using MySQL binlog or application-level events.

---

## 4. Final UX and System Philosophy

The following is the canonical UX philosophy. It is preserved in full from `ux-philosophy.md` with the following amendments:

- Test Cases detail panel has **six tabs** (Details / Steps / Activity / History / Comments / Defects)
- Quick Create submits to the API immediately (not in-session only)
- "Defects" sidebar item is present but non-functional at MVP
- Stalled status is manually toggled, not computed

### Core Interaction Principles (confirmed)

- **Persistent context.** Split-pane layouts. List always visible. Back navigation rarely needed.
- **Inline creation over modal.** Quick Create, inline comments, inline defect linking. Modals only for destructive confirmations.
- **Keyboard-first execution.** P/F/B/S result keys. J/K case navigation. D defect link. ? shortcuts modal. All available from any state in Test Runs.
- **Collapsed state communicates.** Sidebar collapses to 48px icon-only. Run cards collapsed still show pass rate, progress bar, status.
- **Audit by default.** No opt-in. Every mutation is logged.
- **Execution ordering.** Cases in runs ordered by severity first (CRIT → HIGH → MED → LOW), then by status (Fail → Blocked → Not run → Pass). Surfaces highest-priority work at top.

### What Testlane Is Not

- Not a project management tool
- Not a defect lifecycle tracker
- Not a reporting platform
- Not a CI/CD dashboard
- Not designed for non-QA users

---

## 5. Implementation Risks and Unresolved Decisions

The following require a decision or carry delivery risk.

### Risk 1 — Execution Snapshot Transaction Size
When a run is spawned from a plan, the system must atomically snapshot all included cases and their steps into `run_case_snapshots` + `run_case_step_snapshots`, then pre-populate `run_results` rows for every case (status: not_run). For a large plan (100+ cases, 5+ steps each), this is a significant write transaction.

**Mitigation:** Wrap in a single MySQL transaction. For MVP, acceptable. For Phase 2 with very large plans (500+ cases), consider a queued background job that sets the run to a "preparing" state and confirms when ready.

### Risk 2 — Case Result vs Step Result Aggregation
The exec detail panel shows both step-level result buttons and a case-level result button at the footer. The prototype treats these as independent. In production: step results are informational; the case-level result is the canonical status. **A QA engineer sets the overall case result manually regardless of individual step outcomes.** Step results are stored for audit and detail, not auto-aggregated into the case result.

This must be documented clearly in the UI — engineers should not expect the case result to auto-update when steps are marked.

### Risk 3 — Auth Architecture Not Yet Implemented
Auth is described as "in-house" and deferred. **Resolution: use NextAuth.js with the Credentials provider and a database session adapter backed by MySQL.** This gives session management, CSRF protection, and cookie handling without building from scratch. Custom JWT sessions (httpOnly cookie, 8h access, 30-day refresh) are an acceptable alternative if NextAuth adds too much overhead.

This must be the first implementation task before any protected routes are built.

### Risk 4 — Test Plan Case Ordering
The plan's Test Cases tab shows cases grouped by suite. When a run is spawned, the case ordering in the snapshot (and in the exec case list) must be deterministic. **Decision needed: is case order within a plan user-configurable (drag to reorder) or fixed (by suite then by case ID)?** For MVP, recommend: ordered by suite, then by case creation order within the suite. User reordering is Phase 2.

### Risk 5 — Recent Views Table Cleanup
The `recent_views` table must not grow unbounded. Each user should retain at most 10-15 recent items. This can be enforced by the application on every insert (delete oldest if count exceeds limit) rather than a scheduled job. Flag as a required implementation detail, not just a nice-to-have.

### Risk 6 — Dashboard Metric Queries
The dashboard aggregates data across all active runs for a given project. These are MySQL aggregate queries running on each page load. For MVP with low concurrent users this is fine. Add MySQL query result caching (application-level, 30s TTL) if dashboard load time becomes noticeable. Do not pre-materialise metrics at MVP.

### Risk 7 — "Defects" Sidebar — Scope Creep Risk
The sidebar shows a Defects item. Even in non-functional state, stakeholders may expect it to work. **Resolution: make it clearly non-functional (no hover, greyed out, no Soon badge — just clearly absent) OR remove it from the sidebar entirely and add it back in Phase 2.** The choice depends on how the prototype is being communicated to stakeholders.

---

## 6. MySQL Schema — Domains and Entities

### Entity Reference Format

All entity IDs use `UNSIGNED BIGINT AUTO_INCREMENT`. Human-readable reference codes (`TC-1001`, `RUN-001`, `PLAN-001`) are stored as generated or prefixed strings, not the primary key. The `case_ref`, `run_ref`, `plan_ref` columns are unique per project and are the display-facing identifiers.

All tables include `created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP` and `updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP` unless noted otherwise (audit_log is append-only and has no updated_at).

---

### Domain: Users and Auth

**`users`**
```
id                  BIGINT UNSIGNED PK
email               VARCHAR(255) UNIQUE NOT NULL
name                VARCHAR(255) NOT NULL
global_role         ENUM('super_admin','admin','contributor','viewer') NOT NULL
password_hash       VARCHAR(255) NOT NULL
is_active           BOOLEAN NOT NULL DEFAULT TRUE
last_login_at       DATETIME
created_at          DATETIME
updated_at          DATETIME
```

**`sessions`** (NextAuth database adapter or custom)
```
id                  VARCHAR(255) PK        — session token
user_id             BIGINT UNSIGNED FK → users
expires_at          DATETIME NOT NULL
created_at          DATETIME
```

---

### Domain: Projects

**`projects`**
```
id                  BIGINT UNSIGNED PK
slug                VARCHAR(100) UNIQUE NOT NULL   — URL-safe name (e.g. ctms, etmf)
name                VARCHAR(255) NOT NULL
description         TEXT
created_by          BIGINT UNSIGNED FK → users
is_archived         BOOLEAN NOT NULL DEFAULT FALSE
created_at          DATETIME
updated_at          DATETIME
```

**`project_members`**
```
id                  BIGINT UNSIGNED PK
project_id          BIGINT UNSIGNED FK → projects
user_id             BIGINT UNSIGNED FK → users
project_role        ENUM('admin','contributor','viewer') NOT NULL
added_by            BIGINT UNSIGNED FK → users
added_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
UNIQUE (project_id, user_id)
```
Effective role = MAX(global_role, project_role) in the role hierarchy.

---

### Domain: Test Cases

**`suites`** (folder tree within a project)
```
id                  BIGINT UNSIGNED PK
project_id          BIGINT UNSIGNED FK → projects
parent_id           BIGINT UNSIGNED FK → suites (NULL = root)
name                VARCHAR(255) NOT NULL
description         TEXT
position            SMALLINT UNSIGNED NOT NULL DEFAULT 0
created_at          DATETIME
updated_at          DATETIME
```

**`test_cases`**
```
id                  BIGINT UNSIGNED PK
case_ref            VARCHAR(20) NOT NULL            — TC-1001 (unique per project)
suite_id            BIGINT UNSIGNED FK → suites
project_id          BIGINT UNSIGNED FK → projects
title               VARCHAR(500) NOT NULL
priority            ENUM('critical','high','medium','low') NOT NULL DEFAULT 'medium'
type                ENUM('functional','smoke','regression','integration','security') NOT NULL DEFAULT 'functional'
preconditions       TEXT
description         TEXT
automation_status   ENUM('manual','automated','semi_automated') NOT NULL DEFAULT 'manual'
assigned_to         BIGINT UNSIGNED FK → users (NULL)
created_by          BIGINT UNSIGNED FK → users
is_archived         BOOLEAN NOT NULL DEFAULT FALSE
position            INT UNSIGNED NOT NULL DEFAULT 0  — ordering within suite
created_at          DATETIME
updated_at          DATETIME
UNIQUE (project_id, case_ref)
INDEX (project_id, suite_id)
INDEX (project_id, is_archived)
```

**`test_case_steps`**
```
id                  BIGINT UNSIGNED PK
test_case_id        BIGINT UNSIGNED FK → test_cases ON DELETE CASCADE
position            TINYINT UNSIGNED NOT NULL
action              TEXT NOT NULL
expected_result     TEXT
created_at          DATETIME
updated_at          DATETIME
INDEX (test_case_id)
```

**`test_case_tags`**
```
id                  BIGINT UNSIGNED PK
test_case_id        BIGINT UNSIGNED FK → test_cases ON DELETE CASCADE
tag                 VARCHAR(100) NOT NULL
INDEX (test_case_id)
INDEX (tag)
```

---

### Domain: Test Plans

**`test_plans`**
```
id                  BIGINT UNSIGNED PK
plan_ref            VARCHAR(20) NOT NULL             — PLAN-001 (unique per project)
project_id          BIGINT UNSIGNED FK → projects
title               VARCHAR(500) NOT NULL
description         TEXT
status              ENUM('draft','active','archived') NOT NULL DEFAULT 'draft'
environment         VARCHAR(100)
owner_id            BIGINT UNSIGNED FK → users
created_by          BIGINT UNSIGNED FK → users
created_at          DATETIME
updated_at          DATETIME
UNIQUE (project_id, plan_ref)
INDEX (project_id, status)
```

**`test_plan_cases`**
```
id                  BIGINT UNSIGNED PK
test_plan_id        BIGINT UNSIGNED FK → test_plans ON DELETE CASCADE
test_case_id        BIGINT UNSIGNED FK → test_cases
position            INT UNSIGNED NOT NULL DEFAULT 0
added_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
UNIQUE (test_plan_id, test_case_id)
INDEX (test_plan_id)
```

**`test_plan_assignees`**
```
id                  BIGINT UNSIGNED PK
test_plan_id        BIGINT UNSIGNED FK → test_plans ON DELETE CASCADE
user_id             BIGINT UNSIGNED FK → users
assigned_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
UNIQUE (test_plan_id, user_id)
```

---

### Domain: Test Runs

**`test_runs`**
```
id                  BIGINT UNSIGNED PK
run_ref             VARCHAR(20) NOT NULL             — RUN-001 (unique per project)
project_id          BIGINT UNSIGNED FK → projects
test_plan_id        BIGINT UNSIGNED FK → test_plans (NULL if created ad-hoc, Phase 2)
title               VARCHAR(500) NOT NULL
status              ENUM('active','stalled','sealed','archived') NOT NULL DEFAULT 'active'
environment         VARCHAR(100)
due_date            DATE
is_stalled          BOOLEAN NOT NULL DEFAULT FALSE   — manually toggled
sealed_at           DATETIME
sealed_by           BIGINT UNSIGNED FK → users
created_by          BIGINT UNSIGNED FK → users
created_at          DATETIME
updated_at          DATETIME
UNIQUE (project_id, run_ref)
INDEX (project_id, status)
```

**`run_case_snapshots`** — immutable snapshot of each case at run creation time
```
id                  BIGINT UNSIGNED PK
test_run_id         BIGINT UNSIGNED FK → test_runs ON DELETE CASCADE
test_case_id        BIGINT UNSIGNED FK → test_cases   — link back to source
snapshot_case_ref   VARCHAR(20) NOT NULL
snapshot_title      VARCHAR(500) NOT NULL
snapshot_preconditions  TEXT
snapshot_priority   ENUM('critical','high','medium','low') NOT NULL
snapshot_type       ENUM('functional','smoke','regression','integration','security') NOT NULL
snapshot_suite_name VARCHAR(255)
assigned_to         BIGINT UNSIGNED FK → users (NULL)
position            INT UNSIGNED NOT NULL DEFAULT 0   — ordering within run
created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
INDEX (test_run_id)
INDEX (test_run_id, snapshot_priority, position)
```
Once created, rows in this table are never updated. The run preserves the case as it was at spawn time.

**`run_case_step_snapshots`** — immutable snapshot of steps at run creation time
```
id                  BIGINT UNSIGNED PK
snapshot_id         BIGINT UNSIGNED FK → run_case_snapshots ON DELETE CASCADE
position            TINYINT UNSIGNED NOT NULL
action              TEXT NOT NULL
expected_result     TEXT
INDEX (snapshot_id)
```

**`run_results`** — mutable execution result per case (pre-populated at run creation as 'not_run')
```
id                  BIGINT UNSIGNED PK
snapshot_id         BIGINT UNSIGNED FK → run_case_snapshots ON DELETE CASCADE UNIQUE
test_run_id         BIGINT UNSIGNED FK → test_runs
status              ENUM('not_run','pass','fail','blocked','skip') NOT NULL DEFAULT 'not_run'
comment             TEXT
executed_by         BIGINT UNSIGNED FK → users (NULL while not_run)
executed_at         DATETIME
updated_at          DATETIME
INDEX (test_run_id, status)
```

**`run_step_results`** — individual step result within an execution (created on first update)
```
id                  BIGINT UNSIGNED PK
run_result_id       BIGINT UNSIGNED FK → run_results ON DELETE CASCADE
step_snapshot_id    BIGINT UNSIGNED FK → run_case_step_snapshots
status              ENUM('not_run','pass','fail','blocked','skip') NOT NULL DEFAULT 'not_run'
comment             TEXT
updated_at          DATETIME
UNIQUE (run_result_id, step_snapshot_id)
```

**`run_assignees`**
```
id                  BIGINT UNSIGNED PK
test_run_id         BIGINT UNSIGNED FK → test_runs ON DELETE CASCADE
user_id             BIGINT UNSIGNED FK → users
assigned_at         DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
UNIQUE (test_run_id, user_id)
```

**`run_defect_links`** — defect IDs linked to a specific case execution
```
id                  BIGINT UNSIGNED PK
run_result_id       BIGINT UNSIGNED FK → run_results ON DELETE CASCADE
defect_ref          VARCHAR(50) NOT NULL             — e.g. TI-4419 (external ref)
linked_by           BIGINT UNSIGNED FK → users
linked_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
INDEX (run_result_id)
```

**`run_execution_comments`** — comments on a specific case within a specific run
```
id                  BIGINT UNSIGNED PK
run_result_id       BIGINT UNSIGNED FK → run_results ON DELETE CASCADE
user_id             BIGINT UNSIGNED FK → users
content             TEXT NOT NULL
created_at          DATETIME
updated_at          DATETIME
INDEX (run_result_id)
```

---

### Domain: Audit and Search

**`audit_log`** — append-only. No updates. No deletes. Ever.
```
id                  BIGINT UNSIGNED PK
entity_type         ENUM('project','test_case','test_plan','test_run','run_result','user') NOT NULL
entity_id           BIGINT UNSIGNED NOT NULL
project_id          BIGINT UNSIGNED FK → projects (NULL for system-level events)
action              VARCHAR(100) NOT NULL             — e.g. case.created, result.updated, run.sealed
actor_id            BIGINT UNSIGNED FK → users
old_value           JSON
new_value           JSON
metadata            JSON                              — additional context (e.g. run name, case ref)
created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
INDEX (entity_type, entity_id)
INDEX (project_id, created_at)
INDEX (actor_id, created_at)
```

**`recent_views`** — recent palette items per user (max 15 per user, enforced by application)
```
id                  BIGINT UNSIGNED PK
user_id             BIGINT UNSIGNED FK → users ON DELETE CASCADE
entity_type         ENUM('test_case','test_run','test_plan') NOT NULL
entity_id           BIGINT UNSIGNED NOT NULL
project_id          BIGINT UNSIGNED FK → projects
display_title       VARCHAR(500) NOT NULL             — denormalised title for display
viewed_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
INDEX (user_id, viewed_at)
UNIQUE (user_id, entity_type, entity_id)              — upsert on re-view, update viewed_at
```
On insert: if user has >= 15 rows, delete the oldest before inserting.

---

### Schema Summary

| Domain | Tables |
|---|---|
| Users & Auth | users, sessions |
| Projects | projects, project_members |
| Test Cases | suites, test_cases, test_case_steps, test_case_tags |
| Test Plans | test_plans, test_plan_cases, test_plan_assignees |
| Test Runs | test_runs, run_case_snapshots, run_case_step_snapshots, run_results, run_step_results, run_assignees, run_defect_links, run_execution_comments |
| Audit & Search | audit_log, recent_views |
| **Total** | **20 tables** |

---

## 7. OpenSearch Indexing Strategy

Three indexes. Fan-out on every Cmd K query using `_msearch`.

### Index: `relay_test_cases`

**Purpose:** Full-text search across case titles, preconditions, and steps. Used in Cmd K results (grouped as "Test cases") and optionally in future scoped search within the Test Cases view.

**Indexed document shape:**
```json
{
  "id": 1001,
  "case_ref": "TC-1001",
  "title": "Create CTMS study with sponsor and CRO teams",
  "preconditions": "Study template is approved. Sponsor and CRO users exist.",
  "steps_text": "Navigate to Studies | Click Create | Fill study name",
  "tags": ["ctms", "role-mapping", "regression"],
  "priority": "critical",
  "type": "functional",
  "suite_name": "CTMS — Record creation & editing",
  "project_id": 1,
  "project_name": "TI-Core Platform",
  "assigned_to_name": "Aisha Rahman",
  "is_archived": false,
  "updated_at": "2026-05-18T09:14:00Z"
}
```

**Search fields and boosts:**
- `title` — boost 3.0 (primary signal)
- `case_ref` — boost 2.0 (exact ref lookup)
- `tags` — boost 1.5
- `preconditions` — boost 1.0
- `steps_text` — boost 0.8

**Filter always applied:** `is_archived: false`, scoped to `project_id` when search is project-scoped.

---

### Index: `relay_test_runs`

**Purpose:** Search across run names and environments. Shows in Cmd K as "Test runs."

**Indexed document shape:**
```json
{
  "id": 1,
  "run_ref": "RUN-001",
  "title": "CTMS Regression — Sprint 44",
  "status": "active",
  "environment": "UAT",
  "project_id": 1,
  "project_name": "TI-Core Platform",
  "plan_title": "CTMS Module — Full Regression",
  "due_date": "2026-05-12",
  "created_by_name": "Aisha Rahman",
  "updated_at": "2026-05-18T14:32:00Z"
}
```

**Search fields and boosts:**
- `title` — boost 3.0
- `run_ref` — boost 2.0
- `plan_title` — boost 1.0
- `environment` — boost 0.5

**Filter always applied:** `status != 'archived'`, scoped to project when appropriate.

---

### Index: `relay_test_plans`

**Purpose:** Search across plan titles and descriptions. Shows in Cmd K as "Test plans."

**Indexed document shape:**
```json
{
  "id": 1,
  "plan_ref": "PLAN-001",
  "title": "CTMS Module — Full Regression",
  "description": "Full functional regression coverage for the CTMS module.",
  "status": "active",
  "environment": "UAT",
  "project_id": 1,
  "project_name": "TI-Core Platform",
  "owner_name": "Aisha Rahman",
  "created_by_name": "Shaun Sevume",
  "is_archived": false,
  "updated_at": "2026-05-01T10:00:00Z"
}
```

**Search fields and boosts:**
- `title` — boost 3.0
- `plan_ref` — boost 2.0
- `description` — boost 1.0
- `owner_name` — boost 0.5

**Filter always applied:** `is_archived: false`.

---

### Analyser Configuration

All three indexes use the same custom analyser:

```json
{
  "analysis": {
    "analyzer": {
      "relay_standard": {
        "type": "custom",
        "tokenizer": "standard",
        "filter": ["lowercase", "asciifolding", "relay_stop"]
      },
      "relay_search": {
        "type": "custom",
        "tokenizer": "standard",
        "filter": ["lowercase", "asciifolding"]
      }
    },
    "filter": {
      "relay_stop": {
        "type": "stop",
        "stopwords": "_english_"
      }
    }
  }
}
```

Use `relay_standard` at index time, `relay_search` at query time (no stop word removal during search).

### Sync Strategy

- **Write-through, synchronous** at service layer. After every successful MySQL commit affecting a case, run, or plan: call the appropriate OpenSearch index client.
- **Document shape is denormalised.** The sync function reads the freshly-committed MySQL row (with necessary joins) and upserts into OpenSearch by ID.
- **Deletes/archives:** upsert with `is_archived: true` rather than deleting the document. All queries filter by `is_archived: false`.
- **Failure handling:** if OpenSearch write fails, log the error and retry once. If both attempts fail, write a `search_sync_failed` event to audit_log for manual remediation. Do not fail the primary MySQL write for an OpenSearch sync failure.

---

## 8. RBAC Structure

Testlane uses **platform-level capability roles only**. Business or job titles (e.g. QA Lead, QA Manager, Automation Engineer) must not appear as RBAC enums. Those belong in user profile metadata, organisational hierarchy, or team structures.

### Approved System Roles

| Role | Description |
|---|---|
| `super_admin` | Internal platform-level authority. Cross-project/platform management, user provisioning, global settings and access. |
| `admin` | Project-level management. Manage suites, folders, plans, runs, assignments. Seal and reopen runs. Manage project-level workflows. |
| `contributor` | Operational participation. Execute tests, update statuses and results, add comments, link defects. |
| `viewer` | Read-only visibility. Audit and review access. Temporary or stakeholder access. |

### Invalid as RBAC Enums (Profile / Org Metadata Only)

`qa_lead`, `qa_manager`, `automation_engineer`, `validation_specialist`, `tester`, and similar job titles.

### Project-Level Role Override

A user can have a different (higher or equal) role within a specific project via `project_roles.role`. The effective role is always the higher of `users.global_role` and `project_roles.role` for that project, evaluated against the hierarchy: `super_admin > admin > contributor > viewer`.

Example: a user with `global_role = viewer` but `project_role = contributor` in the CTMS project can execute runs in CTMS but only view everything else.

### Permission Matrix (Key Actions)

| Action | super_admin | admin | contributor | viewer |
|---|---|---|---|---|
| Create project | ✓ | ✓ | — | — |
| Manage users / global settings | ✓ | — | — | — |
| Create / edit test cases | ✓ | ✓ | ✓ | — |
| Archive test cases | ✓ | ✓ | — | — |
| Create / edit test plans | ✓ | ✓ | — | — |
| Spawn runs from plans | ✓ | ✓ | — | — |
| Execute runs (mark results) | ✓ | ✓ | ✓ | — |
| Link defects | ✓ | ✓ | ✓ | — |
| Add execution comments | ✓ | ✓ | ✓ | — |
| Seal runs | ✓ | ✓ | — | — |
| Reopen sealed runs | ✓ | ✓ | — | — |
| View audit log | ✓ | ✓ | ✓ | ✓ |

### Enforcement Pattern

1. **Middleware layer:** Every API route resolves the current user session and checks global role + project membership before the handler executes. 401 if unauthenticated. 403 if role insufficient.
2. **Service layer:** Services perform a secondary role check before executing mutations. This is a defence-in-depth check, not the primary gate.
3. **Run sealing enforcement:** `TestRunService.seal()` checks role before any operation. Sealed runs reject all result mutations at the service layer — not just the UI.

---

## 9. Service Boundaries

All services are implemented within the Next.js application at MVP. They are not microservices. They are purpose-separated classes/modules within `src/lib/services/` that share a single Drizzle database client. The boundaries are designed so that each service can be extracted into a standalone service in Phase 2 without rewriting the domain logic.

| Service | Responsibility |
|---|---|
| `ProjectService` | Project CRUD, member management, project-level config |
| `TestCaseService` | Case CRUD, suite tree, steps, tags, bulk operations (archive, clone, move, assign) |
| `TestPlanService` | Plan CRUD, case inclusion management, assignee management, plan status transitions |
| `TestRunService` | Run creation (plan → snapshot transaction), run metadata, run status, sealing, reopening |
| `ExecutionService` | Case result recording, step result recording, defect linking, execution comments. Operates only on run_results and related tables. |
| `SearchService` | OpenSearch fan-out (_msearch), recent views (MySQL read/write) |
| `AuditService` | Append-only event logging. Called by all mutating services. Never called directly by API routes. |
| `DashboardService` | Aggregated metrics: active run counts, pass rates, failure counts, coverage. Pure MySQL aggregations. |
| `UserService` | User CRUD, role management, session helpers |

### Cross-Cutting Rules

- `AuditService` is always called by the service layer, never by routes. No mutation is exempt.
- `SearchService.sync()` is called by `TestCaseService`, `TestRunService`, and `TestPlanService` after every successful write. Never called by `ExecutionService` (run results are not indexed).
- Services do not call each other directly where it can be avoided. `TestRunService.create()` is the exception — it orchestrates `TestCaseService` reads (to snapshot case data) and `AuditService` writes within a single transaction.
- Database client is shared via dependency injection (or singleton module). No per-service connection pools at MVP.

### Phase 2 Service Extraction Boundaries

When the platform grows, these services are candidates for extraction:
- `SearchService` → standalone search microservice (OpenSearch client + sync queue consumer)
- `AuditService` → event stream consumer (SQS → Lambda → MySQL writer)
- `ExecutionService` → real-time execution service (WebSocket support for multi-user execution visibility)

---

## 10. Recommended Implementation Order

### Phase 1 — Foundation (do not skip or reorder)

1. **Repository and tooling setup.** Next.js 15 (App Router), TypeScript strict, Drizzle ORM, ESLint, Prettier. CI pipeline skeleton. Docker + Dockerfile.
2. **Drizzle schema definition.** All 20 tables. Migrations generated and tested against a local MySQL instance.
3. **Auth layer.** NextAuth.js with Credentials provider, MySQL session adapter. Login/logout, session middleware, user context.
4. **RBAC middleware.** Route-level role enforcement. Project membership resolution. Permission helper functions.
5. **User and Project API + basic UI.** Enough to create users, assign roles, create projects, and switch between them via the project switcher.

### Phase 2 — Core Entities

6. **Test Cases.** Suite tree (with resizable handle), case table, Quick Create, detail panel (six tabs), full CRUD, bulk actions. OpenSearch sync on write. Audit events.
7. **Test Plans.** Plan list, plan detail (four tabs), case selection UI, assignees, spawn run button. Audit events.
8. **Test Runs.** Run creation from plan (snapshot transaction), run selector dropdown, exec case pane (with filters and priority ordering), exec detail panel (six tabs), result recording (case + step), defect linking, execution comments, run sealing. Autosave indicator. Audit events.
9. **Dashboard.** Metric cards, run cards (donut, expand/collapse, three tabs), Needs Attention widget, module coverage row. DashboardService aggregations.

### Phase 3 — Cross-Cutting

10. **OpenSearch setup.** AWS OpenSearch cluster provisioning. Index creation with analyser config. Sync validation.
11. **Global Search.** Cmd K palette. Fan-out _msearch. Result grouping. Highlight rendering. Recent views.
12. **Audit Log view.** Sidebar navigation to append-only audit log. Filtering by entity type, actor, date range.

### Phase 4 — Infrastructure and Hardening

13. **ECS Fargate deployment.** Dockerfile, ECR push, task definition, ALB, service auto-scaling.
14. **Aurora MySQL provisioning.** VPC private subnet, parameter group, connection pooling config.
15. **Secrets Manager integration.** DB credentials, OpenSearch credentials, session secret.
16. **CloudFront distribution.** In front of ALB.
17. **Load and performance testing.** Dashboard query times, snapshot transaction size, OpenSearch query latency.

### Phase 5 — Phase 2 Features (post-MVP)

18. Reports / analytics
19. S3 attachments
20. SES notifications
21. CI/CD integrations
22. Bulk case import
23. Auto-detection of stalled runs
24. Defects view (aggregated across runs)

---

## 11. Repository Structure

```
relay/
├── README.md
├── package.json
├── tsconfig.json
├── .env.example
├── .eslintrc.json
├── drizzle.config.ts
├── next.config.ts
├── Dockerfile
│
├── docs/
│   ├── relay-architecture-baseline.md    ← this document
│   ├── design-system.md
│   ├── ux-philosophy.md
│   ├── changelog.md
│   └── decisions/
│       ├── ADR-001-aurora-vs-rds.md
│       ├── ADR-002-ecs-vs-apprunner.md
│       └── ADR-003-opensearch-sync-strategy.md
│
├── mockup/
│   └── Testlane_Prototype_v1_2.html         ← reference only, not deployed
│
├── migrations/                           ← Drizzle migration files
│   └── 0001_initial_schema.sql
│
├── src/
│   ├── app/                              ← Next.js App Router
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   │   └── page.tsx
│   │   │   └── layout.tsx
│   │   │
│   │   ├── (workspace)/                  ← authenticated shell
│   │   │   ├── layout.tsx                ← sidebar + topbar
│   │   │   ├── page.tsx                  ← redirect → dashboard
│   │   │   ├── dashboard/
│   │   │   │   └── page.tsx
│   │   │   ├── cases/
│   │   │   │   └── page.tsx
│   │   │   ├── plans/
│   │   │   │   └── page.tsx
│   │   │   ├── runs/
│   │   │   │   └── page.tsx
│   │   │   ├── audit/
│   │   │   │   └── page.tsx
│   │   │   └── settings/
│   │   │       └── page.tsx
│   │   │
│   │   └── api/
│   │       ├── auth/
│   │       │   └── [...nextauth]/route.ts
│   │       ├── projects/
│   │       │   ├── route.ts              ← GET (list), POST (create)
│   │       │   └── [id]/
│   │       │       ├── route.ts          ← GET, PATCH, DELETE
│   │       │       └── members/route.ts
│   │       ├── cases/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       ├── steps/route.ts
│   │       │       └── tags/route.ts
│   │       ├── suites/
│   │       │   └── route.ts
│   │       ├── plans/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       ├── cases/route.ts
│   │       │       ├── assignees/route.ts
│   │       │       └── spawn/route.ts    ← POST: spawn a run from this plan
│   │       ├── runs/
│   │       │   ├── route.ts
│   │       │   └── [id]/
│   │       │       ├── route.ts
│   │       │       ├── results/route.ts
│   │       │       ├── results/[snapshotId]/
│   │       │       │   ├── route.ts
│   │       │       │   ├── steps/route.ts
│   │       │       │   ├── defects/route.ts
│   │       │       │   └── comments/route.ts
│   │       │       ├── assignees/route.ts
│   │       │       └── seal/route.ts     ← POST: seal this run
│   │       ├── search/
│   │       │   └── route.ts              ← GET: fan-out search
│   │       ├── audit/
│   │       │   └── route.ts              ← GET: audit log with filters
│   │       ├── dashboard/
│   │       │   └── route.ts              ← GET: aggregated metrics
│   │       └── users/
│   │           ├── route.ts
│   │           └── [id]/route.ts
│   │
│   ├── components/
│   │   ├── ui/                           ← design system primitives
│   │   │   ├── Pill.tsx
│   │   │   ├── PriorityLabel.tsx
│   │   │   ├── DonutChart.tsx
│   │   │   ├── ProgressBar.tsx
│   │   │   ├── StatusChip.tsx
│   │   │   ├── ResizeHandle.tsx
│   │   │   ├── TabBar.tsx
│   │   │   └── KeyboardKey.tsx
│   │   ├── layout/
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Topbar.tsx
│   │   │   ├── ProjectSwitcher.tsx
│   │   │   └── ShortcutBar.tsx
│   │   ├── search/
│   │   │   └── CommandPalette.tsx
│   │   ├── dashboard/
│   │   │   ├── MetricCard.tsx
│   │   │   ├── RunCard.tsx
│   │   │   ├── NeedsAttentionPanel.tsx
│   │   │   └── CoverageGrid.tsx
│   │   ├── cases/
│   │   │   ├── SuiteTree.tsx
│   │   │   ├── CaseTable.tsx
│   │   │   ├── CaseDetailPanel.tsx
│   │   │   └── QuickCreate.tsx
│   │   ├── plans/
│   │   │   ├── PlanList.tsx
│   │   │   └── PlanDetail.tsx
│   │   └── runs/
│   │       ├── RunSelector.tsx
│   │       ├── ExecCasePane.tsx
│   │       ├── ExecDetailPanel.tsx
│   │       └── ResultButtons.tsx
│   │
│   ├── lib/
│   │   ├── db/
│   │   │   ├── index.ts                  ← Drizzle client singleton
│   │   │   └── schema/
│   │   │       ├── users.ts
│   │   │       ├── projects.ts
│   │   │       ├── cases.ts
│   │   │       ├── plans.ts
│   │   │       ├── runs.ts
│   │   │       └── audit.ts
│   │   ├── opensearch/
│   │   │   ├── client.ts
│   │   │   └── indexes/
│   │   │       ├── cases.ts
│   │   │       ├── runs.ts
│   │   │       └── plans.ts
│   │   ├── services/
│   │   │   ├── ProjectService.ts
│   │   │   ├── TestCaseService.ts
│   │   │   ├── TestPlanService.ts
│   │   │   ├── TestRunService.ts
│   │   │   ├── ExecutionService.ts
│   │   │   ├── SearchService.ts
│   │   │   ├── AuditService.ts
│   │   │   ├── DashboardService.ts
│   │   │   └── UserService.ts
│   │   ├── auth/
│   │   │   ├── session.ts                ← NextAuth config
│   │   │   └── rbac.ts                  ← role resolution, permission checks
│   │   └── constants/
│   │       ├── statuses.ts
│   │       ├── priorities.ts
│   │       └── roles.ts
│   │
│   └── types/
│       ├── entities.ts                   ← inferred Drizzle types + extensions
│       ├── api.ts                        ← request/response shapes
│       └── rbac.ts                       ← role and permission types
│
└── infra/
    ├── terraform/
    │   ├── main.tf
    │   ├── variables.tf
    │   ├── vpc.tf
    │   ├── rds.tf                        ← Aurora MySQL cluster
    │   ├── opensearch.tf
    │   ├── ecs.tf                        ← Fargate task + service + ALB
    │   ├── ecr.tf
    │   ├── cloudfront.tf
    │   └── secrets.tf
    └── docker/
        └── Dockerfile
```

---

## 12. Canonical Decisions Summary

| Decision | Resolution |
|---|---|
| Cloud | AWS — non-negotiable |
| Compute | ECS Fargate |
| Database | Aurora MySQL 3.x (RDS MySQL 8.0 acceptable fallback) |
| ORM | Drizzle ORM, MySQL dialect |
| Search | AWS OpenSearch Service |
| Auth | NextAuth.js, Credentials provider, MySQL session adapter |
| OpenSearch sync | Synchronous write-through at service layer |
| Execution snapshotting | Atomic MySQL transaction at run creation |
| Run sealing | API-enforced, not UI-only |
| Case result vs step result | Manual override — case result is canonical, step results are informational |
| Audit log | Append-only, no exceptions, no deletions |
| Test Cases detail panel | Six tabs (matches exec panel) |
| "Defects" sidebar | Present but non-functional at MVP |
| "Stalled" run status | Manually toggled by Admin or Super Admin |
| Project terminology | "project" in data model and API; "module" acceptable in UI labels |
| Plan case selection | Individual case IDs (not suite-level inclusion) |
| Case ordering in runs | Sort by priority (CRIT→LOW) then status (Fail→Blocked→Not run→Pass) at query time |
| Reports | Phase 2 |
| S3 attachments | Phase 2 |
| CI/CD integration | Phase 2 |
| Total schema tables | 20 |
| Implementation start | Phase 1: repository setup → schema → auth → RBAC |

---

*End of Testlane Architecture Consolidation Baseline v1.0*
