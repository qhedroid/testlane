# `mvp-backend` — live progress

> Read this file first on any `mvp-backend` session, right after `CLAUDE.md` and
> `docs/claude/handoff.md`. This is the actual current state — trust this over chat history,
> which gets summarized/lost across sessions. Update it before ending any session that touched
> this branch, even a short one that only got partway through a phase.

Last updated: 2026-07-09 (session continues: after all 8 phases' backends were built, Shaun said
"let's try wiring all at once" — see "Screen-wiring architecture pivot" section below for the
reducer-sync/write-through approach this settled on, "Optimistic writes" for the write-flow
decision, and "Demo Project + cloning" for the new 7th project and its clone-on-demand feature.
Project-picker foundation is committed (`2403930`). Demo Project seed + clone feature are built
and typecheck/build-verified but **not yet committed** as of this update. Actual Cases/Plans/
Dashboard/Defects/Audit/Admin/Runs screen-wiring has not started yet — next concrete step.).

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

**Not yet built:** the actual sync-in / write-through wiring described above for Cases, Folders,
Plans, Defects, Audit. This is the concrete next step — see "Open questions / blockers" at the
bottom of this file.

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
| 2 — Test Cases backend | **Backend complete, Claude-sandbox verified** (`TestCaseService.ts` + `/api/projects/[projectId]/cases/*` + `/api/projects/[projectId]/folders/*`). **`CasesScreen.tsx` wiring NOT started** — see "Phase 2 screen-wiring note" below before attempting it. Not yet committed. |
| 3 — Test Plans backend | **Backend complete, Claude-sandbox verified** (`TestPlanService.ts` + `/api/projects/[projectId]/plans/*` + `.../plans/[planId]/cases`). `PlansScreen.tsx` wiring deferred (Shaun's "backend-first" call, see note above/below). Real design finding: the server has no equivalent of the frontend's dynamic `TestQuery`/condition-based plans — see `TestPlanService.ts`'s file header and `known-bugs.md`'s GAP-01. Not yet committed. |
| 4 — Test Runs wiring | **Deliberately skipped this session, not just deferred like the others.** Unlike Phases 2/3/5/6 (new, currently-unused routes), `/api/runs/*` is already live and depended on by `/runs/api` + `pnpm api:validate` — swapping its auth source (dev header → real session) without also updating `RunsScreen.tsx`/`/runs/api`'s caller in the same atomic change would actively regress working, already-shipped functionality, not just leave something unwired. Needs to happen as one verified change together with the protected three-pane execution UX, not as a backend-only slice. **No code written for this phase.** |
| 5 — Dashboard backend | **Backend complete, Claude-sandbox verified** (`DashboardService.ts` + `/api/projects/[projectId]/dashboard`). `DashboardScreen.tsx` wiring deferred. Scoped to only what real tables back today (`test_runs`/`test_run_cases`/`run_defect_links`) — Requirements coverage, Milestones, and results-over-time trend widgets have no backing data and stay out of scope, same reasoning as Phase 2/3's exclusions. Not yet committed. |
| 6 — Defects/Audit backend | **Backend complete, Claude-sandbox verified** (`AuditService.ts` + `DefectService.ts` + `/api/projects/[projectId]/audit` + `/api/runs/[runId]/cases/[runCaseId]/defects` + `.../defects/[linkId]`). `createCase`/`updateCase`/`archiveCase` (Phase 2) and `createPlan`/`updatePlan`/`setPlanCases`/`archivePlan` (Phase 3) retrofitted to call `recordAudit()` on every mutation. `DefectsScreen.tsx`/`AuditScreen.tsx` wiring deferred. No new standalone `defects` table added — see `DefectService.ts`'s file header for why `run_defect_links` alone is this phase's deliberate scope. Not yet committed. |
| 7 — Admin panel unification | **No new backend needed** — Phase 1 already built `UserService`/`ProjectService` + `/api/users/*` + `/api/projects/*`, which is everything `/admin/users`/`/admin/roles` need to read/write real data. This phase is ~100% screen-wiring (swap `AdminSettings` localStorage reads/writes for calls to the existing APIs), so it's entirely deferred to the screen-wiring pass along with Phases 2/3/5/6 — nothing to build backend-only here. **No code written this phase**, by design, not an oversight. |
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
- [ ] **`CasesScreen.tsx` wiring — NOT STARTED.** See "Phase 2 screen-wiring note" above.
- [x] **Verification — Claude sandbox:** `tsc --noEmit` clean for both `@relay/db` and
      `@relay/web`; `pnpm build` succeeded, all 4 new routes present in the route table.
- [ ] **Verification — Shaun local:** not yet possible — no screen calls these routes yet, so
      there's nothing to click through. Once `CasesScreen.tsx` is wired, needs the same
      login-as-different-roles + CRUD smoke test pattern as Phase 1.
- [ ] **Documentation:** `docs/product/user-guide.md`/`feature-flow.md`/`FRONTEND_CONTRACTS.md`
      not yet updated for the new case/folder endpoints (deferred until the screen is wired, so
      the docs reflect real, working behavior rather than an unwired backend slice).
- [ ] **Commit** — not yet committed.

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
- [ ] **`PlansScreen.tsx` wiring — NOT STARTED.** Deferred per the "backend-first" decision above.
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
- [ ] **`DashboardScreen.tsx` wiring — NOT STARTED.** Deferred per the "backend-first" decision.
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
- [ ] **`DefectsScreen.tsx`/`AuditScreen.tsx` wiring — NOT STARTED.** Deferred per the
      "backend-first" decision above.
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

## Phase 8 — Seed finalization + regression sweep + PR: note

Not attempted beyond a brief review this session — this phase's actual work (full regression
sweep across all fresh screens + `/admin/*`, PR description) fundamentally requires the screens to
be wired first (Phases 2/3/5/6/7's deferred work) and a live browser + Docker MySQL Claude's
sandbox doesn't have. Seed data check: `packages/db/src/seed/insert.ts` (pre-existing, Phase 0)
already seeds test cases/folders/plans per project, so `TestCaseService`/`TestPlanService` have
real rows to exercise via direct API calls today even before any screen is wired — no additions
made this session since nothing new consumes seed data yet. Full write-up (seed extension
decisions, regression checklist, PR description per `CLAUDE.md`'s MR format) deferred to when this
phase is actually picked up, after screen-wiring.

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
- **Six phases' worth of code (2, 3, 5, 6) plus this session's documentation updates are all
  currently uncommitted working-tree changes** — nothing beyond `b430e50`/`4e5ad45` has been
  committed. Needs a commit (or several) before ending the session, per `CLAUDE.md`'s
  commit-identity rule (per-commit env vars, not persisted git config).
- **Every phase's screen-wiring (Cases, Plans, Runs, Dashboard, Defects, Audit, Admin) is now the
  single remaining body of work** before `mvp-backend`'s branch-level "definition of done" is met.
  Recommendation, not yet acted on: wire one screen at a time, verify it locally with Shaun, then
  move to the next — see the "Phase 2 screen-wiring note" above for the fuller reasoning (real
  frontend/backend model mismatches were found for cases/plans that a screen-wiring pass has to
  actively resolve, not just mechanically swap the data source).

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
