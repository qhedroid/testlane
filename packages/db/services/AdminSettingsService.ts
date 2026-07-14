/**
 * AdminSettingsService.ts
 * Relay — Service layer
 *
 * Org-scoped Admin-panel settings: role DEFINITIONS + API keys (new-tables
 * candidate, Phase G). Roles + API keys only this phase — automation stays
 * local (AdminAutomationSource/Field) and custom fields are out of scope
 * (mvp-custom-fields owns them).
 *
 * RBAC is global-admin-or-above (super_admin/admin), NOT project-scoped — the
 * Admin panel is a global/org-level surface, same as UserService.ts. The
 * permission check here is therefore a small local `assertGlobalAdmin()` helper
 * (a copy of UserService's), not `assertMinProjectRole()`. The actor's orgId is
 * derived from the actor row — the org scope is never taken from client input.
 *
 * Every mutation records an org-scoped audit_log row (projectId null, orgId set)
 * via AuditService.recordAudit — mirroring how the project-scoped services audit.
 *
 * Built-in role definitions (isBuiltIn=true) are guarded against update and
 * delete, matching admin-reducer.ts's built-in guard on the frontend.
 */

import { and, asc, desc, eq } from 'drizzle-orm'
import {
  apiKeys,
  roleDefinitions,
  users,
  type NewApiKey,
  type NewRoleDefinition,
  type RolePermissionMap,
  type User,
} from '../schema'
import { db } from '../src/index'
import { createId } from '../src/utils/id'
import { recordAudit } from './AuditService'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type UserGlobalRole = User['globalRole']

export interface RoleDefinitionSummary {
  id: string
  name: string
  description: string | null
  isProjectLevel: boolean
  isBuiltIn: boolean
  permissions: RolePermissionMap | null
  createdAt: Date
  updatedAt: Date
}

export interface CreateRoleDefinitionInput {
  actorId: string
  name: string
  description?: string | null
  isProjectLevel: boolean
  permissions: RolePermissionMap
}

export interface UpdateRoleDefinitionInput {
  actorId: string
  roleId: string
  patch: Partial<{
    name: string
    description: string | null
    isProjectLevel: boolean
    permissions: RolePermissionMap
  }>
}

export interface ApiKeySummary {
  id: string
  name: string
  keyMasked: string
  project: string
  permissions: string
  expiration: string
  createdBy: string | null
  createdAt: Date
}

