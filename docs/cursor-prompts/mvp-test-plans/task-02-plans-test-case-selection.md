# Task 02 — Test Plans: Test Cases Tab (Static & Dynamic Selection)

## Goal

Implement the **Test cases** tab in `PlansScreen.tsx` — left off as a placeholder in Task 01. The tab allows users to view and manage the case queries that feed a test plan. Three query types are supported:

- **Static** — user picks individual cases from a searchable list
- **Condition** — AND-joined field/operator/value filters
- **Folder** — selects all cases in one or more folders (descendants included)

Users can add multiple query groups, edit or remove them, and see a live resolved case list (deduplicated across all groups).

No new FreshProvider actions are required — queries are stored inside `TestPlan.queries[]` and updated via the existing `UPDATE_PLAN` action (patch the `queries` array).

Schema version does NOT change — this is UI-only work.

---

## Context

- Task 01 introduced `TestPlan`, `TestQuery`, `QueryCondition`, `resolvePlanCases`, and the existing `UPDATE_PLAN` action.
- `UPDATE_PLAN` takes `{ planId, patch: Partial<Pick<TestPlan, 'title' | 'description'>> }`. **Extend the patch type** to also accept `queries?: TestQuery[]` so the Test Cases tab can persist query changes.
- `resolvePlanCases(plan, cases, folders)` is already implemented in `demo-model.ts` — use it.
- `activeCases`, `activeFolders`, and the selected plan's data are already available in `PlansScreen` via `useFresh()`.
- `newId(prefix)` is available in `FreshProvider` — re-export or import it into `PlansScreen` if needed.
- CSS: all new styles go into the existing `prototype-plans.css`.
- No backend, no new state management libraries, no Tailwind.

---

## Files to change

### 1. `apps/web/src/fresh/data/FreshProvider.tsx`

Extend the `UPDATE_PLAN` patch type:

```ts
| { type: 'UPDATE_PLAN'; planId: string; patch: Partial<Pick<TestPlan, 'title' | 'description' | 'queries'>> }
```

The reducer already spreads the patch onto the plan — no other change needed once the type is widened.

Also expose `newId` on the context value (or as an exported utility), since `PlansScreen` needs to generate `TestQuery` ids client-side without dispatching:

```ts
// In FreshContextValue and the value object:
newQueryId: () => newId('tq')
```

---

### 2. `apps/web/src/fresh/styles/prototype-plans.css`

**Append** these new classes to the existing file. Do not replace anything.

