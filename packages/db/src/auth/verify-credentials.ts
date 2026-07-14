import bcryptjs from 'bcryptjs'
import { eq } from 'drizzle-orm'
import { users } from '../../schema'
import { getDb } from '../index'

/**
 * Verify a login attempt against the users table.
 * Returns the resolved actor on success, or null on any failure
 * (user not found, inactive, no passwordHash set, wrong password).
 * Never throws for invalid credentials — NextAuth's authorize() expects
 * null for a rejected login, not an exception.
 */
export async function verifyCredentials(
  email: string,
  password: string,
): Promise<{
  id: string
  name: string
  email: string
  globalRole: string
} | null> {
  const [user] = await getDb()
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      globalRole: users.globalRole,
      isActive: users.isActive,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.email, email))
    .limit(1)

  if (!user?.isActive) return null
  if (!user.passwordHash) return null

  const valid = bcryptjs.compareSync(password, user.passwordHash)
  if (!valid) return null

  return {
    id: user.id,
    name: user.name,
    email: user.email,
    globalRole: user.globalRole,
  }
}
