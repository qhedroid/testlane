# Task 08 — Global keyword search + Create test run from test cases

## Context from previous tasks

Branch: `mvp-test-cases`. Tasks 01–07 complete.

Key state in `CasesScreen` (read the file before touching it):
- `displayedCases` — full filtered list (folder + statusFilter + filterConditions + new keywordSearch)
- `pagedCases` — paginated slice rendered in `<tbody>`
- `folderCases` — cases in the currently selected folder
- `activeCases` — all cases for the active project
- `selectedFolderId` — `string | '__unfiled__'`
- `activeFolders` — all folders for the active project
- `useProjectHref` hook: call `projectHref('runs')` to get the runs page URL for the active project

`useFresh()` exposes `createRun({ name, description? })` which dispatches `CREATE_RUN` and returns `{ runKey }`. We will extend it to accept an optional `caseIds` list.

The `FreshTopbar` `actions` prop is rendered verbatim as `{actions}` inside the topbar — refs on elements inside `actions` work correctly.

Navigation: use `useRouter` from `'next/navigation'` for client-side navigation.

`folderLabel(activeFolders, folderId)` (imported from `demo-model`) formats a folder name for display.

## Objective

### Part A — Extend `CREATE_RUN` to support a custom case list (`FreshProvider.tsx`)

1. Add `caseIds?: string[]` to the `CREATE_RUN` action union type:
   ```ts
   | { type: 'CREATE_RUN'; name: string; description?: string; caseIds?: string[] }
   ```

2. In the `CREATE_RUN` reducer case, replace:
   ```ts
   const caseOrder = listActiveProjectTestCases(state).map((c) => c.id)
   ```
   with:
   ```ts
   const caseOrder = action.caseIds ?? listActiveProjectTestCases(state).map((c) => c.id)
   ```

3. Update the `createRun` callback to accept and forward `caseIds`:
   ```ts
   const createRun = useCallback(
     (input: { name: string; description?: string; caseIds?: string[] }) => {
       const num = getActiveProjectNextRunNum(state)
       const runKey = formatRunKey(num)
       dispatch({ type: 'CREATE_RUN', name: input.name, description: input.description, caseIds: input.caseIds })
       return { runKey }
     },
     [state],
   )
   ```
   Also update the `FreshContext` type for `createRun` if it is explicitly typed there.

### Part B — Global keyword search (`CasesScreen.tsx`)

#### B1 — State

```ts
const [keywordSearch, setKeywordSearch] = useState('')
```

#### B2 — Include in `displayedCases` memo

After the existing filter conditions loop, add:

```ts
if (keywordSearch.trim()) {
  const kw = keywordSearch.toLowerCase()
  result = result.filter((c) =>
    c.title.toLowerCase().includes(kw) ||
    (c.caseKey ?? '').toLowerCase().includes(kw)
  )
}
```

Add `keywordSearch` to the memo dependency array.

#### B3 — Reset page on keyword change

Add `keywordSearch` to the existing `useEffect` that resets `currentPage`:

```ts
useEffect(() => { setCurrentPage(1) }, [selectedFolderId, statusFilter, filterConditions, keywordSearch])
```

#### B4 — Render search input in `tc-bar`

Remove the existing standalone `<span>` that shows the case count (it will be moved). Add the search input and a repositioned case count to the right end of `tc-bar`:

```tsx
{/* Search input — right-aligned in tc-bar */}
<div style={{ position: 'relative', marginLeft: 'auto' }}>
  <i
    className="ti ti-search"
    style={{
      position: 'absolute', left: 7, top: '50%',
      transform: 'translateY(-50%)',
      fontSize: 12, color: 'var(--text3)', pointerEvents: 'none',
    }}
  />
  <input
    type="text"
    placeholder="Search cases…"
    value={keywordSearch}
    onChange={(e) => setKeywordSearch(e.target.value)}
    style={{
      fontSize: 12,
      padding: '3px 7px 3px 24px',
      borderRadius: 4,
      border: '1px solid var(--border)',
      background: 'var(--surface)',
      color: 'var(--text1)',
      width: 180,
    }}
  />
</div>
<span style={{ fontSize: 10.5, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
  {displayedCases.length} cases
</span>
```

### Part C — "Create test run" button with scope dropdown (`CasesScreen.tsx`)

