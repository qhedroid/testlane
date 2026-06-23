# Task 07 — Add Cases to Run

## Context from previous tasks

Branch: `mvp-test-runs`. Tasks 01–06 complete.

- Stack: Next.js App Router, React, pnpm. Frontend-only prototype — no backend.
- `DemoRun.caseOrder: string[]` holds the ordered list of internal case IDs in the run.
- `DemoRun.executions: Record<caseId, CaseExecution>` holds results per case.
- `useFresh()` exposes: `activeRuns`, `activeCases`, `activeFolders`, `activeProject`, `isRunSealed`.
- The `FreshProvider` `UPDATE_RUN` action already exists (added in Task 01) — do not confuse it with the new action.
- The case list search bar in `RunsScreen` sits inside `.ec-list-hd` (the header above the case list). The "+ Add cases" button should go to the **left** of the search bar.
- The empty-run "Add to test run" button (added in Task 05) should also trigger the same modal — wire it up here.
- `activeFolders` from `useFresh()` is `Folder[]` for the active project — use it for folder grouping in the modal.
- `folderLabel(folders, folderId)` from `demo-model` formats a folder name — import it if needed.
- No Tailwind. No backend changes.

---

## Objective

Allow users to add cases from the current project to an open (unsealed) test run.

1. **New `ADD_CASES_TO_RUN` action** in `FreshProvider` — appends case IDs to `run.caseOrder`, deduplicating against existing entries.
2. **New `AddCasesToRunModal` component** — searchable, folder-grouped, checkbox list of project cases not already in the run. "Add N cases" confirm button.
3. **"+ Add cases" button** in `RunsScreen` to the left of the search bar (only visible when the run is not sealed).
4. **Wire the empty-run "Add to test run" button** (from Task 05) to open the same modal.

---

## Files to change

### 1. `apps/web/src/fresh/data/FreshProvider.tsx`

**Add action type:**
```ts
| { type: 'ADD_CASES_TO_RUN'; runId: string; caseIds: string[] }
```

**Add reducer case** (after `UPDATE_RUN`):
```ts
case 'ADD_CASES_TO_RUN': {
  next = {
    ...state,
    runs: state.runs.map((r) => {
      if (r.id !== action.runId) return r
      const existing = new Set(r.caseOrder)
      const newIds = action.caseIds.filter((id) => !existing.has(id))
      return { ...r, caseOrder: [...r.caseOrder, ...newIds] }
    }),
  }
  break
}
```

**Add `addCasesToRun` callback:**
```ts
const addCasesToRun = useCallback(
  (runId: string, caseIds: string[]) => {
    dispatch({ type: 'ADD_CASES_TO_RUN', runId, caseIds })
  },
  [],
)
```

Add `addCasesToRun` to `FreshContextValue`, the `value` object, and the `useMemo` deps array.

---

### 2. New file: `apps/web/src/fresh/components/AddCasesToRunModal.tsx`

