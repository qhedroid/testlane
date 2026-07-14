# Testlane — Drizzle Schema: Rationale, Notes, Indexing, and Risks
**Phase 5 · May 2026**

---

## 1. Schema Design Rationale

### ID Strategy — ULID over Auto-Increment

All primary keys are 26-character ULIDs stored in `VARCHAR(26)`. The alternative was `BIGINT UNSIGNED AUTO_INCREMENT`.

Auto-increment integers are fine for pure internal databases but have three meaningful problems here. First, they are enumerable — a QA engineer or attacker who knows `TC-1001` exists can trivially probe `TC-1000`, `TC-999`, etc. Second, they cannot be generated before the insert, which complicates optimistic UI patterns (creating a row and navigating to it before the DB confirms). Third, they complicate any future service extraction where multiple services might need to insert rows without a centralised sequence.

ULIDs are time-ordered (the first 48 bits are a millisecond timestamp), which means B-tree insert patterns in MySQL are mostly sequential — InnoDB page splits are infrequent, similar to auto-increment. They are URL-safe and 26 characters, which is compact enough for all FK columns without significant overhead.

The `ulid` package generates them at the application layer. The DB never generates IDs. Every insert specifies the ID explicitly.

**The one trade-off:** VARCHAR(26) FKs are slightly larger than BIGINT FKs (26 bytes vs 8 bytes per FK reference). At MVP scale with tens of thousands of rows, this is not a concern. At tens of millions of rows across test_run_cases and audit_log, it would be worth benchmarking. Document this as a Phase 2 evaluation point.

---

### Human-Readable Refs — case_ref, run_ref, plan_ref

These (`TC-1001`, `RUN-042`, `PLAN-007`) are separate columns from the primary key. They serve as the user-facing identifier shown in the UI, in comments, in defect descriptions, and in external communication.

They are unique per project, not globally. `TC-1001` in the CTMS project and `TC-1001` in the eTMF project are different cases. The unique constraint is `(project_id, case_ref)`.

**Generation strategy:** the service layer maintains a per-project counter. The recommended pattern is a `ref_counters` table (not in the 20-table spec but added as a helper table in a migration):

```sql
CREATE TABLE ref_counters (
  project_id  VARCHAR(26) NOT NULL,
  entity_type ENUM('case', 'run', 'plan') NOT NULL,
  next_value  INT UNSIGNED NOT NULL DEFAULT 1,
  PRIMARY KEY (project_id, entity_type)
);
```

The service increments the counter atomically:

```sql
INSERT INTO ref_counters (project_id, entity_type, next_value)
VALUES (?, 'case', 2)
ON DUPLICATE KEY UPDATE next_value = next_value + 1;

SELECT next_value - 1 FROM ref_counters WHERE project_id = ? AND entity_type = 'case';
```

This is atomic under concurrent inserts and avoids race conditions from `MAX(case_ref) + 1` patterns. The two statements should run inside the same transaction as the case INSERT.

---

### Timestamp Strategy — TIMESTAMP vs DATETIME

`created_at` and `updated_at` use MySQL `TIMESTAMP` type (Drizzle: `timestamp()`). This gives:
- `.defaultNow()` — `DEFAULT CURRENT_TIMESTAMP`
- `.onUpdateNow()` — `ON UPDATE CURRENT_TIMESTAMP`

Event-specific nullable timestamps (`sealed_at`, `executed_at`, `last_login_at`, `indexed_at`, `deleted_at`) use MySQL `DATETIME` (Drizzle: `datetime()`). DATETIME does not have automatic behaviour — it is set explicitly by the service layer.

Both use `{ mode: 'date' }` to return JavaScript `Date` objects from the mysql2 driver rather than raw strings.

**TIMESTAMP range limitation:** MySQL TIMESTAMP stores values up to `2038-01-19 03:14:07 UTC`. This is a known limitation and should be acceptable for a platform expected to operate well within that window. If there is any concern, switch `created_at`/`updated_at` to DATETIME with explicit defaults in the migration.

---

### Snapshot Architecture — test_run_cases

The key architectural decision in the run domain is combining the immutable case snapshot and the mutable execution result into a single table (`test_run_cases`). The alternative was two separate tables (`run_case_snapshots` + `run_results`).

