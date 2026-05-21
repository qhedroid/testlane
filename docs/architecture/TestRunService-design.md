# TestRunService.create() — Complete Design
**Service Layer Phase · May 2026**

This document covers the complete design of the run-spawn operation: from input validation through the atomic MySQL transaction to post-commit side effects. It is the canonical reference for implementing this function.

---

## Overview

`TestRunService.create()` is the most complex single operation in Relay. It spawns a test run from a test plan by:

1. Validating the actor's project access
2. Loading the plan and resolving which cases to include
3. Generating a sequential run reference atomically
4. Writing the run, case snapshots, step snapshots, assignees, and audit event inside a single MySQL transaction
5. Indexing the run document in OpenSearch after commit

The entire transaction is atomic. If any insert fails, everything rolls back. The resulting run always exists in a consistent state or not at all.

---

## Input Type

```typescript
interface CreateRunInput {
  projectId:    string          // ULID of the target project
  testPlanId:   string          // ULID of the source test plan
  createdBy:    string          // ULID of the acting user
  name?:        string          // Optional run title; defaults to '{plan title} — {date}'
  environment?: string          // Optional override; defaults to plan.environment
  assigneeIds?: string[]        // Run-level assignees; defaults to []
  caseIds?:     string[]        // Subset of plan cases; omit to include all
}
```

---

## Output Type

```typescript
interface CreateRunResult {
  id:          string        // ULID of the created run
  runRef:      string        // e.g. 'RUN-0042'
  title:       string
  status:      'active'
  caseCount:   number        // Number of test_run_cases rows created
  stepCount:   number        // Number of run_case_step_snapshots rows created
  environment: string | null
  createdAt:   Date
  testPlanId:  string
  projectId:   string
}
```

---

## Error Codes

All validation failures throw `RunCreationError(message, code)` before any DB write occurs.

| Code | Meaning |
|---|---|
| `INSUFFICIENT_PERMISSIONS` | Actor lacks qa_lead or above in this project |
| `PLAN_NOT_FOUND` | No active plan found with that ID in this project |
| `PLAN_ARCHIVED` | Plan status is 'archived'; cannot spawn runs |
| `PLAN_EMPTY` | Plan has no cases linked |
| `CASES_NOT_IN_PLAN` | One or more `caseIds` are not in the specified plan |
| `CASES_UNAVAILABLE` | One or more selected cases are archived or missing |
| `INVALID_ASSIGNEES` | One or more `assigneeIds` are inactive or not found |
| `REF_COUNTER_TIMEOUT` | MySQL lock wait timeout acquiring the ref counter |
| `TRANSACTION_FAILED` | Unexpected DB error inside the transaction |

---

## Execution Flow

```
createRun(input)
│
├─ PHASE 1: PRE-VALIDATION (reads only, no transaction)
│   ├─ 1a. assertProjectAccess()           → RBAC check
│   ├─ 1b. Load + validate test plan       → must exist, not archived
│   ├─ 1c. Load plan case list             → resolve selected case IDs
│   ├─ 1d. Load cases + steps + folders    → validate none are archived
│   └─ 1e. Validate assignees             → all must be active users
│
├─ PHASE 2: TRANSACTION (all-or-nothing)
│   ├─ 2a. generateRunRef()               → FOR UPDATE lock on ref_counters
│   ├─ 2b. INSERT test_runs              → 1 row
│   ├─ 2c. INSERT test_run_cases         → N rows (chunked by 100)
│   ├─ 2d. INSERT run_case_step_snapshots → M rows (chunked by 100)
│   ├─ 2e. INSERT run_assignees          → K rows
│   └─ 2f. INSERT audit_log             → 1 row
│
└─ PHASE 3: POST-COMMIT (fire-and-forget, non-atomic)
    ├─ 3a. Index run document in OpenSearch
    └─ 3b. Upsert recent_views for creating user
```

---

## Phase 1 — Pre-Validation

