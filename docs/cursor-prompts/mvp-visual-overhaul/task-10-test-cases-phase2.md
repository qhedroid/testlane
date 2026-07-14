# Task 10 — Test Cases hybrid rebuild (Phase 2)

Branch: `mvp-visual-overhaul` · Schema: unchanged (v14) · Depends on: task-07 · This is task 10 of 13.

> Run this task straight through to Verification without stopping to ask for confirmation partway.
> Only stop if you hit a genuine blocker. Report your token/usage % when done.

This is the most nuanced screen in Phase 2 — unlike the others, it's an explicit **hybrid**: some
pieces come from the mockup, some stay exactly as the app has them today, per-pane. Read this whole
task before touching anything; it's easy to over-apply "adopt the mockup" here and lose behaviour
Shaun specifically wants kept.

Reference: `mockup/Relay Compass Reskin Mockup.html` → Test Cases (`data-screen-label="Test cases"`).
Open it in a browser — its case list has real mock data (titles, owners, steps) once rendered, you
don't need a separate written spec for row content.

Files touched:
- `apps/web/src/fresh/screens/CasesScreen.tsx`
- `apps/web/src/fresh/styles/fresh.css` (`.tc-*`, `.suite-tree`/`.st-*`, `.dp*`, `.step-*`)

**Read `_kickoff.md` §9.2 — `CasesScreen.tsx` computes live from `FreshProvider`. Everything below
is about layout/visual, not about replacing real case data with the mockup's mock rows.**

## Per-pane instructions

1. **Folder tree pane (left):** take the mockup's **visual** treatment — the "Folders" header with an
   add-folder icon button, a "Filter folders…" input beneath it, and the folder rows (chevron, folder
   icon, name, count pill). **Keep the app's current tree behaviour and interaction philosophy
   exactly as it is today** — nested expand/collapse, drag/reorder if it exists, inline
   create/rename-folder with Enter/Esc, quick-create — none of that changes, only the visual chrome
   around it (panel container, row spacing/type, icon treatment) moves to match the mockup.

2. **Case list pane (middle):** take the mockup's design here more fully — the table layout, column
   set, row styling, status chips row beneath the toolbar, and search field. Real case data continues
   to render (unchanged — this pane already reads from live state today). **Move the
   create/import/quick-create/new-case actions to the top of this pane** (the mockup's own toolbar:
   "Create test run ▾", "Import", "Quick create", "New case", plus a contextual "Details" button when
   the detail pane is closed) — check where these currently live in `CasesScreen.tsx` (likely already
   a local `.tc-bar` toolbar in the screen body, not passed through `FreshTopbar`'s `actions` prop per
   task-07's cleanup) and adjust the button set/order/labels to match the mockup rather than
   relocating them from somewhere else, if they're already positioned correctly. Note in the QA
   report which was actually true.

3. **Detail panel (right, appears when a case is selected):** **keep the app's current layout and
   behaviour entirely** — which fields/sections show, the tabs, the resizer, maximize/close — none of
   that changes. What changes is purely the **container's visual treatment**: wrap it in a clearer
   rounded-card boundary (own border-radius, border, and background distinct from the list pane,
   matching the coherent "rounded box" look the rest of Phase 1/2 uses for panels elsewhere) rather
   than whatever edge-to-edge or less-contained treatment it currently has. Compare directly against
   how other panels in the app (e.g. `.panel` cards elsewhere) already achieve this look and apply the
   same treatment here — this may already be close after Phase 1's token work; if so, this is a small
   adjustment, not a rebuild.

4. **Page header:** the mockup's Test Cases screen has its own `page-head` ("Test cases" title + "Demo
   · 342 cases across 14 folders" subline). **Discard it** — same reasoning as elsewhere, it wastes
   vertical space and Shaun explicitly doesn't want it here.

## Verification

1. `pnpm build`; load `/DP/testcases`.
2. Folder tree: visually matches the mockup, all existing behaviour intact (expand/collapse,
   create/rename folder with Enter/Esc, quick-create, drag/reorder if applicable).
3. Case list: matches the mockup's table/toolbar layout, real case data still renders, create test
   run / import / quick create / new case buttons all present at the top of this pane and still work.
4. Detail panel: identical behaviour to before this task (open/close, tabs, resize, maximize) with the
   new rounded-card visual container.
5. No page header taking up vertical space above the three panes.
6. Core regression routes still render with no console errors.
7. Screenshots to `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md`, noting explicitly where the
   toolbar buttons were already correctly positioned vs. needed to move.

## Documentation

- `docs/claude/handoff.md` — mark task-10 done.

## Out of scope

- Any change to folder-tree logic, case data, filters, drag/reorder behaviour, or custom-field
  rendering — this task is layout/visual only, applied per-pane as described above.