The single-table approach is justified here because:

1. There is a 1:1 relationship between a snapshot and a result — every case in a run always has exactly one snapshot and exactly one result. There is no scenario where a snapshot exists without a result row or vice versa.
2. Queries against the execution case list always need both the snapshot fields (title, priority, folder for display) and the result fields (status, executed_by, for filtering and ordering). A JOIN would add complexity for no real gain.
3. Pre-populating `status = 'not_run'` at run creation means all filter queries (`WHERE status = 'fail'`, `WHERE status = 'not_run'`) work without LEFT JOIN null checks.

The immutability of snapshot columns is enforced in the service layer, not the DB. `TestRunService.create()` sets them once inside the spawn transaction. `ExecutionService.updateResult()` only touches the result columns. These are separate code paths with no overlap.

Steps are kept separate (`run_case_step_snapshots` + `run_step_results`) because:
- The snapshot/result relationship for steps is not 1:1 at row creation time. Step result rows are created lazily (only when a QA engineer first interacts with a step). Pre-populating them would require knowing the step count at spawn time and creating N additional rows per case — this adds transaction size without benefit since many steps may never be individually marked.
- Keeping them separate makes the spawn transaction smaller and faster.

---

### Soft Delete Strategy

The platform uses soft delete (not hard delete) throughout, for different reasons per entity:

| Entity | Mechanism | Reason |
|---|---|---|
| test_cases | `is_archived` flag | Cases may be referenced in plans and run snapshots |
| test_plans | `status = 'archived'` | Plans may have associated runs |
| test_runs | `status = 'archived'` | Runs have immutable execution history |
| run_defect_links | `unlinked_at` timestamp | Preserves link history for audit |
| run_execution_comments | `is_deleted` flag | Preserves comment for audit; hides from UI |
| attachments_metadata | `is_deleted` flag + `deleted_at` | S3 deletion is async; metadata lingers |
| users | `is_active` flag | Preserves FK integrity across all history |

Hard delete is not permitted for any entity that has ever been referenced in an execution or audit event. The service layer enforces this — not the DB FK (FKs use RESTRICT or SET NULL, not CASCADE DELETE, on most critical relationships).

---

### organisations Table — Multi-Tenancy Scaffold

`organisations` is included now even if the initial deployment is single-tenant (one organisation). Adding it later would require a migration touching every table. The cost now is two extra columns (`org_id`) on `users` and `projects`, and one FK join per org-scoped query. This is negligible. The benefit is that a second tenant can be onboarded without a schema change.

At MVP, `org_id` does not need to appear in every table. It flows through `project_id → projects.org_id` for all project-scoped entities. Only `users`, `projects`, `audit_log`, and `attachments_metadata` carry `org_id` directly.

---

### Tags on test_cases — JSON Column

Tags are stored as a JSON array in `test_cases.tags` for MVP. This is a deliberate trade-off: simpler schema, simpler inserts, no extra JOIN for the common case (display tags in the case table).

The downside is that MySQL cannot index a JSON array efficiently. Tag filtering in the database would require `JSON_CONTAINS(tags, '"regression"')` which does not use a standard B-tree index. At MVP, tag filtering is handled via OpenSearch (where tags are a proper multi-value field with keyword mapping). MySQL is not queried for tag filters directly.

Phase 2 extraction: create a `test_case_tags` table `(id, test_case_id, tag)` and migrate the JSON data into rows. The service layer change is small — a single JOIN replaces the JSON column read.

---

### Plan Assignees — JSON Column

Same rationale as tags. `test_plans.assignee_ids` is a JSON array of user ID strings. Phase 2: normalise to `test_plan_assignees (id, test_plan_id, user_id, assigned_by, assigned_at)`. The UI renders assignee names by resolving the IDs on read — the service layer fetches the user records for the stored IDs.

---

## 2. Relationship Notes

### Two Levels of Assignment in Runs

There are two distinct assignment relationships in the run domain that are easily confused:

1. **`run_assignees`** — the set of users assigned to a run as a whole. Shown in the dashboard run card Assignees tab and in the run header. Answers: "Who is responsible for this run?"

2. **`test_run_cases.assigned_to`** — the user responsible for executing a specific case within the run. Shown in the exec case list. Answers: "Who should execute this particular case?"