All reads in Phase 1 execute outside a transaction. This minimises the time the transaction lock is held. The downside is a narrow TOCTOU window: a case could be archived between the pre-validation read and the transaction write. The service detects this via FK constraint violations inside the transaction and surfaces them as `CASES_UNAVAILABLE`.

### 1a. RBAC Check

The acting user must have an effective role of `qa_lead`, `admin`, or `super_admin` within the project. Effective role = max(global_role, project_role) in the role hierarchy.

```
super_admin(5) > admin(4) > qa_lead(3) > qa_engineer(2) > viewer(1)
```

Query 1 (users table):
```sql
SELECT global_role FROM users WHERE id = ? LIMIT 1
```
Uses: PK index on `users.id`

Query 2 (project_roles, if global role is insufficient):
```sql
SELECT role FROM project_roles
WHERE project_id = ? AND user_id = ?
LIMIT 1
```
Uses: `project_role_unique` unique index on `(project_id, user_id)`

### 1b. Load Test Plan

```sql
SELECT id, plan_ref, title, status, environment, project_id
FROM test_plans
WHERE id = ? AND project_id = ?
LIMIT 1
```
Uses: PK index on `test_plans.id`. The `project_id` filter is a safety check — prevents cross-project plan access.

Guard conditions:
- `plan === undefined` → PLAN_NOT_FOUND
- `plan.status === 'archived'` → PLAN_ARCHIVED
- `plan.status === 'draft'` → **allowed**. Draft plans can spawn runs. The plan is not automatically promoted to 'active' by this operation — that is a separate explicit action.

### 1c. Load Plan Case List

```sql
SELECT test_case_id, position
FROM test_plan_cases
WHERE test_plan_id = ?
ORDER BY position ASC
```
Uses: `tpc_test_plan_id_idx` on `test_plan_cases(test_plan_id)`

If the result is empty → PLAN_EMPTY.

Resolve `selectedCaseIds`:
- If `input.caseIds` is provided: validate each is in `allPlanCaseIds`. Fail fast with CASES_NOT_IN_PLAN if any are not.
- If `input.caseIds` is omitted or empty: use all plan case IDs.

### 1d. Load Cases, Steps, and Folder Names

Single query with LEFT JOIN to capture folder name for the snapshot:

```sql
SELECT
  tc.id, tc.case_ref, tc.title, tc.priority, tc.type,
  tc.preconditions, tc.description, tc.automation_status,
  tc.tags, tc.assigned_to, tc.folder_id, tc.is_archived,
  f.name AS folder_name
FROM test_cases tc
LEFT JOIN folders f ON tc.folder_id = f.id
WHERE tc.id IN (...)
  AND tc.is_archived = false
```
Uses: `tc_project_archived_idx` on `test_cases(project_id, is_archived)`. The `IN` clause is handled by the PK index cluster lookup.

Guard: if `cases.length !== selectedCaseIds.length`, some cases are archived or missing → CASES_UNAVAILABLE. Report the missing IDs in the error.

Load all steps for selected cases in a single batch query:

```sql
SELECT id, test_case_id, position, action, expected_result
FROM test_case_steps
WHERE test_case_id IN (...)
ORDER BY test_case_id ASC, position ASC
```
Uses: `step_test_case_pos_idx` on `test_case_steps(test_case_id, position)`

Group into a `Map<caseId, steps[]>` in application memory. This avoids N+1 queries.

### 1e. Validate Assignees

```sql
SELECT id FROM users
WHERE id IN (...)
  AND is_active = true
```
Uses: PK index cluster lookup.

If result count ≠ assigneeIds length → INVALID_ASSIGNEES.

---

## Phase 2 — Transaction

The transaction wraps every DB write. Drizzle's `db.transaction(async (tx) => { ... })` issues `BEGIN` before the callback and `COMMIT` on success. Any thrown exception triggers automatic `ROLLBACK`.

The `tx` object uses the same pooled connection for all operations — required for MySQL transaction semantics.

### 2a. Generate run_ref (ref_counters, SELECT FOR UPDATE)

The ref counter is a helper table not in the main 20-table schema. Add it in the first migration:

