# Task 04 — Case table: per-row context menu

## Context from previous task
Branch: `mvp-test-cases`.

Tasks 01–03 are complete:
- Schema is at v7. `Case` has `template`, `references`, `summary`, `customFieldValues`.
- `CaseDetail` panel has 7 tabs and renders custom fields dynamically.
- `addCase`, `replaceCase` actions exist in `FreshProvider`. There is no `deleteCase` action yet.
- `DemoState.nextCaseNumByProject` exists but is used only for runs at this point (case IDs are currently internal strings like `case-001`).

## Objective
Add a per-row **"..." context menu** to the case table in `CasesScreen.tsx`.

Menu appears on row hover, anchored to the right of the row.
Options: **Duplicate**, **Edit**, **Copy to…**, **Move to…**, **Open folder**, **Delete**.

Functional behaviours:
- **Duplicate**: create a copy of the case in the same folder, open it in the detail panel.
- **Edit**: open the case in the detail panel with edit mode active (same as clicking the row then clicking Edit).
- **Copy to…** / **Move to…**: show a toast "Coming soon" — no-op for now.
- **Open folder**: select the case's folder in the sidebar (scroll to it / highlight it).
- **Delete**: show `window.confirm('Delete this test case?')` — if confirmed, remove the case from state.

## Files that will change
- `apps/web/src/fresh/screens/CasesScreen.tsx`
- `apps/web/src/fresh/data/FreshProvider.tsx` (add `deleteCase` action)

## Files that will NOT change
- `demo-model.ts`, `migrate-demo-state.ts`, any other file

---

## Step 1 — Read files before touching them

```
Read apps/web/src/fresh/screens/CasesScreen.tsx
Read apps/web/src/fresh/data/FreshProvider.tsx
```

---

## Step 2 — Add `deleteCase` action to `FreshProvider.tsx`

### 2a — Add the dispatch type
In the reducer's action union, add:
```ts
| { type: 'DELETE_CASE'; caseId: string }
```

### 2b — Add the reducer case
```ts
case 'DELETE_CASE':
  return { ...state, cases: state.cases.filter((c) => c.id !== action.caseId) }
```

### 2c — Expose the action
In the context value / hook return, add:
```ts
deleteCase: (caseId: string) => dispatch({ type: 'DELETE_CASE', caseId })
```

Add `deleteCase` to the `useFresh()` return type accordingly.

---

## Step 3 — Context menu state in `CasesScreen`

Add the following state near the top of `CasesScreen`:

```ts
const [contextMenu, setContextMenu] = useState<{ caseId: string; x: number; y: number } | null>(null)
const contextMenuRef = useRef<HTMLDivElement>(null)
```

Destructure `deleteCase` from `useFresh()`.

Add a click-outside handler to dismiss the menu:

```ts
useEffect(() => {
  if (!contextMenu) return
  function handleClick(e: MouseEvent) {
    if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
      setContextMenu(null)
    }
  }
  document.addEventListener('mousedown', handleClick)
  return () => document.removeEventListener('mousedown', handleClick)
}, [contextMenu])
```

---

## Step 4 — Add the "..." button to each row

In the `<tbody>` row map, after the last `<td>` (the "Updated" cell), add:

```tsx
<td
  style={{ width: 28, textAlign: 'center' }}
  className="row-actions-cell"
  onClick={(e) => e.stopPropagation()}
>
  <button
    type="button"
    className="row-ctx-btn"
    title="More options"
    onClick={(e) => {
      e.stopPropagation()
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
      setContextMenu(contextMenu?.caseId === c.id ? null : { caseId: c.id, x: rect.right, y: rect.bottom + 4 })
    }}
  >
    <i className="ti ti-dots" style={{ fontSize: 13 }} />
  </button>
</td>
```

Also add `<th style={{ width: 28 }} />` as the last column header.

---

## Step 5 — Render the context menu

Just before the closing `</div>` of the `.view` wrapper in `CasesScreen`, add:

```tsx
{contextMenu ? (() => {
  const menuCase = activeCases.find((c) => c.id === contextMenu.caseId)
  if (!menuCase) return null
  return (
    <div
      ref={contextMenuRef}
      className="ctx-menu"
      style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x - 160, zIndex: 1000, width: 160 }}
    >
      <button type="button" className="ctx-item" onClick={() => {
        const copy: Case = { ...menuCase, id: newId('case'), updatedAt: new Date().toISOString() }
        addCase({ ...copy })
        setDetailCaseId(copy.id)
        setContextMenu(null)
      }}>
        <i className="ti ti-copy" /> Duplicate
      </button>
      <button type="button" className="ctx-item" onClick={() => {
        setDetailCaseId(menuCase.id)
        setDetailTab('details')
        setContextMenu(null)
        // Signal edit mode via a ref — see Step 6
        pendingEditRef.current = menuCase.id
      }}>
        <i className="ti ti-edit" /> Edit
      </button>
      <div className="ctx-sep" />
      <button type="button" className="ctx-item" onClick={() => {
        alert('Copy to… — coming soon')
        setContextMenu(null)
      }}>
        <i className="ti ti-copy-plus" /> Copy to…
      </button>
      <button type="button" className="ctx-item" onClick={() => {
        alert('Move to… — coming soon')
        setContextMenu(null)
      }}>
        <i className="ti ti-arrows-move" /> Move to…
      </button>
      <button type="button" className="ctx-item" onClick={() => {
        if (menuCase.folderId) selectFolder(menuCase.folderId)
        setContextMenu(null)
      }}>
        <i className="ti ti-folder" /> Open folder
      </button>
      <div className="ctx-sep" />
      <button type="button" className="ctx-item ctx-item-danger" onClick={() => {
        if (window.confirm('Delete this test case?')) {
          if (detailCaseId === menuCase.id) setDetailCaseId(null)
          deleteCase(menuCase.id)
        }
        setContextMenu(null)
      }}>
        <i className="ti ti-trash" /> Delete
      </button>
    </div>
  )
})() : null}
```

---

## Step 6 — "Edit" opens the panel in edit mode

The `CaseDetail` component manages its own `editing` state internally. To trigger edit mode from outside, use a ref approach:

In `CasesScreen`, add:
```ts
const pendingEditRef = useRef<string | null>(null)
```

In `CaseDetail`, add an optional `startEditOnMount` prop:
```ts
startEditOnMount?: boolean
```

When `startEditOnMount` is true, call `startEdit()` inside a `useEffect`:
```ts
useEffect(() => {
  if (startEditOnMount) startEdit()
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, [])
```

In `CasesScreen`, pass it:
```tsx
<CaseDetail
  ...
  startEditOnMount={pendingEditRef.current === detailCaseId}
/>
```

Clear `pendingEditRef.current` to `null` after passing the prop (do this in an effect that watches `detailCaseId`):
```ts
useEffect(() => {
  pendingEditRef.current = null
}, [detailCaseId])
```

---

## Step 7 — Add context menu CSS

Find the globals CSS file (search for `.dp-hd` to locate it). Add these rules:

```css
/* Row context menu button */
.row-ctx-btn {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 2px 4px;
  border-radius: 3px;
  color: var(--text2);
  line-height: 1;
}
.row-ctx-btn:hover { background: var(--hover); color: var(--text1); }
tr:hover .row-ctx-btn { display: inline-flex; align-items: center; }

/* Context menu panel */
.ctx-menu {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 6px;
  box-shadow: 0 4px 16px rgba(0,0,0,.18);
  padding: 4px 0;
  overflow: hidden;
}
.ctx-item {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  background: none;
  border: none;
  padding: 6px 12px;
  font-size: 12.5px;
  color: var(--text1);
  cursor: pointer;
  text-align: left;
  white-space: nowrap;
}
.ctx-item:hover { background: var(--hover); }
.ctx-item-danger { color: var(--fail); }
.ctx-item-danger:hover { background: rgba(198,40,40,.08); }
.ctx-sep { height: 1px; background: var(--border); margin: 4px 0; }
```

---

## Step 8 — Build verification

```bash
cd /path/to/repo && pnpm build
```

Zero TypeScript errors required.

---

## Step 9 — Manual check

1. Start dev server: `cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev`
2. Open `/DP/testcases/` and hover over a row — confirm the "..." button appears.
3. Click "..." — confirm the context menu opens anchored to the button.
4. Click elsewhere — confirm the menu closes.
5. **Duplicate**: confirm a copy appears in the table and the detail panel opens it.
6. **Edit**: confirm the detail panel opens with edit mode active.
7. **Open folder**: confirm the correct folder is selected in the sidebar.
8. **Delete**: confirm the confirm dialog appears; accepting removes the row; cancelling does not.
9. **Copy to… / Move to…**: confirm the "coming soon" alert fires.

---

## Step 10 — Commit

```
Test cases: per-row context menu with Duplicate, Edit, Open folder, Delete

- Add DELETE_CASE reducer action to FreshProvider; exposes deleteCase(caseId) via useFresh()
- Add "..." context menu button to each case table row (visible on row hover)
- Context menu options: Duplicate (creates copy, opens in detail), Edit (opens panel in edit mode), Copy to… / Move to… (coming soon alert), Open folder (selects folder in sidebar), Delete (confirm + remove)
- Implement click-outside dismissal via mousedown listener + contextMenuRef
- Add pendingEditRef pattern so "Edit" option can trigger CaseDetail's internal edit mode on mount via startEditOnMount prop
- Add CSS: .row-ctx-btn, .ctx-menu, .ctx-item, .ctx-item-danger, .ctx-sep
```
