# PR: mvp-test-plans → mvp-main

## Summary

This branch delivers the Test Plans module — a planning layer that sits between the test case library and test run execution. Plans are created and managed at `/[projectKey]/plans`, with individual plan detail accessible at `/plans/tp/[planKey]`. Each plan holds one or more query groups that resolve to a live set of test cases via condition filters, folder scope, or explicit static selection. Plans can be spawned directly into a test run. The feature is built entirely client-side (state via `localStorage` key `relay-demo-v2`, schema v13) with no backend dependencies. This branch was rebased onto `origin/mvp-main` after that branch introduced schema v12 for user/role access; Test Plans migrates at v13.

---

## What's included

### Schema & Data Layer

**Test plans: data model, FreshProvider, PlansScreen v2 (schema v12 → v13 post-rebase)** ([`2877656`](https://github.com/qhedroid/Relay/commit/2877656))
- Added `QueryCondition`, `QueryField`, `QueryOperator`, `TestQuery`, `TestPlan` interfaces to `demo-model.ts`
- Added `formatPlanKey()`, `planKeyToSlug()`, `slugToPlanKey()` utilities; `resolvePlanCases()` and `evaluateCondition()` helpers
- Extended `DemoState` with `plansById: Record<string, TestPlan>` and `nextPlanNumByProject: Record<string, number>`
- `DEMO_SCHEMA_VERSION` bumped to 13 (post-rebase; v12 was already taken by user/role access on `mvp-main`)
- `demo-seed.ts`: added `SEED_PLANS` constant with two seed plans — "Smoketest" (condition query on Critical priority) and "Full Regression" (folder queries for CTMS and eTMF); `buildInitialDemoState()` now seeds `plansById` and `nextPlanNumByProject`
- `migrate-demo-state.ts`: v12→v13 migration introduces `plansById` and `nextPlanNumByProject`; seeds demo plans for any existing demo project that has none

### Selectors & Routing

**Test plans: data model, FreshProvider, PlansScreen v2 (schema v12 → v13 post-rebase)** ([`2877656`](https://github.com/qhedroid/Relay/commit/2877656))
- `project-selectors.ts`: added `listActiveProjectPlans()` — filters plans by active project and sorts by `planKey`
- `project-routes.ts`: added `planPath()` and `parsePlanKey()` helpers; imported `planKeyToSlug` / `slugToPlanKey`; updated `switchProjectPath()` to strip plan selection on project switch

### FreshProvider

**Test plans: data model, FreshProvider, PlansScreen v2 (schema v12 → v13 post-rebase)** ([`2877656`](https://github.com/qhedroid/Relay/commit/2877656))
- Added `ADD_PLAN`, `UPDATE_PLAN`, `DELETE_PLAN`, `DUPLICATE_PLAN` reducer actions and cases
- `CREATE_RUN` action extended to accept optional `planId` and `planName`; stamps both fields on the created run
- Added and exposed `addPlan`, `updatePlan`, `deletePlan`, `duplicatePlan`, `spawnRunFromPlan` callbacks on the context

**Test plans: test cases tab with static, folder, and condition queries** ([`c897fbd`](https://github.com/qhedroid/Relay/commit/c897fbd))
- Widened `UPDATE_PLAN` patch type to accept `queries?: TestQuery[]`

### Plans Screen — Overview tab

**Test plans: data model, FreshProvider, PlansScreen v2 (schema v12 → v13 post-rebase)** ([`2877656`](https://github.com/qhedroid/Relay/commit/2877656))
- Complete rewrite of `PlansScreen.tsx` — FreshProvider-backed, URL-routed plan manager with `projectMismatch` guard on URL-sync effects
- Left pane: filterable plan list showing TP-key, title, open run count, last run date; row "…" context menu with Edit, Duplicate, Delete
- Right pane Overview tab: three summary cards (plan details, active open run, coverage percentage); run history table with result bars
- Create, Edit, Duplicate, Delete plan modals
- Spawn run from plan modal — pre-fills run title, shows resolved case count, creates the run and navigates to `/testruns`
- New route `apps/web/src/app/(app)/[projectKey]/plans/tp/[planKey]/page.tsx`; `prototype-plans.css` imported in both route pages
- New stylesheet `prototype-plans.css` covering PlansScreen layout, plan list, plan detail panel, cards, and run history table

### Plans Screen — Test cases tab

**Test plans: test cases tab with static, folder, and condition queries** ([`c897fbd`](https://github.com/qhedroid/Relay/commit/c897fbd))
- Added `QueryGroupCard`, `ConditionQueryBody`, `FolderQueryBody`, `StaticQueryBody` local components to `PlansScreen.tsx`
- Replaced Test cases tab placeholder with two-column layout: query groups (left), live resolved-cases panel (right)
- Condition query groups: field/operator/value row editor (title, priority, type, assignee, tags, caseKey); AND logic across rows
- Folder query groups: folder chip picker with multi-select; all descendant cases included
- Static query groups: searchable case list with checkboxes; deduplicates against other groups
- `commitQueries` auto-save helper: calls `updatePlan` on every change with no explicit save step
- `queryResolvedCases` and `resolvedCasesAll` memos drive the live resolved-case panel
- `pendingQueries`, `addQueryMenuOpen`, `staticSearch`, `addQueryRef` state/refs; click-outside effect for add-query menu; `useEffect` to reset pending state on plan change
- Extended `prototype-plans.css` with `.pl-tc-lay`, `.pl-query-card`, `.pl-cond-row`, `.pl-folder-chip`, `.pl-static-*`, `.pl-add-query`, `.pl-resolved-table` classes

---

## ⚠️ Caveats

- **Schema version shift on rebase:** this branch was originally developed targeting schema v12 for Test Plans. After rebasing onto `origin/mvp-main`, which had already landed schema v12 for user/role access, Test Plans was renumbered to v13. All migration code and seed data reflect v13.
- **`pnpm build` not verified** on the final rebased state — a zero-error build check should be confirmed before or after merge.
- **Coverage percentage** on the Overview tab is a placeholder calculation; no backend metric is wired.
- **Spawn run** navigates to `/testruns` but does not auto-select the newly created run if the runs list has not yet rendered.
- The branch contains interleaved `Docs:` commits (Cursor prompt files, handoff, living doc updates) which are intentional planning artefacts and can be squashed or ignored during review.

---

## Testing

- **Build:** `pnpm build` should be run against the rebased tip before merge (deferred — see Caveats).
- **localStorage:** key `relay-demo-v2`, schema v13. On first load after merge, the migration chain runs automatically, seeding "Smoketest" and "Full Regression" plans on any existing demo project. Clear localStorage to test a clean-slate experience.
- **Manual smoke checks:**
  - `/DP/plans` → plan list shows TP-00001 Smoketest and TP-00002 Full Regression → click a plan → Overview tab shows summary cards and run history
  - Create a plan → modal accepts title and description → plan appears in list with next TP key
  - Edit a plan → title and description update; Duplicate → new plan appended with incremented key; Delete → removed with confirmation
  - Test cases tab → add a condition query group → set field/operator/value → resolved-case panel updates live
  - Add a folder query group → pick a folder → descendant cases appear in resolved panel, deduplicated against other groups
  - Add a static query group → search for cases → check selections → resolved panel reflects choices
  - Spawn run from plan → modal shows resolved case count → confirm → navigates to `/testruns`; new run has plan name stamped
  - Switch projects → plan list clears and reloads for the new project; no stale plan detail visible
