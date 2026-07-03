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

This Cowork session itself was on `qa/mvp-tracker-audit-2026-07-02` (2 local commits ahead of `origin/mvp-main`, uncommitted design-review docs also present). No app source was touched from this session — only planning/docs/prompt-drafting, per Claude's role below.

---

## 2026-07-03 — Final MVP close-out: scope decision + super-prompt handoff

Noel asked to build out the MVP "now," using `docs/tracker/TI-TMT MVP Tracker 2.xlsx` as the source of truth, via a **new chat running the Fable model** that implements directly (a deliberate, explicit, approved deviation from the normal Claude(Cowork)-plans/Cursor-implements split — see `CLAUDE.md` "Claude's role"). This mirrors a pre-existing draft found on this branch at `docs/cursor-prompts/mvp-reports-export-rerun-org/task-01-fable-build-all-four-areas.md` (untracked, written in an earlier session), which already covered 4 areas: Reporting & Analytics, Export & Reporting, Re-Run Management, Test Case Organization.

Cross-checking that draft against the tracker's 93 rows surfaced ~10 more frontend-feasible `Not Started`/`In Progress` items it didn't cover: rich text editing, run scheduling, personal work queues, requirement coverage tracking, archived test results, test effectiveness analysis / configurable dashboard reporting, saved filters, version management (case history is currently a hardcoded mock UI), user removal, and project-level settings (the real settings model/UI already exists in `AdminProjectPanel.tsx` but isn't surfaced project-scoped).

Noel confirmed: **expand scope to close all 14 areas**, and **proceed with the Fable-as-implementer deviation**, in one session.

**Result:** wrote a new, superseding super-prompt at `docs/cursor-prompts/mvp-final-close-out/task-01-full-mvp-close-out.md`, covering all 14 areas (A–N) with the same verified-facts rigor as the original draft (exact file paths/line numbers checked via grep/read before writing each spec — e.g. discovered `ProjectSettings`/`AdminProjectPanel.tsx`/`archiveRun` already exist at the data layer for areas N and I respectively, meaningfully narrowing that scope). Target branch for that work: `mvp-final-close-out`, cut from `origin/mvp-main`. The old 4-area draft is left in place for history, not deleted.

This is explicitly the **final frontend-only milestone before a full-stack rebuild in a separate GitLab company repo** — nothing in that branch should be pushed or merged without sign-off from both Noel and Shaun.

Known real risk flagged to Noel: 14 areas in one agent session is large; the super-prompt asks the executing agent to checkpoint progress in this file every 3-4 areas and to recommend a split if it runs long, rather than attempting one uninterrupted pass with a single end report.

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

### Test Plans screen follow-up — task-3b implemented ✅ (renamed from task-04)

`docs/cursor-prompts/mvp-test-plans/task-3b-plans-screen-followup.md` — 3 feedback items:

1. Coverage donut uncovered wedge uses `#555556` via new `notrunColor` prop on `RunDonut`
2. Plan list sidebar resizable (replaces task-03 collapse); wired `useResizablePanes` `'plan-list'` to `.pl-list-pane`
3. Run history hover popup uses `RunStatusInfographic` with delayed hide timer and `pointer-events: auto`

Schema unchanged (v14). QA evidence: `/tmp/relay-qa-mvp-test-plans/qa-report.md`.

### Run history hover tooltip fixes — task-3c implemented ✅

`docs/cursor-prompts/mvp-test-plans/task-3c-run-history-tooltip.md` — 2 feedback items, `PlansScreen.tsx` only:

1. Increased hover tooltip size 15% (`RunStatusInfographic` `size` 80 → 92) to fix status list bottom cropping
2. Repositioned tooltip to mouse cursor (`e.clientX/clientY + 6`) instead of cell bounding rect

Schema unchanged (v14). QA evidence: `/tmp/relay-qa-mvp-test-plans/qa-report.md`.

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
