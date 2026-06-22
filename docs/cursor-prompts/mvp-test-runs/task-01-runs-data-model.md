# Task 09 — Test Runs: Data Model & Routing Foundation

## Goal
Extend the data model to support execution result notes, a real execution audit log, and run editing. Add the URL route and helpers for `/testruns/tr/[runKey]/tc/[caseKey]`. Bump schema to v10.

---

## Context from previous tasks
- Stack: Next.js App Router, React, pnpm. Frontend-only prototype — no backend, no API calls.
- Persistence: `localStorage` key `relay-demo-v2` via `FreshProvider` + `useReducer`.
- Schema is currently v9. All migration steps live in `migrate-demo-state.ts`.
- `Case.id` is a globally-unique internal ID (e.g. `case-1734…-3`). `Case.caseKey` is the human-readable `TC-00001` display key.
- `DemoRun.runKey` is the human-readable run key, e.g. `"00001"`.
- `CaseExecution` is stored in `DemoRun.executions: Record<caseId, CaseExecution>`.
- Route helpers live in `apps/web/src/fresh/lib/project-routes.ts`.
- Current test-run routes: `/[projectKey]/testruns` and `/[projectKey]/testruns/tr/[runKey]`, both rendering `RunsScreen`.

---

## Files to change

### 1. `apps/web/src/fresh/data/demo-model.ts`

**Add** `ExecutionLogEntry` interface (after `CaseExecution`):
```ts
export interface ExecutionLogEntry {
  id: string
  caseId: string        // internal case id (matches executions key)
  at: string            // ISO timestamp
  by: string            // display name, e.g. "Shaun Sevume"
  from: ExecStatus
  to: ExecStatus
}
```

**Extend** `CaseExecution`:
```ts
export interface CaseExecution {
  status: ExecStatus
  assignee?: string
  stepResults: Record<string, ExecStatus>
  defects?: string[]
  resultNotes?: string   // ADD: free-text execution result notes
  testedAt?: string      // ADD: ISO timestamp of last status change (not 'Not run')
  testedBy?: string      // ADD: who set the last status
}
```

**Extend** `DemoRun`:
```ts
export interface DemoRun {
  // ... existing fields ...
  executionLog?: ExecutionLogEntry[]  // ADD: audit trail; optional so seeds without it still work
}
```

**Bump** `DEMO_SCHEMA_VERSION` from `9` to `10`.

---

### 2. `apps/web/src/fresh/data/migrate-demo-state.ts`

Add a v9 → v10 migration block (after the existing `< 9` block):

```ts
// v9 → v10: add executionLog to runs; add resultNotes/testedAt/testedBy to executions
if (state.schemaVersion < 10) {
  state = {
    ...state,
    runs: state.runs.map((r) => ({
      ...r,
      executionLog: r.executionLog ?? [],
      executions: Object.fromEntries(
        Object.entries(r.executions).map(([caseId, ex]) => [
          caseId,
          {
            ...ex,
            resultNotes: ex.resultNotes ?? '',
            testedAt: ex.testedAt ?? undefined,
            testedBy: ex.testedBy ?? undefined,
          },
        ]),
      ),
    })),
    schemaVersion: 10,
  }
}
```

Also update the final guard: `if (state.schemaVersion < DEMO_SCHEMA_VERSION)` — no changes needed there since the version constant is bumped.

---

### 3. `apps/web/src/fresh/data/FreshProvider.tsx`

**Add** `UPDATE_RUN` action to `FreshAction`:
```ts
| { type: 'UPDATE_RUN'; runId: string; patch: Partial<Pick<DemoRun, 'name' | 'description' | 'due' | 'planName'>> }
```

**Update** the `UPDATE_RUN_EXECUTION` reducer case to:
1. Apply the patch as before.
2. If `patch.status` is set AND differs from the previous status, append an `ExecutionLogEntry` to `run.executionLog`.
3. If the new status is not `'Not run'`, set `testedAt` to `new Date().toISOString()` and `testedBy` to `patch.assignee ?? ex.assignee ?? 'Shaun Sevume'` on the execution.

