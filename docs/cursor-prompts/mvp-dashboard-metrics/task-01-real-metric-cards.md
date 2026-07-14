# Task 01 — Dashboard metric cards + Active Runs column on real data

Branch: `mvp-dashboard-metrics` (new branch off latest `mvp-main`)
Schema: no change expected — this task only changes how `DashboardScreen.tsx` computes/reads data, not the data model itself.

This is task 1 of 4 on this branch. This task covers the top metric-card row and the "Active runs" column only. The "Needs attention" panel is task-02, the "Coverage" panel is task-03, and removing the demo-only placeholder gate is task-04 (do that last, after the other three prove the real computation works).

Files touched:
- `apps/web/src/fresh/screens/DashboardScreen.tsx`

Files likely touched (only if you determine a shared helper is the cleaner approach — ask before adding new exports elsewhere if this grows beyond a few lines):
- `apps/web/src/fresh/data/demo-model.ts` (only if you extract a new small helper alongside `runSummary()`)

Do not touch `RunsScreen.tsx`, `/runs/api`, `PlansScreen.tsx`, `CasesScreen.tsx`, or backend/DB/Docker/auth/API routes (frontend-only prototype).

---

## Background

`DemoDashboardView` (`DashboardScreen.tsx`, ~line 108) currently renders everything from four static arrays imported from `data/seed.ts`: `RUN_CARDS`, `ATTENTION_ITEMS`, `COVERAGE_ITEMS`, `DEFECT_NAMES`. None of it reflects the actual project's runs or cases in `FreshProvider` state (`activeRuns`, `activeCases`, etc.) — it's entirely mock content, the same regardless of what's actually in the project.

Relay already has `runSummary(run: DemoRun): { total, passed, failed, blocked, skipped, notRun }` in `demo-model.ts` (~line 440) — it walks `run.caseOrder` and tallies each case's latest execution status. This is the core primitive this task builds on.

The mock `RunCard` type (`data/types.ts` ~line 60) has fields Relay's real `DemoRun` doesn't track: `status`/`stalled` (no staleness concept exists), `due` (no due-date field), `env` (no environment field). Rather than inventing new schema fields to backfill these, **drop them from the real implementation** — show what's real, omit what isn't. This means the "Stalled" filter chip and the stalled pill/badge go away (keep "All" and "Critical" only), and the "Due" / "Environment" rows in the expanded card detail go away too.

---

## Part A — Metric card row (~line 155-191)

Replace the five hardcoded values with real computation, derived once via `useMemo` near the top of `DemoDashboardView`:

- **Active Runs** — count of `activeRuns` where `!sealed && !archivedAt`.
- **Pass Rate** — sum `passed` across all active runs' `runSummary()` results, divided by sum of `(passed + failed + blocked + skipped)` across the same runs (i.e. percentage of *executed* cases that passed, not percentage of total including not-run). Show `—` if the denominator is 0 (no executions yet) rather than `0%` or `NaN%`.
- **Open Failures** — count of executions across active runs with `status === 'Failed'` and an empty `defects` array (i.e. unlinked). This is the same definition task-02's "Needs attention" panel uses — if you build a shared helper for it, use it here too instead of duplicating the loop.
- **Blocked Cases** — count of executions across active runs with `status === 'Blocked'`.
- **Run Coverage** — sum of `(passed + failed + blocked + skipped)` across active runs, divided by sum of `total` across active runs (i.e. percentage of cases executed at all, matching the mock's "of N cases executed" caption). Show `0%` / "0 cases executed" if there are no active runs, not `—` (this one has a sensible zero-state unlike Pass Rate).

Keep the existing card markup/CSS classes (`.mc`, `.mc-head`, `.mv`, `.ml`, `.mc-ic`, `.mt`) — only replace the values and captions. Drop the fabricated deltas ("↑ 6.1 pp vs Sprint 43", "↑ 4 unlinked since yesterday") — there's no historical snapshot to compare against, so replace those caption lines with something real and simple (e.g. Active Runs → "N cases across active runs" using summed totals; Pass Rate → drop the delta line entirely or show nothing if not meaningful; use your judgment per card, but do not fabricate a trend number).

---

## Part B — Active runs column (~line 193-241, `RunCardItem` ~line 301-379)

Replace `RUN_CARDS`/`filteredRuns`/`leftRuns`/`rightRuns` (currently built from the static array) with the same list derived from real active runs (`!sealed && !archivedAt`), each converted to whatever shape `RunCardItem` needs by computing `runSummary(run)` and mapping its fields:

- `pass` ← `passed`, `fail` ← `failed`, `blocked` ← `blocked`, `notrun` ← `notRun + skipped` (fold skipped into the not-run bucket for display — `RunStatusInfographic` only accepts `pass`/`fail`/`blocked`/`notrun`, no separate skipped slot).
- `total` ← `runSummary(run).total`.
- `name` ← `run.name`.
- `plan` ← `run.planName` (already stamped on `DemoRun` when spawned from a plan per `docs/_authoritative/DOMAIN_MODEL.md` — fall back to a placeholder like "—" if a run has no `planId`/`planName`, e.g. one created directly from Test Cases).
- `assignees` — derive the distinct set of `execution.assignee` values across the run's cases (skip undefined/empty). Adjust the "Assignees (N)" tab and its body (~line 380 onward, wherever the assignees tab pane is) to render this real list instead of whatever mock shape it currently expects — read that section before changing it, since the mock `assignees: { n: string }[]` shape may need a lighter replacement (e.g. just `string[]`) depending on how little the assignees tab actually does with each entry.
- `defects` — the distinct set of defect ids linked across the run's executions (`defectIdsForCaseFromRuns`-style logic already exists per `docs/claude/handoff.md`'s note on `defectIdsForCaseFromRuns(runs, caseId)` in `demo-model.ts` — check whether a run-scoped equivalent exists or needs a small local reduction over `run.executions`).
- Drop `env`, `due`, `stalled`/`status` entirely (see Background) — remove the corresponding UI (the "Due"/"Environment" grid cells in the expanded overview pane, the stalled pill, the "Stalled" filter chip).

