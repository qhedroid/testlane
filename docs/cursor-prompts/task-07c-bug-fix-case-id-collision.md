# Task 07c — Bug fix: case id collision across projects (schema v9)

## Context from previous tasks

Branch: `mvp-test-cases`. Tasks 01–07b complete. Schema is v8. Read all files fresh before touching them.

Three files change in this task.

---

## Root cause

`addCase` in `FreshProvider.tsx` generates case ids using `nextCaseId(num)`, which returns `` `TC-${1000 + num}` `` — e.g. `TC-1001` for counter 1. Every project's counter starts at 1, so every project's first case gets `id = "TC-1001"`, second gets `TC-1002`, and so on. Because `REPLACE_CASE` in the reducer matches cases by `id` across the entire `state.cases` array (not filtered by project), editing a case in project A silently replaces the same-id case in project B too — overwriting its `projectId` with project A's id. After that, `listActiveProjectTestCases` returns two cases with `id = "TC-1001"` for project A, and React throws a duplicate-key error on `<tr key={c.id}>`.

The fix has two parts:

1. **Code fix** — replace `nextCaseId(...)` with `newId('case')` in `addCase`. `newId` produces a timestamp+counter string (e.g. `case-1750000000000-1`) that is globally unique across all projects. The `caseKey` (`TC-00001`) is still computed separately by the `ADD_CASE` reducer and is unchanged.

2. **Migration** — existing localStorage may already contain cases with collision-prone ids. The v8→v9 migration remaps any case whose `id` matches `/^TC-\d{4}$/` (the four-digit pattern from `nextCaseId`, e.g. `TC-1001`) to a fresh `newId('case')`, then rewrites matching keys in `run.executions` and `run.caseOrder`.

`newId` is already imported in `FreshProvider.tsx` from `'./demo-model'`. No new imports needed in any file.

---

## Files that will change

- `apps/web/src/fresh/data/demo-model.ts`
- `apps/web/src/fresh/data/migrate-demo-state.ts`
- `apps/web/src/fresh/data/FreshProvider.tsx`

## Files that will NOT change

- Any other file (including `CasesScreen.tsx`, `useFreshUI.tsx`, `ui-utils.ts`, page files, etc.)

---

## Step 1 — Read files before touching them

```
Read apps/web/src/fresh/data/demo-model.ts
Read apps/web/src/fresh/data/migrate-demo-state.ts
Read apps/web/src/fresh/data/FreshProvider.tsx
```

---

## Step 2 — Edit `demo-model.ts`

Bump `DEMO_SCHEMA_VERSION` from 8 to 9:

```ts
// Before:
export const DEMO_SCHEMA_VERSION = 8

// After:
export const DEMO_SCHEMA_VERSION = 9
```

No other changes in this file.

---

## Step 3 — Edit `migrate-demo-state.ts`

Find the end of the `migrateDemoState` try-block — specifically the v7→v8 block and the final schema-version catch-all that immediately follows it:

```ts
    // v7 → v8: assign caseKey to cases that are missing it
    if (state.schemaVersion < 8) {
      const counterByProject: Record<string, number> = { ...state.nextCaseNumByProject }
      state = {
        ...state,
        cases: state.cases.map((c) => {
          if (c.caseKey) return c
          const num = counterByProject[c.projectId] ?? 1
          counterByProject[c.projectId] = num + 1
          return { ...c, caseKey: formatCaseKey(num) }
        }),
        nextCaseNumByProject: counterByProject,
        schemaVersion: 8,
      }
    }
    if (state.schemaVersion < DEMO_SCHEMA_VERSION) {
      state = { ...state, schemaVersion: DEMO_SCHEMA_VERSION }
    }
```

Insert the v8→v9 block between them (do not change any other line):

