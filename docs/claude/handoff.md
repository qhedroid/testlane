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
`mvp-backend` — standing up the real backend. Created 2026-07-09 off `mvp-main` (confirmed `mvp-visual-overhaul` merged via PR #19, `0e8ec98`). **Phase 1 (Foundation: auth/RBAC/User+Project API) committed (`b430e50`, `4e5ad45`).** Shaun then asked to "run all the phases to completion" — Phases 2 (Test Cases), 3 (Test Plans), 5 (Dashboard), and 6 (Defects+Audit) backends are now code-complete and Claude-sandbox-verified (typecheck + `pnpm build`, no live DB), but **not yet committed** and their screens are **not yet wired**. Phase 4 (Test Runs auth wiring) deliberately skipped this pass — see the "Phases 2/3/5/6 backend built" entry below for why. Phase 7 needs no new backend. Phase 8 blocked on the rest. Claude implements this branch directly (Shaun's instruction) instead of drafting Cursor prompts. Live state tracked at `docs/claude/mvp-backend/progress.md` (read this first — has the full per-phase checklists) and `docs/claude/mvp-backend/plan.md`; the original `docs/cursor-prompts/mvp-backend/` files are kept as reference spec only. See "2026-07-09 — mvp-backend Phases 2/3/5/6 backend built (all-phases push)" (top of this section), and below it "2026-07-09 — mvp-backend Phase 1 (Foundation) implemented", "2026-07-09 — Phase 1 post-commit fixes + seed user/role overhaul", "2026-07-09 — mvp-backend scoping session", "2026-07-09 — mvp-backend sequencing session — task-01 drafted", and "2026-07-09 — pivot to direct Claude implementation" for full history.

Previously: `mvp-visual-overhaul` — full-app Compass (TransPerfect) UI reskin, Phase 1 + Phase 2, **merged to `mvp-main`** via PR #19 (`0e8ec98`).

---

## 2026-07-09 — `mvp-backend` Runs wired (Phase 4 — final screen) + Shaun feedback round

Shaun feedback (committed `48d3f0e`): all user emails → `(initial)(surname)@ti.com` across
seed/admin/mock/README; every remaining fake-user reference purged from code and demo data
(LEGACY_ASSIGNEE_MAP kept as the legacy-name→roster conversion shim); Admin panel's stale
fake users fixed (SYNC_REAL_USERS drops unmatched locals except Demo User + pending
invites); prototype banners removed everywhere, component deleted.

**Phase 4 (Runs) built** — every fresh screen is now wired to the real backend. Auth:
`resolveActor()` is session-first with dev-header fallback (keeps `pnpm api:validate` +
`/runs/api` working; header overridden by session when logged in). Backend: `listProjectRuns`
returns per-case results + defect refs; new `updateRun()` + `PATCH /api/runs/[runId]`
(seal/reopen/archive/title/dueDate, audited). Frontend: new `run-client.ts`; runs join the
provider sync (`RUN-<nnnn>` refs as runKey); write-through on result recording,
spawn-from-plan, duplicate, seal/unseal/archive/delete, edit. Documented local-only gaps:
ad-hoc plan-less runs, per-step results, executionLog, run description. `RunsScreen.tsx`
changed only for URL runKey reconcile-follow — execution UX untouched, but the **full
protected-UX regression is part of Shaun's local verification checklist** in
`docs/claude/mvp-backend/progress.md` § "Phase 4 screen-wiring (Runs)". Sandbox-verified
(tsc + build). Next: Shaun-local verification of all wired screens, then Phase 8.

---

## 2026-07-09 — `mvp-backend` all-at-once screen-wiring (Plans, Audit, Admin users + glitch fixes)

Same session, after Cases landed (`644f959`): Shaun asked to fix the two create-path UX
glitches and wire everything else in one pass. Done: glitch fixes (provider `resolveEntityId`
+ CasesScreen/PlansScreen follow-reconcile effects), **Plans** (new `plan-client.ts`; GAP-01
resolved — queries stay local-only, resolved case lists pushed via `setPlanCases`; server
`PLAN-<nnn>` refs as planKey with `slugToPlanKey` taught the prefix), **Audit** (new
`audit-client.ts`, screen-level fetch of the real audit log with an HTML-escaped display
adapter), **Admin users** (new `user-client.ts`; real users synced into the Admin mock by
name-match; invite/role/disable write-through with granular→globalRole compression; role
definitions stay local). **Dashboard: deliberate no-op** (computes off synced reducer state;
`DashboardService`/route currently unused by the frontend). **Defects: deferred to the Runs
pass** (run_defect_links unusable until runs sync). Claude-sandbox verified (tsc + build).
**Runs (Phase 4) is now the only remaining screen-wiring.** Full detail + Shaun's combined
local verification checklist: `docs/claude/mvp-backend/progress.md`, "Screen-wiring: the
all-at-once pass".

---

## 2026-07-09 — `mvp-backend` Cases screen-wiring built (first screen on the real API)

Wired `CasesScreen.tsx` (+ folders) to the real backend — the first screen through the
reducer-sync/write-through architecture decided in the "wire everything" session. The screen
file itself is unchanged: a new `apps/web/src/lib/relay/case-client.ts` owns fetch functions
and all frontend↔backend adapters (priority/type casing, `assignee` name ↔ `assignedTo` ULID
via a static 8-seed-user map, unpadded server `TC-<n>` refs as caseKey), and
`FreshProvider.tsx` gained a real-project sync effect plus optimistic write-through on
`addCase`/`updateCase`/`replaceCase`/`deleteCase`/`addFolder` with temp-id→real-id
reconciliation. `TestCaseService.listCases()` now returns full `CaseDetail[]` (steps/tags/
preconditions) to avoid N+1 fetches. Custom fields/comments/requirement links stay
localStorage-backed (hybrid screen, by design). Claude-sandbox verified (typecheck + build);
**not yet committed**; Shaun-local verification is the next gate. Full detail, known UX
trade-offs, and the verification checklist: `docs/claude/mvp-backend/progress.md`, section
"Phase 2 screen-wiring (Cases) — built". Next screens: Plans → Dashboard → Defects/Audit →
Admin → Runs last.

---

## 2026-07-09 — `mvp-backend` Phases 2/3/5/6 backend built (all-phases push)

Shaun: "Can you run all the phases to completion?" — referring to the remaining 7 phases (2–8) in
`docs/claude/mvp-backend/plan.md`. Agreed approach given this sandbox has no Docker/browser:
**backend-first** — build and Claude-sandbox-verify every phase's *backend* (services + API
routes) this session, defer every screen's actual localStorage→API cutover to a later pass, so
all affected screens (Cases/Plans/Runs/Dashboard/Defects/Audit/Admin) get wired and regression-
tested together against Shaun's real Docker MySQL in one sweep instead of piecemeal/unverified.
Full per-phase detail (files, decisions, verification) is in `docs/claude/mvp-backend/progress.md`
— this entry is the short version.

**Phase 2 (Test Cases)** and **Phase 3 (Test Plans)** backends were already built earlier in this
session (see progress.md) — `TestCaseService.ts`/`TestPlanService.ts` + their nested
`/api/projects/[projectId]/{cases,folders,plans}/**` routes.

**Phase 4 (Test Runs wiring) deliberately skipped, not just deferred like the others:** unlike
Phases 2/3/5/6 (new, currently-unused routes — low-risk to add without a live DB to test against),
`/api/runs/*` is already live and depended on by `/runs/api` + `pnpm api:validate`. Swapping its
auth source (the dev `x-relay-user-id` header → real session) without also updating
`RunsScreen.tsx`'s caller in the same atomic, verified change would actively regress shipped,
working functionality — not just leave something unwired. This has to happen as one change
together with the protected three-pane execution UX, not as a backend-only slice.