```sql
CREATE TABLE ref_counters (
  project_id   VARCHAR(26)                      NOT NULL,
  entity_type  ENUM('case', 'run', 'plan')      NOT NULL,
  next_value   INT UNSIGNED                     NOT NULL DEFAULT 1,
  PRIMARY KEY (project_id, entity_type)
) ENGINE=InnoDB;
```

Inside the transaction — three sequential raw SQL statements:

```sql
-- Step 1: Ensure the counter row exists (no-op if already present)
INSERT INTO ref_counters (project_id, entity_type, next_value)
VALUES (?, 'run', 1)
ON DUPLICATE KEY UPDATE next_value = next_value + 0;

-- Step 2: Lock the row exclusively and read the current counter
SELECT next_value
FROM ref_counters
WHERE project_id = ? AND entity_type = 'run'
FOR UPDATE;

-- Step 3: Increment for the next caller
UPDATE ref_counters
SET next_value = next_value + 1
WHERE project_id = ? AND entity_type = 'run';
```

The `FOR UPDATE` in Step 2 places an exclusive row lock on the counter row. Any concurrent transaction attempting the same FOR UPDATE will block until this transaction commits or rolls back. This serialises ref assignment under concurrent run creation.

`runRef = 'RUN-' + String(currentRef).padStart(4, '0')`

**Rollback behaviour:** If the transaction rolls back (any reason), the UPDATE in Step 3 is also rolled back. The counter does not advance. This means a failed run creation does not produce a gap in the ref sequence.

**Lock wait timeout:** If another transaction holds the counter lock for longer than `innodb_lock_wait_timeout` (default 50s, recommend 10s for this workload), MySQL throws `ER_LOCK_WAIT_TIMEOUT`. The service catches this and returns `REF_COUNTER_TIMEOUT`. Consider reducing `innodb_lock_wait_timeout` to 10 seconds at the Aurora parameter group level.

### 2b. Insert test_runs

```typescript
await tx.insert(testRuns).values({
  id:           newRunId,       // pre-generated ULID
  runRef,
  projectId,
  testPlanId,
  title:        resolvedTitle,
  status:       'active',
  environment:  resolvedEnvironment,
  isStalled:    false,
  createdBy,
  // sealedAt, sealedBy: omitted (null by default)
  // indexedAt: null — will be set after OpenSearch write
})
```

Fails if: `UNIQUE(project_id, run_ref)` is violated (duplicate ref — should be impossible with correct FOR UPDATE locking). If it happens, the transaction rolls back. The service retries once with a fresh ref counter read before surfacing `TRANSACTION_FAILED`.

### 2c. Insert test_run_cases

Build rows in-memory first, then insert in chunks of 100 rows to respect `max_allowed_packet`.

Each row captures both the immutable snapshot and the pre-populated `not_run` result:

```typescript
{
  id:                    createId(),
  testRunId:             newRunId,
  testCaseId:            case.id,           // FK to live case (RESTRICT)

  // ── SNAPSHOT (immutable) ─────────────────────────────────
  snapshotCaseRef:       case.caseRef,
  snapshotTitle:         case.title,
  snapshotPreconditions: case.preconditions ?? null,
  snapshotDescription:   case.description ?? null,
  snapshotPriority:      case.priority,
  snapshotType:          case.type,
  snapshotFolderName:    case.folderName ?? null,
  snapshotTags:          case.tags ?? [],

  // ── ASSIGNMENT ──────────────────────────────────────────
  assignedTo:            case.assignedTo ?? null,   // from live case

  // ── RESULT (pre-populated as not_run) ───────────────────
  status:                'not_run',
  comment:               null,
  executedBy:            null,
  executedAt:            null,

  // ── ORDERING ────────────────────────────────────────────
  position:              planPositionIndex,   // 0-based, ordered by plan position
}
```

**Why pre-populate as `not_run`:** Every case in the run has a result row from creation. This eliminates the need for LEFT JOINs in execution queries. `WHERE status = 'not_run'` works without null checks. The execution filter tabs (All / Not run / Fail / Blocked) are simple WHERE clauses against this column.

