# PR: mvp-test-runs → mvp-main

## Summary

This branch delivers the full Test Runs execution workspace — the primary screen where testers work through a run case by case, recording pass/fail/blocked statuses, adding step comments, and tracking execution history. The feature lives at `/[projectKey]/runs` and is built entirely client-side (state via `localStorage` key `relay-demo-v2`, currently schema v11) with no backend dependencies. It builds directly on the test case scaffolding from `mvp-test-cases`.

---

## What's included

### Schema & Data Layer

**Test runs: schema v10, execution log, editRun, URL routing** ([`b7a7b5b`](https://github.com/qhedroid/Relay/commit/b7a7b5b))
- Schema v10: added `resultNotes`, `testedAt`, `testedBy` to `CaseExecution`; added `executionLog: ExecutionLogEntry[]` to `DemoRun`; migration backfills missing fields and seeds `executionLog: []` on all existing runs
- New `ExecutionLogEntry` interface (id, caseId, at, by, from, to)
- Added `UPDATE_RUN` action and `editRun()` on `useFresh()`
- New route `/testruns/tr/[runKey]/tc/[caseKey]/page.tsx`; `testRunCasePath()` and `parseTestRunCaseKey()` helpers

**Test cases/runs: Case.createdAt schema v11, Testiny-style tooltips** ([`5d45db0`](https://github.com/qhedroid/Relay/commit/5d45db0))
- Schema v11: added `createdAt?: string` to `Case`; v10→v11 migration backfills from `updatedAt`
- Sparkline tooltip in CasesScreen updated to Testiny-style layout with run key link and go-to-execution affordance
- Case ID hover tooltip in RunsScreen shows case key, created/modified dates, link to test case detail

**Test runs: add cases to run modal and ADD_CASES_TO_RUN action** ([`07153ae`](https://github.com/qhedroid/Relay/commit/07153ae))
- `ADD_CASES_TO_RUN` reducer action; `addCasesToRun()` on `useFresh()`
- `AddCasesToRunModal`: searchable, folder-grouped, checkbox selection; deduplicates against existing run cases
- "+ Add cases" button wired in RunsScreen toolbar and empty-run placeholder

### URL & Navigation

**Test cases: rename URL slug to testcases, strip TC- prefix from case URL segments** ([`ead3195`](https://github.com/qhedroid/Relay/commit/ead3195))
- URL slug changed from `cases` → `testcases` throughout (routes, links, breadcrumbs)
- `TC-` prefix stripped from URL path segments; `caseKeyToSlug()` / `slugToCaseKey()` helpers added
- Legacy `/cases/…` redirect in place for existing links

### Test Runs Screen

**Test runs: RunsScreen overhaul — URL sync, folder grouping, filters, history** ([`b0f981c`](https://github.com/qhedroid/Relay/commit/b0f981c))
- Three-pane layout: run list (left), case list (centre), execution detail (right)
- URL sync via `window.history.replaceState`; run and case selection are deep-linkable
- Case list groups by folder with collapsible group headers
- Rich filter panel: status, text search, assignee, priority, type with AND logic; badge shows active filter count
- Team summary panel with per-member pass/fail/blocked counts
- Execution detail pane: Details, Comments, Defects, History tabs; result notes textarea; `EditRunModal`
- History tab renders status-change log entries with coloured dots and relative timestamps
- `RunStatusInfographic` donut chart with click-to-filter by status

**Test runs: merge Details/Steps tab, remove Activity, arrow key navigation, scrollable create modal** ([`528e69f`](https://github.com/qhedroid/Relay/commit/528e69f))
- Steps merged into the Details tab; Activity tab removed (History tab covers this)
- ↑/↓ arrow key navigation between cases in the centre list
- `CreateRunModal` made scrollable

**Test runs: auto-open run, Testiny empty-run state, empty run creation, navigation fixes** ([`af432c1`](https://github.com/qhedroid/Relay/commit/af432c1))
- Auto-opens the most recently modified run on load; falls back to first run
- Testiny-style empty-run placeholder when a run has no cases
- `CreateRunModal` creates empty runs; cases added separately via "+ Add cases"
- No-cases guards on Create buttons; navigates to the new run after creation

**Test runs: fix project-switch flicker via projectMismatch guard** ([`057b725`](https://github.com/qhedroid/Relay/commit/057b725))
- `projectMismatch` guard added to three effects in RunsScreen and the URL-sync effect in CasesScreen
- Prevents `ProjectRouteSync` from reverting active project state mid-navigation

### UI Polish

**Runs: Task 07b — UI polish (9 fixes)** ([`5d17d2a`](https://github.com/qhedroid/Relay/commit/5d17d2a))
- Details pane: "Assigned to" moved to standalone top field; "Metadata" renamed to collapsible "Custom Fields" (Priority, Type, Last result); order is Assigned to → Custom Fields → Preconditions → Steps → Result information
- Step comment textarea `rows` 1→2; `resize: vertical`
- Shortcut bar: J/K replaced with ↑/↓ for Navigate hint
- `hasCases` prop added to `TestRunsTopbar`; all four instances wired; empty-state Create buttons disabled when project has no cases
- Summary section made collapsible with chevron header
- Tab order: Details, Comments, Defects, Requirements, History; read-only Requirements panel added from `caseData.references`
- `.runs-v12 .ec-cid`: accent colour + underline + 11px; `.ec-cnm` 14px; `.ec-cby` 11px (scoped to avoid affecting CasesScreen)
- Sparkline tooltip run key display changed from `00001` → `TR-00001`

**Runs: Task 07c — UI polish (5 fixes)** ([`24c693b`](https://github.com/qhedroid/Relay/commit/24c693b))
- Step-comment links in Comments tab scroll to the referenced step in Details tab (`.ed-cmt-step-link` blue + underline; `useEffect` on tab switch)
- Defects/Requirements tab contexts corrected: Defects interactive (Create/Link stubs) in runs, read-only in test cases; Requirements read-only in runs, interactive in test cases
- "Create new run…" dropdown button fully guarded with `disabled={!hasCases}` (missed in 07b)
- Team/Defects/Details tabbed panel added beside the donut chart; `ec-pane` default width → 500px, `data-min` → 475px; team rows moved into Team tab
- `DELETE_CASE` cascades to unsealed runs; `deleteCaseConfirm` modal replaces `window.confirm` in CasesScreen and lists affected open run keys

**Runs: Task 07d — history creation event + summary panel fixes** ([`c81073f`](https://github.com/qhedroid/Relay/commit/c81073f))
- `ExecutionLogEntry` gains optional `event?: 'created'` (no migration required — purely additive)
- `ADD_CASES_TO_RUN` reducer now appends a creation log entry per new case; History tab renders "Record was created" with `var(--accent)` dot
- `ec-summary-body` changed to `align-items: stretch` so the tabbed panel matches donut height naturally
- Team tab rows show "N cases assigned" per member; clicking a member toggles `advFilter.assignee` to filter the run list

---

## ⚠️ Caveats

- **Defects Create/Link stubs** in the execution detail pane are not yet wired to real data — clicking them does nothing beyond showing placeholder text.
- **CasesScreen residual flicker** on project switch is partially deferred — RunsScreen is fully fixed; see `docs/claude/known-bugs.md` for the CasesScreen details.
- The branch contains interleaved `Docs:` commits (Cursor prompt files, handoff updates) which are intentional planning artefacts and can be squashed or ignored during review.

---

## Testing

- **Build:** `pnpm build` passes with zero TypeScript errors on the final commit.
- **localStorage:** key `relay-demo-v2`, schema v11. On first load after merge, the migration chain v9→v10→v11 runs automatically. Clear localStorage to test a clean-slate experience.
- **Manual smoke checks:**
  - `/DP/runs` → create a test run → empty-run placeholder appears → add cases via modal → cases grouped by folder
  - Execute a case: change status → History tab shows status-change entry; add case to run → History tab shows "Record was created" entry
  - Delete a test case → confirm modal lists affected open runs → case removed from those runs; sealed runs untouched
  - Summary panel: donut and tabbed panel are the same height; Team tab shows "N cases assigned"; clicking a member filters the run
  - Comments tab: clicking a step label jumps to that step in the Details tab
  - No-cases guard: project with zero test cases → "Create test run" button disabled in all locations
  - Switch between projects rapidly → active project does not revert to P1
