# PR: mvp-dashboard-metrics → mvp-main

## Summary

This branch rebuilds `DashboardScreen.tsx` to compute every widget from live `FreshProvider` state instead of the static `seed.ts` mocks it used before, and removes the demo-only placeholder gate so every project — not just the seed `DP` project — gets a real dashboard. It adds five real metric cards, a live active-runs column with expandable Overview/Assignees/Defects tabs, a needs-attention panel driven by unlinked (defect-less) failures, and a coverage-by-root-folder panel, plus a same-branch bug-fix pass correcting two donut display issues (Skipped status not shown, hover tooltips missing) found in review after the initial implementation landed. UI entry point: `/:projectKey/dashboard`, now for every project rather than only `seedTemplate: 'demo'` ones. No schema change — `DEMO_SCHEMA_VERSION` stays at v14 throughout.

---

## What's included

### Planning

**Docs: record execution order and Cursor batching approach** ([`477ec9e`](https://github.com/qhedroid/Relay/commit/477ec9e))
- `handoff.md` — noted `mvp-further-planning` merged into `mvp-main`; documented the plan to run this branch's four task prompts as one continuous Cursor kickoff message rather than pasting them individually, with `mvp-custom-fields` (higher schema risk) getting a mid-branch checkpoint that this branch doesn't need

### Real dashboard metrics (tasks 01–04)

**Dashboard metrics: Wire dashboard to live FreshProvider data** ([`5544fc0`](https://github.com/qhedroid/Relay/commit/5544fc0))
- `DashboardScreen.tsx` — replaced static seed metrics with live computation from active (unsealed, unarchived) runs, cases, and folders: five metric cards (Active Runs, Pass Rate, Open Failures, Blocked Cases, Run Coverage), a real active-runs column (`runToCard()`, `RunCardItem`), a needs-attention panel of unlinked failed executions (capped list + footer, real empty state), and a coverage-by-root-folder panel (`computeCoverageRows()`, including an unfiled-cases row)
- Dropped mock-only fields with no real equivalent: stalled status, due date, environment — removed their UI (stalled filter chip/pill, Due/Environment detail rows)
- "Critical" filter chip redefined as active runs with `failed > 0` (real, always-meaningful threshold, replacing the mock's arbitrary `fail > 10`)
- Added a zero-cases onboarding empty state (`DashboardEmptyCases` — "Add your first test cases") distinct from the zero-runs-but-has-cases state, which now renders real zeroed metrics instead of a placeholder
- `demo-project-utils.ts` — removed the now-unused `projectHasDemoDashboard()` helper; `DashboardScreen()` renders the real view for every project
- Updated `docs/product/user-guide.md`, `docs/product/feature-flow.md`, and `docs/_authoritative/{AS_BUILT_SNAPSHOT,DOMAIN_MODEL,FRONTEND_CONTRACTS,MVP_FRONTEND_ONLY_SCOPE,AI_HANDOFF}.md` to describe live dashboard behavior for all projects and the dropped mock fields

### Donut Skipped-status and hover-tooltip fix (task-05)

**Docs: draft mvp-dashboard-metrics task-05 (skipped status + hover tooltip fix)** ([`1352efe`](https://github.com/qhedroid/Relay/commit/1352efe))
- Added the task-05 Cursor prompt after review found the run-card donuts folding Skipped into Not run and missing the hover tooltip that RunsScreen's and PlansScreen's donuts already have — both traced to the `RunStatusInfographic` call not passing `skipped`/`interactive` the way those two screens already do

**Dashboard: Show skipped segment and hover tooltips on run donuts** ([`323ce6f`](https://github.com/qhedroid/Relay/commit/323ce6f))
- `DashboardScreen.tsx` — added `skipped` to `DashboardRunCard` and `runToCard()` (previously folded into `notrun`); passed `skipped` and `interactive` through to `RunStatusInfographic` on active run cards so Skipped renders as its own purple wedge with a working per-segment hover tooltip (`{count} ({pct}%) {label}`), matching Test Runs and Test Plans; the Overview tab's progress bar and text summary row also now include a skipped segment when count > 0, so the row still reconciles with `run.total`
- Updated `docs/product/user-guide.md` and `docs/product/feature-flow.md` to describe the separate Skipped segment and hover tooltips

---

## ⚠️ Caveats

- **`pnpm build` / browser smoke test not independently re-verified in this drafting session.** Each task prompt (01–05) requires the implementing Cursor agent to run `pnpm build`, `pnpm dev`, and a browser smoke test before push, with evidence written to `/tmp/relay-qa-mvp-dashboard-metrics/qa-report.md` on the machine that ran it. That report lives locally on the machine that ran Cursor and wasn't accessible from this drafting session — it should be reviewed (or the build/smoke test re-run) before merge.
- **Dropped fields have no replacement:** stalled/due/environment were mock-only concepts with no equivalent in `DemoRun`/`Case` today. If "staleness" or due dates become real requirements later, this is net-new schema work, not a revert.
- **Needs-attention "Link defect" pill is a visual affordance only** — it links through to `/:projectKey/testruns` rather than deep-linking to the specific failed execution or performing an inline link action, since no reusable defect-link action was easily reachable from the dashboard's context. Noted as a known limitation in task-02's own verification notes.
- **Test Plans' own Overview-tab metrics were not touched or re-verified as part of this branch.** Shaun's original "Test Plans Scope" follow-up (confirming `PlansScreen.tsx`'s Overview metrics are also fully live) is a separate, smaller verification pass — not included here.
- **Coverage-by-folder percentages are scoped to active (unsealed, unarchived) runs only**, consistent with every other metric on this dashboard, but worth confirming that's the intended definition of "coverage" going forward if this becomes a reference number elsewhere.

---

## Testing

- **Build:** Not independently re-run in this drafting session — see Caveats. `pnpm build` should be confirmed clean before merge.
- **localStorage:** Key `relay-demo-v2`, schema unchanged at v14 — no migration needed for this branch.
- **Manual smoke checks (per task prompt verification sections, to confirm before/at merge):**
  - `/DP/dashboard` — metric cards show real numbers matching a hand count from `/DP/testruns`'s current state (spot-check Active Runs and Run Coverage)
  - Create a run with a mix of Passed/Failed/Skipped/Not-run cases; confirm the dashboard updates after navigating back, the run's donut shows all five statuses as distinct segments (Skipped only when count > 0), and hovering each wedge shows a `{count} ({pct}%) {label}` tooltip
  - Expand a run card — Overview/Assignees/Defects tabs show real data, no leftover mock fields (no Due/Environment rows), and the text summary row's pass + fail + blocked + skipped + notrun reconciles with `run.total`
  - "Critical" filter chip filters to only runs with `failed > 0`
  - Needs-attention panel lists real unlinked failures sorted most-recent-first; linking a defect via Test Runs removes it from the panel and decrements the count; zero-unlinked-failures shows the positive empty state
  - Coverage panel lists real root-level folders with plausible percentages; adding/executing a case in an uncovered folder updates its row; a project with no folders (or only unfiled cases) doesn't crash
  - Zero active runs (archive/seal all, or a fresh project with cases) — metric cards degrade gracefully (no `NaN%`, no crashes)
  - Brand-new project with zero cases shows the "Add your first test cases" empty state; adding cases (no runs yet) shows real zero-state metrics; adding a run and executing cases populates fully
  - Core regression routes unaffected: `/admin/users`, `/admin/roles`, `/admin/audit-log`, `/DP/settings`, `/DP/dashboard`, `/DP/testcases`, `/DP/testruns`, `/DP/plans`
