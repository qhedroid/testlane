# `mvp-backend` — Candidate 1: new DB tables for the remaining local-only data

> Planning doc (Claude, 2026-07-10). **Not yet approved / no code written.** This sequences the
> eight remaining localStorage-backed data areas onto the real MySQL/Drizzle backend, in the
> value order Shaun gave, adjusted for effort/dependency/risk. Read `progress.md` for the branch's
> live state and `plan.md` for the original 8-phase backend plan (all done). This is the *next*
> body of work after that plan's definition-of-done was met.

## Gate before any of this ships

Candidate 1 builds directly on the post-completion hardening commits (`62565a0..f053a85`), which
Shaun has **not yet verified locally** (needs a `pnpm db:seed` re-run for the roster + `demo`→`dp`
slug changes, plus a click-through of ad-hoc run creation, sequential clone keys, the reset
button, and BootGate). Design/spec work here is safe to do now; **do not merge new-table work on
top until that base is verified.** Every new phase below also inherits the branch's standing
verification split: Claude verifies `tsc`/`pnpm build` in-sandbox; Shaun runs the live DB
verification (this sandbox has no Docker).

## What already exists vs. what's purely local (verified 2026-07-10)

Current Drizzle tables (20): `organisations, users, projects, project_roles, folders, test_cases,
test_case_steps, test_plans, test_plan_cases, test_runs, test_run_cases, run_case_step_snapshots,
run_step_results, run_assignees, run_defect_links, run_execution_comments, audit_log,
recent_views, saved_filters, attachments_metadata`. (`ref_counters` is created by the seed script,
not Drizzle-managed.)

| # (value order) | Area | Table today? | Service? | Route? | Effort | Migration? |
|---|---|---|---|---|---|---|
| 1 | Per-step results | **`run_step_results` exists, UNWIRED** | none | none | **S** | no |
| 2 | Execution log (trends) | none | none | none | **L** | new table |
| 3 | Case comments (step + general) | none (`run_execution_comments` is run-scoped + also unwired) | none | none | **M** | new table(s) |
| 4 | Defect entities | only `run_defect_links` (link table) | `DefectService` (links only) | link routes exist | **M/L** | new `defects` table |
| 5 | Requirements + case links | none | none | none | **M** | new table(s) |
| 6 | Plan query definitions (GAP-01) | none (only static `test_plan_cases`) | `setPlanCases` (membership only) | cases route exists | **M/L** | new table or JSON col |
| 7 | Run descriptions | `test_runs` has no `description` col | none | none | **XS** | add column |
| 8 | Admin settings (roles/API keys/automation) | users + project_roles only | UserService + roles route | users/roles routes | **L** | multiple new tables |

## Cross-cutting mechanics every phase must follow

These are the seams the existing sync architecture already established — a new backed field is not
done until all of these are handled:

1. **Service** in `packages/db/services/` following `TestCaseService.ts`: exported async fns taking
   one typed input with `actorId`/`projectId`; `assertProjectExists` + `assertMinProjectRole`;
   `db.transaction()`; `recordAudit(...)` inside the tx; `createId()` for ULIDs; returns summary/detail
   interfaces, not raw rows. Add a `XxxServiceError` with a `code` union + an export in
   `packages/db/package.json`.
2. **Route** under `apps/web/src/app/api/projects/[projectId]/...` following
   `cases/route.ts`: `export const dynamic = 'force-dynamic'`, `resolveSessionActor`, Zod-parse from
   `@/lib/api/schemas`, service call, `jsonSuccess`, try/catch → `handleRouteError`. Add error status
   maps + `instanceof` branch in `apps/web/src/lib/api/errors.ts`.
3. **Sync-in**: extend `SYNC_REAL_PROJECT_DATA` (or add a sibling action) in `FreshProvider.tsx` to
   pull the new data for the active real project; fetch it in the sync effect (currently the
   `Promise.all([fetchRealFolders, fetchRealCases, fetchRealPlans, fetchRealRuns])`).
4. **Write-through**: convert the relevant provider callback from local-only dispatch to
   wait-for-server (the branch default; only `updateExecution` is optimistic). Add a client file in
   `apps/web/src/lib/relay/` with fetch fns + `realX↔local` adapters.
5. **Remove the field from the `mergeLocalOnly*` merge** it currently lives in — the whole point is
   it stops being local-only. Cases → `mergeLocalOnlyCaseFields` (FreshProvider ~261); plans →
   `mergeLocalOnlyPlanFields` (~284); runs → `mergeLocalOnlyRunFields` (~297).
6. **localStorage migration**: bump `DEMO_SCHEMA_VERSION` (currently **14**, demo-model.ts:207) and
   add a step in `migrate-demo-state.ts` whenever the persisted `DemoState` shape changes.
7. **Ref counters** for any new human-readable key (defects, requirements) — reuse the
   `ref_counters` transactional pattern from `TestCaseService.generateCaseRef` / `TestRunService`.
