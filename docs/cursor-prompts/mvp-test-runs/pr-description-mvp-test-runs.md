This branch delivers the full Test Runs execution workspace — the primary screen where testers work through a test run case by case, recording pass/fail/blocked statuses, adding step comments, and tracking execution history. The feature is accessible at `/[projectKey]/runs` and builds on the test cases scaffolding from `mvp-test-cases`.

---

### Schema & Data Layer

**Test runs: schema v10, execution log, editRun, URL routing** ([`b7a7b5b`](https://github.com/qhedroid/Relay/commit/b7a7b5b))
- Schema v10: added `resultNotes`, `testedAt`, `testedBy` to `CaseExecution`; added `executionLog: ExecutionLogEntry[]` to `DemoRun`
- New `ExecutionLogEntry` interface (id, caseId, at, by, from, to)
- Added `UPDATE_RUN` action and `editRun()` on `useFresh()`
- New route `/testruns/tr/[runKey]/tc/[caseKey]/page.tsx` with `testRunCasePath()` and `parseTestRunCaseKey()` helpers

**Test cases/runs: Case.createdAt schema v11, Testiny-style tooltips** ([`5d45db0`](https://github.com/qhedroid/Relay/commit/5d45db0))
- Schema v11: added `createdAt?: string` to `Case`; v10→v11 migration backfills from `updatedAt`
- Sparkline tooltip in CasesScreen updated to Testiny-style layout (run key link, go-to-execution affordance)
- Case ID hover tooltip in RunsScreen shows case key, created/modified dates, link to test case detail

**Test runs: add cases to run modal and ADD_CASES_TO_RUN action** ([`07153ae`](https://github.com/qhedroid/Relay/commit/07153ae))
- `ADD_CASES_TO_RUN` reducer action; `addCasesToRun()` on `useFresh()`
- `AddCasesToRunModal`: searchable, folder-grouped, checkbox selection; deduplication against existing run cases
- "+ Add cases" button in RunsScreen toolbar; empty-run "+ Add cases" button wired

---

### URL & Navigation

**Test cases: rename URL slug to testcases, strip TC- prefix from case URL segments** ([`ead3195`](https://github.com/qhedroid/Relay/commit/ead3195))
- URL slug changed from `cases` → `testcases` throughout (routes, links, breadcrumbs)
- `TC-` prefix stripped from URL path segments; `caseKeyToSlug()` / `slugToCaseKey()` helpers added
- Legacy `/cases/…` redirect in place

---

### Test Runs Screen

**Test runs: RunsScreen overhaul — URL sync, folder grouping, filters, history** ([`b0f981c`](https://github.com/qhedroid/Relay/commit/b0f981c))
- Three-pane layout: run list (left), case list (centre), execution detail (right)
- URL sync via `window.history.replaceState`; deep-linkable run + case selection
- Case list groups by folder; collapsible group headers
- Rich filter panel: status filter, text search, assignee, priority, type (AND logic)
- Team summary panel with per-member pass/fail/blocked counts
- Execution detail pane: Details, Comments, Defects, History tabs; result notes textarea; `editRun` modal
- History tab renders status-change log entries with coloured dots and relative timestamps
- `RunStatusInfographic` donut chart; click-to-filter by status

**Test runs: merge Details/Steps tab, remove Activity, arrow key navigation, scrollable create modal** ([`528e69f`](https://github.com/qhedroid/Relay/commit/528e69f))
- Steps merged into the Details tab (no separate Steps tab)
- Activity tab removed (History tab covers this)
- ↑/↓ arrow key navigation between cases in the centre list
- `CreateRunModal` made scrollable

**Test runs: auto-open run, Testiny empty-run state, empty run creation, navigation fixes** ([`af432c1`](https://github.com/qhedroid/Relay/commit/af432c1))
- Auto-opens the most recently modified run on load; falls back to first run if none match
- Testiny-style empty-run placeholder when a run has no cases
- `CreateRunModal` creates empty runs (no cases pre-selected); user adds cases separately via "+ Add cases"
- No-cases guards on Create buttons; navigates to new run after creation

**Test runs: fix project-switch flicker via projectMismatch guard** ([`057b725`](https://github.com/qhedroid/Relay/commit/057b725))
- `projectMismatch` guard added to RunsScreen (3 effects) and CasesScreen URL-sync effect
- Prevents `ProjectRouteSync` from reverting active project state mid-navigation

---

### UI Polish

**Runs: Task 07b — UI polish (9 fixes)** ([`5d17d2a`](https://github.com/qhedroid/Relay/commit/5d17d2a))
- Details pane: "Assigned to" moved to standalone top field; "Metadata" renamed to collapsible "Custom Fields" (Priority, Type, Last result); field order is Assigned to → Custom Fields → Preconditions → Steps → Result information
- Step comment textarea: `rows` 1→2; `resize: vertical`
- Shortcut bar: J/K replaced with ↑/↓ for Navigate hint
- `activeCases` wired to all four `TestRunsTopbar` instances; `hasCases` prop disables "Create new run…" and empty-state buttons when project has no cases
- Summary section collapsible with chevron header
- Tab order changed to Details, Comments, Defects, Requirements, History; read-only Requirements panel added from `caseData.references`
- `.runs-v12 .ec-cid`: accent colour + underline + 11px; `.ec-cnm` 14px; `.ec-cby` 11px
- Sparkline tooltip run key display changed from `00001` → `TR-00001`

**Runs: Task 07c — UI polish (5 fixes)** ([`24c693b`](https://github.com/qhedroid/Relay/commit/24c693b))
- Step-comment links in Comments tab scroll to the referenced step in Details tab (`.ed-cmt-step-link` blue + underline; `useEffect` on tab switch)
- Defects/Requirements tabs corrected per context: Defects interactive (Create/Link stubs) in runs, read-only in test cases; Requirements read-only in runs, interactive in test cases
- "Create new run…" dropdown button fully guarded (`disabled={!hasCases}` — missed in 07b)
- Team/Defects/Details tabbed panel added to the right of the donut chart; `ec-pane` default width → 500px, `data-min` → 475px; team rows moved into Team tab
- `DELETE_CASE` cascades to unsealed runs; `deleteCaseConfirm` modal replaces `window.confirm` in CasesScreen; modal lists affected open run keys

**Runs: Task 07d — history creation event + summary panel fixes** ([`c81073f`](https://github.com/qhedroid/Relay/commit/c81073f))
- `ExecutionLogEntry` gains optional `event?: 'created'` field (no migration required)
- `ADD_CASES_TO_RUN` now appends a creation log entry per new case; History tab renders "Record was created" with `var(--accent)` dot
- `ec-summary-body` changed to `align-items: stretch` so tabbed panel matches donut height
- Team tab rows show "N cases assigned" per member; clicking toggles `advFilter.assignee` filter

---

### ⚠️ Caveats

- **Task 07b source commit** (`task-07b-commit.md`) may have been committed via a separate Cursor run — verify `5d17d2a` includes all 4 changed files (`TestRunsTopbar.tsx`, `CasesScreen.tsx`, `RunsScreen.tsx`, `prototype-runs.css`) before merging.
- **CasesScreen residual flicker** on project switch is partially deferred — see `docs/claude/known-bugs.md` for details. RunsScreen is fully fixed.
- **Tasks 07b–07d are UI-only feedback rounds.** No schema version bump or migration was added for 07b/07c/07d (07d's `event?` field is backward-compatible optional addition).
- **Docs commits** (handoff, Cursor prompts) are interleaved with source commits. These are internal planning artefacts and can be squashed or ignored during review.

---

### Testing

- `pnpm build` passes with zero TypeScript errors on each source commit.
- **localStorage:** key `relay-demo-v2`. Schema is now v11. v9→v10→v11 migrations run automatically on first load. Clear localStorage to test a clean-slate experience.
- **Key manual checks:**
  - Create a test run → cases panel shows empty-run state → add cases via modal → cases appear grouped by folder
  - Execute a case: change status, add step comment, check History tab shows status-change entry and "Record was created" entry
  - Delete a test case → confirm modal lists affected open runs → case removed from those runs; sealed runs unaffected
  - Summary section: donut and tabbed panel are the same height; Team tab shows "N cases assigned"; clicking a member filters the case list
  - Comment tab: clicking a step label jumps to that step in the Details tab
  - No-cases guard: project with zero cases → "Create test run" button disabled everywhere
