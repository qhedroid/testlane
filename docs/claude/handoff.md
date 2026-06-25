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
`mvp-test-plans` (rebased onto `origin/mvp-main` ✅)

---

## Schema version
**Current: v13**

| Version | What changed | Migration |
|---------|-------------|-----------|
| v13 | Test Plans — `TestPlan`, `TestQuery`, `QueryCondition`, `plansById`, `nextPlanNumByProject`, `resolvePlanCases()`, `formatPlanKey()`, `planKeyToSlug()`, `slugToPlanKey()`; seed plans (TP-00001 Smoketest, TP-00002 Full Regression) | v12→v13 introduces `plansById`/`nextPlanNumByProject`; seeds demo plans for demo projects |
| v12 | User/role access MVP: `currentActorUserId`, `AdminUser.firstName/lastName/projectAccess`, statuses (Pending invite, Silent created, Disabled), `AdminRole.permissions`, built-in role set | v11→v12 via `migrateUserAccessV12` |
| v11 | Added `createdAt?: string` to `Case` | v10→v11 sets `createdAt = updatedAt` for all existing cases |

---

## Completed work (this branch — mvp-test-plans)

### Test Plans — Tasks 01–02 complete ✅

| Task | What it delivered | Commit |
|------|------------------|--------|
| Task 01 | Schema v12 (→v13 post-rebase): `TestPlan`, `TestQuery`, `QueryCondition`, `plansById`/`nextPlanNumByProject` on `DemoState`; `formatPlanKey()`/`resolvePlanCases()`/`evaluateCondition()`; FreshProvider CRUD (`ADD_PLAN`, `UPDATE_PLAN`, `DELETE_PLAN`, `DUPLICATE_PLAN`); `spawnRunFromPlan`; PlansScreen full rebuild; prototype-plans.css; `/plans` + `/plans/tp/[planKey]` routes | `b51eace` |
| Task 02 | Test cases tab on PlansScreen: condition query groups (field/operator/value), folder query groups, static case selection, live resolved-case panel | `6bc11ea` |

---

### Previous branches (for historical reference)

#### Tasks 01–08 — all complete ✅ (mvp-test-cases)

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

### User / role access MVP — Complete ✅

| Area | What it delivered |
|------|------------------|
| User management | Full table, invite (silent + pending), edit, disable/reactivate, project access |
| Role management | 7 built-in roles, custom role CRUD, permission matrix |
| Demo actor | Top-bar switcher; RBAC on admin user/role actions |
| Schema v12 | `currentActorUserId`, expanded admin models, migration |

### Tasks 01–07 — Feedback fixes (mvp-test-runs)

| Task | What it delivered | Status |
|------|------------------|--------|
| Task 03 | URL format: `cases`→`testcases` slug, `caseKeyToSlug`/`slugToCaseKey` helpers, `TC-` prefix stripped from URL segments, `/testcases` legacy redirect | ✅ Complete |
| Task 04 | Tab restructure: remove Activity tab, merge Steps into Details, arrow key navigation (↑↓), scrollable `CreateCaseModal` | ✅ Complete |
| Task 05 | Run management: auto-open first/last run, Testiny-style empty-run state, `CreateRunModal` creates empty runs, no-cases guards, navigate to new run after creation | ✅ Complete |
| Task 05b | Fix project-switch flicker: `projectMismatch` guard in RunsScreen (3 effects) and CasesScreen (URL-sync effect) | ✅ Complete (RunsScreen fully fixed; CasesScreen residual flicker deferred — see Known Bugs) |
| Task 06 | Schema v11: `Case.createdAt`; Testiny-style sparkline tooltip (link to run); case ID hover tooltip in runs (link to test case, created/modified) | ✅ Complete |
| Task 07 | `ADD_CASES_TO_RUN` action, `AddCasesToRunModal` (searchable, folder-grouped, checkboxes), "+ Add cases" button in RunsScreen, wired empty-run button | ✅ Complete |
| Task 05 | Run management: auto-open first/last run, Testiny-style empty-run state, `CreateRunModal` creates empty runs, no-cases guards, navigate to new run after creation |
| Task 06 | Schema v11: `Case.createdAt`; Testiny-style sparkline tooltip (link to run); case ID hover tooltip in runs (link to test case, created/modified) | ✅ Complete |
| Task 07 | Add cases to run: `ADD_CASES_TO_RUN` action, `AddCasesToRunModal` (searchable, folder-grouped, checkboxes), "+ Add cases" button in RunsScreen | ✅ Complete |

### Pending

Nothing. Rebase is complete — branch is clean on top of `origin/mvp-main`. Next step is PR.

---

## Key decisions (do not revisit without good reason)

