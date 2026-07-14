# Task 02 — "Needs attention" panel on real data

Branch: `mvp-dashboard-metrics` (continues from task-01 on this branch)
Schema: no change expected.

This is task 2 of 4 on this branch. Depends on task-01 being applied first (shares the same file and the "unlinked failure" definition established there for the Open Failures metric card).

Files touched:
- `apps/web/src/fresh/screens/DashboardScreen.tsx`

---

## Background

The "Needs attention" panel (~line 243-274) lists `ATTENTION_ITEMS` — a static array of fabricated bug-sounding titles ("CTMS user role mapping drops Viewer permission after save", etc.) with fake priority/run/actor/defect data. None of it is real.

The real equivalent: **unlinked failures** — executions with `status === 'Failed'` and an empty `defects` array, across active (`!sealed && !archivedAt`) runs. Task-01 should have already established this exact definition for the "Open Failures" metric card — reuse that logic/helper here rather than redefining it.

---

## Part A — Replace the panel's data source

For each unlinked-failed execution, you need to reconstruct an item with:

- **Title** — Relay's `Case` doesn't have a bug-report-style title for a failure the way the mock does; use the case's own `title` field (e.g. "TC-1004 login form validation" — whatever the real case is called). Don't fabricate a defect-sounding description.
- **Priority** — the case's real `priority` field (`CasePriority`), mapped through the existing `PRI_MAP` (already imported, ~line 14) the same way the mock did.
- **Run** — the run's `name` (and `planName` if you want the extra context the mock showed, consistent with whatever task-01 did for run cards).
- **Actor** — the execution's `testedBy` field if present (who executed it), formatted the same way other "by" fields are displayed elsewhere in the codebase (check `displayAssigneeName` usage pattern from `team-users.ts`, used elsewhere in `CasesScreen.tsx` — reuse it here for consistency instead of inventing new formatting). If `testedBy` is empty, show the run's name only, no actor.
- **Time** — use `execution.testedAt` if present, formatted as a relative time (check whether a relative-time formatting helper already exists elsewhere in the codebase — e.g. "2d ago" strings appear all over `CasesScreen.tsx`'s mock tabs and `PlansScreen.tsx`'s real run history table; find and reuse whatever real formatter the latter uses, don't hand-roll a new one).
- **Defect tag** — since this is specifically the *unlinked* set, `defectId` will always be absent here; the "Link defect" pill (~line 267) is the only relevant right-side element — keep it, and make it actually functional if a "link defect" action is easily reachable from this context (check whether `RunsScreen.tsx` already exposes a reusable defect-link action/component you can call into; if wiring a real action here is nontrivial, leave the pill purely as a visual affordance linking through to the run per the existing `<Link href={projectHref('testruns')}>` behavior, and note this in the QA report as a known limitation rather than half-wiring it).

Sort by most recent `testedAt` first (falling back to any stable order — e.g. run creation order — for executions with no `testedAt`).

## Part B — Panel header and footer

- The count badge (~line 248, currently hardcoded `11`) and "unlinked failures" caption should reflect the real count.
- The footer link "View all 11 failures →" (~line 273) should use the real count too, and should link somewhere real — check whether `RunsScreen.tsx`/`ApiRunsWorkspace.tsx` supports a query param or filter state that could deep-link to "all failed, unlinked" cases; if not, link to `projectHref('testruns')` as the mock does (no worse than before) and note the missing deep-link as a limitation.
- If there are zero unlinked failures, replace the panel body with a small positive empty-state message (e.g. "No unlinked failures — nice work.") rather than an empty list with a `0` badge and no explanation.
- Cap the visible list at a reasonable number (the mock showed 6) with the footer link implying "more exist" — if there are fewer than that, just show them all and adjust/hide the "View all" footer accordingly (don't show "View all 3 failures →" redundantly when all 3 are already visible above it).

---

## Verification

1. `pnpm build`
2. `pnpm dev`
3. Browser smoke test on `/DP/dashboard`:
   - With some Failed, unlinked executions present, confirm the panel lists real case titles/priorities/run names/actors, sorted most-recent first.
   - Link a defect to one of the failures (via Test Runs), confirm it drops out of this panel and the count decrements.
   - Test the zero-unlinked-failures empty state.
4. Core regression routes (minimum): `/admin/users`, `/admin/roles`, `/admin/audit-log`, `/DP/settings`, `/DP/dashboard`, `/DP/testcases`, `/DP/testruns`, `/DP/plans`
5. Record WebM evidence where tooling supports it; screenshots for any failures.
6. Write QA report to `/tmp/relay-qa-mvp-dashboard-metrics/qa-report.md` (append/continue from task-01).
7. Do not push until smoke test evidence is reviewed or explicitly waived.

## Documentation

- Update `docs/product/feature-flow.md` / `docs/product/user-guide.md` if the "Needs attention" panel is described there.
- Update `docs/claude/handoff.md` with a completed-work entry for this task.

## Out of scope / do not touch

- Metric cards / Active runs column — task-01, already done.
- "Coverage" panel — task-03.
- The `projectHasDemoDashboard`/placeholder gate — task-04.
- No backend/DB/Docker/auth/API route work.
- No new commits without explicit request.