```css
/* ─── Test cases tab ────────────────────────────────────────────────────── */

.pl-tc-lay {
  display: flex;
  gap: 14px;
}

.pl-tc-queries {
  width: 300px;
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.pl-tc-resolved {
  flex: 1;
  min-width: 0;
}

/* Query group card */

.pl-query-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  overflow: hidden;
}

.pl-query-card-hd {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
  background: color-mix(in srgb, var(--surface) 80%, var(--hover) 20%);
}

.pl-query-card-hd .pl-query-type-badge {
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  padding: 1px 5px;
  border-radius: 3px;
  background: var(--border2, var(--border));
  color: var(--text2);
}

.pl-query-card-hd .pl-query-title {
  flex: 1;
  font-size: 12px;
  font-weight: 600;
  color: var(--text1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pl-query-card-hd .pl-query-count {
  font-size: 10.5px;
  color: var(--text3);
  font-family: var(--mono);
}

.pl-query-card-hd .pl-query-remove {
  cursor: pointer;
  color: var(--text3);
  padding: 2px;
  border-radius: 3px;
  line-height: 1;
  background: none;
  border: none;
  font-size: 13px;
  display: flex;
  align-items: center;
}

.pl-query-card-hd .pl-query-remove:hover {
  color: var(--danger, #c0392b);
  background: var(--hover);
}

.pl-query-card-body {
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Condition rows */

.pl-cond-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr auto;
  gap: 4px;
  align-items: center;
}

.pl-cond-row select,
.pl-cond-row input {
  font-size: 11.5px;
  padding: 3px 6px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text1);
  min-width: 0;
}

.pl-cond-row .pl-cond-remove {
  cursor: pointer;
  color: var(--text3);
  background: none;
  border: none;
  padding: 2px;
  font-size: 13px;
  display: flex;
  align-items: center;
}

.pl-cond-row .pl-cond-remove:hover {
  color: var(--danger, #c0392b);
}

.pl-add-cond {
  font-size: 11px;
  color: var(--accent);
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 0;
  text-align: left;
  display: flex;
  align-items: center;
  gap: 4px;
}

.pl-add-cond:hover {
  text-decoration: underline;
}

/* Folder chip list */

.pl-folder-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.pl-folder-chip {
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 2px 7px;
  border-radius: 4px;
  background: var(--hover);
  border: 1px solid var(--border);
  font-size: 11px;
  color: var(--text1);
}

.pl-folder-chip button {
  background: none;
  border: none;
  cursor: pointer;
  color: var(--text3);
  padding: 0;
  line-height: 1;
  font-size: 12px;
  display: flex;
  align-items: center;
}

.pl-folder-chip button:hover {
  color: var(--danger, #c0392b);
}

.pl-folder-select {
  font-size: 11.5px;
  padding: 3px 6px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text1);
  width: 100%;
}

/* Static case checkboxes */

.pl-static-search {
  margin-bottom: 6px;
}

.pl-static-search input {
  width: 100%;
  font-size: 11.5px;
  padding: 4px 8px;
  border: 1px solid var(--border);
  border-radius: 4px;
  background: var(--surface);
  color: var(--text1);
  box-sizing: border-box;
}

.pl-static-list {
  max-height: 180px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.pl-static-case-row {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 3px 4px;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11.5px;
  color: var(--text1);
}

.pl-static-case-row:hover {
  background: var(--hover);
}

.pl-static-case-row .pl-case-key {
  font-family: var(--mono);
  font-size: 10px;
  color: var(--text3);
  min-width: 56px;
}

/* Add query group button */

.pl-add-query {
  width: 100%;
  padding: 8px;
  border: 1px dashed var(--border);
  border-radius: 8px;
  background: none;
  color: var(--accent);
  font-size: 12px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  transition: background 0.1s;
}

.pl-add-query:hover {
  background: var(--hover);
}

/* Add query dropdown menu */

.pl-add-query-menu {
  position: absolute;
  top: calc(100% + 4px);
  left: 0;
  right: 0;
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 8px;
  box-shadow: 0 4px 16px rgba(0,0,0,0.12);
  z-index: 100;
  overflow: hidden;
}

.pl-add-query-menu-item {
  padding: 9px 14px;
  font-size: 12.5px;
  color: var(--text1);
  cursor: pointer;
  display: flex;
  align-items: flex-start;
  gap: 8px;
}

.pl-add-query-menu-item:hover {
  background: var(--hover);
}

.pl-add-query-menu-item .pl-aqm-icon {
  font-size: 14px;
  color: var(--accent);
  margin-top: 1px;
  flex-shrink: 0;
}

.pl-add-query-menu-item .pl-aqm-body {}

.pl-add-query-menu-item .pl-aqm-title {
  font-weight: 600;
  margin-bottom: 1px;
}

.pl-add-query-menu-item .pl-aqm-desc {
  font-size: 11px;
  color: var(--text3);
}

/* Resolved cases panel */

.pl-resolved-hd {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 10px;
  font-size: 12px;
  font-weight: 600;
  color: var(--text1);
}

.pl-resolved-count {
  font-size: 10.5px;
  font-family: var(--mono);
  color: var(--text3);
}

.pl-resolved-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.pl-resolved-table th {
  text-align: left;
  padding: 6px 10px;
  font-size: 10.5px;
  font-weight: 600;
  color: var(--text3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border-bottom: 1px solid var(--border);
}

.pl-resolved-table td {
  padding: 7px 10px;
  border-bottom: 1px solid var(--border);
  color: var(--text1);
  vertical-align: middle;
}

.pl-resolved-table tr:last-child td {
  border-bottom: none;
}

.pl-resolved-table tr:hover td {
  background: var(--hover);
}

.pl-resolved-case-key {
  font-family: var(--mono);
  font-size: 10.5px;
  color: var(--accent);
}

.pl-resolved-source {
  font-size: 10px;
  color: var(--text3);
  font-style: italic;
}

.pl-resolved-empty {
  padding: 32px 20px;
  text-align: center;
  color: var(--text3);
  font-size: 12px;
}
```

---

### 3. `apps/web/src/fresh/screens/PlansScreen.tsx`

Read the file before editing. You will be building on top of the screen from Task 01.

**Replace the Test cases tab placeholder** with a full implementation. Do not modify the rest of the screen.