#### C1 — State and refs

First, update the `next/navigation` import at the top of the file to add `useRouter`:

```ts
// Before:
import { usePathname } from 'next/navigation'
// After:
import { usePathname, useRouter } from 'next/navigation'
```

Then add `createRun` to the `useFresh()` destructure (line ~227):

```ts
// Before:
const { activeFolders, activeCases, activeRuns, activeProject, adminSettings, addCase, replaceCase, deleteCase, addFolder } = useFresh()
// After:
const { activeFolders, activeCases, activeRuns, activeProject, adminSettings, addCase, replaceCase, deleteCase, addFolder, createRun } = useFresh()
```

Then add state and refs inside the component:

```ts
const router = useRouter()
const [createRunMenuOpen, setCreateRunMenuOpen] = useState(false)
const createRunMenuRef = useRef<HTMLDivElement>(null)
const [createRunModal, setCreateRunModal] = useState<{
  scope: 'folder' | 'all'
  name: string
} | null>(null)
```

#### C2 — Click-outside handler for the dropdown menu

Same pattern as the context menu and filter panel:

```ts
useEffect(() => {
  if (!createRunMenuOpen) return
  function handleClick(e: MouseEvent) {
    if (createRunMenuRef.current && !createRunMenuRef.current.contains(e.target as Node)) {
      setCreateRunMenuOpen(false)
    }
  }
  document.addEventListener('mousedown', handleClick)
  return () => document.removeEventListener('mousedown', handleClick)
}, [createRunMenuOpen])
```

#### C3 — Helper to open the name modal

```ts
function openCreateRunModal(scope: 'folder' | 'all') {
  setCreateRunMenuOpen(false)
  setCreateRunModal({ scope, name: '' })
}
```

#### C4 — `doCreateRun` function

```ts
function doCreateRun() {
  if (!createRunModal?.name.trim()) return
  const caseIds =
    createRunModal.scope === 'folder'
      ? folderCases.map((c) => c.id)
      : undefined // undefined = all project cases (reducer default)
  createRun({ name: createRunModal.name.trim(), caseIds })
  setCreateRunModal(null)
  router.push(projectHref('runs'))
}
```

#### C5 — "Create test run" button in `FreshTopbar` actions

Add the button as the **first** element in the `actions` prop passed to `FreshTopbar` (before the Import button):

```tsx
{/* Create test run dropdown */}
<div style={{ position: 'relative' }} ref={createRunMenuRef}>
  <button
    type="button"
    className="btn"
    onClick={() => setCreateRunMenuOpen((v) => !v)}
  >
    <i className="ti ti-player-play" style={{ fontSize: 12 }} /> Create test run
    <i className="ti ti-chevron-down" style={{ fontSize: 10, marginLeft: 3 }} />
  </button>
  {createRunMenuOpen ? (
    <div
      style={{
        position: 'absolute',
        top: '100%',
        right: 0,
        marginTop: 4,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 6,
        boxShadow: '0 4px 16px rgba(0,0,0,.18)',
        zIndex: 200,
        minWidth: 220,
        padding: 4,
      }}
    >
      <button
        type="button"
        className="ctx-item"
        onClick={() => openCreateRunModal('folder')}
      >
        <i className="ti ti-folder" /> Cases in current folder ({folderCases.length})
      </button>
      <button
        type="button"
        className="ctx-item"
        onClick={() => openCreateRunModal('all')}
      >
        <i className="ti ti-stack" /> All project cases ({activeCases.length})
      </button>
    </div>
  ) : null}
</div>
```

#### C6 — Create run modal

Render this near the end of the `CasesScreen` return, alongside the context menu and sparkline tooltip:

```tsx
{createRunModal ? (
  <div
    style={{
      position: 'fixed', inset: 0, zIndex: 400,
      background: 'rgba(0,0,0,.25)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}
    onClick={() => setCreateRunModal(null)}
  >
    <div
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        padding: 20,
        width: 340,
        boxShadow: '0 8px 32px rgba(0,0,0,.22)',
      }}
      onClick={(e) => e.stopPropagation()}
    >
      <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>
        Create test run
      </div>
      <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
        {createRunModal.scope === 'folder'
          ? `${folderCases.length} cases from "${folderLabel(activeFolders, selectedFolderId === '__unfiled__' ? null : selectedFolderId)}"`
          : `${activeCases.length} cases (all project cases)`}
      </div>
      <input
        // eslint-disable-next-line jsx-a11y/no-autofocus
        autoFocus
        type="text"
        placeholder="Run name…"
        value={createRunModal.name}
        onChange={(e) =>
          setCreateRunModal((m) => (m ? { ...m, name: e.target.value } : m))
        }
        onKeyDown={(e) => {
          if (e.key === 'Enter') doCreateRun()
          if (e.key === 'Escape') setCreateRunModal(null)
        }}
        style={{
          width: '100%',
          fontSize: 13,
          padding: '6px 8px',
          borderRadius: 4,
          border: '1px solid var(--border)',
          background: 'var(--surface2, var(--surface))',
          color: 'var(--text1)',
          boxSizing: 'border-box',
          marginBottom: 14,
        }}
      />
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          type="button"
          className="btn"
          onClick={() => setCreateRunModal(null)}
        >
          Cancel
        </button>
        <button
          type="button"
          className="btn btn-p"
          disabled={!createRunModal.name.trim()}
          onClick={doCreateRun}
        >
          <i className="ti ti-player-play" style={{ fontSize: 12 }} /> Create
        </button>
      </div>
    </div>
  </div>
) : null}
```

---

## Files that will change
- `apps/web/src/fresh/data/FreshProvider.tsx`
- `apps/web/src/fresh/screens/CasesScreen.tsx`

## Files that will NOT change
- Any other file

---

## Step 1 — Read files before touching them

```
Read apps/web/src/fresh/data/FreshProvider.tsx
Read apps/web/src/fresh/screens/CasesScreen.tsx
```

---

## Step 2 — Make changes

Apply Part A to `FreshProvider.tsx`, then Parts B and C to `CasesScreen.tsx`.

---

## Step 3 — Build verification

```bash
cd /Users/shaun.sevume/Projects/Relay && pnpm build
```

Zero TypeScript errors required.

---

## Step 4 — Manual check

1. Start dev server: `cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev`
2. Open `/DP/testcases/`.
3. **Keyword search**: type "Menu" — confirm table narrows to matching cases. Type a case key like "TC-00003" — confirm that case appears. Clear the input — confirm full list returns.
4. **Search resets page**: with 10 rows-per-page set and enough cases to paginate, navigate to page 2, then type in the search box — confirm page resets to 1.
5. **Create test run — folder scope**: select a folder (e.g. "functional"). Click "Create test run" → "Cases in current folder (27)". Confirm modal shows the correct count and folder name. Enter a name and press Enter. Confirm the page navigates to `/DP/runs`.
6. **Create test run — all scope**: click "Create test run" → "All project cases". Confirm count matches all project cases. Create the run. Confirm navigation to runs page.
7. **Click outside**: open the dropdown, click elsewhere — confirm it closes. Open the modal, click the overlay — confirm modal closes.
8. **Escape key**: open the modal, press Escape — confirm modal closes without creating a run.

---

## Step 5 — Commit

Run `git diff HEAD` and cross-check actual changes against the message below. Adjust if anything differs, then commit.

```
Test cases: global keyword search and create-test-run button

`FreshProvider.tsx`
* Added `caseIds?: string[]` to `CREATE_RUN` action type
* `CREATE_RUN` reducer uses provided `caseIds` for `caseOrder`; falls back to all project cases when omitted
* `createRun` callback accepts and forwards `caseIds`; updated `FreshContext` type accordingly

`CasesScreen.tsx`
* Added `keywordSearch` state; `displayedCases` memo filters by title and caseKey; page resets on keyword change
* Added keyword search input with icon to right end of tc-bar; case count label repositioned next to it
* Added `createRunMenuOpen`, `createRunMenuRef`, `createRunModal` state; click-outside handler closes dropdown
* Added "Create test run" dropdown button in FreshTopbar actions with two scope options: current folder (N cases) and all project cases (N cases)
* Modal shows scope description, name input (autoFocus, Enter submits, Escape cancels), Cancel and Create buttons
* `doCreateRun` creates run via `createRun({ name, caseIds })`, closes modal, navigates to `/runs` via `useRouter`
```

---

## Step 6 — Restart dev server

```bash
cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev
```
