/**
 * ProjectService.ts
 * Testlane — Service layer
 *
 * Project listing/creation and project-role assignment. Reuses
 * `assertMinProjectRole()` from `../src/rbac/assert-min-role` directly —
 * role hierarchy math is not reimplemented here.
 */

import { and, eq } from 'drizzle-orm'
import { projectRoles, projects, users, type ProjectRole } from '../schema'
import { db } from '../src/index'
import { assertMinProjectRole } from '../src/rbac/assert-min-role'
import { createId } from '../src/utils/id'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProjectSummary {
  id: string
  slug: string
  name: string
  description: string | null
  status: string
}

export interface CreateProjectInput {
  actorId: string
  orgId: string
  slug: string
  name: string
  description?: string
}

export type ProjectRoleValue = ProjectRole['role']

export interface AssignProjectRoleInput {
  actorId: string
  projectId: string
  userId: string
  role: ProjectRoleValue
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type ProjectServiceErrorCode =
  | 'INSUFFICIENT_PERMISSIONS'
  | 'DUPLICATE_SLUG'
  | 'PROJECT_NOT_FOUND'

export class ProjectServiceError extends Error {
  constructor(
    message: string,
    public readonly code: ProjectServiceErrorCode,
  ) {
    super(message)
    this.name = 'ProjectServiceError'
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const PROJECT_SUMMARY_COLUMNS = {
  id: projects.id,
  slug: projects.slug,
  name: projects.name,
  description: projects.description,
  status: projects.status,
} as const

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'errno' in err &&
    (err as { errno: number }).errno === 1062
  )
}

async function assertGlobalAdmin(actorId: string): Promise<{ orgId: string }> {
  const [actor] = await db
    .select({ orgId: users.orgId, globalRole: users.globalRole, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, actorId))
    .limit(1)

  if (!actor?.isActive || !(actor.globalRole === 'super_admin' || actor.globalRole === 'admin')) {
    throw new ProjectServiceError(
      'Insufficient permissions for this action.',
      'INSUFFICIENT_PERMISSIONS',
    )
  }

  return { orgId: actor.orgId }
}

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

/**
 * super_admin/admin (global) see every active project in the org.
 * contributor/viewer see only projects they hold a `project_roles` row for.
 *
 * Note: `ProjectSwitcher.tsx` still reads a static/local project list today —
 * wiring it to this function is deferred to a later phase, once there's more
 * than one backend-wired module to switch between meaningfully.
 */
export async function listProjects(actorId: string): Promise<ProjectSummary[]> {
  const [actor] = await db
    .select({ orgId: users.orgId, globalRole: users.globalRole, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, actorId))
    .limit(1)

  if (!actor?.isActive) {
    throw new ProjectServiceError(
      'Insufficient permissions for this action.',
      'INSUFFICIENT_PERMISSIONS',
    )
  }

  if (actor.globalRole === 'super_admin' || actor.globalRole === 'admin') {
    return db
      .select(PROJECT_SUMMARY_COLUMNS)
      .from(projects)
      .where(and(eq(projects.orgId, actor.orgId), eq(projects.status, 'active')))
  }

  return db
    .select(PROJECT_SUMMARY_COLUMNS)
    .from(projects)
    .innerJoin(projectRoles, eq(projectRoles.projectId, projects.id))
    .where(
      and(
        eq(projects.orgId, actor.orgId),
        eq(projects.status, 'active'),
        eq(projectRoles.userId, actorId),
      ),
    )
}

export async function createProject(input: CreateProjectInput): Promise<ProjectSummary> {
  const { actorId, orgId, slug, name, description } = input
  await assertGlobalAdmin(actorId)

  const newProjectId = createId()

  try {
    await db.insert(projects).values({
      id: newProjectId,
      orgId,
      slug,
      name,
      description: description ?? null,
      status: 'active',
      createdBy: actorId,
    })
  } catch (err: unknown) {
    if (isDuplicateKeyError(err)) {
      throw new ProjectServiceError(
        'A project with this slug already exists in this org.',
        'DUPLICATE_SLUG',
      )
    }
    throw err
  }

  const [row] = await db
    .select(PROJECT_SUMMARY_COLUMNS)
    .from(projects)
    .where(eq(projects.id, newProjectId))
    .limit(1)

  return row
}

export async function assignProjectRole(input: AssignProjectRoleInput): Promise<void> {
  const { actorId, projectId, userId, role } = input

  await assertMinProjectRole(actorId, projectId, 'admin')

  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)

  if (!project) {
    throw new ProjectServiceError('Project not found.', 'PROJECT_NOT_FOUND')
  }

  await db
    .insert(projectRoles)
    .values({
      id: createId(),
      projectId,
      userId,
      role,
      grantedBy: actorId,
    })
    .onDuplicateKeyUpdate({ set: { role, grantedBy: actorId } })
}
