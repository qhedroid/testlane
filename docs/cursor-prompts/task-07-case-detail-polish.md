# Task 07 — Case detail polish, case navigation, sparkline tooltip

## Context from previous tasks

Branch: `mvp-test-cases`. Tasks 01–06 complete.

Schema v8. `Case` has: `id`, `caseKey`, `title`, `priority`, `type`, `assignee`, `folderId`, `preconditions`, `steps`, `tags`, `template`, `references`, `summary`, `customFieldValues`.

`CasesScreen.tsx` (the only file that changes here) currently:
- Renders a `CaseDetail` component at the bottom of the file.
- `CaseDetail` Details tab has a "Metadata" `dp-sec` block with a 2-column `dp-mg` grid. Current field order: Priority, Type, Assigned to, Folder, Suite, Automation, Summary (shown only if non-empty), References (shown only if non-empty), Template.
- After the Metadata section, a **separate** `dp-sec` block labelled "Custom fields" renders custom fields — this separate block must be removed.
- The sparkline Last Results column was added in Task 05. Each cell renders a status dot + 5 bars but has no hover tooltip.
- `displayedCases` is the full filtered list (before pagination). `pagedCases` is the paginated slice used to render `<tbody>` rows.

## Objective

### Part A — Reorder CaseDetail metadata + inline custom fields

**Goal:** Owner (Assigned to) and Template appear first in the metadata grid. Custom fields appear inline at the bottom of the same grid — no separate section label or `dp-sec` wrapper.

#### View mode (`dp-mg` grid)

Replace the current field order with:
1. Assigned to
2. Template
3. Priority
4. Type
5. Folder
6. Automation
7. References — **always show** (not conditional); display `"—"` when empty
8. Summary — **always show** (not conditional); use `gridColumn: 'span 2'`; display `"—"` when empty
9. ~~Suite~~ — **remove entirely** (it duplicates Folder)
10. Custom fields — rendered inline here, no section wrapper

The custom fields rendering (currently in the separate `dp-sec` block) should be moved to replace the old "Custom fields" section. Extract just the inner content (the `dp-mg` div with the field rows) and place it directly after the Summary row inside the existing Metadata `dp-mg` grid. Remove the outer `dp-sec` wrapper, the "Custom fields" `dp-sl` label, and the `borderBottom: 'none'` style from the Metadata section.

#### Edit mode (`dp-edit-grid` form)

Reorder form fields to: Assigned to first, Template second, then Priority, Type, Folder, References, Summary. Custom fields follow inline (they are already rendered below the edit grid; just remove the outer `dp-sec` wrapper around them and let them render as part of the same edit grid).

### Part B — Case navigation arrows in the detail panel header

**In `CasesScreen`**, compute the index of the currently open case within `displayedCases` (the full filtered list, not `pagedCases`):

```ts
const detailIdx = detailCaseId
  ? displayedCases.findIndex((c) => c.id === detailCaseId)
  : -1
```

Pass four new props to `CaseDetail`:

```ts
caseIndex: detailIdx          // 0-based index; -1 if no case selected
totalCases: displayedCases.length
onPrevCase: () => {
  if (detailIdx > 0) setDetailCaseId(displayedCases[detailIdx - 1].id)
}
onNextCase: () => {
  if (detailIdx < displayedCases.length - 1)
    setDetailCaseId(displayedCases[detailIdx + 1].id)
}
```

**In `CaseDetail`**, add the four props to the component signature and prop type.

In the `.dp-hd` header, insert the navigation block between the maximize button and the ID/title block:

```tsx
<div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
  <button
    type="button"
    className="btn"
    style={{ padding: '1px 5px' }}
    disabled={caseIndex <= 0}
    onClick={onPrevCase}
    title="Previous case"
  >
    <i className="ti ti-chevron-up" style={{ fontSize: 12 }} />
  </button>
  <span style={{
    fontFamily: 'var(--mono)',
    fontSize: 10.5,
    color: 'var(--text2)',
    minWidth: 44,
    textAlign: 'center',
  }}>
    {caseIndex >= 0 ? `${caseIndex + 1} / ${totalCases}` : ''}
  </span>
  <button
    type="button"
    className="btn"
    style={{ padding: '1px 5px' }}
    disabled={caseIndex >= totalCases - 1}
    onClick={onNextCase}
    title="Next case"
  >
    <i className="ti ti-chevron-down" style={{ fontSize: 12 }} />
  </button>
</div>
```

### Part C — Last Results sparkline tooltip

**What Testiny shows on hover:** run name, result (status), and who tested it. Our `CaseExecution` model has `status` and `assignee`; `DemoRun` has `name` and `runKey`. Show those.

#### C1 — Helper

Add this helper near `caseRecentStatuses` (and import `DemoRun` and `CaseExecution` from `demo-model` if not already imported):

