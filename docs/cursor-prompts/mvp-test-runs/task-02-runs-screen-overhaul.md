# Task 10 — Test Runs: RunsScreen Feature Overhaul

## Goal
Seven interconnected improvements to `RunsScreen.tsx` (and a new `EditRunModal`):

1. **Fix case ID display** — show `case.caseKey` (TC-00001) instead of `case.id` in the list and detail pane.
2. **URL sync** — when a case is selected, push `/testruns/tr/{runKey}/tc/{caseKey}` to the URL; on page load, read `caseKey` from the URL and set `activeCaseId` accordingly.
3. **Folder grouping** in the case list — cases grouped under collapsible folder headers.
4. **Status text click-to-filter** — clicking a status label ("Passed", "Failed", etc.) in the run summary stats area filters the case list to that status.
5. **Rich filter panel** — multi-field filter (Result, Priority, Assignee, Type) replacing/extending the current status quick-tabs.
6. **Team summary** — a "Team" tab in the run summary area showing per-assignee case count + status breakdown.
7. **"Add Result Information"** — a collapsible textarea in the ExecDetailPane's Details tab, persisted to `execution.resultNotes`.
8. **Real History tab** — replace the hardcoded placeholder with live entries from `run.executionLog` filtered to the active case.
9. **Edit run modal** — rename, update description, due date; dispatches `editRun()`.

---

## Context from previous tasks
- Task 09 must be complete before this task runs. It adds: `ExecutionLogEntry`, `CaseExecution.resultNotes`, `DemoRun.executionLog`, `editRun()` on context, `testRunCasePath()` and `parseTestRunCaseKey()` in `project-routes.ts`, and the new `/testruns/tr/[runKey]/tc/[caseKey]/page.tsx` route.
- `Case.id` = globally-unique internal key. `Case.caseKey` = display key like `TC-00001`.
- `DemoRun.runKey` = display key like `"00001"`.
- `activeFolders` from `useFresh()` is the list of `Folder[]` for the active project.
- `FreshProvider` exposes `editRun(runId, patch)`.
- Route helpers: `testRunCasePath(projectKey, runKey, caseKey)`, `parseTestRunCaseKey(pathname)`, `parseTestRunKey(pathname)`.
- The `useParams()` hook will return `{ projectKey, runKey, caseKey? }` depending on which route rendered.
- Style: all CSS lives in `prototype-runs.css`. Follow existing CSS class naming conventions (kebab-case, short prefixes). No Tailwind, no inline style objects for new layout (inline style for small overrides like widths/colors is fine).
- No backend, no API routes.

---

## 1 — Fix case ID display

In `RunCaseRow` and everywhere `row.case.id` is rendered as the display ID, replace with `row.case.caseKey ?? row.case.id`.

Specifically in `RunsScreen`:
- The `ec-cid` span in the case list row: change `{row.case.id}` → `{row.case.caseKey ?? row.case.id}`.
- The search filter that checks `row.case.id.toLowerCase().includes(sq)` should ALSO check `(row.case.caseKey ?? '').toLowerCase().includes(sq)` so searching "TC-00001" works.

In `ExecDetailPane`:
- The `ed-id` div renders `caseData.id` — change to `caseData.caseKey ?? caseData.id`.

---

## 2 — URL sync for active case

### Reading caseKey from URL on load

`RunsScreen` already reads `params.runKey` via `useParams()`. Extend it to also read `params.caseKey`:

```tsx
const caseKeyFromUrl = (params.caseKey as string | undefined) ?? parseTestRunCaseKey(pathname) ?? undefined
```

When `currentRun` is available and `caseKeyFromUrl` is set, derive the initial `activeCaseId` by looking up the case in the run whose `caseKey === caseKeyFromUrl`:

```tsx
// Replace the naive useState initialiser
const [activeCaseId, setActiveCaseId] = useState('')

useEffect(() => {
  if (!currentRun) return
  if (caseKeyFromUrl) {
    const match = currentRun.caseOrder.find((cid) => {
      const c = getCase(cid)
      return c?.caseKey === caseKeyFromUrl
    })
    if (match) { setActiveCaseId(match); return }
  }
  setActiveCaseId(currentRun.caseOrder[0] ?? '')
}, [currentRun?.id]) // only re-run when the run changes, not on every render
```

### Pushing URL when activeCaseId changes

Add a `useEffect` that updates the URL whenever `activeCaseId` changes (and a run is active):

