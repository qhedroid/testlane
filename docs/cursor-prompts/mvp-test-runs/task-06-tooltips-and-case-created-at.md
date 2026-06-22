# Task 06 — Tooltips + Case.createdAt (Schema v11)

## Context from previous tasks

Branch: `mvp-test-runs`. Tasks 01–05 complete.

- Schema is currently v10. All migrations live in `migrate-demo-state.ts`.
- `Case` currently has `updatedAt: string` but NO `createdAt` field.
- `formatRelativeTime(iso: string): string` is exported from `demo-model.ts` and already imported in `RunsScreen`.
- `testRunPath(projectKey, runKey?)` and `testCasePath(projectKey, caseKey?)` are in `project-routes.ts`.
- `caseKeyToSlug(caseKey)` was added in Task 03 — use it when building tooltip links to case detail URLs.
- The sparkline tooltip in `CasesScreen` currently shows: run name (bold), Result (coloured), Tested by, run key. It uses `caseBarRun(activeRuns, caseId, barIndex)` which returns `{ run: DemoRun, execution: CaseExecution }`.
- The case ID `.ec-cid` span in `RunsScreen`'s case list currently has no hover tooltip.
- `DemoRun.runKey` is already set (e.g. `"00001"`).
- `CaseExecution.testedAt` and `CaseExecution.testedBy` were added in Task 01 (schema v10).

---

## Objective

Three improvements:

1. **Add `Case.createdAt`** — schema v11, migration sets `createdAt = updatedAt` for existing cases.
2. **Update the sparkline bar tooltip** in `CasesScreen` to match Testiny's format: link to the run, run name, result, tested at, tested by.
3. **Add a hover tooltip on the case ID** (`.ec-cid`) in `RunsScreen`'s case list: "Go to test case: TC-XXXXX" (hyperlink), "Created: X ago", "Last modified: X ago".

---

## Verified Testiny tooltip formats (reference)

**Sparkline bar tooltip** (Test Cases page):
```
Go to execution: [run key as hyperlink]
Test run:        [run name]
Result:          [status — coloured]
Tested at:       [relative time]
Tested by:       [name]
```

**Case ID hover tooltip** (Test Runs page):
```
Go to test case: [TC-XXXXX as hyperlink]
Created:         [relative time]
Last modified:   [relative time]
```

---

## Files to change

### 1. `apps/web/src/fresh/data/demo-model.ts`

Add `createdAt` to `Case` (optional so seed data without it still type-checks):
```ts
export interface Case {
  // ... existing fields ...
  updatedAt: string
  createdAt?: string   // ADD: ISO timestamp of case creation; optional for back-compat
  // ... rest ...
}
```

Bump `DEMO_SCHEMA_VERSION` from `10` to `11`.

---

### 2. `apps/web/src/fresh/data/migrate-demo-state.ts`

Add a v10 → v11 migration block (after the existing `< 10` block):

```ts
// v10 → v11: add createdAt to cases (proxy from updatedAt for existing cases)
if (state.schemaVersion < 11) {
  state = {
    ...state,
    cases: state.cases.map((c) => ({
      ...c,
      createdAt: c.createdAt ?? c.updatedAt,
    })),
    schemaVersion: 11,
  }
}
```

---

### 3. `apps/web/src/fresh/data/FreshProvider.tsx`

In the `CREATE_CASE` reducer (or wherever `addCase` builds the new case object), set `createdAt`:

```ts
// When constructing a new Case, add:
createdAt: new Date().toISOString(),
updatedAt: new Date().toISOString(),
```

Read `FreshProvider.tsx` to find the exact location — look for where `id: newId('case')` is used to build the new case. Add `createdAt` alongside the existing `updatedAt`.

Also update `REPLACE_CASE` (the edit/save action): **do not** overwrite `createdAt` when editing — only `updatedAt` should update on edit. Ensure the patch preserves the original `createdAt`:
```ts
// In REPLACE_CASE, the incoming case object should carry createdAt from the draft.
// No change needed if the draft already copies createdAt from the original.
// Verify this is the case; if not, preserve it:
const preserved = { ...action.case, createdAt: existing.createdAt ?? action.case.createdAt }
```

---

### 4. `apps/web/src/fresh/screens/CasesScreen.tsx`

Import `testRunPath` from `'../lib/project-routes'` (if not already imported).
Import `useRouter` from `'next/navigation'` (if not already imported — it is used for run navigation).

**Update the sparkline tooltip** to match Testiny. The tooltip is rendered as a fixed-position `div` near `sparkTooltip.x / sparkTooltip.y`. Replace its content with:

```tsx
<div /* existing fixed-position container styles unchanged */>
  {/* Row 1 — link to the run */}
  <div style={{ marginBottom: 6 }}>
    <span style={{ color: 'var(--text3)', fontSize: 11 }}>Go to execution: </span>
    <a
      href={testRunPath(activeProject.key, lr.run.runKey)}
      onClick={(e) => { e.preventDefault(); router.push(testRunPath(activeProject.key, lr.run.runKey)) }}
      style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 11, textDecoration: 'none' }}
    >
      {lr.run.runKey}
    </a>
  </div>
  {/* Row 2 — run name */}
  <div style={{ display: 'flex', gap: 6, fontSize: 11, marginBottom: 3 }}>
    <span style={{ color: 'var(--text3)', minWidth: 72 }}>Test run:</span>
    <span style={{ color: 'var(--text)', fontWeight: 500 }}>{lr.run.name}</span>
  </div>
  {/* Row 3 — result */}
  <div style={{ display: 'flex', gap: 6, fontSize: 11, marginBottom: 3 }}>
    <span style={{ color: 'var(--text3)', minWidth: 72 }}>Result:</span>
    <span style={{ color: EXEC_COLOR[lr.execution.status], fontWeight: 600 }}>{lr.execution.status}</span>
  </div>
  {/* Row 4 — tested at (only if testedAt is set) */}
  {lr.execution.testedAt && (
    <div style={{ display: 'flex', gap: 6, fontSize: 11, marginBottom: 3 }}>
      <span style={{ color: 'var(--text3)', minWidth: 72 }}>Tested at:</span>
      <span style={{ color: 'var(--text2)' }}>{formatRelativeTime(lr.execution.testedAt)}</span>
    </div>
  )}
  {/* Row 5 — tested by (only if set) */}
  {lr.execution.testedBy && (
    <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
      <span style={{ color: 'var(--text3)', minWidth: 72 }}>Tested by:</span>
      <span style={{ color: 'var(--text2)' }}>{displayAssigneeName(lr.execution.testedBy)}</span>
    </div>
  )}
</div>
```

Import `formatRelativeTime` from `'../data/demo-model'` if not already imported.
Import `displayAssigneeName` if it is already defined in `CasesScreen` — check the file. If not, use the assignee string directly.

The existing `onMouseEnter`/`onMouseLeave` hover-delay-dismiss behaviour on the tooltip container must be preserved unchanged.

---

### 5. `apps/web/src/fresh/screens/RunsScreen.tsx`

Import `testCasePath` and `caseKeyToSlug` from `'../lib/project-routes'` (if not already imported).
Import `formatRelativeTime` from `'../data/demo-model'` (already imported — verify).
Import `useRouter` (already imported — verify).

**Add case ID hover tooltip state** (near other local state declarations):

```tsx
const [caseIdTooltip, setCaseIdTooltip] = useState<{
  caseId: string
  x: number
  y: number
} | null>(null)
const caseIdHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
```

**Update the `.ec-cid` span** in the case list row to trigger the tooltip:

```tsx
<div
  className="ec-cid"
  onMouseEnter={(e) => {
    if (caseIdHideTimer.current) clearTimeout(caseIdHideTimer.current)
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
    setCaseIdTooltip({ caseId: row.caseId, x: rect.left, y: rect.bottom + 6 })
  }}
  onMouseLeave={() => {
    caseIdHideTimer.current = setTimeout(() => setCaseIdTooltip(null), 300)
  }}
>
  {row.case.caseKey ?? row.case.id}
</div>
```

**Render the tooltip** (near the end of the component, alongside other fixed-position overlays):

