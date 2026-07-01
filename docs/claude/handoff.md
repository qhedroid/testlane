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
`mvp-test-plans` (rebased onto latest `origin/mvp-main`, which now includes merged PRs #13 `mvp-test-plans` and #14 `mvp-requirements-defects-slice`)

---

## Schema version
**Current: v14**

| Version | What changed | Migration |
|---------|-------------|-----------|
| v14 | Local **Requirement** and **Defect** entities; `requirementsById`, `defectsById`, `Case.requirementIds`, `nextRequirementNumByProject`, `nextDefectNumByProject`; REQ/DEF keys; case requirements create/link; run defects create/link (Failed/Blocked); view-only cross-tabs | v13→v14 seeds empty collections + `requirementIds: []` on cases |
| v13 | Test Plans — `TestPlan`, `TestQuery`, `QueryCondition`, `plansById`, `nextPlanNumByProject`, `resolvePlanCases()`, seed plans | v12→v13 |
| v12 | User/role access MVP | v11→v12 via `migrateUserAccessV12` |

---

## Completed work (this branch — mvp-test-plans, post-rebase)

### Test Plans screen polish — task-03 implemented ✅

`docs/cursor-prompts/mvp-test-plans/task-03-plans-screen-polish.md` — 5 feedback items on `PlansScreen.tsx`, scoped to `PlansScreen.tsx`, `prototype-plans.css`, and `demo-model.ts`:

1. Unfiled cases in Folder Query — `resolvePlanCases()` handles `'__unfiled__'` sentinel; `FolderQueryBody` picker + chip label
2. Hover donut popup on run history `.pl-run-bar` (mirrors `RunsScreen.tsx` case-id tooltip pattern)
3. Test case coverage card replaced with `<RunDonut>` (pass = resolvedCases, notrun = uncovered)
4. Plan detail maximize/minimize (mirrors `CasesScreen.tsx`; reuses `.dp-max-btn` from `fresh.css`)
5. Collapsible plan list sidebar (32px collapsed width)

Schema unchanged (v14). QA evidence: `/tmp/relay-qa-mvp-test-plans/qa-report.md`.

### Test Plans screen follow-up feedback — task-04 drafted ✅ (not yet implemented)

`docs/cursor-prompts/mvp-test-plans/task-04-plans-screen-followup.md` — 3 follow-up items on top of task-03:

1. Coverage donut "not covered" wedge color → `#555556` (adds an optional `notrunColor` prop to `RunDonut.tsx`, defaulting to the existing gray so no other usage is affected)
2. Plan list sidebar: replaced collapsible behavior with resizable, matching Test Cases/Test Runs (fixes a stale `.tp-list-pane` selector in the shared `useResizablePanes.ts` hook that never matched the current `.pl-list-pane` markup)
3. Run history hover popup: swapped bare `<RunDonut>` for `<RunStatusInfographic>` (same component used in the Test Runs Summary section) for interactive per-segment tooltips + status columns; popup now stays open on hover via a delayed-hide timer pattern mirrored from `RunsScreen.tsx`'s `caseIdTooltip`

Scope expanded beyond the original 3 files to include `RunDonut.tsx` and `useResizablePanes.ts` — both small, backward-compatible, additive changes, called out explicitly in the prompt's "Files that will change" section.

---

## Completed work (previous branch — mvp-requirements-defects-slice)

### Requirements & Defects frontend slice ✅ (uncommitted)

| Area | What it delivered |
|------|------------------|
| Data model | `Requirement`, `Defect` types; schema v14; migration; selectors |
| FreshProvider | `createRequirement`, `linkRequirementToCase`, `createDefectFromExecution`, `linkDefectToExecution` |
| Test Cases | Requirements tab: create/link/view; Defects tab: view-only from run links |
| Test Runs | Requirements tab: view-only from case; Defects tab: create/link when Failed/Blocked + unsealed |
| Defects module | Merges local `DEF-*` with static mock list |
| Docs | user-guide, feature-flow, AS_BUILT_SNAPSHOT, DOMAIN_MODEL, FRONTEND_CONTRACTS |

---

## Known limitations (this slice)

- No dedicated Requirements module screen
- No requirement coverage dashboards or traceability matrix
- No external Jira/integration sync
- Admin audit log does not record project-level requirement/defect activity (admin Settings/Data area only)
- Legacy seed `TI-*` strings on executions remain as display-only external refs
- Defects module: create button still disabled; no full CRUD

---

## QA evidence

See `/tmp/relay-qa-mvp-requirements-defects-slice/qa-report.md` after smoke test.

---

## Gotchas

- Workspace folder `Relay-shaun-local` is a zip wrapper; **git repo root** is `Relay/` subdirectory.
- Canonical localStorage key: `relay-demo-v2`
- Defect create/link gated on execution status **Failed** or **Blocked** only
