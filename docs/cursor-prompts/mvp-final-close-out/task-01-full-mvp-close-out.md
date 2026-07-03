# Task 01 — Full frontend MVP close-out (14 areas) — final GitHub milestone before full-stack rebuild

**Supersedes:** `docs/cursor-prompts/mvp-reports-export-rerun-org/task-01-fable-build-all-four-areas.md` (areas A–D below are that draft, reproduced verbatim; areas E–N are new, added 2026-07-03 after Noel expanded scope from "4 areas" to "close every remaining frontend-feasible gap in the MVP tracker"). Leave the superseded file in place for history — do not delete it.

**Purpose of this branch:** this is the final frontend-only milestone before the repo is handed to Noel and Shaun for review. Once both approve what lands here, the project moves to a full-stack rebuild against the target specification, in a separate company GitLab repo — this GitHub repo and branch are not that rebuild. Nothing here should be read as "production" work; it is the last, most complete version of the prototype.

**Executed by:** a Claude coding agent running the Fable model, in a new chat pointed at this same connected folder — not Cursor, and not the standard Claude(Cowork)-plans/Cursor-implements workflow. This is a deliberate, explicit deviation for this branch only, approved by the project owner (Noel Quadri), re-confirmed for this expanded scope on 2026-07-03. Note this fact again in `docs/claude/handoff.md` when you update it.

You are implementing frontend feature slices directly in the Relay codebase — this is a real coding task, not a design/wireframe exercise. Write actual working TypeScript/React code, run real builds, make real git commits on a real branch in this repo.

Relay is a QA/CTMS test-management frontend (Next.js App Router, React, pnpm workspaces, TypeScript). This is a frontend-only prototype phase: persistence is client-side only via a React context store (`FreshProvider`) backed by `localStorage`, key `relay-demo-v2`. There is no real backend wired to the UI (a `packages/db` exists but is out of scope — do not touch it).

**Scale warning (read before starting):** this is 14 feature areas in one brief. Do not try to do this in one uninterrupted pass with a single report at the very end. Checkpoint your findings and progress in `docs/claude/handoff.md` after every 3–4 areas (not just commits — an actual written update), so that if this session is interrupted, the next session (human or agent) can see exactly what's done, what's mid-flight, and what hasn't started. Commit after every area regardless.

## Step 0 — read these files first, in this order, before writing any code