```tsx
'use client'

import { useMemo, useState } from 'react'
import { useFresh } from '../data/FreshProvider'
import { folderLabel } from '../data/demo-model'

interface AddCasesToRunModalProps {
  open: boolean
  runId: string | undefined
  onClose: () => void
}

export function AddCasesToRunModal({ open, runId, onClose }: AddCasesToRunModalProps) {
  const { activeCases, activeFolders, activeRuns, addCasesToRun } = useFresh()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const run = activeRuns.find((r) => r.id === runId)
  const inRun = useMemo(() => new Set(run?.caseOrder ?? []), [run])

  // Cases available to add (not already in the run)
  const available = useMemo(() => {
    const sq = query.trim().toLowerCase()
    return activeCases.filter((c) => {
      if (inRun.has(c.id)) return false
      if (!sq) return true
      return (
        c.title.toLowerCase().includes(sq) ||
        (c.caseKey ?? '').toLowerCase().includes(sq)
      )
    })
  }, [activeCases, inRun, query])

  // Group by folder
  const grouped = useMemo(() => {
    const map = new Map<string | null, typeof available>()
    for (const c of available) {
      const key = c.folderId ?? null
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(c)
    }
    return [...map.entries()].map(([folderId, cases]) => ({
      folderId,
      label: folderId ? (activeFolders.find((f) => f.id === folderId)?.name ?? 'Unfiled') : 'Unfiled',
      cases,
    }))
  }, [available, activeFolders])

  function toggleCase(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleFolder(caseIds: string[]) {
    const allSelected = caseIds.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) caseIds.forEach((id) => next.delete(id))
      else caseIds.forEach((id) => next.add(id))
      return next
    })
  }

  function handleAdd() {
    if (!runId || selected.size === 0) return
    addCasesToRun(runId, [...selected])
    setSelected(new Set())
    setQuery('')
    onClose()
  }

  function handleClose() {
    setSelected(new Set())
    setQuery('')
    onClose()
  }

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div
        className="create-dialog"
        style={{ width: 540, maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Escape') handleClose() }}
      >
        {/* Header */}
        <div className="shortcuts-hd">
          <div className="shortcuts-title">Add cases to run</div>
          <button type="button" className="btn" style={{ padding: '2px 6px' }} onClick={handleClose}>
            <i className="ti ti-x" style={{ fontSize: 13 }} />
          </button>
        </div>

        {/* Search */}
        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
          <input
            autoFocus
            placeholder="Search cases…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: '100%', fontSize: 12, padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
          />
        </div>

        {/* Case list */}
        <div className="create-body" style={{ padding: 0 }}>
          {available.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
              {query ? 'No cases match your search.' : 'All project cases are already in this run.'}
            </div>
          ) : (
            grouped.map((group) => {
              const groupIds = group.cases.map((c) => c.id)
              const allChecked = groupIds.every((id) => selected.has(id))
              const someChecked = groupIds.some((id) => selected.has(id))
              return (
                <div key={group.folderId ?? '__unfiled__'}>
                  {/* Folder header */}
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 12px', background: 'var(--surface)',
                      borderBottom: '1px solid var(--border)',
                      position: 'sticky', top: 0, zIndex: 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked }}
                      onChange={() => toggleFolder(groupIds)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text2)' }}>{group.label}</span>
                    <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 'auto' }}>{group.cases.length}</span>
                  </div>
                  {/* Cases */}
                  {group.cases.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 8,
                        padding: '6px 12px 6px 28px',
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                        background: selected.has(c.id) ? 'var(--hover)' : undefined,
                      }}
                      onClick={() => toggleCase(c.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleCase(c.id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ cursor: 'pointer', marginTop: 2, flexShrink: 0 }}
                      />
                      <div>
                        <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text3)', marginBottom: 1 }}>
                          {c.caseKey ?? c.id}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text)' }}>{c.title}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })
          )}
        </div>

        {/* Footer */}
        <div className="create-foot" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11.5, color: 'var(--text3)' }}>
            {selected.size > 0 ? `${selected.size} case${selected.size === 1 ? '' : 's'} selected` : ''}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn" onClick={handleClose}>Cancel</button>
            <button
              type="button"
              className="btn btn-p"
              disabled={selected.size === 0}
              onClick={handleAdd}
            >
              <i className="ti ti-plus" style={{ fontSize: 12 }} />
              Add {selected.size > 0 ? selected.size : ''} case{selected.size !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
```

---

### 3. `apps/web/src/fresh/screens/RunsScreen.tsx`

**Import `AddCasesToRunModal`:**
```tsx
import { AddCasesToRunModal } from '../components/AddCasesToRunModal'
```

**Add state:**
```tsx
const [addCasesOpen, setAddCasesOpen] = useState(false)
```

**Add "+ Add cases" button** to the left of the search input inside `.ec-list-hd`. Read the file to find the exact placement — it should sit immediately to the left of the search `<input>`:

