# Task 06 — Test Plans reskin

Branch: `mvp-visual-overhaul` · Schema: unchanged (v14) · Depends on: task-01, task-02

Reskin Test Plans. **Local layout stays** (plan list pane · plan detail with Overview / Test cases
tabs, query-group builder, coverage donut, run history). Presentational only.

Reference: `mockup/Relay Compass Reskin Mockup.html` → Test Plans.

Files touched:
- `apps/web/src/fresh/styles/prototype-plans.css` (the `.pl-*` styles, 751 lines, scoped to the plans view)
- `apps/web/src/fresh/screens/PlansScreen.tsx` (presentational className/style only)
- (`RunDonut.tsx` colours already corrected in task-03 — reused here)

## Changes
1. **Grep `prototype-plans.css` for hardcoded status/greys** and re-point to the `--*` tokens
   (same list as task-05 change 1). Radii → `--r-*`.
2. **Plan list pane** (`.pl-list-pane`, `.pl-list-hd`, and the plan-row/item classes): white pane,
   `1px --border` right edge; **selected plan** row → `--accent-lt` + `--accent` text (drop any old
   left-border/purple); ID in `--mono` `--text3`; meta muted.
3. **Plan detail header** and the **Overview / Test cases tab strip**: tab active state → `--accent`
   underline; the overview metric cards/tiles use radius `var(--r-l)`, display font for numbers,
   `--text2` uppercase labels.
4. **Coverage donut** — via `RunDonut` (Compass colours from task-03). Keep geometry/props.
5. **Query-group builder** (folder / condition / static query cards, condition selects, folder
   chips, resolved-cases table): cards `1px --border` radius `var(--r-m)`; the query-type label
   badge uses a Compass accent-tint pill; condition selects/inputs restyled to Compass form chrome;
   folder chips use `.tagp`-style pills; the resolved-cases table uses the shared `.tbl` look. Keep
   all add/remove/resolve behaviour.
6. **Run history** table + hover donut tooltip: table via `.tbl` look; segmented result bars read
   status tokens; keep the hover-tooltip behaviour (it mirrors the runs donut).

## Verification
- `/DP/plans`: list, detail, both tabs, query builder, coverage donut, and run history match the
  mockup. Selecting plans, switching tabs, editing query groups, and the run-history hover tooltip
  all behave unchanged. Plan-list pane resize still works.
- Screenshots to QA report.

## Out of scope
- Plan resolution logic (`resolvePlanCases`), query behaviour, data; layout restructure; icon swap.
