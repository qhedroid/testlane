# `mvp-backend` — Cursor kickoff

> **Superseded 2026-07-09.** Shaun asked Claude to implement this branch directly instead of
> handing it to Cursor. This file's phase sequence and per-task scope are still the plan —
> just executed by Claude across (likely) multiple Cowork sessions instead of by Cursor in one.
> Live status lives at `docs/claude/mvp-backend/progress.md`; the durable plan is mirrored at
> `docs/claude/mvp-backend/plan.md`. Read those first — this file is kept only as the original
> phase-sequencing record.

Branch: `mvp-backend` (off `mvp-main`, created 2026-07-09)

## Golden rule

Convert the fresh UI's localStorage-driven functionality onto the real MySQL/Drizzle backend — **module by module, until the whole app runs on it.** Not a single vertical-slice validation. End state: every fresh screen (Dashboard/Cases/Plans/Runs/Defects/Audit/Admin) reads and writes the real API; login/session gates the app; a seeded, explorable demo project exists in the DB.

Local infra only — no AWS/Terraform/ECS/Aurora on this branch. OpenSearch stays a no-op stub; search runs on plain MySQL. `mvp-custom-fields` schema/scope is untouched.

## Checkpoint cadence (decided 2026-07-09)

Unlike `mvp-visual-overhaul` (one task file per Cursor session, always), this branch bundles small/low-risk tasks into a single session and keeps larger/riskier ones solo — same principle as the visual-overhaul task-03+05 experiment, applied more deliberately here because backend work has real failure modes (bad migration, broken auth, RBAC bypass) that pure CSS changes don't.

- **task-01 (Foundation: auth/RBAC/User+Project API) runs solo.** It is the branch's own "protected UX" equivalent — everything downstream depends on it, and getting auth wrong is a security bug, not a visual regression. Full attention, no bundling.
- **task-02 + task-03 (Test Cases + Test Plans backend) are a bundling candidate** — both are CRUD-shaped wiring onto services that don't exist yet but follow an identical pattern once task-01's scaffolding is in place. Run together if the session's usage tracks in the same comfortable band `mvp-visual-overhaul` saw (47–55%); split into two sessions if not.
- **task-04 (Test Runs wiring) runs solo.** This is the branch's actual protected-UX-equivalent screen — it touches `/runs/api` and the existing `TestRunService`/`ExecutionService`, and must not regress the three-pane execution UX while moving it off the legacy `x-relay-user-id` header onto real sessions.
- **task-05 + task-06 (Dashboard + Defects/Audit backend) are a bundling candidate** — both are read-heavy aggregation work, lower risk than Cases/Plans/Runs mutation paths.
- **task-07 (Admin panel unification) runs solo.** RBAC-sensitive (Users/Roles CRUD onto real tables) — worth its own review pass.
- **task-08 (seeded demo project + full regression sweep + PR description) runs solo**, matching the precedent that wrap-up sessions (task-06/task-13 on `mvp-visual-overhaul`) are already comparable in size to a solo task on their own.

Whether task-02+03 and task-05+06 actually get bundled is a live call each time — report token usage honestly and split if a session is running thin, exactly as `mvp-visual-overhaul`'s task-12 spike showed can happen even with a reasonable-looking bundle.

## Task sequence