#### Local state to add

```ts
// Pending (unsaved) edits to the selected plan's queries
const [pendingQueries, setPendingQueries] = useState<TestQuery[] | null>(null)
const [addQueryMenuOpen, setAddQueryMenuOpen] = useState(false)
const [staticSearch, setStaticSearch] = useState<Record<string, string>>({}) // keyed by query id
const addQueryRef = useRef<HTMLDivElement>(null)
```

#### Computed values for the Test cases tab

```ts
const queries = pendingQueries ?? selectedPlan?.queries ?? []

const queryResolvedCases = useMemo(() => {
  if (!selectedPlan) return {}
  const fakePlan = { ...selectedPlan, queries }
  const result: Record<string, Case[]> = {}
  for (const q of queries) {
    const fakeSinglePlan = { ...fakePlan, queries: [q] }
    result[q.id] = resolvePlanCases(fakeSinglePlan, activeCases, activeFolders)
  }
  return result
}, [selectedPlan, queries, activeCases, activeFolders])

const resolvedCasesAll = useMemo(() => {
  if (!selectedPlan) return []
  const fakePlan = { ...selectedPlan, queries }
  return resolvePlanCases(fakePlan, activeCases, activeFolders)
}, [selectedPlan, queries, activeCases, activeFolders])
```

#### Query persistence pattern

When the user modifies a query (adds, removes, edits conditions/folders/cases), update `pendingQueries` optimistically. Persist with a "Save" button at the top of the tab, or auto-save on each change (auto-save is preferred for simplicity — call `updatePlan` on every change with `{ queries: newQueries }`). Choose the simpler approach.

If auto-saving:
```ts
function commitQueries(next: TestQuery[]) {
  setPendingQueries(next)
  if (selectedPlan) updatePlan(selectedPlan.id, { queries: next })
}
```

Reset `pendingQueries` to `null` whenever `selectedPlan` changes (use a `useEffect`).

#### Test cases tab render structure

```tsx
<div className="pl-tc-lay">
  {/* Left: query groups */}
  <div className="pl-tc-queries">
    {queries.map((q) => (
      <QueryGroupCard
        key={q.id}
        query={q}
        resolvedCount={queryResolvedCases[q.id]?.length ?? 0}
        activeCases={activeCases}
        activeFolders={activeFolders}
        staticSearch={staticSearch[q.id] ?? ''}
        onStaticSearch={(v) => setStaticSearch((prev) => ({ ...prev, [q.id]: v }))}
        onUpdate={(patch) => {
          commitQueries(queries.map((x) => (x.id === q.id ? { ...x, ...patch } : x)))
        }}
        onRemove={() => {
          commitQueries(queries.filter((x) => x.id !== q.id))
        }}
      />
    ))}

    {/* Add query group button */}
    <div style={{ position: 'relative' }} ref={addQueryRef}>
      <button
        type="button"
        className="pl-add-query"
        onClick={() => setAddQueryMenuOpen((v) => !v)}
      >
        <i className="ti ti-plus" /> Add query group
      </button>
      {addQueryMenuOpen && (
        <div className="pl-add-query-menu">
          {[
            {
              type: 'condition' as const,
              icon: 'ti-filter',
              title: 'Condition query',
              desc: 'Filter cases by field, operator, and value',
            },
            {
              type: 'folder' as const,
              icon: 'ti-folder',
              title: 'Folder query',
              desc: 'Include all cases in selected folders',
            },
            {
              type: 'static' as const,
              icon: 'ti-checklist',
              title: 'Static selection',
              desc: 'Hand-pick individual test cases',
            },
          ].map(({ type, icon, title, desc }) => (
            <div
              key={type}
              className="pl-add-query-menu-item"
              onClick={() => {
                const q: TestQuery = {
                  id: newQueryId(),
                  title: title,
                  type,
                  ...(type === 'condition' ? { conditions: [{ field: 'priority', operator: 'equals', value: '' }] } : {}),
                  ...(type === 'folder' ? { folderIds: [] } : {}),
                  ...(type === 'static' ? { caseIds: [] } : {}),
                }
                commitQueries([...queries, q])
                setAddQueryMenuOpen(false)
              }}
            >
              <i className={`ti ${icon} pl-aqm-icon`} />
              <div className="pl-aqm-body">
                <div className="pl-aqm-title">{title}</div>
                <div className="pl-aqm-desc">{desc}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>

  {/* Right: resolved cases */}
  <div className="pl-tc-resolved">
    <div className="pl-resolved-hd">
      <i className="ti ti-list-check" />
      Resolved test cases
      <span className="pl-resolved-count">{resolvedCasesAll.length} total</span>
    </div>
    <div className="pl-panel">
      {resolvedCasesAll.length === 0 ? (
        <div className="pl-resolved-empty">
          No test cases match the current query groups.
        </div>
      ) : (
        <table className="pl-resolved-table">
          <thead>
            <tr>
              <th>Key</th>
              <th>Title</th>
              <th>Priority</th>
              <th>Source</th>
            </tr>
          </thead>
          <tbody>
            {resolvedCasesAll.map((c) => {
              // Find which query first matched this case
              const sourceQuery = queries.find((q) =>
                queryResolvedCases[q.id]?.some((rc) => rc.id === c.id),
              )
              return (
                <tr key={c.id}>
                  <td><span className="pl-resolved-case-key">{c.caseKey ?? c.id}</span></td>
                  <td>{c.title}</td>
                  <td>{c.priority}</td>
                  <td><span className="pl-resolved-source">{sourceQuery?.title ?? '—'}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </div>
  </div>
</div>
```