Update `cardFilter`'s type and the filter chip list (~line 16, ~line 110-118, ~line 200-209) to drop `'stalled'`, keeping just `'all' | 'critical'`. Define "critical" as active runs with `failed > 0` (a simple, always-meaningful threshold — the mock's arbitrary `fail > 10` doesn't translate to real, possibly small, case counts). If you think a different threshold reads better once you see real data volumes, use your judgment, but don't leave it silently matching the old arbitrary constant.

The "All runs" link and header case-count badge (~line 197-213) should reflect the real active-run count instead of the static `8`.

---

## Verification

1. `pnpm build`
2. `pnpm dev`
3. Browser smoke test on `/DP/dashboard`:
   - Confirm metric cards show real numbers matching what you'd compute by hand from `/DP/testruns`' current state (spot-check at least Active Runs count and Run Coverage against the actual run list).
   - Create a new run with a mix of Passed/Failed/Not Run cases, confirm the dashboard updates after navigating back to it.
   - Expand a run card, confirm the Overview/Assignees/Defects tabs show real data with no leftover mock fields (no Due/Environment rows, no fabricated defect ids).
   - Confirm the "Critical" filter chip actually filters to runs with failures once real data is entered.
   - Test with zero active runs (archive or seal all runs, or use a fresh project) — confirm metric cards degrade gracefully (no `NaN%`, no crashes) rather than showing this task's placeholder work (that's task-04's job, this task can still assume `projectHasDemoDashboard` gating is in place for now).
4. Core regression routes (minimum): `/admin/users`, `/admin/roles`, `/admin/audit-log`, `/DP/settings`, `/DP/dashboard`, `/DP/testcases`, `/DP/testruns`, `/DP/plans`
5. Record WebM evidence where tooling supports it; screenshots for any failures.
6. Write QA report to `/tmp/relay-qa-mvp-dashboard-metrics/qa-report.md`.
7. Do not push until smoke test evidence is reviewed or explicitly waived.

## Documentation

- Update `docs/product/feature-flow.md` / `docs/product/user-guide.md` wherever the Dashboard's metric cards or active-runs list are described, to reflect real computation and the dropped fields (stalled/due/environment).
- Update `docs/_authoritative/AS_BUILT_SNAPSHOT.md` if it documents Dashboard as demo-data-only.
- Update `docs/claude/handoff.md` with a completed-work entry for this task.

## Out of scope / do not touch

- "Needs attention" panel — task-02.
- "Coverage" panel — task-03.
- The `projectHasDemoDashboard`/placeholder gate — task-04, don't remove it yet.
- No backend/DB/Docker/auth/API route work.
- No new commits without explicit request.