**Case ordering:** Cases are inserted in `test_plan_cases.position` order. The `position` field in `test_run_cases` records this order (0, 1, 2, ...). The execution case list query sorts by priority (FIELD/CASE expression) then by position for tiebreaking within the same priority level.

### 2d. Insert run_case_step_snapshots

Build a map of `testCaseId → testRunCaseId` from the rows built in 2c. Iterate cases in order and build step snapshot rows:

```typescript
{
  id:              createId(),
  testRunCaseId:   runCaseIdMap.get(case.id),
  originalStepId:  step.id,    // FK with ON DELETE SET NULL
  position:        step.position,
  action:          step.action,
  expectedResult:  step.expectedResult ?? null,
  // No updatedAt — this table is immutable
}
```

Insert in chunks of 100.

**No `run_step_results` rows are created here.** Step results are created lazily by `ExecutionService.updateStepResult()` on first interaction. Pre-creating them would add O(steps_per_case × cases_per_run) extra rows to the spawn transaction for rows that may never be used.

### 2e. Insert run_assignees

```typescript
assigneeIds.map(userId => ({
  id:         createId(),
  testRunId:  newRunId,
  userId,
  assignedBy: createdBy,
  // assignedAt defaults to NOW() via schema definition
}))
```

Skipped if `assigneeIds` is empty.

### 2f. Insert audit_log

The audit event is part of the transaction. If the run creation fails and rolls back, this event also rolls back. There is never an audit event for a run that does not exist.

**Exact payload:**

```typescript
{
  id:         createId(),
  projectId,
  entityType: 'test_run',
  entityId:   newRunId,
  action:     'run.created',
  actorId:    createdBy,
  oldValue:   null,
  newValue: {
    runRef,
    title:       resolvedTitle,
    testPlanId,
    environment: resolvedEnvironment ?? null,
    caseCount:   orderedCases.length,
    stepCount:   totalStepSnapshotCount,
    assigneeIds,
    status:      'active',
  },
  metadata: {
    planRef:             plan.planRef,
    planTitle:           plan.title,
    isPartialSelection:  caseIds != null && caseIds.length < allPlanCaseIds.length,
    selectedCaseRefs:    orderedCases.map(c => c.caseRef),
    // selectedCaseRefs enables audit trail reconstruction:
    // "Run RUN-0042 was created with 87 cases from plan PLAN-003,
    //  including TC-1001, TC-1002, ..."
  },
}
```

---

## Phase 3 — Post-Commit

Neither of these operations is inside the transaction. Both are fire-and-forget. Failures are logged but do not surface to the caller.

### 3a. OpenSearch Indexing

Called immediately after `db.transaction()` resolves:

```typescript
indexRunDocument(runId, ...)
  .catch(err => logger.error('[SearchService] run index failed', { runId, err }))
```

`indexRunDocument` fetches denormalised data (project name, creator name) and writes to OpenSearch:

**Exact document payload:**

```json
{
  "id":               "01HX...",
  "run_ref":          "RUN-0042",
  "title":            "CTMS Regression — Sprint 44",
  "status":           "active",
  "environment":      "UAT",
  "project_id":       "01HW...",
  "project_name":     "TI-Core Platform",
  "plan_title":       "CTMS Module — Full Regression",
  "plan_ref":         "PLAN-003",
  "created_by_name":  "Aisha Rahman",
  "updated_at":       "2026-05-21T14:32:00Z"
}
```

After a successful OpenSearch write, the service updates `test_runs.indexed_at = NOW()`. This marks the run as synced and excludes it from future sync gap queries.

If the OpenSearch write fails:
- Error is logged with run ID
- `indexed_at` remains NULL
- The run is queryable from MySQL immediately
- A background sync job (Phase 2) will retry based on `WHERE indexed_at IS NULL OR updated_at > indexed_at`

### 3b. recent_views Upsert

