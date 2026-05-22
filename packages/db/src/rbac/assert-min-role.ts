import { and, eq } from 'drizzle-orm'
import { projectRoles, users } from '../../schema'
import { db } from '../index'

const ROLE_LEVEL = {
  super_admin: 4,
  admin: 3,
  contributor: 2,
  viewer: 1,
} as const

export type PlatformRole = keyof typeof ROLE_LEVEL

const MIN_LEVEL = {
  admin: ROLE_LEVEL.admin,
  contributor: ROLE_LEVEL.contributor,
  viewer: ROLE_LEVEL.viewer,
} as const

export type MinRole = keyof typeof MIN_LEVEL

export class InsufficientPermissionsError extends Error {
  constructor(message = 'Insufficient permissions for this action.') {
    super(message)
    this.name = 'InsufficientPermissionsError'
  }
}

/**
 * Effective role = max(users.global_role, project_roles.role) in hierarchy.
 * super_admin > admin > contributor > viewer
 */
export async function assertMinProjectRole(
  actorId: string,
  projectId: string,
  minRole: MinRole,
): Promise<void> {
  const required = MIN_LEVEL[minRole]

  const [user] = await db
    .select({ globalRole: users.globalRole, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, actorId))
    .limit(1)

  if (!user?.isActive) {
    throw new InsufficientPermissionsError('User not found or inactive.')
  }

  const globalLevel = ROLE_LEVEL[user.globalRole as PlatformRole] ?? 0
  if (globalLevel >= required) return

  const [projectRole] = await db
    .select({ role: projectRoles.role })
    .from(projectRoles)
    .where(
      and(eq(projectRoles.projectId, projectId), eq(projectRoles.userId, actorId)),
    )
    .limit(1)

  const projectLevel = projectRole
    ? (ROLE_LEVEL[projectRole.role as PlatformRole] ?? 0)
    : 0

  if (Math.max(globalLevel, projectLevel) < required) {
    throw new InsufficientPermissionsError()
  }
}
