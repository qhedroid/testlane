# Testlane — Internal API Contracts (Phase 1)

**Status:** Health, run read/list, run spawn, and case result update. No product UI, no session auth, no plans/cases library reads yet.

This document is the contract for frontend and integration work. Route handlers in `apps/web/src/app/api/` are thin wrappers; business rules live in `packages/db/services/` and `packages/db/src/runs/`.

*Last updated: May 2026*

---

## Conventions

### Base URL

| Environment | Base |
|-------------|------|
| Local dev | `http://localhost:3000` |

Override for validation scripts: `API_BASE_URL`.

### Content type

All request and response bodies are **JSON** (`Content-Type: application/json`).

### Response envelope

**Success**

```json
{
  "data": { }
}
```

**Error**

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human-readable message",
    "details": { }
  }
}
```

`details` is optional. Present on `VALIDATION_ERROR` (Zod `flatten()` shape).

### Identifiers

- Path and body IDs are **26-character ULIDs** unless noted otherwise.
- Run references (`runRef`) are human-readable strings (e.g. `RUN-0001`).

### Dates

Service types use `Date`; JSON responses serialize them as **ISO 8601 strings**.

---

## Temporary authentication (local dev)

There is **no login, cookie, or bearer token** yet. All `/api/runs` routes (except health) resolve the actor from a development header:

| Header | Required | Description |
|--------|----------|-------------|
| `x-relay-user-id` | Yes (`/api/runs` routes) | ULID of an active seeded `users` row |

| HTTP | `code` | When |
|------|--------|------|
| 401 | `UNAUTHORIZED` | Header missing, empty, or ULID not found / inactive |

**Frontend implication:** Until NextAuth/SSO exists, attach this header on every `/api/runs` `fetch` (e.g. from a dev user picker or env default). Do not treat this as a production security model.

`GET /api/health` does **not** require the header.

---

## Platform RBAC (effective role)

Roles (highest wins): `super_admin` > `admin` > `contributor` > `viewer`.

**Effective role** for a project = `max(users.global_role, project_roles.role)` using the hierarchy above.

| Endpoint | Minimum effective role |
|----------|------------------------|
| `GET /api/runs` | **viewer** |
| `GET /api/runs/:runId` | **viewer** |
| `POST /api/runs` | **admin** (global or project) |
| `POST /api/runs/.../result` | **contributor** |

Failures return **403** with `code: "INSUFFICIENT_PERMISSIONS"`.

---

## Seeded users (local testing)

Organisation slug: `relay-dev`. Re-seed with `pnpm db:seed`.

| Name | ULID (`x-relay-user-id`) | `global_role` | Typical use |
|------|--------------------------|---------------|-------------|
| Noel Quadri | `01SEED00000000000000000002` | `super_admin` | Full access |
| Shaun Sevume | `01SEED00000000000000000003` | `admin` | Create runs |
| Priya Nair | `01SEED00000000000000000004` | `contributor` | Update results |
| Marcus Webb | `01SEED00000000000000000005` | `admin` | Create runs |
| James O'Sullivan | `01SEED00000000000000000006` | `contributor` | Update results |
| Alex Viewer | `01SEED00000000000000000007` | `viewer` | Negative RBAC tests |

### Seeded fixtures for create run

| Field | ULID |
|-------|------|
| `projectId` (CTMS) | `01SEED00000000000000000010` |
| `testPlanId` (PLAN-001) | `01SEED00000000000000000400` |

Source of truth: `packages/db/src/seed/ids.ts`.

---

## GET /api/health

Liveness and MySQL connectivity check.

### Request

| | |
|--|--|
| Method | `GET` |
| Auth | None |

### Success — 200

```json
{
  "status": "ok",
  "app": "ok",
  "mysql": "ok",
  "timestamp": "2026-05-22T12:00:00.000Z"
}
```

### Degraded — 503

MySQL unreachable; `mysql` is `"error"` and `error` may describe the failure:

```json
{
  "status": "degraded",
  "app": "ok",
  "mysql": "error",
  "timestamp": "2026-05-22T12:00:00.000Z",
  "error": "..."
}
```

### Example

```bash
curl -s http://localhost:3000/api/health
```

---

## GET /api/runs

Project-scoped run list with per-run case count summary. Implemented by `listProjectRuns()` in `packages/db/src/runs/read.ts`.

### Request

| | |
|--|--|
| Method | `GET` |
| Path | `/api/runs` |
| Headers | `x-relay-user-id` |

#### Query parameters

| Param | Required | Default | Notes |
|-------|----------|---------|-------|
| `projectId` | Yes | — | 26-char ULID |
| `status` | No | — | `active`, `stalled`, `sealed`, or `archived` |
| `limit` | No | `20` | Integer 1–100 |

Results are ordered by `createdAt` descending (newest first).

#### Example

```bash
curl -s "http://localhost:3000/api/runs?projectId=01SEED00000000000000000010&limit=20" \
  -H "x-relay-user-id: 01SEED00000000000000000007"
