# DRAFT — Test Cases Extra (not a runnable task yet)

> Provisional planning note, not a Cursor-ready task prompt. Part of the "Improvements" tier — batched for later, not urgent. Branch name `mvp-test-cases-extra` is a guess (distinct from the already-merged `mvp-test-cases` branch/folder).

## Original ask (multiple items)

1. Test case history should reflect real project data (like the list-view sparklines already do) — currently the case detail's History/Runs/Activity tabs show hardcoded fake data.
2. Rename test case folders — folder shows name | doc count, hover reveals edit (pencil) and delete (bin) icons.
3. Folder creation should behave like quick-create — type name first, Enter confirms, Escape cancels; tick/cross icons as a mouse alternative.
4. The "Runs" tab under a test case should link to actual runs.
5. TODO (unscoped): TC bulk editing + versioning.

## What's known so far

**Items 1 & 4 are the same fix.** Confirmed in code: `CasesScreen.tsx`'s case-list sparkline bars are driven by real data via a `caseBarRun(activeRuns, caseId, barIndex)` helper with a working "go to execution" link. The case detail panel's Runs/History/Activity tabs (~line 1955-1997) are 100% hardcoded literal JSX (fake names like "Nadim Sharif", "Sprint 44 Regression" baked directly into markup). Fixing this means reusing `caseBarRun`/`activeRuns`, not building new computation. Testiny's equivalent "Recent results" graphic on a case's Runs tab has confirmed thresholds (see `testiny-recon-notes.md`): 0 runs → "Add this test case to a test run to see results." (no table); 1–3 runs → "...to see a graphical overview." + a Run/By/At table; 4+ runs → full colored-squares graphic + the same table. The History and Activity tabs would need their own real-data treatment too (History = per-execution result changes over time; Activity = case edit history) — check whether any audit-log-style data already exists to power these, or whether they need new tracking.

**Items 2 & 3 are both confirmed on Testiny** (`testiny-recon-notes.md`): hovering a folder reveals pencil/trash icons; pencil turns the name into an inline input with a green check (confirm) / grey X (cancel) pair, Escape also cancels. "New" folder creation drops an identical inline input with the same check/X pair. Exact pattern to mirror — this part is well-specified and could be scoped into a real task without much more research.

**Item 5** is explicitly unscoped by Shaun (`// TODO`) — needs a real ask before it can be drafted at all, not just more code research.

## Dependency note

`roadmap.md`'s "Add a live demo project" item (also in Improvements) is a prerequisite for meaningfully demoing/QA-ing items 1 & 4 — without real, varied run history behind real cases, "make history match actual data" has thin data to show. Worth sequencing that first, or at least alongside.

## Suggested next steps when this is picked up

1. Items 2 & 3 (folder rename/quick-create) are the most ready to scope into a real task — Testiny's exact behavior is already documented, just needs Relay-side implementation planning.
2. Items 1 & 4 need a read of the History/Activity tabs' intended data model (is there existing execution-history tracking to reuse, or does this need new state?) before scoping.
3. Get Shaun's input on item 5 before touching it at all.
4. Follow the `mvp-custom-fields/task-01-field-type-parity.md` format once any of these are scoped into real tasks.
