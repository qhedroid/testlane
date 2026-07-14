# Task 03 — Coverage panel on real data

Branch: `mvp-dashboard-metrics` (continues from task-01/task-02 on this branch)
Schema: no change expected.

This is task 3 of 4 on this branch. Independent of task-02, but assumes task-01's active-run computation exists.

Files touched:
- `apps/web/src/fresh/screens/DashboardScreen.tsx`

---

## Background

The "Coverage" panel (~line 276-293) renders `COVERAGE_ITEMS` — six hardcoded module-style labels (`CTMS`, `eTMF`, `User Management`, `Viewer`, `GlobalLearn`, `API Gateway`) with arbitrary percentages and colors. These labels don't correspond to anything in Relay's actual data model — Relay's real grouping mechanism is **folders** (`Folder { id, projectId, name, parentId }`), not fixed module names.

Replace the module breakdown with **coverage per top-level folder**: for each folder in `activeFolders` with `parentId == null` (i.e. a root-level folder, not a subfolder), compute the percentage of that folder's cases (including cases in its subfolders — reuse `folderDescendantIds()`/`casesInFolder()` from `demo-model.ts`, the same helpers `resolvePlanCases()` uses for its folder-type queries) that have been executed at least once across any active run (`!sealed && !archivedAt`). "Executed" here means the case has a non-"Not run" status in at least one active run's executions — reuse whatever definition task-01 settled on for "coverage," or if task-01 didn't need a per-case definition (it only needed run-level aggregates), define it fresh here as: a case counts as covered if `run.executions[case.id]?.status` is set (any status) in at least one active run.

---

## Part A — Compute per-folder coverage

- For each root-level folder: `covered = count of that folder's (including descendants) cases with at least one active-run execution`, `total = count of that folder's (including descendants) cases`, `pct = Math.round((covered / total) * 100)` (guard against `total === 0` → show `0%`, not `NaN%` — or skip folders with zero cases entirely from the panel, which is probably cleaner; use your judgment but don't crash or show `NaN`).
- Also include a "Cases in no folder" row using the same `'__unfiled__'` sentinel pattern already established in `PlansScreen.tsx`'s folder-query work (`docs/cursor-prompts/mvp-test-plans/task-03-plans-screen-polish.md` documents this pattern if you need the reference) — only if there are any unfiled cases in the project; omit the row entirely if there are none.
- Sort however reads best — by name, or by pct ascending (worst-covered first, arguably more useful for a "needs attention"-adjacent panel) — your call, but be consistent and don't randomize.
- Color logic: keep the existing pattern of a color threshold (the mock used green for the highest, amber/red for the lower ones, default accent color otherwise) — apply similar thresholds to real percentages (e.g. ≥80% green, ≤50% red, default in between) rather than copying the mock's specific hardcoded colors verbatim.

## Part B — Header

- "Coverage — Sprint 44" (~line 279) — drop the fabricated sprint name; a project doesn't have a "current sprint" concept in Relay's data model. Just "Coverage" or "Coverage by folder" is fine.
- The "68% overall" caption should be the real overall percentage (covered cases / total cases across the whole project, not just active-run-scoped — or match whatever "Run Coverage" metric card task-01 computed, for consistency; reuse that number directly rather than recomputing a slightly different definition).

---

## Verification

1. `pnpm build`
2. `pnpm dev`
3. Browser smoke test on `/DP/dashboard`:
   - Confirm the Coverage panel lists real root-level folders from `/DP/testcases` with plausible percentages you can spot-check by hand.
   - Add a case to an uncovered folder, run it, confirm the panel updates.
   - Test a project with no folders at all (or only unfiled cases) — confirm no crash, sensible empty/simple state.
4. Core regression routes (minimum): `/admin/users`, `/admin/roles`, `/admin/audit-log`, `/DP/settings`, `/DP/dashboard`, `/DP/testcases`, `/DP/testruns`, `/DP/plans`
5. Record WebM evidence where tooling supports it; screenshots for any failures.
6. Write QA report to `/tmp/relay-qa-mvp-dashboard-metrics/qa-report.md` (append/continue from task-01/02).
7. Do not push until smoke test evidence is reviewed or explicitly waived.

## Documentation

- Update `docs/product/feature-flow.md` / `docs/product/user-guide.md` if the Coverage panel's module-based grouping is described there — it's now folder-based.
- Update `docs/claude/handoff.md` with a completed-work entry for this task.

## Out of scope / do not touch

- Metric cards / Active runs column — task-01, already done.
- "Needs attention" panel — task-02, already done.
- The `projectHasDemoDashboard`/placeholder gate — task-04.
- No backend/DB/Docker/auth/API route work.
- No new commits without explicit request.
