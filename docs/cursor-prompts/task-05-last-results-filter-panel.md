# Task 05 — LAST RESULTS column upgrade + filter panel

## Context from previous task
Branch: `mvp-test-cases`.

Tasks 01–04 are complete:
- Schema v7. `Case` has `template`, `references`, `summary`, `customFieldValues`.
- CaseDetail has 7 tabs and custom field rendering.
- Per-row context menu with Duplicate/Edit/Delete is working.
- The "Last run" column (7th column in the case table) currently shows a plain `<span className="pill ...">` status label.
- The filter bar (`tc-bar`) has non-functional chips: "All status / Pass / Fail / Blocked / Not run" (status filter works) + "Priority / Assignee / Type" (visual-only, non-functional).

## Objective

### Part A — LAST RESULTS column visual upgrade
Replace the plain status pill in the "Last run" column with:
1. A **colored status icon** (small circle or icon representing the result)
2. A **mini sparkline** showing the last 5 run results for this case (5 small colored bars)

### Part B — Filter panel
Replace the non-functional "Priority", "Assignee", and "Type" chips with a **Filter** button that opens a dropdown panel where the user can add filter conditions.

Filter panel behaviour:
- Click "Filter" button → dropdown panel opens below the button
- Panel shows a list of active filter conditions (empty by default)
- "Add filter" row: field dropdown + operator dropdown + value input/select + "Add" button
- Supported filter fields: Title (contains), Priority (is), Type (is), Assignee (is), Status (is)
- Multiple conditions are ANDed together
- Active filter count badge shown on the "Filter" button when filters are applied
- "Clear all" link removes all conditions
- Filtering is applied to `displayedCases` in real time

## Files that will change
- `apps/web/src/fresh/screens/CasesScreen.tsx`

## Files that will NOT change
- `demo-model.ts`, `FreshProvider.tsx`, `migrate-demo-state.ts`, any other file

---

## Step 1 — Read the file before touching it

```
Read apps/web/src/fresh/screens/CasesScreen.tsx
```

---

## Part A — LAST RESULTS column

### A1 — Helper: last N results for a case

Add a helper below the existing `caseLastStatus` function:

```ts
/** Returns the last N execution statuses for a case, most recent first. */
function caseRecentStatuses(
  runs: { executions: Record<string, { status: ExecStatus }> }[],
  caseId: string,
  n = 5,
): ExecStatus[] {
  const results: ExecStatus[] = []
  for (const run of runs) {
    if (results.length >= n) break
    const ex = run.executions[caseId]
    if (ex) results.push(ex.status)
  }
  return results
}
```

### A2 — Status icon colors

Add a color map near the top of the file (alongside `PRI_MAP`):

```ts
const EXEC_COLOR: Record<ExecStatus, string> = {
  Passed:  'var(--pass)',
  Failed:  'var(--fail)',
  Blocked: 'var(--blocked)',
  Skipped: 'var(--text3)',
  'Not run': 'var(--text3)',
}
```

### A3 — Replace the pill in the table row

Find the existing table cell:
```tsx
<td><span className={`pill ${EXEC_PILL_MAP[last]}`}>{EXEC_PILL_LABEL[last]}</span></td>
```

Replace it with:
```tsx
<td>
  {(() => {
    const last = caseLastStatus(activeRuns, c.id)
    const recent = caseRecentStatuses(activeRuns, c.id, 5)
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
        {/* Status dot */}
        <span style={{
          display: 'inline-block',
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: EXEC_COLOR[last],
          flexShrink: 0,
        }} title={last} />
        {/* Sparkline bars */}
        <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
          {Array.from({ length: 5 }).map((_, i) => {
            const s = recent[i]
            return (
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
            )
          })}
        </div>
      </div>
    )
  })()}
</td>
```

> Note: remove the earlier `const last = caseLastStatus(...)` that was computed outside this cell, since it's now computed inline. Or keep it and reference it — be consistent and avoid computing it twice.

### A4 — Update the column header

Change the `<th>Last run</th>` header to `<th style={{ width: 120 }}>Last results</th>` to make room for the sparkline.

---

## Part B — Filter panel

### B1 — Filter state

Add the following state near the top of `CasesScreen` (below the existing `statusFilter` state):

```ts
type FilterField = 'title' | 'priority' | 'type' | 'assignee' | 'status'
type FilterOperator = 'contains' | 'is'

interface FilterCondition {
  id: string
  field: FilterField
  operator: FilterOperator
  value: string
}

const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([])
const [filterPanelOpen, setFilterPanelOpen] = useState(false)
const [draftFilter, setDraftFilter] = useState<{ field: FilterField; operator: FilterOperator; value: string }>({
  field: 'title',
  operator: 'contains',
  value: '',
})
const filterPanelRef = useRef<HTMLDivElement>(null)
```