Both can overlap (a user in `run_assignees` may also be the `assigned_to` for specific cases). They are independent — a user can execute cases without being a formal run assignee, and a run assignee may not be assigned to any specific case.

---

### The Folder Self-Reference

`folders.parent_id` is a self-reference that must be added as a FK via a raw migration:

```sql
ALTER TABLE folders
  ADD CONSTRAINT fk_folder_parent
  FOREIGN KEY (parent_id) REFERENCES folders(id)
  ON DELETE RESTRICT;
```

`ON DELETE RESTRICT` means you cannot delete a folder that has children. The service layer must refuse the delete if children exist, or cascade the deletion explicitly in code (recursive folder delete with audit events per deleted folder). The DB restriction is the safety net.

Drizzle does not include this FK in the schema file due to circular table reference issues at schema initialisation time. This is a known Drizzle MySQL limitation — include the raw ALTER TABLE in your first migration file after the initial `CREATE TABLE` statements.

**MySQL 8 recursive CTE example for fetching a full folder tree:**

```sql
WITH RECURSIVE folder_tree AS (
  SELECT id, name, parent_id, position, 0 AS depth
  FROM folders
  WHERE project_id = ? AND parent_id IS NULL

  UNION ALL

  SELECT f.id, f.name, f.parent_id, f.position, ft.depth + 1
  FROM folders f
  INNER JOIN folder_tree ft ON f.parent_id = ft.id
  WHERE f.project_id = ?
)
SELECT * FROM folder_tree ORDER BY depth, position;
```

---

### audit_log Entity References — No FK

`audit_log.entity_id` is a VARCHAR storing a ULID, not a FK to any specific table. This is intentional. The same pattern as `attachments_metadata.entity_id`. Reasons:

1. The audit log references entities across multiple tables. A single FK column cannot point to multiple tables. A polymorphic FK approach (multiple nullable FK columns) would require a column per entity type — impractical.
2. An audit event for a deleted entity must be preserved even after the entity row is gone. A FK would prevent this (or require SET NULL, losing the reference).
3. The entity_type + entity_id pair is sufficient for the application to resolve the entity if needed.

Consequence: there is no DB-enforced referential integrity for audit log entity references. The service layer must ensure entity_type + entity_id are always accurate at insert time.

---

### run_defect_links — Soft Delete with Audit Trail

Defect links are removed by setting `unlinked_at` and `unlinked_by` rather than deleting the row. This preserves the history of what defects were linked, when, by whom, and when they were removed. The audit log records the `defect.unlinked` event as well. Together, these give a complete defect link history without querying deleted rows.

Active defect links: `WHERE unlinked_at IS NULL`
Full defect history: no filter on `unlinked_at`

---

### test_plan_cases and test_run_cases — RESTRICT vs CASCADE

`test_plan_cases.test_case_id` and `test_run_cases.test_case_id` both use `ON DELETE RESTRICT`. This enforces that test cases cannot be hard-deleted if they have been included in a plan or executed in a run. The business rule is: archive the case, never delete it.

If a test case needs to be permanently removed (data governance reasons), the service layer must first remove all plan and run references and log an audit event, then delete the case.

---

### recent_views — Upsert Pattern

The application uses an upsert when a user views an entity:

```typescript
await db.insert(recentViews)
  .values({ userId, entityType, entityId, projectId, displayTitle })
  .onDuplicateKeyUpdate({
    set: { viewedAt: sql`NOW()`, displayTitle: values.displayTitle }
  })
```

After the upsert, the service deletes the oldest rows if the count exceeds 15:

```typescript
const oldest = await db
  .select({ id: recentViews.id })
  .from(recentViews)
  .where(eq(recentViews.userId, userId))
  .orderBy(desc(recentViews.viewedAt))
  .offset(15)
  .limit(100)

if (oldest.length > 0) {
  await db.delete(recentViews).where(inArray(recentViews.id, oldest.map(r => r.id)))
}
```

This two-step approach (upsert + cleanup) is safe under concurrent requests because the upsert is atomic and the cleanup only removes stale rows. A race condition between two concurrent upserts at the 15-row boundary might briefly allow 16 rows, which is harmless.

