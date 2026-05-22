import { eq } from 'drizzle-orm'
import { users } from '../../schema'
import { getDb } from '../index'

export async function resolveUserById(userId: string): Promise<{
  id: string
  name: string
  globalRole: string
} | null> {
  const [user] = await getDb()
    .select({
      id: users.id,
      name: users.name,
      globalRole: users.globalRole,
      isActive: users.isActive,
    })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!user?.isActive) return null
  return user
}