```tsx
useEffect(() => {
  if (!currentRun || !activeCaseId) return
  const activeCase = getCase(activeCaseId)
  if (!activeCase?.caseKey) return
  const target = testRunCasePath(activeProject.key, currentRun.runKey, activeCase.caseKey)
  if (pathname !== target) {
    window.history.replaceState(null, '', target)
  }
}, [activeCaseId, currentRun?.runKey, activeProject.key])
```

Use `window.history.replaceState` — NOT `router.push` or `router.replace` — to avoid triggering a re-render/remount (same pattern as CasesScreen).

### When the run changes (run picker)

When `handleSelectRun` is called, push the run URL without a caseKey:
```tsx
router.push(testRunPath(activeProject.key, run.runKey))
```
This is already correct. The `useEffect` above will then fire and push the caseKey once `activeCaseId` is set for the new run.

---

## 3 — Folder grouping in case list

Replace the flat `filteredRows.map(...)` in the case list with a grouped rendering.

**Compute grouped rows** in a `useMemo` (add after `filteredRows`):

```ts
const groupedRows = useMemo(() => {
  // Build a map: folderId → Folder
  const folderMap = new Map(activeFolders.map((f) => [f.id, f]))

  // Group filteredRows by folderId
  const groups: { folderId: string | null; folderName: string; rows: RunCaseRow[] }[] = []
  const seen = new Map<string | null, number>()

  for (const row of filteredRows) {
    const folderId = row.case.folderId ?? null
    if (!seen.has(folderId)) {
      seen.set(folderId, groups.length)
      groups.push({
        folderId,
        folderName: folderId ? (folderMap.get(folderId)?.name ?? 'Unfiled') : 'Unfiled',
        rows: [],
      })
    }
    groups[seen.get(folderId)!].rows.push(row)
  }
  return groups
}, [filteredRows, activeFolders])
```

**State for collapsed folders:**
```tsx
const [collapsedFolders, setCollapsedFolders] = useState<Set<string | null>>(new Set())
const toggleFolder = (folderId: string | null) => {
  setCollapsedFolders((prev) => {
    const next = new Set(prev)
    if (next.has(folderId)) next.delete(folderId)
    else next.add(folderId)
    return next
  })
}
```

**Render** (replace the existing `filteredRows.map` inside `.ec-list`):
```tsx
{groupedRows.length === 0 ? (
  <div style={{ padding: 16, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>No cases match filter</div>
) : (
  groupedRows.map((group) => {
    const collapsed = collapsedFolders.has(group.folderId)
    return (
      <div key={group.folderId ?? '__unfiled__'} className="ec-folder-group">
        <div className="ec-folder-hd" onClick={() => toggleFolder(group.folderId)}>
          <i className={`ti ${collapsed ? 'ti-chevron-right' : 'ti-chevron-down'}`} style={{ fontSize: 10, opacity: 0.5 }} />
          <span className="ec-folder-name">{group.folderName}</span>
          <span className="ec-folder-count">{group.rows.length}</span>
        </div>
        {!collapsed && group.rows.map((row) => (
          <div
            key={row.caseId}
            className={`ec-case${activeCaseId === row.caseId ? ' on' : ''}`}
            onClick={() => { setActiveCaseId(row.caseId); setEdVisible(true) }}
          >
            {/* same inner content as before */}
            <div className={`ec-dot ${EXEC_DOT_MAP[row.status]}`} />
            <div className="ec-info">
              <div className="ec-cid">{row.case.caseKey ?? row.case.id}</div>
              <div className="ec-cnm">{row.case.title}</div>
              <div className="ec-cby">{row.assignee}</div>
            </div>
            <div className="ec-case-right">
              <span className={`pill ec-status-pill ${EXEC_PILL_MAP[row.status]}`} style={{ fontSize: 9, padding: '1px 5px' }}>
                {EXEC_PILL_LABEL[row.status].replace(/^[✓✗⊘○→]\s*/, '')}
              </span>
              {row.comments > 0 ? <span className="ec-cmt-badge">{row.comments}</span> : null}
            </div>
          </div>
        ))}
      </div>
    )
  })
)}
```

**CSS to add** (in `prototype-runs.css`):
```css
.ec-folder-group { }

.ec-folder-hd {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 5px 10px 4px;
  cursor: pointer;
  border-bottom: 1px solid var(--border);
  background: var(--surface);
  position: sticky;
  top: 0;
  z-index: 1;
  user-select: none;
}
.ec-folder-hd:hover { background: var(--hover); }

.ec-folder-name {
  font-size: 10.5px;
  font-weight: 600;
  color: var(--text2);
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ec-folder-count {
  font-size: 10px;
  color: var(--text3);
  font-family: var(--mono);
}
```