---

## 3. Indexing Strategy

### Index Naming Convention

All index names follow: `{table_abbreviation}_{purpose}_{suffix}`. e.g.:
- `tc_project_folder_idx` — test_cases, project+folder composite
- `al_entity_idx` — audit_log, entity lookup
- `trc_run_priority_pos_idx` — test_run_cases, run+priority+position

### Primary Key Index

InnoDB creates a clustered index on the primary key automatically. Since ULIDs are time-ordered, inserts are mostly sequential and InnoDB page splits are infrequent — comparable to auto-increment performance.

### Critical Indexes by Query Pattern

**Execution case list (most frequent query in the product):**
```sql
SELECT * FROM test_run_cases
WHERE test_run_id = ?
  AND status IN ('fail', 'blocked', 'not_run')
ORDER BY FIELD(snapshot_priority, 'critical','high','medium','low'), position
```
Covered by: `trc_run_id_idx` + `trc_run_priority_pos_idx`

**Dashboard active runs:**
```sql
SELECT * FROM test_runs
WHERE project_id = ? AND status = 'active'
```
Covered by: `run_project_status_idx`

**Audit history view — entity timeline:**
```sql
SELECT * FROM audit_log
WHERE entity_type = ? AND entity_id = ?
ORDER BY created_at DESC
```
Covered by: `al_entity_idx` (entity_type + entity_id composite)

**Audit history view — project log:**
```sql
SELECT * FROM audit_log
WHERE project_id = ? AND created_at BETWEEN ? AND ?
ORDER BY created_at DESC
```
Covered by: `al_project_created_idx`

**Cmd K recent views:**
```sql
SELECT * FROM recent_views
WHERE user_id = ?
ORDER BY viewed_at DESC
LIMIT 15
```
Covered by: `rv_user_viewed_at_idx`

**OpenSearch sync gap detection:**
```sql
SELECT id FROM test_cases
WHERE updated_at > indexed_at OR indexed_at IS NULL
LIMIT 100
```
Covered by: `tc_updated_at_idx` (though a composite with `indexed_at` may be beneficial once the sync worker is active — evaluate in Phase 2)

**Test case list within a folder:**
```sql
SELECT * FROM test_cases
WHERE project_id = ? AND folder_id = ? AND is_archived = false
ORDER BY position
```
Covered by: `tc_project_folder_idx`

**Defect links for a run case (Defects tab):**
```sql
SELECT * FROM run_defect_links
WHERE test_run_case_id = ? AND unlinked_at IS NULL
```
Covered by: `rdl_active_links_idx`

### Indexes Intentionally Omitted

- `audit_log.actor_id` standalone index — covered by composite `al_actor_created_idx`
- `test_cases.tags` — JSON column, not indexable in MySQL without generated column. Tag filtering goes through OpenSearch.
- `test_plans.assignee_ids` — same rationale
- `folders.name` — not queried by name alone at MVP; full text search is in OpenSearch
- `test_run_cases.comment` — text column, not indexed; search within run comments is Phase 2

### Full-Text Indexes

No MySQL FULLTEXT indexes are defined. Full-text search is entirely handled by OpenSearch. Adding FULLTEXT indexes would create redundancy and maintenance overhead without benefit. The decision to route all text search through OpenSearch is firm.

---

## 4. Risky Areas and Trade-offs

### Risk 1 — Folders Self-Referential FK Must Be Added Manually

The `folders.parent_id → folders.id` FK is not in the Drizzle schema file. It must be added in the first migration as a raw ALTER TABLE statement. If this step is missed, the DB will allow orphaned child folders (pointing to deleted parent IDs). The service layer will prevent this via business logic, but the DB safety net will be absent.

**Mitigation:** add a comment and assertion in the migration runner that verifies the FK exists before the application starts. Or add a startup check in the service layer.

---

### Risk 2 — case_ref / run_ref / plan_ref Generation Race Condition

The ref counter pattern (INSERT ... ON DUPLICATE KEY UPDATE) is atomic for a single counter row. However, if two requests try to create a case in the same project simultaneously and both read the counter in the same millisecond, there is a potential for duplicate ref values.