1. `CLAUDE.md` (repo root) — the authoritative project rules for this codebase. Follow it exactly, including the commit message format and the mandatory git commit identity procedure (see below — do not skip this).
2. `.cursor/rules.md` and `.cursor/rules/relay-core.mdc`, `.cursor/rules/relay-web.mdc` — same rules, Cursor-facing phrasing, contains canonical file paths.
3. `docs/_authoritative/README.md`, `docs/_authoritative/AS_BUILT_SNAPSHOT.md`, `docs/_authoritative/DOMAIN_MODEL.md`, `docs/_authoritative/FRONTEND_CONTRACTS.md` — source of truth for current data model and contracts. Note: some of these docs are known to be stale in places (e.g. `AS_BUILT_SNAPSHOT.md`'s "Not built" table says "Requirements | Not modeled", which is out of date — the requirements/defects slice already merged into `mvp-main`). Repo code wins over docs; flag any other stale doc you find rather than trusting it blindly.
4. `docs/product/user-guide.md`, `docs/product/feature-flow.md` — living docs you must update.
5. `docs/claude/handoff.md` — current active branch, current schema version (v14 as of this writing), recent work log.
6. `docs/tracker/TI-TMT MVP Tracker 2.xlsx` — the MVP feature tracker this whole task is scoped against. Single sheet `MVP Tracker`, columns A–E (Functional Area / Feature-Requirement / Assignee / Status / Evidence), forward-fill blank Functional Area cells from the row above. This task targets every row still `Not Started` or `In Progress` that is achievable frontend-only; rows requiring real auth, real external integrations, or backend persistence are explicitly out of scope (see Non-negotiable constraints).
7. `apps/web/src/fresh/data/FreshProvider.tsx`, `apps/web/src/fresh/data/demo-model.ts`, `apps/web/src/fresh/data/migrate-demo-state.ts`, `apps/web/src/fresh/data/project-selectors.ts` — the store, types, and migration pattern you must extend, not replace.

## Step 1 — branch setup

Run `git fetch origin`. Check `git log --oneline -5 origin/mvp-main`. Branch from the most current integration point — prefer `origin/mvp-main` if it's the latest merged state. State which base you chose and why in your final report.

Create and check out branch: `mvp-final-close-out`.

This file already exists at this path because Claude (Cowork) pre-wrote it — no need to recreate it, but it is currently untracked. Include it in your **first** commit on this new branch alongside whatever the first real implementation checkpoint is, so the task brief is preserved in this branch's history per this repo's `docs/cursor-prompts/<branch>/task-NN-*.md` convention.

## Non-negotiable constraints

- Frontend-only. Do NOT add or modify backend code, API routes under `apps/web/src/app/api/**`, `packages/db/**`, Docker, real auth, real email, or real Jira/external integration. Where a spec below gestures at something needing a backend (shareable export links, real cron for scheduled runs, real SSO), implement it as a visibly-disabled control or clearly-labelled simulation with a "stub — needs backend" / "simulated — no real background job" label — never silently drop it, never fake a working version.
- Do NOT touch `RunsScreen.tsx`'s three-pane execution UX (run list · case list · case detail) layout/behaviour, and do NOT touch `/runs/api` (`ApiRunsWorkspace.tsx`) behaviour. You may add menu items/entry points that open new modals/drawers/tabs, but the underlying execution panes are off-limits.
- Route convention: project-scoped routes are `/:projectKey/testcases` (not `/cases`), `/:projectKey/testruns`, `/:projectKey/plans`, `/:projectKey/reports`, `/:projectKey/settings`. Admin routes (`/admin/*`) are global and separate — do not merge them into project navigation, and do not duplicate admin-only functionality (e.g. org-wide user management) into project-scoped screens.
- Explicitly out of scope regardless of tracker status: real user authentication, real access control/SSO, integration-based requirement synchronization with an external tool, defect integration with external tools (Jira etc.). These tracker rows stay `Not Started` — do not attempt frontend theatre that implies real integration exists.
- Persistence: client-side only, via `FreshProvider` + `localStorage` (`relay-demo-v2`). Any new/changed state shape requires bumping `DEMO_SCHEMA_VERSION` in `demo-model.ts` and adding a corresponding migration block in `migrate-demo-state.ts`, following the exact existing pattern (`if (state.schemaVersion < N) { ...; schemaVersion: N }`). Current version is 14. You will likely need several sequential bumps across 14 areas (v15, v16, …) — bump once per area that actually changes state shape, not once at the end; document exactly what changed at each version in `handoff.md`. Areas that only add UI/behaviour on top of already-existing fields (there are a few — noted per-area below) do not need a bump.
- No new state-management libraries. Extend `FreshProvider`'s existing reducer/action pattern (tagged union `FreshAction`, `useCallback`-wrapped context methods, `persistState` after every dispatch) rather than introducing anything parallel.
- Do not create commits under the wrong git identity. Before your first commit, run `git config user.name && git config user.email` and state the result. This work is being done on behalf of Noel Quadri. Unless the ambient config already correctly shows his identity, override **per commit only** via env vars — do not run `git config` to change the persistent default:
  ```
  GIT_AUTHOR_NAME='Noel Quadri' GIT_AUTHOR_EMAIL='56097048+qhedroid@users.noreply.github.com' GIT_COMMITTER_NAME='Noel Quadri' GIT_COMMITTER_EMAIL='56097048+qhedroid@users.noreply.github.com' git commit -m "..."
  ```
  Verify after every commit with `git log -1 --format='author=%an <%ae>%ncommitter=%cn <%ce>'` and include that output in your final report.
- Do NOT push, do NOT open a pull/merge request, do NOT merge into any other branch. Stop after local commits + your final report. This is explicitly gated — pushing/merging requires separate human approval (both Noel and Shaun) that has not been given yet.
- Do not run `pnpm db:migrate` or touch anything requiring Docker/MySQL.

## Commit message format (mandatory, from CLAUDE.md)

Subject: `<Scope>: <short imperative summary>` (≤72 chars, sentence case, no trailing period).
Body: group bullets by file — each file's name on its own line in backticks, followed by bullet points describing what changed in natural language ("Added X", "Replaced Y with Z", "Fixed N" — not terse noun phrases). Name components, functions, actions, behaviours specifically. Commit at logical checkpoints — one commit per area (A through N) is required, not optional, so the history is reviewable and partial progress is never lost in one giant diff.

## FreshProvider pattern reference (follow exactly)

Action union entries look like `{ type: 'ACTION_NAME'; someId: string; patch?: Partial<X> }`. Reducer cases are `case 'ACTION_NAME': { ... ; next = { ...state, ... }; break }` or early-return style — check both patterns in the file and match whichever the surrounding code already uses for similar actions. Context methods are `useCallback`-wrapped and call `dispatch(...)`. Every state change must flow through `persistState(next)` (this already happens centrally — do not bypass the reducer with direct `localStorage.setItem` calls anywhere in new code). Migration blocks in `migrate-demo-state.ts` follow `if (state.schemaVersion < N) { state = { ...state, ...defaults, schemaVersion: N }; }` — additive and backward-compatible, never destructive to existing fields.

---

## What already exists in this codebase — verified facts, do not re-derive these, use them as your starting point

### A. Reporting & Analytics

- Nav item is a dead placeholder: `apps/web/src/fresh/components/FreshShell.tsx` lines ~72-76 renders a "Reports" link with a "Planned" badge.
- Route `apps/web/src/app/(app)/[projectKey]/reports/page.tsx` currently renders `<PlaceholderScreen title="Reports" ... futureApis={['GET /api/reports', 'GET /api/reports/execution-summary']} />` — replace this page's contents entirely with a real implementation; remove the "Planned" badge from the nav link once done.
- Route key `reports: 'reports'` already defined in `apps/web/src/fresh/lib/project-routes.ts` line ~15.
- Reuse `apps/web/src/fresh/components/RunDonut.tsx` (props: `pass`, `fail`, `blocked`, `notrun`, `skipped`, `size`, `showCompleteLabel`, `interactive`) and the KPI-card markup pattern from `apps/web/src/fresh/screens/DashboardScreen.tsx` lines ~148-191 (`.mc` metric-card CSS classes: `.c-blue`, `.c-green`, `.c-red`, `.c-amber`, `.c-grey`) so the new Reports page reads as the same product as the Dashboard, not a new visual language.
- All chart/trend data must be computed client-side from existing `runs`/`executions`/`executionLog` state already in `FreshProvider` — no new persisted historical snapshots needed for v1; if you need to fabricate a few sprints of trend data for realistic demo purposes, generate it deterministically from existing seed data rather than hardcoding fake numbers that don't reconcile with the rest of the demo dataset.

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

**Relates to area I (Archived test results)** — the export history table and archived-runs view are separate surfaces; don't conflate them, but reuse the same table/panel visual pattern.

### C. Re-Run Management

- "Duplicate test run" already fully works: handler `handleDuplicate` in `apps/web/src/fresh/screens/RunsScreen.tsx` (~lines 182-186), menu item in `TestRunsTopbar.tsx` (~lines 109-111), reducer case `DUPLICATE_RUN` in `FreshProvider.tsx` (~lines 483-510), context method `duplicateRun` (~lines 869-879). It copies `caseOrder` and clears `executions`/`executionLog` — it does NOT filter by result and has NO lineage tracking.
- `DemoRun` type (`demo-model.ts` ~lines 179-196) has no `rerunOf` field. Add one (e.g. `rerunOf?: string /* run id */`) as part of your schema bump.

**Spec (wireframe WF-C1 "Create re-run modal"):** entry points: run header "More…" menu ("Create re-run…") and a close-run confirmation dialog (doesn't currently exist — add a confirmation step to the existing seal/close action in `RunsScreen.tsx` `handleSealToggle`, ~lines 176-180: "Close test run 00001? 24 failed and 7 blocked cases will remain in this result set." with three actions: "Close run" / "Close & create re-run (31)…" / "Cancel"). The re-run modal shows: source result chips (Passed/Failed/Blocked/Not run counts), a "Cases to include" radio group with live counts (Failed only / Failed + Blocked / Everything except Passed / Custom selection… — reuse the existing "+ Add cases" picker from run creation for custom selection), an Assignment choice (keep original assignees / reassign all to X), an auto-generated editable Name (e.g. "CTMS Regression — Sprint 44 · Re-run 1"), and a callout stating the source run stays closed/untouched and results are never overwritten. Footer: Cancel / "Create re-run (N cases)".

**Spec (wireframe WF-C2 "Run lineage"):** (a) a chain strip in the run summary card's Details tab showing origin → re-run generations as connected nodes with per-generation pass/fail deltas (e.g. "00001 · origin: 24F·7B → 00004 · Re-run 1: 24→6F → 00006 · Re-run 2 (this run): 6→1F"), computable from existing execution data plus your new `rerunOf` pointer. (b) the runs list groups re-run chains under their origin run as nested/indented rows (with an expand/collapse control on the origin row) rather than listing re-runs as independent top-level runs — this keeps run counts in Reports (area A) honest; a chain should count as one logical regression by default.

### D. Test Case Organization

- Bulk-select bar exists and is state-wired (`selectedIds` state, `CasesScreen.tsx` ~line 238) but its buttons (Add to run / Clone / Move / Assign / Archive) at ~lines 875-885 have NO onClick handlers except "Clear". Wire these up for real (Move/Copy should open the same dialog as below; Clone/Assign/Add-to-run/Archive should perform real state updates via new or existing `FreshProvider` actions).
- Row context menu already has "Copy to…" and "Move to…" items (~lines 1140-1151) but they currently just `alert('...coming soon')`. Replace with a real Move/Copy dialog.
- `Folder` type (`demo-model.ts` ~lines 90-95) has `id`, `projectId`, `name`, `parentId` but no ordering/position field. Add what you need for manual drag-and-drop ordering (e.g. an `order`/`position` number on `Folder` and on cases within a folder) as part of your schema bump.

**Spec (wireframe WF-D1 "Folder tree with drag-and-drop + explicit ordering mode"):** an explicit "Order: Manual ⇅ / By column sort" toggle — manual order persists per folder; column sort is a temporary view, not persisted. Folder tree gets a `⋯` context menu mirroring the case row menu: New subfolder / Rename / Move to… / Copy to… / Archive folder. Case rows show grab handles (`⋮⋮`) only in Manual mode; dragging shows an insertion line at the drop position and highlights the drop target folder; multi-select drag reuses the existing bulk-select state and shows a count badge while dragging. One consistent drag model: rows → folder = move, row → row = reorder, folder → folder = re-nest.

**Spec (wireframe WF-D2 "Move / Copy dialog"):** one dialog, mode switch (Move / Copy) at the top. Destination: a folder tree showing the current project's folders plus other projects inline (e.g. "CTMS Platform (CT) — other project"). Options: checkboxes for "Keep tags", "Keep linked requirements", "Keep run history" (copy-only). A warning box: cross-project moves are disabled in this MVP — copy only, since moved cases would receive new project-scoped IDs and drop links to this project's runs. Footer: Cancel / "Move N cases to <destination>".

### E. Rich text editing (Test Case Management)

- Verified: every long-text field in the app is a plain `<textarea>` — `CreateCaseModal.tsx` (preconditions ~line 137, step action/expected ~188/192), `CasesScreen.tsx` detail-panel edit mode (preconditions ~line 1733, step action/expected ~1746-1747, summary ~1910). No markdown rendering, no WYSIWYG toolbar, no rich text anywhere in `apps/web/src/fresh` (confirmed by grep — zero matches for rich-text/contentEditable/markdown patterns outside plain textareas).
- Requirement/Defect `description` fields (`demo-model.ts` ~140, ~152) are the same plain-string shape.

**Spec:** Build one reusable `apps/web/src/fresh/components/RichTextField.tsx` supporting a small, deliberately-limited Markdown subset (bold, italic, bullet list, numbered list, inline code, link) with a compact toolbar and an Edit/Preview toggle. Storage format stays a plain string (markdown source) — **no schema type change**, since these fields are already `string`/`string | undefined`. Do not add a heavyweight rich-text editor dependency (no Slate/TipTap/Quill) — implement a minimal parser/renderer inline, or check `package.json` first for anything already installed that's small enough to reuse. Apply to: case `preconditions`/`summary`, step `action`/`expected` (in both `CreateCaseModal.tsx` and `CasesScreen.tsx` edit mode), Requirement `description`, Defect `description`. Every place these fields are displayed read-only today (case detail panel, requirement/defect lists) must render the parsed markdown, not the raw string.
- Schema bump: none. Note this explicitly in your report and in `FRONTEND_CONTRACTS.md` since it's a behaviour change on existing fields, not a shape change.

### F. Test run scheduling (Test Run Management)

- Verified: zero references to scheduling anywhere in `apps/web/src/fresh` (grep confirmed). `DemoRun.due?: string` already exists but is just a manually-set due date at creation, not a recurring/future-spawn mechanism — verify its exact usage in `CreateRunModal.tsx` before building on top of it.

**Spec:** Add "Scheduled runs": a new `ScheduledRun` entity (id, projectId, name, planId, cadence: `'once' | 'daily' | 'weekly' | 'monthly'`, nextRunAt, defaultAssignee?, active: boolean). Entry point: "Schedule this plan…" action from `PlansScreen.tsx` plan detail, plus a "Scheduled runs" panel (new tab on the Plans screen or a small dedicated section) listing upcoming/active schedules with next-fire date, pause/resume, edit, delete. There is no backend cron in this prototype, so firing must be simulated client-side: on app load (or a manual "Check for due runs" button, safer and more honest than silent background firing), any `ScheduledRun` whose `nextRunAt` has passed spawns a new `DemoRun` from the linked plan (reuse the existing plan → run spawn logic from `PlansScreen.tsx`) and advances `nextRunAt` by the cadence. Label this plainly in the UI: "Simulated — runs are created next time you open the app or check manually, not by a real background job."
- Schema bump: new `scheduledRunsById` (and a display-key counter if you want one) on `DemoState`.

### G. Personal work queues (Test Execution)

- Verified: zero references to a "my work"/queue concept anywhere in `apps/web/src/fresh` (grep confirmed). `Case.assignee`, `CaseExecution.assignee`, and the existing demo actor switcher (`currentActorUserId`, already powering admin RBAC) are all already in place, so "assigned to me" filtering is fully data-feasible today with no new entities.

**Spec:** Add a "My Work" view — a new nav entry point (sidebar item or topbar user-menu item in `FreshShell.tsx`) showing every run-case execution in the active project where `execution.assignee === currentActorUserId` (or the equivalent actor-name match already used elsewhere — check exactly how assignee matching works today before assuming IDs vs names line up), grouped by run, with status counts (Not run / Failed / Blocked / Passed) and a "Continue" action that deep-links into `RunsScreen` at that run+case. This is a new read+navigate surface only — do not add any new editing surface, and do not touch `RunsScreen.tsx`'s execution panes.
- Schema bump: none, unless you add a persisted "hide completed" preference (if so, keep it component-local state first; only persist if there's a clear reason to).

### H. Requirement coverage tracking (Requirements Management)

- Verified: `Case.requirementIds?: string[]` (case → requirement link) exists; `listActiveProjectRequirements` exists in `project-selectors.ts` (~line 67); linking UI exists in `CasesScreen.tsx` (~lines 1855-1946, Requirements tab: create/link/view). No selector or UI anywhere computes coverage — zero grep matches for coverage combined with requirement concepts.
- Per project rules, do NOT build a full Requirements Management module or a new dedicated Requirements screen/route — this stays a read-only rollup.

**Spec:** Add a selector (e.g. `resolveRequirementCoverage(state, projectId)` in `project-selectors.ts`) returning, per requirement: linked case count, and of those, how many are Passed/Failed/Blocked/Not-run (via existing `CaseExecution` data), plus a derived status (`Uncovered` / `Covered — not run` / `Covered — passing` / `Covered — has failures`). Surface it in two places: (a) a small coverage badge next to each requirement wherever requirements are already listed (the case-detail Requirements tab), and (b) a "Requirements coverage" card/section inside the new Reports page (area A) — reuse the KPI-card and `RunDonut` patterns rather than inventing new visual language. No new top-level nav item or route.
- Schema bump: none — purely derived from existing data.

### I. Archived test results (Export & Reporting)

- Verified, and unusually far along already: `DemoRun.archivedAt?: string` field, `ARCHIVE_RUN` reducer case (`FreshProvider.tsx` ~510-517), and `archiveRun` context method (declared ~726, implemented ~881, exposed in context value ~1257/1331) all already exist and work at the data layer. `project-selectors.ts` line ~33 already filters archived runs out of the active runs list. But there is **zero UI entry point** anywhere that calls `archiveRun` (confirmed by grep across `RunsScreen.tsx` and `TestRunsTopbar.tsx` — no matches for "archive" at all in either file), and no UI to view or restore an archived run once it's set — today, archiving a run via this action would make it vanish from every screen with no way back.

**Spec:** This is a "wire the last mile" job, not new data modelling. Add "Archive test run" to `TestRunsTopbar.tsx`'s More… menu, enabled only when `sealed === true` (never allow archiving an open run), calling the existing `archiveRun`. Add an "Archived" filter/view to the runs list in `RunsScreen.tsx` (check the existing filter pattern around line ~264, `if (filter !== 'all' && row.status !== filter)`, and extend it consistently) showing archived runs read-only, plus a new "Unarchive" action — add a mirrored `UNARCHIVE_RUN` reducer case and `unarchiveRun` context method that sets `archivedAt: undefined`.
- Schema bump: none for the field itself (already exists); the new action/method is additive to behaviour, not to `DemoState` shape, so it should not need a version bump — but confirm this reasoning holds and say so explicitly in your report rather than assuming.

### J. Test effectiveness analysis & configurable dashboard reporting (Reporting & Analytics)

- Verified: tracker rows "Test effectiveness analysis" and "Dashboard reporting" are both `Not Started` and distinct from "Failure trend analysis"/"Coverage metrics", which area A's new Reports page already covers via the trend chart and coverage overlay. `DashboardScreen.tsx` (~lines 148-191) renders a fixed, non-configurable set of metric cards.

**Spec — two sub-parts:**
(a) **Test effectiveness:** add an "Effectiveness" section to the Reports page (area A) with metrics that are honestly derivable from existing state — do not invent metrics the data model can't support. Reasonable candidates: defects-per-100-cases-executed, flaky-case rate (cases whose last N executions include both a Pass and a Fail), average time-to-first-result per run (from `executionLog` timestamps). If you consider a metric like "escaped defects" (found post-release vs. in-testing) and the data model genuinely can't distinguish that, say so explicitly and leave it out rather than fabricating a number.
(b) **Dashboard reporting:** add a "Customise" mode to `DashboardScreen.tsx` letting the current actor show/hide/reorder the existing metric cards, persisted per actor (new field, e.g. `dashboardLayoutByActor` on `DemoState`). This is about making the existing dashboard configurable, not building new widgets from scratch.
- Schema bump: yes, for the persisted layout preference (part b only).

### K. Saved conditions / saved filters (Search, Filter & Query Management)

- Verified: zero references to a saved-filter/saved-view concept anywhere (grep confirmed). `TestQuery`/`QueryCondition` types already exist and are used today for Plans' dynamic queries (`demo-model.ts` ~lines 100-118) — reuse this shape rather than inventing a new one where the fields overlap. The Test Cases filter panel already works (tracker evidence `testcases-filter-panel.png`).

**Spec:** Add "Save current filter" to the Test Cases filter panel and the Test Runs filter bar. For Test Cases, store as a `TestQuery`-shaped entry where possible. For Test Runs, if the filterable fields don't map cleanly onto `QueryCondition`, define a small parallel `SavedFilter` type rather than forcing a bad fit — use your judgement and document the choice. Saved filters appear in a "Saved" dropdown/section for one-click re-apply, with rename/delete, scoped per project (not global, not per-user, unless you have a strong reason to scope tighter — state your reasoning).
- Schema bump: new `savedFiltersById`/`savedFilters` collection on `DemoState`.

### L. Version management (Audit History / Versioning)

- Verified, and this is the most misleading "In Progress" row in the tracker: `CasesScreen.tsx` `tab === 'history'` (~line 1986) and `tab === 'activity'` (~line 1992) render **entirely hardcoded static JSX** — two literal blocks naming "Nadim Sharif" and "Jamil Khan" with fake timestamps. There is no real edit history, no diff, no restore. The tracker scores this "In Progress" because the tab UI shell exists, not because any real functionality does.

**Spec:** Make it real. On every case edit (the `saveEdit`/`replaceCase` path in `CasesScreen.tsx`), snapshot the pre-edit field values into a new `caseVersionsById: Record<caseId, CaseVersion[]>` collection (fields: id, caseId, editedAt, editedBy — use the current actor — and a diff of changed fields, e.g. `changes: { field: string; from: string; to: string }[]`). Render the History tab from this real data (newest first, one entry per edit, listing exactly what changed), with a "Restore this version" action reverting the case's editable content fields (steps/preconditions/summary/etc. — never identity fields like id/caseKey/projectId) to that snapshot. Cap stored versions per case (e.g. last 50) to bound localStorage growth, and say so in the UI ("Showing last 50 changes"). Decide whether the Activity tab merges into this same real log (recommended — avoid shipping two overlapping mock UIs, one real and one still fake) or gets its own lighter real feed; do not leave either one hardcoded.
- Schema bump: new `caseVersionsById` collection.

### M. User removal (User & Role Management)

- Verified: `AdminUsersPageContent.tsx` only implements Disable (`disableAdminUser`, buttons ~lines 300-325, `statusClass` switch ~lines 23-30) — no delete/remove action exists (grep confirmed, zero hits for remove/delete-user patterns). `rbac.ts` has `FINAL_ADMIN_DISABLE_MESSAGE`/`isFinalEffectiveAdmin` guarding the last effective admin from being disabled; the same guard must extend to removal.

**Spec:** Add a genuine "Remove user" action distinct from Disable — Disable keeps the record and allows re-enabling; Remove permanently deletes the `AdminUser` record from `adminSettings.users`. Gate it behind the same last-admin guard as Disable (reuse `isFinalEffectiveAdmin`, don't duplicate the logic). Require a confirmation modal that's honest about consequences in a prototype with no cascade logic: that user's historical `assignee`/`testedBy`/audit-log references become an orphaned display name — do not attempt to cascade-delete or reassign historical execution records; state this limitation in the confirmation copy and record it in `docs/claude/known-bugs.md` or `handoff.md` as a known limitation, not a bug to silently fix. Add a new reducer action (e.g. `REMOVE_ADMIN_USER`) and, if `disableAdminUser` currently writes an audit-log entry, mirror that pattern for removal too — check before assuming.
- Schema bump: likely none (removing an array entry isn't a shape change) — bump only if you change the audit-log entry shape.

### N. Project-level settings (Project Management)

- Verified, and much further along than the tracker row name suggests: `ProjectSettings` type already exists (`allowReopeningTestRuns`, `allowReopeningMilestones`, `allowEditingTestResults`, `reportLogo`, each a `ProjectPolicyValue` of inherit/unlimited/never/admins_only — `demo-model.ts` ~lines 32-46), with `DEFAULT_PROJECT_SETTINGS`, a working `UPDATE_PROJECT_SETTINGS` reducer case and `updateProjectSettings` context method (`FreshProvider.tsx` ~208, ~710, ~1173-1174), and a full tabbed editing UI (`AdminProjectPanel.tsx` — tabs Details/Settings/Custom fields/Users/Integrations, `POLICY_FIELDS` ~lines 40-44). The catch: this panel only opens from `/admin/projects` (global admin). The project-scoped route `/:projectKey/settings` (`SettingsScreen.tsx`, already fully reviewed) is a static read-only preview with no link into any of this. That gap is exactly why the tracker scores this row "In Progress" rather than "Completed" or "Not Started."

**Spec:** Do not rebuild `ProjectSettings` or `AdminProjectPanel` — reuse them. Add a real, editable "Project settings" section to `SettingsScreen.tsx` for the active project, calling the existing `updateProjectSettings`, showing the same `ProjectSettings` fields. Gate editing behind whatever RBAC check already governs project settings edits in the admin panel (check `rbac.ts`/`useActorRbac` for the correct permission — do not invent a new one); fall back to the current read-only behaviour for actors without that permission. Keep `/admin/projects` as the org-wide surface; this adds the project-scoped counterpart. Do not duplicate the org-wide Users & Roles table into this screen — that stays delegated to `/admin/users`.
- Schema bump: none — `ProjectSettings` already exists and is unchanged.

---

## Implementation sequencing

Work in order: **A (Reporting) → B (Export) → C (Re-Run) → D (Test Case Organization) → E (Rich text) → F (Scheduling) → G (Work queues) → H (Requirement coverage) → I (Archived results) → J (Effectiveness/dashboard) → K (Saved filters) → L (Version management) → M (User removal) → N (Project settings).**

After finishing each area: run `pnpm build` and fix all type errors before starting the next area. Commit after each area passes its build — one commit per area, minimum 14 commits. Do not let errors from a later area block you from committing earlier, working areas. After areas D, H, and N (roughly every 3-4 areas), stop and write an interim update to `docs/claude/handoff.md` reflecting real progress so far, per the scale warning at the top of this file.

## Documentation updates (mandatory — update alongside code, not after)

- `docs/product/user-guide.md` — add user-facing how-to sections for all 14 areas.
- `docs/product/feature-flow.md` — add routes, journeys, feature status, and test checklists for all 14 areas.
- `docs/_authoritative/AS_BUILT_SNAPSHOT.md` — reflect the new actual state; also correct the stale "Requirements | Not modeled" row noted in Step 0 while you're in this file. Be honest about partial delivery — don't mark something Completed if you left a piece stubbed.
- `docs/_authoritative/FRONTEND_CONTRACTS.md` — document every new type, field, reducer action, and context method added across all 14 areas as contracts.
- `docs/claude/handoff.md` — update active branch to `mvp-final-close-out`, bump the schema version table with one row per version increment and exactly what changed, add a "Completed work (this branch)" section per area, keep the Fable-execution deviation note, and list known limitations honestly (PDF export is actually CSV/HTML, scheduling is simulated not real cron, user removal doesn't cascade, etc.).
- `docs/claude/known-bugs.md` — log anything you deliberately stubbed or couldn't fully verify, so it isn't lost.

## Smoke test — do this, and report honestly on what you could and couldn't verify

1. Run `pnpm build` — must pass with zero type errors after the final area. Include command output (or a summary + exit code) in your report.
2. Run `pnpm dev`, confirm it boots without a crash, and hit every changed/new route/surface at least once: `/DP/reports` (control bar, drill-down, effectiveness section), `/DP/testruns` (export drawer, re-run modal, close-run confirmation, archive/unarchive, run lineage strip), `/DP/testcases` (bulk bar, Move/Copy dialog, rich text fields, drag-and-drop ordering, saved filters, real history tab), `/DP/plans` (schedule action, scheduled runs panel), `/DP/settings` (real project settings form), `/admin/users` (remove user flow), the new "My Work" entry point, plus the existing core regression routes (`/admin/roles`, `/admin/audit-log`, `/DP/dashboard`).
3. If you have access to any real browser-automation tool (Chrome DevTools protocol, Playwright, a Chrome extension bridge, etc.), use it and capture screenshots. **If you do not have such a tool available, say so explicitly and do not fabricate a "passed browser smoke test" — state plainly what was build-level/static-verified only, and that a human (or Cursor) should do a live click-through pass before this merges.**
4. Write `/tmp/relay-qa-mvp-final-close-out/qa-report.md` containing: pass/fail per area (A–N), exact commands run with exit codes, bugs found, known limitations, what could not be verified and why, and push/merge readiness (your honest opinion — this is explicitly NOT going to be pushed by you regardless).

## Final report format (end your work with this, in your response to Noel)

- Base branch chosen and why.
- Branch name and every commit SHA + subject, in order (expect 14+).
- Git identity verification output (`git log -1 --format=...` after your final commit).
- Files changed, grouped by area (A through N).
- Schema version before → after, and exactly what changed at each version bump (expect several).
- Per area: Completed / Partially done / Deliberately stubbed, with reasoning for anything not fully done.
- Any deviation from this spec, and why.
- Explicit confirmation that you did NOT push and did NOT open a PR/merge request.
- Path to the QA report.
- A note on whether, given the actual size of this task once underway, you'd recommend Noel split any remaining work into a follow-up session rather than force everything into one pass.

Do not push. Do not merge. Wait for review after your final report — from both Noel and Shaun before this goes anywhere near GitHub main history intended as the final MVP milestone.
