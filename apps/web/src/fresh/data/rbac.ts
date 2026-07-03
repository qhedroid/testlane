/** Frontend-only RBAC for the admin / settings prototype. */

export const PERMISSION_KEYS = [
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

export type PermissionKey = (typeof PERMISSION_KEYS)[number]

export type AdminUserRole =
  | 'Owner'
  | 'Administrator'
  | 'Project Administrator'
  | 'Editor'
  | 'Run Manager'
  | 'Run Executor'
  | 'Viewer'

export const ADMIN_USER_ROLES: AdminUserRole[] = [
  'Owner',
  'Administrator',
  'Project Administrator',
  'Editor',
  'Run Manager',
  'Run Executor',
  'Viewer',
]

export const PERMISSION_LABELS: Record<PermissionKey, string> = {
  viewProjects: 'View projects',
  manageProjects: 'Manage projects',
  viewTestCases: 'View test cases',
  manageTestCases: 'Manage test cases',
  viewTestPlans: 'View test plans',
  manageTestPlans: 'Manage test plans',
  viewTestRuns: 'View test runs',
  manageTestRuns: 'Manage test runs',
  executeTestRuns: 'Execute test runs',
  viewDefects: 'View defects',
  manageDefects: 'Manage defects',
  viewReports: 'View reports',
  manageUsers: 'Manage users',
  manageRoles: 'Manage roles',
  manageSettings: 'Manage settings',
  viewAuditLog: 'View audit log',
}

export type RolePermissions = Record<PermissionKey, boolean>

export function emptyPermissions(): RolePermissions {
  return Object.fromEntries(PERMISSION_KEYS.map((k) => [k, false])) as RolePermissions
}

export function allPermissions(): RolePermissions {
  return Object.fromEntries(PERMISSION_KEYS.map((k) => [k, true])) as RolePermissions
}

function withPermissions(overrides: Partial<RolePermissions>): RolePermissions {
  return { ...emptyPermissions(), ...overrides }
}

/** Built-in role permission templates (frontend demo). */
export const BUILTIN_ROLE_PERMISSIONS: Record<AdminUserRole, RolePermissions> = {
  Owner: allPermissions(),
  Administrator: allPermissions(),
  'Project Administrator': withPermissions({
    viewProjects: true,
    manageProjects: true,
    viewTestCases: true,
    manageTestCases: true,
    viewTestPlans: true,
    manageTestPlans: true,
    viewTestRuns: true,
    manageTestRuns: true,
    executeTestRuns: true,
    viewDefects: true,
    manageDefects: true,
    viewReports: true,
    manageSettings: true,
    viewAuditLog: true,
  }),
  Editor: withPermissions({
    viewProjects: true,
    viewTestCases: true,
    manageTestCases: true,
    viewTestPlans: true,
    manageTestPlans: true,
    viewTestRuns: true,
    viewDefects: true,
    viewReports: true,
    manageSettings: true,
    viewAuditLog: true,
  }),
  'Run Manager': withPermissions({
    viewProjects: true,
    viewTestCases: true,
    viewTestPlans: true,
    viewTestRuns: true,
    manageTestRuns: true,
    executeTestRuns: true,
    viewDefects: true,
    viewReports: true,
    viewAuditLog: true,
  }),
  'Run Executor': withPermissions({
    viewProjects: true,
    viewTestCases: true,
    viewTestPlans: true,
    viewTestRuns: true,
    executeTestRuns: true,
    viewDefects: true,
    viewAuditLog: true,
  }),
  Viewer: withPermissions({
    viewProjects: true,
    viewTestCases: true,
    viewTestPlans: true,
    viewTestRuns: true,
    viewDefects: true,
    viewReports: true,
    viewAuditLog: true,
  }),
}

export const BUILTIN_ROLE_META: Record<
  AdminUserRole,
  { description: string; isProjectLevel: boolean }
> = {
  Owner: { description: 'Built-in — Full organisation control.', isProjectLevel: false },
  Administrator: { description: 'Built-in — Includes all organisation permissions.', isProjectLevel: false },
  'Project Administrator': {
    description: 'Built-in — Administrator for a specific project.',
    isProjectLevel: true,
  },
  Editor: { description: 'Built-in — Can manage test case folders and cases.', isProjectLevel: true },
  'Run Manager': { description: 'Built-in — Can manage and execute test runs.', isProjectLevel: true },
  'Run Executor': { description: 'Built-in — Can execute test runs.', isProjectLevel: true },
  Viewer: { description: 'Built-in — Can view project data.', isProjectLevel: true },
}

export const PERMISSION_DENIED_MESSAGE =
  'You do not have permission to perform this action in the current demo role.'

export const FINAL_ADMIN_DISABLE_MESSAGE =
  'You cannot disable the final Owner or Administrator.'

export const FINAL_ADMIN_REMOVE_MESSAGE =
  'You cannot remove the final Owner or Administrator.'

type AdminUserLike = {
  id: string
  role: AdminUserRole
  status: string
}

export function isEffectiveAdmin(user: Pick<AdminUserLike, 'role' | 'status'>): boolean {
  return (user.role === 'Owner' || user.role === 'Administrator') && user.status !== 'Disabled'
}

export function countEffectiveAdmins(users: readonly Pick<AdminUserLike, 'role' | 'status'>[]): number {
  return users.filter(isEffectiveAdmin).length
}

/** True when disabling this user would remove the last active Owner/Administrator. */
export function isFinalEffectiveAdmin(users: readonly AdminUserLike[], userId: string): boolean {
  const target = users.find((u) => u.id === userId)
  if (!target || !isEffectiveAdmin(target)) return false
  return countEffectiveAdmins(users) === 1
}

export function canDisableAdminUser(users: readonly AdminUserLike[], userId: string): boolean {
  return !isFinalEffectiveAdmin(users, userId)
}

/** Demo actor capabilities for user/role management screens. */
export function canManageUsers(role: AdminUserRole): boolean {
  return role === 'Owner' || role === 'Administrator'
}

export function canManageRoles(role: AdminUserRole): boolean {
  return role === 'Owner' || role === 'Administrator'
}

export function canViewUserManagement(role: AdminUserRole): boolean {
  return role !== 'Viewer'
}

export function isViewerRole(role: AdminUserRole): boolean {
  return role === 'Viewer'
}

export function permissionsForRoleName(
  roleName: string,
  customPermissions?: RolePermissions,
): RolePermissions {
  if (customPermissions) return customPermissions
  const builtIn = BUILTIN_ROLE_PERMISSIONS[roleName as AdminUserRole]
  return builtIn ?? emptyPermissions()
}

export function formatProjectAccess(keys: string[]): string {
  if (keys.length === 0) return 'None'
  if (keys.includes('__all__')) return 'All projects'
  return keys.join(', ')
}
