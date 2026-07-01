# Task 06 — Pagination, human-readable case IDs, folder search

## Context from previous task
Branch: `mvp-test-cases`.

Tasks 01–05 are complete:
- Schema v7. `Case` has `template`, `references`, `summary`, `customFieldValues`.
- CaseDetail: 7 tabs, custom field rendering, per-row context menu.
- Last results sparkline column and filter panel are working.
- `DemoState` already has `nextCaseNumByProject: Record<string, number>` (currently used for runs via `nextRunNumByProject`; the `nextCaseNumByProject` key exists but case IDs are still internal strings like `case-001`).
- `DemoRun` has a `runKey` field (formatted with `formatRunKey`). We will add `caseKey` to `Case` using the same pattern.

## Objective

### Part A — Human-readable case IDs
- Add `caseKey?: string` to the `Case` type.
- When a new case is created (`ADD_CASE` in `FreshProvider`), assign `caseKey = formatCaseKey(nextCaseNumByProject[projectId])` and increment `nextCaseNumByProject[projectId]`.
- Bump schema to **v8** and write the v7→v8 migration to backfill `caseKey` for existing cases.
- Display `caseKey` in the ID column of the table and in the `dp-id` span in the detail panel header.

### Part B — Pagination
- Add a pagination footer below the case table.
- Per-page options: 10, 25, 50, "All".
- Show "X–Y of Z cases" label.
- Prev / Next buttons. Disable Prev on page 1, Next on last page.
- Reset to page 1 when folder selection or filter conditions change.

### Part C — Folder search
- Add a search input above the folder tree in the left sidebar.
- Filters the visible folder list to show only folders whose names contain the search string (case-insensitive), plus their ancestors (so the tree remains navigable).
- Clearing the search restores the full tree.

## Files that will change
- `apps/web/src/fresh/data/demo-model.ts` (add `caseKey` to `Case`, add `formatCaseKey`, bump version to 8)
- `apps/web/src/fresh/data/migrate-demo-state.ts` (v7→v8 migration)
- `apps/web/src/fresh/data/FreshProvider.tsx` (assign `caseKey` in `ADD_CASE` reducer case)
- `apps/web/src/fresh/screens/CasesScreen.tsx` (display `caseKey`, add pagination, add folder search)

## Files that will NOT change
- Any other file

---

## Step 1 — Read files before touching them

```
Read apps/web/src/fresh/data/demo-model.ts
Read apps/web/src/fresh/data/migrate-demo-state.ts
Read apps/web/src/fresh/data/FreshProvider.tsx
Read apps/web/src/fresh/screens/CasesScreen.tsx
```

---

## Part A — Human-readable case IDs

### A1 — `demo-model.ts`

Add a `formatCaseKey` function (near `formatRunKey`):
```ts
/** Format a per-project case counter as a 5-digit key, e.g. TC-00001. */
export function formatCaseKey(n: number): string {
  return `TC-${n.toString().padStart(5, '0')}`
}
```

Add `caseKey` to the `Case` interface (after `id`):
```ts
/** Project-scoped human-readable ID, e.g. TC-00001. Assigned on creation. */
caseKey?: string
```

Bump `DEMO_SCHEMA_VERSION` from `7` to `8`.

### A2 — `migrate-demo-state.ts`