```

### Success — 200

```json
{
  "data": {
    "runs": [
      {
        "id": "01KS82675M2CCD156MGZP87E1Z",
        "runRef": "RUN-0001",
        "title": "PLAN-001 — 22 May 2026",
        "status": "active",
        "environment": null,
        "createdAt": "2026-05-22T13:01:35.123Z",
        "caseCounts": {
          "total": 4,
          "passed": 1,
          "failed": 0,
          "blocked": 0,
          "skipped": 0,
          "notRun": 3
        }
      }
    ]
  }
}
```

`caseCounts.skipped` aggregates DB status `skip`.

### Errors

| HTTP | `code` | Typical cause |
|------|--------|----------------|
| 400 | `VALIDATION_ERROR` | Missing/invalid `projectId`, `status`, or `limit` |
| 401 | `UNAUTHORIZED` | Missing or invalid header |
| 403 | `INSUFFICIENT_PERMISSIONS` | Effective role below viewer for project |
| 500 | `INTERNAL_ERROR` | Unhandled exception |

---

## GET /api/runs/[runId]

Run metadata, case result summary, and execution case list (includes `testRunCaseId` for result updates). Implemented by `getRunDetail()`.

### Request

| | |
|--|--|
| Method | `GET` |
| Path | `/api/runs/{runId}` |
| Headers | `x-relay-user-id` |

#### Query parameters

| Param | Required | Notes |
|-------|----------|-------|
| `projectId` | Yes | Must match the run’s project; wrong project → **404** (no cross-project leakage) |

#### Example

```bash
curl -s "http://localhost:3000/api/runs/RUN_ULID?projectId=01SEED00000000000000000010" \
  -H "x-relay-user-id: 01SEED00000000000000000007"