The correct pattern is:
```sql
BEGIN;
INSERT INTO ref_counters (project_id, entity_type, next_value) VALUES (?, 'case', 2)
ON DUPLICATE KEY UPDATE next_value = next_value + 1;
SELECT next_value - 1 AS ref_value FROM ref_counters WHERE project_id = ? AND entity_type = 'case' FOR UPDATE;
COMMIT;
```

The `FOR UPDATE` lock on the counter row prevents concurrent reads from getting the same value. This must be implemented carefully in `TestCaseService.create()`.

Without the `FOR UPDATE`, two concurrent inserts could get the same ref value and violate the `UNIQUE(project_id, case_ref)` constraint, causing one insert to fail. The service layer must handle this constraint violation with a retry.

---

### Risk 3 — Snapshot Column Immutability Is Not DB-Enforced

`test_run_cases.snapshot_*` columns are logically immutable but there is nothing in the MySQL schema that prevents an UPDATE targeting them. A bug in the service layer could silently overwrite snapshot data.

**Mitigation options:**
1. A MySQL trigger that raises an error on UPDATE of snapshot columns (add in migration, but adds DB-level complexity).
2. Code review policy: `ExecutionService.updateResult()` has a strictly defined update set that never includes snapshot columns.
3. A linting rule or TypeScript type that makes snapshot fields read-only in the inferred type (achievable with a custom type wrapper).

Recommended: implement option 2 now, option 1 in Phase 2 when auditing and compliance requirements are formalised.

---

### Risk 4 — audit_log Append-Only Enforcement Is Application-Level

Nothing in the MySQL schema prevents an UPDATE or DELETE on `audit_log`. The application DB user should be granted `INSERT` only on `audit_log` in production:

```sql
REVOKE UPDATE, DELETE ON relay.audit_log FROM 'relay_app'@'%';
```

This is an infrastructure concern (not a schema concern) but must be part of the production deployment checklist. If this is not done, a bug in any service could silently mutate audit history.

A MySQL trigger can also enforce this:
```sql
CREATE TRIGGER audit_log_no_update
BEFORE UPDATE ON audit_log
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_log is append-only';

CREATE TRIGGER audit_log_no_delete
BEFORE DELETE ON audit_log
FOR EACH ROW
SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'audit_log is append-only';
```

Add these triggers in the initial migration. They are cheap (trigger overhead on UPDATE/DELETE of a table that should never be updated/deleted is zero cost in normal operation).

---

### Risk 5 — ULID Generation Dependency

The schema depends on the `ulid` npm package for ID generation. If this package is unavailable, unavailable or has a breaking change, all inserts fail.

Alternatives:
- `@paralleldrive/cuid2` — similar goals, different algorithm
- `crypto.randomUUID()` (Node.js built-in) — UUID v4, random, not time-ordered, stored as CHAR(36)
- Custom implementation — 6 lines of code using `Date.now()` + `crypto.getRandomValues()`

**Recommendation:** wrap ULID generation in a local utility (`src/lib/utils/id.ts`) that calls the `ulid` package. If the dependency ever needs to change, only the utility file changes, not the schema.

```typescript
// src/lib/utils/id.ts
import { ulid as generateUlid } from 'ulid'
export const createId = () => generateUlid()
```

The schema file imports `createId` from this utility, not from `ulid` directly.

---

### Risk 6 — JSON Columns are Opaque to MySQL

`test_cases.tags`, `test_plans.assignee_ids`, `saved_filters.filter_state`, `test_run_cases.snapshot_tags`, and the `old_value`/`new_value`/`metadata` columns in `audit_log` are JSON. MySQL 8 supports JSON columns with generated column indexing, but that is not set up here.

Consequences:
- Tag filtering in MySQL is slow without a generated column index. Route all tag-based filtering to OpenSearch.
- Querying `audit_log.old_value` or `new_value` with `JSON_EXTRACT()` is possible but slow on large tables without generated column indexes.
- `filter_state` in `saved_filters` is never queried — it is read, deserialised, and applied in the application layer.

These are acceptable at MVP. Phase 2 evaluation: if audit log JSON querying becomes a requirement, add generated columns with B-tree indexes for the most-queried JSON paths.

---

### Risk 7 — unique Constraint on test_run_cases Blocks Same Case Twice

