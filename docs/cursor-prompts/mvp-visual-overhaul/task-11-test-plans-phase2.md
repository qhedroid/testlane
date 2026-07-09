# Task 11 — Test Plans rebuild from the mockup (Phase 2)

Branch: `mvp-visual-overhaul` · Schema: unchanged (v14) · Depends on: task-07 · This is task 11 of 13.

> Run this task straight through to Verification without stopping to ask for confirmation partway.
> Only stop if you hit a genuine blocker. Report your token/usage % when done.

Shaun's read on this screen: the mockup already stays faithful to the app's current Test Plans
structure (plan list pane · plan detail with Overview/Test cases tabs · query-group builder ·
coverage donut · run history), so this is a more straightforward "implement the mockup's layout" task
than Test Cases or Test Runs — lower risk of losing something worth keeping.

**Read `_kickoff.md` §9.2 — `PlansScreen.tsx` computes live from `FreshProvider` (`resolvePlanCases()`
and friends). Adopt the mockup's layout, keep every number and list real.**

Reference: `mockup/Relay Compass Reskin Mockup.html` → Test Plans.

Files touched:
- `apps/web/src/fresh/screens/PlansScreen.tsx`
- `apps/web/src/fresh/styles/fresh.css` / `prototype-plans.css`

## What to build

1. **Discard the mockup's own page header** (title + subline) — same reasoning as the other screens,
   wastes vertical space, Shaun explicitly wants it gone here too.
2. **Plan list pane:** match the mockup's list styling (selected-row treatment, id/meta typography) —
   keep the existing resizable-pane behaviour exactly as it is.
3. **Plan detail — Overview / Test cases tabs:** match the mockup's tab strip and overview metric
   tiles/cards styling; keep the coverage donut (`RunDonut`, already Compass-coloured from earlier
   work) and its data wiring unchanged.
4. **Query-group builder:** match the mockup's card/chip/select styling for folder/condition/static
   query cards and the resolved-cases table; keep all add/remove/resolve behaviour and the underlying
   `TestQuery`/`resolvePlanCases()` logic completely unchanged — this is layout/visual only.
5. **Run history:** match the mockup's table styling; keep the hover-tooltip behaviour on the
   segmented result bars exactly as it works today.

If anything in the mockup's Test Plans layout looks meaningfully different from what's described
above once you open it, prefer the app's current structure and just apply the mockup's visual
treatment on top — per Shaun, this screen shouldn't need real restructuring.

## Verification

1. `pnpm build`; load `/DP/plans`.
2. List, detail, both tabs, query builder, and run history all show real live data exactly as before
   this task, just restyled to the mockup.
3. No page header. Plan-list pane resize, tab switching, query editing, and the run-history hover
   tooltip all behave unchanged.
4. Core regression routes still render with no console errors.
5. Screenshots to `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md`.

## Documentation

- `docs/claude/handoff.md` — mark task-11 done.

## Out of scope

- `resolvePlanCases()` or any query-resolution logic change; any data/behaviour change.