```

### Success — 200

```json
{
  "data": {
    "id": "01KS82675M2CCD156MGZP87E1Z",
    "runRef": "RUN-0001",
    "title": "PLAN-001 — 22 May 2026",
    "status": "active",
    "environment": null,
    "createdAt": "2026-05-22T13:01:35.123Z",
    "testPlanId": "01SEED00000000000000000400",
    "projectId": "01SEED00000000000000000010",
    "isStalled": false,
    "caseCounts": {
      "total": 4,
      "passed": 0,
      "failed": 0,
      "blocked": 0,
      "skipped": 0,
      "notRun": 4
    },
    "testRunCases": [
      {
        "testRunCaseId": "01KS82675M794XJ0A1JDMH7M4N2C",
        "originalTestCaseId": "01SEED00000000000000000200",
        "caseRef": "TC-1001",
        "title": "Create study",
        "priority": "critical",
        "type": "functional",
        "assignedTo": null,
        "status": "not_run",
        "comment": null,
        "executedBy": null,
        "executedAt": null,
        "position": 0
      }
    ]
  }
}
```

Cases are ordered by `position` ascending.

### Errors

| HTTP | `code` | Typical cause |
|------|--------|----------------|
| 400 | `VALIDATION_ERROR` | Missing/invalid `projectId` |
| 401 | `UNAUTHORIZED` | Missing or invalid header |
| 403 | `INSUFFICIENT_PERMISSIONS` | Below viewer for project |
| 404 | `RUN_NOT_FOUND` | Run missing or `projectId` does not match run |
| 500 | `INTERNAL_ERROR` | Unhandled exception |

---

## POST /api/runs

Spawn a test run from a plan (atomic snapshot transaction). Implemented by `TestRunService.create()`.

### Request

| | |
|--|--|
| Method | `POST` |
| Path | `/api/runs` |
| Headers | `Content-Type: application/json`, `x-relay-user-id` |

#### Body

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `projectId` | string (ULID) | Yes | Must match plan’s project |
| `testPlanId` | string (ULID) | Yes | Plan must exist, not archived |
| `name` | string | No | 1–500 chars; default title generated if omitted |
| `environment` | string | No | 1–100 chars |
| `assigneeIds` | string[] (ULIDs) | No | Valid project users |
| `caseIds` | string[] (ULIDs) | No | Subset of plan cases; default = all plan cases |

#### Example

```bash
curl -s -X POST http://localhost:3000/api/runs \
  -H "Content-Type: application/json" \
  -H "x-relay-user-id: 01SEED00000000000000000003" \
  -d '{
    "projectId": "01SEED00000000000000000010",
    "testPlanId": "01SEED00000000000000000400"
  }'
```

### Success — 201

```json
{
  "data": {
    "id": "01KS7WDT7552RZEEQBGMJ6HVD6",
    "runRef": "RUN-0001",
    "title": "PLAN-001 — 22 May 2026",
    "status": "active",
    "caseCount": 4,
    "stepCount": 7,
    "environment": null,
    "createdAt": "2026-05-22T13:01:35.123Z",
    "testPlanId": "01SEED00000000000000000400",
    "projectId": "01SEED00000000000000000010"
  }
}
```

Use `data.id` as `runId`. Call `GET /api/runs/:runId?projectId=...` for `testRunCases[].testRunCaseId` when updating results.

### Errors

| HTTP | `code` | Typical cause |
|------|--------|----------------|
| 400 | `VALIDATION_ERROR` | Invalid JSON / Zod (missing `projectId`, bad ULID length, etc.) |
| 401 | `UNAUTHORIZED` | Missing or invalid `x-relay-user-id` |
| 403 | `INSUFFICIENT_PERMISSIONS` | Actor below admin (e.g. viewer) |
| 404 | `PLAN_NOT_FOUND` | Plan missing or wrong project |
| 409 | `PLAN_ARCHIVED` | Plan status is archived |
| 400 | `PLAN_EMPTY` | Plan has no linked cases |
| 400 | `CASES_NOT_IN_PLAN` | `caseIds` includes ID not on plan |
| 400 | `CASES_UNAVAILABLE` | Case not runnable (e.g. deleted) |
| 400 | `INVALID_ASSIGNEES` | Assignee not valid for project |
| 409 | `DUPLICATE_RUN_REF` | Ref counter collision (retry) |
| 503 | `REF_COUNTER_TIMEOUT` | Could not allocate run ref |
| 500 | `TRANSACTION_FAILED` | Unexpected DB failure |
| 500 | `INTERNAL_ERROR` | Unhandled exception |

#### Example — validation error (400)

```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "fieldErrors": { "projectId": ["Required"] },
      "formErrors": []
    }
  }
}
```

#### Example — insufficient permissions (403)

```json
{
  "error": {
    "code": "INSUFFICIENT_PERMISSIONS",
    "message": "Insufficient permissions to spawn a test run."
  }
}
```

---

## POST /api/runs/[runId]/cases/[runCaseId]/result

Update execution result fields on a run case (snapshot columns are immutable). Implemented by `ExecutionService.updateCaseResult()`.

### Request

| | |
|--|--|
| Method | `POST` |
| Path | `/api/runs/{runId}/cases/{runCaseId}/result` |
| Headers | `Content-Type: application/json`, `x-relay-user-id` |

Path parameters must be ULIDs for the run and the **test run case** row (not the original test case id).

#### Body

| Field | Type | Required | Notes |
|-------|------|----------|-------|
| `status` | enum | Yes | See below |
| `comment` | string \| null | No | Max 65535; omit to keep existing; `null` clears |

**`status` values (request):** `not_run`, `pass`, `fail`, `blocked`, `skip`, `skipped`

- `skipped` is accepted as an alias for `skip` (stored as `skip` in DB).
- Response `status` uses canonical DB values only (no `skipped`).

#### Example

```bash
curl -s -X POST "http://localhost:3000/api/runs/RUN_ULID/cases/RUN_CASE_ULID/result" \
  -H "Content-Type: application/json" \
  -H "x-relay-user-id: 01SEED00000000000000000004" \
  -d '{"status": "pass"}'