---

## 4 — Status text click-to-filter

In `RunStatusInfographic`, the `rsi-lbl` spans ("Passed", "Failed", etc.) need to be clickable. Instead of modifying the component itself (which is used in other places), make the click-to-filter work at the `RunsScreen` level by passing an `onStatusClick` callback.

**Approach:** pass an optional `onStatusClick?: (s: FilterTab) => void` prop to `RunStatusInfographic`. The component adds `onClick` handlers and `cursor: pointer` style to each label span when the prop is provided. Use the existing `FilterTab = 'all' | ExecStatus` type.

In `RunStatusInfographic`:
```tsx
// Add prop
onStatusClick?: (status: ExecStatus) => void

// In the JSX, wrap each label:
<li onClick={() => onStatusClick?.('Passed')} style={onStatusClick ? { cursor: 'pointer' } : undefined}>
  <span className="rsi-n" ...>{pass}</span>
  <span className="rsi-lbl">Passed</span>
</li>
// ... repeat for Failed, Blocked, Skipped, Not run ('Not run' as ExecStatus)
```

In `RunsScreen`, pass the callback:
```tsx
<RunStatusInfographic
  ...
  onStatusClick={(s) => setFilter((prev) => prev === s ? 'all' : s)}
/>
```

Clicking the same status a second time toggles back to `'all'`.

**Visual feedback:** add an active state to the `rsi-lbl` / `rsi-n` when the current filter matches. Add a prop `activeStatus?: FilterTab` to `RunStatusInfographic`, and apply a CSS class `.rsi-active` to the matching `<li>` (e.g. slightly bolder text or underline).

---

## 5 — Rich filter panel

Replace the `ec-ftab-bar` (All / Not run / Fail / Blocked tabs) with a combined approach:
- Keep the existing quick-tab bar — it works well and is fast.
- Add a **"Filter" button** next to the search bar that opens a dropdown filter panel for advanced filtering.

**New state:**
```tsx
interface RunFilter {
  result: ExecStatus | 'all'
  assignee: string        // '' = any
  priority: string        // '' = any; values: 'Critical'|'High'|'Medium'|'Low'
  type: string            // '' = any
}
const [advFilter, setAdvFilter] = useState<RunFilter>({ result: 'all', assignee: '', priority: '', type: '' })
const [filterOpen, setFilterOpen] = useState(false)
```

**Filter panel UI** — a small dropdown panel below the search bar (similar to the existing run-sel-dd dropdown pattern):
- "Result" — `<select>` with All / Not run / Passed / Failed / Blocked / Skipped
- "Assignee" — `<select>` built from unique assignees across all run rows
- "Priority" — `<select>` with All / Critical / High / Medium / Low
- "Type" — `<select>` built from unique types across all run rows
- "Clear filters" link when any filter is active
- Clicking outside closes the panel

**Update `filteredRows`** to apply `advFilter` on top of keyword search and the quick-tab filter. The logic is AND: all active conditions must match.

**Filter active indicator:** when any `advFilter` field is non-default, show a small dot or count badge on the "Filter" button.

**Button placement:** to the right of the search bar, left of the existing filter tabs. On mobile/narrow pane, it collapses gracefully.

**CSS** (add to `prototype-runs.css`):
```css
.run-filter-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 11px;
  padding: 3px 7px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text2);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}
.run-filter-btn:hover { background: var(--hover); }
.run-filter-btn.active { border-color: var(--accent); color: var(--accent); }

.run-filter-panel {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  z-index: 50;
  padding: 10px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.run-filter-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11.5px;
}
.run-filter-row label { width: 68px; color: var(--text2); flex-shrink: 0; }
.run-filter-row select {
  flex: 1;
  font-size: 11.5px;
  padding: 2px 4px;
  border: 1px solid var(--border);
  border-radius: 3px;
  background: var(--surface);
  color: var(--text);
}
.run-filter-clear { font-size: 11px; color: var(--accent); cursor: pointer; text-align: right; }
```

---

## 6 — Team summary

In the run header area (`ec-run-hd`), add a "Team" section below the `RunStatusInfographic`. Show it only when the run has cases.

