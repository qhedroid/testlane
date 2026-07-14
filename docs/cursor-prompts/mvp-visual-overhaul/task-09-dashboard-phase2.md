# Task 09 — Dashboard rebuild from the mockup (Phase 2)

Branch: `mvp-visual-overhaul` · Schema: unchanged (v14) · Depends on: task-07 · This is task 9 of 13.

> Run this task straight through to Verification without stopping to ask for confirmation partway.
> Only stop if you hit a genuine blocker. Report your token/usage % when done.

**Read `_kickoff.md` §9.2 before starting this task — it is the single most important rule here.**
`DashboardScreen.tsx` today computes every widget live from `FreshProvider` (the `mvp-dashboard-metrics`
work: real metric cards, real active-run list, a needs-attention panel, a coverage-by-folder panel —
no static mock data). The mockup's dashboard is visually much richer than the current one and is
built on **hardcoded demo numbers**. Adopting its layout does not mean adopting its numbers.

Reference: `mockup/Relay Compass Reskin Mockup.html` → Dashboard (`data-screen-label="Dashboard"`).

Files touched:
- `apps/web/src/fresh/screens/DashboardScreen.tsx` (full rebuild)
- `apps/web/src/fresh/data/project-selectors.ts` (new selectors, see below)
- `apps/web/src/fresh/styles/fresh.css` (`.dash-*` and new panel-specific classes)

## What to build

Abandon the current dashboard's layout (metric-card grid + active-runs column + needs-attention +
coverage) and replace it with the mockup's structure:

1. **Page head:** per Shaun's explicit ask, **drop** the mockup's "Hey Shaun" heading and the
   "342 test cases · 4 active test runs · next milestone due Jul 18" subline entirely — it wastes
   vertical space and isn't needed. Keep the "Customize" button in the top-right if you want, or drop
   it too if there's nothing for it to do yet (it's non-functional in the mockup as well).
2. **KPI strip:** six tiles — Executed (% + "N of M in open runs"), Passed (count + this-week delta),
   Failed (count + this-week delta), Blocked (count + "N waiting on defects"), Open runs (count + "N
   close this week"), and a "Pass trend · 30 days" sparkline. **All of these must be computed from
   real `FreshProvider` state** — Executed/Passed/Failed/Blocked/Open-runs already have close
   equivalents in the current dashboard's metric cards, just re-shape them to this tile layout. The
   "this week" deltas and the 30-day sparkline are new computations — derive them from execution
   history timestamps in the data model (`DemoRun.executions[...].history` or equivalent — check
   `demo-model.ts` for what's actually tracked) rather than hardcoding a plausible-looking trend. If
   the data model doesn't track enough history to compute a real trend, it's fine to omit the
   sparkline/deltas or replace them with a simpler real signal (e.g. a flat "as of today" value) —
   note this limitation explicitly in the QA report rather than faking a trend line.
3. **Completion donut** (via `RunDonut`, colours already correct from Phase 1) + a compact
   passed/failed/blocked/not-run legend with real counts — this maps directly onto data the current
   dashboard already computes.
4. **Results over time** (cumulative passed/failed line chart, 7d/30d/90d chip toggle) and **Results
   by assignee** (horizontal stacked bars per assignee) are genuinely new panels with no current
   equivalent. Compute them for real from execution history and case assignees (both exist in the
   data model per the app's existing per-case/per-execution structures) — hand-roll inline SVG the
   same way the mockup does (no charting library needed, keep the bundle light). If real historical
   granularity isn't available for the 7d/30d/90d toggle, implement whichever window the data
   actually supports and note the gap in the QA report rather than inventing numbers for the others.
5. **Open test runs** list (id, title, meta, assignee avatar, mini progress bar, fraction complete) —
   this is essentially the current dashboard's active-run list, reshaped to match the mockup's row
   layout. Keep the "click to open" behaviour.
6. **Milestones panel** on the dashboard — since task-08 is building a real Milestones page, either
   surface a real slice of that same data here (2–3 upcoming, "See all" linking to `/milestones`) or,
   if that creates awkward sequencing with task-08, a simple static placeholder card linking to
   `/milestones` is an acceptable fallback for this task — use your judgement, note which you did.
7. Anything from the current dashboard's needs-attention / coverage-by-folder panels that doesn't
   have a direct mockup equivalent: fold the same underlying data into whichever mockup panel is the
   closest fit (e.g. defects-needing-attention could live in a panel similar to My Work's "Defects
   involving you"), rather than dropping the capability. Use judgement; note your mapping decisions in
   the QA report so Shaun can course-correct anything that doesn't fit well.

## Verification

1. `pnpm build`; load `/DP/dashboard`.
2. Every number on the page reflects real `FreshProvider` state — spot-check by creating/failing a
   case in a test run and confirming the dashboard's counts move accordingly, the same way they do
   today before this task's changes.
3. No "Hey Shaun" header, no hardcoded demo numbers copied verbatim from the mockup.
4. All chart/list interactions (chip toggles, "See all" links, run-row clicks) work.
5. Core regression routes still render with no console errors.
6. Screenshots to `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md`, including a note on which panels
   (if any) fell back to reduced fidelity due to data-model limitations.

## Documentation

- `docs/claude/handoff.md` — mark task-09 done; list any panels that used a reduced-fidelity fallback
  and why.

## Out of scope

- Building the standalone Milestones page (task-08) — this task only surfaces a slice of it if easy.
- Any change to how case/run/defect data is created or stored — new selectors only, no new mutations.
