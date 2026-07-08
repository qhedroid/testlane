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
`mvp-visual-overhaul` — full-app Compass (TransPerfect) UI reskin. **task-01 + task-02 implemented in Cursor.** Tasks 03–06 pending. Schema stays v14. See "Completed work — `mvp-visual-overhaul`" below.

Previously: `mvp-dashboard-metrics` — all work committed (`5544fc0`, `1352efe`, `323ce6f`); ready for PR description / review before merge to `mvp-main`.

---

## This session — `mvp-visual-overhaul` (Compass reskin) — prompts drafted 2026-07-08 🎨

Goal: apply the approved **Compass (TransPerfect)** visual system to the whole app as a **pure re-skin** — no behaviour / route / schema / data change. This precedes functional work; the team reworks/restores functionality on later branches. Ideally no functionality is lost — Cursor "re-skins" what already exists.

**Design context:** the approved look was designed and signed off in a Claude Design mockup (built screen-by-screen from the live app). A self-contained reference build now lives at **`mockup/Relay Compass Reskin Mockup.html`** (opens in a browser, no build) — it is the **visual** source of truth for the reskin. The app stays the **structural** source of truth (layouts don't change).

**Prompts at `docs/cursor-prompts/mvp-visual-overhaul/`** — hand Cursor `_kickoff.md` first, then hand
it each numbered task file **one at a time, as its own Cursor session**; run everything inside a
given task file (including its internal Parts, where present) continuously, with no stopping for
confirmation. Originally split into 8 finer-grained tasks purely to manage Cursor's token budget per
session; consolidated to 6 after real usage data from other branches showed comfortable headroom at
this coarser size (Shaun: no more stop-and-ask between tasks — see 2026-07-08 follow-up below).

| Task | Scope | Primary files |
|------|-------|---------------|
| `_kickoff.md` | Branch framing: golden rules (zero behaviour change), protected Runs UX, icon policy, task sequence, out-of-scope | — |
| task-01 | Part A: Compass token & primitive foundation — the linchpin (~70% of the reskin cascades from here). Part B: app shell — sidebar + top bar | `fresh.css` `:root` + shared classes, fonts, `FreshShell`, `FreshTopbar`, `ProjectSwitcher`, `ModuleSwitcher` |
| task-02 | Part A: Dashboard. Part B: remaining screens — Defects, Audit, per-project Settings, modals, placeholders | `DashboardScreen`, `RunDonut`, `RunStatusInfographic`, `DefectsScreen`, `AuditScreen`, `SettingsScreen`, `*Modal`, `PlaceholderScreen`, `fresh.css` |
| task-03 | Test Cases | `CasesScreen`, `fresh.css` |
| task-04 | Test Runs — **protected three-pane UX; visual-only** | `RunsScreen`, `TestRunsTopbar`, `prototype-runs.css` |
| task-05 | Test Plans | `PlansScreen`, `prototype-plans.css` |
| task-06 | Admin / Project Settings (keep `/admin/*` a separate global area), plus the branch's final regression sweep + PR description | `admin.css`, `admin/**` |

Schema unchanged (**v14**) — this branch is CSS / classNames / fonts only.

**2026-07-08 follow-up (task consolidation):** Shaun flagged that Cursor had not been hitting token
limits in practice (measured on other branches: 5 combined tasks on one screen ≈ 51% usage; a single
task on a ~1,300-line screen ≈ 45% usage) and asked for the 8 original tasks to be bundled into as
few as possible without risking the ceiling, plus explicit "run continuously, don't stop for
confirmation" language throughout. Sized each original task by the line count of the files it
touches (`CasesScreen.tsx` 2,014 lines; `RunsScreen.tsx`+`prototype-runs.css` ~2,650; `PlansScreen.tsx`+`prototype-plans.css`
~2,060; the admin area ~3,000 across 16 files — each already comparable to the measured 45% data
point on its own) and kept those four screens solo; merged only the lighter foundation/shell/
dashboard/remaining-screens tasks. Result: 8 tasks → 6, detailed in the table above. The former
task-02 checkpoint ("stop after shell + Dashboard") is removed — there's no cross-task checkpoint
now, since each task file is its own Cursor session and its own review point. The final
regression-sweep + PR-description step (previously the end of the old task-08) moved to the end of
the new task-06 (Admin), since that's now the last task to run.

**Key decisions baked into the prompts:**
- **Pure re-skin, zero behaviour change** is the branch's golden rule. The Test Runs three-pane execution UX and `/runs/api` are flagged protected (visual-only).
- **Icons stay** — the fresh app keeps Tabler (`ti ti-*`), admin keeps Lucide; no library swap (~180 `ti` sites). Material-glyph parity is a possible future `mvp-icon-migration`, out of scope here.
- **Reskin via tokens, not rewrites** — retarget the ~15 `:root` vars in `fresh.css` + polish the shared classes (`.btn`/`.panel`/`.tbl`/`.chip`/`.pill`/`.sb*`/`.topbar`…); most screens reskin themselves.
- One deliberate status-colour change to match the mockup: **Blocked → amber** (`#E4AF03`, text `#8C6A00`). **Skipped stays the app's existing purple** (`#4527A0`) — explicitly *not* changed to gray (the mockup was updated to match this).
- **Gotham SSm** display font: prompts tell Cursor to drop the licensed web files into `apps/web/public/fonts/`, else fall back to Open Sans (documented substitute) — no random substitute.
- **Two icon systems + per-module CSS confirmed:** `fresh.css` (`:root` tokens + most screens), `admin.css`, `prototype-runs.css` (the live `.runs-v12` three-pane workspace), `prototype-plans.css`; `globals.css` is an empty reset. This is why the token retarget in task-01 is so leveraged.

`docs/product/design-system.md` rewritten during task-01 with the Compass token set.

QA evidence for this branch lands at `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md` (per task).

---

## Completed work — `mvp-visual-overhaul` (task-01) ✅

**Schema:** unchanged (v14). CSS, font loading, and presentational shell markup only.

| Part | What it delivered |
|------|-------------------|
| Part A | Compass `:root` tokens in `fresh.css`; light-mode pin; shared primitives (`.btn`, `.panel`, `.tbl`, `.pill`, `.chip`, `.prog`, status dots, result buttons); Open Sans via `next/font/google`; Gotham `@font-face` declared (files not yet in repo — Open Sans fallback active) |
| Part B | Sidebar reskin (216px, white-chip active state, 68px collapsed rail); top bar reskin (56px, project switcher, ⌘K search, module switcher chrome); `FreshShell`, `FreshTopbar`, `ProjectSwitcher` presentational updates |

**Deliberate palette notes:** Blocked → Compass amber (`#E4AF03` / text `#8C6A00`). Skipped stays purple `#4527A0`.

**Next:** task-03 (Test Cases).

---

## Completed work — `mvp-visual-overhaul` (task-02) ✅

**Schema:** unchanged (v14). Presentational CSS / className / donut colour constants only.

| Part | What it delivered |
|------|-------------------|
| Part A | Dashboard reskin — metric cards (Compass radii/type/accent stripes), donut status colours in `RunDonut`/`RunStatusInfographic`, active run card hover shadow, needs-attention stripes, coverage bar tokens; `DashboardScreen` Export → `.btn-neutral`, metric value colours → CSS vars |
| Part B | Defects/Audit/Settings/placeholder CSS polish; modal backdrop + dialog Compass shadow/radius; `.inp` form chrome; source banners → Compass warning/accent/gray tints; audit seal icon → gray |

**Next:** task-03 (Test Cases).

---

## Completed work — `mvp-dashboard-metrics` (tasks 01–04, committed `5544fc0`) ✅

Rebuilt `DashboardScreen.tsx` to compute all dashboard widgets from `FreshProvider` state instead of static `seed.ts` mocks:

| Task | What it delivered |
|------|-------------------|
| task-01 | Real metric cards + active runs column; dropped stalled/due/environment mock fields; Critical filter = runs with failures |
| task-02 | Needs-attention panel from unlinked failures; empty state; capped list + footer |
| task-03 | Coverage-by-root-folder panel; unfiled cases row; overall % matches Run Coverage card |
| task-04 | Removed `projectHasDemoDashboard` gate; all projects get dashboard; zero-cases onboarding empty state |

Schema unchanged (v14). Removed `projectHasDemoDashboard()` from `demo-project-utils.ts`. QA evidence: `/tmp/relay-qa-mvp-dashboard-metrics/qa-report.md`.

**Follow-up (separate branch):** Verify Test Plans Overview tab metrics on `PlansScreen.tsx` reflect live data end-to-end — not part of this branch.

### Post-commit bug fix — task-05 ✅ (committed `323ce6f`)

Fixed dashboard run-card donuts to match RunsScreen/PlansScreen behavior:

1. **Skipped segment** — `runToCard()` passes `skipped` separately from `notrun`; expanded Overview progress bar/text row include `.pg-s` skipped segment when count > 0.
2. **Hover tooltips** — `RunStatusInfographic` in active run cards now passes `interactive` for wedge hover tooltips (`{count} ({pct}%) {label}`).

Schema unchanged (v14). QA evidence appended to `/tmp/relay-qa-mvp-dashboard-metrics/qa-report.md`.

---

## Previous active branch
`mvp-main` — clean baseline before dashboard metrics work.

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

- **`mvp-visual-overhaul`** `[~in progress]` — task-01 (foundation + shell) done; tasks 02–06 pending. Schema stays v14. QA: `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md`.
- **`mvp-custom-fields`** `[~in progress]` — three real task prompts drafted at `docs/cursor-prompts/mvp-custom-fields/` (task-01 field type parity, task-02 Owner mandatory field, task-03 per-field project assignment). Not yet run in Cursor. Would bump schema v14 → v15 (task-01) and possibly further (see each prompt).
- **`mvp-dashboard-metrics`** `[x]` — implemented (tasks 01–04); see "Completed work" above. Ready for commit/PR after QA review.
- **`mvp-requirements-defects`** `[~draft]` — provisional notes only, at `docs/cursor-prompts/mvp-requirements-defects/draft-notes.md`. Includes an open question from Shaun (case/run detachment behavior) he wants to verify further before it's acted on.
- Everything else (User Management, Role Management, Test Cases/Plans/Runs Extra items, live demo project, remaining Lesser Improvements) — light `[~draft]` provisional notes now exist per item under `docs/cursor-prompts/mvp-<area>/draft-notes.md` (see `roadmap.md` for the exact pointer per item), consolidating this session's findings without committing to full task prompts, per Shaun's own "batch at the end of MVP" plan for this tier.

This session's planning work (this file, `roadmap.md`, `testiny-recon-notes.md`, and the two branches' prompt/draft folders) was committed on a dedicated `mvp-further-planning` branch and has since been merged into `mvp-main`.