```tsx
{!sealed && (
  <button
    type="button"
    className="btn btn-p"
    style={{ fontSize: 11, padding: '3px 8px', flexShrink: 0 }}
    onClick={() => setAddCasesOpen(true)}
  >
    <i className="ti ti-plus" style={{ fontSize: 11 }} /> Add cases
  </button>
)}
```

**Wire the empty-run "Add to test run" button** (added in Task 05) — change its `onClick` from empty to:
```tsx
onClick={() => setAddCasesOpen(true)}
```

**Mount the modal** near the other modals at the bottom of the component tree:
```tsx
<AddCasesToRunModal
  open={addCasesOpen}
  runId={currentRun?.id}
  onClose={() => setAddCasesOpen(false)}
/>
```

---

## Files that will NOT change
- `demo-model.ts`, `migrate-demo-state.ts`
- `project-routes.ts`
- `CasesScreen.tsx`, `CreateRunModal.tsx`
- `prototype-runs.css`, `fresh.css`
- Any route `page.tsx` files
- `apps/web/src/legacy/**`

---

## Step 1 — Read files before touching them

```
Read apps/web/src/fresh/data/FreshProvider.tsx
Read apps/web/src/fresh/screens/RunsScreen.tsx
```

---

## Step 2 — Make changes

Apply in order: `FreshProvider.tsx` → create `AddCasesToRunModal.tsx` → `RunsScreen.tsx`.

---

## Step 3 — Build verification

```bash
cd /Users/shaun.sevume/Projects/Relay && pnpm build
```

Zero TypeScript errors required.

---

## Step 4 — Manual check

1. Start dev server: `cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev`
2. Open a test run that has at least one case already. Confirm the **"+ Add cases"** button appears to the left of the search bar.
3. Click "Add cases" — confirm the modal opens. Confirm cases already in the run do NOT appear in the list.
4. Confirm cases are grouped by folder with a sticky folder header.
5. **Search**: type a keyword — confirm list narrows. Clear — confirm full list returns.
6. **Folder checkbox**: check a folder header checkbox — confirm all cases in that folder become selected. Uncheck — confirm all deselect.
7. **Indeterminate state**: check some (not all) cases in a folder — confirm the folder header shows an indeterminate checkbox.
8. **Add**: select 2–3 cases and click "Add N cases" — confirm modal closes, cases appear in the run case list.
9. **Empty run**: open the empty-run state — confirm the "Add to test run" button opens the same modal.
10. **Sealed run**: seal a run — confirm the "+ Add cases" button disappears.
11. **All cases in run**: if all project cases are already in the run, confirm the modal shows "All project cases are already in this run."

---

## Step 5 — Commit

Run `git diff HEAD` and cross-check actual changes against the message below. Adjust if anything differs, then commit.

```
Test runs: add cases to run modal and ADD_CASES_TO_RUN action

`FreshProvider.tsx`
* Added `ADD_CASES_TO_RUN` action to `FreshAction` union type
* Added `ADD_CASES_TO_RUN` reducer case: appends new caseIds to `run.caseOrder`, deduplicating against existing entries
* Added `addCasesToRun(runId, caseIds)` callback; exposed on `FreshContextValue`, `value` object, and `useMemo` deps

`AddCasesToRunModal.tsx`
* New component: searchable, folder-grouped checkbox list of project cases not already in the run
* Folder header checkboxes support select-all, deselect-all, and indeterminate states
* "Add N cases" button calls `addCasesToRun` and closes the modal; disabled when nothing is selected
* Empty states for no-search-match and all-cases-already-in-run

`RunsScreen.tsx`
* Added `addCasesOpen` state and `<AddCasesToRunModal>` mounted alongside other modals
* Added "+ Add cases" button to the left of the case list search bar; hidden when run is sealed
* Wired the empty-run "Add to test run" button (Task 05) to open the same modal
```

---

## Step 6 — Restart dev server

```bash
cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev
```