```typescript
upsertRecentView(createdBy, 'test_run', runId, projectId, `${runRef} · ${resolvedTitle}`)
  .catch(err => logger.error('[RecentViews] upsert failed', err))
```

This ensures the newly-created run appears at the top of the Cmd K recent palette for the creating user immediately.

The upsert uses `ON DUPLICATE KEY UPDATE`:

```sql
INSERT INTO recent_views (id, user_id, entity_type, entity_id, project_id, display_title, viewed_at)
VALUES (?, ?, 'test_run', ?, ?, ?, NOW())
ON DUPLICATE KEY UPDATE display_title = VALUES(display_title), viewed_at = NOW()
```

Followed by a cleanup to enforce the 15-row maximum.

---

## Failure Modes and Rollback Behaviour

| Phase | Failure | Effect | Recovery |
|---|---|---|---|
| 1a | User not found | Throw `INSUFFICIENT_PERMISSIONS` | None needed — no writes |
| 1a | Insufficient role | Throw `INSUFFICIENT_PERMISSIONS` | None needed |
| 1b | Plan not found | Throw `PLAN_NOT_FOUND` | None needed |
| 1b | Plan archived | Throw `PLAN_ARCHIVED` | None needed |
| 1c | Plan empty | Throw `PLAN_EMPTY` | None needed |
| 1c | Case IDs not in plan | Throw `CASES_NOT_IN_PLAN` | None needed |
| 1d | Cases archived/missing | Throw `CASES_UNAVAILABLE` | None needed |
| 1e | Invalid assignees | Throw `INVALID_ASSIGNEES` | None needed |
| 2a | Lock wait timeout | Throw `REF_COUNTER_TIMEOUT` | Rollback; counter unchanged |
| 2b | Duplicate run_ref | Constraint violation → rollback | Counter unchanged; retry once |
| 2b | FK violation on projectId | Constraint violation → rollback | No state written |
| 2c | FK violation on testCaseId | Case archived since pre-validation; rollback | No state written |
| 2d | Insert failure (any reason) | Rollback; test_runs row rolled back | No partial state |
| 2e | FK violation on userId | Assignee deactivated since pre-validation; rollback | No state written |
| 2f | Audit log insert failure | Rollback; entire run rolled back | No state written |
| 3a | OpenSearch write fails | Error logged; `indexed_at` stays NULL | Sync job retries |
| 3b | recent_views upsert fails | Error logged; palette missing new item | Re-appears on next view |

**Critical invariant:** The committed state of the database is always one of:
- Run does not exist → no `test_run_cases`, no snapshots, no assignees, no audit event
- Run exists → all `test_run_cases` rows exist, all step snapshots exist, audit event exists

There is no intermediate state where a run exists but its cases or audit event do not.

---

## Concurrency Model

### ref_counters Locking

```
Time →

Tx A (spawning RUN-0042):
  BEGIN
  INSERT ref_counters ... ON DUPLICATE KEY ...  [ensures row exists]
  SELECT next_value ... FOR UPDATE              [acquires X-lock on row]
  UPDATE ref_counters SET next_value = 43       [increments]
  INSERT test_runs (runRef = 'RUN-0042')
  ...
  COMMIT                                        [releases X-lock]

Tx B (spawning RUN-0043, concurrent):
  BEGIN
  INSERT ref_counters ... ON DUPLICATE KEY ...  [row exists; no-op]
  SELECT next_value ... FOR UPDATE              [BLOCKS — row locked by Tx A]
  ← (waits) →
  ← Tx A commits →
  SELECT returns next_value = 43               [reads incremented value]
  UPDATE ref_counters SET next_value = 44
  INSERT test_runs (runRef = 'RUN-0043')
  ...
  COMMIT
```

No duplicate refs. No gaps (assuming no rollbacks). Correct serialisation.

### Snapshot Consistency Window

Cases and steps are read in Phase 1 (outside the transaction). A concurrent edit to a test case between Phase 1 and the transaction write would not be reflected in the snapshot — the run would capture the slightly older version.

