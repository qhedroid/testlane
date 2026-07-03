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
`mvp-main` — clean, up to date with `origin/mvp-main`. PR #16 (`mvp-test-plans` polish round) merged (`7199115`), on top of previously merged PRs #13 `mvp-test-plans` and #14 `mvp-requirements-defects-slice`.

`mvp-test-plans` branch still exists locally/remotely but is fully merged — no outstanding work on it.

---

## Schema version
**Current: v14**

| Version | What changed | Migration |
|---------|-------------|-----------|
| v14 | Local **Requirement** and **Defect** entities; `requirementsById`, `defectsById`, `Case.requirementIds`, `nextRequirementNumByProject`, `nextDefectNumByProject`; REQ/DEF keys; case requirements create/link; run defects create/link (Failed/Blocked); view-only cross-tabs | v13→v14 seeds empty collections + `requirementIds: []` on cases |
| v13 | Test Plans — `TestPlan`, `TestQuery`, `QueryCondition`, `plansById`, `nextPlanNumByProject`, `resolvePlanCases()`, seed plans | v12→v13 |
| v12 | User/role access MVP | v11→v12 via `migrateUserAccessV12` |

---

## Completed work (merged via PR #16, `mvp-test-plans` → `mvp-main`)

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

## Planned work — full backlog moved to `docs/claude/roadmap.md`

Shaun dictated a full roadmap this session (Next Steps / Improvements / Lesser Improvements). It now lives in `docs/claude/roadmap.md` with status tags per item — treat that as the source of truth for "what's next," not this file. A live Testiny instance was also browsed for reference (via Claude in Chrome); full findings are in `docs/claude/testiny-recon-notes.md`, including an "open verification items" list of things that need specific data/access to check.

Current state in brief:

- **`mvp-custom-fields`** `[~in progress]` — three real task prompts drafted at `docs/cursor-prompts/mvp-custom-fields/` (task-01 field type parity, task-02 Owner mandatory field, task-03 per-field project assignment). Not yet run in Cursor. Would bump schema v14 → v15 (task-01) and possibly further (see each prompt).
- **`mvp-dashboard-metrics`** `[~in progress]` — four real task prompts drafted at `docs/cursor-prompts/mvp-dashboard-metrics/` (task-01 real metric cards + active runs, task-02 needs-attention panel, task-03 coverage-by-folder panel, task-04 remove the demo-only placeholder gate). Not yet run in Cursor. No schema change expected. Rebuilds `DashboardScreen.tsx` off real `FreshProvider` data instead of the static `seed.ts` mocks it uses today.
- **`mvp-requirements-defects`** `[~draft]` — provisional notes only, at `docs/cursor-prompts/mvp-requirements-defects/draft-notes.md`. Includes an open question from Shaun (case/run detachment behavior) he wants to verify further before it's acted on.
- Everything else (User Management, Role Management, Test Cases/Plans/Runs Extra items, live demo project, remaining Lesser Improvements) — light `[~draft]` provisional notes now exist per item under `docs/cursor-prompts/mvp-<area>/draft-notes.md` (see `roadmap.md` for the exact pointer per item), consolidating this session's findings without committing to full task prompts, per Shaun's own "batch at the end of MVP" plan for this tier.

This session's planning work (this file, `roadmap.md`, `testiny-recon-notes.md`, and the two branches' prompt/draft folders) was committed on a dedicated `mvp-further-planning` branch rather than directly on `mvp-main`, since it doesn't correspond to one feature branch.

---

## QA evidence

See `/tmp/relay-qa-mvp-requirements-defects-slice/qa-report.md` after smoke test.

---

## Gotchas

- Workspace folder `Relay-shaun-local` is a zip wrapper; **git repo root** is `Relay/` subdirectory.
- Canonical localStorage key: `relay-demo-v2`
- Defect create/link gated on execution status **Failed** or **Blocked** only