#### `QueryGroupCard` component

Implement as a local function component inside `PlansScreen.tsx` (above the `PlansScreen` function).

```tsx
interface QueryGroupCardProps {
  query: TestQuery
  resolvedCount: number
  activeCases: Case[]
  activeFolders: Folder[]
  staticSearch: string
  onStaticSearch: (v: string) => void
  onUpdate: (patch: Partial<TestQuery>) => void
  onRemove: () => void
}

function QueryGroupCard({
  query,
  resolvedCount,
  activeCases,
  activeFolders,
  staticSearch,
  onStaticSearch,
  onUpdate,
  onRemove,
}: QueryGroupCardProps) {
  const typeLabel =
    query.type === 'condition' ? 'CONDITION' : query.type === 'folder' ? 'FOLDER' : 'STATIC'

  return (
    <div className="pl-query-card">
      <div className="pl-query-card-hd">
        <span className="pl-query-type-badge">{typeLabel}</span>
        <span className="pl-query-title">{query.title}</span>
        <span className="pl-query-count">{resolvedCount}</span>
        <button type="button" className="pl-query-remove" title="Remove query group" onClick={onRemove}>
          <i className="ti ti-x" />
        </button>
      </div>
      <div className="pl-query-card-body">
        {query.type === 'condition' && (
          <ConditionQueryBody query={query} onUpdate={onUpdate} />
        )}
        {query.type === 'folder' && (
          <FolderQueryBody query={query} activeFolders={activeFolders} onUpdate={onUpdate} />
        )}
        {query.type === 'static' && (
          <StaticQueryBody
            query={query}
            activeCases={activeCases}
            search={staticSearch}
            onSearch={onStaticSearch}
            onUpdate={onUpdate}
          />
        )}
      </div>
    </div>
  )
}
```

#### `ConditionQueryBody` sub-component

```tsx
const FIELD_OPTIONS: { value: QueryField; label: string }[] = [
  { value: 'title', label: 'Title' },
  { value: 'priority', label: 'Priority' },
  { value: 'type', label: 'Type' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'tags', label: 'Tags' },
  { value: 'caseKey', label: 'Case key' },
]

const OPERATOR_OPTIONS: { value: QueryOperator; label: string }[] = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'not equals' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'not contains' },
]

function ConditionQueryBody({ query, onUpdate }: { query: TestQuery; onUpdate: (patch: Partial<TestQuery>) => void }) {
  const conditions = query.conditions ?? []

  function updateCondition(i: number, patch: Partial<QueryCondition>) {
    const next = conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c))
    onUpdate({ conditions: next })
  }

  function removeCondition(i: number) {
    onUpdate({ conditions: conditions.filter((_, idx) => idx !== i) })
  }

  function addCondition() {
    onUpdate({ conditions: [...conditions, { field: 'priority', operator: 'equals', value: '' }] })
  }

  return (
    <>
      {conditions.map((cond, i) => (
        <div key={i} className="pl-cond-row">
          <select value={cond.field} onChange={(e) => updateCondition(i, { field: e.target.value as QueryField })}>
            {FIELD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={cond.operator} onChange={(e) => updateCondition(i, { operator: e.target.value as QueryOperator })}>
            {OPERATOR_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <input
            type="text"
            placeholder="Value…"
            value={cond.value}
            onChange={(e) => updateCondition(i, { value: e.target.value })}
          />
          <button type="button" className="pl-cond-remove" title="Remove condition" onClick={() => removeCondition(i)}>
            <i className="ti ti-x" />
          </button>
        </div>
      ))}
      <button type="button" className="pl-add-cond" onClick={addCondition}>
        <i className="ti ti-plus" /> Add condition
      </button>
    </>
  )
}
```

