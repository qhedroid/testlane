# Task 12 — Test Runs rebuild from the mockup (PROTECTED UX — Phase 2)

Branch: `mvp-visual-overhaul` · Schema: unchanged (v14) · Depends on: task-07 · This is task 12 of 13.

> Run this task straight through to Verification without stopping to ask for confirmation partway.
> Only stop if you hit a genuine blocker. Report your token/usage % when done.

⚠️ **This screen is explicitly protected, same as Phase 1 (`_kickoff.md` §2.4, unchanged by Phase 2).**
The execution workspace's keyboard flow, result-recording behaviour, and `/runs/api` must not change.
Unlike Test Cases, Shaun's instruction here is "just implement the mockup rather than cherry-picking"
— **good news: the mockup is a faithful structural recreation of this screen**, including the actual
Pass/Fail/Blocked/Skip buttons and the P/F/B/S/↑↓/? keyboard-shortcut legend, not a simplified mockup.
That significantly de-risks this task, but it does not remove the need for care: you are re-authoring
this screen's markup against the mockup's layout, and every real handler/keybinding/state transition
must still work exactly as it does today.

Reference: `mockup/Relay Compass Reskin Mockup.html` → Test Runs (`data-screen-label="Test runs"`).

Files touched:
- `apps/web/src/fresh/screens/RunsScreen.tsx`
- `apps/web/src/fresh/components/TestRunsTopbar.tsx`
- `apps/web/src/fresh/styles/prototype-runs.css`

## What to build

1. **Keep the page header** — unlike every other Phase 2 screen, Shaun wants this one kept. The
   mockup's Test Runs page-head has the "Test runs" title + a subline, and (importantly) **this is
   where the Seal/Edit/New-run actions belong now**, not in the shared global top bar. Move
   `TestRunsTopbar.tsx`'s existing seal-toggle/edit/report/more-menu button cluster out of
   `FreshTopbar`'s `actions` prop (per task-07's plan) and into this screen's own local page-head,
   matching the mockup's placement — same component, same handlers, just rendered in a different
   spot. This should be closer to relocating a component than rewriting one.
2. **Queue pane (left):** run picker (name/id/dropdown with search + "Create new run…"), run header +
   collapsible summary (donut + legend + Team/Defects/Details tabs), a search/add-cases bar, filter
   tabs, and the grouped case list (`ec-fold` groups, matching the app's existing class prefix —
   confirms the mockup's structure already corresponds closely to the live `.runs-v12` classes).
   Preserve every existing interaction: group expand/collapse, case selection, filter-tab
   click-to-filter, resize handle.
3. **Exec detail pane (right):** case header with prev/next navigation, title, priority/tags,
   assignee, status; a tab strip (Details/Comments/Defects/Requirements/History — keep exactly as
   today); inside Details: the assigned-to/last-result/priority/type field grid, preconditions, and
   the numbered steps list with per-step P/F/B/S controls; **the big Pass/Fail/Blocked/Skip result
   buttons and the keyboard-shortcut legend bar at the bottom** — wire these to the exact same
   handlers/state that exist today, just restyled to the mockup's button/legend treatment.
4. **Sizing — deliberate deviation from the mockup:** the mockup's donut, completion percentage text,
   and run-status text are noticeably smaller than what's in the app today. **Keep the app's current,
   larger sizing** for the summary donut, the percentage-complete text inside it, and the run-state
   label — do not shrink these to match the mockup. Everything else (colours, spacing, panel/button
   chrome) should follow the mockup.

## Verification

1. `pnpm build`; load `/DP/testruns`.
2. **Protected-UX regression (critical, run this in full):** record a Pass/Fail/Blocked/Skip and
   confirm auto-advance; use every keyboard shortcut (P/F/B/S, ↑/↓ navigation, ?); open/close and
   resize the detail pane; seal/reopen a run; switch the run via the picker; click a status row to
   filter; use the Team/Defects/Details summary tabs — **all identical to before this task.**
   `/runs/api` untouched.
3. Seal/Edit/New-run actions now live in this screen's own page-head, not the shared top bar, and
   still work exactly as before.
4. Donut, percentage text, and run-state label are sized like the app's current version, not the
   mockup's smaller version. Everything else visually matches the mockup.
5. Core regression routes still render with no console errors.
6. Screenshots + an explicit "protected UX behaviour verified unchanged" note in
   `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md`.

## Documentation

- `docs/claude/handoff.md` — mark task-12 done.

## Out of scope

- ANY structural, keyboard, or execution-behaviour change; `/runs/api`; the three-pane data model;
  icon swap.