| Task | Scope | Primary files/areas | Bundling |
|------|-------|----------------------|----------|
| task-01 | Foundation — NextAuth.js + Credentials provider (JWT session, no DB adapter tables), RBAC route middleware, `UserService`/`ProjectService` + `/api/users/*` + `/api/projects/*`, login UI wired to real session, seed users get real bcrypt password hashes | `apps/web/src/middleware.ts`, `apps/web/src/lib/auth/*`, `apps/web/src/app/api/auth/[...nextauth]/route.ts`, `apps/web/src/app/api/users/**`, `apps/web/src/app/api/projects/**`, `packages/db/services/UserService.ts`, `packages/db/services/ProjectService.ts`, `apps/web/src/fresh/screens/LoginScreen.tsx`, `packages/db/src/seed/insert.ts` | Solo |
| task-02 | Test Cases backend — `TestCaseService` (+ folders), `/api/projects/[projectId]/cases/*`, `/api/projects/[projectId]/folders/*`; wire `CasesScreen.tsx` off `FreshProvider`/localStorage | `packages/db/services/TestCaseService.ts`, `apps/web/src/app/api/**/cases/**`, `CasesScreen.tsx` | Candidate: bundle with task-03 |
| task-03 | Test Plans backend — `TestPlanService`, `resolvePlanCases()` re-homed server-side or left client-computed off real case/folder data (decide in-task), `/api/projects/[projectId]/plans/*`; wire `PlansScreen.tsx` | `packages/db/services/TestPlanService.ts`, `apps/web/src/app/api/**/plans/**`, `PlansScreen.tsx` | Candidate: bundle with task-02 |
| task-04 | Test Runs wiring — reuse existing `TestRunService`/`ExecutionService`; move `/api/runs/*` and `RunsScreen.tsx` off the `x-relay-user-id` dev header onto real session auth; **protected three-pane execution UX must not regress** | `apps/web/src/lib/api/auth.ts`, `apps/web/src/app/api/runs/**`, `RunsScreen.tsx` | Solo |
| task-05 | Dashboard backend — `DashboardService` (server-side aggregation of the metrics `project-selectors.ts` currently computes client-side from local state); wire `DashboardScreen.tsx` | `packages/db/services/DashboardService.ts`, `apps/web/src/app/api/**/dashboard/**`, `DashboardScreen.tsx` | Candidate: bundle with task-06 |
| task-06 | Defects + Audit backend — real defect persistence (schema currently has no dedicated defects table beyond `runDefectLinks`; decide in-task whether that's sufficient or needs a new table), `AuditService` writing real `auditLog` rows for actions taken via the new API routes; wire `DefectsScreen.tsx`/`AuditScreen.tsx` | `packages/db/services/AuditService.ts`, `DefectsScreen.tsx`, `AuditScreen.tsx` | Candidate: bundle with task-05 |
| task-07 | Admin panel unification — `/admin/users` and `/admin/roles` read/write the real `users`/`project_roles` tables via task-01's services/routes instead of the `AdminSettings` localStorage blob | `apps/web/src/app/admin/users/**`, `apps/web/src/app/admin/roles/**` | Solo |
| task-08 | Seeded demo project finalization (verify/extend `packages/db/src/seed` so every wired module has explorable real rows) + full regression sweep across all fresh screens + `/admin/*` + branch PR description | `packages/db/src/seed/**`, QA report, PR description | Solo |

## Definition of done (branch-level)

Every fresh screen (Dashboard/Cases/Plans/Runs/Defects/Audit/Admin) reads and writes the real API. Login/session gates the app. A seeded demo project is explorable without manual setup. `mvp-custom-fields` untouched. No AWS/cloud work.

## Out of scope (whole branch)

- AWS/Terraform/ECS/Aurora provisioning — later phase.
- Real OpenSearch wiring — Cmd+K and list search stay on plain MySQL queries.
- `mvp-custom-fields` schema/scope.
- Any behavior change to the Test Runs three-pane execution UX beyond the auth-source swap in task-04.

## Standing instruction for every task file

Run everything inside a given task file (including its internal Parts) continuously, with no stopping for confirmation, unless a genuine blocker is hit. Follow this project's mandatory post-change smoke test (`pnpm build`, `pnpm dev`, browser smoke test, QA report at `/tmp/relay-qa-mvp-backend/qa-report.md`, core regression routes) after every task. Update the living docs (`docs/product/user-guide.md`, `docs/product/feature-flow.md`, and the `docs/_authoritative/*` files each task's own Documentation section names) alongside the code change, not as an afterthought.
