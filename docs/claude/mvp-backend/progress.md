# `mvp-backend` — live progress

> Read this file first on any `mvp-backend` session, right after `CLAUDE.md` and
> `docs/claude/handoff.md`. This is the actual current state — trust this over chat history,
> which gets summarized/lost across sessions. Update it before ending any session that touched
> this branch, even a short one that only got partway through a phase.

Last updated: 2026-07-09 (session: pivoted from Cursor-prompt drafting to direct Claude
implementation; no implementation code written yet).

## Overall status

| Phase | Status |
|-------|--------|
| 1 — Foundation (auth/RBAC/User+Project API) | **Not started** — spec ready, no code written |
| 2 — Test Cases backend | Not started |
| 3 — Test Plans backend | Not started |
| 4 — Test Runs wiring | Not started |
| 5 — Dashboard backend | Not started |
| 6 — Defects/Audit backend | Not started |
| 7 — Admin panel unification | Not started |
| 8 — Seeded demo project + regression sweep + PR | Not started |

## Phase 1 — Foundation: detailed checklist

Spec: `docs/cursor-prompts/mvp-backend/task-01-foundation-auth-rbac.md` (superseded as a Cursor
prompt, still the accurate technical spec for Claude to execute). Key decisions already locked
in there — do not re-litigate without a real reason: NextAuth JWT session strategy (no DB
adapter tables), `bcryptjs` not native `bcrypt`, shared dev password `relay-dev-2026` for all
six seed users, `/api/runs/*` explicitly untouched this phase (task-04/Phase 4's job).

Not started. Checklist below mirrors the spec's Parts A–F — check items off as they land, and
note the exact file state (not just "done") if a session ends mid-part, so a fresh chat can see
precisely where to resume instead of re-reading the whole spec from scratch.

- [ ] **Part A — deps/env:** `next-auth`, `bcryptjs`, `@types/bcryptjs` added to
      `apps/web/package.json`/`packages/db/package.json`; `NEXTAUTH_SECRET`/`NEXTAUTH_URL` added
      to `.env.example` and the real root `.env`.
- [ ] **Part B — seed passwords:** `packages/db/src/seed/insert.ts` six users get
      `passwordHash`; README "Local dev login" section written; `runSeed()` console output
      updated.
- [ ] **Part C — NextAuth core:** `packages/db/src/auth/verify-credentials.ts`,
      `apps/web/src/lib/auth/auth-options.ts`, `apps/web/src/app/api/auth/[...nextauth]/route.ts`,
      `apps/web/src/lib/api/session.ts` (`resolveSessionActor`), root layout wrapped in
      `SessionProvider` via new `apps/web/src/app/providers.tsx`.
- [ ] **Part D — RBAC middleware:** new `apps/web/src/middleware.ts` gating `(app)`/`admin`
      routes, explicitly excluding `/login`, `/api/auth/*`, `/api/runs/*`, `/api/health`.
- [ ] **Part E — services + routes:** `packages/db/services/UserService.ts`,
      `packages/db/services/ProjectService.ts`, both exported from `packages/db/package.json`;
      zod schemas added to `apps/web/src/lib/api/schemas.ts`; error status maps + `instanceof`
      branches added to `apps/web/src/lib/api/errors.ts`; route files
      `apps/web/src/app/api/users/route.ts`, `apps/web/src/app/api/users/[userId]/route.ts`,
      `apps/web/src/app/api/projects/route.ts`,
      `apps/web/src/app/api/projects/[projectId]/roles/route.ts`.
- [ ] **Part F — login UI + sign-out:** `LoginScreen.tsx` wired to real `signIn('credentials', …)`;
      `(app)/[projectKey]/login/page.tsx` redirects to new top-level `apps/web/src/app/login/page.tsx`;
      sign-out affordance added to `FreshTopbar.tsx`.
- [ ] **Verification — Claude sandbox:** `pnpm install` succeeds in-sandbox; `pnpm build`/typecheck
      passes (no live DB needed for this).
- [ ] **Verification — Shaun local:** `pnpm db:seed` prints new credential block;
      logged-out redirect to `/login?callbackUrl=…` works; login as
      `shaun.sevume@relay-dev.local` / `relay-dev-2026` works and lands on `/DP/dashboard`;
      sign-out works; `GET /api/users` 403s as viewer, 200s as super_admin;
      `POST /api/projects` 403s as contributor, 201s as admin; `/api/runs`/`/DP/testruns`
      unaffected (still using the header hack).
- [ ] **Documentation:** README, `docs/product/user-guide.md`, `docs/product/feature-flow.md`,
      `docs/_authoritative/AS_BUILT_SNAPSHOT.md`, `docs/_authoritative/FRONTEND_CONTRACTS.md`,
      `docs/claude/handoff.md` all updated per the spec's Documentation section.
- [ ] **Commit** — ask Shaun for identity per `CLAUDE.md`'s commit-identity rule before
      committing Phase 1's code changes (separate from the docs-only commits already made
      during scoping).

## Open questions / blockers

- None yet — Phase 1 hasn't started. If a session stops mid-phase because of a real blocker
  (ambiguous spec point, a decision only Shaun can make, an environment problem), record it here
  with enough context for a fresh chat to pick up the exact same question, not re-derive it.

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