After the v6→v7 block, add:

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
```

`migrate-demo-state.ts` already has `import type { Case, ... }` at the top — that is a type-only import and cannot include `formatCaseKey`. Add a separate value import on its own line:

```ts
import { formatCaseKey } from './demo-model'
```

### A3 — `FreshProvider.tsx` — assign `caseKey` in `ADD_CASE`

Find the `ADD_CASE` reducer case. It currently looks like:

```ts
case 'ADD_CASE': {
  const projectId = state.activeProjectId
  const num = getActiveProjectNextCaseNum(state)
  next = {
    ...state,
    cases: [...state.cases, action.case],
    nextCaseNumByProject: { ...state.nextCaseNumByProject, [projectId]: num + 1 },
  }
  break
}
```

The case object (`action.case`) is pre-built before it reaches the reducer, so `caseKey` must be stamped on it here. Add `const caseKey = formatCaseKey(num)` and spread it when appending:

```ts
case 'ADD_CASE': {
  const projectId = state.activeProjectId
  const num = getActiveProjectNextCaseNum(state)
  const caseKey = formatCaseKey(num)
  next = {
    ...state,
    cases: [...state.cases, { ...action.case, caseKey }],
    nextCaseNumByProject: { ...state.nextCaseNumByProject, [projectId]: num + 1 },
  }
  break
}
```

Add `formatCaseKey` to the existing import from `'./demo-model'` at the top of `FreshProvider.tsx`.

### A4 — `CasesScreen.tsx` — display `caseKey`

In the case table, change the ID column cell from:
```tsx
<td className="tmono">{c.id}</td>
```
to:
```tsx
<td className="tmono" style={{ color: 'var(--accent)', fontWeight: 500 }}>{c.caseKey ?? c.id}</td>
```

In `CaseDetail`, change the header ID span from:
```tsx
<span className="dp-id">{c.id}</span>
```
to:
```tsx
<span className="dp-id">{c.caseKey ?? c.id}</span>
```

---

## Part B — Pagination

### B1 — Pagination state

In `CasesScreen`, add:
```ts
const [pageSize, setPageSize] = useState<number | 'all'>(25)
const [currentPage, setCurrentPage] = useState(1)
```

Reset page to 1 when folder or filters change. Extend the existing `useEffect` that watches `activeProject.id` to also call `setCurrentPage(1)`. Add a separate `useEffect`:
```ts
useEffect(() => { setCurrentPage(1) }, [selectedFolderId, statusFilter, filterConditions])
```

### B2 — Slice `displayedCases` for the current page

After the `displayedCases` memo, add:

```ts
const totalCases = displayedCases.length
const pageSizeNum = pageSize === 'all' ? totalCases : pageSize
const totalPages = Math.max(1, Math.ceil(totalCases / pageSizeNum))
const safePage = Math.min(currentPage, totalPages)
const pagedCases = pageSize === 'all'
  ? displayedCases
  : displayedCases.slice((safePage - 1) * pageSizeNum, safePage * pageSizeNum)
```

Use `pagedCases` in place of `displayedCases` when rendering `<tbody>` rows. Keep using `displayedCases.length` for the "X cases" counter in the toolbar.

### B3 — Pagination footer

Add a footer just below the `<div className="tc-wrap">` / `</div>` closing tag:

```tsx
{totalCases > 0 ? (
  <div className="tc-pagination">
    <span style={{ fontSize: 11, color: 'var(--text2)', marginRight: 8 }}>Rows per page:</span>
    <select
      style={{ fontSize: 11, padding: '1px 4px' }}
      value={pageSize}
      onChange={(e) => {
        setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value))
        setCurrentPage(1)
      }}
    >
      <option value={10}>10</option>
      <option value={25}>25</option>
      <option value={50}>50</option>
      <option value="all">All</option>
    </select>
    <span style={{ fontSize: 11, color: 'var(--text2)', margin: '0 12px' }}>
      {pageSize === 'all' || totalCases === 0
        ? `${totalCases} cases`
        : `${(safePage - 1) * pageSizeNum + 1}–${Math.min(safePage * pageSizeNum, totalCases)} of ${totalCases}`}
    </span>
    <button
      type="button"
      className="btn"
      style={{ padding: '1px 6px', fontSize: 12 }}
      disabled={safePage <= 1}
      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
    >
      <i className="ti ti-chevron-left" style={{ fontSize: 13 }} />
    </button>
    <button
      type="button"
      className="btn"
      style={{ padding: '1px 6px', fontSize: 12 }}
      disabled={safePage >= totalPages}
      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
    >
      <i className="ti ti-chevron-right" style={{ fontSize: 13 }} />
    </button>
  </div>
) : null}
```

Add CSS for `.tc-pagination` near other `.tc-*` rules:

```css
.tc-pagination {
  display: flex;
  align-items: center;
  padding: 6px 12px;
  border-top: 1px solid var(--border);
  background: var(--surface);
  flex-shrink: 0;
}
```

---

## Part C — Folder search

### C1 — Folder search state

In `CasesScreen`, add:
```ts
const [folderSearch, setFolderSearch] = useState('')
```

### C2 — Filter visible folders

When `folderSearch` is non-empty, compute the set of folder IDs that match the search term or are ancestors of matching folders:

```ts
const visibleFolderIds = useMemo(() => {
  if (!folderSearch.trim()) return null // null = show all
  const term = folderSearch.toLowerCase()
  const matched = new Set(activeFolders.filter((f) => f.name.toLowerCase().includes(term)).map((f) => f.id))
  // Include ancestors of matched folders
  matched.forEach((id) => {
    folderAncestorIds(activeFolders, id).forEach((aid) => matched.add(aid))
  })
  return matched
}, [folderSearch, activeFolders])
```

Pass `visibleFolderIds` into `FolderTreeNode`. Each node should check `if (visibleFolderIds && !visibleFolderIds.has(folder.id)) return null` before rendering.

Update the `FolderTreeNode` component signature to accept:
```ts
visibleFolderIds: Set<string> | null
```

Propagate this prop to all recursive child calls.

### C3 — Render the search input

In the `suite-tree` sidebar, just below the `.st-hd` header div and above `.st-body`, add:

```tsx
<div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
  <input
    type="text"
    placeholder="Filter folders…"
    value={folderSearch}
    onChange={(e) => setFolderSearch(e.target.value)}
    style={{
      width: '100%',
      fontSize: 12,
      padding: '3px 7px',
      borderRadius: 4,
      border: '1px solid var(--border)',
      background: 'var(--surface)',
      color: 'var(--text1)',
      boxSizing: 'border-box',
    }}
  />