This is acceptable and correct behaviour: the snapshot represents the case as it was at the moment the run was spawned, not at the moment the transaction commits. The difference is typically milliseconds. For production correctness, the snapshot is sufficiently accurate.

If absolute snapshot accuracy is required (edge case: a case is being edited at the exact moment a run is spawned), the cases query could be moved inside the transaction using `LOCK IN SHARE MODE`. This trades consistency for transaction duration. Not recommended at MVP.

---

## Performance Characteristics

Based on a plan with 100 cases averaging 4 steps each:

| Step | Operations | Estimated time |
|---|---|---|
| Phase 1 pre-validation | 5 read queries | 10–20ms |
| Cases + steps load | 2 queries (IN + JOIN) | 15–30ms |
| Transaction: ref counter | 3 raw SQL statements | 5–10ms |
| Transaction: test_runs insert | 1 insert | 2–5ms |
| Transaction: test_run_cases (100 rows, 1 chunk) | 1 batch insert | 10–20ms |
| Transaction: step_snapshots (400 rows, 4 chunks) | 4 batch inserts | 20–40ms |
| Transaction: assignees (≤10 rows) | 1 insert | 2–5ms |
| Transaction: audit_log | 1 insert | 2–5ms |
| Transaction overhead (BEGIN, COMMIT, network) | — | 10–20ms |
| **Total transaction time** | | **~50–105ms** |
| **Total request time (Phase 1 + 2)** | | **~75–155ms** |
| Phase 3 (async, not on critical path) | OpenSearch + recent_views | 50–200ms |

For plans with 500 cases / 2000 steps:

| Step | Chunks | Estimated time |
|---|---|---|
| Cases + steps load | 2 queries | 20–50ms |
| test_run_cases (500 rows, 5 chunks) | 5 inserts | 30–60ms |
| step_snapshots (2000 rows, 20 chunks) | 20 inserts | 80–160ms |
| **Total transaction time** | | **~150–280ms** |

The chunk count for step_snapshots is the main scalability variable. 20 round trips within a single connection is not expensive in absolute terms, but if Aurora multi-AZ latency is high, this multiplies. Consider increasing the chunk size to 200-250 rows for very large plans.

**Phase 2 Background Job** (not at MVP): For plans with 1000+ cases, the transaction could exceed 500ms. At that scale, move run creation to a background worker with the run in a `preparing` status that transitions to `active` when complete.

---

## Indexes Exercised by This Operation

**Phase 1 reads:**

| Query | Table | Index used |
|---|---|---|
| User role lookup | `users` | PK |
| Project role lookup | `project_roles` | `project_role_unique` on (project_id, user_id) |
| Plan load | `test_plans` | PK + project_id filter |
| Plan cases list | `test_plan_cases` | `tpc_test_plan_id_idx` on (test_plan_id) |
| Cases load | `test_cases` | PK cluster (IN clause) + `tc_project_archived_idx` |
| Steps load | `test_case_steps` | `step_test_case_pos_idx` on (test_case_id, position) |
| Assignee validation | `users` | PK cluster (IN clause) |

**Phase 2 writes (no index reads — inserts only):**

| Write | Table | Constraint check |
|---|---|---|
| Counter ensure | `ref_counters` | PK on (project_id, entity_type) |
| Counter read | `ref_counters` | PK (FOR UPDATE) |
| Run insert | `test_runs` | `run_project_ref_unique` on (project_id, run_ref) |
| Run case insert | `test_run_cases` | `trc_run_case_unique` on (test_run_id, test_case_id) |
| Step snapshot insert | `run_case_step_snapshots` | No unique constraint — append only |
| Assignee insert | `run_assignees` | `ra_run_user_unique` on (test_run_id, user_id) |
| Audit insert | `audit_log` | No unique constraint — append only |

---

## Execution Case List Query (Consumption)

The primary consumer of the data written by this service is the execution case pane in Test Runs. This query is exercised every time a QA engineer opens a run or changes filter tabs.

