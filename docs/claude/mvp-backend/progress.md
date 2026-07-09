# `mvp-backend` — live progress

> Read this file first on any `mvp-backend` session, right after `CLAUDE.md` and
> `docs/claude/handoff.md`. This is the actual current state — trust this over chat history,
> which gets summarized/lost across sessions. Update it before ending any session that touched
> this branch, even a short one that only got partway through a phase.

Last updated: 2026-07-09 (session: implemented Phase 1, Parts A–F, in full).

## Overall status

| Phase | Status |
|-------|--------|
| 1 — Foundation (auth/RBAC/User+Project API) | **Code complete, Claude-sandbox verified.** Shaun-local verification (real DB, real login flow, QA report) still needed before treating the phase as fully done. |
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
- [ ] **Commit** — ask Shaun for identity per `CLAUDE.md`'s commit-identity rule before
      committing Phase 1's code changes (separate from the docs-only commits already made
      during scoping). Not yet committed — waiting on Shaun-local verification first, per
      `CLAUDE.md`'s smoke-test-before-push convention.

## Open questions / blockers

- **Phase 1 needs Shaun-local verification before being called fully done** — see the unchecked
  "Verification — Shaun local" line above. Nothing ambiguous or blocking; just needs a real DB.
- Sandbox note for future phases (not a blocker, just a gotcha worth knowing up front): don't run
  `pnpm install`/`pnpm build` directly against the mounted `Relay/` workspace folder — it fails
  with `EPERM` on pnpm's temp-file churn because that folder is write-once-per-file. Use the
  `rsync`-to-`/tmp` workaround documented in Part A's "Verification — Claude sandbox" line above.

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