```tsx
{caseIdTooltip && (() => {
  const c = getCase(caseIdTooltip.caseId)
  if (!c) return null
  const caseSlug = caseKeyToSlug(c.caseKey ?? '')
  const caseHref = testCasePath(activeProject.key, c.caseKey)
  return (
    <div
      style={{
        position: 'fixed',
        top: caseIdTooltip.y,
        left: caseIdTooltip.x,
        zIndex: 300,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        boxShadow: '0 4px 16px rgba(0,0,0,.18)',
        padding: '8px 10px',
        fontSize: 11.5,
        minWidth: 210,
        pointerEvents: 'auto',
      }}
      onMouseEnter={() => {
        if (caseIdHideTimer.current) clearTimeout(caseIdHideTimer.current)
      }}
      onMouseLeave={() => {
        caseIdHideTimer.current = setTimeout(() => setCaseIdTooltip(null), 300)
      }}
    >
      {/* Row 1 — link to test case */}
      <div style={{ marginBottom: 6 }}>
        <span style={{ color: 'var(--text3)', fontSize: 11 }}>Go to test case: </span>
        <a
          href={caseHref}
          onClick={(e) => { e.preventDefault(); router.push(caseHref) }}
          style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 11, textDecoration: 'none' }}
        >
          {c.caseKey ?? c.id}
        </a>
      </div>
      {/* Row 2 — created */}
      {c.createdAt && (
        <div style={{ display: 'flex', gap: 6, fontSize: 11, marginBottom: 3 }}>
          <span style={{ color: 'var(--text3)', minWidth: 88 }}>Created:</span>
          <span style={{ color: 'var(--text2)' }}>{formatRelativeTime(c.createdAt)}</span>
        </div>
      )}
      {/* Row 3 — last modified */}
      <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
        <span style={{ color: 'var(--text3)', minWidth: 88 }}>Last modified:</span>
        <span style={{ color: 'var(--text2)' }}>{formatRelativeTime(c.updatedAt)}</span>
      </div>
    </div>
  )
})()}
```

---

## Files that will NOT change
- `project-routes.ts`
- `prototype-runs.css`, `fresh.css`
- `CreateRunModal.tsx`, `AddCasesToRunModal.tsx`
- Any route `page.tsx` files
- `apps/web/src/legacy/**`

---

## Step 1 — Read files before touching them

```
Read apps/web/src/fresh/data/demo-model.ts
Read apps/web/src/fresh/data/migrate-demo-state.ts
Read apps/web/src/fresh/data/FreshProvider.tsx
Read apps/web/src/fresh/screens/CasesScreen.tsx
Read apps/web/src/fresh/screens/RunsScreen.tsx
```

---

## Step 2 — Make changes

Apply in order: `demo-model.ts` → `migrate-demo-state.ts` → `FreshProvider.tsx` → `CasesScreen.tsx` → `RunsScreen.tsx`.

---

## Step 3 — Build verification

```bash
cd /Users/shaun.sevume/Projects/Relay && pnpm build
```

Zero TypeScript errors required.

---

## Step 4 — Manual check

1. Start dev server: `cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev`
2. Open browser DevTools → Application → Local Storage → `relay-demo-v2`. Confirm `schemaVersion` is `11` and existing cases have `createdAt` set.
3. Create a new test case — confirm `createdAt` is set on the new case in localStorage.
4. **Sparkline tooltip (Test Cases page)**: hover over a sparkline bar for a case that has run history — confirm tooltip shows: "Go to execution: [run key]" (clickable), "Test run:", "Result:", "Tested at:" (if set), "Tested by:". Click the run key link — confirm navigation to that test run.
5. **Case ID tooltip (Test Runs page)**: open a test run, hover over a case ID in the list — confirm tooltip shows: "Go to test case: TC-XXXXX" (clickable), "Created:", "Last modified:". Click the TC-XXXXX link — confirm navigation to that test case on the Test Cases page.
6. Confirm the tooltip disappears after moving the mouse away (after the dismiss delay).
7. Confirm tooltip stays visible when mouse moves from the trigger onto the tooltip card itself.

---

## Step 5 — Commit

Run `git diff HEAD` and cross-check actual changes against the message below. Adjust if anything differs, then commit.

```
Test cases/runs: Case.createdAt schema v11, Testiny-style tooltips

`demo-model.ts`
* Added optional `createdAt?: string` field to `Case`
* Bumped `DEMO_SCHEMA_VERSION` from 10 to 11

`migrate-demo-state.ts`
* Added v10→v11 migration: sets `createdAt = updatedAt` for all existing cases

`FreshProvider.tsx`
* `CREATE_CASE` reducer now sets `createdAt: new Date().toISOString()` on new cases
* `REPLACE_CASE` preserves original `createdAt` (does not overwrite on edit)

`CasesScreen.tsx`
* Updated sparkline bar tooltip to Testiny format: "Go to execution" link, test run name, result (coloured), tested at, tested by
* Link navigates to the test run via `router.push(testRunPath(...))`

`RunsScreen.tsx`
* Added `caseIdTooltip` state and hover handlers on `.ec-cid` spans in the case list
* Tooltip shows: "Go to test case: TC-XXXXX" hyperlink (navigates to test case detail), "Created" relative time, "Last modified" relative time
* Tooltip uses same hover-delay-dismiss pattern as sparkline tooltip
```

---

## Step 6 — Restart dev server

```bash
cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev
```
