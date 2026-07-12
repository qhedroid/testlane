/**
 * admin-seed.ts
 *
 * Seeds the Admin panel's org-scoped data (new-tables candidate, Phase G):
 *   - the 7 built-in role DEFINITIONS (isBuiltIn=true), and
 *   - the 8 demo API keys,
 * so the Admin panel shows real backed data on first login (matched into the
 * frontend mock by name/id via SYNC_REAL_ROLES / SYNC_REAL_API_KEYS).
 *
 * The role names + permission maps here MUST stay aligned with the frontend's
 * apps/web/src/fresh/data/rbac.ts (ADMIN_USER_ROLES / BUILTIN_ROLE_PERMISSIONS /
 * BUILTIN_ROLE_META). @relay/db cannot import from apps/web, so the built-in
 * role data is mirrored here deliberately (same accepted duplication as other
 * frontend-shape couplings on this branch — flagged, not silent). The API key
 * values mirror admin-initial-settings.ts's seedApiKeys().
 */

import type { MySql2Database } from 'drizzle-orm/mysql2'
import { apiKeys, roleDefinitions, type RolePermissionMap } from '../../schema'
import type * as schema from '../../schema'
import { ids } from './ids'

const PERMISSION_KEYS = [
  'viewProjects',
  'manageProjects',
  'viewTestCases',
  'manageTestCases',
  'viewTestPlans',
  'manageTestPlans',
  'viewTestRuns',
  'manageTestRuns',
  'executeTestRuns',
  'viewDefects',
  'manageDefects',
  'viewReports',
  'manageUsers',
  'manageRoles',
  'manageSettings',
  'viewAuditLog',
] as const

/** Build a full 16-key permission map with only `enabled` keys set true. */
function perms(enabled: readonly string[]): RolePermissionMap {
  const set = new Set(enabled)
  return Object.fromEntries(PERMISSION_KEYS.map((k) => [k, set.has(k)]))
}

const ALL = PERMISSION_KEYS

// Mirrors rbac.ts BUILTIN_ROLE_PERMISSIONS / BUILTIN_ROLE_META exactly.
const BUILTIN_ROLES: Array<{
  id: string
  name: string
  description: string
  isProjectLevel: boolean
  permissions: RolePermissionMap
}> = [
  {
    id: ids.roleDefinitions.owner,
    name: 'Owner',
    description: 'Built-in — Full organisation control.',
    isProjectLevel: false,
    permissions: perms(ALL),
  },
  {
    id: ids.roleDefinitions.administrator,
    name: 'Administrator',
    description: 'Built-in — Includes all organisation permissions.',
    isProjectLevel: false,
    permissions: perms(ALL),
  },
  {
    id: ids.roleDefinitions.projectAdmin,
    name: 'Project Administrator',
    description: 'Built-in — Administrator for a specific project.',
    isProjectLevel: true,
    permissions: perms([
      'viewProjects',
      'manageProjects',
      'viewTestCases',
      'manageTestCases',
      'viewTestPlans',
      'manageTestPlans',
      'viewTestRuns',
      'manageTestRuns',
      'executeTestRuns',
      'viewDefects',
      'manageDefects',
      'viewReports',
      'manageSettings',
      'viewAuditLog',
    ]),
  },
  {
    id: ids.roleDefinitions.editor,
    name: 'Editor',
    description: 'Built-in — Can manage test case folders and cases.',
    isProjectLevel: true,
    permissions: perms([
      'viewProjects',
      'viewTestCases',
      'manageTestCases',
      'viewTestPlans',
      'manageTestPlans',
      'viewTestRuns',
      'viewDefects',
      'viewReports',
      'manageSettings',
      'viewAuditLog',
    ]),
  },
  {
    id: ids.roleDefinitions.runManager,
    name: 'Run Manager',
    description: 'Built-in — Can manage and execute test runs.',
    isProjectLevel: true,
    permissions: perms([
      'viewProjects',
      'viewTestCases',
      'viewTestPlans',
      'viewTestRuns',
      'manageTestRuns',
      'executeTestRuns',
      'viewDefects',
      'viewReports',
      'viewAuditLog',
    ]),
  },
  {
    id: ids.roleDefinitions.runExecutor,
    name: 'Run Executor',
    description: 'Built-in — Can execute test runs.',
    isProjectLevel: true,
    permissions: perms([
      'viewProjects',
      'viewTestCases',
      'viewTestPlans',
      'viewTestRuns',
      'executeTestRuns',
      'viewDefects',
      'viewAuditLog',
    ]),
  },
  {
    id: ids.roleDefinitions.viewer,
    name: 'Viewer',
    description: 'Built-in — Can view project data.',
    isProjectLevel: true,
    permissions: perms([
      'viewProjects',
      'viewTestCases',
      'viewTestPlans',
      'viewTestRuns',
      'viewDefects',
      'viewReports',
      'viewAuditLog',
    ]),
  },
]

