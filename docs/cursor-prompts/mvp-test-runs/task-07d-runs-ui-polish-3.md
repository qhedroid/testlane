# Task 07d — Test Runs UI Polish (2 fixes)

## Context

Branch: `mvp-test-runs`
Schema: v11. The `ExecutionLogEntry` interface gains an optional `event` field — this is a
backward-compatible type-only addition; no schema version bump or migration required.

---

## Files that WILL change

- `apps/web/src/fresh/data/demo-model.ts`
- `apps/web/src/fresh/data/FreshProvider.tsx`
- `apps/web/src/fresh/screens/RunsScreen.tsx`
- `apps/web/src/fresh/styles/prototype-runs.css`

## Files that will NOT change

- `migrate-demo-state.ts` — no migration needed (optional field addition only)
- Any component not listed above

---

## Fix 1 — Track "Record was created" in the History tab

When a test case is added to a run (via `ADD_CASES_TO_RUN`), log a creation event so the
History tab shows "Record was created" with the user and timestamp — matching the same format
as status-change entries.

### 1a — Extend `ExecutionLogEntry` in `demo-model.ts`

Add an optional `event` field:

```ts
export interface ExecutionLogEntry {
  id: string
  caseId: string
  at: string
  by: string
  from: ExecStatus
  to: ExecStatus
  event?: 'created'   // ← add this; undefined means a normal status-change entry
}
```

This is purely additive — old entries without `event` continue to work as before.

### 1b — Log creation entries in `ADD_CASES_TO_RUN` reducer (`FreshProvider.tsx`)

Current reducer:
```tsx
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

Replace with:
```tsx
case 'ADD_CASES_TO_RUN': {
  const now = new Date().toISOString()
  next = {
    ...state,
    runs: state.runs.map((r) => {
      if (r.id !== action.runId) return r
      const existing = new Set(r.caseOrder)
      const newIds = action.caseIds.filter((id) => !existing.has(id))
      if (newIds.length === 0) return r
      const createdEntries: ExecutionLogEntry[] = newIds.map((caseId) => ({
        id: newId('log'),
        caseId,
        at: now,
        by: 'Shaun Sevume',
        from: 'Not run' as ExecStatus,
        to: 'Not run' as ExecStatus,
        event: 'created' as const,
      }))
      return {
        ...r,
        caseOrder: [...r.caseOrder, ...newIds],
        executionLog: [...(r.executionLog ?? []), ...createdEntries],
      }
    }),
  }
  break
}
```

Make sure `ExecutionLogEntry` is imported in the `FreshProvider.tsx` import from `demo-model.ts`
(it likely already is via the `DemoRun` import — verify and add if missing).

### 1c — Render "Record was created" in the History tab (`RunsScreen.tsx`)

The History tab panel (inside `ExecDetailPane`) currently renders each entry as:

```tsx
<div key={e.id} className="ed-hist-item">
  <div className="ed-hist-dot" style={{ background: e.to === 'Passed' ? ... }} />
  <div style={{ flex: 1 }}>
    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>
      {e.from} → {e.to}
    </div>
    <div style={{ fontSize: 10.5, color: 'var(--text3)' }}>
      {e.by} · {formatRelativeTime(e.at)}
    </div>
  </div>
</div>
```

Update to handle `event === 'created'`:

```tsx
<div key={e.id} className="ed-hist-item">
  <div
    className="ed-hist-dot"
    style={{
      background:
        e.event === 'created' ? 'var(--accent)' :
        e.to === 'Passed'  ? 'var(--pass)'  :
        e.to === 'Failed'  ? 'var(--fail)'  :
        e.to === 'Blocked' ? 'var(--block)' :
        'var(--text3)',
    }}
  />
  <div style={{ flex: 1 }}>
    <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>
      {e.event === 'created' ? 'Record was created' : `${e.from} → ${e.to}`}
    </div>
    <div style={{ fontSize: 10.5, color: 'var(--text3)' }}>
      {e.by} · {formatRelativeTime(e.at)}
    </div>
  </div>