The UNIQUE constraint `(test_run_id, test_case_id)` means a test case can appear only once in a run. This is the correct current behaviour — no case should be executed twice in the same run.

However, if a future requirement introduces "parallel test environments" (execute the same case against UAT and Staging in a single run), this constraint would need to be relaxed, likely by adding an `environment` or `lane` column to the unique key: `UNIQUE(test_run_id, test_case_id, lane)`.

Flag this if the product roadmap suggests multi-environment runs.

---

### Risk 8 — TIMESTAMP Year 2038 Limit

MySQL `TIMESTAMP` columns have an upper bound of `2038-01-19 03:14:07 UTC`. All `created_at` and `updated_at` columns use TIMESTAMP.

This is not an immediate concern for a platform expected to operate in the 2020s–2030s. However, if the platform is still running in 2037, a migration to `DATETIME` would be required.

Aurora MySQL 8.0 (and MySQL 8.0.28+) on most platforms handle TIMESTAMP values beyond 2038 correctly when `explicit_defaults_for_timestamp = ON` and the server timezone is UTC. Verify the Aurora parameter group has `explicit_defaults_for_timestamp = 1` set.

If there is any concern about long-term data retention, switch all `created_at`/`updated_at` columns to DATETIME with explicit `DEFAULT NOW()` and trigger-based `ON UPDATE NOW()` in the migration (or handle `updatedAt` entirely in the service layer).

---

### Risk 9 — attachments_metadata Is Phase 2 Scaffolding

Table 20 (`attachments_metadata`) is included in the schema now to avoid a future breaking migration, but the S3 integration is not implemented at MVP. The risk is that the schema is deployed and the table exists, but no data is written to it. This is harmless.

The risk is if the Phase 2 implementation makes different assumptions about the schema and a migration conflict occurs. Mitigation: document in the Phase 2 kickoff that `attachments_metadata` is a scaffold and must be reviewed before the S3 integration begins.

---

### Risk 10 — Drizzle onUpdateNow() Requires Correct MySQL Timezone

Drizzle's `.onUpdateNow()` generates `ON UPDATE CURRENT_TIMESTAMP` in the MySQL column definition. This behaves correctly only if the MySQL server timezone is configured properly. For Aurora MySQL, ensure the parameter group sets `time_zone = 'UTC'` or use the system default `SYSTEM` time zone with the EC2/ECS instance timezone set to UTC.

If `updated_at` timestamps appear incorrect (e.g. offset by several hours), this is the first thing to check.

---

## 5. Quick Reference — Table Purposes

| Table | Domain | Mutable? | Notes |
|---|---|---|---|
| organisations | Auth / Tenancy | Yes | Root scope |
| users | Auth | Yes | Soft-delete via is_active |
| projects | Projects | Yes | Soft-delete via status |
| project_roles | Projects | Yes | Per-project role overrides |
| folders | Test Cases | Yes | Self-referencing hierarchy; FK added via migration |
| test_cases | Test Cases | Yes | Never hard-deleted; archived only |
| test_case_steps | Test Cases | Yes | Cascade-deleted with case (safe — only live case steps) |
| test_plans | Test Plans | Yes | Never hard-deleted |
| test_plan_cases | Test Plans | Yes | RESTRICT on case deletion |
| test_runs | Test Runs | Yes | Never hard-deleted |
| test_run_cases | Test Runs | Partial | Snapshot cols: immutable. Result cols: mutable until sealed |
| run_case_step_snapshots | Test Runs | No | Fully immutable; no updated_at |
| run_step_results | Test Runs | Yes | Lazy-created; locked when run sealed |
| run_assignees | Test Runs | Yes | Run-level team assignment |
| run_defect_links | Test Runs | Partial | Soft-deleted via unlinked_at |
| run_execution_comments | Test Runs | Yes | Soft-deleted via is_deleted |
| audit_log | Audit | No | Append-only; triggers prevent UPDATE/DELETE |
| recent_views | UX / Search | Yes | Max 15 per user; upsert on re-view |
| saved_filters | UX | Yes | User-persisted filter presets |
| attachments_metadata | Storage | Partial | Phase 2 scaffold; soft-deleted via is_deleted |

---

*End of Testlane Schema Rationale v1.0*