**Compute per-assignee breakdown** (in a `useMemo`):
```ts
const teamSummary = useMemo(() => {
  if (!currentRun) return []
  const byAssignee = new Map<string, { passed: number; failed: number; blocked: number; notRun: number; skipped: number; total: number }>()
  for (const row of runRows) {
    const key = row.assignee || 'Unassigned'
    const prev = byAssignee.get(key) ?? { passed: 0, failed: 0, blocked: 0, notRun: 0, skipped: 0, total: 0 }
    prev.total += 1
    if (row.status === 'Passed') prev.passed += 1
    else if (row.status === 'Failed') prev.failed += 1
    else if (row.status === 'Blocked') prev.blocked += 1
    else if (row.status === 'Skipped') prev.skipped += 1
    else prev.notRun += 1
    byAssignee.set(key, prev)
  }
  return [...byAssignee.entries()].map(([name, counts]) => ({ name, ...counts }))
}, [runRows, currentRun])
```

**Render** (below the progress summary in `ec-run-hd`):
```tsx
{teamSummary.length > 0 && (
  <div className="ec-team-summary">
    <div className="ec-sl" style={{ marginBottom: 5 }}>Team</div>
    {teamSummary.map((m) => (
      <div key={m.name} className="ec-team-row">
        <div className="ec-team-av">{m.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}</div>
        <div className="ec-team-name">{m.name}</div>
        <div className="ec-team-stats">
          {m.passed > 0 && <span style={{ color: 'var(--pass)' }}>{m.passed}P</span>}
          {m.failed > 0 && <span style={{ color: 'var(--fail)' }}>{m.failed}F</span>}
          {m.blocked > 0 && <span style={{ color: 'var(--blocked)' }}>{m.blocked}B</span>}
          {m.notRun > 0 && <span style={{ color: 'var(--text3)' }}>{m.notRun}N</span>}
        </div>
        <div className="ec-team-total">{m.total}</div>
      </div>
    ))}
  </div>
)}
```

**CSS:**
```css
.ec-team-summary { margin-top: 8px; border-top: 1px solid var(--border); padding-top: 8px; }

.ec-team-row {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 3px 0;
  font-size: 11.5px;
}
.ec-team-av {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--accent);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 9px;
  font-weight: 700;
  flex-shrink: 0;
}
.ec-team-name { flex: 1; color: var(--text); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.ec-team-stats { display: flex; gap: 5px; font-size: 10px; font-family: var(--mono); }
.ec-team-total { font-size: 10px; color: var(--text3); font-family: var(--mono); }
```

---

## 7 — "Add Result Information" in ExecDetailPane

In `ExecDetailPane`'s **Details tab**, add a collapsible "Result information" section below the Metadata block and above the Steps block.

**Local state:**
```tsx
const [notesOpen, setNotesOpen] = useState(false)
const [notesDraft, setNotesDraft] = useState(execution?.resultNotes ?? '')

// Sync draft when active case or execution changes
useEffect(() => {
  setNotesDraft(execution?.resultNotes ?? '')
  setNotesOpen(!!(execution?.resultNotes))
}, [execution?.resultNotes, caseData.id])
```

**Render** (inside the `ed-tp` for `details`, after the metadata grid):
```tsx
<div className="ed-result-info">
  <div
    className="ed-result-info-hd"
    onClick={() => setNotesOpen((v) => !v)}
  >
    <i className={`ti ${notesOpen ? 'ti-chevron-down' : 'ti-chevron-right'}`} style={{ fontSize: 10 }} />
    <span>Result information</span>
    {execution?.resultNotes ? <span className="ed-result-info-dot" /> : null}
  </div>
  {notesOpen && (
    <div className="ed-result-info-body">
      {sealed ? (
        <div className="ed-pt" style={{ whiteSpace: 'pre-wrap' }}>{execution?.resultNotes || <em style={{ color: 'var(--text3)' }}>No notes</em>}</div>
      ) : (
        <>
          <textarea
            className="esc-cmt"
            rows={3}
            placeholder="Add execution notes, observations, or evidence…"
            value={notesDraft}
            onChange={(e) => setNotesDraft(e.target.value)}
          />
          <button
            type="button"
            className="btn btn-p"
            style={{ fontSize: 10, padding: '2px 6px', marginTop: 4 }}
            onClick={() => onSaveResultNotes(notesDraft)}
            disabled={notesDraft === (execution?.resultNotes ?? '')}
          >
            Save
          </button>
        </>
      )}
    </div>
  )}
</div>
```

**New prop on ExecDetailPane:**
```tsx
onSaveResultNotes: (notes: string) => void
```

**In RunsScreen**, pass:
```tsx
onSaveResultNotes={(notes) => updateExecution(activeCaseId, { resultNotes: notes })}
```

