# Task 01 — Build Reporting, Export, Re-Run, and Test Case Organization slice

**Executed by:** a Claude coding agent running the Fable model, in a new chat pointed at this same connected folder — not Cursor, and not the standard Claude(Cowork)-plans/Cursor-implements workflow. This is a deliberate, explicit deviation for this branch only, approved by the project owner (Noel Quadri). Note this fact again in `docs/claude/handoff.md` when you update it.

You are implementing a frontend feature slice directly in the Relay codebase — this is a real coding task, not a design/wireframe exercise. Write actual working TypeScript/React code, run real builds, make real git commits on a real branch in this repo.

Relay is a QA/CTMS test-management frontend (Next.js App Router, React, pnpm workspaces, TypeScript). This is a frontend-only prototype phase: persistence is client-side only via a React context store (`FreshProvider`) backed by `localStorage`, key `relay-demo-v2`. There is no real backend wired to the UI (a `packages/db` exists but is out of scope — do not touch it).

## Step 0 — read these files first, in this order, before writing any code

1. `CLAUDE.md` (repo root) — the authoritative project rules for this codebase. Follow it exactly, including the commit message format and the mandatory git commit identity procedure (see below — do not skip this).
2. `.cursor/rules.md` and `.cursor/rules/relay-core.mdc`, `.cursor/rules/relay-web.mdc` — same rules, Cursor-facing phrasing, contains canonical file paths.
3. `docs/_authoritative/README.md`, `docs/_authoritative/AS_BUILT_SNAPSHOT.md`, `docs/_authoritative/DOMAIN_MODEL.md`, `docs/_authoritative/FRONTEND_CONTRACTS.md` — source of truth for current data model and contracts.
4. `docs/product/user-guide.md`, `docs/product/feature-flow.md` — living docs you must update.
5. `docs/claude/handoff.md` — current active branch (was `mvp-test-plans`), current schema version (v14), recent work log.
6. `apps/web/src/fresh/data/FreshProvider.tsx`, `apps/web/src/fresh/data/demo-model.ts`, `apps/web/src/fresh/data/migrate-demo-state.ts`, `apps/web/src/fresh/data/project-selectors.ts` — the store, types, and migration pattern you must extend, not replace.

## Step 1 — branch setup

Run `git fetch origin`. Check `git log --oneline -5 origin/mvp-main` and, if it still exists as a ref, `git log --oneline -5 origin/mvp-test-plans` (local or remote). `docs/claude/handoff.md` says `mvp-test-plans` was the active branch, rebased onto `origin/mvp-main` including merged PRs #13 and #14 — but confirm whether `mvp-test-plans` has itself since been merged into `origin/mvp-main`. Branch from whichever ref is the most current integration point (prefer `origin/mvp-main` if `mvp-test-plans` is already merged into it; otherwise branch from `mvp-test-plans` so you don't lose that work). State which base you chose and why in your final report.

Create and check out branch: `mvp-reports-export-rerun-org`.

