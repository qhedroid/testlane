# DRAFT — Dashboard Metrics: Project Scope → Test Plans Scope (not a runnable task yet)

> Provisional planning note, not a Cursor-ready task prompt. Branch name `mvp-dashboard-metrics` is a guess — confirm/rename when this actually starts.

## Original ask

"Do it: Project Scope → Test Plans Scope." (Terse — Shaun's own words. Read as: dashboard metrics currently scope to the whole active project; he wants them scoped to a selected Test Plan instead of/in addition to that.)

## What's known so far

`docs/_authoritative/DOMAIN_MODEL.md` documents an existing invariant (#7, "Dashboard scoping"): dashboard metrics (`RUN_CARDS`, attention/coverage panels) currently render only when `activeProject.seedTemplate === 'demo'`; blank/user-created projects show a placeholder ("Dashboard coming soon"). So scoping today is purely at the **project** level — there's no plan-level filter at all yet.

Testiny's own dashboard (seen during the recon pass) is also project-scoped by default ("Have a great day — here is an overview of your My Demo Project project") with no visible plan-scope selector on the dashboard screen itself — so this may be a Relay-specific enhancement request rather than something to copy from Testiny's dashboard directly. Testiny's *Test Plan* detail screen does have its own scoped metrics (test case coverage donut, "most frequently failed test cases" heatmap, open/all test runs) — that's the closer reference point, not the global dashboard.

## Not yet done

- Haven't looked at `DashboardScreen.tsx` in detail to see what "scope" selector (if any) currently exists there, or how `RUN_CARDS`/coverage panels are computed.
- Haven't clarified with Shaun exactly what "Test Plans Scope" means in practice: a dropdown to pick one plan and see its metrics instead of the whole project's? All plans' metrics side-by-side? Something else?

## Suggested next steps when this is picked up

1. Read `apps/web/src/fresh/screens/DashboardScreen.tsx` and whatever selector/data-fetching it uses today.
2. Ask Shaun a quick clarifying question on what "scope" means here before drafting — this is small enough that a wrong guess wastes a whole task cycle.
3. Given the small size, this could likely be a single-task branch (no multi-task split needed like `mvp-custom-fields`).
