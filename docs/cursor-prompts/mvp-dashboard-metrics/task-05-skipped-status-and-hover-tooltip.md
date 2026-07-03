# Task 05 — Show Skipped status and hover tooltips on dashboard run-card donuts

Branch: `mvp-dashboard-metrics` (continues after tasks 01–04, already committed as `5544fc0`)
Schema: no change.

Bug-fix follow-up, found in review after tasks 01–04 landed. Both bugs are in the same component instance (the per-run donut in the Active Runs column) and share one root cause: that donut isn't being passed the same props RunsScreen/PlansScreen already pass to the identical shared component.

Files touched:
- `apps/web/src/fresh/screens/DashboardScreen.tsx`

Do not touch `RunsScreen.tsx`, `PlansScreen.tsx`, `RunDonut.tsx`, or `RunStatusInfographic.tsx` — they're the correct reference behavior, not the bug.

---

## Background

**Bug 1 — Skipped executions don't show on the dashboard donuts.** `runToCard()` (~line 111-125) computes `notrun: summary.notRun + summary.skipped`, folding Skipped into Not run. This was an explicit call in task-01's prompt, which assumed `RunStatusInfographic`/`RunDonut` had "no separate skipped slot." That assumption was wrong — checking the actual components shows both have always accepted a dedicated `skipped` prop, with its own donut wedge (purple, `#4527A0` / `var(--skip)`) and its own row in the status list (rendered only when count > 0). RunsScreen (`RunStatusInfographic` call ~line 723-735) and PlansScreen (~line 1081-1092) both already pass `skipped` as its own value — Dashboard is the outlier that needs fixing, not the components.

**Bug 2 — No hover tooltip on the dashboard donuts.** `RunStatusInfographic` at `DashboardScreen.tsx` ~line 525 is called without the `interactive` prop. `RunDonut` (which `RunStatusInfographic` wraps) already implements the entire hover tooltip itself internally (`showTip`/`tooltip` state, ~line 38-82 of `RunDonut.tsx`) — it just no-ops unless `interactive` is true. RunsScreen's summary donut (line 732) and PlansScreen's run-history hover popup (line 1089) both pass `interactive`. No new tooltip logic needs to be written — just pass the existing prop through.

---

## Part A — Stop folding Skipped into Not run

- `DashboardRunCard` interface (~line 24-35): add `skipped: number`.
- `runToCard()` (~line 111-125): change `notrun: summary.notRun + summary.skipped` to `notrun: summary.notRun`, and add `skipped: summary.skipped`.

## Part B — Pass `skipped` and `interactive` through to the donut

- `RunCardItem`'s `RunStatusInfographic` call (~line 525): add `skipped={run.skipped}` and `interactive`. RunsScreen's call (line 723-735) is a reasonable prop-order reference.
- Text summary row below the donut (~line 570-575: `✓ N passed / ✗ N failed / ⊘ N blocked / ○ N not run`) — the "not run" number here now excludes skipped (per Part A), so add a conditional `run.skipped > 0 ? … : null` entry alongside the existing conditional blocked entry, styled with `var(--skip)`, so the row still reconciles with `run.total`. Use your judgment on the exact icon/symbol — just don't reuse one already assigned to another status in that row.
- Optional, your judgment: the small execution-progress bar directly above that text row (~line 565-569, `.pg-p`/`.pg-f`/`.pg-b` segments) has no skipped segment either. `.pg-s` already exists in `fresh.css` (`background:#4527A0`) for exactly this. Add a `.pg-s` segment sized to `run.skipped` if it fits cleanly; if you skip it, note it as a known gap in the QA report rather than leaving the bar silently not summing to `run.total`.

---

## Verification

1. `pnpm build`
2. `pnpm dev`
3. Browser smoke test on `/DP/dashboard`:
   - Find or create an active run with at least one Skipped execution (mark a case Skipped via `/DP/testruns` if none exist).
   - Confirm that run's donut in the Active Runs column shows a distinct purple Skipped wedge, and the status list beside it shows a "Skipped" row.
   - Hover each wedge (Passed/Failed/Blocked/Skipped/Not run) and confirm a tooltip appears (`{count} ({pct}%) {label}`), matching the tooltip behavior already on `/DP/testruns` and `/DP/plans`.
   - Confirm the expanded card's text summary row now excludes skipped from "not run," and shows a "N skipped" entry when skipped > 0.
   - Confirm the numbers reconcile: pass + fail + blocked + skipped + notrun == total.
   - Confirm a run with zero skipped cases still renders correctly (no stray "0 skipped" row, no crash).
4. Core regression routes (minimum): `/admin/users`, `/admin/roles`, `/admin/audit-log`, `/DP/settings`, `/DP/dashboard`, `/DP/testcases`, `/DP/testruns`, `/DP/plans`
5. Record WebM evidence where tooling supports it; screenshots for any failures.
6. Write QA report to `/tmp/relay-qa-mvp-dashboard-metrics/qa-report.md` (append as a new task-05 section).
7. Do not push until smoke test evidence is reviewed or explicitly waived.

## Documentation

- Update `docs/product/feature-flow.md` / `docs/product/user-guide.md` wherever they describe the dashboard donuts folding Skipped into Not run (task-01's docs update introduced this) — correct it to describe Skipped as its own segment with a hover tooltip.
- Update `docs/claude/handoff.md` with a completed-work entry for this fix.

## Out of scope / do not touch

- Metric card row, Needs-attention panel, Coverage panel — unaffected, don't touch.
- `RunsScreen.tsx`, `PlansScreen.tsx`, `RunDonut.tsx`, `RunStatusInfographic.tsx` — reference only, already correct.
- No backend/DB/Docker/auth/API route work.
- No new commits without explicit request.
