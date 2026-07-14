# SUPERSEDED — see task-01 through task-04 in this folder

> This draft has been fleshed into real Cursor-ready task prompts (`task-01-real-metric-cards.md`, `task-02-needs-attention.md`, `task-03-coverage-panel.md`, `task-04-remove-placeholder-gate.md`) as of 2026-07-02. Kept here for the original ask and the clarification thread that shaped scope.

## Original ask

"Do it: Project Scope → Test Plans Scope." (Shaun's own words.)

## Clarification (2026-07-02)

Reading `DashboardScreen.tsx` showed the dashboard has no "scope" concept at all — it's 100% static mock data (`RUN_CARDS`, `ATTENTION_ITEMS`, `COVERAGE_ITEMS` from `data/seed.ts`), gated to only show on the seed demo project (`projectHasDemoDashboard`). Asked Shaun what "Test Plans Scope" should mean given that. His answer:

- Primary task: rebuild the dashboard on **real data first**, following the same real-data-over-mock pattern already applied to Test Cases, Test Runs, and Test Plans elsewhere in the MVP. Each project's dashboard should show metrics about test case results based on the cases actually present in that project.
- "Test Plans Scope" was shorthand for a *follow-up verification*, not a new feature on the main dashboard: once the dashboard is real, confirm that each Test Plan's own Overview tab (which already has its own plan-scoped metrics — coverage donut, open test runs, etc., per the Testiny recon notes) also reflects live data, not stale/hardcoded content.

This reframed the task from a small scope-toggle into a 4-part dashboard rebuild — see the numbered tasks in this folder. The Test Plan Overview verification pass is called out as a smaller, separate follow-up in task-04's Documentation section — not part of this branch.
