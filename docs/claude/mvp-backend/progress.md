# `mvp-backend` — live progress

> Read this file first on any `mvp-backend` session, right after `CLAUDE.md` and
> `docs/claude/handoff.md`. This is the actual current state — trust this over chat history,
> which gets summarized/lost across sessions. Update it before ending any session that touched
> this branch, even a short one that only got partway through a phase.

Last updated: 2026-07-10 — **BRANCH COMPLETE, READY FOR PR.** Every fresh screen is wired to the
real backend, **Shaun verified everything locally against real Docker MySQL** (all module
checklists including the Runs protected-UX regression — his 2026-07-10 confirmation stands as
the branch's regression evidence), and Phase 8 (living docs + PR description) is done. PR
description: `docs/cursor-prompts/mvp-backend/pr-description-mvp-backend.md`. The per-phase
"Verification — Shaun local" checklists below are retained for the historical record; treat
them all as ✅ per the confirmation above.

## Backend-first, all phases — standing decision (read this before touching Phases 2–8)

Shaun asked to run all 8 phases to completion in one sitting. Given this sandbox has no
Docker/browser, screen-wiring (rewiring a fresh screen off `FreshProvider`/localStorage onto a
new API) can't be exercised end-to-end here — only backend code (services + routes) can be
built/typechecked/verified without a live DB. Agreed approach: build and verify every phase's
*backend* only this session (new, currently-unused routes — low risk, fully verifiable in-sandbox),
and defer every screen's actual data-source cutover to a follow-up pass, so Cases/Plans/Runs/
Dashboard/Defects/Audit/Admin all get wired and regression-tested together against Shaun's real
Docker MySQL in one sweep, rather than piecemeal and unverified. Phase 4 is the one exception
that couldn't even get a backend-only slice — see its row below for why.

## Screen-wiring architecture pivot (read before wiring any screen)

Shaun then asked to actually wire everything at once, accepting the risk ("if it goes bad we have
this commit to rollback to"). Two big things had to be resolved before any screen's data-source
could actually change:

1. **The "DP" project problem.** Every fresh screen renders under a single client-only project key
   ("DP"/"Demo Project", id `proj-ti-core`) with zero relationship to the real DB's projects.
   Resolved by building a real project picker — see "Project-picker foundation" below. Committed
   as `2403930`.
2. **Per-screen rewrite vs. reducer-sync.** Original plan was to rewrite each screen to fetch its
   own data via a dedicated API client (mirrored on `api-client.ts`'s pattern) — this is what
   `docs/claude/handoff.md`'s and this file's earlier phase notes assumed. Attempting Cases
   surfaced a better approach: Dashboard's rich widgets (open-runs list, per-assignee bars,
   coverage-by-folder, trend charts) are *all* computed client-side in `project-selectors.ts` over
   `activeCases`/`activeRuns`/`activeFolders` — plain reads off `FreshProvider`'s reducer state, not
   direct API calls. Rewriting every screen independently would mean re-deriving that computation
   layer per screen (duplicated, higher regression risk, and Dashboard would either lose its rich
   widgets or need its own parallel computation logic).

   **Decided instead:** keep every screen's existing code (JSX, filtering, selectors) unchanged.
   Make `FreshProvider`'s reducer state *sync* from the real API for the active real project (fetch
   real cases/folders/plans/runs on load, dispatch them into local state — same pattern
   `REGISTER_REAL_PROJECTS` already uses for projects themselves), and make the *write* actions
   (`addCase`/`replaceCase`/`deleteCase`/`addFolder`/plan and run equivalents) call the real API in
   addition to the local dispatch. Every screen "just works" against real data with minimal/no
   changes to the screen files themselves. Runs stays last and gets its own dedicated pass — its
   data shape (run/case execution snapshots) doesn't map onto the local `DemoRun`/`CaseExecution`
   model as directly as cases/folders/plans do, and it's the one already-live, protected-UX route
   family (see Phase 4's row).

**Status of the sync-in / write-through wiring per module:** Cases + Folders **built** (see
"Phase 2 screen-wiring (Cases) — built" below — it established the reusable pattern: client file
with adapters → `SYNC_REAL_PROJECT_DATA`-style reducer sync → write-through in the provider
callbacks → `RECONCILE_*` temp-id swap). Plans, Defects, Audit still to do the same way;
Dashboard likely needs little/no work (it computes off the already-synced reducer state); Runs
deliberately last (protected UX, different data-shape mapping — see Phase 4's row).

**Bug found + fixed (Shaun, testing locally on `/DEMO/dashboard`):** a real, reproducible React
hydration mismatch — SSR rendered the empty-cases dashboard state while the client's hydration
pass rendered the populated-dashboard state. Root cause: `FreshProvider`'s `useReducer(reducer,
undefined, loadState)` read `localStorage` *synchronously as the client's first render*, which
has to match SSR's HTML (no `localStorage` on the server) for hydration to succeed — any
persisted state that differs at all from a fresh `buildInitialDemoState()` guarantees a mismatch.
This was always a latent risk in this app's architecture, but `REGISTER_REAL_PROJECTS` made it hit
in practice: after one visit, localStorage always ends up holding a project set that differs from
the server's fresh single-local-project baseline. Fixed by moving the `localStorage` read out of
the `useReducer` initializer (now `buildInitialDemoState` directly, matching SSR exactly) and into
a post-mount `useEffect` that dispatches `{ type: 'HYDRATE', state: loadState() }`. Trade-off: a
brief flash from fresh/empty state to the real persisted state immediately after mount — the
standard, accepted pattern for localStorage-backed state under SSR. Verified via `tsc --noEmit` +
`pnpm build`; **not yet re-verified live** — Shaun should reload `/DEMO/dashboard` (and a couple of
other routes) and confirm the hydration error is gone.

**Follow-up fix (Shaun asked directly): the double-redirect flicker described above is now fixed.**
Added `realProjectsLoaded: boolean` to `FreshProvider`'s context (`useState`, set to `true` in
both the success and failure branch of the `fetchRealProjects()` effect — i.e. once we've
*attempted* the fetch, regardless of outcome). `ProjectRouteSync.tsx`'s redirect effect now returns
early (does nothing) if an unrecognized project key is hit while `!realProjectsLoaded` — it only
falls through to the actual redirect once the real-project fetch has resolved at least once, by
which point `state.projectsById` already reflects the real projects (the `REGISTER_REAL_PROJECTS`
dispatch and the `setRealProjectsLoaded(true)` call happen in the same effect callback, so React
batches them into one re-render — no window where `realProjectsLoaded` is true but the real
projects aren't registered yet). Verified via `tsc --noEmit` + `pnpm build`; not yet re-verified
live.

## "Are we populating the DB, or just wiring the backend?" — Shaun's question, answered here

Both, but they're two separate things and only one is done so far. The seed script
(`packages/db/src/seed/demo-project-seed.ts`) genuinely inserts real rows — folders, cases, steps,
plans, plan-cases, runs, run-cases, step-snapshots, step-results, defect-links, run-assignees —
into a real MySQL database. That only happens when `pnpm db:seed` is actually *run* against the
local DB, though — it's not automatic on app boot, and it only reflects whatever was last committed
at the time it was run. If the Demo Project looks empty or the "Create Demo Project" button is
missing, the most likely explanation is simply that `pnpm db:seed` hasn't been (re-)run since the
Demo Project was added to the seed script (commit `119850a`) — worth double-checking the seed
script's console output actually printed the "Demo Project (slug demo): ..." line before assuming
anything else is wrong.

Separately — and this is the part that's **not done yet, regardless of seeding** — none of the
fresh screens (Cases/Plans/Dashboard/Runs/Defects/Audit) read from the real API at all yet. They
still render entirely from `FreshProvider`'s local reducer state, which starts empty for any
newly-registered real project (see `REGISTER_REAL_PROJECTS`'s reducer case — it deliberately does
not populate cases/runs/etc. for real projects, since that's exactly the sync-in wiring described
in "Screen-wiring architecture pivot" above, not yet built). So even with `pnpm db:seed` freshly
run and the Demo Project fully populated server-side, every screen will *still* show it as empty
until that sync-in wiring actually happens — this isn't a bug, it's the literal next piece of work
(see "Open questions / blockers" below).

## Optimistic writes — decided, flagged for later revisit

When a real-project write action (create/update/delete a case, folder, plan, etc.) fires, the UI
updates immediately (today's exact feel — a temp/local id shows the new row right away) while the
real API call happens in the background and reconciles the row afterward, rather than waiting for
the server round-trip before showing anything. Shaun confirmed this on 2026-07-09: "Optimistic as
it is still a demo." **Explicit standing note to revisit later:** before any real (non-demo)
production use, this should be revisited — the ideal live-data version waits for the server to
avoid a window where the client and server can disagree about what was actually saved (e.g. a
save that fails permissions/validation after the row already appeared to succeed). Not a concern
for this demo/local-dev phase; flagged here so it isn't forgotten once this moves past that.

## Demo Project (7th project) + "Create Demo Project" cloning

Shaun's ask (2026-07-09, same session): a real 7th DB project — "Demo Project" — richly seeded so
Dashboard/Cases/Plans/Runs all have real, varied, explorable data on first login (Testiny-style
demo), plus a "Create Demo Project" button that deep-clones a fresh copy of it on demand, and makes
it the default landing project.

**Built this session** (typecheck + build verified; **not yet committed**, and not yet verified
against a live DB — needs `pnpm db:seed` run locally, see below):

- `packages/db/src/seed/ids.ts` — added `ids.projects.demo`.
- `packages/db/src/seed/demo-project-seed.ts` (new) — `insertDemoProjectSeed()`: 4 folders (one
  nested, "Password Recovery" under "Authentication"), 14 test cases with step counts from 1 to 8
  (varying priority/type/tags/assignee/folder; one archived, two unfiled), 2 test plans built from
  different conditions ("Critical Path" = priority-in-critical/high AND folder-in-Auth/Checkout,
  6 cases; "Full Regression" = all non-archived, 13 cases) persisted as static `test_plan_cases`,
  and 4 runs spanning every lifecycle stage: two **sealed/historical** (Sprint 40 ~18 days ago,
  Sprint 42 ~6 days ago — same real tax-calc bug failing in both, for narrative continuity and a
  genuine 2-point trend), one **active/in-progress** (Critical Path, half executed), one
  **active/not-started** (Full Regression, freshly spawned, zero executions). Two `run_defect_links`
  on notable failures; `run_case_step_snapshots` generated from each case's live steps; a few
  `run_step_results` on two multi-step cases; `run_assignees` per run. Every one of the 8 seed
  users gets an explicit `project_roles` row on this project (unlike the other 6, which only grant
  3 of 8 users a role) — it's meant to be the one project every account can see regardless of
  global role.
- `packages/db/src/seed/insert.ts` — calls `insertDemoProjectSeed()`; merged its ref-counter rows
  into `seedRefCounters()`.
- `packages/db/src/seed/index.ts` — console output mentions the new project.
- `packages/db/services/ProjectCloneService.ts` (new) — `cloneProject({ actorId, sourceProjectId,
  slug?, name? })` deep-clones folders/cases/steps/plans/plan-cases/runs/run-cases/step-snapshots/
  step-results/defect-links/run-assignees into a brand-new project with fresh IDs throughout
  (`audit_log`/`run_execution_comments` deliberately NOT cloned — supplementary, not needed for
  the copy to be fully explorable on its own). **Deliberately generic** (clones ANY project by id,
  not demo-specific) — the frontend always passes the real Demo Project's id as the source.
  **Any active user can clone** (not gated to global admin like `createProject()` — cloning
  read-only demo content is lower-stakes and meant to be self-serve); the cloning actor is granted
  an `admin` `project_roles` row on the new project so it's visible to them even if they aren't a
  global admin. `ProjectCloneError` codes: `PROJECT_NOT_FOUND`/`INSUFFICIENT_PERMISSIONS`/
  `DUPLICATE_SLUG`.
- `packages/db/package.json` — added `./services/project-clone` export.
- `apps/web/src/lib/api/errors.ts` / `schemas.ts` — `ProjectCloneError` status map + branch;
  `cloneProjectBodySchema` (optional `slug`/`name` overrides).
- `apps/web/src/app/api/projects/[projectId]/clone/route.ts` (new) — POST only, real-session auth.
- `apps/web/src/lib/relay/project-client.ts` — added `cloneRealProject(sourceProjectId)` +
  `DEMO_PROJECT_SLUG` constant.
- `apps/web/src/fresh/components/ProjectSwitcher.tsx` — "Create Demo Project" button is back
  (finds the real Demo Project by `key === 'DEMO'`, calls `cloneRealProject`, full-reloads to the
  new project's dashboard on success).
- `apps/web/src/fresh/lib/project-routes.ts` — `DEFAULT_PROJECT_KEY` changed to `'DEMO'`.
- `apps/web/src/fresh/data/FreshProvider.tsx` — `REGISTER_REAL_PROJECTS` now prefers the project
  with `slug === 'demo'` as the default active project (not just whichever real project comes
  first from `listProjects()`'s DB-order response).

**Deliberate scope gaps (documented, not silently dropped):**
- **Requirements linking is NOT modeled** in the demo project's cases — there's still no
  `requirements` table in `schema.ts` (out of scope for this whole branch, per `TestCaseService.ts`'s
  file header). Cases are varied in every dimension the real schema *can* represent (steps,
  priority, type, tags, assignee, folder, archived) but don't fake requirement links.
- **Plan "conditions" are resolved once, at seed time, then persisted as a static case list** —
  the real schema still has no dynamic-query storage (`known-bugs.md` GAP-01). The two demo plans
  look like they came from real conditions (and did, conceptually) but won't re-resolve themselves
  if the underlying cases change later — same static-list limitation `TestPlanService.setPlanCases()`
  already has.
- **Historical trend granularity:** the real schema has no append-only per-case execution
  transition log (unlike the frontend prototype's `executionLog`) — only a final status + one
  `executed_at` per (run, case). The two sealed runs use realistic backdated timestamps so a real
  trend can be reconstructed as "one data point per run," not "one point per status transition" —
  coarser than the local prototype's model, but genuine, not fabricated. Per-case sparklines
  (hover-to-see-history) should still work once Runs is wired, since they can be built from a
  case's `test_run_cases` rows across every run it's appeared in, ordered by run date — no extra
  schema needed for that specific feature.
- **Cloning wipes on reseed:** `clearSeedData()` deletes every project under the seed org
  (matched generically by `orgId`, not by a fixed project-id list) — so any cloned Demo Project
  copies a user creates via the button are wiped the next time someone runs `pnpm db:seed`. This is
  consistent with the seed script's existing "full reset" behavior, not a new bug, but worth
  knowing.
- **Not yet verified against a live DB.** `insertDemoProjectSeed()`/`cloneProject()` typecheck
  cleanly and the build succeeds, but neither has actually been run against real MySQL — Shaun
  needs to run `pnpm db:seed` locally and confirm: the console output lists the Demo Project, no
  FK/constraint errors, and the seeded data looks right (folder nesting, step counts, run statuses,
  defect links). Then try the "Create Demo Project" button and confirm the clone actually works and
  is fully independent of the original (edits to the clone don't affect the source).

## Overall status

| Phase | Status |
|-------|--------|
| 1 — Foundation (auth/RBAC/User+Project API) | **Code complete, committed (`b430e50`, `4e5ad45`).** Shaun-local verification (real DB, real login flow, QA report) still needed before treating the phase as fully done. |
| 2 — Test Cases backend | **Backend complete AND screen-wiring complete, Claude-sandbox verified** (`TestCaseService.ts` + `/api/projects/[projectId]/cases/*` + `/api/projects/[projectId]/folders/*` committed in `7fc415e`; screen-wiring built this session via `case-client.ts` + `FreshProvider` sync/write-through — see "Phase 2 screen-wiring (Cases) — built" below, **not yet committed**). Shaun-local verification still needed (checklist in that section). |
| 3 — Test Plans backend | **Backend AND screen-wiring complete, Claude-sandbox verified.** Backend committed in `7fc415e`; wiring built in the all-at-once pass (see section below): `plan-client.ts` + provider sync/write-through; GAP-01 resolved as "queries stay local-only, resolved case list pushed via `setPlanCases` on every queries change". Shaun-local verification still needed. |
| 4 — Test Runs wiring | **BUILT (2026-07-09, final screen-wiring pass) — Claude-sandbox verified, not yet committed at time of writing.** Auth swap: `resolveActor()` now tries the real NextAuth session FIRST and falls back to the `x-relay-user-id` dev header (kept for `pnpm api:validate` + cookie-less scripting; `/api/runs/*` stays middleware-exempt). Backend: `listProjectRuns` returns per-case results + active defect refs per run (no N+1; caseCounts computed from the same rows); new `updateRun()` (seal/reopen/archive/title/dueDate, audited) + `PATCH /api/runs/[runId]`. Frontend: new `run-client.ts`; runs join the provider sync (server runs ↔ `DemoRun`, `RUN-<nnnn>` refs as runKey); write-through on `updateExecution` (result POST via a testCaseId→testRunCaseId map), `spawnRunFromPlan`/`duplicateRun` (real create + RECONCILE_RUN), seal/unseal/archive/delete (PATCH status; "delete" = server archive), `editRun` (title/dueDate). **Documented gaps (local-only):** ad-hoc plan-less runs (server createRun requires a plan), per-step results, executionLog/step comments/assignee-per-case edits, run description. `RunsScreen.tsx` changed only for the URL runKey reconcile-follow (data-plumbing; zero execution-UX change). Shaun-local verification + full protected-UX regression still needed — see the Phase 4 section below. |
| 5 — Dashboard backend | **Backend committed (`7fc415e`); screen-wiring resolved as a deliberate NO-OP** (all-at-once pass): under the reducer-sync architecture, `DashboardScreen.tsx` computes everything client-side from `FreshProvider` state, which now syncs real cases/folders/plans — so Dashboard already shows real case data with zero changes. Its run-based widgets light up when Runs syncs (Phase 4). Consequence, flagged not hidden: `DashboardService.ts` + `/api/projects/[projectId]/dashboard` are currently **unused by the frontend** — kept as reference/future-API surface, or delete in a cleanup pass. |
| 6 — Defects/Audit backend | **Backend committed (`7fc415e`). Audit screen-wiring complete** (all-at-once pass): `AuditScreen.tsx` fetches the real `/api/projects/[projectId]/audit` log for real projects via `audit-client.ts` (screen-level fetch — deliberate exception to reducer-sync, see that file's header), static demo events kept for local projects. **Defects screen-wiring deferred to the Runs pass (Phase 4), deliberately:** the only real defect data is `run_defect_links`, which hangs off `test_run_cases` — unusable until runs themselves sync; `DefectsScreen.tsx`'s local defect entities stay as-is until then. Shaun-local verification of Audit still needed. |
| 7 — Admin panel unification | **Users wiring complete** (all-at-once pass): `user-client.ts` + provider `SYNC_REAL_USERS`/`RECONCILE_ADMIN_USER` + write-through on invite/update/role-change/disable/reactivate, with the granular Admin roles compressed onto `globalRole` (same mapping as the seed overhaul — the granular role itself stays local-only). `/admin/roles` role *definitions* stay entirely local — no backing table, same principle as every other exclusion. Requires a global-admin session for the user sync (server 403s otherwise; panel falls back to the local mock). Shaun-local verification still needed. |
| 8 — Seeded demo project + regression sweep + PR | **Blocked on Shaun-local verification, as expected** — a full regression sweep and PR description can't be meaningfully produced until screens are actually wired and clickable. Seed data review: `packages/db/src/seed/insert.ts` already seeds test cases/plans/folders (Phase 0, pre-existing) so Cases/Plans backends have real rows to exercise once wired; no additions made this session since nothing consumes them yet beyond direct API calls. Full write-up when this phase is actually picked up. |

## Phase 2 screen-wiring note (read before continuing Phase 2 or starting 3/5/6/7)

Shaun asked to run all 8 phases to completion in one sitting. Phase 2's backend (service +
routes) is done and typechecks/builds clean — that part is low-risk and fully verifiable without
a live DB. The remaining half of every phase from here on — actually rewiring a fresh screen off
`FreshProvider`/localStorage onto the new API — is a different risk profile: this sandbox has no
Docker/browser, so none of that wiring can be exercised end-to-end before Shaun sees it. Phase 2
research already surfaced several real mismatches a screen-wiring pass has to resolve, not just
mechanically "swap the data source":
- Case ref format: DB/seed uses `TC-1005` (unpadded); the frontend prototype's own
  `formatCaseKey` produces `TC-00001`. `TestCaseService` deliberately matches the DB/seed
  convention — the API's case refs will NOT look like today's localStorage demo refs.
- `priority`/`type` are lowercase enums in the DB, capitalized/freeform strings in
  `demo-model.ts`'s `Case` type — needs an explicit adapter layer, not a direct pass-through.
- `assignee` (free-text display string) vs `assignedTo` (a real `users.id` FK) — no resolution
  path exists today; a real implementation needs a name/email → user-id lookup.
- Custom fields and Requirements linking have no backing DB tables at all (by design — out of
  `mvp-backend`'s scope) and must stay on `FreshProvider`/localStorage even after cases/folders
  move to the real API — i.e. `CasesScreen.tsx` becomes a **hybrid** screen, same pattern
  `mvp-visual-overhaul` used for Dashboard/Defects (real data where it exists, local data where
  it doesn't), not a full cutover.
- `CasesScreen.tsx` keeps its entire case list in memory and does all filtering/search/paging
  client-side; `TestCaseService.listCases()` is deliberately unpaginated to match that today, but
  this should be revisited if case counts grow.

None of this is a blocker — it's normal integration work — but it's exactly the kind of change
that should get a real browser + real Docker MySQL in the loop before being trusted, especially
repeated across Cases, Plans, Runs (**protected** execution UX), Dashboard, Defects/Audit, and
Admin. Recommendation for whoever picks this up next: wire one screen, stop, have Shaun verify it
locally, then continue — rather than wiring all six blind in one pass. Flagged here rather than
silently proceeding, per Shaun's own repeated preference for judgment calls to be visible and
correctable rather than assumed.

## Phase 1 — Foundation: detailed checklist

Spec: `docs/cursor-prompts/mvp-backend/task-01-foundation-auth-rbac.md` (superseded as a Cursor
prompt, still the accurate technical spec for Claude to execute). Key decisions already locked
in there — do not re-litigate without a real reason: NextAuth JWT session strategy (no DB
adapter tables), `bcryptjs` not native `bcrypt`, shared dev password `relay-dev-2026` for all
six seed users, `/api/runs/*` explicitly untouched this phase (task-04/Phase 4's job).

All of Parts A–F implemented in one session (2026-07-09). Checklist below mirrors the spec's
Parts A–F — kept checked off with exact file state so a fresh chat can verify without re-reading
the whole spec.

- [x] **Part A — deps/env:** `next-auth@^4.24.11`, `bcryptjs@^2.4.3`, `@types/bcryptjs@^2.4.6`
      added to `apps/web/package.json`; `bcryptjs` + `@types/bcryptjs` also added to
      `packages/db/package.json` (needed there too — `verify-credentials.ts`, `UserService.ts`,
      `seed/insert.ts` all hash/compare passwords in that package). `NEXTAUTH_SECRET`/`NEXTAUTH_URL`
      added to `.env.example` (placeholder value) and the real root `.env` (real generated secret
      via `openssl rand -base64 32`).
- [x] **Part B — seed passwords:** `packages/db/src/seed/insert.ts` — all six users get
      `passwordHash: devPasswordHash` (bcryptjs cost 12, `SEED_DEV_PASSWORD = 'relay-dev-2026'`
      exported as a const); `packages/db/src/seed/index.ts`'s `runSeed()` console output prints
      the shared password + all six emails/names/roles; `README.md` gets a new "Local dev login"
      section (table of all six accounts) plus updated "What works today"/"Current limitations"
      bullets reflecting real auth.
- [x] **Part C — NextAuth core:** `packages/db/src/auth/verify-credentials.ts` (new,
      email+password → actor or null, never throws); `packages/db/package.json` exports map gets
      `./auth/verify-credentials`, `./services/user`, `./services/project`;
      `apps/web/src/lib/auth/auth-options.ts` (JWT strategy, Credentials provider, jwt/session
      callbacks carrying `id`/`globalRole`); `apps/web/src/lib/auth/next-auth.d.ts` (module
      augmentation for typed `session.user.id`/`globalRole`); `apps/web/src/app/api/auth/[...nextauth]/route.ts`;
      `apps/web/src/lib/api/session.ts` (`resolveSessionActor` — separate from `resolveActor()`,
      `auth.ts` untouched); `apps/web/src/app/providers.tsx` (new, wraps `SessionProvider`) +
      `apps/web/src/app/layout.tsx` now renders `<Providers>{children}</Providers>` inside `<body>`.
- [x] **Part D — RBAC middleware:** new `apps/web/src/middleware.ts` — gates every route except
      `/login`, `/api/auth/*`, `/api/runs/*`, `/api/health`, `/_next/*`, `/fonts/*`; redirects to
      `/login?callbackUrl=<path>` when no valid session token.
- [x] **Part E — services + routes:** `packages/db/services/UserService.ts` (`listUsers`,
      `createUser`, `updateUser` with last-active-admin guard; `UserServiceError` codes
      `INSUFFICIENT_PERMISSIONS`/`EMAIL_TAKEN`/`USER_NOT_FOUND`/`LAST_ADMIN`);
      `packages/db/services/ProjectService.ts` (`listProjects` — global admin sees all,
      contributor/viewer see only their `project_roles` rows; `createProject`;
      `assignProjectRole` via `assertMinProjectRole()`; `ProjectServiceError` codes
      `INSUFFICIENT_PERMISSIONS`/`DUPLICATE_SLUG`/`PROJECT_NOT_FOUND`); zod schemas added to
      `apps/web/src/lib/api/schemas.ts` (`createUserBodySchema`, `updateUserBodySchema`,
      `createProjectBodySchema`, `assignProjectRoleBodySchema`); status maps + `instanceof`
      branches added to `apps/web/src/lib/api/errors.ts`; route files
      `apps/web/src/app/api/users/route.ts`, `apps/web/src/app/api/users/[userId]/route.ts`,
      `apps/web/src/app/api/projects/route.ts`,
      `apps/web/src/app/api/projects/[projectId]/roles/route.ts` — all following the exact
      `resolveSessionActor` → zod parse → service call → `jsonSuccess`/`handleRouteError` shape
      as `/api/runs/route.ts`.
- [x] **Part F — login UI + sign-out:** `LoginScreen.tsx` rewritten with real form state
      (email/password/error/loading), calls `signIn('credentials', { redirect: false })`, reads
      `callbackUrl` from `useSearchParams()`, SSO button now a disabled visual placeholder;
      `(app)/[projectKey]/login/page.tsx` now `redirect('/login')`; new
      `apps/web/src/app/login/page.tsx` (wrapped in `<Suspense>` for `useSearchParams()`); new
      `apps/web/src/fresh/components/UserMenu.tsx` (mirrors `ProjectSwitcher.tsx`'s
      outside-click popover pattern) wired into `FreshTopbar.tsx` after `<TopbarGlobalActions />`.
- [x] **Verification — Claude sandbox:** `pnpm install` and `pnpm build` cannot run directly
      against the mounted workspace folder — pnpm's temp-file churn hits `EPERM` on that FUSE
      mount (the folder's write-once-per-file semantics; confirmed via `mcp__cowork__allow_cowork_file_delete`
      after 8 stray 0-byte pnpm temp files landed in the real `Relay/` folder from the first
      attempt — cleaned up). **Workaround for future sessions:** `rsync` the repo (excluding
      `node_modules`/`.git`/`.next`) to a local-disk scratch path (e.g. `/tmp/relay-verify`) and
      run `pnpm install`/`build`/`tsc --noEmit` there instead — real source edits still go through
      Edit/Write directly on the mounted path as normal, only the *verification* install/build
      needs the local copy. Result: `pnpm install` clean; `tsc --noEmit` clean for both
      `@relay/db` and `@relay/web`; `pnpm build` succeeded (all 29 app routes + 9 API routes
      compiled, 55.2 kB middleware chunk) once `NEXT_FONT_GOOGLE_MOCKED_RESPONSES` worked around
      the sandbox's blocked `fonts.googleapis.com` egress (confirmed pre-existing/unrelated to
      this diff via a direct `curl` 403-from-proxy) — no live DB was needed for any of this.
- [ ] **Verification — Shaun local:** `pnpm db:seed` prints new credential block;
      logged-out redirect to `/login?callbackUrl=…` works; login as
      `shaun.sevume@relay-dev.local` / `relay-dev-2026` works and lands on `/DP/dashboard`;
      sign-out works; `GET /api/users` 403s as viewer, 200s as super_admin;
      `POST /api/projects` 403s as contributor, 201s as admin; `/api/runs`/`/DP/testruns`
      unaffected (still using the header hack). **Still needed before Phase 1 is fully done.**
- [x] **Documentation:** `README.md` (Local dev login section, What works today/Current
      limitations updates), `docs/product/user-guide.md` (Login section rewritten, frontend
      caveat table, known limitations, future-backend checklist), `docs/product/feature-flow.md`
      (modules/routes table, RBAC behaviour table, feature status table, Login manual-test
      checklist, future API requirements table), `docs/_authoritative/AS_BUILT_SNAPSHOT.md` (auth
      row, HTTP API table, backend services, not-built table), `docs/_authoritative/FRONTEND_CONTRACTS.md`
      (new "Login & Authentication", "User API", "Project API" sections with full request/response/error-code
      contracts), `docs/claude/handoff.md` (new completed-work entry) — all updated.
- [x] **Commit** — committed as `b430e50` (Phase 1 code) and `4e5ad45` (seed user/role
      overhaul, see below), both authored/committed as Shaun Sevume — confirmed this session's
      git config already matched his identity, so no override needed. Pushed to nowhere yet
      (local branch only).

## Post-Phase-1 fixes (same session)

- **`/login` CSS bug, fixed:** `fresh.css` is a single global stylesheet imported only by
  `(app)/layout.tsx` and `admin/layout.tsx` — the new top-level `apps/web/src/app/login/page.tsx`
  (outside the `(app)` group on purpose) never imported it, so the login screen rendered
  completely unstyled. Fixed by importing `fresh.css` directly in `login/page.tsx`, same
  pattern `admin/layout.tsx` already uses independently.
- **Seed user/role overhaul (Shaun's ask):** expanded the 6 seed users to 8 (added Nadim Sharif,
  Syed Ahmed), changed Nasir Dipto `admin`→`contributor` and Arvindh Chandran `viewer`→`contributor`,
  and synced the frontend Admin mock panel's fake users (Alice Chen, Bob Smith, etc.) to the same
  8 real names with Owner/Administrator/Run Manager/Run Executor/Editor/Viewer roles. Full
  DB-role-compression mapping table is in `docs/claude/handoff.md`'s "Phase 1 post-commit fixes"
  entry — not duplicated here.

## Phase 2 — Test Cases backend: detailed checklist

Primary files per `plan.md`: `packages/db/services/TestCaseService.ts`,
`apps/web/src/app/api/**/cases/**`, `CasesScreen.tsx`. See the "Phase 2 screen-wiring note"
above for the one part of this phase that's deliberately not started yet.

- [x] **Service:** `packages/db/services/TestCaseService.ts` — `listFolders`, `createFolder`,
      `listCases` (unpaginated, matches the frontend's in-memory model; recursive
      folder-and-descendants resolution mirrors `demo-model.ts`'s `casesInFolder()`), `getCase`,
      `createCase` (transactional `TC-<n>` ref generation via `ref_counters`, mirrors
      `TestRunService.generateRunRef()`), `updateCase` (whole-object-shaped patch, matching the
      frontend's only save path `replaceCase()`), `archiveCase` (soft delete — `is_archived = true`,
      per schema.ts's "never hard-deleted" invariant; frontend's `deleteCase()` removes state
      entirely, a documented behavior difference for whenever the screen gets wired).
      `TestCaseServiceError` codes: `PROJECT_NOT_FOUND`/`FOLDER_NOT_FOUND`/`CASE_NOT_FOUND`/
      `DUPLICATE_CASE_REF`/`REF_COUNTER_TIMEOUT`/`TRANSACTION_FAILED` (no
      `INSUFFICIENT_PERMISSIONS` — RBAC goes through the shared `assertMinProjectRole()` instead).
- [x] **Bug fix surfaced while wiring this up:** `assertMinProjectRole()`'s
      `InsufficientPermissionsError` (used directly by `ProjectService.assignProjectRole` since
      Phase 1, and now by every `TestCaseService` write) had no branch in
      `apps/web/src/lib/api/errors.ts` — it silently fell through to a 500 instead of a 403. Fixed
      by adding a generic `instanceof InsufficientPermissionsError` branch, plus a new
      `packages/db/package.json` export (`./rbac/assert-min-role`) so `errors.ts` can import it.
- [x] **Routes:** `apps/web/src/app/api/projects/[projectId]/cases/route.ts` (GET list, POST
      create), `apps/web/src/app/api/projects/[projectId]/cases/[caseId]/route.ts` (GET detail,
      PATCH update, DELETE→archive), `apps/web/src/app/api/projects/[projectId]/folders/route.ts`
      (GET list, POST create) — `projectId` comes from the route segment, not query/body (differs
      from `/api/runs`'s flat `?projectId=` convention since these routes are properly nested).
      Zod schemas in `schemas.ts`: `listCasesQuerySchema`, `createCaseBodySchema`,
      `updateCaseBodySchema`, `createFolderBodySchema`.
- [x] **`CasesScreen.tsx` wiring — DONE** (2026-07-09, later session). Full detail in
      "Phase 2 screen-wiring (Cases) — built" below. Zero changes to `CasesScreen.tsx` itself —
      the reducer-sync/write-through architecture absorbed everything in `FreshProvider.tsx` +
      a new `case-client.ts`.
- [x] **Verification — Claude sandbox:** `tsc --noEmit` clean for both `@relay/db` and
      `@relay/web`; `pnpm build` succeeded, all 4 new routes present in the route table.
      (Re-verified after the screen-wiring changes — same result.)
- [ ] **Verification — Shaun local:** now possible — see the checklist in "Phase 2
      screen-wiring (Cases) — built" below. **Still needed.**
- [ ] **Documentation:** `docs/product/user-guide.md`/`feature-flow.md`/`FRONTEND_CONTRACTS.md`
      not yet updated for the new case/folder endpoints (deferred until Shaun's local
      verification confirms the wiring actually works end-to-end, so the docs reflect verified
      behavior).
- [ ] **Commit** — backend committed (`7fc415e`); screen-wiring not yet committed.

## Phase 2 screen-wiring (Cases) — built (2026-07-09, not yet committed)

First screen wired via the reducer-sync/write-through architecture (see "Screen-wiring
architecture pivot" above). `CasesScreen.tsx` itself is **unchanged** — it keeps reading
`activeCases`/`activeFolders` and calling `addCase`/`replaceCase`/`deleteCase`/`addFolder`
exactly as before; all the real-API plumbing lives in the provider and a new client file.

**Files changed:**

- `apps/web/src/lib/relay/case-client.ts` (new) — mirrors `project-client.ts`'s pattern
  (nested session-auth routes, same `parseResponse`/`RelayApiError` shape). Contains:
  `fetchRealFolders`/`fetchRealCases`/`createRealCase`/`updateRealCase`/`archiveRealCase`/
  `createRealFolder`; the frontend↔backend adapters (`realCaseToLocal`,
  `localCaseToCreateBody`, `localCasePatchToUpdateBody`, `realFolderToLocal`); priority/type
  casing converters (DB lowercase enums ↔ frontend Capitalized strings, unknown types fall
  back to `functional`); the static 8-seed-user id↔name map (`SEED_USER_NAME_BY_ID`, IDs from
  `packages/db/src/seed/ids.ts` — note ids.ts's key names predate the seed-user rename, the
  display names match current `insert.ts`); and `isRealId()` (26-char ULID test, used to
  distinguish real ids from local `newId()` temp ids everywhere below).
- `apps/web/src/fresh/data/FreshProvider.tsx` — three new reducer actions:
  `SYNC_REAL_PROJECT_DATA` (replaces a real project's cases/folders with server data, merging
  local-only fields back in per case and keeping still-pending optimistic creates),
  `RECONCILE_CASE` and `RECONCILE_FOLDER` (swap an optimistic create's temp id for the server's
  real ULID + ref once its POST resolves; case reconcile also remaps run
  `caseOrder`/`executions` references defensively). A module-level `mergeLocalOnlyCaseFields()`
  helper implements the hybrid-screen rule: comments, custom-field values, requirement links,
  references, and template stay localStorage-backed (no DB tables — by design, out of branch
  scope) and are preserved across every sync/reconcile; step comments match by step id, falling
  back to position (server regenerates ULIDs for steps submitted with temp ids). In the
  component: a sync effect (fetch folders+cases whenever the active project is real, same
  trigger pattern as `REGISTER_REAL_PROJECTS`), `idRemapRef` (temp id → real ULID) +
  `pendingRealCreatesRef` (temp id → in-flight create promise, so a write against a
  not-yet-reconciled entity waits for the real id instead of missing the server), and
  write-through in `addCase`/`updateCase`/`replaceCase`/`deleteCase`/`addFolder` — local
  dispatch first (optimistic, per the standing decision above), API call in background,
  `RECONCILE_*` dispatch on create success, `console.error` + keep-local on failure.
- `packages/db/services/TestCaseService.ts` — `listCases()` now returns full `CaseDetail[]`
  (steps, tags, preconditions, description) instead of `CaseSummary[]`. Deliberate change: the
  screen renders step content and tag chips straight from its in-memory case list, so a
  summary-only list would have forced an N+1 per-case detail fetch on every project load. The
  previous implementation already paid a step-rows query for counts; this just selects the full
  rows. Route/schema unchanged (additive response change on a route nothing else consumes yet).

**Adapter decisions (flagged, not silently resolved — these are the mismatches the "Phase 2
screen-wiring note" above predicted):**

- **caseKey:** server `caseRef` (`TC-1005`, unpadded) is used directly. An optimistic create
  briefly shows the local zero-padded key (`TC-00015`) until the POST resolves and
  `RECONCILE_CASE` swaps it — visible for well under a second on local dev.
- **assignee:** static 8-user map. A name outside the seeded roster is sent as `assignedTo:
  null` (server has no users row for it) but kept as-is locally — it round-trips back to
  unassigned after a reload+sync. Real name→id lookup is Phase 7 territory.
- **deleteCase:** server archives (`is_archived = true`), local removes from state — the
  archived case is invisible to the UI either way (list fetch excludes archived), but the DB
  row survives, per schema invariant.
- **steps:** temp step ids are stripped from write bodies (fail the API's ULID check), so the
  server regenerates step ULIDs on every save that touches steps; steps with an empty action
  are omitted from requests entirely (API 400s on them) and stay local-only until given text.

**Known minor UX trade-offs (watch for these during local verification — both are
create-path-only, brief, and fixable with a small screen-level effect if they annoy):**

1. **Duplicate case:** the context-menu Duplicate opens the detail panel with the temp id
   (`CasesScreen.tsx` line ~1117); when the create's reconcile lands moments later the id
   changes and the panel closes itself. Reopening shows the case fine.
2. **New folder:** `commitNewFolder` selects the new folder by temp id; the tree selection
   resets when the reconcile swaps the id. The folder itself is fine (it's empty either way).

**Known races/limitations (accepted for demo, documented so they aren't rediscovered):**

- A create whose POST *fails* keeps the case/folder locally forever with a temp id and a
  console error — no retry queue. Same for any failed update/archive (local state keeps the
  change, server doesn't).
- An edit fired between a create and its reconcile resolves the real id via the pending-create
  promise, so the normal quick-create→edit flow is covered; but if the create failed, the edit
  is skipped with a console warning.
- A sync resolving *after* a local edit that was made while the fetch was in flight can
  briefly overwrite the edit with pre-edit server state (the write-through PATCH then makes the
  server catch up on next sync). Window is fetch-latency-sized; acceptable locally.

**Verification — Claude sandbox (done):** rsync→`/tmp/relay-verify`, `tsc --noEmit` clean for
`@relay/db` and `@relay/web`, `pnpm build` succeeded (29/29 pages, full route table present).
Two sandbox notes for future sessions, adding to the existing ones under "Open questions /
blockers": (1) `pnpm` was again missing and the previously-noted leftover install was gone —
`npm install -g pnpm --prefix ~/.npm-global` works fine (no `corepack` needed), then invoke
`~/.npm-global/bin/pnpm`. (2) `NEXT_FONT_GOOGLE_MOCKED_RESPONSES` must point at a JSON file
mapping the *exact* font URL to CSS text — an empty `{}` fails with "Missing mocked response
for URL: https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700&display=swap";
map that URL to any valid `@font-face` CSS string. (3) Background processes do **not** survive
between bash tool calls in this sandbox — a `pnpm build` that outruns the 45s tool timeout can
be run via `setsid bash -c '... > /tmp/build.log 2>&1' &` within a single call and completes
fast enough (~40s) once the pnpm store is warm.

**Verification — Shaun local (STILL NEEDED before this phase is done):**

- [ ] Log in, land on `/DEMO/dashboard`, go to Test Cases → the seeded Demo Project data
      appears (4 folders incl. nested "Password Recovery", 13 non-archived cases, real
      `TC-<n>` refs, step counts 1–8, assignees showing real team names).
- [ ] Quick-add a case → appears instantly with a padded temp key, key flips to a real
      `TC-<n>` ref within a beat; survives a hard reload (i.e. it's really in MySQL).
- [ ] Edit a case in the detail panel (title, priority, type, steps, assignee) → save →
      hard reload → changes persisted.
- [ ] Delete a case → gone from UI; in DB it's `is_archived = 1`, not deleted.
- [ ] Create a folder, and a nested folder → survive reload; create a case inside a
      just-created folder immediately → lands in that folder server-side after reload.
- [ ] Watch for the two known UX trade-offs above (duplicate-case panel close, new-folder
      selection reset) — confirm they're tolerable or ask for the screen-level fix.
- [ ] Custom fields / comments / requirement links on cases in the Demo Project still work and
      survive reload (they're localStorage-backed — the hybrid rule — so they should behave
      exactly as before).
- [ ] `GET /api/projects/<demoId>/audit` (or the DB `audit_log` table) shows `case.created`/
      `case.updated`/`case.archived` rows for the actions above.
- [ ] Regression: local-only projects (if any remain) still behave as pure-localStorage;
      `/DP/testruns` execution UX untouched.

## Screen-wiring: the all-at-once pass (2026-07-09, same session as Cases)

Shaun's call after Cases landed: fix the two create-path glitches, then wire everything else in
one pass instead of stopping per screen. Runs stays deliberately last (standing Phase 4
decision — protected UX + the `/api/runs/*` auth swap must be one atomic verified change).

**1. Create-path glitch fixes (Cases):** `FreshProvider` now exposes `resolveEntityId(id)`
(public read of the temp→real id remap). `CasesScreen.tsx` gained two small effects that follow
RECONCILE id swaps: the open detail panel re-points at the reconciled case id (fixes the
duplicate-case panel-close), and the folder tree selection + expanded-state follow a reconciled
folder id (fixes the new-folder selection reset). These are the only screen-file changes.

**2. Plans (`plan-client.ts` new, provider sync + write-through):** same architecture as Cases.
GAP-01 resolved: **queries stay local-only** (the authoring model, localStorage-backed); on
every `updatePlan(..., { queries })` the provider resolves them client-side via
`resolvePlanCases()` and pushes the case-id list to `PUT .../plans/[planId]/cases`, so the
server's static `test_plan_cases` tracks the queries and `TestRunService.createRun()` keeps
working. Server plans with no local copy get a synthesized `static` query group (`q-server-*`
ids) from their server case list — seeded Demo plans render fully. `mergeLocalOnlyPlanFields`:
local *authored* queries win over the synthesized group on sync. planKey = server `PLAN-<nnn>`
ref directly; `slugToPlanKey()` in demo-model.ts was taught to recognise the `PLAN-` prefix
(URL routing would otherwise mangle it to `TP-PLAN-<nnn>`), and PlansScreen's not-found
redirect now follows planKey reconciliation via `resolveEntityId` before falling back to the
list. Write-throughs: `addPlan` (POST + RECONCILE_PLAN), `updatePlan` (PATCH title/description;
PUT cases on queries change), `deletePlan` (DELETE → archive), `duplicatePlan` (POST with
resolved caseIds). Backend change: `listPlans()` now excludes archived plans and returns
ordered `caseIds` per plan (`PlanListItem`) — same no-N+1 reasoning as `listCases()`.

**3. Audit (`audit-client.ts` new + `AuditScreen.tsx`):** real projects fetch
`/api/projects/[projectId]/audit` (limit 100) and render rows through a display adapter
(actor id → seed-user name, action verb + entity label + ref from the audit row's `newValue`,
relative time, icon per action; all dynamic values HTML-escaped since the screen renders via
dangerouslySetInnerHTML). Local projects keep the static demo events. This is a
**screen-level fetch, not reducer-sync — deliberate exception** (read-only feed, no writes, no
other consumer; putting it in DemoState would be schema churn for nothing).

**4. Admin users (`user-client.ts` new, provider sync + write-through):** `SYNC_REAL_USERS`
merges `GET /api/users` into `adminSettings.users` — matched by display name (both sides share
the 8-name roster since the seed overhaul), matched rows keep local-only granular
role/twoFa/projectAccess and adopt the server id/email/active state; "Demo User" and other
unmatched local rows survive; unmatched server users get synthesized rows via the reverse role
map. `currentActorUserId` is remapped if its row's id changes. Writes: invite → `POST
/api/users` (shared dev password `relay-dev-2026` so the account can log in; RECONCILE by
email since the admin reducer generates its temp id internally), update/role-change → PATCH
with granular→`globalRole` compression, disable/reactivate → PATCH `isActive`. Email edits
stay local-only (server updateUser has no email field). The user sync 403s for
non-global-admin sessions — expected, panel falls back to the local mock. `/admin/roles` role
definitions stay entirely local (no backing table).

**5. Dashboard — deliberate no-op:** computes off now-synced reducer state; nothing to wire.
`DashboardService`/route currently unused by the frontend (flagged in the Phase 5 row).

**6. Defects — deferred to the Runs pass:** `run_defect_links` hangs off `test_run_cases`;
unusable until runs sync. `DefectsScreen.tsx` untouched.

**Files changed this pass:** new `apps/web/src/lib/relay/{plan,audit,user}-client.ts`;
`FreshProvider.tsx` (resolveEntityId, plan/user sync + reconcile actions, write-throughs);
`CasesScreen.tsx` (two follow-reconcile effects); `PlansScreen.tsx` (redirect follows key
reconciliation); `AuditScreen.tsx` (real fetch + live subtitle); `demo-model.ts`
(slugToPlanKey PLAN- prefix); `packages/db/services/TestPlanService.ts` (listPlans: exclude
archived, include caseIds).

**Verification — Claude sandbox (done):** `tsc --noEmit` clean both packages; `pnpm build`
clean (29/29 pages). Note: a full web `tsc --noEmit` run takes >45s cold in-sandbox — use the
`setsid` background pattern from the Cases section.

**Verification — Shaun local (THE gate now — covers Cases + this pass together):**

- [ ] Everything in the Cases checklist above (including confirming the two glitch fixes:
      duplicate a case → detail panel stays open through the ref flip; create a folder →
      selection sticks).
- [ ] Plans: seeded Demo plans ("Critical Path" 6 cases, "Full Regression" 13) appear with
      their case lists; create a plan → key flips TP-… → PLAN-…, URL follows, survives reload;
      edit queries → reload → resolved case list persisted (check `test_plan_cases` rows);
      delete a plan → gone locally, `status='archived'` in DB; duplicate a plan → real copy
      with its case list.
- [ ] Audit: real project shows live `case.*`/`plan.*` rows for actions just taken (actor
      names, refs, relative times); local project still shows demo events.
- [ ] Admin users (as Shaun/Noel — global admin): list shows the 8 real users with real
      emails; invite a user → row appears, exists in DB, can log in with `relay-dev-2026`;
      change a role → `globalRole` updates in DB per the compression map; disable/reactivate →
      `is_active` flips; as a viewer session the panel falls back to the mock (console warn,
      no crash).
- [ ] Dashboard: renders real case/folder-derived widgets for the Demo Project; run widgets
      still show local-run data only (expected until Phase 4).

## Phase 4 screen-wiring (Runs) — built (2026-07-09, final pass)

Started by a delegated agent (cut off mid-way by an org usage limit after completing the
DB layer + auth swap), finished directly. Files:

- `apps/web/src/lib/api/auth.ts` — session-first auth for `/api/runs/*` with dev-header
  fallback (see file header for the precedence note re /runs/api in a logged-in browser).
- `packages/db/src/runs/read.ts` — `listProjectRuns` now returns `cases: RunCaseResultItem[]`
  per run (live testCaseId, testRunCaseId, status, comment, assignee/executor, active
  defectRefs) — replaces the old aggregate-count query at the same total query count.
- `packages/db/services/TestRunService.ts` — new `updateRun()` + `RunUpdateError`
  (seal stamps sealedAt/By, reopen clears them, archive soft-hides; audited as
  run.sealed/run.reopened/run.archived/run.updated).
- `apps/web/src/app/api/runs/[runId]/route.ts` — new PATCH; `updateRunBodySchema` in
  schemas.ts; `RunUpdateError` mapping in errors.ts.
- `apps/web/src/lib/relay/run-client.ts` (new) — fetch/create/update/record-result +
  `realRunToLocal`/`realCreatedRunToLocal` adapters (`RUN-<nnnn>` refs as runKey — run URLs
  pass keys through verbatim, no slug fix needed; executions keyed by live case id).
- `FreshProvider.tsx` — runs in SYNC_REAL_PROJECT_DATA (merge keeps local description/
  executionLog/stepResults; dangling current-run selection cleared), `RECONCILE_RUN`,
  `runCaseIdsRef` (testCaseId→testRunCaseId per run, for result writes), write-through on
  updateExecution/spawnRunFromPlan/duplicateRun/seal/unseal/archive/delete/editRun;
  CREATE_RUN/DUPLICATE_RUN accept caller-supplied ids for reconcile.
- `RunsScreen.tsx` — ONE additive change: the not-found redirect follows runKey
  reconciliation via `resolveEntityId` (mirrors PlansScreen). No execution-UX changes.

**Documented gaps (all local-only, by design):** ad-hoc plan-less runs (server createRun
hard-requires a test plan — CasesScreen's "create run from selection" stays local);
per-step results + step comments; executionLog (no append-only transition table);
per-case assignee edits; run description. Duplicate-run divergence: the server snapshots
the plan's CURRENT case list, the local copy freezes the source's caseOrder.

**Verification — Claude sandbox (done):** tsc clean both packages; build clean (29/29).

**Verification — Shaun local (THE gate — includes the full protected-UX regression):**

- [ ] `/DEMO/testruns`: all 4 seeded runs appear (2 sealed historical, 1 half-executed
      active, 1 fresh) with real `RUN-<nnnn>` keys, statuses, result bars, defect chips.
- [ ] **Protected UX regression (critical, run in full):** P/F/B/S keys, arrow-key nav,
      auto-advance, detail open/close, status filter, run picker — all unchanged.
- [ ] Record results (P/F/B/S) in the active run → hard reload → persisted (check
      `test_run_cases.status`/`executed_by`/`executed_at` and audit rows).
- [ ] Spawn a run from a plan → URL follows the RUN-<nnnn> key flip; run exists in DB
      with snapshotted cases; execute a case in it.
- [ ] Seal → reload → still sealed (DB `status='sealed'`); reopen works; archive/delete
      → `status='archived'` in DB, gone from picker.
- [ ] `/runs/api` workspace still works logged-in (session auth wins) — note its dev-actor
      header picker is now overridden by the real session user when logged in.
- [ ] `pnpm api:validate` still passes (header fallback).
- [ ] Dashboard run widgets now show the seeded Demo runs' data.
- [ ] Defect chips on the two seeded failing cases render (from run_defect_links).

## Phase 3 — Test Plans backend: detailed checklist

Primary files per `plan.md`: `packages/db/services/TestPlanService.ts`,
`apps/web/src/app/api/**/plans/**`, `PlansScreen.tsx`. Modeled directly on Phase 2's
`TestCaseService.ts` shape.

- [x] **Service:** `packages/db/services/TestPlanService.ts` — `listPlans`, `getPlan` (joins
      `testPlanCases`+`testCases` for a full case list with title/ref/position), `createPlan`
      (transactional `PLAN-<nnn>` zero-padded ref generation, matching the seed's existing
      convention — unlike Phase 2's deliberately-unpadded case refs), `updatePlan` (patch),
      `setPlanCases` (wholesale delete+reinsert of `test_plan_cases` — the static-list equivalent
      of the frontend's dynamic query resolution), `archivePlan` (`status = 'archived'`, no
      separate `is_archived` flag needed since `test_plans.status` already has a 3-value enum).
      `TestPlanServiceError` codes: `PROJECT_NOT_FOUND`/`PLAN_NOT_FOUND`/`CASES_UNAVAILABLE`/
      `DUPLICATE_PLAN_REF`/`REF_COUNTER_TIMEOUT`/`TRANSACTION_FAILED`.
- [x] **Major design finding (documented in `known-bugs.md`'s GAP-01, not silently resolved):**
      the frontend's `TestPlan` model is dynamic/query-based (`queries: TestQuery[]`, case list
      recomputed live via `resolvePlanCases()`); the DB schema has zero storage for that —
      `test_plans` only relates to cases via the static `test_plan_cases` join table. This isn't
      an oversight: `TestRunService.createRun()` (already built, Phase 0) already hard-depends on
      `test_plan_cases` being pre-populated at spawn time, with no awareness of dynamic queries.
      `TestPlanService` therefore only supports the static-list model — whoever wires
      `PlansScreen.tsx` needs to decide whether to add a future `test_plan_queries` table or
      resolve queries client-side and call `setPlanCases()` with the result.
- [x] **Routes:** `apps/web/src/app/api/projects/[projectId]/plans/route.ts` (GET list, POST
      create), `.../plans/[planId]/route.ts` (GET detail, PATCH update, DELETE→archive),
      `.../plans/[planId]/cases/route.ts` (PUT → `setPlanCases`). Zod schemas: `createPlanBodySchema`,
      `updatePlanBodySchema`, `setPlanCasesBodySchema` — `projectId` from the route segment, same
      convention as Phase 2.
- [x] **`PlansScreen.tsx` wiring — DONE** (all-at-once pass; see that section above for detail).
- [x] **Verification — Claude sandbox:** `tsc --noEmit` clean for both packages; `pnpm build`
      succeeded with all 3 new routes present.
- [ ] **Verification — Shaun local:** not yet possible, same reasoning as Phase 2.
- [ ] **Documentation:** `user-guide.md`/`feature-flow.md`/`FRONTEND_CONTRACTS.md` not yet updated
      — deferred until the screen is wired, same reasoning as Phase 2.
- [ ] **Commit** — not yet committed.

## Phase 5 — Dashboard backend: detailed checklist

Primary files per `plan.md`: `packages/db/services/DashboardService.ts`,
`apps/web/src/app/api/**/dashboard/**`, `DashboardScreen.tsx`.

- [x] **Service:** `packages/db/services/DashboardService.ts` — `getDashboardSummary(actorId,
      projectId)` returns `activeRunCount`, `passRatePct`, `openFailureCount`,
      `unlinkedFailureCount` (failures/blocked with no `run_defect_links` row yet),
      `runCoveragePct` (distinct cases covered by an active run ÷ total non-archived cases),
      `totalCaseCount`, and a `resultBreakdown` (pass/fail/blocked/skip/notRun) — all computed
      from real tables (`test_runs`/`test_run_cases`/`run_defect_links`/`test_cases`).
      `DashboardServiceError` has only one code: `PROJECT_NOT_FOUND`.
- [x] **Deliberate scope decision:** the frontend Dashboard also shows widgets with zero backing
      data today — Requirements coverage, Milestones, and any historical trend-over-time chart
      (needs periodic snapshots this schema doesn't capture). All excluded this phase, same
      reasoning as Phase 2/3 excluding custom fields and dynamic plan queries.
- [x] **Route:** `apps/web/src/app/api/projects/[projectId]/dashboard/route.ts` (GET only — no
      new zod schema needed, no request body/query params).
- [x] **`DashboardScreen.tsx` wiring — resolved as deliberate NO-OP** (all-at-once pass): the
      screen computes off now-synced reducer state. `DashboardService`/route currently unused
      by the frontend — see the Phase 5 status-table row.
- [x] **Verification — Claude sandbox:** `tsc --noEmit` clean for both packages; `pnpm build`
      succeeded with the new route present.
- [ ] **Verification — Shaun local:** not yet possible.
- [ ] **Documentation:** not yet updated, same reasoning as Phases 2/3.
- [ ] **Commit** — not yet committed.

## Phase 6 — Defects + Audit backend: detailed checklist

Primary files per `plan.md`: `packages/db/services/AuditService.ts`, `DefectsScreen.tsx`,
`AuditScreen.tsx`. Also added (not in `plan.md`'s file list, but needed to fulfil the phase's
"real defect persistence" half): `packages/db/services/DefectService.ts`.

- [x] **`AuditService.ts` (new):** `recordAudit(input, tx?)` — thin reusable insert helper other
      services call inline, accepting an optional transaction client so the audit row commits
      atomically with its mutation (mirrors the ad-hoc pattern `ExecutionService.updateCaseResult()`
      already used inline for run results, just factored out so it isn't copy-pasted per
      service). `listAuditLog({ actorId, projectId, limit?, before? })` — project-scoped,
      RBAC-gated (`assertMinProjectRole(..., 'viewer')`) read, ordered newest-first, capped at 200
      rows.
- [x] **Audit retrofit into Phase 2/3 services** (mutations didn't write audit rows when first
      built — this phase closes that gap):
      `packages/db/services/TestCaseService.ts` — `createCase` records `case.created` (inside its
      existing transaction), `updateCase` records `case.updated` (inside its existing
      transaction), `archiveCase` records `case.archived` (no transaction existed there before or
      after — matches the function's original no-tx shape).
      `packages/db/services/TestPlanService.ts` — `createPlan` records `plan.created` (in-tx),
      `updatePlan` records `plan.updated` (no tx, matches original shape), `setPlanCases` records
      `plan.cases_set` (in-tx), `archivePlan` records `plan.archived` (no tx).
- [x] **`DefectService.ts` (new)** — manages `run_defect_links` only; **no new standalone
      `defects` table added this phase** (see file header for the full reasoning: the frontend's
      `DefectsScreen.tsx` models defects as first-class objects with severity/status/etc., which
      has zero backing table today — out of scope, same pattern as every other phase's
      exclusions). `listDefectLinks` (project/run/case-scoped, viewer+, defaults to active-only —
      `unlinked_at IS NULL`), `linkDefect` (contributor+, inserts + records `defect.linked` in one
      transaction), `unlinkDefect` (contributor+, soft-delete via `unlinked_at`/`unlinked_by`,
      records `defect.unlinked` — matches `run_defect_links`' documented "never hard-deleted, link
      history preserved" invariant). `DefectServiceError` codes: `RUN_NOT_FOUND`/`CASE_NOT_FOUND`/
      `LINK_NOT_FOUND`/`ALREADY_UNLINKED` (no `INSUFFICIENT_PERMISSIONS` — same
      `assertMinProjectRole()` pattern as Phase 2/3).
- [x] **Routing convention decision:** defect-link routes live under `/api/runs/[runId]/cases/
      [runCaseId]/defects/**` (flat, `resolveActor()` dev-header auth, `projectId` passed
      explicitly in the body/query) rather than nested under `/api/projects/[projectId]/...` —
      matching the existing sibling route `/api/runs/[runId]/cases/[runCaseId]/result/route.ts`'s
      convention, since defect links hang off the same `/api/runs/*` family. This is still safe
      without waiting for Phase 4: these are net-new, currently-unused routes, not a modification
      of the already-live `/api/runs/*` routes Phase 4 is deliberately leaving alone. The audit
      read endpoint, by contrast, lives at `/api/projects/[projectId]/audit` (nested,
      `resolveSessionActor()` real-session auth) — matching Phase 2/3/5's convention, since it's a
      project-level read with no run/case context.
- [x] **Routes:** `apps/web/src/app/api/runs/[runId]/cases/[runCaseId]/defects/route.ts` (GET
      list, POST link), `.../defects/[linkId]/route.ts` (DELETE → unlink, `projectId` as a query
      param since DELETE request bodies are unreliable across clients/proxies),
      `apps/web/src/app/api/projects/[projectId]/audit/route.ts` (GET). Zod schemas:
      `linkDefectBodySchema`, `unlinkDefectBodySchema`, `listDefectLinksQuerySchema`,
      `listAuditLogQuerySchema`.
- [x] **`packages/db/package.json` exports added:** `./services/audit`, `./services/defect`.
- [x] **`apps/web/src/lib/api/errors.ts`:** `DefectServiceError` import + status map
      (`RUN_NOT_FOUND`→404, `CASE_NOT_FOUND`→404, `LINK_NOT_FOUND`→404, `ALREADY_UNLINKED`→409) +
      `instanceof` branch.
- [x] **`AuditScreen.tsx` wiring — DONE** (all-at-once pass). **`DefectsScreen.tsx` — deferred
      to the Runs pass, deliberately** (run_defect_links is unusable until runs sync; see the
      all-at-once section above).
- [x] **Verification — Claude sandbox:** `tsc --noEmit` clean for both `@relay/db` and
      `@relay/web`; `pnpm build` succeeded — all 3 new routes present in the route table
      (`/api/projects/[projectId]/audit`, `/api/runs/[runId]/cases/[runCaseId]/defects`,
      `.../defects/[linkId]`), plus the earlier Phase 2/3/5 routes still present.
- [ ] **Verification — Shaun local:** not yet possible, same reasoning as Phases 2/3/5.
- [ ] **Documentation:** not yet updated, same reasoning as Phases 2/3/5.
- [ ] **Commit** — not yet committed.

## Phase 7 — Admin panel unification: note

No backend work needed or attempted this phase. Phase 1 already built everything
`/admin/users`/`/admin/roles` need (`UserService`/`ProjectService` + `/api/users/*` +
`/api/projects/*`) — this phase per `plan.md` is entirely "swap the `AdminSettings` localStorage
reads/writes for calls to those existing APIs," i.e. 100% screen-wiring with zero new backend
surface. Folded into the same deferred screen-wiring pass as Phases 2/3/5/6 rather than treated
as its own separate step — there's nothing backend-only to build or verify here.

## Phase 8 — Seed finalization + regression sweep + PR: DONE (2026-07-10)

- **Seed:** no further additions needed — the Demo Project seed (`119850a`) plus the 6 original
  projects give every wired module explorable real rows; Shaun re-ran `pnpm db:seed` after the
  ti.com email change and verified.
- **Regression:** Shaun's full local verification (all module checklists above, including the
  Runs protected-UX regression) is the branch's regression evidence — the Cowork sandbox has no
  browser/DB, so his pass replaces the usual Cursor QA-report sweep, per the verification
  constraint documented in `plan.md`.
- **Living docs synced:** `AS_BUILT_SNAPSHOT.md` (rewritten for the backend-backed reality),
  `FRONTEND_CONTRACTS.md` (new "Screen-wiring architecture + module APIs" section; Project API
  marked wired; banner convention updated), `user-guide.md` (intro/"Data sources" replaces the
  prototype caveat; local-only gaps + future-backend sections rewritten), `feature-flow.md`
  (routes data-state column, persistence model, RBAC table, feature status table).
- **PR description:** `docs/cursor-prompts/mvp-backend/pr-description-mvp-backend.md`, per
  `CLAUDE.md`'s MR format (Summary / What's included by feature area with linked SHAs /
  Caveats / Testing).

## Open questions / blockers

- **Phase 1 needs Shaun-local verification before being called fully done** — see the unchecked
  "Verification — Shaun local" line above. Nothing ambiguous or blocking; just needs a real DB.
- Sandbox note for future phases (not a blocker, just a gotcha worth knowing up front): don't run
  `pnpm install`/`pnpm build` directly against the mounted `Relay/` workspace folder — it fails
  with `EPERM` on pnpm's temp-file churn because that folder is write-once-per-file. Use the
  `rsync`-to-`/tmp` workaround documented in Part A's "Verification — Claude sandbox" line above.
- Sandbox note (new this session): `pnpm` was not on `PATH` in this session's sandbox instance
  (prior sessions apparently had it globally available). Found a working install left over from a
  prior session at `/sessions/trusting-awesome-bell/.npm-global/lib/node_modules/pnpm/bin/pnpm.cjs`
  and invoked it directly via `node <path> ...` rather than relying on a bare `pnpm` command — if a
  future session hits `pnpm: command not found`, check for a similar leftover global install
  before trying to reinstall pnpm from scratch via `corepack` (which itself failed with `EACCES`
  trying to symlink into `/usr/bin` in this sandbox).
- (Resolved) Phases 2/3/5/6 backends, the project picker, the Demo Project seed + cloning, and
  the hydration/double-redirect fixes are all committed (`7fc415e`, `2403930`, `119850a`,
  `4ca5bfa`, `47caed6`).
- (Resolved) Cases screen-wiring committed (`644f959`).
- (Resolved) Runs wired (Phase 4, final pass — see its section above). **Every screen is now
  wired**; remaining branch work is Shaun-local verification of everything, then Phase 8
  (seed check, regression sweep, PR description). DefectsScreen's first-class defect entities
  remain local-only (no defects table — permanent branch exclusion), though run defect links
  now sync into executions.
- **Shaun-local verification of ALL wired screens is the immediate next gate** — combined
  checklist in "Screen-wiring: the all-at-once pass" above. Phases 1/2/3/6/7 all carry
  unchecked "Shaun local" lines until then.

## Session log (append, don't rewrite)

- **2026-07-09 (scoping):** confirmed Phase 1 boundary + auth approach (NextAuth Credentials,
  JWT strategy) + bundling/checkpoint policy + deferred seeding with Shaun; drafted the 8-phase
  sequence and Phase 1's full spec as Cursor prompts.
- **2026-07-09 (pivot):** Shaun asked Claude to implement `mvp-backend` directly instead of
  drafting Cursor prompts, and to structure the work so it's resumable across multiple separate
  Claude (Cowork) chats. Repurposed the existing scoping output: `CLAUDE.md` updated with a
  branch-specific role exception + a sandbox verification-constraint note; old
  `docs/cursor-prompts/mvp-backend/` files marked superseded (kept as reference spec, not
  duplicated); this `plan.md`/`progress.md` pair created as the new resumable-state mechanism.
  **No implementation code written yet** — next session starts Phase 1, Part A.
- **2026-07-09 (Phase 1 implementation):** Implemented Parts A–F in full in one session (see
  checklist above for exact file state). Discovered and worked around a real sandbox constraint:
  `pnpm install`/`build` fail with `EPERM` when run directly against the mounted workspace
  folder (FUSE mount, write-once-per-file semantics) — 8 stray 0-byte temp files landed in the
  real `Relay/` folder from the first attempt before this was understood; cleaned up via
  `mcp__cowork__allow_cowork_file_delete`. Verification going forward uses a `/tmp` rsync copy
  instead. `tsc --noEmit` clean for both packages; `pnpm build` succeeded (29 app routes + 9 API
  routes, all typechecked and statically generated) once `NEXT_FONT_GOOGLE_MOCKED_RESPONSES`
  worked around the sandbox's separately-blocked Google Fonts network egress (unrelated
  pre-existing constraint, confirmed via direct `curl`). All Documentation-section files updated.
  **Not committed** — Shaun-local verification (real DB, real login flow, QA report) and a
  commit-identity confirmation are the two remaining items before Phase 1 is fully done.
- **2026-07-09 (seed/role overhaul):** Shaun asked to rename/expand seed users to 8 real names
  with specific roles, applied to both the DB seed and the frontend Admin mock panel. Implemented
  and committed as `4e5ad45` (see "Post-Phase-1 fixes" section above for the full file list).
- **2026-07-09 (all-phases backend push):** Shaun asked to "run all the phases to completion."
  Agreed a "backend-first" approach for the remaining 7 phases (see the standing-decision note
  near the top of this file). Built and Claude-sandbox-verified (typecheck + `pnpm build`, no live
  DB needed) the backends for Phase 2 (Test Cases — already done in a prior part of this same
  session), Phase 3 (Test Plans), Phase 5 (Dashboard), and Phase 6 (Defects + Audit, including
  retrofitting `recordAudit()` calls into Phase 2/3's existing mutation functions). Phase 4 (Test
  Runs wiring) deliberately skipped rather than half-done — explained in its status-table row
  above. Phase 7 confirmed to need no new backend at all. Phase 8 confirmed blocked on
  screen-wiring + Shaun-local access. Full per-phase checklists added above. This session also hit
  and worked around a `pnpm: command not found` sandbox quirk (see "Open questions / blockers").
  **Nothing from this session is committed yet.**
- **2026-07-09 (Cases screen-wiring):** Wired `CasesScreen.tsx` (+ folders) to the real API —
  the first screen through the reducer-sync/write-through architecture. New
  `apps/web/src/lib/relay/case-client.ts` (fetch fns + all frontend↔backend adapters + static
  seed-user id↔name map); `FreshProvider.tsx` gained `SYNC_REAL_PROJECT_DATA`/`RECONCILE_CASE`/
  `RECONCILE_FOLDER` reducer actions, a real-project sync effect, and optimistic write-through
  on `addCase`/`updateCase`/`replaceCase`/`deleteCase`/`addFolder` with temp-id→real-id
  reconciliation (including pending-create promise chaining for writes against
  not-yet-reconciled entities); `TestCaseService.listCases()` extended to return full
  `CaseDetail[]` so the screen doesn't need N+1 detail fetches. `CasesScreen.tsx` itself
  unchanged. Two known create-path UX trade-offs and the accepted failure-mode limitations are
  documented in the new "Phase 2 screen-wiring (Cases) — built" section, along with Shaun's
  local verification checklist (the immediate next gate). Claude-sandbox verified: `tsc
  --noEmit` clean both packages, `pnpm build` clean. Three new sandbox workarounds noted (pnpm
  reinstall via npm --prefix; exact-URL font mock; setsid for >45s builds). **Not yet
  committed.**
- **2026-07-09 (all-at-once pass):** Committed the Cases wiring as `644f959`, then per Shaun's
  "fix the glitches and wire everything else at once, speed this up" instruction: fixed both
  create-path glitches (provider `resolveEntityId` + two CasesScreen follow-reconcile effects),
  wired Plans (new `plan-client.ts`; GAP-01 resolved as queries-stay-local + client-resolved
  `setPlanCases` push; `slugToPlanKey` taught the PLAN- prefix; `listPlans` excludes archived +
  returns caseIds), wired Audit (new `audit-client.ts`, screen-level fetch with escaped display
  adapter), wired Admin users (new `user-client.ts`; name-matched SYNC_REAL_USERS merge;
  invite/update/role/disable/reactivate write-through with granular→globalRole compression),
  and documented Dashboard (deliberate no-op; DashboardService currently unused) and Defects
  (deferred to the Runs pass) decisions. Claude-sandbox verified: tsc clean both packages,
  build clean. Runs (Phase 4) is now the only remaining screen-wiring. Git-lock note: the FUSE
  mount can't unlink `.git/HEAD.lock`/`tmp_obj_*` files during commits — clean them via the
  file-delete permission tool after committing, or the next commit fails.
- **2026-07-09 (Shaun feedback + Runs, final pass):** Per Shaun's feedback: seed/admin/mock
  emails → `(initial)(surname)@ti.com`; purged all remaining fake-user references from code
  and demo data (team-users.ts's LEGACY_ASSIGNEE_MAP kept deliberately — it's the shim that
  *converts* legacy names to the 8-name roster); SYNC_REAL_USERS now drops stale unmatched
  local Admin users (fixes fake users lingering from old localStorage; Demo User + in-flight
  invites survive); prototype banner removed from all 13 screens + component deleted
  (committed `48d3f0e`). Assessments delivered in-chat: `?relay-reset=1` is localStorage-only
  (no API reset endpoint exists) and stays useful as a local-cache reset; DP = offline-only
  localStorage fallback project vs DEMO = the real seeded DB project (never coexist once the
  backend registers; recommend retiring DP in a later cleanup); tab-load slowness = Next.js
  dev-mode on-demand compilation + hydrate/sync waterfall (see chat/production-build advice).
  Then **Phase 4 (Runs) built** — see its section above. An org usage limit cut off the
  delegated agent mid-way (after read.ts/updateRun/auth.ts); finished directly in the main
  session. Claude-sandbox verified: tsc clean both packages, build clean (29/29).
- **2026-07-10 (verification + Phase 8 — branch complete):** Shaun verified everything locally
  (all module checklists incl. the Runs protected-UX regression) — no issues reported. Phase 8
  executed: living docs synced (`AS_BUILT_SNAPSHOT.md` rewritten, `FRONTEND_CONTRACTS.md`
  module-API section, `user-guide.md`/`feature-flow.md` updated to the backend-backed reality),
  PR description written at `docs/cursor-prompts/mvp-backend/pr-description-mvp-backend.md`.
  **Branch definition of done met: every fresh screen reads/writes the real API, login gates
  the app, the seeded Demo Project is explorable without manual setup. Ready for PR to
  `mvp-main`.**
- **2026-07-10 (data-layer hardening — post-review pass, Shaun's call after the planned-vs-actual
  architecture review):** Three commits. (1) **DP = the real seeded project** — Demo Project slug
  renamed `demo`→`dp` (URLs `/DP/...`, clones `dp-2...`; requires re-running `pnpm db:seed`), and
  the **localStorage-only fallback project is gone**: `buildInitialDemoState()` is empty,
  `mergeSeedRuns` is a passthrough, persisted local projects are stripped on load
  (`dropLocalProjects`), legacy demo-key migration skips real projects, and FreshProvider renders
  a connect/retry **BootGate** when no projects exist instead of faking one. (2) **Wait-for-server
  writes**: every create/update/delete across cases/folders/plans/runs/admin dispatches locally
  only after the API confirms — the entire temp-id reconciliation layer (idRemapRef,
  pendingRealCreatesRef, resolveEntityId, RECONCILE_CASE/FOLDER/PLAN/RUN + screen follow-effects)
  is deleted (net −226 lines); failed writes show dismissible error toasts; `updateExecution`
  (P/F/B/S) is the one optimistic path with manual rollback; new ADD_RUN action for
  server-created runs; create/duplicate callbacks are async and screens navigate with real
  server refs. (3) **Dashboard + perf**: KPI strip/donut now use the previously-unused
  `GET /api/projects/:id/dashboard` (new `dashboard-client.ts`; richer widgets still client-
  computed off synced state); sync gets a 30s freshness window per project (safe now that writes
  are server-confirmed); provider selector memos narrowed to their state slices for referential
  stability.
- **2026-07-10 (runs-for-all + clone keys + workspace reset — Shaun feedback):** (1) **Ad-hoc
  runs are real now**: `TestRunService.createRun()` takes an optional `testPlanId` — without a
  plan it snapshots directly from the supplied live case ids (`test_runs.test_plan_id` was
  already nullable; no migration). Provider `createRun`/`duplicateRun` create server runs in
  both flavors; the "local-only run" toast is gone; Dashboard/server summaries now count every
  run. (2) **Sequential clone keys**: `ProjectCloneService` default slug is now `dp2`, `dp3`, …
  (name "Demo Project 2", …) instead of a random suffix. (3) **Default workspace roster +
  reset**: seed now creates Demo Project (DP, fully seeded) + CTMS, eTMF, IAM, eFeasibility, GL
  — all EMPTY (Viewer/Reporting/API Gateway and their demo cases/plans removed); demo plan ids
  are stable in `ids.ts` and `seedRefs` points at the Demo Project so `pnpm api:validate` keeps
  working. New `WorkspaceResetService.resetWorkspace()` (global admin+) + `POST /api/admin/reset`
  + a confirm-guarded "Reset workspace…" item in the project switcher — wipes everything and
  restores the baseline (same as `pnpm db:seed`, but from the UI; also clears the local cache).
  Sandbox-verified: tsc clean both packages, build clean. **Shaun: re-run `pnpm db:seed` once**
  (new roster + stable demo plan ids), then ad-hoc run creation, DP2 clone keys, and the reset
  button are all exercisable. TanStack Query deliberately deferred (Shaun approved manual-in-provider now; the
  removal of reconciliation makes a future Query migration simpler). Docs updated (user-guide
  Data sources, AS_BUILT data architecture + routes). Sandbox-verified: tsc + build clean per
  stage. **Needs Shaun-local re-verification**: reseed, `/DP/...` URLs, create flows now wait
  for the server (brief pending feel), P/F/B/S unchanged, BootGate appears when DB is down.

## Candidate 1 — new DB tables for remaining local-only data (2026-07-10, in progress)

Plan + sequencing + resolved design decisions: `docs/claude/mvp-backend/candidate-1-new-tables-plan.md`.
Base hardening commits (`62565a0..f053a85`) **re-seeded + verified locally by Shaun** — gate
cleared. Shaun's directive: implement Phase A first, then run all phases (A→G) continuously,
stopping only for genuine blockers. Each phase: Claude implements + sandbox-verifies (tsc both
packages + `pnpm build`); **Shaun still owns all live-DB verification** (sandbox has no Docker),
including the full protected-UX Runs regression for any runs-touching phase. Nothing committed yet.

### Phase A — per-step results + run descriptions — **DONE (code + sandbox-verified), not committed**

- **Per-step results** (`run_step_results` existed but was fully unwired): new
  `ExecutionService.updateStepResult()` (contributor+ RBAC, validates the step snapshot belongs to
  the run case, UPSERTs on the `(testRunCaseId, stepSnapshotId)` unique constraint, `step_result.updated`
  audit row; `STEP_NOT_FOUND` added to `UpdateCaseResultErrorCode`). `listProjectRuns` now returns a
  `steps: RunCaseStepItem[]` layer per run-case (two batch queries, no N+1; status defaults `not_run`).
  New route `/api/runs/[runId]/cases/[runCaseId]/steps/[stepSnapshotId]/result` (POST, mirrors the
  sibling case-result route). `run-client.ts`: `steps` on `RealRunCaseResult`, `realRunToLocal`
  populates `stepResults` keyed by `originalStepId`, new `recordRealStepResult()`, exported
  `runStepSnapshotMap()`. `FreshProvider`: `runStepSnapshotIdsRef` built in the runs sync effect;
  `updateExecution` diffs `stepResults` and POSTs changed steps (fire-after-dispatch, skips unknown
  snapshot ids — optimistic/unsynced runs); `stepResults` removed from `mergeLocalOnlyRunFields`
  (server authoritative). Mapping seam: `originalStepId` (live step id, frontend key) ↔
  `stepSnapshotId` (what `run_step_results` references).
- **Run descriptions** (needed a migration — `test_runs` had no description column): added
  `description text` to `testRuns`; **migration `packages/db/drizzle/0002_run_description.sql`**
  (`ALTER TABLE test_runs ADD description text;`) + `_journal.json` entry, **hand-authored to match
  the repo's existing convention** (the drizzle `meta/` only has `0000_snapshot.json`; `0001` was
  also hand-authored with no per-migration snapshot, so `drizzle-kit generate` would emit a spurious
  migration re-including `0001`'s RBAC changes — deliberate deviation from "run generate"). Threaded
  `description` through `createRun`/`updateRun`, `listProjectRuns`/`RunListItem`, the create/update
  run body schemas, both run route handlers, `run-client` (list item + create/update bodies +
  `realRunToLocal`), and `FreshProvider` (`editRun`/create/duplicate/spawn write-through);
  removed from `mergeLocalOnlyRunFields`. No `DEMO_SCHEMA_VERSION` bump (both `stepResults` and
  `description` already existed on the persisted local shape).
- **Sandbox verification (done):** `tsc --noEmit` clean for `@relay/db` and `@relay/web`;
  `pnpm build` clean (29/29 pages), new step-result route present in the route table.
- **Shaun-local verification (still needed):** reseed; step ticks in a run persist to `run_step_results`
  and survive reload; a run description saved via edit persists; full protected-UX Runs regression
  (P/F/B/S, nav, auto-advance, filters) unaffected.
- **Sandbox note (new):** a prior session left `/tmp/relay-verify` + some `/tmp/*.log` owned by
  `nobody` (unremovable) — use alternate paths (`/tmp/relay-verify2`, repo-local logs); pnpm's
  global store is readonly here, so `pnpm install --store-dir /tmp/pnpm-store2` and invoke
  `tsc`/`next build` via their `node_modules/.pnpm/.../` JS entry points with `node` (the `.bin`
  shims hit "readonly database").

### Phase B — execution log / trends — **DONE (code + sandbox-verified), not committed**

Design decision (Shaun): (b) client-side aggregation from synced events FIRST; keep
`project-selectors.ts` computing from `executionLog`, now populated from real server events; a
later move to server-side aggregation is left easy but not done. **Why it mattered:** the
dashboard's `passedThisWeek`/`failedThisWeek`, `hasAnyExecutionHistory`, and per-case history
read `DemoRun.executionLog`, which came back EMPTY for synced runs — so those trends silently
didn't work for real projects. Phase B makes them real.

- New append-only table `run_case_events` (`id, testRunCaseId→test_run_cases cascade, actorId→users
  set null, event enum('created','result'), fromStatus, toStatus, at datetime`, index on testRunCaseId)
  + inferred types + relation. **Migration `packages/db/drizzle/0003_run_case_events.sql`** + journal
  entry, hand-authored per the 0002 convention.
- Events appended as side effects of existing writes (no new frontend write-through):
  `ExecutionService.updateCaseResult` inserts a `result` event inside its tx only when status
  changes; `TestRunService.createRun` batch-inserts a `created` event per run-case at spawn.
- `listProjectRuns` returns `events: RunCaseEventItem[]` per run (one batch query joined to
  `test_run_cases`, returns `actorId` not a name). `run-client.realRunToLocal` rebuilds
  `executionLog` from them (actorId→`userIdToAssigneeName`, statuses→`toExecStatus`). `executionLog`
  removed from `mergeLocalOnlyRunFields` (server authoritative).
- **Seed + clone backfill (critical for the demo):** `demo-project-seed.ts` now inserts
  `run_case_events` for the seeded runs — a `created` event per case + a backdated `result` event
  per executed case (`at`=backdated executedAt, to=final status) — so the two sealed runs (~18d /
  ~6d ago) produce a genuine 2-point week-over-week trend once synced. `ProjectCloneService` clones
  `run_case_events` (remapped ids).
- **Shape match confirmed** — the `ExecutionLogEntry` from `realRunToLocal` matches the selectors
  exactly (field names, ISO `at`, `from`/`to` always non-null `ExecStatus`, `created` events guarded);
  no `project-selectors.ts` change.
- **Deviation flagged:** `created` events store `fromStatus/toStatus='not_run'` (not null/null) to
  match the pre-existing `createRun` + local `ADD_CASES_TO_RUN` convention; selectors skip `created`
  events so it's functionally invisible (adapter defends both null and 'not_run').
- **Sandbox verification (done):** tsc clean both packages; `pnpm build` clean (29/29).
- **Shaun-local verification (still needed):** reseed (materializes the events); dashboard
  `passed/failed this week` + trend now reflect real synced runs; recording a result in a live run
  appends an event that survives reload; protected-UX Runs regression unaffected.

### Phase C — case comments (step + general) — **DONE (code + sandbox-verified), not committed**

One table `case_comments` (Shaun's decision) — comments on the test-case DEFINITION, distinct from
the still-untouched run-scoped `run_execution_comments`.

- New table `case_comments` (`id, testCaseId→test_cases cascade, testCaseStepId→test_case_steps set
  null NULLABLE [null ⇒ general, non-null ⇒ step comment], authorId→users set null, body text,
  createdAt`) + indexes + relations + inferred types. **Migration
  `packages/db/drizzle/0004_case_comments.sql`** + journal entry (hand-authored convention).
- `TestCaseService`: `addCaseComment({actorId,projectId,caseId,stepId?,body})` — contributor+ RBAC,
  asserts case/step belong to project, INSERT + `case_comment.created` audit in a tx, returns the
  comment; `listCases()`/`getCase()` now attach comments via ONE extra batch query (no N+1),
  splitting general (stepId null) onto the case and step-level onto the matching step. `CaseDetail`
  gained `comments`. Reused `TestCaseServiceError` (+`STEP_NOT_FOUND`→404).
- New route `/api/projects/[projectId]/cases/[caseId]/comments` (POST). `createCaseCommentBodySchema`
  `{ stepId ulid nullable optional, body min 1 }`.
- `case-client`: `RealCaseComment` DTO + `comments` on `RealCase`; `realCaseToLocal` splits them into
  `Case.generalComments` + per-step `CaseStep.comments` (authorId→`userIdToAssigneeName`, body→text,
  createdAt→timestamp, real id); new `addRealCaseComment(...)`.
- `FreshProvider`: `addStepComment`/`addGeneralComment` are now write-through (wait-for-server for
  real cases — mirrors `addCase`, avoids temp-id churn; session actor is the authoritative author,
  client sends no authorId; local-only projects keep pure client behavior); `ADD_*_COMMENT` actions
  accept a server id/createdAt; both comment arrays removed from `mergeLocalOnlyCaseFields`.
- **Shape parity confirmed** — both local `StepComment` and `CaseComment` are `{id,author,createdAt,body}`,
  every field maps from `(id, authorId→name, body, createdAt)`; no invented fields. Author outside the
  8-seed-user map (or null FK) renders `'Unknown'` — same known limitation as `assignee`.
- **Sandbox verification (done):** tsc clean both packages; `pnpm build` clean, new comments route present.
- **Shaun-local verification (still needed):** add a general + a step comment on a Demo Project case →
  survive reload (really in `case_comments`); author shows real name; `case_comment.created` audit rows;
  RunsScreen comment authoring unaffected. No `DEMO_SCHEMA_VERSION` bump.

### Phase D — requirements + case links — **DONE (code + sandbox-verified), not committed**

Greenfield (no table to reconcile) — the clean template for the entity+ref-counter+link pattern
Phase E reuses.

- Two new tables: `requirements` (`id, projectId→projects restrict, requirementRef unique-in-project,
  title, description, status enum(draft/approved/implemented/obsolete), createdBy, timestamps`) and
  `case_requirements` link (`testCaseId→test_cases cascade, requirementId→requirements cascade`, unique).
  **Migration `packages/db/drizzle/0005_requirements.sql`** + journal entry.
- New `RequirementService` (`listRequirements` viewer+, `createRequirement` contributor+ minting
  `REQ-<n>` via the `ref_counters` pattern copied from `generateCaseRef`, `linkRequirementToCase`
  idempotent, both audited) + exported `loadRequirementIdsByCase`. `TestCaseService.listCases/getCase`
  attach `requirementIds` via ONE batch query; `CaseDetail` gained `requirementIds`.
- Routes: `/api/projects/[projectId]/requirements` (GET/POST), `/api/projects/[projectId]/cases/[caseId]/requirements`
  (POST link — no unlink; UI has none). `requirement-client.ts` with status lowercase↔Capitalized
  adapters, requirementRef→requirementKey, source `'Local'`.
- `FreshProvider`: requirements folded into `SYNC_REAL_PROJECT_DATA`; `requirementIds` from synced case
  data; `requirementIds` removed from `mergeLocalOnlyCaseFields` + `addCase` override.
- **Deliberate narrow reconcile deviation:** the Cases/Requirements UI calls `createRequirement`
  **synchronously** then immediately links using the returned id, so `createRequirement` keeps its sync
  signature via a self-contained optimistic + `RECONCILE_REQUIREMENT` path (`pendingRequirementCreatesRef`
  tempId→Promise<realId> lets the immediate link await the in-flight create). This is the one place the
  temp-id/reconcile idea (removed in the hardening pass) is reintroduced, scoped to requirements. Phase E
  reuses this exact shape.
- **Known gaps (flagged, not blockers):** `ProjectCloneService` does NOT clone `case_requirements` (nor
  `case_comments` from Phase C) — "Create Demo Project" clones won't carry them; the seed also creates no
  requirements (RequirementsScreen falls back to its `STATIC_REQUIREMENTS`). Fold the clone gaps into the
  final cleanup pass (Phase B did clone `run_case_events`, so cloning `case_comments`/`case_requirements`
  for consistency is the tidy fix).
- **Sandbox verification (done):** tsc clean both packages; `pnpm build` clean, both new routes present.
- **Shaun-local verification (still needed):** create a requirement + link it to a case → survives reload
  (in `requirements`/`case_requirements`), key flips REQ-… , status maps correctly; audit rows. No `DEMO_SCHEMA_VERSION` bump.

### Phase E — defect entities — **DONE (code + sandbox-verified), not committed**

Decision (Shaun): (b) nullable `defect_id` FK on `run_defect_links`; internal "Local" defects become
first-class `defects` rows; EXTERNAL free-text `defect_ref` linking untouched. NO severity field
(frontend `Defect` has status only).

- New `defects` table (`id, projectId→projects restrict, defectRef unique-in-project, title,
  description, status enum(open/in_progress/resolved/closed) default open, createdBy, timestamps`) +
  a nullable `defect_id` FK added to `run_defect_links`. **Migration `packages/db/drizzle/0006_defects.sql`**
  (CREATE defects + ALTER run_defect_links) + journal entry.
- `DefectService` extended: `listDefects` (viewer+), `createDefect` (contributor+, `DEF-<n>` via
  ref_counters, `defect.created` audit); `linkDefect` gained optional `defectId` (validated in-project;
  internal links set BOTH `defectId` and `defectRef=DEF-<n>`; external path unchanged). New
  `/api/projects/[projectId]/defects` (GET/POST); the run-case defects link route threads an additive
  `defectId`. `defect-client.ts` with exact status map incl. `'In progress'`↔`'in_progress'`.
- `FreshProvider`: defects synced via `SYNC_REAL_PROJECT_DATA`; `createDefectFromExecution` (kept
  synchronous, returns `{defectKey}`) + `linkDefectToExecution` write-through reusing Phase D's
  optimistic-create-then-link `RECONCILE_DEFECT`/`pendingDefectCreatesRef` pattern (link via `runCaseIdsRef`).
- **Bonus fix:** `realRunToLocal` now maps internal defect refs → entity ids via a project ref-map, so
  `execution.defects` stores ids consistently on fresh-create AND post-reload (fixes an already-linked
  defect still showing in the Link-existing dropdown). No `read.ts` change needed.
- **Known gaps (same as C/D):** seed creates no defect entities (DefectsScreen falls back to `MOCK_DEFECTS`
  for real projects); `ProjectCloneService` doesn't deep-clone `defects` (defensively nulls `defect_id`
  on cloned links) — clone-completeness folded into the final cleanup pass.
- **Sandbox verification (done):** tsc clean both packages; `pnpm build` clean, new defects route present.
- **Shaun-local verification (still needed):** create a defect from a run-case execution → appears in
  DefectsScreen + on the execution, survives reload (in `defects` + `run_defect_links.defect_id`); external
  Jira-style ref linking still works unchanged; status maps exactly. No `DEMO_SCHEMA_VERSION` bump.

### Phase F — plan query definitions / GAP-01 — **DONE (code + sandbox-verified), not committed**

Decision (Shaun): **Option (a)** — it resolves GAP-01. Persist authored query DEFINITIONS server-side;
keep client-side resolution pushing the resolved case list to `test_plan_cases` (the run-spawn source of
truth, untouched). Not (b) (server-side re-resolution) — that would touch the protected run-spawn path.

- **Storage: single `query_definition json` (nullable) column on `test_plans`** (not a normalized
  `test_plan_queries` table — resolution stays client-side, so normalization buys nothing and adds risk).
  Server-side `TestQueryDefinition` types mirror the frontend `TestQuery` shape (documented deliberate
  coupling — the accepted (a) tradeoff). **Migration `packages/db/drizzle/0007_plan_query_definition.sql`** + journal.
- `TestPlanService` create/update persist `queryDefinition`; `listPlans`/`getPlan` return it; `setPlanCases`
  untouched. Permissive zod schema (round-trips `__unfiled__` + non-ULID case ids). `plan-client`:
  `realPlanToLocal` uses the stored definition as `queries` when present, falling back to the synthesized
  `q-server-*` static group only when null (seeded/legacy plans still render). `FreshProvider`: `updatePlan`
  (on queries change) + `duplicatePlan` send `queryDefinition` alongside the resolved-caseIds push;
  `mergeLocalOnlyPlanFields` reduced to a documented no-op (server authoritative for queries) → a fresh
  browser now gets real authored queries, not the synthesized group.
- Seed: both demo plans carry a `queryDefinition` (Full Regression = genuine folder query; Critical Path =
  faithful static snapshot — the frontend `TestQuery` model genuinely can't express its
  "priority-in-(crit,high) AND folder-in-(Auth,Checkout)" as one group: `QueryField` has no folder field,
  no multi-value operator, and groups UNION not AND — so a static snapshot is the faithful choice, NOT a
  round-trip failure). `ProjectCloneService` remaps `queryDefinition` ids through the clone id maps.
- **GAP-01 marked RESOLVED in `known-bugs.md`.** Residual (deliberate, the (b) property not done): plans
  don't auto-re-resolve server-side when cases change; `test_plan_cases` refreshes when the plan is next
  edited in a browser (same freeze-on-edit behavior as spawn).
- **Sandbox verification (done):** tsc clean both packages; `pnpm build` clean (29/29). No `DEMO_SCHEMA_VERSION` bump.
- **Shaun-local verification (still needed):** author a plan query in one browser → reload / different
  browser shows the same queries (not a synthesized static group) and resolves to the same cases; reseed →
  demo plans show real queries; run-spawn from a plan still works.

### Phase G — admin settings (role definitions + API keys) — **DONE (code + sandbox-verified), not committed**

Scope (Shaun): roles + API keys ONLY. Automation deferred (stays local). Custom fields excluded. Users +
project_roles already backed (untouched).

- Two org-scoped tables: `role_definitions` (`id, orgId→organisations cascade, name, description,
  permissions json, isBuiltIn, timestamps`, unique(orgId,name)) and `api_keys` (`id, orgId cascade, name,
  key_masked, created_by→users set null, plus project/permissions/expiration/lastUsed stored verbatim`).
  Real API-key secret management (hashing/one-time reveal) OUT of scope — stores the same masked display
  string the frontend shows. **Migration `packages/db/drizzle/0008_admin_roles_api_keys.sql`** + journal.
- New `AdminSettingsService` (GLOBAL admin RBAC like UserService, not project-scoped): role
  list/create/update/delete + api-key list/create/delete, all audited; built-in roles guarded from
  update/delete. Global routes `/api/admin/roles[/[roleId]]` + `/api/admin/api-keys[/[keyId]]` (mirror
  `/api/users/*`, sibling to `/api/admin/reset`). `admin-role-client.ts` + `admin-api-key-client.ts`.
- Seed: `admin-seed.ts` inserts the 7 built-in roles (`isBuiltIn`, permissions mirrored from `rbac.ts`) +
  8 demo API keys into the seed org (stable ids in `ids.ts`; `clear.ts` deletes them so reseed doesn't hit
  the unique constraint). **NOTE:** built-in role names/permissions in `admin-seed.ts` are a deliberate
  mirror of `apps/web`'s `rbac.ts` (can't import apps/web into @relay/db) — if `rbac.ts`'s built-in roster
  changes, this seed must track it (flagged in the file header).
- `FreshProvider`: `SYNC_REAL_ROLES`/`SYNC_REAL_API_KEYS` (merge into `adminSettings.roles`/`.apiKeys`,
  roles matched by name, keys by id, unmatched local rows preserved), global-admin-gated fetch effect (403
  → console.warn + mock fallback, same as users); write-through on role create/update/delete + api-key
  create/delete (wait-for-server, server id adopted immediately; built-in roles skip the server call).
  `admin-reducer` create actions accept a server override for id/maskedKey/createdAt/creator.
- **Round-trip fidelity:** `RolePermissions` round-trips via `emptyPermissions()` coercion (full 16-key
  shape); `userCount` is derived client-side (not stored), `isProjectLevel` IS stored. Every `AdminApiKey`
  field has a server home. The one soft spot (same class as `assignee`): frontend admin-mock creator ids
  (`admin-user-*`) aren't real `users` FKs — seeded keys map to real seed users where possible, else
  `created_by=null` with the `SEED_ADMIN_USER_ID` display fallback; after the user sync, new keys carry a
  resolvable real userId.
- **Sandbox verification (done):** tsc clean both packages; `pnpm build` clean, all four new admin routes
  present. (One typecheck bug caught + fixed mid-verify — an `isRealId` type-guard narrowing issue.)
- **Shaun-local verification (still needed):** as global admin, Admin → Roles/API keys show real seeded
  data; create/edit/delete a role + create/delete an API key survive reload (in `role_definitions`/`api_keys`);
  as a non-admin session the panel falls back to the mock (console.warn, no crash). No `DEMO_SCHEMA_VERSION` bump.

## Candidate 1 — overall status: ALL PHASES A–G CODE-COMPLETE + SANDBOX-VERIFIED, NOT COMMITTED

Migrations `0002`–`0008` (hand-authored, journal in sync). Every phase built on the prior; the Phase G
build (all phases present together) is the combined-verification evidence: `tsc --noEmit` clean for
`@relay/db` + `@relay/web`, `pnpm build` clean. **Shaun still owns all live-DB verification** — reseed
first (`pnpm db:seed`; migrations 0002–0008 must be applied), then walk each phase's Shaun-local checklist
above, INCLUDING the full protected-UX Runs regression (Phases A/B touch the runs read/write path).

**Deferred cleanup (not blockers — fold into a follow-up):**
- `ProjectCloneService` does NOT deep-clone `case_comments` or `case_requirements` (Phase E nulls
  `run_defect_links.defect_id`; Phase F DOES remap `queryDefinition`; Phase B DOES clone `run_case_events`).
  So "Create Demo Project" clones lose case comments / requirement links / defect entities. Moot for the
  default demo (the seed creates none of those on the source), but add for consistency when convenient.
- Seed creates no requirements or defect entities (those screens fall back to their static/mock lists for
  real projects) — add seeded examples if a richer demo is wanted.
- Living docs (`AS_BUILT_SNAPSHOT.md`, `FRONTEND_CONTRACTS.md`, `user-guide.md`, `feature-flow.md`) + the PR
  description are NOT yet updated for Candidate 1 — deliberately deferred until Shaun's live verification
  confirms end-to-end behavior, matching this branch's established "docs reflect verified behavior" pattern
  (see the Phase 2 Documentation checkbox note). Do this in the same pass that folds `62565a0..f053a85` +
  Candidate 1 into the PR description.