**Phase 5 (Dashboard)** — new `DashboardService.ts` (`getDashboardSummary`) aggregating from real
tables (`test_runs`/`test_run_cases`/`run_defect_links`/`test_cases`) exactly what
`project-selectors.ts` currently computes client-side: active run count, pass rate, open/unlinked
failure counts, run coverage %, result breakdown. Deliberately excludes widgets with no backing
data yet (Requirements coverage, Milestones, historical trend charts) — same "match what's
actually backed today" principle as Phases 2/3. New route: `/api/projects/[projectId]/dashboard`.

**Phase 6 (Defects + Audit)** — new `AuditService.ts` (`recordAudit()` reusable insert helper +
`listAuditLog()` project-scoped read), retrofitted into every Phase 2/3 mutation
(`createCase`/`updateCase`/`archiveCase`, `createPlan`/`updatePlan`/`setPlanCases`/`archivePlan`)
since those didn't write audit rows when first built. New `DefectService.ts` manages
`run_defect_links` only (`listDefectLinks`/`linkDefect`/`unlinkDefect`) — **no new standalone
`defects` table added**; the frontend's richer defect model (severity/status/etc.) has zero
backing table today and stays out of scope, consistent with every other phase's exclusions.
Defect-link routes live under `/api/runs/[runId]/cases/[runCaseId]/defects/**` (matching the
existing sibling `/result` route's flat, dev-header-auth convention, since it's the same
`/api/runs/*` family — safe to add without touching Phase 4's live routes). Audit read lives at
`/api/projects/[projectId]/audit` (nested, real-session auth, matching Phases 2/3/5's convention).

**Phase 7 (Admin panel unification)** — confirmed to need **zero new backend**: Phase 1 already
built everything `/admin/users`/`/admin/roles` need. 100% screen-wiring, folded into the same
deferred pass as the others.

**Phase 8 (seed finalization + regression + PR)** — confirmed blocked on the rest; a real
regression sweep and PR description can't be produced before screens are wired and Shaun can click
through them locally. Reviewed existing seed data (already sufficient for the new backends to be
exercised via direct API calls); nothing added since no screen consumes it yet.

**Verified in-sandbox (all four phases together):** `tsc --noEmit` clean for both `@relay/db` and
`@relay/web`; `pnpm build` succeeded — every new route present in the route table
(`/api/projects/[projectId]/{cases,folders,plans,dashboard,audit}/**`,
`/api/runs/[runId]/cases/[runCaseId]/defects/**`), no live DB needed for any of it.

**Sandbox quirk hit this session:** `pnpm` wasn't on `PATH` (unlike prior sessions) — `corepack
enable`/`prepare` both failed with `EACCES` trying to symlink into `/usr/bin`. Found and reused a
leftover global pnpm install from a prior session
(`/sessions/trusting-awesome-bell/.npm-global/lib/node_modules/pnpm/bin/pnpm.cjs`, invoked via
`node <path> ...`) rather than fighting the install. Noted in `progress.md` for future sessions.

**Not yet done:** none of Phases 2/3/5/6's code is committed yet (still sitting as working-tree
changes alongside this session's documentation updates) — needs a commit before this branch's
state is durable. No screen has been wired to any of these new routes yet — that's the single
remaining body of work before `mvp-backend`'s branch-level definition of done is met, and the
recommendation (not yet acted on) is to do it one screen at a time with Shaun verifying each
locally, given the real frontend/backend model mismatches Phase 2/3's research already surfaced
(case ref format, priority/type casing, assignee-vs-assignedTo, the Test Plans dynamic-query gap).

---

## 2026-07-09 — `mvp-backend` scoping session

Shaun's ask: stand up the real backend and convert the fresh UI's localStorage-driven functionality onto it — not a single vertical-slice validation, but full conversion ("Everything. Right now we have a lot of frontend functionality. We're aiming to convert it all to backend functionality at once.").

**`CLAUDE.md` updated:** the "Phase: Frontend-only prototype" rule now scopes explicitly to "all branches except `mvp-backend`"; a new "Phase: Backend build (`mvp-backend` branch only)" section lists what's in/out of scope for this branch (see file). Claude's planning-only role is unchanged even for backend work.

**Branch state confirmed:** `mvp-visual-overhaul` merged (`0e8ec98`). Branches already merged into `mvp-main`: `mvp-dashboard-metrics`, `mvp-test-plans`, `mvp-requirements-defects-slice`, `rel-001-manual-runs-audit`, `mvp-further-planning`. Only `mvp-custom-fields` remains open/unmerged (schema v14→v15) — explicitly **ignored for this branch** per Shaun ("Forgot mvp-custom-fields for now").

**Prior art found in `/runs/api` — more built out than the docs implied, reuse rather than rebuild:**
- `packages/db/schema.ts` (1,381 lines) — 21 Drizzle MySQL tables, already close to `ARCHITECTURE_BASELINE.md`'s 20-table target (organisations, users, projects, projectRoles, folders, testCases, testCaseSteps, testPlans, testPlanCases, testRuns, testRunCases, runCaseStepSnapshots, runStepResults, runAssignees, runDefectLinks, runExecutionComments, auditLog, recentViews, savedFilters, attachmentsMetadata).
- `packages/db/src/rbac/assert-min-role.ts` — `assertMinProjectRole()` already implements the full role hierarchy + project-level override exactly per spec (`super_admin > admin > contributor > viewer`, effective role = max(global, project)).
- `packages/db/services/TestRunService.ts` (992 lines) and `ExecutionService.ts` (270 lines) — real run-spawn snapshot transaction and case-result recording, both audited.
- `packages/db/src/seed/index.ts` — seeds 6 real named users (Noel, Shaun, Monica, Nasir, Jamil, Arvindh — overlaps with the roadmap's "User Management" real-names ask) across 6 projects (CTMS, eTMF, Viewer, SSO/IAM, Reporting, API Gateway); CTMS has a plan (PLAN-001) with 4 cases.
- `docker-compose.yml` already runs both `mysql` and `opensearch` containers locally.
- `packages/db/src/opensearch/client.ts` — no-op stub only; no NextAuth dependency installed anywhere yet (checked `package.json` — auth is genuinely greenfield).

**Missing (build order, roughly dependency-ordered):** auth/session (no NextAuth, no login wiring — current dev-only header hack `x-relay-user-id`) → `ProjectService`/`TestCaseService`/`TestPlanService`/`UserService`/`DashboardService`/`AuditService` (only Test Run/Execution services exist today) → API routes for every module beyond `/api/runs/*` → wiring each fresh screen off localStorage onto the real API, module by module → a seeded, explorable "live" demo project backed by real DB rows (not a template clone) → Admin panel wired to real `users`/`project_roles`.

**Scope decisions locked in with Shaun:**
- **Infra:** local only. Docker MySQL/OpenSearch, real API, auth. No AWS/Terraform/ECS/Aurora on this branch — that's a distinct later phase.
- **Search:** defer real OpenSearch. Cmd+K and list search run on plain MySQL queries for now; the container + client stub stay as-is until a dedicated search-wiring pass.
- **Admin panel:** in scope. Unify Users/Roles management onto the real `users`/`project_roles` tables — this also resolves two known roadmap issues (`mvp-role-management`'s disconnected static/dynamic role systems; `mvp-user-management`'s fake admin-panel names) as a side effect, worth flagging when that work is actually scoped.
- **Custom Fields:** out of scope, don't touch.
- **Demo data:** the "live demo project" roadmap item (`mvp-live-demo-project`, previously `[~draft]`) is effectively subsumed by this branch's own end-state requirement — a seeded, explorable demo project backed by real data. Don't run that draft separately; fold it into `mvp-backend`'s seeding work.
- **Definition of done for this branch:** every fresh screen (Dashboard/Cases/Plans/Runs/Defects/Audit/Admin) reads/writes the real API; login/session gates the app; a seeded demo project is explorable without manual setup.

**Not yet decided / next session:** how to break "convert everything at once" into actual numbered Cursor tasks (sequencing within the branch, checkpoint cadence, first task's exact boundary). No `docs/cursor-prompts/mvp-backend/` files exist yet — next planning session should turn this into `task-01...` following the project's normal pattern, likely starting from auth/session per `ARCHITECTURE_BASELINE.md` §10's own "Phase 1 — Foundation, do not skip or reorder."

---

## 2026-07-09 — `mvp-backend` sequencing session — task-01 drafted

Turned last session's locked scope into an actual 8-task sequence and drafted task-01 in full. Prompts now live at `docs/cursor-prompts/mvp-backend/` (`_kickoff.md` + `task-01-foundation-auth-rbac.md`).

**Sequencing confirmed with Shaun before drafting:** task-01 boundary = auth/session + RBAC middleware + User/Project API, exactly the `ARCHITECTURE_BASELINE.md` §10 Phase 1 boundary — locked in as originally proposed, no change.

**Checkpoint cadence decided:** unlike `mvp-visual-overhaul` (always one task per Cursor session), this branch bundles small/low-risk tasks and keeps risky ones solo. task-01 (foundation), task-04 (Test Runs wiring — this branch's protected-UX-equivalent screen), task-07 (Admin RBAC unification), and task-08 (seeding + full regression + PR description) run solo. task-02+03 (Test Cases + Test Plans backend) and task-05+06 (Dashboard + Defects/Audit backend) are bundling candidates, same principle as the visual-overhaul task-03+05 experiment — actual bundling is a live per-session call, not locked upfront.

**Full 8-task sequence** (table + detail in `_kickoff.md`): task-01 Foundation (auth/RBAC/User+Project API) → task-02 Test Cases backend → task-03 Test Plans backend → task-04 Test Runs wiring (protected) → task-05 Dashboard backend → task-06 Defects/Audit backend → task-07 Admin panel unification → task-08 seeded demo project + full regression sweep + PR description.

**Auth approach decided with Shaun:** NextAuth.js + Credentials provider (per `ARCHITECTURE_BASELINE.md`'s primary recommendation) — Shaun noted IAM is the eventual real auth provider, this is an interim step. Given that, task-01 uses NextAuth's **JWT session strategy, not a DB adapter** — avoids standing up 3 new adapter-managed tables (`sessions`/`accounts`/`verification_tokens`) that would just get thrown away once IAM lands. This is a documented judgment call in task-01's Background, not silently assumed.

**Seeding timing decided:** deferred to a later task (task-08), not bundled into task-01 — task-01 stays focused on the auth/RBAC/API plumbing; the explorable seeded demo project lands once Test Cases/Plans/Runs services+routes actually exist to act on it, so seeded data isn't stubbed and un-usable in the interim.

**Task-01 concrete scope (full detail in the task file):**
- `next-auth` (v4, Credentials provider) + `bcryptjs` (not native `bcrypt` — avoids native-module build issues across the Docker/local split) added as new deps; neither existed anywhere in the repo before this (confirmed via `pnpm-lock.yaml` grep).
- Seed users (`packages/db/src/seed/insert.ts`) get real `passwordHash` values — all six share one local-dev password (`relay-dev-2026`), documented in a new README section.
- New: `packages/db/src/auth/verify-credentials.ts`, `apps/web/src/lib/auth/auth-options.ts`, `apps/web/src/app/api/auth/[...nextauth]/route.ts`, `apps/web/src/lib/api/session.ts` (`resolveSessionActor` — a **new, separate** helper from the existing header-based `resolveActor()` in `auth.ts`, which this task does not touch), `apps/web/src/middleware.ts` (route-level session gate, explicitly excludes `/api/runs/*` and `/api/health`).
- New services: `packages/db/services/UserService.ts`, `packages/db/services/ProjectService.ts`, both built directly on the existing `assertMinProjectRole()` in `packages/db/src/rbac/assert-min-role.ts` (reused, not reimplemented) — plus `/api/users/*` and `/api/projects/*` routes following the exact `/api/runs/*` route-handler shape (`resolveActor` → zod parse → service call → `jsonSuccess`/`handleRouteError`).
- `LoginScreen.tsx` (already built presentationally on `mvp-visual-overhaul` Phase 2, never wired) gets a real submit handler calling NextAuth's `signIn('credentials', …)`; new top-level `/login` route; `/[projectKey]/login` now redirects to it (mirrors the existing `/[projectKey]/settings` → `/admin` redirect precedent from task-07 on the visual-overhaul branch); minimal sign-out affordance added to `FreshTopbar.tsx` (none existed anywhere before).

**Deliberately supersedes a prior decision, flagged explicitly in the task file:** `mvp-visual-overhaul` Phase 2 decided the login page should be "a reachable route only… not a gate on app load." `mvp-backend`'s own definition of done requires login/session to gate the app, so task-01 reverses that specific call on purpose — the task's Documentation/QA-report instructions both call this out so it doesn't read as an accidental regression later.

**`/api/runs/*` explicitly untouched in task-01** — stays on the `x-relay-user-id` header hack until task-04, which is scoped separately specifically because it's the branch's one protected-UX screen and deserves its own regression pass when its auth source changes.

**Not yet drafted:** task-02 through task-08 remain at the `_kickoff.md` table level (scope + primary files only) — full per-file detail gets drafted when each is picked up, same pattern as `mvp-custom-fields`'s task-02/03 not yet being fleshed out beyond task-01.

---

## 2026-07-09 — Phase 1 post-commit fixes + seed user/role overhaul

**Committed:** Phase 1 landed as `b430e50` (authored/committed as Shaun Sevume — confirmed this session's git config already matched his identity, so no override needed; see commit-identity rule in `CLAUDE.md`).

**Bug found + fixed after commit:** Shaun reported `/login` CSS looked completely broken after getting the dev server running (separately, `next-auth/react` module-not-found was just a stale `pnpm install`, not a real bug). Root cause: `fresh.css` — a single global stylesheet, not scoped per-component — is only imported by `(app)/layout.tsx` and `admin/layout.tsx`. The new top-level `apps/web/src/app/login/page.tsx` (added in Phase 1, deliberately outside the `(app)` group since login has no project context) never imported it, so every `.login-*`/`.btn`/`.inp`/`.form-error` class rendered unstyled. Fixed by adding `import '@/fresh/styles/fresh.css'` directly to `login/page.tsx` — same pattern `admin/layout.tsx` already uses independently. Rebuilt clean.

**Seed user/role overhaul (Shaun's ask, same session):** Asked to rename/expand seed users and assign Admin-panel roles (Owner/Administrator/Run Manager/Run Executor/Editor/Viewer). Two ambiguities surfaced and were resolved via clarifying questions:
1. Those granular role names only exist in the frontend Admin mock model (`apps/web/src/fresh/data/rbac.ts`'s `AdminUserRole`) — the DB's `users.globalRole` enum only has 4 values (super_admin/admin/contributor/viewer). Shaun confirmed: update **both**.
2. Arvindh Chandran was named but not assigned a role in the initial ask — confirmed **Editor**.

**Discovered mid-task:** `apps/web/src/fresh/data/team-users.ts` already canonicalizes the exact 8-name roster (Noel Quadri, Shaun Sevume, Nasir Dipto, Monica Dayalani, Jamil Khan, Arvindh Chandran, Nadim Sharif, Syed Ahmed) as "the single source of truth for assignee/person names in the UI," with a `LEGACY_ASSIGNEE_MAP` already mapping old placeholder names (Marcus Webb, Priya Nair, James O'Sullivan, Aisha Rahman, Fatima Al-Amin, Alex Viewer) onto it — and `apps/web/src/fresh/data/seed.ts`'s demo case/run/defect/audit data already uses these 8 names throughout. This predates this session; it confirms the two systems that were *not* yet aligned were specifically the DB seed and the Admin mock panel, not the main fresh app.

**DB seed (`packages/db/src/seed/`):** Added Nadim Sharif (`nadim.sharif@relay-dev.local`) and Syed Ahmed (`syed.ahmed@relay-dev.local`) as two new seed users (`ids.ts` gets `users.nadim`/`users.syed`). Changed Nasir Dipto's `globalRole` from `admin` → `contributor` (Run Executor) and Arvindh Chandran's from `viewer` → `contributor` (Editor) — both are real permission changes, not cosmetic, flagged here so they're not mistaken for a bug later. Full compression mapping (DB has no 1:1 equivalent for the 6 granular roles):

| Person | Admin role | DB globalRole |
|---|---|---|
| Noel Quadri | Administrator | `super_admin` (unchanged — already satisfies "Administrator or above") |
| Shaun Sevume | Administrator | `admin` (unchanged) |
| Monica Dayalani | Editor | `contributor` (unchanged) |
| Nasir Dipto | Run Executor | `contributor` (changed from `admin`) |
| Jamil Khan | Run Executor | `contributor` (unchanged) |
| Arvindh Chandran | Editor | `contributor` (changed from `viewer`) |
| Nadim Sharif | Viewer | `viewer` (new) |
| Syed Ahmed | Run Manager | `contributor` (new) |

`README.md`'s "Local dev login" table updated with both columns side by side; `packages/db/src/seed/index.ts`'s console output updated to print both role systems per user.

**Frontend Admin mock (`apps/web/src/fresh/data/admin-initial-settings.ts`):** Replaced all 9 non-"Demo User" fake mock identities (Alice Chen, Bob Smith, Carol Jones, David Park, Eva Martinez, Frank Liu, Grace Kim, Jordan Lee, "Internal Bot") with the 8 real team members and their assigned roles; "Demo User" (Owner) left untouched per Shaun's "keep as Demo User" instruction. Reassigned the 4 mock API keys that referenced the removed fake user IDs (`alice-dev`→`noel-dev`, `bob-ci`→`monica-ci`, `carol-sync`→`arvindh-sync`, `eva-export`→`syed-export`) rather than leaving them dangling. Renamed the 3 stale `byUser` references in the mock audit log (Alice Chen→Noel Quadri, Bob Smith→Monica Dayalani, Carol Jones→Arvindh Chandran) so the audit trail doesn't reference nonexistent users. Side effect worth flagging: the removed fake users demonstrated "Pending invite"/"Silent created"/"Disabled" statuses in the Admin Users screen — all 8 real people are now "Active," so that status-variety demo is gone unless restored separately later. `Project Administrator` (a 7th built-in role, project-scoped) has 0 assigned users now — still a valid selectable role, just unused in this mapping.

Verified: `tsc --noEmit` clean for both packages, `pnpm build` succeeded (via the `/tmp/relay-verify` workaround) after this change too.

---

## 2026-07-09 — `mvp-backend` Phase 1 (Foundation) implemented ✅ — pending Shaun-local verification

Implemented Phase 1 (auth/RBAC/User+Project API) in full per `docs/cursor-prompts/mvp-backend/task-01-foundation-auth-rbac.md`'s Parts A–F, directly (per the pivot below). Full file-level detail and exact state is in `docs/claude/mvp-backend/progress.md` — this entry is the short version.

**What landed:**
- Real login: NextAuth.js Credentials provider, JWT session strategy (no DB adapter tables). All six seed users get a `passwordHash` (bcryptjs, cost 12), shared local-dev password `relay-dev-2026` (see `README.md`'s new "Local dev login" section).
- `apps/web/src/middleware.ts` — new route-level session gate. Every page route and most API routes now require a valid session; `/login`, `/api/auth/*`, `/api/health`, and `/api/runs/*` (explicitly, deliberately) stay exempt. `/api/runs/*` still uses the legacy `x-relay-user-id` header — untouched, as scoped, pending a later phase.
- `UserService`/`ProjectService` (`packages/db/services/`) + their routes (`/api/users/*`, `/api/projects/*`, `/api/projects/:id/roles`) — real session auth (`resolveSessionActor`, a new helper separate from the existing header-based `resolveActor()`) + real RBAC (global admin-or-above check for users; `assertMinProjectRole()` reused for project-role assignment). Not yet called by any fresh screen — that's later phase work (Admin panel unification, `ProjectSwitcher` wiring).
- `LoginScreen.tsx` wired to real `signIn()`; new top-level `/login` route; `/:projectKey/login` now redirects there (mirrors the `/:projectKey/settings` → `/admin` precedent); new `UserMenu.tsx` top-bar sign-out affordance.
- **Deliberately supersedes** `mvp-visual-overhaul` Phase 2's "login is a reachable route only, not a gate" decision — `mvp-backend`'s own definition of done requires this reversal; called out explicitly so it doesn't read as an accidental regression.

**Documentation updated:** `README.md`, `docs/product/user-guide.md`, `docs/product/feature-flow.md`, `docs/_authoritative/AS_BUILT_SNAPSHOT.md`, `docs/_authoritative/FRONTEND_CONTRACTS.md` (new Login/User-API/Project-API contract sections) — all per the task spec's Documentation section.

**Sandbox constraint discovered this session (documented in `progress.md` for future phases):** `pnpm install`/`build` cannot run directly against the mounted `Relay/` workspace folder — it's a FUSE mount with write-once-per-file semantics, and pnpm's temp-file churn hits `EPERM`. Worked around by `rsync`-ing to a `/tmp` scratch copy for verification only (real source edits still go through Edit/Write on the real path as normal). A related but separate constraint: the sandbox's network egress blocks `fonts.googleapis.com`, which fails `pnpm build` on `next/font/google` unless `NEXT_FONT_GOOGLE_MOCKED_RESPONSES` is set for the verification build — confirmed via direct `curl` that this is a pre-existing sandbox limitation, unrelated to this diff.

**Verified in-sandbox:** `tsc --noEmit` clean for `@relay/db` and `@relay/web`; full `pnpm build` succeeded (29 app routes + 9 API routes compiled and statically generated, 55.2 kB middleware chunk).

**Not yet verified (needs Shaun, locally, against real Docker MySQL):** `pnpm db:seed` prints the new credential block; logged-out redirect works; login as `shaun.sevume@relay-dev.local` / `relay-dev-2026` lands on `/DP/dashboard`; sign-out works; `GET /api/users` 403s as viewer / 200s as super_admin; `POST /api/projects` 403s as contributor / 201s as admin; `/api/runs`/`/DP/testruns` unaffected.

**Not yet committed** — waiting on the above local verification, then a commit-identity confirmation per `CLAUDE.md`'s commit-identity rule, before this lands as a real commit.

**Next:** Shaun runs the local verification above and reports back; once confirmed, commit Phase 1 and move to Phase 2 (Test Cases backend) per `docs/claude/mvp-backend/plan.md`.

---

## 2026-07-09 — pivot to direct Claude implementation

Shaun: "For this task of backend work, I want you (Claude) to do it, not Cursor... plan accordingly and write to files such that this can be worked on across multiple Claude chats if required."

This reverses the project's global "Claude is a planning/prompt-drafting assistant, not an implementer" rule — but only for `mvp-backend`, and only because Shaun explicitly asked, which `CLAUDE.md`'s own role section already carves out as the one legitimate exception. Every other branch keeps the default Cursor-prompt-drafting role unchanged.

**What changed:**
- `CLAUDE.md`'s "Phase: Backend build" section rewritten: Claude implements this branch directly now, not Cursor. Added a pointer to `docs/claude/mvp-backend/` as the new session-continuity mechanism, and a new bullet in "Claude-specific files" pointing there. Added a bullet to "Cursor prompt organisation" flagging `mvp-backend` as the one exception to that whole section.
- `docs/claude/mvp-backend/plan.md` (new) — durable plan: same 8-phase sequence as `docs/cursor-prompts/mvp-backend/_kickoff.md`, reframed for Claude-executed multi-session pacing instead of Cursor's per-session bundling model. Phase dependency column added (wasn't needed for the Cursor version since Cursor ran phases back-to-back in order anyway; matters more now that any phase could start in a fresh chat with only this file for context).
- `docs/claude/mvp-backend/progress.md` (new) — the actual live-state file. Per-phase status table + Phase 1's Parts A–F broken into a checkbox checklist (all unchecked — no implementation code written yet) + a running session log. **This is the file to read first** on any future `mvp-backend` session; it's designed so a fresh Claude chat with zero memory of this conversation can see exactly what's done, what's next, and any open blocker, without re-deriving anything from chat history.
- `docs/cursor-prompts/mvp-backend/_kickoff.md` and `task-01-foundation-auth-rbac.md` — both got a short banner marking them superseded *as Cursor prompts*. Their technical content (the phase table, and task-01's full Background/Parts A-F/Verification/Documentation/Out-of-scope spec) is unchanged and still the real spec Claude works from — not duplicated into the new files, just pointed to, to avoid maintaining two copies of a 25KB spec.

**New constraint surfaced and documented (in `CLAUDE.md` and `plan.md`):** Claude's Cowork sandbox has Node but no Docker and no `pnpm` pre-installed — it cannot reach the local MySQL/OpenSearch containers `docker-compose.yml` defines. Split going forward: Claude verifies what it can in-sandbox (installs, `pnpm build`/typecheck without a live DB); anything needing a real DB connection (`pnpm dev`, login flow, seed script, API responses, the mandatory QA smoke test) needs Shaun to run locally and report back. `progress.md`'s checklist has separate "Claude sandbox" and "Shaun local" verification lines per phase for exactly this reason — don't mark a phase done with only one of the two checked, unless Shaun explicitly waives the local check.

**Not yet done:** no implementation code written. Next session starts Phase 1 (auth/RBAC/User+Project API), Part A (dependencies/env vars) — see `docs/claude/mvp-backend/progress.md`'s checklist for the exact starting point.

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

**2026-07-08 actuals (calibrating the sizing model as tasks run):** measured Cursor usage per session
so far — task-01 (foundation + shell, ~1,150 lines across 7 files, 2 original tasks merged) 46%;
task-02 (Dashboard + remaining screens, ~2,250 lines across 14 files, 2 original tasks merged) 41%;
task-03 + task-05 run together in one session as an explicit experiment (Test Cases + Test Plans,
~4,074 lines combined — the two largest of the four remaining solo-sized tasks) 41%. All three
sessions land in a tight 41–46% band regardless of file count or line volume, which is a stronger
signal than line-count sizing alone predicted: usage looks dominated by fixed per-session overhead
(reading `_kickoff.md`, `pnpm build`/`pnpm dev`, the smoke-test sweep) rather than scaling with
content size within this range. Decision: bundle the two remaining tasks — task-04 (Test Runs,
protected UX) and task-06 (Admin, plus the branch's final regression sweep + PR description) — into
one final combined session too, run back-to-back the same way (no new merged file; Cursor is just
pointed at both existing task files in one prompt, same pattern as the task-03+05 session). One
caveat worth keeping in mind regardless of the token-budget headroom: task-04 is the branch's one
protected-UX screen, so its own "protected-UX regression (critical)" verification step should still
get the same careful attention it would if run alone — token safety margin doesn't reduce the
behavioural-regression risk on that screen.

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

**Next:** task-04 (Test Runs) — done; task-06 (Admin) — done. Phase 1 complete; see "2026-07-08 Phase 2" below for what's next on this branch.

---

## Completed work — `mvp-visual-overhaul` (task-04) ✅

**Schema:** unchanged (v14). Presentational CSS only — protected UX untouched.

| What it delivered |
|-------------------|
| Test Runs reskin — `prototype-runs.css` token polish: result buttons (blocked dark-on-amber), Compass keycaps, pane/case/tab/step radii, popover shadows; scoped `.runs-v12` active-case accent-lt + left accent |
| Protected UX verified unchanged (Playwright): auto-advance, P/F/B/S + arrow keys, detail open/close, status filter, `/runs/api` untouched |

**Next:** task-06 (Admin) — done; see task-06 section below.

---

## Completed work — `mvp-visual-overhaul` (task-06) ✅

**Schema:** unchanged (v14). Presentational CSS only.

| What it delivered |
|-------------------|
| Admin reskin — sidebar white-chip active (matches main shell), Compass form chrome (34px inputs, focus rings), table/badge/card/modal tokens, toggles → `--pass`, selected rows → `--accent-lt` |
| Branch wrap-up: full 19-route regression sweep PASS; PR description at `docs/cursor-prompts/mvp-visual-overhaul/pr-description-mvp-visual-overhaul.md` |

**Branch status:** `mvp-visual-overhaul` Phase 1 (tasks 01–06) complete and committed. **Not opening a PR yet** — see "2026-07-08 Phase 2" below.

---

## 2026-07-08 Phase 2 — Compass IA/layout overhaul (kept on this branch)

Shaun reviewed the Phase 1 (pure-reskin) result and requested a much larger follow-on pass: adopt more of the mockup directly rather than just its colours/type. This is explicitly **not** a pure re-skin anymore — it includes new screens, sidebar/topbar structural changes, and rebuilding several screens from the mockup. Deliberately kept on `mvp-visual-overhaul` rather than split into a new branch (Shaun's call, weighed against the recommendation to branch since this breaks the Phase 1 charter's "zero behaviour change / no new screens" rules).

**Decisions locked in:**
- Continue on `mvp-visual-overhaul`, no new branch. Phase 1's "branch complete" status and PR description are superseded until Phase 2 also lands.
- Sidebar's current "Pinned Modules" section (eTMF Module, API Gateway, Add shortcut) — not in the mockup at all — is **removed**, not kept.
- Login page is a **reachable route only** (`/login` or similar), not a gate on app load — no change to how the app is entered today, just an additional static page matching the mockup 1:1.
- Font: Gotham SSm licensed woff2/woff files were found already embedded (base64) inside `mockup/Relay Compass Reskin Mockup.html` itself (real Hoefler & Co. files, TransPerfect-supplied, per the mockup's own header comment) — extracted directly into `apps/web/public/fonts/gotham-ssm/`, `fresh.css` `@font-face` rules updated with woff fallback, stale TODO removed, `design-system.md` updated. No more Open-Sans-fallback caveat.

**Critical risk flagged for the task prompts (read before drafting task-07+):** several of Shaun's per-screen asks say "abandon ours completely" / "implement as-is from the mockup" (Dashboard, Defects, Audit, Test Plans). The mockup's own content is static demo data. Confirmed by reading the code:
- `DashboardScreen.tsx` computes every widget live from `FreshProvider` (the `mvp-dashboard-metrics` work) — **must not** be replaced with the mockup's hardcoded numbers ("342 test cases" etc.); adopt its layout/component structure only, re-wire to the same live data.
- `DefectsScreen.tsx` reads `activeDefects` from `useFresh()` (real local defects), merged with a static mock list — same rule: layout from mockup, real data underneath.
- `AuditScreen.tsx` is already static (`AUDIT_EVENTS` from `data/seed`), so swapping to the mockup's own static demo audit rows is low-risk.
- Test Plans/Test Cases already compute live from `FreshProvider`; Shaun's own notes for those are more surgical/hybrid already, lower risk of this trap.

This must be a standing rule in every relevant task-07+ prompt: **mockup markup + real app data, never mockup's static numbers wholesale.**

**Mockup research findings (from decoding `mockup/Relay Compass Reskin Mockup.html`'s self-contained bundle):**
- Sidebar nav order/labels (mockup uses sentence case, e.g. "Test cases" — Shaun wants Title Case, an intentional deviation, not a copy-mockup-verbatim item): Dashboard, My work, [Testing] Test cases/Test plans/Test runs, Milestones, [Traceability] Requirements/Defects/Reports/Audit history, AI Studio. No Integrations entry (confirms removal).
- Global top bar (search, New test case, New test run, AI Studio, Notifications, Help) renders once outside any per-screen conditional — confirms it's safe to freeze it identically across screens; each screen keeps its own local page-head for screen-specific actions.
- "Project settings" in the mockup is a single sidebar item (bottom cluster, near collapse) opening one page with an embedded admin-subnav panel — different from the app's real behaviour of swapping the whole global sidebar into an admin nav. Shaun wants to keep the app's real swap-sidebar behaviour, only restyle the content per the mockup.
- Test Runs mockup includes the actual Pass/Fail/Blocked/Skip buttons and P/F/B/S/↑↓/? keyboard-shortcut legend — structurally close to the protected three-pane workspace, lower risk than initially assumed, but Cursor must still wire mockup markup onto real handlers and run the full protected-UX regression check.
- Test Cases mockup's case list has real underlying mock data with titles/steps/owners — it just needs to be viewed in an actual browser (not read as raw markup) to see populated rows; no separate written spec needed.
- My Work / Milestones / Requirements / Reports / AI Studio are all genuinely new but, like the rest of this mock app, are static/demo-only underneath (AI Studio's "Generate" flow has no real backend call) — safe to build as visual-only shells with hardcoded mock content, consistent with the app's existing frontend-only/demo-data pattern.

**Task-07…13 drafted** at `docs/cursor-prompts/mvp-visual-overhaul/` (7 Cursor sessions, confirmed with Shaun before drafting): task-07 shell (sidebar/topbar/route stubs) → task-08 six new screens (Login, My Work, Milestones, Requirements, Reports, AI Studio) → task-09 Dashboard → task-10 Test Cases (hybrid) → task-11 Test Plans → task-12 Test Runs (protected) → task-13 Defects+Audit+Project Settings (bundled) + branch-wide final wrap-up. `_kickoff.md` §9 has the full Phase 2 ruleset (supersedes several Phase 1 rules — read before task-07).

**2026-07-08 Phase 2 actuals (calibration in progress):** task-07 (shell, solo) **~48%**; task-08 (six new screens, bundled) **~55%**; task-09 (Dashboard rebuild, real data wiring, solo) **~50%**; task-10 (Test Cases hybrid — toolbar relocation + pane restyle, solo) **~54%**; task-11 (Test Plans — full layout rebuild, `resolvePlanCases()`/query logic preserved, solo) **~47%**; task-12 (Test Runs, protected UX, solo) **~61%** — a real outlier, above every prior point including task-08's bundled 55%, breaking the "solo tasks stay in a 47–54% band" read from five points in.

**2026-07-09 concern re: task-12's protected-UX sign-off.** The task-12 prompt required an explicit "protected UX behaviour verified unchanged" note in the QA report (mirroring Phase 1 task-04, whose handoff entry explicitly listed "Protected UX verified unchanged (Playwright): auto-advance, P/F/B/S + arrow keys, detail open/close, status filter, `/runs/api` untouched"). Task-12's own handoff entry only says "QA: build PASS; `/DP/testruns` + core regression routes PASS" — no explicit mention of the P/F/B/S/auto-advance/keyboard-shortcut checks actually being run, despite the task file marking this "critical, run this in full." Given usage hit the highest number recorded (61%), this is exactly the token-thin scenario the standing instruction was written for (prioritize the regression check over visual polish if usage runs high) — the gap in documentation doesn't confirm the check was skipped, but it doesn't confirm it was run either. Claude spot-checked the code diff: the `keydown` listener and its surrounding logic in `RunsScreen.tsx` show no removed/altered lines in the task-12 diff, which is a good sign at the code level, but this is not a substitute for Shaun (or a Cursor session) actually exercising Pass/Fail/Blocked/Skip + arrow-key navigation + auto-advance on `/DP/testruns` and checking `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md` for the explicit sign-off line. **Recommend verifying this before treating task-12 as fully done**, independent of what happens with task-13.

**Resolved 2026-07-09:** Shaun manually verified task-12's protected UX on `/DP/testruns` himself (P/F/B/S, auto-advance, arrow keys) and confirmed it's fine. Task-12 treated as fully done.

**2026-07-09 task-13 sizing concern.** task-13 as currently scoped is not just 3 screens — it also carries the *entire* branch final wrap-up: a full regression sweep across every route touched in both phases (~13 routes + all `/admin/*` sub-pages), a re-confirmation of protected Test Runs UX "one more time," a full PR description rewrite covering both phases, and the final `handoff.md` branch-complete update. Phase 1's equivalent (task-06) bundled "Admin reskin + 19-route regression sweep + PR description" as its own **solo** task. Stacking task-13's 3 screens *in front of* that same scale of wrap-up work, right after task-12 (solo) already spiked to 61%, is a real risk of the session running token-thin exactly when the final regression sweep and PR description need full attention. **Decided 2026-07-09:** Shaun opted to run task-13 as-is, bundled (3 screens + full wrap-up, one session) — a deliberate, informed call given the sizing concern above, not an oversight. If this session reports high usage or the final regression sweep / PR description look rushed, that's the first place to check.

**Result:** task-13 landed at **~54%** — back within the solo band, not a repeat of task-12's spike, despite carrying 3 screens plus the full branch wrap-up. Bundling didn't cost as much here as feared. **Full Phase 2 calibration set (all 7 tasks):** 48, 55, 50, 54, 47, 61, 54 — one clear outlier (task-12, 61%, the protected/most structurally complex screen), everything else in a 47–55% band regardless of solo vs. bundled. Takeaway for any future Phase 3-style work on this app: budget ~50–55% per session as the norm, treat screens with heavy behavioural/keyboard complexity (not just visual complexity) as the real risk factor for spikes, not bundle size or line count alone.

**Claude review of task-13 (2026-07-09):** commit `ffb0411` checked out clean — Defects preserves live `activeDefects` + `MOCK_DEFECTS` merge (no data-trap regression), Audit keeps its page header and filter tabs as instructed, admin polish touched only `admin.css`/`SettingsScreen.tsx` styling with no RBAC/CRUD changes. Fixed one loose end in `pr-description-mvp-visual-overhaul.md`: the task-13 commit entry had a `(pending commit — task-13)` placeholder instead of a linked SHA (written before the commit existed) — updated to link `ffb0411`.

**Gap found and being fixed:** `docs/product/user-guide.md` and `docs/product/feature-flow.md` were last updated at task-08 (new screens/routes) and **not touched by task-07, 09, 10, 11, 12, or 13** — despite `CLAUDE.md`'s mandatory living-docs rule ("update both when changing user-visible behaviour, routes, ... or module flow"), which should have applied to task-07's nav/sidebar restructuring and every task-09–13 screen rebuild. Root cause: several Phase 2 task files (07, 09–13) never included a "Documentation" section instructing Cursor to update these files — a gap in the task prompts as drafted, not a Cursor execution slip. Confirmed specific drift by reading both files in full: `user-guide.md`'s `## Settings` section still describes the old settings-preview page (now a pure `/admin` redirect since task-07); its Dashboard section doesn't mention the task-09 rebuild (KPI strip, completion donut, results-over-time chart, assignee bars, milestones slice); neither file mentions the new always-on global top bar cluster (task-07) or the Test Cases toolbar relocation (task-10); `feature-flow.md`'s Settings feature-status row and manual-test-checklist item are inconsistent with its own already-updated routes table (which does correctly show the redirect). The routes table, persistence model, schema notes, RBAC section, and dependency diagram in `feature-flow.md` are otherwise already accurate as of task-08 — this is a targeted-fix gap, not a full rewrite.

**Decided 2026-07-09:** Shaun opted to fix before PR. Drafted `docs/cursor-prompts/mvp-visual-overhaul/task-14-living-docs-sync.md` (docs-only, no `apps/**` changes) — **done**; see task-14 section below.

**Unflagged finding from reviewing task-14's diff (2026-07-09):** task-14's honest checklist rewrite surfaced that task-09's Dashboard rebuild dropped real interactive behaviour that existed before Phase 2 — the *Critical* filter chip (runs-with-failures filter) and the expandable run-card pattern (Overview/Assignees/Defects tabs per card) were replaced by the mockup's flatter static "Open test runs" list. Confirmed in code: `DashboardScreen.tsx` still has a dead `Critical: 'crit'` constant (line 30) with no remaining reference anywhere else in the file — the filter UI/logic is gone, just an orphaned leftover. The completion donut's hover-tooltip interactivity (`interactive` prop) was preserved, so it's not a total loss of interactivity, just those two specific pieces. This was never called out as a judgement call in task-09's own handoff entry or QA notes, unlike Dashboard's other flagged decisions (milestones static placeholder, reduced-fidelity trend fallback, discarded page header) — it surfaced only because task-14's checklist had to be honest about what's actually on the screen now. Given Shaun's brief for Dashboard was "abandon ours completely, implement as-is from the mockup," this may well be an accepted consequence of that instruction rather than a mistake — but it wasn't a **confirmed** decision the way the other Dashboard tradeoffs were. **Resolved 2026-07-09:** Shaun confirmed dropping the Critical filter and expandable run-card pattern is fine — accepted as intentional, not a bug. Dead `Critical: 'crit'` constant left in `DashboardScreen.tsx` is cosmetic dead code, not worth a cleanup task on its own.

**2026-07-09 — branch ready, pushing to PR.** All 14 tasks (Phase 1: 01–06, Phase 2: 07–13, docs follow-up: 14) complete and committed. Living docs synced. `mvp-visual-overhaul` → `mvp-main`.

### Completed work — `mvp-visual-overhaul` (task-07) ✅

**Schema:** unchanged (v14). Sidebar/topbar structure, route stubs, global topbar actions.

| What it delivered |
|-------------------|
| Sidebar reskin — mockup nav order/grouping (Dashboard, My Work, Testing, Traceability); Title Case labels; Tabler icons for new items; removed Pinned Modules + Integrations; single "Project Settings" → `/admin` (sidebar swap preserved); sizing bump (13px/14px padding, 14.5px/500 font, 21px icons) |
| Top bar — global cluster in `FreshTopbar` (New test case, New test run, AI Studio, Notifications, Help); wired to `openCreateCase` / global `CreateRunModal` via `useFreshUI`; `actions` prop retained for not-yet-migrated screens |
| Route stubs — `/mywork`, `/milestones`, `/requirements`, `/aistudio`, `/login` placeholder pages; `MODULE_SLUGS` extended |
| **Judgment call (flag for Shaun):** `/[projectKey]/settings` now redirects to `/admin` — per-project `SettingsScreen` orphaned from sidebar but route won't 404 |

**Claude review of the redirect call:** checked for other references to the orphaned route/`settings` slug — only hits are `project-routes.ts`'s own `MODULE_SLUGS`/`LEGACY_PATH_TO_MODULE` tables (the file this task already edits) and a static `prototype-contracts.ts` docs-only entry (no live routing). Nothing else links to `/[projectKey]/settings`, and `page.tsx` is a clean `redirect('/admin')` — implementation matches spec, no correction needed unless Shaun wants the orphaned `SettingsScreen.tsx` component deleted outright rather than left unreachable.

### Completed work — `mvp-visual-overhaul` (task-08) ✅

**Schema:** unchanged (v14). Six new static/demo screen components + route wiring.

| What it delivered |
|-------------------|
| **Login** — `LoginScreen` at `/:key/login`; fixed full-bleed layout; Sign In / SSO → dashboard; not an auth gate |
| **My Work** — KPI strip, test queue, defects panel (`MyWorkScreen`) |
| **Milestones** — milestone cards with linked runs (`MilestonesScreen`) |
| **Requirements** — read-only list view; uses live `activeRequirements` when populated, else static `REQ-*` demo list |
| **Reports** — report-type chips + Run Summary static dashboard (`ReportsScreen`) |
| **AI Studio** — prompt, quick actions, draft preview (`AiStudioScreen`); `--tp-purple` token added |
| Route pages updated; shared screen CSS in `fresh.css` (`.page-head`, `.kpi-strip`, `.screen-row`, etc.) |

**QA:** `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md` — build PASS; all six routes HTTP 200; core regression routes PASS.

**Next:** task-13 (Defects + Audit + Project Settings bundled) + branch wrap-up — **done**; see task-13 section below. Branch ready for PR.

---

## Completed work — `mvp-visual-overhaul` (task-13) ✅ — branch complete

**Schema:** unchanged (v14). Defects + Audit layout rebuilds; admin visual polish; branch wrap-up.

| What it delivered |
|-------------------|
| **Defects** — mockup `.gl-table` toolbar ("All defects" + shown count + status chips + Details toggle), shared `.tbl` table with assignee avatars, right detail panel; live `activeDefects` + `MOCK_DEFECTS` preserved; search + severity filter retained |
| **Audit History** — mockup event-row styling (30px circular icon chips, 13px descriptions, ref links); **page header kept**; filter tabs unchanged; Export CSV button presentational |
| **Admin / Project Settings** — `admin.css` polish: section cards, 240px/1fr form rows with dividers, tighter page title, table/card refinements; no RBAC/CRUD changes |
| **Branch wrap-up** — full regression sweep (tasks 01–13 routes); PR description revised for both phases; QA report at `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md` |

**Judgement calls flagged in QA:**
- Defects page header discarded (consistent with Dashboard/TC/TP/TR) — easy to reverse
- Requirements data-source fallback (live vs static) documented in PR Caveats

**QA:** build PASS; 24/24 production-build route checks PASS; task-13 does not touch Test Runs execution code (Shaun verified protected UX after task-12).

**Branch status:** `mvp-visual-overhaul` Phase 1 + Phase 2 **complete**. Ready for PR to `mvp-main`.

---

## Completed work — `mvp-visual-overhaul` (task-14) ✅ — docs-only follow-up

**Schema:** unchanged (v14). No `apps/**` changes.

| What it delivered |
|-------------------|
| **`user-guide.md`** — synced to Phase 2: Navigation section (sidebar groups, global top bar); Dashboard rewrite; Test Cases toolbar relocation; Test Runs page-head; Defects/Audit task-13 layout; Settings redirect; removed stale settings-preview / Pinned Modules references |
| **`feature-flow.md`** — feature status table, shell nav notes, Dashboard/Test cases/Test runs/Defects/Settings/Audit checklists updated |

**Usage:** ~42% (docs-only session).

**Branch status:** unchanged — ready for PR after commit.

---

## Completed work — `mvp-visual-overhaul` (task-12) ✅

**Schema:** unchanged (v14). Layout/visual rebuild from mockup; protected execution UX handlers and keyboard bindings unchanged.

| What it delivered |
|-------------------|
| **Shell** — `FreshTopbar` for global nav; local `page-head` ("Test runs" title + subline) with `TestRunsTopbar` seal/edit/report/more actions moved out of shared top bar |
| **Queue pane** — `.panel` rounded container; run picker, summary (donut kept at `DONUT_CHART_SIZE` 122), Team/Defects/Details tabs, search/add bar, filter tabs, `ec-fold` grouped case list |
| **Exec detail pane** — `.panel` container; mockup-style header nav, tab strip, result footer with icon buttons + keyboard shortcut legend |
| **CSS** — Phase 2 block in `prototype-runs.css` (workspace layout, pane chrome, fold rows, underline filter tabs, result bar) |

**QA:** `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md` — build PASS; `/DP/testruns` + core regression routes PASS.

**Next:** task-13 (Defects + Audit + Project Settings bundled) + branch wrap-up.

---

## Completed work — `mvp-visual-overhaul` (task-11) ✅

**Schema:** unchanged (v14). Layout/visual rebuild; all `resolvePlanCases()` and query-resolution logic unchanged.

| What it delivered |
|-------------------|
| **Plan list pane** — rounded panel, `pl-cpill` count badge, `pl-item` rows with mockup id/title/meta typography, selected-row inset accent bar; resizable pane unchanged |
| **Plan detail header** — 18px display title, inline meta line, `btn-sm`/`btn-neutral` action cluster, icon maximize button |
| **Tabs** — `pl-dtabs` strip replacing `nav-tab-bar`; Test cases tab shows live resolved-case count badge |
| **Overview** — three-column `pl-ov-card` metric tiles; horizontal coverage donut; open-run card shows TR-key + run name; live "Linked runs" count added |
| **Run history** — `pl-gl-table` with toolbar header; segmented result bars + hover `RunStatusInfographic` tooltip unchanged |
| **Query builder** — `pl-qg-card` cards, `pl-tagp` folder/source chips, restyled condition selects; add/remove/resolve behaviour unchanged |
| **Resolved cases** — `pl-gl-table` with priority pills and source chips; live data from `resolvePlanCases()` |
| **Page header** — not added (mockup `page-head` discarded per Shaun's ask) |
| **CSS** — full Phase 2 rewrite of `prototype-plans.css` |

**QA:** `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md` — build PASS; `/DP/plans` + core regression routes PASS; Playwright screenshots captured.

**Next:** task-13 (Defects + Audit + Project Settings bundled) + branch wrap-up.

---

## Completed work — `mvp-visual-overhaul` (task-10) ✅

**Schema:** unchanged (v14). Layout/visual hybrid rebuild per-pane; no behaviour or data changes.

| What it delivered |
|-------------------|
| **Folder tree pane** — Compass `.panel`-style rounded container; "Folders" header with icon add button; styled filter input; tree rows with chevron + folder icon + count pill (`.st-ct`); existing expand/collapse, create/rename, quick-create behaviour unchanged |
| **Case list pane** — rounded `.tc-main` card; new `.tc-toolbar` with folder title + action buttons moved from `FreshTopbar` (Create test run ▾, Import, Quick create, New case, contextual Details when one row selected); status chips + filter + search row beneath toolbar |
| **Detail panel** — rounded-card container (`.dp.open` border + radius) matching `.panel` treatment elsewhere; tabs, resize, maximize, close behaviour unchanged |
| **Page header** — not added (mockup `page-head` discarded per Shaun's ask) |
| **CSS** — `.btn-ghost`, `.btn-sm`, Phase 2 `.tc-lay`/`.suite-tree`/`.st-*`/`.tc-toolbar`/`.dp` updates in `fresh.css` |

**Toolbar relocation note:** Create test run / Import / Quick create / New case were previously in `FreshTopbar`'s `actions` prop — moved to the case list pane `.tc-toolbar` per task-10 / task-07 pattern.

**QA:** `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md` — build PASS; `/DP/testcases` + core regression routes PASS.

**Next:** task-11 (Test Plans rebuild) — **done**; see task-11 section above.

**Note for task-13:** remove unused `FreshTopbar` `actions` prop once all screens stop passing screen-specific topbar actions.

---

## Completed work — `mvp-visual-overhaul` (task-09) ✅

**Schema:** unchanged (v14). Dashboard layout rebuild; new selectors only (no mutations).

| What it delivered |
|-------------------|
| **Dashboard** — full mockup layout rebuild: KPI strip (6 tiles), completion donut + legend, results-over-time SVG chart (7d/30d/90d chips), results-by-assignee bars, open-runs list (click-through to run), milestones slice (static placeholder → `/milestones`), needs-attention panel (unlinked failures from live data) |
| **Coverage by folder** — folded into Completion panel as "Lowest coverage by folder" (live data from active runs) |
| **Selectors** — `computeDashboardKpis`, time series, pass trend, assignee bars, open runs, unlinked failures, coverage rows in `project-selectors.ts` |
| **CSS** — `.dash-*` grid/panel/chart classes in `fresh.css` |
| Dropped mockup "Hey Shaun" page head per Shaun's ask |

**Reduced-fidelity fallbacks (seed data has no `executionLog` / `testedAt` on initial executions):**
- Weekly Passed/Failed deltas show "As of today" until user records results in-session
- Pass-trend sparkline and results-over-time chart show current snapshot as flat lines (labelled in UI)
- After in-session execution changes, `executionLog` timestamps drive real deltas/trends

**QA:** `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md` — build PASS; `/DP/dashboard` + core regression routes PASS.

**Next:** task-11 (Test Plans rebuild) — **done**; see task-11 section above.

**Schema:** unchanged (v14). Presentational CSS / className only.

| What it delivered |
|-------------------|
| Test Cases reskin — toolbar search chrome (`.tc-search-*`), bulk bar accent tint, folder tree active rows without left-border, detail panel title/display type, step number chips, quick-create/folder inputs with Compass focus rings, empty-state display font; sparkline/status dot tokens in `CasesScreen` |

**Next:** task-05 (Test Plans).

---

## Completed work — `mvp-visual-overhaul` (task-05) ✅

**Schema:** unchanged (v14). Presentational CSS / colour constants only.

| What it delivered |
|-------------------|
| Test Plans reskin — plan list pane (white surface, accent-lt selected row), detail header/tabs, overview cards (Compass radii/display type), query-group builder cards/badges/chips/inputs, run history + resolved tables aligned to `.tbl` look, `RunResultBar` status tokens, coverage donut `notrunColor` → `var(--border2)` |

**Next:** task-06 (Admin + branch wrap-up).

---

## Completed work — `mvp-visual-overhaul` (task-02) ✅

**Schema:** unchanged (v14). Presentational CSS / className / donut colour constants only.

| Part | What it delivered |
|------|-------------------|
| Part A | Dashboard reskin — metric cards (Compass radii/type/accent stripes), donut status colours in `RunDonut`/`RunStatusInfographic`, active run card hover shadow, needs-attention stripes, coverage bar tokens; `DashboardScreen` Export → `.btn-neutral`, metric value colours → CSS vars |
| Part B | Defects/Audit/Settings/placeholder CSS polish; modal backdrop + dialog Compass shadow/radius; `.inp` form chrome; source banners → Compass warning/accent/gray tints; audit seal icon → gray |

**Next:** task-03 (Test Cases) — done; see task-03 section above.

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

- **`mvp-visual-overhaul`** `[~in progress]` — Phase 1 (tasks 01–06, pure re-skin) `[x]` complete, schema stays v14, QA at `/tmp/relay-qa-mvp-visual-overhaul/qa-report.md`, PR description drafted but superseded. Phase 2 (IA/layout overhaul, kept on this branch) started 2026-07-08 — see "2026-07-08 Phase 2" section above.
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