</div>
```

---

## Step 2 — Update `docs/_authoritative/DOMAIN_MODEL.md`

Add notes for:
- `caseKey` field on `Case` and `formatCaseKey` utility
- `nextCaseNumByProject` usage for `ADD_CASE` (mirrors `nextRunNumByProject` for runs)
- Schema v8 and v7→v8 migration

---

## Step 3 — Build verification

```bash
cd /Users/shaun.sevume/Projects/Relay && pnpm build
```

Zero TypeScript errors required.

---

## Step 4 — Manual check

1. Start dev server: `cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev`
2. Clear localStorage (`relay-demo-v2`) in DevTools to force the v8 migration.
3. **Case IDs**: confirm all existing cases show TC-XXXXX in the ID column and in the detail panel header.
4. **New case**: click "New case" or use Quick create — confirm the new case gets the next TC-XXXXX key.
5. **Pagination**: with 25 rows per page set, confirm only 25 rows show, the "1–25 of N" label is correct, Next/Prev buttons work, and switching to "All" shows all rows.
6. **Folder search**: type "CTMS" in the filter input — confirm only folders with matching names (and their parents) are shown. Clear — confirm full tree returns.
7. **Page reset**: change folder selection — confirm page resets to 1.

---

## Step 5 — Commit

Run `git diff HEAD` and cross-check the actual changes against the proposed message below. Before committing, flag:
- Any file changed that is not mentioned in the message
- Any change made that is not reflected in the bullets
- Any bullet that describes something not actually done

Adjust the message to match reality, then commit.

**Proposed message:**
```
Test cases: human-readable case IDs, pagination footer, folder search

`demo-model.ts`
* Added `formatCaseKey()` utility; added `caseKey?: string` to `Case` interface
* Bumped `DEMO_SCHEMA_VERSION` to 8

`migrate-demo-state.ts`
* Added v7→v8 migration — backfills `caseKey` on existing cases using `nextCaseNumByProject`

`FreshProvider.tsx`
* `ADD_CASE` reducer now assigns `caseKey` from `nextCaseNumByProject` and increments the counter

`CasesScreen.tsx`
* Case table ID column and detail panel header show `caseKey` (falls back to `c.id` for legacy data)
* Added pagination footer: page-size selector (10/25/50/All), X–Y of Z label, Prev/Next buttons; resets to page 1 on folder or filter change
* Added folder search input above folder tree; filters visible nodes to name-matching folders and their ancestors; `FolderTreeNode` accepts `visibleFolderIds: Set<string> | null`

`DOMAIN_MODEL.md`
* Updated for schema v8, `caseKey` field, and `formatCaseKey` utility
```

---

## Step 6 — Restart dev server

```bash
cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev
```