### Execution order and approach (decided, not yet started)

1. **`mvp-dashboard-metrics` first** — no schema risk (all 4 tasks say "no schema change expected"), single-file-cohesive scope (`DashboardScreen.tsx`), no dependency on Custom Fields. Good candidate to validate the batched-execution approach before trusting it with a schema-migration-heavy branch.
2. **`mvp-custom-fields` second** — once the batching approach is validated. Bumps schema twice across its 3 tasks; higher blast radius (7 files vs. effectively 1 for Dashboard Metrics).
3. **Keep them as two separate branches/PRs**, not one combined branch — each independently revertible.
4. **Hand Cursor one kickoff message per branch** referencing all of that branch's numbered task files in `docs/cursor-prompts/<branch>/` and instructing it to run continuously through them (each task's own Verification section still gets run, but no stopping to ask for confirmation between tasks unless there's a genuine blocker) — rather than pasting each task prompt one at a time. Cursor's own `.cursor/rules/*.mdc` already covers the frontend-only-phase/smoke-test conventions, so the kickoff message doesn't need to repeat them.
5. **For `mvp-custom-fields` specifically**, add one checkpoint: pause and report after task-01 (the first schema bump + rendering fixes) before continuing into task-02/03, given the two-migration risk. `mvp-dashboard-metrics` can run fully autonomous end-to-end.
6. Cursor's Plan Mode (evidence of prior use in this repo: `.cursor/plans/test_runs_audit_f7170fbe.plan.md`) is a more resumable alternative to one long chat message, if preferred — it tracks progress against a todo list in a file rather than only in the chat.

> **Sequencing note (2026-07-08):** `mvp-visual-overhaul` is a self-contained, schema-free visual branch. It can land independently of the above; if it runs alongside `mvp-custom-fields`, expect merge conflicts in `fresh.css`/`admin.css` (both touch styling) and in `AdminCustomFieldsPageContent.tsx` — sequence or rebase accordingly.

---

## QA evidence

See `/tmp/relay-qa-mvp-requirements-defects-slice/qa-report.md` after smoke test.
`mvp-visual-overhaul` QA lands at `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md` (per task).

---

## Gotchas

- Workspace folder `Relay-shaun-local` is a zip wrapper; **git repo root** is `Relay/` subdirectory.
- Canonical localStorage key: `relay-demo-v2`
- Defect create/link gated on execution status **Failed** or **Blocked** only
