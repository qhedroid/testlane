# Task 01 — Foundation: auth/session, RBAC middleware, User + Project API

> **Superseded 2026-07-09 as a *Cursor* prompt.** Shaun asked Claude to implement this directly
> instead. Everything below (Background, Parts A–F, Verification, Documentation, Out of scope)
> is still the accurate technical spec — Claude now executes it itself, tracked at
> `docs/claude/mvp-backend/progress.md` (live checklist) with the phase sequence mirrored at
> `docs/claude/mvp-backend/plan.md`. Where "Cursor" is mentioned below, read it as "whichever
> Claude (Cowork) session is currently executing this phase."

Branch: `mvp-backend` (new branch off latest `mvp-main`)
Schema: no Drizzle table changes. `users.password_hash` already exists (nullable) — this task populates it for seed users only. No migration file needed.

This is task 1 of 8 on this branch (see `_kickoff.md` for the full sequence). It runs solo — nothing downstream (Test Cases/Plans/Runs backend wiring) can be meaningfully demoed without a real logged-in user and project context, per `ARCHITECTURE_BASELINE.md` §10's own "Phase 1 — Foundation, do not skip or reorder."

Scope here is strictly: real login (NextAuth.js + Credentials provider), a route-level RBAC gate for page navigation, and the first two missing per-module services (`UserService`, `ProjectService`) with their API routes. **Test Cases/Plans/Runs/Dashboard/Defects/Audit backend wiring is out of scope** — those screens keep reading from `FreshProvider`/localStorage until their own tasks (02–06). **`/api/runs/*` and its `x-relay-user-id` header auth are explicitly out of scope for this task** — task-04 handles moving that route onto real sessions; changing it here risks the protected three-pane execution UX without that task's dedicated regression pass.

---

## Background

**Auth is genuinely greenfield.** No `next-auth`, `@auth/core`, `bcrypt`, or `bcryptjs` exist anywhere in the repo today (checked `pnpm-lock.yaml` and both `package.json` files). The current "auth" is a dev-only header hack: `apps/web/src/lib/api/auth.ts` exports `resolveActor(request)`, which reads the `x-relay-user-id` header and looks up the user via `resolveUserById()` (`packages/db/src/auth/resolve-user.ts`) — no password, no session, no cookie. **Do not modify `auth.ts` or `resolve-user.ts` in this task** — every existing `/api/runs/*` route and `scripts/validate-api.ts` depends on that exact header contract, and task-04 is where that gets replaced deliberately, with its own regression pass.

**Session strategy decision (flag this, it's a real call made for this task, not silently assumed):** `packages/db/schema.ts`'s own comment on the `users` table (line 83-85) says NextAuth's `sessions`/`accounts`/`verification_tokens` tables "are managed separately by the NextAuth MySQL adapter — not defined here," implying a database session adapter. This task uses **NextAuth's JWT session strategy instead** (`session: { strategy: 'jwt' }`) — no adapter, no new tables, session state lives entirely in an encrypted cookie. Reasoning: Shaun confirmed IAM is the eventual real auth provider and this is an interim step, so avoiding three new adapter-managed tables (that would need their own migration and would be thrown away once IAM lands) is the right amount of investment right now. If this changes later, swapping to a DB adapter is additive, not a rewrite of what this task builds.

**Password hashing library:** use `bcryptjs` (pure JS), not `bcrypt` (native binding) — avoids native-module build issues across the Docker/local dev split this repo already has to manage (see `docker-compose.yml`, `scripts/wait-for-mysql.sh`). `bcryptjs` implements the same hashing scheme, so the schema comment ("Hashed with bcrypt, cost factor 12") stays accurate in spirit — use cost factor 12 to match.

**Existing prior art to reuse, not rebuild:**
- `packages/db/src/rbac/assert-min-role.ts` — `assertMinProjectRole(actorId, projectId, minRole)` already implements the full MAX(global, project) role hierarchy. `UserService`/`ProjectService` and the new API routes call this directly; do not reimplement role math anywhere else.
- `apps/web/src/lib/api/response.ts` — `jsonSuccess(data, status?)` / `jsonError(code, message, status, details?)`. Every new route uses these, matching `/api/runs/*`'s existing shape (`{ data }` / `{ error: { code, message } }`).
- `apps/web/src/lib/api/errors.ts` — `handleRouteError(err)` dispatches on typed error classes with a per-error `.code` → HTTP status lookup table (see `RUN_CREATION_STATUS` etc., lines 13-24). New service errors follow the identical pattern — do not add ad-hoc `try/catch` status codes inline in route handlers.
- `apps/web/src/app/api/runs/route.ts` — the canonical route-handler shape: `resolveActor` (or here, the new session equivalent) → zod-parse query/body from `@/lib/api/schemas` → call a service function → `jsonSuccess`/`handleRouteError`. New routes mirror this exactly.

**Existing UI to wire, not rebuild:** `apps/web/src/fresh/screens/LoginScreen.tsx` already has a full presentational Sign In form (email/password inputs, SSO button, styling) from the `mvp-visual-overhaul` Phase 2 branch — it currently just calls `router.push()` on click with no real auth call. This task wires its existing `signIn()` function to real NextAuth, it does not rebuild the screen.

**Supersedes a `mvp-visual-overhaul` decision, deliberately:** that branch's Phase 2 explicitly decided "Login page is a reachable route only… not a gate on app load — no change to how the app is entered today" (see `handoff.md`'s "2026-07-08 Phase 2" section). That was correct for a schema-free visual branch. `mvp-backend`'s own definition of done explicitly requires "login/session gates the app," so this task reverses that specific prior decision on purpose — call this out in the QA report so it doesn't read as an accidental behavior change.