```ts
function caseLastRun(
  runs: DemoRun[],
  caseId: string,
): { run: DemoRun; execution: CaseExecution } | null {
  for (let i = runs.length - 1; i >= 0; i--) {
    const ex = runs[i].executions[caseId]
    if (ex) return { run: runs[i], execution: ex }
  }
  return null
}
```

#### C2 — Tooltip state

```ts
const [sparkTooltip, setSparkTooltip] = useState<{
  caseId: string
  x: number
  y: number
} | null>(null)
```

#### C3 — Wire the `<td>` for Last Results

Add `onMouseEnter` / `onMouseLeave` to the Last Results `<td>`:

```tsx
<td
  onMouseEnter={(e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    setSparkTooltip({ caseId: c.id, x: rect.left, y: rect.bottom + 6 })
  }}
  onMouseLeave={() => setSparkTooltip(null)}
>
  {/* existing status dot + sparkline JSX unchanged */}
</td>
```

#### C4 — Render the tooltip

Render this alongside the context menu (at the end of the `CasesScreen` return, before the final closing `</div>`):

```tsx
{sparkTooltip ? (() => {
  const lr = caseLastRun(activeRuns, sparkTooltip.caseId)
  if (!lr) return null
  return (
    <div
      style={{
        position: 'fixed',
        top: sparkTooltip.y,
        left: sparkTooltip.x,
        zIndex: 300,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        boxShadow: '0 4px 16px rgba(0,0,0,.18)',
        padding: '8px 10px',
        fontSize: 11.5,
        minWidth: 190,
        pointerEvents: 'none',
      }}
    >
      <div style={{ fontWeight: 600, marginBottom: 5, color: 'var(--text1)' }}>
        {lr.run.name}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        <div>
          <span style={{ color: 'var(--text3)' }}>Result: </span>
          <span style={{ color: EXEC_COLOR[lr.execution.status], fontWeight: 600 }}>
            {lr.execution.status}
          </span>
        </div>
        {lr.execution.assignee ? (
          <div>
            <span style={{ color: 'var(--text3)' }}>Tested by: </span>
            <span>{displayAssigneeName(lr.execution.assignee)}</span>
          </div>
        ) : null}
        <div style={{ color: 'var(--text3)', fontSize: 10.5, marginTop: 1 }}>
          Run {lr.run.runKey}
        </div>
      </div>
    </div>
  )
})() : null}
```

### Part D — URL sync: selected case reflected in the address bar

When a case detail panel opens, the URL should change from `/DP/cases` to `/DP/cases/tc/TC-00001`. Closing the panel returns to `/DP/cases`. Deep-linking to `/DP/cases/tc/TC-00001` on page load should pre-open that case.

**Context:** `project-routes.ts` already has `testRunPath` / `parseTestRunKey` helpers for runs (wired into `[projectKey]/testruns/tr/[runKey]/page.tsx`) but the same pattern was never implemented for cases. We are implementing it now, following the exact same approach.

#### D1 — Add helpers to `apps/web/src/fresh/lib/project-routes.ts`

Add these two functions after `parseTestRunKey`:

```ts
/** Canonical test case path — with or without selected case key. */
export function testCasePath(projectKey: string, caseKey?: string): string {
  const base = projectPath(projectKey, 'cases')
  return caseKey ? `${base}/tc/${caseKey}` : base
}

/** Extract caseKey from /:projectKey/cases/tc/:caseKey paths. */
export function parseTestCaseKey(pathname: string): string | null {
  const parts = pathname.split('/').filter(Boolean)
  if (parts.length === 4 && parts[1] === MODULE_SLUGS.cases && parts[2] === 'tc') {
    return parts[3]
  }
  return null
}
```

Also update `switchProjectPath` to strip case selection when switching projects (add before the existing `parseTestRunKey` check):

```ts
if (parseTestCaseKey(pathname)) return projectPath(newProjectKey, 'cases')
```

#### D2 — Create the new Next.js page route

Create `apps/web/src/app/(app)/[projectKey]/cases/tc/[caseKey]/page.tsx`:

```tsx
import { CasesScreen } from '@/fresh/screens/CasesScreen'

export default function ProjectCaseDetailPage() {
  return <CasesScreen />
}
```

This mirrors `[projectKey]/testruns/tr/[runKey]/page.tsx` exactly.

#### D3 — Wire URL sync in `CasesScreen.tsx`

Import `usePathname` and `useRouter` from `'next/navigation'`, and import `testCasePath` and `parseTestCaseKey` from `'../lib/project-routes'`.

Add at the top of the `CasesScreen` component:

```ts
const pathname = usePathname()
const router = useRouter()
```

**On mount: pre-open the case from the URL.**

Add a one-time effect that runs when the component mounts with a deep-link URL:

```ts
useEffect(() => {
  const key = parseTestCaseKey(pathname)
  if (!key) return
  const match = activeCases.find((c) => c.caseKey === key)
  if (match) setDetailCaseId(match.id)
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []) // intentionally run only once on mount
```

**On selection change: update the URL.**

Add an effect that syncs `detailCaseId` → URL:

```ts
useEffect(() => {
  if (!activeProject.key) return
  const detail = detailCaseId ? activeCases.find((c) => c.id === detailCaseId) : null
  const target = testCasePath(activeProject.key, detail?.caseKey)
  if (target !== pathname) router.replace(target)
}, [detailCaseId]) // eslint-disable-line react-hooks/exhaustive-deps
```

> **Note:** Omit `pathname` and `router` from the dependency array deliberately — only `detailCaseId` should trigger this. The ESLint disable comment silences the exhaustive-deps warning.

---

## Files that will change
- `apps/web/src/fresh/lib/project-routes.ts`
- `apps/web/src/app/(app)/[projectKey]/cases/tc/[caseKey]/page.tsx` *(new file)*
- `apps/web/src/fresh/screens/CasesScreen.tsx`

## Files that will NOT change
- Any other file

---

## Step 1 — Read files before touching them

```
Read apps/web/src/fresh/lib/project-routes.ts
Read apps/web/src/fresh/screens/CasesScreen.tsx
```

---

## Step 2 — Make changes (Parts A, B, C, D)

Implement all three parts as described above.

---

## Step 3 — Build verification

```bash
cd /Users/shaun.sevume/Projects/Relay && pnpm build
```

Zero TypeScript errors required.

---

## Step 4 — Manual check

1. Start dev server: `cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev`
2. Open `/DP/testcases/` and click any case to open the detail panel.
3. **Metadata order**: confirm "Assigned to" and "Template" are the first two rows in the Details tab, above Priority and Type.
4. **No Suite row**: confirm "Suite" no longer appears in the metadata grid.
5. **References / Summary always visible**: confirm both rows appear even on cases where they are empty (showing "—").
6. **Custom fields inline**: confirm custom fields (Priority, References, Is Automated for the DP project) appear after Summary with no "Custom fields" section heading above them.
7. **Edit mode**: open edit mode, confirm Assigned to and Template appear first in the form.
8. **Navigation**: confirm ← / → buttons appear in the panel header with "X / N" counter. Click → to go to the next case, ← for previous. Confirm both buttons are disabled at the list boundaries.
9. **Sparkline tooltip**: hover over the Last Results cell of a case that has run history — confirm tooltip appears with run name, result (coloured), and tested-by if present. Hover over a case with no history — confirm no tooltip.
10. **URL sync**: click a case — confirm the address bar changes to `/DP/cases/tc/TC-00001` (or the matching key). Close the panel — confirm URL returns to `/DP/cases`. Navigate directly to `/DP/cases/tc/TC-00001` in a new tab — confirm the panel opens to that case automatically.
11. **Project switch**: while a case is open, switch projects — confirm the URL resets to the new project's `/cases` base (no stale case key).

---

## Step 5 — Commit

Run `git diff HEAD` and cross-check actual changes against the message below. Adjust if anything differs, then commit.

```
Test cases: metadata reorder, case navigation arrows, sparkline tooltip

`CasesScreen.tsx`
* Reordered CaseDetail metadata: Assigned to and Template are now the first two rows in view and edit mode
* Removed duplicate "Suite" row from metadata grid
* References and Summary now always shown (with "—" fallback); no longer conditional on non-empty values
* Removed standalone "Custom fields" dp-sec block; custom field rows now render inline at the bottom of the Metadata grid with no section separator
* Added `caseLastRun()` helper returning the most-recent DemoRun and CaseExecution for a case (iterates activeRuns newest-first)
* Added `sparkTooltip` state; Last Results `<td>` sets it on mouseenter/mouseleave; fixed tooltip card shows run name, status (coloured via EXEC_COLOR), tested-by assignee, and run key
* Added `caseIndex`, `totalCases`, `onPrevCase`, `onNextCase` props to CaseDetail; ← / → icon buttons in panel header with "X / N" mono counter; wired to displayedCases in CasesScreen
* Added `testCasePath` and `parseTestCaseKey` helpers to `project-routes.ts`; updated `switchProjectPath` to strip case selection on project switch
* Created `[projectKey]/cases/tc/[caseKey]/page.tsx` to handle deep-linked case URLs (renders same CasesScreen)
* CasesScreen reads `caseKey` from URL on mount via `parseTestCaseKey` to pre-open the correct case; updates URL via `router.replace` whenever `detailCaseId` changes
```

---

## Step 6 — Restart dev server

```bash
cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev
```
