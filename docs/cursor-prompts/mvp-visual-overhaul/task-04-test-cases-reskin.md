# Task 04 — Test Cases reskin

Branch: `mvp-visual-overhaul` · Schema: unchanged (v14) · Depends on: task-01, task-02

Reskin Test Cases. **Layout stays exactly as the app has it** (folder tree · case table · resizable
detail panel) — the mockup was built to match this screen's structure, so this is a pure colour/
type/spacing pass. The mockup's Test Cases screen is the canonical example of the approved look;
match it closely.

Reference: `mockup/Relay Compass Reskin Mockup.html` → Test Cases.

Files touched:
- `apps/web/src/fresh/screens/CasesScreen.tsx` (presentational className/markup only)
- `apps/web/src/fresh/styles/fresh.css` (`.tc-*`, `.suite-tree`/`.st-*`, `.dp*`, `.step-*`, table)

## Changes

1. **Toolbar** (`.tc-bar`, ~line 122; and the bulk bar `.bulk`): white bar, `1px --border` bottom;
   buttons use the task-01 `.btn`/`.btn-p`/`.btn-neutral` styling; the search field matches the
   topbar search chrome. The bulk-select bar uses `--accent-lt` background.
2. **Folder tree** (`.suite-tree`, `.st-hd`, `.st-root`, `.st-sec`, ~lines 118–140): white pane,
   `1px --border` right edge; section/parent rows on hover `--surface2`; **active folder** row →
   `.st-sec.on`/`.st-root.on{ background:var(--accent-lt); color:var(--accent); }` (there are two
   `.st-root.on` rules — reconcile to the accent treatment; drop the old left-border). Folder counts
   (`.st-ct`) muted `--text3`.
3. **Case table** — uses the shared `.tbl` already polished in task-01. Verify the last-result
   sparkline bars and status dots in rows read the new status tokens (they may use `.d-*`/inline
   colours — re-point any hardcoded status hex). Priority tags use `.pri`. Row context-menu button
   (`.row-ctx-btn`, `.ctx-menu`) now works (task-01 defined `--hover`/`--text1`) — confirm it looks right.
4. **Detail panel** (`.dp`, `.dp-hd`, `.dp-id`, `.dp-ttl`, `.dp-body`, `.dp-sec`, `.dp-sl`, `.dp-mg`,
   `.step-*`, ~lines 130–160): panel radius/borders per Compass; the mono ID (`.dp-id`) uses
   `--mono` `--text3`; title (`.dp-ttl`) larger (~16px, display or 600 body); section labels
   (`.dp-sl`) uppercase `--text3`; step rows (`.step-i`, `.step-n`, `.step-act`, `.step-exp`) — step
   number chip becomes a rounded `--surface2` circle, expected-result text `--text3`. The detail tabs
   (`.nav-tab`/`.dtabs` as used here) active state → `--accent` underline. Keep the maximize/close
   buttons (`.dp-max-btn`) and resizer (`.detail-resizer`) behaviour.
5. **Quick-create / new-folder inputs** (`.quick-box`, `.st-new-folder-input`, `.form-field`):
   restyle inputs to Compass (radius `var(--r-s)`, `1px --border`, focus `--accent` + focus ring).
   Keep the Enter/Esc behaviour.
6. **Empty states** (`.empty-state`, `.empty-card`): icon `--text3`, title display font, copy `--text3`.

## Verification
- `/DP/testcases`: tree, table, and detail panel match the mockup; resizing the tree and detail
  panel still works; row context menu opens and is styled; quick-create and folder create/rename
  still work (Enter/Esc); maximize/close detail still work.
- Behaviour unchanged throughout. Screenshots to QA report.

## Out of scope
- Case data, filters logic, drag/reorder behaviour, custom-field rendering logic; layout
  restructure; icon swap.