This file already exists at this path because Claude (Cowork) pre-wrote it before handing off to you — no need to recreate it, but it is currently untracked (sitting on the previous branch's working tree, not yet committed anywhere). Include it in your **first** commit on this new branch alongside whatever the first real implementation checkpoint is (see sequencing below), so the task brief is preserved in this branch's history per this repo's `docs/cursor-prompts/<branch>/task-NN-*.md` convention.

## Non-negotiable constraints

- Frontend-only. Do NOT add or modify backend code, API routes under `apps/web/src/app/api/**`, `packages/db/**`, Docker, real auth, real email, or real Jira/external integration. Where the wireframes gesture at something needing a backend (e.g. shareable export links), implement it as a visibly-disabled control with a "stub — needs backend" label, exactly as the wireframe spec says — never silently drop it, never fake a working version.
- Do NOT touch `RunsScreen.tsx`'s three-pane execution UX (run list · case list · case detail) layout/behaviour, and do NOT touch `/runs/api` (`ApiRunsWorkspace.tsx`) behaviour. You may add menu items/entry points that open new modals/drawers from the run header or "More…" menu, but the underlying execution panes are off-limits.
- Route convention: project-scoped routes are `/:projectKey/testcases` (not `/cases`), `/:projectKey/testruns`, `/:projectKey/plans`, `/:projectKey/reports`. Admin routes (`/admin/*`) are global and separate — do not merge them into project navigation.
- Persistence: client-side only, via `FreshProvider` + `localStorage` (`relay-demo-v2`). Any new/changed state shape requires bumping `DEMO_SCHEMA_VERSION` in `demo-model.ts` and adding a corresponding migration block in `migrate-demo-state.ts`, following the exact existing pattern (`if (state.schemaVersion < N) { ...; schemaVersion: N }`). Current version is 14 — your changes should land as v15 (or higher if you split into multiple bumps; document exactly what changed at each version in `handoff.md`).
- No new state-management libraries. Extend `FreshProvider`'s existing reducer/action pattern (tagged union `FreshAction`, `useCallback`-wrapped context methods, `persistState` after every dispatch) rather than introducing anything parallel.
- Do not create commits under the wrong git identity. Before your first commit, run `git config user.name && git config user.email` and state the result. This work is being done on behalf of Noel Quadri. Unless the ambient config already correctly shows his identity, override **per commit only** via env vars — do not run `git config` to change the persistent default:
  ```
  GIT_AUTHOR_NAME='Noel Quadri' GIT_AUTHOR_EMAIL='56097048+qhedroid@users.noreply.github.com' GIT_COMMITTER_NAME='Noel Quadri' GIT_COMMITTER_EMAIL='56097048+qhedroid@users.noreply.github.com' git commit -m "..."
  ```
  Verify after every commit with `git log -1 --format='author=%an <%ae>%ncommitter=%cn <%ce>'` and include that output in your final report.
- Do NOT push, do NOT open a pull/merge request, do NOT merge into any other branch. Stop after local commits + your final report. This is explicitly gated — pushing/merging requires separate human approval that has not been given yet.
- Do not run `pnpm db:migrate` or touch anything requiring Docker/MySQL.

## Commit message format (mandatory, from CLAUDE.md)

Subject: `<Scope>: <short imperative summary>` (≤72 chars, sentence case, no trailing period).
Body: group bullets by file — each file's name on its own line in backticks, followed by bullet points describing what changed in natural language ("Added X", "Replaced Y with Z", "Fixed N" — not terse noun phrases). Name components, functions, actions, behaviours specifically. Commit at logical checkpoints — e.g. one commit per area (A/B/C/D below) is preferable to one giant commit, so the history is reviewable.

## What already exists in this codebase — verified facts, do not re-derive these, use them as your starting point

### A. Reporting & Analytics

- Nav item is a dead placeholder: `apps/web/src/fresh/components/FreshShell.tsx` lines ~72-76 renders a "Reports" link with a "Planned" badge.
- Route `apps/web/src/app/(app)/[projectKey]/reports/page.tsx` currently renders `<PlaceholderScreen title="Reports" ... futureApis={['GET /api/reports', 'GET /api/reports/execution-summary']} />` — replace this page's contents entirely with a real implementation; remove the "Planned" badge from the nav link once done.
- Route key `reports: 'reports'` already defined in `apps/web/src/fresh/lib/project-routes.ts` line ~15.
- Reuse `apps/web/src/fresh/components/RunDonut.tsx` (props: `pass`, `fail`, `blocked`, `notrun`, `skipped`, `size`, `showCompleteLabel`, `interactive`) and the KPI-card markup pattern from `apps/web/src/fresh/screens/DashboardScreen.tsx` lines ~148-191 (`.mc` metric-card CSS classes: `.c-blue`, `.c-green`, `.c-red`, `.c-amber`, `.c-grey`) so the new Reports page reads as the same product as the Dashboard, not a new visual language.
- All chart/trend data must be computed client-side from existing `runs`/`executions`/`executionLog` state already in `FreshProvider` — no new persisted historical snapshots needed for v1; if you need to fabricate a few sprints of trend data for realistic demo purposes, generate it deterministically from existing seed data (e.g. derive per-sprint buckets from `createdAt`/`executionLog` timestamps) rather than hardcoding fake numbers that don't reconcile with the rest of the demo dataset.

**Spec (wireframe WF-A1 "Reports — Overview"):** one control bar drives every widget on the page: Scope dropdown (project / module / plan / single run — reuse the existing plan-query-group selector hierarchy), Range dropdown (e.g. "Last 6 sprints"), and a "Compare vs previous sprint" checkbox that adds delta chips to KPIs and a Δ column to tables. Below the control bar: a KPI strip (Pass rate, Run coverage, Open failures, Blocked, Avg. cases run/day — each with a delta subtext like "▲ 6.1 pp vs Sprint 43"), two charts side by side (pass-rate-by-sprint line chart with a coverage overlay; failures-by-module-per-sprint stacked bar chart, clickable per segment), and a lower row with a Run Summaries table (Run / Plan / P·F·B·NR / Pass % / Δ vs prev / Status) and a Top Failing Cases table (Case / Fails / Last 5 sparkline / Defect). "Save as report" stores the control-bar state as a named view in localStorage and lists it in the left rail under Reports. "Export" opens the shared export drawer (area B) pre-scoped to the current report state.

**Spec (wireframe WF-A2 "Drill-down state"):** clicking any chart segment/point replaces the lower tables with a case-level failure list, expressed as removable filter chips (e.g. "Sprint 44 ✕", "Module: eTMF ✕", "Result: Failed ✕") rather than a page navigation — same mental model as the existing case-table filter bar. Rows in the drill-down table keep a "Link defect" action so this is a working surface, not a read-only dead end.

### B. Export & Reporting

- Three confirmed dead export controls, currently rendered with no `onClick` at all:
  - `apps/web/src/fresh/screens/DashboardScreen.tsx` line ~148: `<button type="button" className="btn"><i className="ti ti-download" .../> Export</button>`
  - `apps/web/src/fresh/screens/AuditScreen.tsx` lines ~72-74: same pattern.
  - `apps/web/src/fresh/components/TestRunsTopbar.tsx` lines ~117-118: `<button ... disabled={!hasRun}>Export test run as CSV</button>` and `...as Excel</button>` inside the run "More…" menu (lines ~100-129).
- Fix all three to open one shared export drawer/modal component (new — e.g. `apps/web/src/fresh/components/ExportDrawer.tsx`).

**Spec (wireframe WF-B1 "Export drawer"):** Scope section with three radio options, always the same trio regardless of entry point: the whole object (e.g. "This test run — 00001 CTMS Regression (132 cases)"), the current filter (e.g. "Current filter — Failed + Blocked (31 cases)"), or the current selection (e.g. "Selected cases (0)"). Format section: segmented control PDF report / Excel / CSV. Contents section: checkboxes mapping 1:1 to sections of the generated file (Run summary; Per-case results; Step-level detail & comments — off by default; Linked defects; Requirements traceability; Audit trail for this run). Preset dropdown (e.g. "Release sign-off pack") that sets format+contents together, still editable after. A visibly-disabled row: "Also create shareable link (expires 30 days) — stub, needs backend". Footer: Cancel / Generate export.

**Spec (wireframe WF-B2 "After Generate export"):** must always produce a real, visible artifact — never silence. On completion: a toast ("Export ready — run-00001-signoff.pdf (0.4 MB)" with Download / Open exports actions). An "Exports (this browser)" history table (new panel, under Reports) listing Artifact / Scope / Created / Status / action, with Download for Ready items and Re-generate for Expired items (prototype artifacts live in localStorage/blob URLs and expire on reload — state this honestly in the UI copy, don't pretend permanence).

In this prototype, generate real files client-side: real CSV via `Blob`/`URL.createObjectURL`. For "PDF"/"Excel" format selections, it's acceptable to generate a CSV or a simple print-friendly HTML document under the hood — but label what you actually produced honestly in the UI/toast copy rather than claiming a binary PDF/XLSX you haven't actually built. Do not leave any path silently doing nothing.

### C. Re-Run Management

- "Duplicate test run" already fully works: handler `handleDuplicate` in `apps/web/src/fresh/screens/RunsScreen.tsx` (~lines 182-186), menu item in `TestRunsTopbar.tsx` (~lines 109-111), reducer case `DUPLICATE_RUN` in `FreshProvider.tsx` (~lines 483-510), context method `duplicateRun` (~lines 869-879). It copies `caseOrder` and clears `executions`/`executionLog` — it does NOT filter by result and has NO lineage tracking.
- `DemoRun` type (`demo-model.ts` ~lines 179-196) has no `rerunOf` field. Add one (e.g. `rerunOf?: string /* run id */`) as part of your schema bump.

**Spec (wireframe WF-C1 "Create re-run modal"):** entry points: run header "More…" menu ("Create re-run…") and a close-run confirmation dialog (doesn't currently exist — add a confirmation step to the existing seal/close action in `RunsScreen.tsx` `handleSealToggle`, ~lines 176-180: "Close test run 00001? 24 failed and 7 blocked cases will remain in this result set." with three actions: "Close run" / "Close & create re-run (31)…" / "Cancel"). The re-run modal shows: source result chips (Passed/Failed/Blocked/Not run counts), a "Cases to include" radio group with live counts (Failed only / Failed + Blocked / Everything except Passed / Custom selection… — reuse the existing "+ Add cases" picker from run creation for custom selection), an Assignment choice (keep original assignees / reassign all to X), an auto-generated editable Name (e.g. "CTMS Regression — Sprint 44 · Re-run 1"), and a callout stating the source run stays closed/untouched and results are never overwritten. Footer: Cancel / "Create re-run (N cases)".

**Spec (wireframe WF-C2 "Run lineage"):** (a) a chain strip in the run summary card's Details tab showing origin → re-run generations as connected nodes with per-generation pass/fail deltas (e.g. "00001 · origin: 24F·7B → 00004 · Re-run 1: 24→6F → 00006 · Re-run 2 (this run): 6→1F"), computable from existing execution data plus your new `rerunOf` pointer. (b) the runs list groups re-run chains under their origin run as nested/indented rows (with an expand/collapse control on the origin row) rather than listing re-runs as independent top-level runs — this keeps run counts in Reports (area A) honest; a chain should count as one logical regression by default.

### D. Test Case Organization

- Bulk-select bar exists and is state-wired (`selectedIds` state, `CasesScreen.tsx` ~line 238) but its buttons (Add to run / Clone / Move / Assign / Archive) at ~lines 875-885 have NO onClick handlers except "Clear". Wire these up for real (Move/Copy should open the same dialog as below; Clone/Assign/Add-to-run/Archive should perform real state updates via new or existing `FreshProvider` actions).
- Row context menu already has "Copy to…" and "Move to…" items (~lines 1140-1151) but they currently just `alert('...coming soon')`. Replace with a real Move/Copy dialog.
- `Folder` type (`demo-model.ts` ~lines 90-95) has `id`, `projectId`, `name`, `parentId` but no ordering/position field. Add what you need for manual drag-and-drop ordering (e.g. an `order`/`position` number on `Folder` and on cases within a folder) as part of your schema bump.

**Spec (wireframe WF-D1 "Folder tree with drag-and-drop + explicit ordering mode"):** an explicit "Order: Manual ⇅ / By column sort" toggle — manual order persists per folder; column sort is a temporary view, not persisted (this directly answers the design brief's open question about whether ordering should be explicit and visible: yes). Folder tree gets a `⋯` context menu mirroring the case row menu: New subfolder / Rename / Move to… / Copy to… / Archive folder. Case rows show grab handles (`⋮⋮`) only in Manual mode; dragging shows an insertion line at the drop position and highlights the drop target folder; multi-select drag reuses the existing bulk-select state and shows a count badge while dragging. One consistent drag model: rows → folder = move, row → row = reorder, folder → folder = re-nest.

**Spec (wireframe WF-D2 "Move / Copy dialog"):** one dialog, mode switch (Move / Copy) at the top — sharing destination and options, since users routinely change their mind mid-flow. Destination: a folder tree showing the current project's folders plus other projects inline (e.g. "CTMS Platform (CT) — other project"), not a separate hidden cross-project feature. Options: checkboxes for "Keep tags", "Keep linked requirements", "Keep run history" (copy-only — history never moves across projects). A warning box: cross-project moves are disabled in this MVP — copy only, because moved cases would receive new project-scoped IDs (e.g. TC-1001 → CT-…) and would drop links to this project's runs; state this before commit, not after. Footer: Cancel / "Move N cases to <destination>" (button label reflects current mode + destination).

## FreshProvider pattern reference (follow exactly)

Action union entries look like `{ type: 'ACTION_NAME'; someId: string; patch?: Partial<X> }`. Reducer cases are `case 'ACTION_NAME': { ... ; next = { ...state, ... }; break }` or early-return style — check both patterns in the file and match whichever the surrounding code already uses for similar actions. Context methods are `useCallback`-wrapped and call `dispatch(...)`. Every state change must flow through `persistState(next)` (this already happens centrally — do not bypass the reducer with direct `localStorage.setItem` calls anywhere in new code). Migration blocks in `migrate-demo-state.ts` follow `if (state.schemaVersion < N) { state = { ...state, ...defaults, schemaVersion: N }; }` — additive and backward-compatible, never destructive to existing fields.

## Implementation sequencing

Work in order: A (Reporting) → B (Export) → C (Re-Run) → D (Test Case Organization). After finishing each area, run `pnpm build` and fix all type errors before starting the next area. Commit after each area passes its build (one commit per area minimum, following the commit message format above). Do not let errors from a later area block you from committing earlier, working areas.

## Documentation updates (mandatory — update alongside code, not after)

- `docs/product/user-guide.md` — add user-facing how-to sections for Reports, Export, Re-Run, and the new Move/Copy/ordering flows.
- `docs/product/feature-flow.md` — add routes, journeys, feature status, and test checklists for all four areas.
- `docs/_authoritative/AS_BUILT_SNAPSHOT.md` — reflect the new actual state (these four areas move from Not Started/In Progress to whatever you actually deliver — be honest, don't mark something Completed if you left a piece stubbed).
- `docs/_authoritative/FRONTEND_CONTRACTS.md` — document the new `DemoRun.rerunOf`, `Folder` ordering field(s), export-history shape, and any new FreshProvider actions/context methods as contracts.
- `docs/claude/handoff.md` — update active branch to `mvp-reports-export-rerun-org`, bump the schema version table, add a "Completed work (this branch)" section listing what you built per area, add the Fable-execution deviation note mentioned at the top of this file, and list known limitations honestly (e.g. PDF export is actually CSV/HTML under the hood, shareable links are stubbed, etc.).

## Smoke test — do this, and report honestly on what you could and couldn't verify

1. Run `pnpm build` — must pass with zero type errors. Include the command output (or a summary + exit code) in your report.
2. Run `pnpm dev`, confirm it boots without a crash, and hit each of the changed/new routes at least once (`/DP/reports`, `/DP/testruns` with the export drawer and re-run modal opened, `/DP/testcases` with the bulk bar and Move/Copy dialog opened, `/admin/audit-log` export) using whatever tooling you actually have access to in your environment.
3. If you have access to any real browser-automation tool (Chrome DevTools protocol, Playwright, a Chrome extension bridge, etc.), use it and capture screenshots. **If you do not have such a tool available, say so explicitly and do not fabricate a "passed browser smoke test" — state plainly in the QA report that build-level and static verification were performed but live in-browser click-through was not, and that a human (or Cursor) should do that pass before this merges.**
4. Write `/tmp/relay-qa-mvp-reports-export-rerun-org/qa-report.md` containing: pass/fail per area, exact commands run with their exit codes, bugs found, known limitations, what could not be verified and why, and push/merge readiness (your honest opinion — this is explicitly NOT going to be pushed by you regardless).

## Final report format (end your work with this, in your response to Noel)

- Base branch chosen and why.
- Branch name and every commit SHA + subject, in order.
- Git identity verification output (`git log -1 --format=...` after your final commit).
- Files changed, grouped by area (A/B/C/D).
- Schema version before → after, and exactly what changed at each version bump.
- Per area: Completed / Partially done / Deliberately stubbed, with reasoning for anything not fully done.
- Any deviation from this spec, and why.
- Explicit confirmation that you did NOT push and did NOT open a PR/merge request.
- Path to the QA report.

Do not push. Do not merge. Wait for review after your final report.