8. **Docs**: update `AS_BUILT_SNAPSHOT.md`, `FRONTEND_CONTRACTS.md`, `user-guide.md`,
   `feature-flow.md`, and this branch's PR description per each change (the mandatory living-docs
   rule), plus `progress.md`/`handoff.md`.

## Proposed phase sequence

Value order is Shaun's; I've grouped the two trivial items as an opening phase to exercise the
migration + write-through harness on the lowest-risk surface before the design-heavy tables.

### Phase A — Per-step results + Run descriptions (opening, low risk)

- **Per-step results (value #1).** Table already exists — no migration. Add
  `ExecutionService.updateStepResult()` (the code comment at `TestRunService.ts:833` already
  promises this method; it doesn't exist). New route
  `/api/runs/[runId]/cases/[runCaseId]/steps/[stepSnapshotId]/result` (mirrors the existing
  case-level `/result` route, dev-header/session auth like the rest of `/api/runs/*`). Extend
  `run-client.ts` + `updateExecution` write-through to send `stepResults` (today it only sends
  case `status`+`comment`). Remove `stepResults` from `mergeLocalOnlyRunFields`. Sync-in: include
  step results in `listProjectRuns`'s per-case payload.
  - **Design note:** map local `CaseExecution.stepResults: Record<stepId, ExecStatus>` onto rows
    keyed by `(test_run_case_id, step_snapshot_id)`. The frontend keys by *step id*; server keys by
    *step snapshot id* — the run-case snapshot mapping (`runCaseIdsRef` pattern) has to extend to
    step-snapshot ids. This is the one non-trivial part of an otherwise clean phase.
- **Run descriptions (value #7).** Add `description text` column to `test_runs` (+ Drizzle
  migration — first migration of this candidate, establishes the pattern). `TestRunService.updateRun`
  + `createRun` accept `description`; `run-client` sends it; remove from `mergeLocalOnlyRunFields`.
  Trivial, but introduces the schema-migration flow the later phases reuse.

### Phase B — Execution log / trends (value #2, high value, high effort)

New append-only table (proposed `run_case_events`: `id, test_run_case_id, at, actor_id, from_status,
to_status, event enum('created','result')`). This is the biggest single decision in the candidate:

- **Open design question (needs Shaun):** the dashboard KPIs (`passedThisWeek`/`failedThisWeek`,
  week-over-week deltas, per-case sparklines) are computed **client-side** today from
  `DemoRun.executionLog` via `project-selectors.ts` (`countWeeklyTransitions`,
  `collectHistoryEvents`). The hardening pass already added a server `DashboardService`/summary
  endpoint that's only partially consumed. Do we (a) move trend aggregation server-side into that
  endpoint (cleaner, single source of truth, but more work + changes dashboard data flow), or (b)
  keep client-side computation but feed it from synced server events (smaller change, keeps
  `project-selectors.ts` as-is)? **Recommendation: (b) first** (persist + sync the events, keep the
  existing client selectors), leaving server-side aggregation as a follow-up — smaller blast radius
  on the protected dashboard.
- **Granularity:** one row per status transition (matches local `executionLog`), including the
  `event:'created'` entries added on `ADD_CASES_TO_RUN`. Preserves the current trend fidelity that
  the seed's backdated sealed runs rely on.
- Write-through from `updateExecution` (append an event) and run-spawn (append `created` events).
  Remove `executionLog` from `mergeLocalOnlyRunFields`.

### Phase C — Case comments (value #3)

New table(s): proposed `case_comments` (general, `test_case_id, author_id, body, created_at`) and
either a second `case_step_comments` (`test_case_step_id, ...`) or a single table with a nullable
`test_case_step_id`. **Recommendation: one table with nullable step FK** — fewer moving parts.

- Note `run_execution_comments` already exists (run-scoped) but is *also* unwired and is a
  different concept (execution comments within a run, not comments on the case definition). Decide
  whether this phase also wires that, or leaves it for a runs-comments follow-up. **Recommendation:
  case comments only this phase; flag run_execution_comments as a separate small follow-up.**
- Author identity → `users` FK (resolve via the seed-user map like `assignee`). Remove
  `generalComments` + per-step `comments` from `mergeLocalOnlyCaseFields`; sync-in with the case
  detail payload.

### Phase D — Requirements + case links (value #5, before defects: greenfield/cleaner)

New `requirements` table (`id, project_id, requirement_ref, title, description, status, created_by,
created_at`) + `case_requirements` link table (`test_case_id, requirement_id`). Ref-counter for
`REQ-<n>`. Service + routes + a `requirement-client.ts`; sync-in requirements per project and
`requirementIds` per case (remove from `mergeLocalOnlyCaseFields`). No existing table to reconcile
against, so this is the cleanest of the entity phases — doing it before defects de-risks the
entity+link pattern.

*(Ordered ahead of its value-order position #5-vs-#4 deliberately: requirements is greenfield;
defects has an existing `run_defect_links` table to reconcile, which is trickier — see Phase E.)*

### Phase E — Defect entities (value #4)

New `defects` table (`id, project_id, defect_ref, title, description, status, created_by,
created_at`). **Open design question (needs Shaun):** how does this relate to the existing
`run_defect_links.defect_ref`, which today is a *free-text external* ref (e.g. a Jira key) with no
FK? Options: (a) internal defects (frontend `source:'Local'`) become real `defects` rows, while
`run_defect_links` keeps pointing at them by ref for internal ones and stays free-text for external
ones; or (b) add a nullable `defect_id` FK to `run_defect_links` for internal defects alongside the
existing free-text `defect_ref` for external. **Recommendation: (b)** — keeps external linking
working untouched, adds first-class internal defects. Note the frontend `Defect` model has **no
severity field** today (status only: Open/In progress/Resolved/Closed) — don't invent one; match
what's there. `DefectService` already exists for links; extend it (or add `DefectEntityService`).
Ref-counter for `DEF-<n>`. Wire `DefectsScreen` (currently fully local).

### Phase F — Plan query definitions / GAP-01 (value #6)

Persist the plan authoring model (`TestPlan.queries: TestQuery[]` — condition/folder/static groups)
instead of only the resolved static `test_plan_cases` list. **Open design question (needs Shaun):**
(a) store query definitions (JSON `conditions` column in a new `test_plan_queries` table, or a JSON
column on `test_plans`) and keep resolving client-side, persisting definitions so they survive
reload and reseed; or (b) fully resolve GAP-01 by re-homing `resolvePlanCases` server-side so plans
auto-re-resolve when cases change. **Recommendation: (a)** — matches the current
"queries stay client-only, resolved list pushed to `test_plan_cases`" contract but makes the
*definitions* durable; (b) is a larger correctness win but a bigger change to plan/run creation.
Remove authored `queries` from `mergeLocalOnlyPlanFields`. This directly closes known-bugs GAP-01.

### Phase G — Admin settings (value #8, last, largest/lowest-value)

Role definitions (`AdminRole` + `RolePermissions`), API keys (`AdminApiKey`), automation
(`AdminAutomationSource`/`Field`) — each a new table + service + route, all currently local via
`admin-reducer.ts`. Lowest value for a demo (admin-only, rarely-changing config), highest surface.
**Open question:** which of these are actually worth backing for the demo vs. staying local? Custom
fields are explicitly out of scope on this branch (mvp-custom-fields owns them) — exclude. Suggest
scoping this phase down to role definitions + API keys and deferring automation, but confirm.

## Recommended starting point

**Phase A, starting with per-step results** — it's Shaun's #1 value item, the table already
exists (zero migration), and it's the most self-contained. Bundle run descriptions into the same
phase to introduce the schema-migration flow on a trivial one-column change before the design-heavy
tables. Stop and checkpoint after Phase A (per the branch's per-phase pacing), have Shaun verify
locally, then proceed to Phase B.

## Design decisions — RESOLVED with Shaun (2026-07-10)

Base hardening commits (`62565a0..f053a85`) **re-seeded + verified locally by Shaun** — the gate
is cleared. Design answers, locked in:

- **Phase B:** **(b) client-side-from-synced-events first**, but with an explicit standing note
  that trend aggregation **will eventually move server-side** — build Phase B so that later move is
  not painful (keep the event table as the source of truth even while `project-selectors.ts` still
  computes from synced events).
- **Phase C:** **one table with a nullable step FK** (`case_comments` with nullable
  `test_case_step_id`), not two tables.
- **Phase E:** **(b) add a nullable `defect_id` FK to `run_defect_links`** alongside the existing
  free-text `defect_ref` — external linking untouched, internal defects become first-class
  `defects` rows.
- **Phase F:** resolve GAP-01. **Prefer (a)** (persist query definitions, keep client-side
  resolution) **only if (a) genuinely closes GAP-01**; if closing the bug actually requires
  server-side re-resolution, **do (b)**. Determine which by re-reading `known-bugs.md` GAP-01 when
  Phase F is picked up — GAP-01's real requirement (does it demand auto-re-resolution when cases
  change, or just durable definitions?) decides this.
- **Phase G:** **roles + API keys only** for now. Defer automation. Exclude custom fields
  (mvp-custom-fields owns them).

## Starting point — APPROVED

Phase A (per-step results, then run descriptions), per the recommendation above.

## STATUS (2026-07-11): ALL PHASES A–G CODE-COMPLETE + SANDBOX-VERIFIED, NOT COMMITTED

Shaun directed "implement Phase A, then run all phases continuously." All seven done; migrations
`0002`–`0008`. Per-phase detail + Shaun-local verification checklists live in `progress.md`'s
"Candidate 1" section (authoritative for current state). Deferred (non-blocking): clone-completeness
for `case_comments`/`case_requirements`/`defects`, seeded requirements/defects, and the living-docs +
PR-description update (deferred until Shaun's live verification, per branch pattern).