const DAY = 24 * 60 * 60 * 1000
const MIN = 60 * 1000

/** Mirrors admin-initial-settings.ts seedApiKeys(); createdBy maps the frontend
 * userId to the real seed user id where one exists, else null. */
function demoApiKeys(orgId: string) {
  const now = Date.now()
  return [
    { id: ids.apiKeys.myApiKey, name: 'my-api-key', keyMasked: 'Ab2XYZ***', project: 'All Projects', permissions: 'comment, manage…', expiration: 'No expiration', createdBy: null, createdAt: new Date(now - 45 * MIN) },
    { id: ids.apiKeys.ciKey, name: 'ci-key', keyMasked: 'Rw4KLM***', project: 'DP', permissions: 'read', expiration: 'No expiration', createdBy: null, createdAt: new Date(now - 2 * DAY) },
    { id: ids.apiKeys.automationKey, name: 'automation-key', keyMasked: 'Xc9NOP***', project: 'All Projects', permissions: 'comment, manage…', expiration: '90 days', createdBy: null, createdAt: new Date(now - 5 * DAY) },
    { id: ids.apiKeys.noelDev, name: 'noel-dev', keyMasked: 'Qm7PQR***', project: 'CTMS', permissions: 'read, comment', expiration: '30 days', createdBy: ids.users.noel, createdAt: new Date(now - 7 * DAY) },
    { id: ids.apiKeys.monicaCi, name: 'monica-ci', keyMasked: 'Ty3STU***', project: 'DP', permissions: 'read', expiration: '1 year', createdBy: ids.users.priya, createdAt: new Date(now - 10 * DAY) },
    { id: ids.apiKeys.arvindhSync, name: 'arvindh-sync', keyMasked: 'Uv8VWX***', project: 'All Projects', permissions: 'manage', expiration: 'No expiration', createdBy: ids.users.viewer, createdAt: new Date(now - 12 * DAY) },
    { id: ids.apiKeys.stagingKey, name: 'staging-key', keyMasked: 'Za1BCD***', project: 'IAM', permissions: 'read, comment', expiration: '90 days', createdBy: null, createdAt: new Date(now - 14 * DAY) },
    { id: ids.apiKeys.syedExport, name: 'syed-export', keyMasked: 'Ef5GHI***', project: 'DP1', permissions: 'read', expiration: 'No expiration', createdBy: ids.users.syed, createdAt: new Date(now - 20 * DAY) },
  ].map((k) => ({ ...k, orgId }))
}

export async function insertAdminSeed(
  db: MySql2Database<typeof schema>,
): Promise<void> {
  await db.insert(roleDefinitions).values(
    BUILTIN_ROLES.map((r) => ({
      id: r.id,
      orgId: ids.org,
      name: r.name,
      description: r.description,
      isProjectLevel: r.isProjectLevel,
      isBuiltIn: true,
      permissions: r.permissions,
    })),
  )

  await db.insert(apiKeys).values(demoApiKeys(ids.org))
}