export interface CreateApiKeyInput {
  actorId: string
  name: string
  keyMasked: string
  project: string
  permissions: string
  expiration: string
  /** Creating user id — validated against the org; falls back to null. */
  createdBy?: string | null
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type AdminRoleServiceErrorCode =
  | 'INSUFFICIENT_PERMISSIONS'
  | 'ROLE_NOT_FOUND'
  | 'DUPLICATE_ROLE_NAME'
  | 'BUILT_IN_IMMUTABLE'

export class AdminRoleServiceError extends Error {
  constructor(
    message: string,
    public readonly code: AdminRoleServiceErrorCode,
  ) {
    super(message)
    this.name = 'AdminRoleServiceError'
  }
}

export type AdminApiKeyServiceErrorCode = 'INSUFFICIENT_PERMISSIONS' | 'API_KEY_NOT_FOUND'

export class AdminApiKeyServiceError extends Error {
  constructor(
    message: string,
    public readonly code: AdminApiKeyServiceErrorCode,
  ) {
    super(message)
    this.name = 'AdminApiKeyServiceError'
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

const ADMIN_GLOBAL_ROLES = new Set<UserGlobalRole>(['super_admin', 'admin'])

/**
 * Assert the actor is an active global admin (or super_admin) and return their
 * orgId. Copy of UserService.assertGlobalAdmin — deliberately self-contained.
 * Throws with the caller-supplied error class so each surface maps cleanly to
 * its own INSUFFICIENT_PERMISSIONS code.
 */
async function assertGlobalAdmin(
  actorId: string,
  Err: typeof AdminRoleServiceError | typeof AdminApiKeyServiceError,
): Promise<{ orgId: string }> {
  const [actor] = await db
    .select({ orgId: users.orgId, globalRole: users.globalRole, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, actorId))
    .limit(1)

  if (!actor?.isActive || !ADMIN_GLOBAL_ROLES.has(actor.globalRole)) {
    throw new Err('Insufficient permissions for this action.', 'INSUFFICIENT_PERMISSIONS')
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

function toRoleSummary(row: typeof roleDefinitions.$inferSelect): RoleDefinitionSummary {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    isProjectLevel: row.isProjectLevel,
    isBuiltIn: row.isBuiltIn,
    permissions: row.permissions,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

function toApiKeySummary(row: typeof apiKeys.$inferSelect): ApiKeySummary {
  return {
    id: row.id,
    name: row.name,
    keyMasked: row.keyMasked,
    project: row.project,
    permissions: row.permissions,
    expiration: row.expiration,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
  }
}

// ---------------------------------------------------------------------------
// Role definitions
// ---------------------------------------------------------------------------

export async function listRoleDefinitions(actorId: string): Promise<RoleDefinitionSummary[]> {
  const { orgId } = await assertGlobalAdmin(actorId, AdminRoleServiceError)

  // Built-in-first ordering (they're seeded first, in ADMIN_USER_ROLES order),
  // so the frontend match-by-name sync keeps a stable, familiar order.
  const rows = await db
    .select()
    .from(roleDefinitions)
    .where(eq(roleDefinitions.orgId, orgId))
    .orderBy(desc(roleDefinitions.isBuiltIn), asc(roleDefinitions.createdAt))

  return rows.map(toRoleSummary)
}

export async function createRoleDefinition(
  input: CreateRoleDefinitionInput,
): Promise<RoleDefinitionSummary> {
  const { actorId, name, description, isProjectLevel, permissions } = input
  const { orgId } = await assertGlobalAdmin(actorId, AdminRoleServiceError)

  const newId = createId()
  const newRow: NewRoleDefinition = {
    id: newId,
    orgId,
    name,
    description: description ?? null,
    isProjectLevel,
    isBuiltIn: false,
    permissions,
  }

  try {
    await db.insert(roleDefinitions).values(newRow)
  } catch (err: unknown) {
    if (isDuplicateKeyError(err)) {
      throw new AdminRoleServiceError(
        'A role with this name already exists.',
        'DUPLICATE_ROLE_NAME',
      )
    }
    throw err
  }

  await recordAudit({
    orgId,
    entityType: 'role_definition',
    entityId: newId,
    action: 'role.created',
    actorId,
    newValue: { name, isProjectLevel },
  })

  return {
    id: newId,
    name,
    description: description ?? null,
    isProjectLevel,
    isBuiltIn: false,
    permissions,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

export async function updateRoleDefinition(
  input: UpdateRoleDefinitionInput,
): Promise<RoleDefinitionSummary> {
  const { actorId, roleId, patch } = input
  const { orgId } = await assertGlobalAdmin(actorId, AdminRoleServiceError)

  const [target] = await db
    .select()
    .from(roleDefinitions)
    .where(and(eq(roleDefinitions.id, roleId), eq(roleDefinitions.orgId, orgId)))
    .limit(1)

  if (!target) {
    throw new AdminRoleServiceError('Role not found.', 'ROLE_NOT_FOUND')
  }
  if (target.isBuiltIn) {
    throw new AdminRoleServiceError(
      'Built-in roles cannot be edited.',
      'BUILT_IN_IMMUTABLE',
    )
  }

  if (Object.keys(patch).length === 0) {
    return toRoleSummary(target)
  }

  try {
    await db.update(roleDefinitions).set(patch).where(eq(roleDefinitions.id, roleId))
  } catch (err: unknown) {
    if (isDuplicateKeyError(err)) {
      throw new AdminRoleServiceError(
        'A role with this name already exists.',
        'DUPLICATE_ROLE_NAME',
      )
    }
    throw err
  }

  await recordAudit({
    orgId,
    entityType: 'role_definition',
    entityId: roleId,
    action: 'role.updated',
    actorId,
    newValue: { name: patch.name ?? target.name },
  })

  const [updated] = await db
    .select()
    .from(roleDefinitions)
    .where(eq(roleDefinitions.id, roleId))
    .limit(1)

  return toRoleSummary(updated)
}

export async function deleteRoleDefinition(input: {
  actorId: string
  roleId: string
}): Promise<{ id: string }> {
  const { actorId, roleId } = input
  const { orgId } = await assertGlobalAdmin(actorId, AdminRoleServiceError)

  const [target] = await db
    .select({ id: roleDefinitions.id, name: roleDefinitions.name, isBuiltIn: roleDefinitions.isBuiltIn })
    .from(roleDefinitions)
    .where(and(eq(roleDefinitions.id, roleId), eq(roleDefinitions.orgId, orgId)))
    .limit(1)

  if (!target) {
    throw new AdminRoleServiceError('Role not found.', 'ROLE_NOT_FOUND')
  }
  if (target.isBuiltIn) {
    throw new AdminRoleServiceError(
      'Built-in roles cannot be deleted.',
      'BUILT_IN_IMMUTABLE',
    )
  }

  await db.delete(roleDefinitions).where(eq(roleDefinitions.id, roleId))

  await recordAudit({
    orgId,
    entityType: 'role_definition',
    entityId: roleId,
    action: 'role.deleted',
    actorId,
    oldValue: { name: target.name },
  })

  return { id: roleId }
}

// ---------------------------------------------------------------------------
// API keys
// ---------------------------------------------------------------------------

export async function listApiKeys(actorId: string): Promise<ApiKeySummary[]> {
  const { orgId } = await assertGlobalAdmin(actorId, AdminApiKeyServiceError)

  const rows = await db
    .select()
    .from(apiKeys)
    .where(eq(apiKeys.orgId, orgId))
    .orderBy(desc(apiKeys.createdAt))

  return rows.map(toApiKeySummary)
}

export async function createApiKey(input: CreateApiKeyInput): Promise<ApiKeySummary> {
  const { actorId, name, keyMasked, project, permissions, expiration } = input
  const { orgId } = await assertGlobalAdmin(actorId, AdminApiKeyServiceError)

  // createdBy is a real users.id FK — only persist it if it resolves to a user
  // in this org, otherwise store null (the frontend's local admin-mock ids
  // wouldn't be valid FKs). See the assignee/assignedTo note in TestCaseService.
  let createdBy: string | null = null
  if (input.createdBy) {
    const [creator] = await db
      .select({ id: users.id })
      .from(users)
      .where(and(eq(users.id, input.createdBy), eq(users.orgId, orgId)))
      .limit(1)
    createdBy = creator?.id ?? null
  }

  const newId = createId()
  const newRow: NewApiKey = {
    id: newId,
    orgId,
    name,
    keyMasked,
    project,
    permissions,
    expiration,
    createdBy,
  }
  await db.insert(apiKeys).values(newRow)

  await recordAudit({
    orgId,
    entityType: 'api_key',
    entityId: newId,
    action: 'api_key.created',
    actorId,
    newValue: { name, project },
  })

  const [row] = await db.select().from(apiKeys).where(eq(apiKeys.id, newId)).limit(1)
  return toApiKeySummary(row)
}

export async function deleteApiKey(input: {
  actorId: string
  keyId: string
}): Promise<{ id: string }> {
  const { actorId, keyId } = input
  const { orgId } = await assertGlobalAdmin(actorId, AdminApiKeyServiceError)

  const [target] = await db
    .select({ id: apiKeys.id, name: apiKeys.name })
    .from(apiKeys)
    .where(and(eq(apiKeys.id, keyId), eq(apiKeys.orgId, orgId)))
    .limit(1)

  if (!target) {
    throw new AdminApiKeyServiceError('API key not found.', 'API_KEY_NOT_FOUND')
  }

  await db.delete(apiKeys).where(eq(apiKeys.id, keyId))

  await recordAudit({
    orgId,
    entityType: 'api_key',
    entityId: keyId,
    action: 'api_key.deleted',
    actorId,
    oldValue: { name: target.name },
  })

  return { id: keyId }
}