#### `FolderQueryBody` sub-component

```tsx
function FolderQueryBody({
  query,
  activeFolders,
  onUpdate,
}: {
  query: TestQuery
  activeFolders: Folder[]
  onUpdate: (patch: Partial<TestQuery>) => void
}) {
  const selectedIds = new Set(query.folderIds ?? [])
  const unselectedFolders = activeFolders.filter((f) => !selectedIds.has(f.id))

  function addFolder(folderId: string) {
    if (!selectedIds.has(folderId)) {
      onUpdate({ folderIds: [...(query.folderIds ?? []), folderId] })
    }
  }

  function removeFolder(folderId: string) {
    onUpdate({ folderIds: (query.folderIds ?? []).filter((id) => id !== folderId) })
  }

  return (
    <>
      <div className="pl-folder-chips">
        {(query.folderIds ?? []).map((fid) => {
          const folder = activeFolders.find((f) => f.id === fid)
          return (
            <div key={fid} className="pl-folder-chip">
              <i className="ti ti-folder" style={{ fontSize: 11, color: 'var(--accent)' }} />
              {folder?.name ?? fid}
              <button type="button" title="Remove folder" onClick={() => removeFolder(fid)}>
                <i className="ti ti-x" />
              </button>
            </div>
          )
        })}
      </div>
      {unselectedFolders.length > 0 && (
        <select
          className="pl-folder-select"
          value=""
          onChange={(e) => {
            if (e.target.value) addFolder(e.target.value)
          }}
        >
          <option value="">+ Add folder…</option>
          {unselectedFolders.map((f) => (
            <option key={f.id} value={f.id}>{f.name}</option>
          ))}
        </select>
      )}
    </>
  )
}
```

#### `StaticQueryBody` sub-component

```tsx
function StaticQueryBody({
  query,
  activeCases,
  search,
  onSearch,
  onUpdate,
}: {
  query: TestQuery
  activeCases: Case[]
  search: string
  onSearch: (v: string) => void
  onUpdate: (patch: Partial<TestQuery>) => void
}) {
  const selected = new Set(query.caseIds ?? [])

  function toggle(caseId: string) {
    if (selected.has(caseId)) {
      onUpdate({ caseIds: (query.caseIds ?? []).filter((id) => id !== caseId) })
    } else {
      onUpdate({ caseIds: [...(query.caseIds ?? []), caseId] })
    }
  }

  const filtered = activeCases.filter((c) => {
    const q = search.toLowerCase()
    if (!q) return true
    return (c.title?.toLowerCase().includes(q) || (c.caseKey ?? '').toLowerCase().includes(q))
  })

  return (
    <>
      <div className="pl-static-search">
        <input
          type="text"
          placeholder="Search cases…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <div className="pl-static-list">
        {filtered.map((c) => (
          <label key={c.id} className="pl-static-case-row">
            <input
              type="checkbox"
              checked={selected.has(c.id)}
              onChange={() => toggle(c.id)}
              style={{ flexShrink: 0 }}
            />
            <span className="pl-case-key">{c.caseKey ?? c.id}</span>
            <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {c.title}
            </span>
          </label>
        ))}
        {filtered.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--text3)', padding: '4px 0' }}>No cases match.</div>
        )}
      </div>
    </>
  )
}
```

#### Click-outside for `addQueryMenuOpen`

Add a `useEffect` that listens for `mousedown` on `document` and closes the menu if the click target is outside `addQueryRef.current`. Follow the same pattern used for `moreMenuRef` in the Overview tab.

#### Reset `pendingQueries` on plan change

```ts
useEffect(() => {
  setPendingQueries(null)
  setStaticSearch({})
}, [selectedPlan?.id])
```

---

## Files that will NOT change