**CSS:**
```css
.ed-result-info { border-top: 1px solid var(--border); margin-top: 10px; }

.ed-result-info-hd {
  display: flex;
  align-items: center;
  gap: 5px;
  padding: 7px 0 5px;
  cursor: pointer;
  font-size: 11px;
  font-weight: 600;
  color: var(--text2);
  user-select: none;
}
.ed-result-info-hd:hover { color: var(--text); }

.ed-result-info-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--accent);
  flex-shrink: 0;
}

.ed-result-info-body { padding: 0 0 8px; }
```

---

## 8 — Real History tab

Replace the hardcoded placeholder content in the `ed-tp` for `history` with live data from `run.executionLog`.

`ExecDetailPane` needs access to the run's `executionLog`. Pass it as a prop:
```tsx
executionLog?: import('../data/demo-model').ExecutionLogEntry[]
```

In `RunsScreen`, pass:
```tsx
executionLog={currentRun?.executionLog ?? []}
```

**In ExecDetailPane**, filter to entries for the active case and render:
```tsx
{/* History tab */}
<div className={`ed-tp${tab === 'history' ? ' on' : ''}`}>
  {(() => {
    const entries = (executionLog ?? [])
      .filter((e) => e.caseId === caseData.id)
      .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    if (entries.length === 0) {
      return <div style={{ padding: 12, color: 'var(--text3)', fontSize: 12 }}>No execution history yet.</div>
    }
    return entries.map((e) => (
      <div key={e.id} className="ed-hist-item">
        <div className="ed-hist-dot" style={{ background: e.to === 'Passed' ? 'var(--pass)' : e.to === 'Failed' ? 'var(--fail)' : e.to === 'Blocked' ? 'var(--blocked)' : 'var(--text3)' }} />
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>
            {e.from} → {e.to}
          </div>
          <div style={{ fontSize: 10.5, color: 'var(--text3)' }}>
            {e.by} · {formatRelativeTime(e.at)}
          </div>
        </div>
      </div>
    ))
  })()}
</div>
```

---

## 9 — Edit run modal

Create a new component `EditRunModal` in `apps/web/src/fresh/components/EditRunModal.tsx`.

**Props:**
```tsx
interface EditRunModalProps {
  open: boolean
  run: DemoRun | undefined
  onClose: () => void
}
```

**Fields:**
- Name (required)
- Description (optional, textarea)
- Due date (optional, date input — store as ISO string or plain string matching the existing `due` field format)

**On submit:** call `editRun(run.id, { name, description, due })` from `useFresh()`.

**Implementation pattern:** follow the exact same modal pattern as `CreateRunModal.tsx` — use a backdrop overlay, Escape key closes, Enter submits.

**In `RunsScreen`:**
- Add `const [editOpen, setEditOpen] = useState(false)`.
- Add `<EditRunModal open={editOpen} run={currentRun} onClose={() => setEditOpen(false)} />` at the bottom alongside `CreateRunModal`.
- In `TestRunsTopbar`, there is already a `More…` or actions area. Add an "Edit run" action that calls `onEdit()`. If `TestRunsTopbar` doesn't have an edit callback prop yet, add one: `onEdit?: () => void`.
- In `RunsScreen`, pass `onEdit={() => setEditOpen(true)}` to `TestRunsTopbar`.

Check `apps/web/src/fresh/components/TestRunsTopbar.tsx` to understand the existing prop shape before modifying it.

---

## Summary of files to change

| File | What changes |
|------|-------------|
| `apps/web/src/fresh/screens/RunsScreen.tsx` | URL sync, caseKey display, folder grouping, status-click filter, filter panel, team summary, result notes prop, history log prop, edit modal |
| `apps/web/src/fresh/components/RunStatusInfographic.tsx` | `onStatusClick` + `activeStatus` props |
| `apps/web/src/fresh/components/EditRunModal.tsx` | **New file** |
| `apps/web/src/fresh/components/TestRunsTopbar.tsx` | Add `onEdit` prop |
| `apps/web/src/fresh/styles/prototype-runs.css` | New CSS for folder groups, filter panel, team summary, result notes section |

## Files that do NOT change
- `FreshProvider.tsx` — done in Task 09
- `demo-model.ts` — done in Task 09
- `migrate-demo-state.ts` — done in Task 09
- `project-routes.ts` — done in Task 09
- Any route `page.tsx` files — done in Task 09
- `ApiRunsWorkspace.tsx` — not in scope
- `apps/web/src/legacy/**` — never touch

## After completing
Run `pnpm build` from the repo root. Zero TypeScript errors required before committing.