```ts
    // v7 → v8: assign caseKey to cases that are missing it
    if (state.schemaVersion < 8) {
      const counterByProject: Record<string, number> = { ...state.nextCaseNumByProject }
      state = {
        ...state,
        cases: state.cases.map((c) => {
          if (c.caseKey) return c
          const num = counterByProject[c.projectId] ?? 1
          counterByProject[c.projectId] = num + 1
          return { ...c, caseKey: formatCaseKey(num) }
        }),
        nextCaseNumByProject: counterByProject,
        schemaVersion: 8,
      }
    }
    // v8 → v9: replace collision-prone TC-NNNN case ids with globally unique ids.
    // nextCaseId() used TC-${1000+num} — always exactly 4 digits, e.g. TC-1001.
    // Multiple projects starting at counter 1 all produce the same ids, causing
    // REPLACE_CASE to corrupt cases across projects. Reassign with newId('case').
    if (state.schemaVersion < 9) {
      const idMap = new Map<string, string>()
      const cases = state.cases.map((c) => {
        if (/^TC-\d{4}$/.test(c.id)) {
          const freshId = newId('case')
          idMap.set(c.id, freshId)
          return { ...c, id: freshId }
        }
        return c
      })
      const runs = idMap.size === 0 ? state.runs : state.runs.map((r) => ({
        ...r,
        caseOrder: r.caseOrder.map((id) => idMap.get(id) ?? id),
        executions: Object.fromEntries(
          Object.entries(r.executions).map(([caseId, ex]) => [idMap.get(caseId) ?? caseId, ex]),
        ),
      }))
      state = { ...state, cases, runs, schemaVersion: 9 }
    }
    if (state.schemaVersion < DEMO_SCHEMA_VERSION) {
      state = { ...state, schemaVersion: DEMO_SCHEMA_VERSION }
    }
```

`newId` is already imported at the top of `migrate-demo-state.ts` — no import change needed.

---

## Step 4 — Edit `FreshProvider.tsx`

### 4a — Remove the `nextCaseId` import

```ts
// Before:
import { nextCaseId } from './ui-utils'

// After:
// (delete this line entirely)
```

### 4b — Fix the id generation in `addCase`

Find the `addCase` useCallback and locate this line inside it:

```ts
// Before:
const id = nextCaseId(getActiveProjectNextCaseNum(state))

// After:
const id = newId('case')
```

`newId` is already imported from `'./demo-model'` — no import change needed. `getActiveProjectNextCaseNum` is still used elsewhere in the same callback, so do not remove it.

---

## Step 5 — Build verification

```bash
cd /Users/shaun.sevume/Projects/Relay && pnpm build
```

Zero TypeScript errors required. Common things to check if build fails:
- `nextCaseId` import fully removed from `FreshProvider.tsx` (TS will error if the import is left but unused, or if `nextCaseId` call remains)
- The `idMap` variable in the migration is typed correctly — `Map<string, string>` is inferred from `new Map<string, string>()`

---

## Step 6 — Manual check

1. Start dev server: `cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev`

2. **Clear localStorage once** so the v9 migration runs on existing data: open DevTools → Application → Local Storage → delete the `relay-demo-v2` key → reload the page.

3. **Edit/save no longer duplicates**: Open any test case, click Edit, change the title, save. Confirm the row updates in place — no duplicate row appears and no React key warning in the console.

4. **Cross-project safety**: Create a second project via the project switcher. Add a test case to it (it will now get `id = "case-..."` rather than `TC-1001`). Switch back to the first project and edit a case. Confirm only that case changes; the second project's case is unaffected.

5. **Run executions preserved**: If any cases had run history before the migration, confirm the sparkline bars and run results still show correctly after clearing localStorage and reloading (the migration rewrites execution keys alongside case ids).

---

## Step 7 — Commit

Run `git diff HEAD` and cross-check against the message below. Adjust if anything differs.

```
Cases: fix case id collision across projects (schema v9)

`demo-model.ts`
* Bumped DEMO_SCHEMA_VERSION from 8 to 9

`migrate-demo-state.ts`
* Added v8→v9 migration: detects cases whose id matches /^TC-\d{4}$/ (the
  collision-prone nextCaseId format), remaps each to a fresh newId('case'),
  and rewrites matching keys in run.executions and run.caseOrder

`FreshProvider.tsx`
* Replaced nextCaseId(getActiveProjectNextCaseNum(state)) with newId('case')
  in addCase — case ids are now globally unique across projects
* Removed unused nextCaseId import from './ui-utils'
```

---

## Step 8 — Restart dev server

```bash
cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev
```
