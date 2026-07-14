/**
 * admin-role-client.ts
 *
 * Real-backend Admin role DEFINITIONS for the Admin panel wiring (new-tables
 * candidate, Phase G). Targets /api/admin/roles/* (real NextAuth session cookie
 * auth, global-admin-gated server-side — the panel falls back to the local mock
 * on a 403, same as user-client.ts). Roles are org-scoped, not project-scoped.
 *
 * Faithful round-trip of the frontend AdminRole model (demo-model.ts):
 *   - permissions <-> the server's Record<string, boolean> JSON, coerced back to
 *     the full 16-key RolePermissions shape via emptyPermissions() so a partial
 *     or legacy server map still yields a valid RolePermissions.
 *   - userCount is NOT stored server-side — it's derived client-side by
 *     syncRoleUserCounts() after the sync (see FreshProvider SYNC_REAL_ROLES).
 *   - description null <-> '' (the frontend type is a non-optional string).
 */

import type { AdminRole } from '@/fresh/data/demo-model'
import { emptyPermissions, type RolePermissions } from '@/fresh/data/rbac'
import type { ApiErrorBody, ApiSuccessBody } from '@/lib/api/types'
import { TestlaneApiError } from './project-client'

async function parseResponse<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiSuccessBody<T> | ApiErrorBody
  if (!res.ok) {
    const err = 'error' in json ? json.error : { code: 'UNKNOWN', message: res.statusText }
    throw new TestlaneApiError(err.code, err.message)
  }
  return (json as ApiSuccessBody<T>).data
}

/** JSON-serialised RoleDefinitionSummary from AdminSettingsService.ts. */
export interface RealRole {
  id: string
  name: string
  description: string | null
  isProjectLevel: boolean
  isBuiltIn: boolean
  permissions: Record<string, boolean> | null
  createdAt: string
  updatedAt: string
}

export interface CreateRealRoleBody {
  name: string
  description?: string | null
  isProjectLevel: boolean
  permissions: RolePermissions
}

export interface UpdateRealRoleBody {
  name?: string
  description?: string | null
  isProjectLevel?: boolean
  permissions?: RolePermissions
}

export async function fetchRealRoles(): Promise<RealRole[]> {
  const data = await parseResponse<{ roles: RealRole[] }>(
    await fetch('/api/admin/roles', { credentials: 'same-origin' }),
  )
  return data.roles
}

export async function createRealRole(body: CreateRealRoleBody): Promise<RealRole> {
  return parseResponse<RealRole>(
    await fetch('/api/admin/roles', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

export async function updateRealRole(
  roleId: string,
  body: UpdateRealRoleBody,
): Promise<RealRole> {
  return parseResponse<RealRole>(
    await fetch(`/api/admin/roles/${roleId}`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

export async function deleteRealRole(roleId: string): Promise<void> {
  await parseResponse<{ id: string }>(
    await fetch(`/api/admin/roles/${roleId}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    }),
  )
}

// ---------------------------------------------------------------------------
// Adapters
// ---------------------------------------------------------------------------

/** Coerce a possibly-partial server permission map to the full RolePermissions. */
export function toLocalPermissions(map: Record<string, boolean> | null): RolePermissions {
  return { ...emptyPermissions(), ...(map ?? {}) }
}

/** Server RoleDefinitionSummary -> frontend AdminRole. userCount is 0 here; the
 * reducer recomputes it via syncRoleUserCounts after merging. */
export function realRoleToLocal(r: RealRole): AdminRole {
  return {
    id: r.id,
    name: r.name,
    description: r.description ?? '',
    userCount: 0,
    isProjectLevel: r.isProjectLevel,
    isBuiltIn: r.isBuiltIn,
    permissions: toLocalPermissions(r.permissions),
  }
}
