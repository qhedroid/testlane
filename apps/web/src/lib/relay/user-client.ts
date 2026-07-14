/**
 * user-client.ts
 *
 * Real-backend user list/create/update for the Admin panel wiring pass
 * (mvp-backend Phase 7). Targets Phase 1's /api/users/* routes (real session
 * auth, global-admin-gated server-side).
 *
 * Role model note (the Phase 7 "unification" decision, made in this pass):
 * the Admin panel's 7 granular roles (Owner/Administrator/Project
 * Administrator/Editor/Run Manager/Run Executor/Viewer) have no DB table —
 * the server only knows users.globalRole (super_admin/admin/contributor/
 * viewer). So, consistent with every other hybrid-screen decision on this
 * branch: the granular role stays a LOCAL-ONLY field, and every role write is
 * *compressed* onto globalRole for the server (same mapping the 2026-07-09
 * seed-user overhaul documented in docs/claude/handoff.md). /admin/roles'
 * role *definitions* remain entirely local for the same reason.
 *
 * Invited users are created server-side with the shared local-dev password
 * ('testlane-demo-2026', same as the seed users — see README "Local dev login")
 * so they can actually log in. Fine for local dev; obviously not a
 * production pattern.
 */

import type { AdminUserRole } from '@/fresh/data/rbac'
import type { ApiErrorBody, ApiSuccessBody } from '@/lib/api/types'
import { RELAY_ORG_ID } from './config'
import { TestlaneApiError } from './project-client'

async function parseResponse<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiSuccessBody<T> | ApiErrorBody
  if (!res.ok) {
    const err = 'error' in json ? json.error : { code: 'UNKNOWN', message: res.statusText }
    throw new TestlaneApiError(err.code, err.message)
  }
  return (json as ApiSuccessBody<T>).data
}

export type RealGlobalRole = 'super_admin' | 'admin' | 'contributor' | 'viewer'

/** JSON-serialised UserSummary from packages/db/services/UserService.ts. */
export interface RealUser {
  id: string
  name: string
  email: string
  globalRole: RealGlobalRole
  isActive: boolean
  lastLoginAt: string | null
}

/** Shared local-dev password for admin-invited users (matches the seed users). */
export const DEFAULT_INVITE_PASSWORD = 'testlane-demo-2026'

/** Granular Admin-panel role -> DB globalRole (lossy compression — see file header). */
export const ADMIN_ROLE_TO_GLOBAL: Record<AdminUserRole, RealGlobalRole> = {
  Owner: 'super_admin',
  Administrator: 'admin',
  'Project Administrator': 'contributor',
  Editor: 'contributor',
  'Run Manager': 'contributor',
  'Run Executor': 'contributor',
  Viewer: 'viewer',
}

/** DB globalRole -> a representative granular role, for server users the
 * local Admin mock has never seen (reverse of a lossy map — best effort). */
export const GLOBAL_TO_ADMIN_ROLE: Record<RealGlobalRole, AdminUserRole> = {
  super_admin: 'Owner',
  admin: 'Administrator',
  contributor: 'Editor',
  viewer: 'Viewer',
}

export async function fetchRealUsers(): Promise<RealUser[]> {
  const data = await parseResponse<{ users: RealUser[] }>(
    await fetch('/api/users', { credentials: 'same-origin' }),
  )
  return data.users
}

export async function createRealUser(input: {
  email: string
  name: string
  role: AdminUserRole
}): Promise<RealUser> {
  return parseResponse<RealUser>(
    await fetch('/api/users', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgId: RELAY_ORG_ID,
        email: input.email,
        name: input.name,
        globalRole: ADMIN_ROLE_TO_GLOBAL[input.role],
        password: DEFAULT_INVITE_PASSWORD,
      }),
    }),
  )
}

export async function updateRealUser(
  userId: string,
  patch: { name?: string; globalRole?: RealGlobalRole; isActive?: boolean },
): Promise<RealUser> {
  return parseResponse<RealUser>(
    await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    }),
  )
}
