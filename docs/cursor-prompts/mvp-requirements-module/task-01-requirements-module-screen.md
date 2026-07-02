# Task 01 — Requirements Module: Dedicated Screen, Coverage, Traceability

## Goal

Build the dedicated **Requirements module** at `/[projectKey]/requirements` — the top follow-up from the Requirements & Defects slice (PR #14). Requirements currently exist only as a data model (schema v14) surfaced through tabs on Test Cases and Test Runs. This task gives them a first-class module screen:

- Left pane: filterable requirement list (`REQ-*` key, title, status, linked-case count)
- Right pane: requirement detail with **Overview** and **Traceability** tabs, URL-routed
- Requirement edit (title/description/status) and delete (with unlink from cases)
- Coverage summary: % of project test cases linked to at least one requirement
- Traceability tab: linked cases with latest execution status rolled up from runs

**No schema bump.** `Requirement`, `requirementsById`, `Case.requirementIds`, and `nextRequirementNumByProject` already exist at v14. This task adds reducer actions and UI only — no migration step is needed. Do NOT bump `DEMO_SCHEMA_VERSION`.

Frontend-only. No backend, API routes, Jira sync, or new dependencies.

---

## Branch setup (do this first, stop if it fails)

1. `git fetch origin`
2. Verify commit `a9212fc` ("feat: add local requirements and execution defects slice") is reachable from `origin/mvp-main` (i.e. PR #14 has been merged): `git merge-base --is-ancestor a9212fc origin/mvp-main && echo OK`
   - **If not OK: STOP and report back.** This task depends on the v14 requirements/defects code being on `mvp-main`. Do not branch from `mvp-requirements-defects-slice` without explicit approval.
3. Create branch `mvp-requirements-module` from latest `origin/mvp-main`.
4. Confirm `DEMO_SCHEMA_VERSION === 14` in `apps/web/src/fresh/data/demo-model.ts` before starting.

---

## Step 1 — Read files before touching them

```
Read apps/web/src/fresh/data/demo-model.ts
Read apps/web/src/fresh/data/project-selectors.ts
Read apps/web/src/fresh/data/FreshProvider.tsx
Read apps/web/src/fresh/lib/project-routes.ts
Read apps/web/src/fresh/components/FreshShell.tsx
Read apps/web/src/fresh/screens/PlansScreen.tsx      ← primary layout/URL-sync pattern to follow
Read apps/web/src/fresh/screens/DefectsScreen.tsx    ← module-screen styling reference
Read apps/web/src/fresh/screens/CasesScreen.tsx      ← existing requirements tab (do not break it)
Read apps/web/src/fresh/styles/prototype-plans.css   ← CSS conventions
```

State every file you will change and every file you will NOT change before editing.

---

## Step 2 — Implementation scope

### 1. `apps/web/src/fresh/data/demo-model.ts`

- Add slug helpers next to `planKeyToSlug` / `slugToPlanKey`, same pattern:
  - `requirementKeyToSlug(requirementKey)` — strips `REQ-` prefix
  - `slugToRequirementKey(slug)` — restores `REQ-` prefix
- Do NOT change `Requirement`, `DemoState`, or `DEMO_SCHEMA_VERSION`.

### 2. `apps/web/src/fresh/lib/project-routes.ts`

- Add `requirements: 'requirements'` to `MODULE_SLUGS`.
- Add `'/requirements': 'requirements'` to `LEGACY_PATH_TO_MODULE`.
- Add `requirementPath(projectKey, requirementKey?)` → `/[projectKey]/requirements/rq/[slug]`, and `parseRequirementKey(pathname)` — mirror `planPath` / `parsePlanKey` exactly (detail segment is `rq`, matching `tc`/`tr`/`tp` convention).
- Update `switchProjectPath` to strip requirement detail selection on project switch (same guard as plans).

### 3. `apps/web/src/fresh/data/project-selectors.ts`

- `listActiveProjectRequirements` already exists — reuse it.
- Add derived helpers (pure functions, no state shape change):
  - `listCasesForRequirement(state, requirementId)` — active-project cases whose `requirementIds` include the id
  - `getRequirementCoverage(state)` — `{ coveredCases, totalCases, pct }` where a case is covered if `requirementIds.length > 0`

### 4. `apps/web/src/fresh/data/FreshProvider.tsx`

Follow existing action/reducer/callback/context patterns exactly (read the file first).

- Add actions + reducer cases:
  - `UPDATE_REQUIREMENT` — patch `Partial<Pick<Requirement, 'title' | 'description' | 'status'>>`
  - `DELETE_REQUIREMENT` — remove from `requirementsById` AND strip the id from every case's `requirementIds` (all projects' cases can be filtered safely; only the owning project will match)
  - `UNLINK_REQUIREMENT_FROM_CASE` — remove one id from one case's `requirementIds`
- Expose callbacks on `useFresh()`: `updateRequirement(requirementId, patch)`, `deleteRequirement(requirementId)`, `unlinkRequirementFromCase(caseId, requirementId)`.
- Add `activeRequirements` derived value if not already exposed (it is referenced by `CasesScreen` — verify, do not duplicate).
- Do NOT change `createRequirement`, `linkRequirementToCase`, or any defect callbacks.

### 5. Route pages

- New: `apps/web/src/app/(app)/[projectKey]/requirements/page.tsx`
- New: `apps/web/src/app/(app)/[projectKey]/requirements/rq/[reqKey]/page.tsx`
- Both render a new `RequirementsScreen` and import a new `prototype-requirements.css` (same pattern as the plans pages).

### 6. `apps/web/src/fresh/components/FreshShell.tsx`

- Add Requirements to `PLATFORM_NAV` between Test Cases and Test Plans: `{ module: 'requirements', label: 'Requirements', icon: 'ti-list-check' }`.

### 7. New: `apps/web/src/fresh/styles/prototype-requirements.css`

- Follow `prototype-plans.css` conventions (CSS variables, `.rq-*` prefix). List pane + detail pane + cards + traceability table. No Tailwind.

### 8. New: `apps/web/src/fresh/screens/RequirementsScreen.tsx`

Two-pane, URL-routed screen modelled on `PlansScreen.tsx` (including the `projectMismatch` guard on every navigation/replaceState effect — this is mandatory, see `docs/claude/known-bugs.md` BUG-01/BUG-02):

**Header area:** module title, requirement count, coverage pill (`{pct}% of test cases covered` from `getRequirementCoverage`), `+ New requirement` button (opens create modal, uses existing `createRequirement`, then navigates to the new requirement's detail URL).

**Left pane list:** search box (key/title, case-insensitive); rows show `REQ-*` key, title, status badge (Draft / Approved / Implemented / Obsolete), linked-case count. Selected row highlighted via URL match.

**Right pane — no selection:** centered "Select a requirement" message.

**Right pane — Overview tab:** key, title, status, description, created date, source (`Local`); **Edit** button (modal: title required, description optional, status select over the four `RequirementStatus` values); **Delete** button (confirm dialog warning it will be unlinked from N test cases, then `deleteRequirement` and navigate back to `/requirements`).

**Right pane — Traceability tab:** table of linked cases — columns: Case key (link to `/testcases/tc/[caseKey]`), Title, Latest execution status (scan `activeRuns` for the most recent run containing the case; show that execution's status or `Not run`), Unlink action (confirm, then `unlinkRequirementFromCase`). Empty state when no cases linked. Below the table, a link-case control: dropdown of active-project cases not yet linked + "Link" button using existing `linkRequirementToCase`.

**Do not touch** the existing Requirements tabs in `CasesScreen.tsx` / `RunsScreen.tsx` beyond what compiles — their behaviour must remain identical.

---

## Files that will NOT change

- `RunsScreen.tsx` execution UX, `/runs/api`, `ApiRunsWorkspace.tsx`
- `CasesScreen.tsx` (unless a type import needs extending — no behaviour changes)
- `demo-seed.ts`, `migrate-demo-state.ts` (no schema bump)
- Any API routes, backend, Docker, auth
- `apps/web/src/legacy/**`

---

## Acceptance criteria

1. `pnpm build` passes with zero TypeScript errors.
2. Sidebar shows Requirements; `/DP/requirements` renders the module; deep link `/DP/requirements/rq/00001` selects that requirement after creating REQ-00001.
3. Create → new `REQ-*` key issued from `nextRequirementNumByProject`; appears in list and in CasesScreen's link dropdown.
4. Edit updates title/description/status everywhere (list, detail, case Requirements tab).
5. Delete removes the requirement and strips it from all linked cases; case Requirements tab no longer shows it; no console errors.
6. Link/unlink from Traceability tab is reflected on the case's Requirements tab and vice versa.
7. Coverage pill matches manual count (cases with ≥1 requirement ÷ total active cases).
8. Project switch from `/DP/requirements/rq/...` lands on the other project's `/requirements` with no revert or flicker regression (BUG-01/BUG-02 patterns respected).
9. Existing regression routes unaffected.
10. `localStorage` key stays `relay-demo-v2`, `schemaVersion` stays `14`; existing demo data survives reload untouched.

---

## Documentation (mandatory)

Update alongside the code, in the same commit(s):

- `docs/product/user-guide.md` — new "Requirements module" section (create, edit, delete, link/unlink, coverage, traceability)
- `docs/product/feature-flow.md` — add `/[projectKey]/requirements` + `/requirements/rq/[reqKey]` routes; flip "Requirements / traceability" status from Partial; add test checklist items
- `docs/_authoritative/AS_BUILT_SNAPSHOT.md` — new module route and screen
- `docs/_authoritative/FRONTEND_CONTRACTS.md` — new `useFresh()` callbacks (`updateRequirement`, `deleteRequirement`, `unlinkRequirementFromCase`), new route helpers
- `docs/claude/handoff.md` — completed-work entry for this task

---

## Mandatory post-change smoke test

1. Run `pnpm build` (stop any stale dev server first if `.next` was rebuilt).
2. Start `pnpm dev`.
3. Browser smoke test:
   - **Affected routes:** `/DP/requirements`, `/DP/requirements/rq/[reqKey]` (after creating one), `/DP/testcases` (Requirements tab regression), `/DP/testruns` (Requirements tab regression), project switch from the Requirements screen
   - **Core regression routes:** `/admin/users`, `/admin/roles`, `/admin/audit-log`, `/DP/settings`, `/DP/dashboard`, `/DP/testcases`, `/DP/testruns`, `/DP/plans`
4. Record WebM evidence where tooling supports it.
5. Capture screenshots for any failures.
6. Write the QA report to `/tmp/relay-qa-mvp-requirements-module/qa-report.md` — include pass/fail summary per route, bugs found, known limitations, and push readiness.
7. Do NOT push until the smoke-test evidence is reviewed or explicitly waived.
8. Temporary QA scripts under `/tmp/` only — no permanent test-framework dependencies.

---

## Final output

Report back with:

1. Branch name and confirmation it was cut from latest `origin/mvp-main` (with the `a9212fc` ancestry check result)
2. Full list of files changed vs. the "will NOT change" list (flag any deviation)
3. `pnpm build` result
4. Smoke-test summary + path to `/tmp/relay-qa-mvp-requirements-module/qa-report.md`
5. Proposed commit(s) in the repo's commit message format (subject `Requirements: ...`, body grouped by file) — do not commit or push until approved
