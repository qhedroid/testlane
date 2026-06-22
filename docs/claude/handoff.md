# Claude Session Handoff

> Read this at the start of every new Claude (Cowork) session on this project.
> Update this file at the end of any session where meaningful work was done.

---

## Claude's role (read this first)
Claude is a **planning and prompt-drafting assistant**. It does not implement changes to project source files.

- Feature work → draft a Cursor agent prompt in `docs/cursor-prompts/`, then hand it to the user to run in Cursor.
- The only files Claude writes freely are `docs/claude/**` and `docs/cursor-prompts/**`.
- All actual code/config changes are made by Cursor agents working from those prompts.
- If explicitly asked to make a specific file change, that's the exception — not the default.

---

## Active branch
`mvp-test-runs` (branched from `mvp-test-cases`)

---

## Schema version
**Current: v9** (v10 pending task-09 execution)

| Version | What changed | Migration |
|---------|-------------|-----------|
| v5 | Baseline before admin panel work | — |
| v6 | Added `activeCustomFieldIds: string[]` and `projectSettings?: ProjectSettings` to `Project` | v5→v6 adds `activeCustomFieldIds: []` to any project missing it |
| v7 | Added `template`, `references`, `summary`, `customFieldValues` to `Case` | v6→v7 backfills new fields with defaults on existing cases |
| v8 | Added `caseKey: string` to `Case`; added `nextCaseNumByProject` to `DemoState` | v7→v8 generates `TC-XXXXX` keys for all existing cases; seeds `nextCaseNumByProject` from existing case counts |
| v9 | Fixed `addCase` to use `newId('case')` — case ids are now globally unique across projects | v8→v9 remaps any case id matching `/^TC-\d{4}$/` to a fresh `newId('case')`; rewrites matching keys in `run.executions` and `run.caseOrder` |
| v10 | Added `resultNotes/testedAt/testedBy` to `CaseExecution`; `executionLog: ExecutionLogEntry[]` to `DemoRun` | v9→v10 adds `executionLog: []` to all runs; backfills missing execution fields with defaults |
| v11 | (pending task-06) Added `createdAt?: string` to `Case` | v10→v11 sets `createdAt = updatedAt` for all existing cases |
| v8 | Added `caseKey: string` to `Case`; added `nextCaseNumByProject` to `DemoState` | v7→v8 generates `TC-XXXXX` keys for all existing cases; seeds `nextCaseNumByProject` from existing case counts |
| v9 | Fixed `addCase` to use `newId('case')` — case ids are now globally unique across projects | v8→v9 remaps any case id matching `/^TC-\d{4}$/` to a fresh `newId('case')`; rewrites matching keys in `run.executions` and `run.caseOrder` |

---

## Completed work (this branch)

### Tasks 01–08 — all complete ✅

Cursor prompts are now organised under `docs/cursor-prompts/mvp-test-cases/`.

| Task | What it delivered | Commit |
|------|------------------|--------|
| Task 01 | Admin panel (`/admin`), `AdminProjectPanel` with 5 tabs, custom fields toggle | `398f45a` + fixups |
| Task 02 | CaseDetail tabs: Attachments, Defects, Requirements, Runs | — |
| Task 03 | `Case` extended with `template`/`references`/`summary`/`customFieldValues`; schema v7 | — |
| Task 03b | Panel resize fix (`start - dx`); min/max 540→720; CSS default 540px | — |
| Task 04 | Row context menu: Duplicate, Edit, Copy to, Move to, Open folder, Delete; `deleteCase` in FreshProvider | — |
| Task 05 | Last Results sparkline (status dot + 5 bars), Filter panel (field+operator+value, AND logic) | — |
| Task 06 | `TC-XXXXX` case IDs (schema v8, `nextCaseNumByProject`), pagination footer, folder search | — |
| Task 07 | CaseDetail metadata reorder, navigation arrows (← →), sparkline tooltip (per-cell), URL sync via `testCasePath`/`parseTestCaseKey` + new `[caseKey]/page.tsx` route | `b8f5c8a` |
| Task 07b | Panel flash fix (`window.history.replaceState`), folder default in CreateCaseModal, per-bar sparkline tooltips with hover-delay dismiss, arrow key navigation | — |
| Task 07c | Case ID collision fix across projects; schema v9 migration (remaps legacy `TC-NNNN` ids to globally-unique ids) | `0a248a5` |
| Task 07d | Project switch reversion race fix in `ProjectRouteSync` (removed `state.activeProjectId` from effect deps, reads via ref instead) | `d6a163e` |
| Task 08 | Keyword search bar in tc-bar; "Create test run" dropdown with folder-scope and all-cases options; name modal with Enter/Escape; navigates to `/runs` on create | `8c7ac23` |

### Tasks 01–02 — Complete ✅

| Task | What it delivered | Commit |
|------|------------------|--------|
| Task 01 | Schema v10, `ExecutionLogEntry`, `CaseExecution.resultNotes/testedAt/testedBy`, `DemoRun.executionLog`, `UPDATE_RUN` + `editRun()`, route `/testruns/tr/[runKey]/tc/[caseKey]/page.tsx`, `testRunCasePath()` + `parseTestRunCaseKey()` | `b7a7b5b` |
| Task 02 | RunsScreen overhaul: caseKey display, URL sync, folder grouping, status-click filter, rich filter panel, team summary, result notes, History tab, EditRunModal | — |

### Tasks 03–07 — Feedback fixes (drafted, not yet executed)