```

With comment:

```json
{ "status": "fail", "comment": "Step 3 assertion failed" }
```

### Success — 200

```json
{
  "data": {
    "testRunCaseId": "01KS7WDT794XJ0A1JDMH7M4N2C",
    "testRunId": "01KS7WDT7552RZEEQBGMJ6HVD6",
    "projectId": "01SEED00000000000000000010",
    "status": "pass",
    "comment": null,
    "executedBy": "01SEED00000000000000000004",
    "executedAt": "2026-05-22T13:01:36.456Z",
    "updatedAt": "2026-05-22T13:01:36.456Z"
  }
}
```

### Errors

| HTTP | `code` | Typical cause |
|------|--------|----------------|
| 400 | `VALIDATION_ERROR` | Invalid body / status enum |
| 401 | `UNAUTHORIZED` | Missing or invalid header |
| 403 | `INSUFFICIENT_PERMISSIONS` | Viewer or below |
| 404 | `RUN_NOT_FOUND` | Run ULID unknown (route or service) |
| 404 | `CASE_NOT_FOUND` | Run case not on this run |
| 409 | `RUN_NOT_EXECUTABLE` | Run not `active` (e.g. sealed) |
| 400 | `INVALID_STATUS` | Status failed service normalization |
| 500 | `TRANSACTION_FAILED` | DB error inside transaction |
| 500 | `INTERNAL_ERROR` | Unhandled exception |

#### Example — sealed run (409)

```json
{
  "error": {
    "code": "RUN_NOT_EXECUTABLE",
    "message": "Cannot update results on a run that is not active."
  }
}
```

---

## Frontend integration

Recommended first steps (no full screens required):

1. **Shared client helper** — `fetch` wrapper that sets `Content-Type` and `x-relay-user-id` on all `/api/runs` calls.
2. **Error parser** — map `{ error.code, error.message, error.details }` to user-visible messages.
3. **Health gate** — `GET /api/health` before app mutations; surface `degraded` when MySQL is down.
4. **Run discovery flow** — `GET /api/runs?projectId=...` → pick run → `GET /api/runs/:runId?projectId=...` → `POST .../result` with `testRunCaseId`.
5. **Create flow** — `POST /api/runs` → `GET /api/runs/:runId` (or list refresh) for case IDs.

Still deferred for HTTP (use server components or a later phase):

| Need | Status |
|------|--------|
| Test plans / case library reads | Not implemented |
| Step-level execution | Not implemented |
| Run seal / archive mutations | Not implemented |

---

## Verification

```bash
# Terminal 1
pnpm dev:reset   # if :3000 was broken
pnpm dev

# Terminal 2
pnpm build
pnpm api:validate
```

Automated coverage: `apps/web/scripts/validate-api.ts` (read list/detail, viewer access, cross-project blocked, create run, pass/fail result, sealed run).

---

## Related

| Document | Purpose |
|----------|---------|
| `docs/implementation/current-state.md` | Repo checkpoint and commands |
| `README.md` | Local setup and curl quick start |
| `docs/architecture/TestRunService-design.md` | Run spawn transaction design |
| `packages/db/src/seed/ids.ts` | Stable dev ULIDs |
