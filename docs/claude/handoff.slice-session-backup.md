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
`mvp-requirements-defects-slice` (based on `origin/mvp-main` @ 50c0e1e)

**PR #14 status (verified 2026-07-02):** commit `a9212fc` is pushed to `origin/mvp-requirements-defects-slice` but is NOT yet on `origin/mvp-main` (`mvp-main` still at `50c0e1e`). PR #14 is agreed to be merged but the merge has not happened yet. Next feature branch (`mvp-requirements-module`) must be cut from `mvp-main` only AFTER PR #14 lands.

---

## Schema version
**Current: v14**

| Version | What changed | Migration |
|---------|-------------|-----------|
| v14 | Local **Requirement** and **Defect** entities; `requirementsById`, `defectsById`, `Case.requirementIds`, `nextRequirementNumByProject`, `nextDefectNumByProject`; REQ/DEF keys; case requirements create/link; run defects create/link (Failed/Blocked); view-only cross-tabs | v13→v14 seeds empty collections + `requirementIds: []` on cases |
| v13 | Test Plans — `TestPlan`, `TestQuery`, `QueryCondition`, `plansById`, `nextPlanNumByProject`, `resolvePlanCases()`, seed plans | v12→v13 |
| v12 | User/role access MVP | v11→v12 via `migrateUserAccessV12` |

---

## Completed work (this branch — mvp-requirements-defects-slice)

### Requirements & Defects frontend slice ✅ (committed `a9212fc`, pushed, PR #14 open — not yet merged)

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

## Gap analysis (2026-07-02, verified against repo)

| Area | Verdict | Evidence |
|------|---------|----------|
| Requirements module route | **Missing** | No `requirements/` folder under `apps/web/src/app/(app)/[projectKey]/`; no `requirements` entry in `MODULE_SLUGS` (`project-routes.ts`) |
| Requirement coverage dashboard | **Missing** | No coverage code; `feature-flow.md` line 214 marks it Partial with "no coverage dashboards" |
| Traceability matrix | **Missing** | No matrix/traceability UI anywhere in `fresh/` |
| Defects module full CRUD | **Partial** | `/[projectKey]/defects` route + `DefectsScreen.tsx` merge local `DEF-*` with mocks; module-level create button `disabled title="Prototype only"` (`DefectsScreen.tsx:89`); no edit/delete |
| RBAC outside `/admin` | **Missing** | `PermissionGate.tsx` / `useActorRbac.ts` exist only under `components/admin/`; zero permission references in `fresh/screens/` (grep verified) |
| BUG-01 (project switch fails first attempt) | **Suspected fixed — needs browser verification** | 07d fix present (`activeProjectIdRef`, `ProjectRouteSync.tsx:20-32`); `projectMismatch` guards in Runs/Cases/Plans screens; known-bugs 05b update says switch now completes |
| BUG-02 (Cases screen residual flicker) | **Open / deferred** | Guard code landed but known-bugs records residual flicker persisting after 05b; non-blocking |
| `chore/cursor-tracked-rules` | **Unmerged** | Single commit `721a9c8` ahead of `origin/mvp-main` (verified via `git log origin/mvp-main..origin/chore/cursor-tracked-rules`) |
| Handoff "uncommitted" claim | **Stale-doc-only** | Slice is committed (`a9212fc`) and pushed — corrected above |

---

## Next target

**Requirements module slice** — branch `mvp-requirements-module` (cut from `mvp-main` after PR #14 merges).
Prompt drafted: `docs/cursor-prompts/mvp-requirements-module/task-01-requirements-module-screen.md`.
Scope: dedicated `/[projectKey]/requirements` screen, coverage summary, traceability tab, requirement edit/delete/unlink. No schema bump (stays v14).

Rationale: top three follow-ups from the requirements/defects slice (module route, coverage, traceability) fit one frontend-only slice with zero approval blockers. Defects full CRUD is the natural task-02. RBAC-outside-admin deferred (touches RunsScreen, a non-negotiable area). BUG-02 deferred per known-bugs.

---

## Open questions / pending decisions (2026-07-02)

1. **PR #14 merge** — agreed, not yet executed. Blocks the next branch.
2. **GitHub → internal GitLab migration** (mirror push, full history) — decided but not done. GitHub URLs in docs stay until the GitLab URL exists, then need a docs sweep.
3. **Syed's suggestion to build backend + frontend** — conflicts with CLAUDE.md frontend-only phase rule. NOT approved; Noel to resolve with Syed. All planning stays frontend-only until then.
4. **`chore/cursor-tracked-rules`** — merge into `mvp-main` around the PR #14 merge so Cursor rules stop drifting.

---

## Gotchas

- Workspace folder `Relay-shaun-local` is a zip wrapper; **git repo root** is `Relay/` subdirectory.
- Canonical localStorage key: `relay-demo-v2`
- Defect create/link gated on execution status **Failed** or **Blocked** only
