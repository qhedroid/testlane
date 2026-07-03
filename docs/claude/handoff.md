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
`mvp-final-close-out` — cut from `origin/mvp-main` (9491d87). Final frontend-only milestone before the full-stack rebuild in a separate company GitLab repo. **Do not push or merge without sign-off from both Noel and Shaun.**

**Execution-model deviation (deliberate, approved):** this branch is being implemented **directly by a Claude agent running the Fable model** working from `docs/cursor-prompts/mvp-final-close-out/task-01-full-mvp-close-out.md` — not the normal Claude(Cowork)-plans/Cursor-implements split. Approved by Noel, re-confirmed for the expanded 14-area scope on 2026-07-03.

---

## Close-out — COMPLETE (2026-07-03, all 14 areas)

| Area | Status | Commit |
|------|--------|--------|
| A — Reporting & Analytics (Reports page, drill-down, saved views) | ✅ Done | `75cc5f3` (v15) |
| B — Export & Reporting (shared export drawer, real artifacts, history) | ✅ Done | `ccf6822` (v16) |
| C — Re-Run Management (re-run modal, close confirmation, lineage) | ✅ Done | `307971c` (v17) |
| D — Test Case Organization (bulk bar, move/copy, manual order + DnD) | ✅ Done | `b6bb1a6` (v18) |
| E — Rich text (markdown subset, RichTextField/RichTextView) | ✅ Done | `d54cd5e` (no bump) |
| F — Scheduled runs (simulated firing, plans panel + modal) | ✅ Done | `cf102e3` (v19) |
| G — My Work queue (`/:key/mywork`, run-grouped, deep links) | ✅ Done | `0856519` (no bump) |
| H — Requirement coverage (badges + Reports coverage card) | ✅ Done | `dbd7781` (no bump) |
| I — Archived runs UI (archive sealed-only, Archived section, unarchive) | ✅ Done | `ea80e02` (no bump) |
| J — Effectiveness metrics + per-actor dashboard customise | ✅ Done | `b907467` (v20) |
| K — Saved filters (cases + runs, per project) | ✅ Done | `e7a3991` (v21) |
| L — Real case version history + restore (cap 50) | ✅ Done | `a00e320` (v22) |
| M — Permanent user removal (no cascade, last-admin guard) | ✅ Done | `560d80d` (no bump) |
| N — Project-scoped settings editing (existing model, `manageProjects` gate) | ✅ Done | `37a8d22` (no bump) |

Living docs (user-guide, feature-flow, AS_BUILT_SNAPSHOT, FRONTEND_CONTRACTS, known-bugs) updated in the docs commits on this branch. **Nothing pushed — awaiting review by Noel and Shaun.**

Key honesty notes (full list in `known-bugs.md` § close-out stubs):
- "PDF" export = print-friendly HTML; "Excel" = CSV — labelled; artifacts expire on reload (re-generate supported).
- Scheduled runs fire on Plans load / manual check only (simulated).
- Admin actor names ≠ team assignee names — My Work exposes a picker.
- User removal doesn't cascade; case history starts at v22; escaped-defects metric deliberately absent.
- Browser click-through QA not performed by the agent (no browser automation available against the sandbox dev server) — build + HTTP route checks only; human click-through required before merge.
- Base-branch note: `git fetch origin` fails in the Cowork sandbox (no GitHub network access); branch was cut from the locally known `origin/mvp-main` ref. App source there is identical to the qa audit branch except docs.
- "PDF" exports are honestly print-friendly HTML; "Excel" is CSV — labelled as such in UI and toasts.
- Reports trend buckets are runs (no sprint entity exists) — labelled in the control bar.
- Case archive added as part of Area D bulk actions (`Case.archivedAt`, `Folder.archivedAt`) with an Archived view; archived cases remain resolvable in historical runs.
- Living-docs updates (user-guide/feature-flow/AS_BUILT/FRONTEND_CONTRACTS) are being batched at checkpoints; full pass before final report.

---

## Schema version
**Current: v22** (on `mvp-final-close-out`)

| Version | What changed | Migration |
|---------|-------------|-----------|
| v22 | Case version history — `caseVersionsById` (`CaseVersion` with diff + pre-edit snapshot, cap 50/case); capture on `REPLACE_CASE`; `RESTORE_CASE_VERSION` | v21→v22 seeds empty collection (no backfill — pre-upgrade edits were never recorded) |
| v21 | Saved filters — `SavedFilter` (per-surface payloads), `savedFiltersById` | v20→v21 seeds empty collection |
| v20 | Dashboard layouts — `DashboardLayout`, `dashboardLayoutByActor` (per demo actor) | v19→v20 seeds empty collection |
| v19 | Scheduled runs — `ScheduledRun`, `scheduledRunsById` (simulated firing) | v18→v19 seeds empty collection |
| v18 | Test case organization — `Case.position` (manual order), `Case.archivedAt`, `Folder.archivedAt`; move/copy/reorder/assign/archive case actions; folder rename/move/copy/archive | v17→v18 backfills `position` from array order per project |
| v17 | Re-runs — `DemoRun.rerunOf` lineage pointer; `CREATE_RERUN` action | v16→v17 version stamp only (optional field) |
| v16 | Export history — `ExportArtifact`, `exportsById` (metadata + regen spec; blobs are session-only) | v15→v16 seeds empty collection |
| v15 | Saved reports — `SavedReport`, `savedReportsById` (Reports-page named views) | v14→v15 seeds empty collection |
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
