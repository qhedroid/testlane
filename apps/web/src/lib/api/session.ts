import { getToken } from 'next-auth/jwt'

/**
 * Resolve the acting user from the real NextAuth session (JWT cookie).
 * A new, separate helper from `resolveActor()` in `./auth.ts` — that one
 * stays on the dev `x-relay-user-id` header for `/api/runs/*` until a later
 * phase moves that route onto real sessions too.
 * Throws Error('UNAUTHORIZED') when there is no valid session.
 */
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