The updated reducer case:
```ts
case 'UPDATE_RUN_EXECUTION': {
  if (!runIsMutable(state, action.runId)) return state
  const runs = state.runs.map((r) => {
    if (r.id !== action.runId) return r
    const prev = r.executions[action.caseId] ?? { status: 'Not run' as ExecStatus, stepResults: {} }
    const newEx: CaseExecution = { ...prev, ...action.patch }
    // Append log entry if status changed
    let executionLog = r.executionLog ?? []
    if (action.patch.status && action.patch.status !== prev.status) {
      executionLog = [
        ...executionLog,
        {
          id: newId('log'),
          caseId: action.caseId,
          at: new Date().toISOString(),
          by: newEx.assignee ?? prev.assignee ?? 'Shaun Sevume',
          from: prev.status,
          to: action.patch.status,
        },
      ]
      // Track testedAt/testedBy when setting a real result
      if (action.patch.status !== 'Not run') {
        newEx.testedAt = new Date().toISOString()
        newEx.testedBy = newEx.assignee ?? prev.assignee ?? 'Shaun Sevume'
      }
    }
    return {
      ...r,
      executions: { ...r.executions, [action.caseId]: newEx },
      executionLog,
    }
  })
  next = { ...state, runs }
  break
}
```

**Add** `UPDATE_RUN` reducer case:
```ts
case 'UPDATE_RUN': {
  next = {
    ...state,
    runs: state.runs.map((r) =>
      r.id === action.runId ? { ...r, ...action.patch } : r,
    ),
  }
  break
}
```

**Add** `editRun` callback and expose it on context:
```ts
const editRun = useCallback(
  (runId: string, patch: Partial<Pick<DemoRun, 'name' | 'description' | 'due' | 'planName'>>) => {
    dispatch({ type: 'UPDATE_RUN', runId, patch })
  },
  [],
)
```

Add `editRun` to `FreshContextValue`, the `value` object, and the `useMemo` deps array.

---

### 4. `apps/web/src/fresh/lib/project-routes.ts`

Add two new helpers after the existing `testRunPath` / `parseTestRunKey`:

```ts
/** Canonical path for a specific test case inside a test run. */
export function testRunCasePath(projectKey: string, runKey: string, caseKey: string): string {
  return `${testRunPath(projectKey, runKey)}/tc/${caseKey}`
}

/** Extract caseKey from /:projectKey/testruns/tr/:runKey/tc/:caseKey paths. */
export function parseTestRunCaseKey(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean)
  // parts: [projectKey, 'testruns', 'tr', runKey, 'tc', caseKey]
  if (parts.length === 6 && parts[1] === MODULE_SLUGS.testruns && parts[2] === 'tr' && parts[4] === 'tc') {
    return parts[5]
  }
  return null
}
```

Also update `parseTestRunKey` to handle the 6-part URL (currently only handles 4 parts):
```ts
export function parseTestRunKey(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean)
  // /projectKey/testruns/tr/runKey  OR  /projectKey/testruns/tr/runKey/tc/caseKey
  if ((parts.length === 4 || parts.length === 6) && parts[1] === MODULE_SLUGS.testruns && parts[2] === 'tr') {
    return parts[3]
  }
  return null
}
```

---

### 5. New route file: `apps/web/src/app/(app)/[projectKey]/testruns/tr/[runKey]/tc/[caseKey]/page.tsx`

Create this file (mirrors the case-detail pattern from `/cases/tc/[caseKey]/page.tsx`):

```tsx
import '@/fresh/styles/prototype-runs.css'
import { RunsScreen } from '@/fresh/screens/RunsScreen'

export default function ProjectTestRunCaseDetailPage() {
  return <RunsScreen />
}
```

---

## What does NOT change
- `RunsScreen.tsx` — that is Task 10.
- `demo-seed.ts` seed data — seed runs that don't have `executionLog` will receive it via the migration.
- No backend, no API routes, no Docker config.

## After completing
Run `pnpm build` from the repo root. Zero TypeScript errors required before committing.