---

## Part A — Dependencies and environment

1. `apps/web/package.json` — add to `dependencies`: `next-auth` (`^4.24.x` — the v4 line; v5/Auth.js beta is not stable enough for this task) and `bcryptjs` (`^2.4.x`). Add to `devDependencies`: `@types/bcryptjs`.
2. `packages/db/package.json` — add `bcryptjs` to `dependencies` (password hashing happens in the seed script and `UserService`, both inside this package). Add its export surface (Part E covers the exact subpaths).
3. `.env.example` (repo root) — add, after the existing `NEXT_PUBLIC_APP_URL` line:
   ```
   # NextAuth (JWT session strategy — no DB adapter tables)
   NEXTAUTH_SECRET=replace-with-a-random-32-byte-value-for-local-dev
   NEXTAUTH_URL=http://localhost:3000
   ```
   Also add these two vars to the real `.env` at the repo root (not committed — `.env` already exists locally per `docker-compose.yml`/`DATABASE_URL` conventions; generate a random value for `NEXTAUTH_SECRET`, e.g. `openssl rand -base64 32`).

---

## Part B — Seed users get real passwords

`packages/db/src/seed/insert.ts` lines 27-76 insert the six seed users with no `passwordHash`. Add a `passwordHash` field to each of the six objects in that `users` array, all set to the bcrypt hash (cost 12) of a single shared local-dev password: `relay-dev-2026`. Compute the hash with `bcryptjs.hashSync('relay-dev-2026', 12)` at the top of `insertSeedData()` (once, reused for all six — don't hash six times) and reference it in each user object, e.g.:

```ts
const devPasswordHash = bcryptjs.hashSync('relay-dev-2026', 12)

await db.insert(users).values([
  {
    id: ids.users.noel,
    orgId: ids.org,
    email: 'noel.quadri@relay-dev.local',
    name: 'Noel Quadri',
    globalRole: 'super_admin',
    isActive: true,
    passwordHash: devPasswordHash,
  },
  // …repeat for shaun, priya, marcus, james, viewer, same devPasswordHash
])
```

Document this credential clearly (email + `relay-dev-2026`) in a new "Local dev login" subsection of `README.md`, listing all six seed emails (`noel.quadri@relay-dev.local`, `shaun.sevume@relay-dev.local`, `priya.nair@relay-dev.local`, `marcus.webb@relay-dev.local`, `james.osullivan@relay-dev.local`, `viewer@relay-dev.local`) with their display names and global roles, so anyone running the seed locally knows how to log in. Also update `runSeed()`'s console output (`packages/db/src/seed/index.ts`, the `console.log` block at the end) to print the shared dev password.

---

## Part C — NextAuth: config, route handler, session provider

1. Create `packages/db/src/auth/verify-credentials.ts` — a new function `verifyCredentials(email: string, password: string)` that looks up the user by email (reuse the `users` table, `eq(users.email, email)`, matching the existing query shape in `resolve-user.ts` but keyed by email instead of id), checks `isActive`, and compares `password` against `passwordHash` with `bcryptjs.compareSync`. Returns `{ id, name, email, globalRole } | null` — null on any failure (user not found, inactive, no `passwordHash` set, wrong password). Do not throw on invalid credentials — NextAuth's `authorize()` expects `null` for a rejected login, not an exception.

2. Add this new function to `packages/db/package.json`'s `exports` map: `"./auth/verify-credentials": "./src/auth/verify-credentials.ts"`.

3. Create `apps/web/src/lib/auth/auth-options.ts`:
   ```ts
   import type { NextAuthOptions } from 'next-auth'
   import CredentialsProvider from 'next-auth/providers/credentials'
   import { verifyCredentials } from '@relay/db/auth/verify-credentials'

   export const authOptions: NextAuthOptions = {
     session: { strategy: 'jwt' },
     pages: { signIn: '/login' },
     providers: [
       CredentialsProvider({
         name: 'Credentials',
         credentials: {
           email: { label: 'Email', type: 'email' },
           password: { label: 'Password', type: 'password' },
         },
         async authorize(credentials) {
           if (!credentials?.email || !credentials?.password) return null
           const user = await verifyCredentials(credentials.email, credentials.password)
           if (!user) return null
           return { id: user.id, name: user.name, email: user.email, globalRole: user.globalRole }
         },
       }),
     ],
     callbacks: {
       async jwt({ token, user }) {
         if (user) {
           token.id = (user as { id: string }).id
           token.globalRole = (user as { globalRole: string }).globalRole
         }
         return token
       },
       async session({ session, token }) {
         if (session.user) {
           ;(session.user as { id?: string; globalRole?: string }).id = token.id as string
           ;(session.user as { id?: string; globalRole?: string }).globalRole = token.globalRole as string
         }
         return session
       },
     },
   }
   ```
   Add a `next-auth.d.ts` module augmentation file alongside it (or in `apps/web/src/types/`) extending `Session['user']` and `JWT` with `id: string` and `globalRole: string`, so the rest of the app gets these fields typed instead of cast with `as`.

4. Create `apps/web/src/app/api/auth/[...nextauth]/route.ts`:
   ```ts
   import NextAuth from 'next-auth'
   import { authOptions } from '@/lib/auth/auth-options'

   const handler = NextAuth(authOptions)
   export { handler as GET, handler as POST }
   ```

5. Create `apps/web/src/lib/api/session.ts` — a **new, separate** helper from `resolveActor()` (do not touch `auth.ts`), for the new User/Project routes only:
   ```ts
   import { getToken } from 'next-auth/jwt'

   export async function resolveSessionActor(request: Request): Promise<{
     id: string
     globalRole: string
   }> {
     const token = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET })
     if (!token?.id) {
       throw new Error('UNAUTHORIZED')
     }
     return { id: token.id as string, globalRole: token.globalRole as string }
   }
   ```
   (`getToken` accepts a `NextRequest`-shaped object; Next.js 15 route handlers receive a standard `Request` — cast as shown, matching how `middleware.ts` in Part D will call the same function with a real `NextRequest`.)

6. Wrap the root layout in NextAuth's client session provider so `useSession()`/`signIn()`/`signOut()` work in client components. `apps/web/src/app/layout.tsx` currently renders `<body>{children}</body>` directly (lines 18-29) with no providers at all. Add a new client component `apps/web/src/app/providers.tsx`:
   ```tsx
   'use client'
   import { SessionProvider } from 'next-auth/react'
   import type { ReactNode } from 'react'

   export function Providers({ children }: { children: ReactNode }) {
     return <SessionProvider>{children}</SessionProvider>
   }
   ```
   and wrap `{children}` in `layout.tsx` with `<Providers>{children}</Providers>` inside `<body>`. Keep `RootLayout` itself a server component — only the new `Providers` file needs `'use client'`.

---

## Part D — RBAC middleware (page-route gating)

No `middleware.ts` exists in this repo today. Create `apps/web/src/middleware.ts`:

```ts
import { NextResponse } from 'next/server'
import { getToken } from 'next-auth/jwt'
import type { NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public / unauthenticated-allowed paths
  if (
    pathname === '/login' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/runs') || // task-04 moves this off the header hack
    pathname === '/api/health' ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/fonts')
  ) {
    return NextResponse.next()
  }

  const token = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })
  if (!token) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(loginUrl)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!api/auth|api/runs|api/health|_next/static|_next/image|favicon.ico|fonts).*)'],
}
```

This gates every page route (`(app)/[projectKey]/*`, `/admin/*`) and every non-excluded API route behind a valid session — it does not do per-project role checks (that's `assertMinProjectRole()`'s job, called inside individual services/routes, not middleware). Keep the exclusions minimal and exactly as listed — do not add broader wildcard exclusions that would accidentally leave a real page ungated.

---

## Part E — `UserService`, `ProjectService`, and their API routes

1. Create `packages/db/services/UserService.ts`:
   - `listUsers(actorId: string): Promise<UserSummary[]>` — calls `assertMinProjectRole`-style check but at the *global* level (there's no project scope for a user list; add a small local helper or inline check: throw `UserServiceError('INSUFFICIENT_PERMISSIONS')` unless the actor's `globalRole` is `admin` or `super_admin` — look this up via a direct `users` table query, same pattern as `assert-min-role.ts` lines 40-44). Returns `id, name, email, globalRole, isActive, lastLoginAt` for all users in the actor's org.
   - `createUser(input: { actorId, orgId, email, name, globalRole, password }): Promise<UserSummary>` — same admin+ gate, hash `password` with `bcryptjs` (cost 12, reuse the same call shape as Part B), insert via Drizzle, throw `UserServiceError('EMAIL_TAKEN')` on a unique-constraint violation (catch the MySQL duplicate-key error, matching how `TestRunService.ts` handles `DUPLICATE_RUN_REF` — check that file's existing catch pattern and mirror it).
   - `updateUser(input: { actorId, userId, patch: Partial<{ name; globalRole; isActive }> }): Promise<UserSummary>` — admin+ gate; disallow a user demoting/deactivating themselves if they'd be the org's last active `super_admin`/`admin` (throw `UserServiceError('LAST_ADMIN')`) — simple safeguard, not a full audit trail (that's task-06).
   - Export `UserServiceError extends Error` with a `code: UserServiceErrorCode` field, codes: `INSUFFICIENT_PERMISSIONS | EMAIL_TAKEN | USER_NOT_FOUND | LAST_ADMIN`.

2. Create `packages/db/services/ProjectService.ts`:
   - `listProjects(actorId: string): Promise<ProjectSummary[]>` — org-scoped; for `super_admin`/`admin` global roles, return all active projects in the org; for `contributor`/`viewer`, return only projects where a `project_roles` row exists for that user (join `projectRoles` → `projects`, filter `userId = actorId`). This is the first real "project switcher" data source — note in the Documentation section that `ProjectSwitcher.tsx` still reads a static/local list today and isn't wired in this task (that's task-02+'s job once more modules exist to switch between).
   - `createProject(input: { actorId, orgId, slug, name, description? }): Promise<ProjectSummary>` — admin+ gate (global), unique-slug-per-org violation → `ProjectServiceError('DUPLICATE_SLUG')`.
   - `assignProjectRole(input: { actorId, projectId, userId, role }): Promise<void>` — the actor must be admin+ *on that project* (`assertMinProjectRole(actorId, projectId, 'admin')` — reuse directly), upserts into `project_roles` (insert-or-update on the existing `project_role_unique` constraint — use Drizzle's `onDuplicateKeyUpdate`).
   - Export `ProjectServiceError extends Error` with codes: `INSUFFICIENT_PERMISSIONS | DUPLICATE_SLUG | PROJECT_NOT_FOUND`.

3. Add both services to `packages/db/package.json`'s `exports`: `"./services/user": "./services/UserService.ts"`, `"./services/project": "./services/ProjectService.ts"`.

4. Add zod schemas to `apps/web/src/lib/api/schemas.ts` (open this file first — it already exists with `createRunBodySchema`/`listRunsQuerySchema`; add alongside, same style): `createUserBodySchema`, `updateUserBodySchema`, `createProjectBodySchema`, `assignProjectRoleBodySchema`.

5. Add status maps to `apps/web/src/lib/api/errors.ts`, following the exact existing pattern (lines 13-38 define `RUN_CREATION_STATUS`/`RUN_READ_STATUS`/`UPDATE_RESULT_STATUS` as `Record<ErrorCode, number>`; `handleRouteError` at lines 40-70 checks `instanceof` for each error class in turn). Add:
   ```ts
   const USER_SERVICE_STATUS: Record<UserServiceErrorCode, number> = {
     INSUFFICIENT_PERMISSIONS: 403,
     EMAIL_TAKEN: 409,
     USER_NOT_FOUND: 404,
     LAST_ADMIN: 409,
   }
   const PROJECT_SERVICE_STATUS: Record<ProjectServiceErrorCode, number> = {
     INSUFFICIENT_PERMISSIONS: 403,
     DUPLICATE_SLUG: 409,
     PROJECT_NOT_FOUND: 404,
   }
   ```
   and two more `if (err instanceof …)` branches in `handleRouteError`, same shape as the existing three.

6. Create the route files, each following `apps/web/src/app/api/runs/route.ts`'s exact shape (`resolveSessionActor` from Part C.5 instead of `resolveActor`, zod-parse, call service, `jsonSuccess`/`handleRouteError`):
   - `apps/web/src/app/api/users/route.ts` — `GET` → `listUsers`, `POST` → `createUser`.
   - `apps/web/src/app/api/users/[userId]/route.ts` — `PATCH` → `updateUser` (Next.js 15 route context: `{ params: Promise<{ userId: string }> }`, `await context.params`, matching `apps/web/src/app/api/runs/[runId]/route.ts`'s pattern).
   - `apps/web/src/app/api/projects/route.ts` — `GET` → `listProjects`, `POST` → `createProject`.
   - `apps/web/src/app/api/projects/[projectId]/roles/route.ts` — `POST` → `assignProjectRole`.

---

## Part F — Login UI wiring and sign-out

1. `apps/web/src/fresh/screens/LoginScreen.tsx` — replace the mock `signIn()` function (lines 6-11) with a real submit handler:
   - Add local state for `email`, `password`, `error`, `loading`.
   - Bind the two `<input>` elements (lines 41-47, 49-55) to that state.
   - Replace the button's `onClick={signIn}` (line 59) with a form submit (wrap the inputs/button in a `<form onSubmit={...}>`, `event.preventDefault()`), calling `next-auth/react`'s `signIn('credentials', { email, password, redirect: false })`. On success (`result?.ok`), read `callbackUrl` from `useSearchParams()` (default to `projectPath(DEFAULT_PROJECT_KEY, 'dashboard')`) and `router.push()` there. On failure, set `error` and render it above the form (small red text, matching the existing `admin-form-error` pattern referenced in the custom-fields task).
   - The "Continue with TransPerfect SSO" button (lines 67-70) stays a visual-only placeholder — no real SSO provider in this task; leave its `onClick` as-is or disable it with a "Coming soon" tooltip, your call, just don't silently imply it works.

2. `apps/web/src/app/(app)/[projectKey]/login/page.tsx` currently renders `<LoginScreen />` directly at a project-scoped route. Since real login has no project context yet (a user logs in before picking a project), redirect this route to the new top-level page instead, mirroring the exact precedent already in this codebase for `apps/web/src/app/(app)/[projectKey]/settings/page.tsx` → `/admin` (`mvp-visual-overhaul` task-07): replace this page's contents with a `redirect('/login')`.

3. Create `apps/web/src/app/login/page.tsx` (new top-level route, outside the `(app)` group so it isn't wrapped in `FreshShell`/`FreshProvider`):
   ```tsx
   import { LoginScreen } from '@/fresh/screens/LoginScreen'

   export default function LoginPage() {
     return <LoginScreen />
   }
   ```

4. Add a minimal sign-out affordance — there is none anywhere in the app today (confirmed no existing "Sign Out"/`signOut` reference). Add a small user menu to `apps/web/src/fresh/components/FreshTopbar.tsx`, after `<TopbarGlobalActions />` (line 69): a button showing the session user's name (via `useSession()`) that opens a small popover (mirror `ProjectSwitcher.tsx`'s existing popover-open/close pattern — same component, don't invent a new one) with the user's email/global role and a "Sign Out" action calling `signOut({ callbackUrl: '/login' })` from `next-auth/react`.

---

## Verification

1. `pnpm build`
2. Run `pnpm db:migrate` if any migration exists (none expected — this task adds no schema changes) then `pnpm db:seed` — confirm it completes and prints the new "Local dev login" credential block.
3. `pnpm dev` (stop any stale dev server first if `.next` was rebuilt).
4. Browser smoke test:
   - Visit any `(app)` route (e.g. `/DP/dashboard`) while logged out — confirm redirect to `/login?callbackUrl=/DP/dashboard`.
   - Log in as `shaun.sevume@relay-dev.local` / `relay-dev-2026` — confirm redirect back to `/DP/dashboard` (or the callback URL) and the app renders normally.
   - Confirm the new user-menu shows "Shaun Sevume" and sign-out returns to `/login`.
   - Log in as `viewer@relay-dev.local` (viewer role) and confirm `GET /api/users` returns 403 (not admin+); log in as `noel.quadri@relay-dev.local` (super_admin) and confirm it returns 200 with all six users.
   - `POST /api/projects` as a contributor (`priya.nair@relay-dev.local`) should 403; as `shaun.sevume@relay-dev.local` (admin) should 201.
   - Confirm `/api/runs` and `/DP/testruns` still work exactly as before, using the existing `x-relay-user-id` header path — this task must not have touched that route's behavior at all.
5. Core regression routes (minimum): `/admin/users`, `/admin/roles`, `/admin/audit-log`, `/DP/settings`, `/DP/dashboard`, `/DP/testcases`, `/DP/testruns`, `/DP/plans` — all should still render (none are wired to the new services yet; this task only adds the auth gate in front of them).
6. Record WebM evidence where tooling supports it; screenshots for any failures.
7. Write QA report to `/tmp/relay-qa-mvp-backend/qa-report.md` — explicitly call out: (a) the `mvp-visual-overhaul` login-gate decision being deliberately superseded, (b) that `/api/runs/*` intentionally still uses the header hack pending task-04, (c) pass/fail summary and push readiness.
8. Do not push until smoke test evidence is reviewed or explicitly waived.

## Documentation

- `README.md` — new "Local dev login" section (Part B) with all six seed credentials.
- `docs/product/user-guide.md` — add a note that the app now requires login; document the login flow briefly.
- `docs/product/feature-flow.md` — update the Settings/Login feature-status rows; note `/[projectKey]/login` now redirects to `/login`.
- `docs/_authoritative/AS_BUILT_SNAPSHOT.md` — update the auth section to reflect NextAuth (JWT strategy) replacing the "no auth" state; note `/api/runs/*` still uses the legacy header pending task-04.
- `docs/_authoritative/FRONTEND_CONTRACTS.md` — document the new `/api/users/*` and `/api/projects/*` contracts (request/response shapes, error codes) alongside the existing `/api/runs/*` documentation there.
- `docs/claude/handoff.md` — add a "Completed work — `mvp-backend` (task-01)" entry once done, noting the session-strategy and bcryptjs decisions so they aren't re-litigated next session.

## Out of scope / do not touch

- `apps/web/src/lib/api/auth.ts`, `packages/db/src/auth/resolve-user.ts`, `/api/runs/*` behavior — untouched, task-04.
- `TestCaseService`/`TestPlanService`/`DashboardService`/`AuditService` — later tasks.
- `ProjectSwitcher.tsx` wiring to real `listProjects()` — later task, once there's more than one module to switch between meaningfully.
- Per-project role management UI (`/admin/roles` still uses the localStorage `AdminSettings` blob) — task-07.
- `mvp-custom-fields` schema/scope — untouched.
- Real SSO provider — the SSO button stays a visual placeholder.
- No AWS/cloud, no Terraform/ECS/Aurora.
- No commits without explicit request.
