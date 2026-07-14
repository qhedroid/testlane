/**
 * UserService.ts
 * Relay — Service layer
 *
 * User listing/creation/update, gated at the global-role level (admin+).
 * There is no per-project scope for a user list — that's ProjectService's
 * concern (project_roles) — so the permission check here is a small local
 * helper, not `assertMinProjectRole()`.
 */

import bcryptjs from 'bcryptjs'
import { and, eq, ne } from 'drizzle-orm'
import { users, type User } from '../schema'
import { db } from '../src/index'
import { createId } from '../src/utils/id'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UserGlobalRole = User['globalRole']

export interface UserSummary {
  id: string
  name: string
  email: string
  globalRole: string
  isActive: boolean
  lastLoginAt: Date | null
}

export interface CreateUserInput {
  actorId: string
  orgId: string
  email: string
  name: string
  globalRole: UserGlobalRole
  password: string
}

export interface UpdateUserInput {
  actorId: string
  userId: string
  patch: Partial<{
    name: string
    globalRole: UserGlobalRole
    isActive: boolean
  }>
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type UserServiceErrorCode =
  | 'INSUFFICIENT_PERMISSIONS'
  | 'EMAIL_TAKEN'
  | 'USER_NOT_FOUND'
  | 'LAST_ADMIN'

export class UserServiceError extends Error {
  constructor(
    message: string,
    public readonly code: UserServiceErrorCode,
  ) {
    super(message)
    this.name = 'UserServiceError'
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const ADMIN_GLOBAL_ROLES = new Set<UserGlobalRole>(['super_admin', 'admin'])

const USER_SUMMARY_COLUMNS = {
  id: users.id,
  name: users.name,
  email: users.email,
  globalRole: users.globalRole,
  isActive: users.isActive,
  lastLoginAt: users.lastLoginAt,
} as const

async function assertGlobalAdmin(actorId: string): Promise<{ orgId: string }> {
  const [actor] = await db
    .select({ orgId: users.orgId, globalRole: users.globalRole, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, actorId))
    .limit(1)

  if (!actor?.isActive || !ADMIN_GLOBAL_ROLES.has(actor.globalRole)) {
    throw new UserServiceError(
      'Insufficient permissions for this action.',
      'INSUFFICIENT_PERMISSIONS',
    )
  }

  return { orgId: actor.orgId }
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'errno' in err &&
    (err as { errno: number }).errno === 1062
  )
}

async function getUserSummary(userId: string): Promise<UserSummary> {
  const [row] = await db
    .select(USER_SUMMARY_COLUMNS)
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  return row
}

/** Count active org members with an admin-or-above global role, excluding one user. */
async function countOtherActiveAdmins(orgId: string, excludingUserId: string): Promise<number> {
  const rows = await db
    .select({ id: users.id, globalRole: users.globalRole })
    .from(users)
    .where(and(eq(users.orgId, orgId), eq(users.isActive, true), ne(users.id, excludingUserId)))

  return rows.filter((row) => ADMIN_GLOBAL_ROLES.has(row.globalRole)).length
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function listUsers(actorId: string): Promise<UserSummary[]> {
  const { orgId } = await assertGlobalAdmin(actorId)

  return db.select(USER_SUMMARY_COLUMNS).from(users).where(eq(users.orgId, orgId))
}

export async function createUser(input: CreateUserInput): Promise<UserSummary> {
  const { actorId, orgId, email, name, globalRole, password } = input
  await assertGlobalAdmin(actorId)

  const passwordHash = bcryptjs.hashSync(password, 12)
  const newUserId = createId()

  try {
    await db.insert(users).values({
      id: newUserId,
      orgId,
      email,
      name,
      globalRole,
      isActive: true,
      passwordHash,
    })
  } catch (err: unknown) {
    if (isDuplicateKeyError(err)) {
      throw new UserServiceError('A user with this email already exists.', 'EMAIL_TAKEN')
    }
    throw err
  }

  return getUserSummary(newUserId)
}

export async function updateUser(input: UpdateUserInput): Promise<UserSummary> {
  const { actorId, userId, patch } = input
  const { orgId } = await assertGlobalAdmin(actorId)

  const [target] = await db
    .select({ id: users.id, globalRole: users.globalRole })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  if (!target) {
    throw new UserServiceError('User not found.', 'USER_NOT_FOUND')
  }

  const isDemotingOrDeactivating =
    (patch.globalRole !== undefined && !ADMIN_GLOBAL_ROLES.has(patch.globalRole)) ||
    patch.isActive === false

  if (isDemotingOrDeactivating && ADMIN_GLOBAL_ROLES.has(target.globalRole)) {
    const otherAdmins = await countOtherActiveAdmins(orgId, userId)
    if (otherAdmins === 0) {
      throw new UserServiceError(
        'Cannot demote or deactivate the last active admin.',
        'LAST_ADMIN',
      )
    }
  }

  await db.update(users).set(patch).where(eq(users.id, userId))

  return getUserSummary(userId)
}
