# PR: mvp-test-cases → mvp-main

## Summary

This branch delivers the full test case management feature for Relay's frontend prototype. It covers everything from the admin panel and per-project custom field configuration, through to a richly interactive three-pane cases screen: folder tree with search, a sortable/filterable/paginated case table, a resizable case detail panel with tabs and inline editing, and a "Create test run" workflow with folder or all-cases scoping. The feature is entirely client-side — state is persisted via `localStorage` (`relay-demo-v2`, currently schema v9) with no backend dependencies.

---

## What's included

### Admin Panel

**Project panel with per-project custom field activation** ([`398f45a`](https://github.com/qhedroid/Relay/commit/398f45a))
- Added `/admin` route and `AdminProjectPanel` with five tabs: General, Custom Fields, Members, Integrations, Settings
- Per-project custom field activation toggle; active field IDs stored in `Project.activeCustomFieldIds`
- `adminSettings.customFields` seeded with Priority, References, and Is Automated fields

**Fix project panel layout** ([`87b419f`](https://github.com/qhedroid/Relay/commit/87b419f))
- Corrected panel layout from block to inline-flex so the side panel renders alongside the list correctly

**Open project panel maximized by default** ([`f53562e`](https://github.com/qhedroid/Relay/commit/f53562e))
- `AdminProjectPanel` now initialises `isMaximized: true` when `selectedProjectId` is set

---

### Test Cases

**Tabs in the case detail panel** ([`8d3b5f4`](https://github.com/qhedroid/Relay/commit/8d3b5f4))
- Added tab bar to `CaseDetail` with Attachments, Defects, Requirements, Runs, History, and Activity tabs
- Each tab renders an appropriate empty state or stub content

**Extended fields and dynamic custom fields in case detail** ([`c99514f`](https://github.com/qhedroid/Relay/commit/c99514f))
- Extended `Case` type with `template`, `references`, `summary`, and `customFieldValues`
- Case detail edit form renders active custom fields dynamically based on `activeCustomFieldIds`; schema bumped to v7

**Fix case detail panel resize** ([`d38523d`](https://github.com/qhedroid/Relay/commit/d38523d))
- Fixed right-anchored panel drag: now uses `start - dx` (not `start + dx`)
- Min/max width set to 540–720px; CSS default `--case-detail-width` set to 540px

**Per-row context menu** ([`98ec34d`](https://github.com/qhedroid/Relay/commit/98ec34d))
- Row `...` button (visible on hover) opens a fixed-position context menu
- Duplicate, Edit, Open folder, and Delete actions; Delete confirms via `window.confirm`

**Last results column and filter panel** ([`db91e0b`](https://github.com/qhedroid/Relay/commit/db91e0b))
- Last Results column: status dot (most recent) + 5 mini bars (recent run history)
- Filter panel: field + operator + value conditions with AND logic; badge shows active count; click-outside closes

**Human-readable case IDs, pagination, and folder search** ([`0a317c8`](https://github.com/qhedroid/Relay/commit/0a317c8))
- `TC-XXXXX` case keys generated on creation; `nextCaseNumByProject` added to `DemoState`; schema v8
- Pagination footer with rows-per-page selector (10/25/50/All) and prev/next controls
- Folder search input filters the tree while preserving ancestor visibility

**Case detail polish: navigation arrows, sparkline tooltips, URL deep-linking** ([`b8f5c8a`](https://github.com/qhedroid/Relay/commit/b8f5c8a))
- Metadata section reordered to match design spec
- ← → navigation arrows in the detail panel header with `N / total` counter
- Per-bar sparkline tooltip showing run name, result, and tester; hover-delay dismiss
- URL deep-linking via `window.history.replaceState`; new `[caseKey]/page.tsx` route handles direct navigation

**Fix panel flash, folder default, and sparkline tooltips** ([`d0d2fa7`](https://github.com/qhedroid/Relay/commit/d0d2fa7))
- Panel URL sync switched to `window.history.replaceState` to avoid full remount on URL change
- `CreateCaseModal` resets field values on open and defaults to the currently selected folder
- Sparkline tooltip hover-delay dismiss refined; arrow key navigation added to the detail panel

**Fix case ID collision across projects (schema v9)** ([`0a248a5`](https://github.com/qhedroid/Relay/commit/0a248a5))
- `addCase` now uses `newId('case')` for globally unique IDs (previously `TC-NNNN` counters collided across projects)
- Schema v9 migration remaps existing `TC-NNNN`-style IDs; rewrites matching keys in `run.executions` and `run.caseOrder`

**Fix project switch reversion race** ([`d6a163e`](https://github.com/qhedroid/Relay/commit/d6a163e))
- Removed `state.activeProjectId` from `ProjectRouteSync` effect deps; reads it via a ref instead
- Prevents the effect reverting the active project mid-navigation while `usePathname()` still reads the old URL

**Keyword search and create test run button** ([`8c7ac23`](https://github.com/qhedroid/Relay/commit/8c7ac23))
- Keyword search input in the case list filters by title or case key; resets pagination on change
- "Create test run" dropdown with two scope options: cases in current folder (N) or all project cases (N)
- Name modal with autoFocus, Enter to submit, Escape to cancel; navigates to `/runs` on creation
- `CREATE_RUN` action and `createRun` callback extended with optional `caseIds` for folder-scoped runs

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