- `demo-model.ts`, `migrate-demo-state.ts`, `demo-seed.ts` (no schema bump needed)
- `project-selectors.ts`, `project-routes.ts`
- All other screens (`RunsScreen.tsx`, `CasesScreen.tsx`, etc.)
- Route page files (`plans/page.tsx`, `plans/tp/[planKey]/page.tsx`)
- Any API routes, backend, Docker config

---

## Step 1 — Read files before touching them

```
Read apps/web/src/fresh/screens/PlansScreen.tsx
Read apps/web/src/fresh/styles/prototype-plans.css
Read apps/web/src/fresh/data/FreshProvider.tsx
Read apps/web/src/fresh/data/demo-model.ts
```

---

## Step 2 — Make changes

Apply in order:
1. `FreshProvider.tsx` — widen `UPDATE_PLAN` patch type; expose `newQueryId` on context
2. `prototype-plans.css` — append new `.pl-tc-*` classes
3. `PlansScreen.tsx` — add `QueryGroupCard` and sub-components; replace Test cases tab placeholder; add new local state; add `commitQueries` helper; add click-outside effect; add `pendingQueries` reset effect

---

## Step 3 — Build verification

```bash
cd /Users/shaun.sevume/Projects/Relay && pnpm build
```

Zero TypeScript errors required.

---

## Step 4 — Manual checks

1. Start dev server: `cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev`
2. Open `/DP/plans/tp/00001` (Smoketest). Switch to the **Test cases** tab.
3. Confirm the seed condition query group is visible (type badge: CONDITION, title: "Critical priority cases").
4. **Resolved panel**: cases matching `priority = Critical` appear in the right table. Source column shows "Critical priority cases".
5. **Edit condition**: change the value from "Critical" to "High" — confirm resolved cases update live.
6. **Add condition**: click "+ Add condition" — new row appears; fill in `type / equals / Automated`; confirm resolved list narrows.
7. **Remove condition**: click the × on one condition; confirm list updates.
8. **Remove query group**: click the × on the card header; confirm it disappears and resolved panel empties.
9. **Add condition query**: click "Add query group" → "Condition query"; new card appears; fill fields; confirm cases resolve.
10. **Add folder query**: click "Add query group" → "Folder query"; add the CTMS folder chip; confirm folder cases appear.
11. **Add static query**: click "Add query group" → "Static selection"; search for a case by title; check it; confirm it appears in resolved panel.
12. **Persistence**: reload page — confirm changes persisted (queries saved to `FreshProvider`/`localStorage`).
13. **Switch plans**: select Full Regression; confirm query groups show folder queries (CTMS, eTMF). Switch back to Smoketest — confirm original queries restored.
14. **Coverage donut on Overview tab**: after modifying Smoketest's queries, switch back to Overview tab — confirm the donut % updates to reflect the new resolved case count.

---

## Step 5 — Commit

Run `git diff HEAD` and cross-check before committing:

```
Test plans: Test cases tab with static, folder, and condition queries

`FreshProvider.tsx`
* Widened `UPDATE_PLAN` patch type to accept `queries?: TestQuery[]`
* Exposed `newQueryId` helper on context value

`prototype-plans.css`
* Added `.pl-tc-lay`, `.pl-tc-queries`, `.pl-tc-resolved` layout classes
* Added `.pl-query-card` family for query group cards
* Added `.pl-cond-row` classes for condition row editor
* Added `.pl-folder-chip` and `.pl-folder-select` for folder picker
* Added `.pl-static-search`, `.pl-static-list`, `.pl-static-case-row` for case checkboxes
* Added `.pl-add-query` and `.pl-add-query-menu` for the add-group button and menu
* Added `.pl-resolved-table` and `.pl-resolved-empty` for the resolved case panel

`PlansScreen.tsx`
* Added `QueryGroupCard`, `ConditionQueryBody`, `FolderQueryBody`, `StaticQueryBody` local components
* Replaced Test cases tab placeholder with full two-column layout (queries left, resolved right)
* Added `pendingQueries`, `addQueryMenuOpen`, `staticSearch`, `addQueryRef` state/refs
* Added `commitQueries` auto-save helper (calls `updatePlan` with new queries on each change)
* Added `queryResolvedCases` and `resolvedCasesAll` memos for live case resolution
* Added click-outside effect for `addQueryMenuOpen`
* Added `useEffect` to reset pending state when selected plan changes
```

---

## Step 6 — Restart dev server

```bash
cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev
```
