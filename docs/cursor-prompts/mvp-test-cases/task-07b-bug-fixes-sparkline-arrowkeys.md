# Task 07b — Bug fixes: URL sync, folder default, per-bar sparkline tooltip, arrow key navigation

## Context from previous tasks

Branch: `mvp-test-cases`. Tasks 01–08 defined. Tasks 01–07 complete (commit b8f5c8a). Task 08 may or may not have been applied before this task — read the files fresh before touching them.

Schema v8. Three files change in this task.

---

## Root cause summary

**Bug 1 + 3 — Panel flash / project switch flicker**

`CasesScreen.tsx` uses `router.replace(target)` to sync the URL when a case is selected. Because `/DP/cases` and `/DP/cases/tc/TC-00001` are backed by *different* Next.js page files (`cases/page.tsx` vs `cases/tc/[caseKey]/page.tsx`), calling `router.replace` across those two routes triggers a full component remount every time a case is selected or deselected. This causes:
- The panel to flash open and immediately close (component remounts with `detailCaseId = null`).
- An infinite flicker when switching projects, because `ProjectRouteSync` and `CasesScreen`'s URL sync effect both call `router.replace` and fight each other.

Fix: replace `router.replace(target)` with `window.history.replaceState(null, '', target)`. This updates the browser address bar without triggering Next.js navigation — no remount, no conflict.

**Bug 2 — New case created in Unfiled instead of selected folder**

`CreateCaseModal` always initialises its `folderId` state to `''` (Unfiled). The modal is a global component rendered outside `CasesScreen`; it has no knowledge of which folder is selected. `openCreateCase` in `useFreshUI` accepts no arguments.

Fix: (a) add `createCaseFolderId: string | null` state to `FreshUIProvider` and expose it; (b) update `openCreateCase` to accept an optional `folderId` argument; (c) in `CreateCaseModal`, add a `useEffect` that resets `folderId` state from `createCaseFolderId` whenever the modal opens; (d) in `CasesScreen`, pass `targetFolderId` when calling `openCreateCase`.

**Improvement 1 — Per-bar sparkline tooltips**

The current tooltip is wired to the entire `<td>` and always shows the most-recent run. Each bar should show the details for its own specific run. Hovering a bar should give it a black outline. The tooltip should persist briefly after the mouse leaves (hover-delay dismiss pattern): mouse leaving a bar starts a ~400 ms timer; if the mouse enters the tooltip before the timer fires, the timer is cancelled; mouse leaving the tooltip restarts the timer.

**Improvement 2 — Arrow key case navigation**

When the detail panel is open, pressing ArrowUp/ArrowDown should navigate to the previous/next case in `displayedCases`. The handler must ignore events when a text input, textarea, or select has focus.

---

## Files that will change

- `apps/web/src/fresh/hooks/useFreshUI.tsx`
- `apps/web/src/fresh/components/CreateCaseModal.tsx`
- `apps/web/src/fresh/screens/CasesScreen.tsx`

## Files that will NOT change

- Any other file (including `project-routes.ts`, page files, FreshProvider, demo-model, etc.)

---

## Step 1 — Read files before touching them

```
Read apps/web/src/fresh/hooks/useFreshUI.tsx
Read apps/web/src/fresh/components/CreateCaseModal.tsx
Read apps/web/src/fresh/screens/CasesScreen.tsx
```

---

## Step 2 — Edit `useFreshUI.tsx`

### 2a — Extend the context interface

Add `createCaseFolderId` and update `openCreateCase` signature in `FreshUIContextValue`:

```ts
// Before:
createCaseOpen: boolean
openCreateCase: () => void
closeCreateCase: () => void

// After:
createCaseOpen: boolean
createCaseFolderId: string | null
openCreateCase: (folderId?: string | null) => void
closeCreateCase: () => void
```

### 2b — Add state and update the callback

In `FreshUIProvider`, add state for `createCaseFolderId`:

```ts
const [createCaseFolderId, setCreateCaseFolderId] = useState<string | null>(null)
```

Replace the existing `openCreateCase` callback:

```ts
// Before:
const openCreateCase = useCallback(() => setCreateCaseOpen(true), [])

// After:
const openCreateCase = useCallback((folderId?: string | null) => {
  setCreateCaseFolderId(folderId ?? null)
  setCreateCaseOpen(true)
}, [])
```

### 2c — Expose `createCaseFolderId` in the value object

In the `useMemo` value, add `createCaseFolderId`:

```ts
// Before:
() => ({
  searchOpen, openSearch, closeSearch,
  shortcutsOpen, openShortcuts, closeShortcuts,
  createCaseOpen, openCreateCase, closeCreateCase,
}),
[searchOpen, shortcutsOpen, createCaseOpen, openSearch, closeSearch, openShortcuts, closeShortcuts, openCreateCase, closeCreateCase]

// After:
() => ({
  searchOpen, openSearch, closeSearch,
  shortcutsOpen, openShortcuts, closeShortcuts,
  createCaseOpen, createCaseFolderId, openCreateCase, closeCreateCase,
}),
[searchOpen, shortcutsOpen, createCaseOpen, createCaseFolderId, openSearch, closeSearch, openShortcuts, closeShortcuts, openCreateCase, closeCreateCase]
```

---

## Step 3 — Edit `CreateCaseModal.tsx`

### 3a — Add `useEffect` to the React import

```ts
// Before:
import { useState } from 'react'

// After:
import { useEffect, useState } from 'react'
```

### 3b — Destructure `createCaseFolderId` from the hook

```ts
// Before:
const { createCaseOpen, closeCreateCase } = useFreshUI()

// After:
const { createCaseOpen, createCaseFolderId, closeCreateCase } = useFreshUI()
```

### 3c — Add effect to sync folder when modal opens

Add this effect immediately after the hook calls (before the early return `if (!createCaseOpen) return null`):

```ts
useEffect(() => {
  if (createCaseOpen) {
    setFolderId(createCaseFolderId ?? '')
  }
}, [createCaseOpen, createCaseFolderId])
```

No other changes to this file. The `submit()` reset of `folderId` to `''` can stay — it fires when the user submits, and the effect above will re-populate on next open anyway.

---

## Step 4 — Edit `CasesScreen.tsx`

Make the following four independent changes. Read the file first; apply each change in isolation.

### 4a — Fix URL sync: replace `router.replace` with `window.history.replaceState`

Find the URL sync effect (it watches `[detailCaseId]` and calls `router.replace`):

```ts
// Before:
useEffect(() => {
  if (!activeProject.key) return
  const detail = detailCaseId ? activeCases.find((c) => c.id === detailCaseId) : null
  const target = testCasePath(activeProject.key, detail?.caseKey)
  if (target !== pathname) router.replace(target)
}, [detailCaseId]) // eslint-disable-line react-hooks/exhaustive-deps

// After:
useEffect(() => {
  if (!activeProject.key) return
  const detail = detailCaseId ? activeCases.find((c) => c.id === detailCaseId) : null
  const target = testCasePath(activeProject.key, detail?.caseKey)
  if (target !== pathname) window.history.replaceState(null, '', target)
}, [detailCaseId]) // eslint-disable-line react-hooks/exhaustive-deps
```

Then remove the now-unused `useRouter` import and its usage:

```ts
// Before:
import { usePathname, useRouter } from 'next/navigation'
// ...
const router = useRouter()

// After:
import { usePathname } from 'next/navigation'
// (remove the `const router = useRouter()` line)
```

### 4b — Pass `targetFolderId` when calling `openCreateCase`

There are two call sites — the topbar "New case" button and the empty-state "Create test case" button. Update both:

```ts
// Before (both occurrences):
onClick={openCreateCase}

// After (both occurrences):
onClick={() => openCreateCase(targetFolderId)}
```

`targetFolderId` is already computed at this point in the component as:
```ts
const targetFolderId = selectedFolderId === '__unfiled__' ? null : selectedFolderId
```
No other changes are needed for this fix.

### 4c — Per-bar sparkline tooltips with hover-delay dismiss

#### 4c-1 — Add `caseBarRun` helper; remove `caseLastRun`

Replace the existing `caseLastRun` function with `caseBarRun`:

```ts
// Remove:
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

// Add in its place:
/**
 * Returns the run and execution for a specific sparkline bar.
 * barIndex 0 = most recent, 1 = second most recent, etc.
 */
function caseBarRun(
  runs: DemoRun[],
  caseId: string,
  barIndex: number,
): { run: DemoRun; execution: CaseExecution } | null {
  let count = 0
  for (let i = runs.length - 1; i >= 0; i--) {
    const ex = runs[i].executions[caseId]
    if (ex) {
      if (count === barIndex) return { run: runs[i], execution: ex }
      count++
    }
  }
  return null
}
```

#### 4c-2 — Update `sparkTooltip` state type and add hide-timer ref

Find the `sparkTooltip` useState declaration:

```ts
// Before:
const [sparkTooltip, setSparkTooltip] = useState<{
  caseId: string
  x: number
  y: number
} | null>(null)

// After:
const [sparkTooltip, setSparkTooltip] = useState<{
  caseId: string
  barIndex: number
  x: number
  y: number
} | null>(null)
const sparkHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
```

#### 4c-3 — Move hover handlers from `<td>` to individual bars

Find the Last Results `<td>`. It currently has `onMouseEnter` and `onMouseLeave` on the `<td>` element. Remove both handlers from the `<td>` — the `<td>` itself gets no mouse handlers.

Then update each bar `<div>` inside `Array.from({ length: 5 }).map((_, i) => ...)` to add per-bar hover logic. The bar currently looks like:

```tsx
// Before:
<div
  key={i}
  title={s ?? 'No data'}
  style={{
    width: 4,
    height: s ? 10 : 4,
    borderRadius: 1,
    background: s ? EXEC_COLOR[s] : 'var(--border)',
    opacity: s ? 1 : 0.4,
  }}
/>
```

Replace with:

```tsx
// After:
<div
  key={i}
  title={s ?? 'No data'}
  style={{
    width: 4,
    height: s ? 10 : 4,
    borderRadius: 1,
    background: s ? EXEC_COLOR[s] : 'var(--border)',
    opacity: s ? 1 : 0.4,
    outline: sparkTooltip?.caseId === c.id && sparkTooltip?.barIndex === i ? '1.5px solid #000' : 'none',
  }}
  onMouseEnter={s ? (e) => {
    if (sparkHideTimer.current) clearTimeout(sparkHideTimer.current)
    const rect = e.currentTarget.getBoundingClientRect()
    setSparkTooltip({ caseId: c.id, barIndex: i, x: rect.left, y: rect.bottom + 6 })
  } : undefined}
  onMouseLeave={s ? () => {
    sparkHideTimer.current = setTimeout(() => setSparkTooltip(null), 400)
  } : undefined}
/>
```

Only bars with actual data (`s` is truthy) get hover handlers and outline.

#### 4c-4 — Update the tooltip render block

Find the sparkTooltip render block near the end of the `CasesScreen` return (after the context menu block). Replace it entirely:

```tsx
// Before:
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
      ...
    </div>
  )
})() : null}

// After:
{sparkTooltip ? (() => {
  const lr = caseBarRun(activeRuns, sparkTooltip.caseId, sparkTooltip.barIndex)
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
        pointerEvents: 'auto',
      }}
      onMouseEnter={() => {
        if (sparkHideTimer.current) clearTimeout(sparkHideTimer.current)
      }}
      onMouseLeave={() => {
        sparkHideTimer.current = setTimeout(() => setSparkTooltip(null), 400)
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

The only structural changes from before are: `caseLastRun` → `caseBarRun(..., sparkTooltip.barIndex)`, `pointerEvents: 'none'` → `pointerEvents: 'auto'`, and the two new mouse handlers on the tooltip div. The inner content (run name, result, tested-by, run key) is unchanged.

### 4d — Arrow key case navigation

Add a `useEffect` for keyboard navigation. Place it alongside the other `useEffect` blocks near the top of `CasesScreen` (for example, after the `pendingEditRef` reset effect). This effect should be active only when a case detail is open:

```ts
useEffect(() => {
  if (!detail) return
  function onKey(e: KeyboardEvent) {
    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      if (detailIdx > 0) setDetailCaseId(displayedCases[detailIdx - 1].id)
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      if (detailIdx < displayedCases.length - 1) setDetailCaseId(displayedCases[detailIdx + 1].id)
    }
  }
  document.addEventListener('keydown', onKey)
  return () => document.removeEventListener('keydown', onKey)
}, [detail, detailIdx, displayedCases])
```

`detail`, `detailIdx`, and `displayedCases` are all already computed earlier in `CasesScreen` — no new variables needed.

---

## Step 5 — Build verification

```bash
cd /Users/shaun.sevume/Projects/Relay && pnpm build
```

Zero TypeScript errors required. Common things to check if build fails:
- `useRouter` fully removed (both the import and `const router = useRouter()`)
- `createCaseFolderId` added to both the interface and the `useMemo` deps array in `useFreshUI`
- `sparkHideTimer` type is `ReturnType<typeof setTimeout> | null` (works in both browser and Node typings)

---

## Step 6 — Manual check

1. Start dev server: `cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev`

2. **Bug 1 fix — panel stability**: Create a new project, add 5 unfiled test cases via Quick create. Click any case. The right panel should open and stay open. It must not flash and close.

3. **Bug 3 fix — project switch**: While the detail panel is open in one project, switch to another project via the project switcher. The panel should close cleanly and the URL should change to the new project's `/cases` base. No flickering.

4. **Bug 2 fix — folder default**: Select a folder in the sidebar. Click "New case". In the Create test case modal, confirm the Folder dropdown is pre-selected to the folder you selected (not Unfiled). Select a different folder and confirm it also pre-selects correctly next time.

5. **Improvement 1 — per-bar tooltips**: Hover over individual bars in the Last Results column on a case with run history. Each bar should show a tooltip for its own run (different run names for different bars). The hovered bar should get a visible black outline. Move the mouse off a bar then quickly onto the tooltip — the tooltip should stay. Move the mouse off the tooltip — it should disappear after ~400ms.

6. **Improvement 2 — arrow keys**: Open the detail panel. Press ArrowDown — it should navigate to the next case. Press ArrowUp — previous case. Confirm the keys do nothing when a text input is focused (click into a text field in the panel, press ArrowDown, and verify it types the cursor rather than navigating).

---

## Step 7 — Commit

Run `git diff HEAD` and cross-check against the message below. Adjust if anything differs.

```
Cases: fix panel flash, folder default, per-bar sparkline, arrow key nav

`useFreshUI.tsx`
* Added `createCaseFolderId: string | null` state and exposed it in context
* Updated `openCreateCase` to accept optional `folderId?: string | null`; stores it before opening the modal

`CreateCaseModal.tsx`
* Added `useEffect` import
* Destructures `createCaseFolderId` from `useFreshUI`
* Resets `folderId` state from `createCaseFolderId` each time the modal opens, so the folder dropdown pre-selects the folder active in CasesScreen

`CasesScreen.tsx`
* Replaced `router.replace(target)` with `window.history.replaceState(null, '', target)` in the URL sync effect; removed `useRouter` import and declaration — fixes panel flash on case open/close and project switch flicker
* Updated both `openCreateCase()` call sites to pass `targetFolderId`, wiring the selected folder into the modal
* Replaced `caseLastRun` helper with `caseBarRun(runs, caseId, barIndex)` which returns the run for a specific bar index (0 = most recent)
* Changed `sparkTooltip` state to include `barIndex`; added `sparkHideTimer` ref for hover-delay dismiss
* Removed `onMouseEnter`/`onMouseLeave` from the Last Results `<td>`; moved per-bar hover handlers to each bar `<div>` — bars with no data get no handler; hovered bar shows black outline via `outline` style
* Tooltip uses `pointerEvents: 'auto'` and cancels the hide timer on `mouseEnter`, restarts it on `mouseLeave` (sticky tooltip pattern)
* Added `keydown` effect for arrow key navigation: ArrowUp/Down navigate prev/next case when panel is open; events from INPUT/TEXTAREA/SELECT are ignored
```

---

## Step 8 — Restart dev server

```bash
cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev
```