| Task | What it will deliver |
|------|---------------------|
| Task 03 | URL format: rename slug `cases`→`testcases`, add `caseKeyToSlug`/`slugToCaseKey` helpers, strip `TC-` prefix from case URL segments |
| Task 04 | Tab restructure: remove Activity tab, merge Steps into Details, arrow key navigation (↑↓), scrollable `CreateCaseModal` |
| Task 05 | Run management: auto-open first/last run, Testiny-style empty-run state, `CreateRunModal` creates empty runs, no-cases guards, navigate to new run after creation |
| Task 06 | Schema v11: `Case.createdAt`; Testiny-style sparkline tooltip (link to run); case ID hover tooltip in runs (link to test case, created/modified) |
| Task 07 | Add cases to run: `ADD_CASES_TO_RUN` action, `AddCasesToRunModal` (searchable, folder-grouped, checkboxes), "+ Add cases" button in RunsScreen |

**Run in order: 03 → 04 → 05 → 06 → 07.**

### Pending Cursor prompts (not yet executed)

Tasks 03–07 above.

### Task 07c / 07d — pending bug fixes

After Task 07b ran, two additional bugs were found:

**Edit/save creates duplicate case (07c)** — `addCase` in `FreshProvider` uses `nextCaseId(num)` which returns `TC-${1000+num}`. Every new project starts at counter 1, so all projects generate `TC-1001`, `TC-1002`, etc. `REPLACE_CASE` matches across all projects by id, corrupting cases from other projects and producing duplicate ids in `activeCases`. Fix: use `newId('case')` in `addCase`; add schema v9 migration to remap existing collision-prone ids. Addressed in `task-07c`.

**Project switch flicker / first attempt stays on P1 (07d)** — `ProjectRouteSync` includes `state.activeProjectId` in its effect deps. When `handleSelect` calls `setActiveProject(P2)` + `router.push('/P2/cases')`, the state change fires the effect immediately while `usePathname()` still reads `/P1/cases`. The effect sees URL=P1 vs state=P2 and calls `setActiveProject(P1)` — reverting the state. The reversion then causes `CasesScreen`'s URL sync effect to call `window.history.replaceState('/P1/cases')` mid-navigation, which aborts the `router.push` in Next.js 15. Fix: remove `state.activeProjectId` from the effect deps; read it via a ref instead. Addressed in `task-07d`.

---

## Key decisions (do not revisit without good reason)

- **"Type" is a built-in Case field, not a custom field.** Do not add it to `adminSettings.customFields` seed data. The DP project's `activeCustomFieldIds` seeds Priority, References, and Is Automated only.
- **Panel opens maximized by default.** `AdminProjectPanel` initialises `isMaximized: true` when `selectedProjectId` is set.
- **One Cursor agent per task.** Each prompt has a "Context from previous task" section for fresh agents. Remove that section when continuing with the same agent.
- **Always run `pnpm build` before committing.** Zero TS errors required.
- **Dev server restart command:** `cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev`
- **Commit after each task** as a checkpoint for easy rollback.
- **Committing doc changes** — after providing a commit message for `docs/claude/**` or `docs/cursor-prompts/**` edits, always offer to run the commit directly. Append `Co-authored-by: Claude <claude@anthropic.com>` to the message body.
- **No backend work.** If a task appears to require it, stop and ask for confirmation.

---

## Gotchas encountered

- **Git amend broke the merge commit** when run from the sandbox (set the wrong committer, caused 57 files to appear unstaged). Fix: `git reset --hard origin/mvp-main` from the user's terminal, then re-amend with the correct `GIT_COMMITTER_NAME` env var.
- **`.git/HEAD.lock`** blocked amend from the sandbox — user had to remove it manually from their terminal.
- **`adminSettings` is not in the default `useFresh()` destructure** in CasesScreen — fixed in Task 03; it is now destructured there.
- **Case detail panel drag direction**: right-anchored panels need `start - dx` not `start + dx` — covered in task-03b prompt.
- **`formatRunKey` exists in `demo-model.ts`** — Task 06's `formatCaseKey` should follow the exact same pattern and live next to it.
- **`router.replace` across different page files causes full remount** — `/cases` and `/cases/tc/[caseKey]` are backed by different `page.tsx` files. Any `router.replace` between them remounts the component. Always use `window.history.replaceState` for in-component URL updates that should not trigger navigation. `ProjectRouteSync` still uses `router.replace` correctly for the unknown-project redirect case.
- **`window.history.replaceState` during an in-flight `router.push` aborts it** (Next.js 15) — This is why the CasesScreen URL sync effect (which calls `window.history.replaceState`) must not fire with stale project data during a project switch. Fixed in task-07d by preventing `ProjectRouteSync` from reverting state mid-navigation.
- **`ProjectRouteSync` must not depend on `state.activeProjectId`** — Adding it to deps causes the effect to fire when the switcher dispatches `setActiveProject`, while `pathname` still reads the old URL, creating a reversion race. Use a ref to read the latest value without triggering re-runs.
- **`CreateCaseModal` is always mounted** (returns `null` when closed, not unmounted). `useState` initialises only once. Use a `useEffect` watching `createCaseOpen` to reset field values each time the modal opens.

---

## Reference: seed data (DP project)

- Project ID: `proj-ti-core`, key: `DP`
- `activeCustomFieldIds`: `['admin-cf-priority', 'admin-cf-references', 'admin-cf-automated']`
- Custom field names: Priority (Text), References (Multi-Line Text), Is Automated (Boolean)

---

## What to do at the start of a new session

1. Read this file.
2. Ask the user which task Cursor has just finished (or is about to start) to calibrate the current state.
3. Update the "Completed work" and "Schema version" sections if tasks have been executed since this was last written.
