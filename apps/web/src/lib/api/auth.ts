import { resolveUserById } from '@testlane/db'
import { getToken } from 'next-auth/jwt'

export const RELAY_USER_HEADER = 'x-relay-user-id'

/**
 * Resolve the acting user for the `/api/runs/*` route family.
 *
 * Phase 4 (mvp-backend) auth swap: the real NextAuth session (the same JWT
 * cookie `resolveSessionActor()` in ./session.ts reads) is tried FIRST, so the
 * fresh screens (RunsScreen via FreshProvider's write-through + run-client.ts)
 * hit these routes with plain session-cookie auth like every other wired
 * route family. When no session exists, we fall back to the legacy
 * `x-relay-user-id` dev header.
 *
 * The header fallback exists for `pnpm api:validate` (scripts/validate-api.ts,
 * which has no browser session) and ad-hoc local scripting ONLY — remove it
 * when those move to real token auth. `/api/runs/*` stays exempt in
 * middleware.ts so header-only callers aren't redirected to /login.
 *
 * Note the precedence consequence for /runs/api (ApiRunsWorkspace): in a
 * logged-in browser its per-request dev-actor header is now overridden by the
 * session user. Header behaviour is unchanged for cookie-less callers.
 *
 * Either way the resolved id is validated against the users table (also
 * refreshes name/globalRole). Throws Error('UNAUTHORIZED') when neither a
 * valid session nor a valid header is present.
 */
export async function resolveActor(request: Request): Promise<{
  id: string
  name: string
  globalRole: string
}> {
  let userId: string | undefined

  try {
    const token = await getToken({ req: request as never, secret: process.env.NEXTAUTH_SECRET })
    if (token?.id) userId = token.id as string
  } catch {
    // Malformed/absent session cookie — fall through to the header.
  }

  if (!userId) {
    userId = request.headers.get(RELAY_USER_HEADER)?.trim() || undefined
  }

  if (!userId) {
    throw new Error('UNAUTHORIZED')
  }

  const user = await resolveUserById(userId)
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }

  return user
}
