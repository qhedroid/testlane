# Task 04 — Show the real dashboard for every project, not just the demo one

Branch: `mvp-dashboard-metrics` (final task on this branch)
Schema: no change expected.

This is task 4 of 4 on this branch. **Do this last** — it depends on task-01, task-02, and task-03 all being applied first, since it removes the fallback that currently protects non-demo projects from seeing (previously fake, now real) dashboard content.

Files touched:
- `apps/web/src/fresh/screens/DashboardScreen.tsx`
- `apps/web/src/fresh/data/demo-project-utils.ts`

---

## Background

`DashboardScreen()` (~line 19-28) currently does:

```tsx
export function DashboardScreen() {
  const { activeProject } = useFresh()
  const showDemoDashboard = projectHasDemoDashboard(activeProject)

  if (!showDemoDashboard) {
    return <DashboardPlaceholder projectName={activeProject?.name ?? 'Project'} />
  }

  return <DemoDashboardView />
}
```

`projectHasDemoDashboard()` (`demo-project-utils.ts`) just checks `project?.seedTemplate === 'demo'`. This exists per `docs/_authoritative/DOMAIN_MODEL.md`'s documented invariant #7 ("Dashboard scoping") specifically because the dashboard used to be 100% fake data — showing it on a blank/user-created project would have displayed nonsense unrelated to that project. Now that tasks 01-03 have made every widget compute from real data, this restriction no longer serves a purpose — a blank project should just show real (zeroed) metrics, the same `DashboardPlaceholder` already handles reasonably well as a *separate* concept for "truly no data yet."

---

## Part A — Merge the two views' zero-state handling

You now have two components with overlapping purposes: `DemoDashboardView` (now real, per tasks 01-03) and `DashboardPlaceholder` (a hand-built all-zero mock). Once `DemoDashboardView` correctly renders zero-state numbers (0 active runs, `—` pass rate, 0% coverage, empty needs-attention/coverage panels) — which it should already do if tasks 01-03 handled empty-data cases per their verification steps — `DashboardPlaceholder` becomes redundant for the "no data" case, but may still be worth keeping for the *specific* case of a project with **zero cases at all** (not just zero runs), where even the Coverage panel has nothing meaningful to show.

Recommended approach: remove the `projectHasDemoDashboard` gate entirely so every project renders `DemoDashboardView`, and inside that component, add a narrower check — if `activeCases.length === 0`, render a simpler "add your first test cases" empty state (reusing `DashboardPlaceholder`'s visual style) instead of five zeroed metric cards and two empty panels, since that reads better for a genuinely brand-new project than a wall of zeros.

## Part B — Clean up

- `projectHasDemoDashboard()` in `demo-project-utils.ts` — if nothing else references it after this change, remove it; if `seedTemplate` is still used elsewhere for unrelated purposes, leave that field alone, just drop the now-unused function. Search for other call sites before deleting.
- Rename `DemoDashboardView` if you think the name is misleading now that it's not demo-only (e.g. `DashboardView`) — purely a readability nice-to-have, not required.

---

## Verification

1. `pnpm build`
2. `pnpm dev`
3. Browser smoke test:
   - `/DP/dashboard` (the seed demo project) — confirm it still renders correctly with real data (no regression from tasks 01-03).
   - Create a brand-new blank project via "Create project," navigate to its dashboard — confirm it shows the new empty-case-count state (not the old generic "Dashboard coming soon," not a wall of confusing zeros either).
   - Add a handful of test cases (no runs yet) to that new project, revisit its dashboard — confirm it now shows the real zero-state metric cards (0 active runs, etc.) rather than the empty-cases state.
   - Add a run and execute some cases, confirm the dashboard fully populates like the demo project does.
4. Core regression routes (minimum): `/admin/users`, `/admin/roles`, `/admin/audit-log`, `/DP/settings`, `/DP/dashboard`, `/DP/testcases`, `/DP/testruns`, `/DP/plans`
5. Record WebM evidence where tooling supports it; screenshots for any failures.
6. Write QA report to `/tmp/relay-qa-mvp-dashboard-metrics/qa-report.md` (final report for the branch — full summary of tasks 01-04, known limitations e.g. dropped stalled/due/environment fields, unlinked-defect deep-link gap from task-02, push readiness).
7. Do not push until smoke test evidence is reviewed or explicitly waived. This is the last task on the branch — flag in the QA report that it's ready for a PR description to be drafted once evidence is reviewed.

## Documentation

- Update `docs/product/feature-flow.md` / `docs/product/user-guide.md` to describe the Dashboard now working for every project, and the new-project empty state.
- Update `docs/_authoritative/DOMAIN_MODEL.md`'s invariant #7 ("Dashboard scoping") — it no longer restricts to `seedTemplate === 'demo'`; describe the new empty-cases-vs-real-data behavior instead.
- Update `docs/_authoritative/AS_BUILT_SNAPSHOT.md` if it references the old restriction.
- Update `docs/claude/handoff.md` with a completed-work entry for the whole `mvp-dashboard-metrics` branch (all four tasks), and note that Shaun's original "Test Plans Scope" follow-up (verifying each Test Plan's own Overview metrics reflect live data too) is a separate, smaller verification pass against `PlansScreen.tsx` — not part of this branch, since that screen's coverage donut already appeared to use real data when checked during the Testiny recon pass, but wasn't exhaustively re-verified end-to-end.

## Out of scope / do not touch

- Metric cards / Active runs column, Needs attention panel, Coverage panel — tasks 01-03, already done.
- `PlansScreen.tsx`'s own Overview tab metrics — separate verification pass, not this branch (see Documentation note above).
- No backend/DB/Docker/auth/API route work.
- No new commits without explicit request.