**Default (All):**
```sql
SELECT
  trc.id,
  trc.snapshot_case_ref,
  trc.snapshot_title,
  trc.snapshot_priority,
  trc.snapshot_folder_name,
  trc.snapshot_tags,
  trc.assigned_to,
  trc.status,
  trc.executed_by,
  trc.executed_at,
  trc.position
FROM test_run_cases trc
WHERE trc.test_run_id = ?
ORDER BY
  FIELD(trc.snapshot_priority, 'critical', 'high', 'medium', 'low'),
  trc.position ASC
```
Uses: `trc_run_id_idx` for the WHERE, then filesort on FIELD() expression.

**Filtered (e.g. Fail tab):**
```sql
WHERE trc.test_run_id = ? AND trc.status = 'fail'
```
Uses: `trc_run_status_idx` on (test_run_id, status).

**Case search within run (search box):**
```sql
WHERE trc.test_run_id = ?
  AND trc.snapshot_title LIKE CONCAT('%', ?, '%')
```
No index on snapshot_title — linear scan within the run result set. Acceptable for runs up to ~1000 cases.

**Dashboard run progress (pass rate):**
```sql
SELECT
  COUNT(*) AS total,
  SUM(status = 'pass') AS passed,
  SUM(status = 'fail') AS failed,
  SUM(status = 'blocked') AS blocked,
  SUM(status = 'not_run') AS not_run
FROM test_run_cases
WHERE test_run_id = ?
```
Uses: `trc_run_id_idx`. Pure count — fast.

---

## Audit Event — Field Reference

| Field | Value |
|---|---|
| `entity_type` | `'test_run'` |
| `entity_id` | `newRunId` (ULID of created run) |
| `action` | `'run.created'` |
| `actor_id` | `createdBy` (user who triggered the spawn) |
| `old_value` | `null` (nothing existed before) |
| `new_value.runRef` | `'RUN-0042'` |
| `new_value.title` | Resolved run title |
| `new_value.testPlanId` | Source plan ID |
| `new_value.environment` | Resolved environment string or null |
| `new_value.caseCount` | Number of `test_run_cases` rows created |
| `new_value.stepCount` | Number of `run_case_step_snapshots` rows created |
| `new_value.assigneeIds` | Array of run assignee user IDs |
| `new_value.status` | `'active'` |
| `metadata.planRef` | `'PLAN-003'` |
| `metadata.planTitle` | `'CTMS Module — Full Regression'` |
| `metadata.isPartialSelection` | `true` if only a subset of plan cases was selected |
| `metadata.selectedCaseRefs` | `['TC-1001', 'TC-1002', ...]` — all case refs in this run |

---

## OpenSearch Document — Field Reference

Index: `relay_test_runs`

| Field | Value | Notes |
|---|---|---|
| `id` | ULID of run | Used as OpenSearch document ID |
| `run_ref` | `'RUN-0042'` | boost 2.0 at search time |
| `title` | Run title | boost 3.0 at search time |
| `status` | `'active'` | Used as filter in Cmd K |
| `environment` | `'UAT'` or null | boost 0.5 at search time |
| `project_id` | ULID | Used for project-scoped search |
| `project_name` | `'TI-Core Platform'` | Denormalised at index time |
| `plan_title` | `'CTMS Module — Full Regression'` | boost 1.0 at search time |
| `plan_ref` | `'PLAN-003'` | For exact plan matching |
| `created_by_name` | `'Aisha Rahman'` | Denormalised at index time |
| `updated_at` | ISO 8601 timestamp | Used for sort and freshness |

---

## What This Service Explicitly Does Not Do

- Does not update `test_plan_cases` or `test_plans` in any way
- Does not mutate `test_cases` or `test_case_steps`
- Does not create `run_step_results` rows (lazy creation in ExecutionService)
- Does not set `test_plans.status` to 'active' (that is a separate explicit action)
- Does not send notifications (Phase 2 — SES)
- Does not validate that selected cases are not already in another active run (there is no such constraint — a case can be in multiple concurrent runs)
- Does not lock the test plan during run creation (plans are not immutable during active runs at MVP)

---

*End of TestRunService.create() Design*