- **"Type" is a built-in Case field, not a custom field.** Do not add it to `adminSettings.customFields` seed data. The DP project's `activeCustomFieldIds` seeds Priority, References, and Is Automated only.
- **Panel opens maximized by default.** `AdminProjectPanel` initialises `isMaximized: true` when `selectedProjectId` is set.
- **One Cursor agent per task.** Each prompt has a "Context from previous task" section for fresh agents. Remove that section when continuing with the same agent.
- **Always run `pnpm build` before committing.** Zero TS errors required.
- **Mandatory post-change smoke test** — after user-visible, route, schema, RBAC, or flow changes: build, dev server, browser smoke test with WebM/screenshots, QA report under `/tmp/relay-qa-<branch>/qa-report.md`. Do not push until reviewed or waived. See `CLAUDE.md` and `docs/product/feature-flow.md`.
- **Dev server restart command:** `cd /Users/shaun.sevume/Projects/Relay && bash scripts/reset-web-dev.sh && pnpm dev`
- **Commit after each task** as a checkpoint for easy rollback.
- **Committing doc changes** — after providing a commit message for `docs/claude/**` or `docs/cursor-prompts/**` edits, always offer to run the commit directly. Append `Co-authored-by: Claude <claude@anthropic.com>` to the message body. The repo has a local git config (`user.name=CrimsonDelta`, `user.email=30307439+CrimsonDelta@users.noreply.github.com`) — do NOT override it with `GIT_AUTHOR_*` or `GIT_COMMITTER_*` env vars; just run `git commit` directly and the local config will be used.
- **No backend work.** If a task appears to require it, stop and ask for confirmation.

---

## Gotchas encountered

- **Git amend broke the merge commit** when run from the sandbox (set the wrong committer, caused 57 files to appear unstaged). Fix: `git reset --hard origin/mvp-main` from the user's terminal, then re-amend. Do not pass `GIT_COMMITTER_NAME` env vars — the repo has a local git config that handles identity correctly.
- **`.git/HEAD.lock`** blocked amend from the sandbox — user had to remove it manually from their terminal. The sandbox cannot `rm` this file; always ask the user to remove it if it appears.
- **Do not override git identity with env vars** — the repo local config sets `user.name=CrimsonDelta` / `user.email=30307439+CrimsonDelta@users.noreply.github.com`. Passing `GIT_AUTHOR_NAME` or `GIT_COMMITTER_NAME` overrides this and causes commits to appear under the wrong author.
- **`adminSettings` is not in the default `useFresh()` destructure** in CasesScreen — fixed in Task 03; it is now destructured there.
- **Case detail panel drag direction**: right-anchored panels need `start - dx` not `start + dx` — covered in task-03b prompt.
- **`formatRunKey` exists in `demo-model.ts`** — Task 06's `formatCaseKey` should follow the exact same pattern and live next to it.
- **`router.replace` across different page files causes full remount** — `/cases` and `/cases/tc/[caseKey]` are backed by different `page.tsx` files. Any `router.replace` between them remounts the component. Always use `window.history.replaceState` for in-component URL updates that should not trigger navigation. `ProjectRouteSync` still uses `router.replace` correctly for the unknown-project redirect case.
- **`window.history.replaceState` during an in-flight `router.push` aborts it** (Next.js 15) — This is why the CasesScreen URL sync effect (which calls `window.history.replaceState`) must not fire with stale project data during a project switch. Fixed in task-07d by preventing `ProjectRouteSync` from reverting state mid-navigation.
- **Project-switch flicker in RunsScreen (task-05b)** — `setActiveProject(P2)` fires synchronously before `router.push` commits. React re-renders with P2 state while `params.runKey` and `pathname` still show P1's run. The unknown-run redirect and auto-open effects both fire in this window, creating racing navigations. Fix: derive `projectMismatch` from `pathname`'s project key vs `activeProject.key`; bail out of all navigation/replaceState effects when they disagree. Same guard added to CasesScreen's URL-sync effect. **Fully fixed in RunsScreen. CasesScreen still has residual flicker (see Known Bugs).**
- **`ProjectRouteSync` must not depend on `state.activeProjectId`** — Adding it to deps causes the effect to fire when the switcher dispatches `setActiveProject`, while `pathname` still reads the old URL, creating a reversion race. Use a ref to read the latest value without triggering re-runs.
- **`CreateCaseModal` is always mounted** (returns `null` when closed, not unmounted). `useState` initialises only once. Use a `useEffect` watching `createCaseOpen` to reset field values each time the modal opens.

---

## Known bugs

See **`docs/claude/known-bugs.md`** for the full investigation log. Summary:

| ID | Screen | Status |
|----|--------|--------|
| BUG-01 | Project switch fails (CasesScreen) | Partially fixed — RunsScreen resolved in task-05b; CasesScreen still flickering |
| BUG-02 | Residual project-switch flicker (CasesScreen) | Deferred — visual only, switch still completes |

---

## Reference: seed data (DP project)

- Project ID: `proj-ti-core`, key: `DP`
- `activeCustomFieldIds`: `['admin-cf-priority', 'admin-cf-references', 'admin-cf-automated']`
- Custom field names: Priority (Text), References (Multi-Line Text), Is Automated (Boolean)

---

## What to do at the start of a new session

1. Read this file.
2. Check the current git state (`git status`, `git log --oneline -5`) to verify the branch and whether the rebase has been completed.
3. If rebase is still pending, follow the steps in "Rebase notes" above.
4. Ask the user which task Cursor has just finished (or is about to start) to calibrate the current state.
5. Update "Completed work" and "Schema version" if tasks have been executed since this was last written.