Add a click-outside handler for the filter panel (same pattern as the context menu in Task 04):

```ts
useEffect(() => {
  if (!filterPanelOpen) return
  function handleClick(e: MouseEvent) {
    if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
      setFilterPanelOpen(false)
    }
  }
  document.addEventListener('mousedown', handleClick)
  return () => document.removeEventListener('mousedown', handleClick)
}, [filterPanelOpen])
```

### B2 — Apply filters to `displayedCases`

Replace the existing `displayedCases` memo with one that applies both the status chip filter AND the new conditions:

```ts
const displayedCases = useMemo(() => {
  let result = folderCases

  // Legacy status chip filter
  if (statusFilter !== 'all') {
    result = result.filter((c) => EXEC_TO_LEGACY[caseLastStatus(activeRuns, c.id)] === statusFilter)
  }

  // Advanced filter conditions
  for (const cond of filterConditions) {
    result = result.filter((c) => {
      switch (cond.field) {
        case 'title':
          return c.title.toLowerCase().includes(cond.value.toLowerCase())
        case 'priority':
          return c.priority.toLowerCase() === cond.value.toLowerCase()
        case 'type':
          return c.type.toLowerCase() === cond.value.toLowerCase()
        case 'assignee':
          return (c.assignee ?? '').toLowerCase().includes(cond.value.toLowerCase())
        case 'status': {
          const last = EXEC_TO_LEGACY[caseLastStatus(activeRuns, c.id)]
          return last === cond.value
        }
        default:
          return true
      }
    })
  }

  return result
}, [folderCases, statusFilter, activeRuns, filterConditions])
```

### B3 — Operator options per field

Add a helper:
```ts
const FILTER_OPERATORS: Record<FilterField, FilterOperator[]> = {
  title:    ['contains'],
  priority: ['is'],
  type:     ['is'],
  assignee: ['contains'],
  status:   ['is'],
}
```

### B4 — Value options for enum fields

```ts
const FILTER_VALUE_OPTIONS: Partial<Record<FilterField, string[]>> = {
  priority: ['Critical', 'High', 'Medium', 'Low'],
  status:   ['pass', 'fail', 'blocked', 'not_run', 'skip'],
}
```

### B5 — Replace the filter chips in the `tc-bar`

Remove the three non-functional chips (Priority, Assignee, Type) and the `<div>` separator between them and the status chips. Replace with a Filter button + panel:

```tsx
<div className="tc-bar">
  {/* Status chips — keep as-is */}
  {STATUS_CHIPS.map(({ label, value }) => (
    <span
      key={label}
      className={`chip${statusFilter === value ? ' on' : ''}`}
      onClick={() => { setStatusFilter(value); setDetailCaseId(null) }}
    >
      {label}
    </span>
  ))}

  <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 2px' }} />

  {/* Filter button + panel */}
  <div style={{ position: 'relative' }}>
    <button
      type="button"
      className={`chip${filterConditions.length > 0 ? ' on' : ''}`}
      onClick={() => setFilterPanelOpen((v) => !v)}
    >
      <i className="ti ti-filter" style={{ fontSize: 11 }} /> Filter
      {filterConditions.length > 0 ? (
        <span style={{
          marginLeft: 4,
          background: 'var(--accent)',
          color: '#fff',
          borderRadius: 8,
          padding: '0 5px',
          fontSize: 10,
          fontWeight: 700,
        }}>
          {filterConditions.length}
        </span>
      ) : null}
    </button>

    {filterPanelOpen ? (
      <div
        ref={filterPanelRef}
        style={{
          position: 'absolute',
          top: '100%',
          left: 0,
          zIndex: 200,
          marginTop: 4,
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: 6,
          boxShadow: '0 4px 16px rgba(0,0,0,.18)',
          padding: 10,
          minWidth: 360,
        }}
      >
        {/* Active conditions */}
        {filterConditions.length > 0 ? (
          <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
            {filterConditions.map((cond) => (
              <div key={cond.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                <span style={{ color: 'var(--text2)', minWidth: 60 }}>{cond.field}</span>
                <span style={{ color: 'var(--text3)' }}>{cond.operator}</span>
                <span style={{ fontWeight: 600 }}>{cond.value}</span>
                <button
                  type="button"
                  className="btn"
                  style={{ padding: '1px 5px', marginLeft: 'auto', fontSize: 11 }}
                  onClick={() => setFilterConditions((prev) => prev.filter((c) => c.id !== cond.id))}
                >
                  <i className="ti ti-x" style={{ fontSize: 10 }} />
                </button>
              </div>
            ))}
            <button
              type="button"
              style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 11, cursor: 'pointer', textAlign: 'left', padding: 0, marginTop: 2 }}
              onClick={() => setFilterConditions([])}
            >
              Clear all
            </button>
          </div>
        ) : null}

        {/* Add filter row */}
        <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
          <select
            style={{ fontSize: 12, flex: '0 0 auto' }}
            value={draftFilter.field}
            onChange={(e) => {
              const field = e.target.value as FilterField
              const op = FILTER_OPERATORS[field][0]
              setDraftFilter({ field, operator: op, value: '' })
            }}
          >
            <option value="title">Title</option>
            <option value="priority">Priority</option>
            <option value="type">Type</option>
            <option value="assignee">Assignee</option>
            <option value="status">Status</option>
          </select>
          <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>{draftFilter.operator}</span>
          {FILTER_VALUE_OPTIONS[draftFilter.field] ? (
            <select
              style={{ fontSize: 12, flex: 1 }}
              value={draftFilter.value}
              onChange={(e) => setDraftFilter((d) => ({ ...d, value: e.target.value }))}
            >
              <option value="">Select…</option>
              {FILTER_VALUE_OPTIONS[draftFilter.field]!.map((v) => <option key={v} value={v}>{v}</option>)}
            </select>
          ) : (
            <input
              type="text"
              style={{ fontSize: 12, flex: 1 }}
              placeholder={`Filter by ${draftFilter.field}…`}
              value={draftFilter.value}
              onChange={(e) => setDraftFilter((d) => ({ ...d, value: e.target.value }))}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && draftFilter.value.trim()) {
                  setFilterConditions((prev) => [...prev, { ...draftFilter, id: newId('filter'), value: draftFilter.value.trim() }])
                  setDraftFilter((d) => ({ ...d, value: '' }))
                }
              }}
            />
          )}
          <button
            type="button"
            className="btn btn-p"
            style={{ fontSize: 12, padding: '2px 8px', flexShrink: 0 }}
            disabled={!draftFilter.value.trim()}
            onClick={() => {
              if (!draftFilter.value.trim()) return
              setFilterConditions((prev) => [...prev, { ...draftFilter, id: newId('filter'), value: draftFilter.value.trim() }])
              setDraftFilter((d) => ({ ...d, value: '' }))
            }}
          >
            Add
          </button>
        </div>
      </div>
    ) : null}
  </div>

  <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
    {displayedCases.length} cases
  </span>
</div>
```

---

## Step 2 — Build verification

```bash
cd /path/to/repo && pnpm build
```

Zero TypeScript errors required.

---

## Step 3 — Manual check

1. Start dev server: `cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev`
2. Open `/DP/testcases/`.
3. **Last results column**: confirm status dot (colored circle) + 5 sparkline bars appear. Bars for cases with no run history should appear as dim grey stubs.
4. **Filter button**: click — confirm panel opens below it.
5. Add a Title filter "Login" — confirm table filters to matching rows.
6. Add a Priority filter "High" — confirm both conditions apply (AND).
7. Check the badge shows "2" on the Filter button.
8. Click "Clear all" — confirm table resets.
9. Confirm the old Priority/Assignee/Type chips are gone.
10. Confirm the status chips (All / Pass / Fail / Blocked / Not run) still work.

---

## Step 4 — Commit

Run `git diff HEAD` and cross-check the actual changes against the proposed message below. Before committing, flag:
- Any file changed that is not mentioned in the message
- Any change made that is not reflected in the bullets
- Any bullet that describes something not actually done

Adjust the message to match reality, then commit.

**Proposed message:**
```
Test cases: sparkline last-results column and advanced filter panel

- Add caseRecentStatuses() helper returning last N ExecStatus values for a case
- Add EXEC_COLOR map (ExecStatus → CSS variable) for status dot and sparkline bar colors
- Replace Last run pill column with: colored 8px status dot + 5-bar sparkline (bars sized and colored by result, grey stubs for no-data slots); rename column header to "Last results"
- Remove non-functional Priority/Assignee/Type filter chips from tc-bar
- Add FilterCondition type (field, operator, value) and filterConditions state array
- Add Filter button with active-count badge; click opens a panel with add-condition row and active conditions list with per-condition remove and Clear all
- displayedCases memo applies both legacy status chip filter and all active FilterConditions (AND logic); supports title contains, priority/type/status is, assignee contains
```

---

## Step 5 — Restart dev server

```bash
cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev
```