</div>
```

No CSS changes needed — the existing `.ed-hist-item` and `.ed-hist-dot` styles apply.

---

## Fix 2 — Summary panel: match donut height and add assignee filter to Team tab

### 2a — Match height of tabbed panel to donut chart (`prototype-runs.css`)

The donut is rendered at `DONUT_CHART_SIZE = 122px`. The tabbed panel beside it should be
exactly the same height so they sit flush.

**Change `.runs-v12 .ec-summary-body` to use `align-items: stretch`** (was `flex-start`):

```css
.runs-v12 .ec-summary-body {
  display: flex;
  gap: 10px;
  align-items: stretch;   /* ← was flex-start; makes both children same height */
  padding: 6px 0 4px;
}
```

**Make `.runs-v12 .ec-summary-tabs-panel` a flex column** so the tab content fills
the remaining height:

```css
.runs-v12 .ec-summary-tabs-panel {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--border);
  border-radius: 5px;
  overflow: hidden;
  display: flex;           /* ← add */
  flex-direction: column;  /* ← add */
}
```

**Make `.runs-v12 .ec-summary-tab-content` flex-grow** and remove any fixed max-height
(the panel height is already constrained by the donut above it):

```css
.runs-v12 .ec-summary-tab-content {
  flex: 1;            /* fill remaining panel height */
  overflow-y: auto;
  padding: 8px 10px;
  font-size: 11px;
  /* remove max-height: 120px if present */
}
```

### 2b — Team tab: show "N cases assigned" and clicking filters the run list (`RunsScreen.tsx`)

The Team tab currently shows per-member stats in `ec-team-row` divs (passed/failed counts etc.).
Replace the team tab content block with a simpler per-member layout showing case count and
a click-to-filter behaviour.

**In the Team tab JSX within the summary section:**

```tsx
{summaryTab === 'team' && (
  <div className="ec-summary-tab-content">
    {teamSummary.length === 0 ? (
      <div style={{ fontSize: 11, color: 'var(--text3)', padding: '4px 0' }}>0 users</div>
    ) : (
      teamSummary.map((m) => {
        const isActive = advFilter.assignee === m.name
        return (
          <div
            key={m.name}
            className="ec-team-row"
            style={{ cursor: 'pointer', borderRadius: 3, padding: '3px 4px', background: isActive ? 'var(--accent-bg, rgba(var(--accent-rgb,25,118,210),.08))' : 'transparent' }}
            onClick={() =>
              setAdvFilter((f) => ({
                ...f,
                assignee: f.assignee === m.name ? '' : m.name,
              }))
            }
          >
            <div className="ec-team-av">
              {m.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
            </div>
            <div className="ec-team-name" style={{ color: isActive ? 'var(--accent)' : undefined }}>
              {m.name}
            </div>
            <div style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text3)' }}>
              {m.total} {m.total === 1 ? 'case' : 'cases'} assigned
            </div>
          </div>
        )
      })
    )}
  </div>
)}
```

**Note:** `advFilter` and `setAdvFilter` are already in scope in `RunsScreen` — no additional
props or state needed.

The `accent-bg` CSS variable may not be defined — use an inline rgba fallback:
`background: isActive ? 'rgba(25,118,210,.08)' : 'transparent'`

---

## Build check

After all changes, run:

```bash
cd /Users/shaun.sevume/Projects/Relay && pnpm build
```

Zero TypeScript errors required.

---

## Dev server restart

After a successful build, restart the dev server:

```bash
cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev
```

---

## Commit

Once `pnpm build` passes, stage and commit all changed files with this message:

```
Runs: Task 07d — history creation event + summary panel fixes

`demo-model.ts`
* Added optional `event?: 'created'` field to ExecutionLogEntry interface

`FreshProvider.tsx`
* ADD_CASES_TO_RUN reducer now appends ExecutionLogEntry records with
  event: 'created' for each newly added case id

`RunsScreen.tsx`
* History tab renders "Record was created" for entries with event === 'created';
  dot colour uses var(--accent) for created entries
* Team tab rows show "N cases assigned" per member; clicking a member
  sets advFilter.assignee to filter the run list (click again to clear)

`prototype-runs.css`
* ec-summary-body: align-items changed to stretch so panel matches donut height
* ec-summary-tabs-panel: flex column so tab content fills available height
* ec-summary-tab-content: flex: 1 replaces max-height for natural height fill

Co-authored-by: Claude <claude@anthropic.com>
```
