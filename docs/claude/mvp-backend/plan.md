# `mvp-backend` — implementation plan (Claude-executed)

> Read `progress.md` alongside this file — this is the durable "what/why" plan; `progress.md` is
> the live "what's actually done so far" checklist. If they ever disagree, `progress.md` wins for
> current state; come back here to update the plan itself if scope genuinely changes.

Branch: `mvp-backend` (off `mvp-main`, created 2026-07-09). **Executor: Claude, directly** —
Shaun's 2026-07-09 instruction reverses the project's default "Claude drafts Cursor prompts"
role for this branch only (see `CLAUDE.md`'s "Phase: Backend build" section). This plan was
originally scoped as 8 Cursor task files (still readable at `docs/cursor-prompts/mvp-backend/`,
now marked superseded) — the phase boundaries and technical content are unchanged, only the
executor and the per-session pacing model changed.

## Goal

Convert the fresh UI's localStorage-driven functionality onto the real MySQL/Drizzle backend —
module by module, until the whole app runs on it. End state: every fresh screen
(Dashboard/Cases/Plans/Runs/Defects/Audit/Admin) reads and writes the real API; login/session
gates the app; a seeded, explorable demo project exists in the DB.

Local infra only — no AWS/Terraform/ECS/Aurora. OpenSearch stays a no-op stub; search runs on
plain MySQL. `mvp-custom-fields` schema/scope is untouched.

## Verification constraint — read this before starting any phase

Claude's Cowork sandbox has Node but **no Docker**, so it cannot reach the MySQL/OpenSearch
containers `docker-compose.yml` defines, and cannot run `pnpm` (also not installed in-sandbox
by default — install it first if needed for a build/typecheck pass). Practical split:

- **Claude can verify in-sandbox:** file edits land for real on Shaun's machine (the mounted
  workspace folder), dependency installs, `pnpm build`/typecheck as far as they don't require a
  live DB connection at build time.
- **Needs Shaun, locally:** `pnpm dev` against a real server, `pnpm db:seed`, the actual login
  flow, any API route that touches MySQL, browser smoke tests, the mandatory QA-report smoke
  test `CLAUDE.md` normally asks Cursor to run.

Each phase in `progress.md` has two verification checkboxes for this reason: "Claude sandbox"
and "Shaun local." Don't mark a phase done until both are checked (or Shaun explicitly waives
the local check for a given phase).

## Per-session pacing (replaces the old Cursor "bundle small tasks" cadence)

Claude sessions are shorter-lived and more context-constrained than a single long Cursor
session — don't assume one phase = one chat, or that multiple phases fit in one chat. Default
assumption: **stop and checkpoint after finishing one phase's file changes**, update
`progress.md`, and let Shaun decide whether to continue in the same chat or a fresh one. If a
phase is large (Phase 1 is — auth touches ~15 files), it's fine to split a single phase across
more than one chat; `progress.md`'s per-phase checklist exists specifically so a fresh chat with
zero memory of this conversation can see exactly which files within a phase are done vs.
remaining, and pick up mid-phase without re-deriving anything.

## Phase sequence

| Phase | Scope | Primary files/areas | Depends on |
|-------|-------|----------------------|------------|
| 1 | Foundation — NextAuth.js + Credentials provider (JWT session, no DB adapter tables), RBAC route middleware, `UserService`/`ProjectService` + `/api/users/*` + `/api/projects/*`, login UI wired to real session, seed users get real bcrypt password hashes | `apps/web/src/middleware.ts`, `apps/web/src/lib/auth/*`, `apps/web/src/app/api/auth/[...nextauth]/route.ts`, `apps/web/src/app/api/users/**`, `apps/web/src/app/api/projects/**`, `packages/db/services/UserService.ts`, `packages/db/services/ProjectService.ts`, `apps/web/src/fresh/screens/LoginScreen.tsx`, `packages/db/src/seed/insert.ts` | — |
| 2 | Test Cases backend — `TestCaseService` (+ folders), `/api/projects/[projectId]/cases/*`, `/api/projects/[projectId]/folders/*`; wire `CasesScreen.tsx` off `FreshProvider`/localStorage | `packages/db/services/TestCaseService.ts`, `apps/web/src/app/api/**/cases/**`, `CasesScreen.tsx` | Phase 1 |
| 3 | Test Plans backend — `TestPlanService`, `resolvePlanCases()` re-homed server-side or left client-computed off real case/folder data (decide in-phase), `/api/projects/[projectId]/plans/*`; wire `PlansScreen.tsx` | `packages/db/services/TestPlanService.ts`, `apps/web/src/app/api/**/plans/**`, `PlansScreen.tsx` | Phase 2 |
| 4 | Test Runs wiring — reuse existing `TestRunService`/`ExecutionService`; move `/api/runs/*` and `RunsScreen.tsx` off the `x-relay-user-id` dev header onto real session auth; **protected three-pane execution UX must not regress** | `apps/web/src/lib/api/auth.ts`, `apps/web/src/app/api/runs/**`, `RunsScreen.tsx` | Phase 1, Phase 3 (plans feed run creation) |
| 5 | Dashboard backend — `DashboardService` (server-side aggregation of what `project-selectors.ts` currently computes client-side); wire `DashboardScreen.tsx` | `packages/db/services/DashboardService.ts`, `apps/web/src/app/api/**/dashboard/**`, `DashboardScreen.tsx` | Phases 2–4 |
| 6 | Defects + Audit backend — real defect persistence (schema currently only has `runDefectLinks`; decide in-phase whether that's sufficient or needs a new table), `AuditService` writing real `auditLog` rows for actions taken via the new API routes; wire `DefectsScreen.tsx`/`AuditScreen.tsx` | `packages/db/services/AuditService.ts`, `DefectsScreen.tsx`, `AuditScreen.tsx` | Phase 4 |
| 7 | Admin panel unification — `/admin/users` and `/admin/roles` read/write the real `users`/`project_roles` tables via Phase 1's services/routes instead of the `AdminSettings` localStorage blob | `apps/web/src/app/admin/users/**`, `apps/web/src/app/admin/roles/**` | Phase 1 |
| 8 | Seeded demo project finalization (verify/extend `packages/db/src/seed` so every wired module has explorable real rows) + full regression sweep across all fresh screens + `/admin/*` + branch PR description | `packages/db/src/seed/**`, QA report, PR description | All prior phases |

Phase 1's full technical spec (Background, per-file changes with line references, Verification,
Documentation, Out of scope) is already written in detail at
`docs/cursor-prompts/mvp-backend/task-01-foundation-auth-rbac.md` — read that file for the real
spec; it is not being duplicated here. Phases 2–8 will get the same level of detail drafted
into this folder (`docs/claude/mvp-backend/phase-0N-*.md`) when picked up, following the same
Background → per-file changes → Verification → Documentation → Out of scope shape.

## Definition of done (branch-level)

Every fresh screen (Dashboard/Cases/Plans/Runs/Defects/Audit/Admin) reads and writes the real
API. Login/session gates the app. A seeded demo project is explorable without manual setup.
`mvp-custom-fields` untouched. No AWS/cloud work.

## Out of scope (whole branch)

- AWS/Terraform/ECS/Aurora provisioning — later phase.
- Real OpenSearch wiring — Cmd+K and list search stay on plain MySQL queries.
- `mvp-custom-fields` schema/scope.
- Any behavior change to the Test Runs three-pane execution UX beyond the auth-source swap in
  Phase 4.
