import { resolveUserById } from '@relay/db'

export const RELAY_USER_HEADER = 'x-relay-user-id'

/**
 * Resolve the acting user from the temporary dev auth header.
 * Throws Error('UNAUTHORIZED') when missing or invalid.
 */
export async function resolveActor(request: Request): Promise<{
  id: string
  name: string
  globalRole: string
}> {
  const userId = request.headers.get(RELAY_USER_HEADER)?.trim()
  if (!userId) {
    throw new Error('UNAUTHORIZED')
  }

  const user = await resolveUserById(userId)
  if (!user) {
    throw new Error('UNAUTHORIZED')
  }

  return user
}
