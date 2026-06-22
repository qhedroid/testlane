# PR: mvp-test-cases → mvp-main

## Summary

This branch delivers the full test case management feature for Relay's frontend prototype. It covers everything from the admin panel and per-project custom field configuration, through to a richly interactive three-pane cases screen: folder tree with search, a sortable/filterable/paginated case table, a resizable case detail panel with tabs and inline editing, and a "Create test run" workflow with folder or all-cases scoping. The feature is entirely client-side — state is persisted via `localStorage` (`relay-demo-v2`, currently schema v9) with no backend dependencies.

---

## What's included

### `398f45a` — Test cases: admin project panel + per-project custom field activation
- Added `/admin` route and `AdminProjectPanel` with five tabs: General, Custom Fields, Members, Integrations, Settings
- Per-project custom field activation toggle; active field IDs stored in `Project.activeCustomFieldIds`
- `adminSettings.customFields` seeded with Priority, References, and Is Automated fields

### `87b419f` — Admin panel: fix project panel layout to inline flex side panel
- Corrected panel layout from block to inline-flex so the side panel renders alongside the list correctly

### `f53562e` — Admin panel: open project panel maximized by default
- `AdminProjectPanel` now initialises `isMaximized: true` when `selectedProjectId` is set

### `8d3b5f4` — Test cases: add Attachments, Defects, Requirements, Runs tabs to case detail panel
- Added tab bar to `CaseDetail` with Attachments, Defects, Requirements, Runs, History, and Activity tabs
- Each tab renders an appropriate empty state or stub content

### `c99514f` — Test cases: add Summary/References/Template fields and dynamic custom fields to case detail
- Extended `Case` type with `template`, `references`, `summary`, and `customFieldValues`
- Case detail edit form renders active custom fields dynamically based on `activeCustomFieldIds`; schema bumped to v7

### `d38523d` — Test cases: fix case detail panel drag direction and resize bounds
- Fixed right-anchored panel drag: now uses `start - dx` (not `start + dx`)
- Min/max width set to 540–720px; CSS default `--case-detail-width` set to 540px

### `98ec34d` — Test cases: per-row context menu with Duplicate, Edit, Open folder, Delete
- Row `...` button (visible on hover) opens a fixed-position context menu
- Duplicate — copies via `addCase`, opens copy in detail panel
- Edit — opens case detail and triggers edit mode via `pendingEditRef`
- Open folder — selects the case's folder in the tree
- Delete — confirms via `window.confirm`, calls `deleteCase`

### `db91e0b` — Test cases: sparkline last-results column and advanced filter panel
- Last Results column: status dot (most recent) + 5 mini bars (recent run history)
- Filter panel: field + operator + value conditions with AND logic; badge shows active count; click-outside closes

### `0a317c8` — Test cases: human-readable case IDs, pagination footer, folder search
- `TC-XXXXX` case keys generated on creation; `nextCaseNumByProject` added to `DemoState`; schema v8
- Pagination footer with rows-per-page selector (10/25/50/All) and prev/next controls
- Folder search input filters the tree while preserving ancestor visibility

### `b8f5c8a` — Test cases: metadata reorder, case navigation arrows, sparkline tooltip
- Case detail metadata section reordered to match design spec
- ← → navigation arrows in the detail panel header with `N / total` counter
- Per-bar sparkline tooltip showing run name, result, and tester; hover-delay dismiss
- URL deep-linking: `window.history.replaceState` keeps the address bar in sync with the open case; new `[caseKey]/page.tsx` route handles direct navigation

### `d0d2fa7` — Cases: fix panel flash, folder default, per-bar sparkline, arrow key nav
- Panel URL sync now uses `window.history.replaceState` to avoid remount on URL change
- `CreateCaseModal` resets field values via `useEffect` watching `createCaseOpen`; defaults to the currently selected folder
- Per-bar sparkline tooltips refined with hover-delay dismiss; arrow key navigation added to the detail panel

### `0a248a5` — Cases: fix case id collision across projects (schema v9)
- `addCase` in `FreshProvider` now uses `newId('case')` for globally unique IDs (previously used `TC-NNNN` counter which collided across projects)
- Schema v9 migration remaps any existing `TC-NNNN`-style case IDs to fresh unique IDs; rewrites matching keys in `run.executions` and `run.caseOrder`

### `d6a163e` — Cases: fix project switch reversion race in ProjectRouteSync
- Removed `state.activeProjectId` from `ProjectRouteSync` effect deps; reads it via a ref instead
- Prevents the effect from firing mid-navigation (while `usePathname()` still reads the old URL) and reverting the project selection

### `8c7ac23` — Test cases: global keyword search and create-test-run button
- Keyword search input in the `tc-bar` filters cases by title or case key; resets pagination on change
- "Create test run" dropdown in the topbar with two scope options: cases in current folder (N) or all project cases (N)
- Name modal with autoFocus, Enter to submit, Escape to cancel; navigates to `/runs` on creation
- `CREATE_RUN` action and `createRun` callback extended with optional `caseIds` to support folder-scoped runs

---

## ⚠️ Caveats

- **"Copy to…" and "Move to…"** in the row context menu are stubbed — they show an `alert()` and are not yet implemented.
- **"Add to run" bulk action** in the bulk selection bar is a placeholder button; not yet wired up.
- **Case detail "Add to run" button** in the panel footer is similarly a stub.
- The branch contains a number of `Docs:` commits (prompt files, handoff updates, CLAUDE.md additions) which are intentional — they track planning and session state for the Claude/Cursor workflow.

---

## Testing

- **Build:** `pnpm build` passes with zero TypeScript errors on the final commit.
- **localStorage:** key `relay-demo-v2`, schema v9. On first load after merge, the migration chain v5→v6→v7→v8→v9 runs automatically.
- **Manual smoke checks:**
  - `/admin` → Projects tab → select DP → toggle custom fields on/off
  - `/DP/cases` → folder tree navigation, folder search, status chip filter, advanced filter panel
  - Click a case row → detail panel opens; resize, maximize, navigate with arrows, edit and save
  - Search box: type a title fragment or case key (`TC-00003`) → table narrows; clear → full list returns
  - "Create test run" → folder scope → enter a name → navigates to `/DP/runs`
  - Create a second project, add cases — confirm case keys are unique across projects (v9 fix)
  - Switch between projects rapidly — confirm project does not revert to P1 after switching (v9d fix)
