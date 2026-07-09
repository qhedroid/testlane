import type {
  AdminApiKey,
  AdminAutomationField,
  AdminAutomationSource,
  AdminCustomField,
  AdminRole,
  AdminSettings,
  AdminUser,
  AuditLogEntry,
} from './demo-model'
import {
  ADMIN_USER_ROLES,
  BUILTIN_ROLE_META,
  BUILTIN_ROLE_PERMISSIONS,
  type AdminUserRole,
} from './rbac'

const NOW = Date.now()
const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

function ago(ms: number): number {
  return NOW - ms
}

export const SEED_ADMIN_USER_ID = 'admin-user-demo'

// Real team member IDs — see apps/web/src/fresh/data/team-users.ts for the
// canonical 8-name roster shared with the rest of the demo app. Roles below
// were assigned by Shaun 2026-07-09: Owner (Demo User, unchanged), Administrator
// (Shaun, Noel), Run Manager (Syed), Run Executor (Jamil, Nasir), Editor (Monica,
// Arvindh), Viewer (Nadim).
const SEED_USER_IDS = {
  demo: 'admin-user-demo',
  shaun: 'admin-user-shaun',
  noel: 'admin-user-noel',
  syed: 'admin-user-syed',
  jamil: 'admin-user-jamil',
  nasir: 'admin-user-nasir',
  monica: 'admin-user-monica',
  arvindh: 'admin-user-arvindh',
  nadim: 'admin-user-nadim',
} as const

export const SEED_CUSTOM_FIELD_IDS = [
  'admin-cf-testrail',
  'admin-cf-priority',
  'admin-cf-references',
  'admin-cf-automated',
  'admin-cf-ti-version',
  'admin-cf-signature',
  'admin-cf-ctms-tags',
  'admin-cf-component',
] as const

function user(
  id: string,
  firstName: string,
  lastName: string,
  email: string,
  role: AdminUserRole,
  status: AdminUser['status'],
  lastLoginAt: number,
  projectAccess: string[] = ['__all__'],
): AdminUser {
  return {
    id,
    firstName,
    lastName,
    name: `${firstName} ${lastName}`,
    email,
    twoFa: false,
    role,
    status,
    lastLoginAt,
    projectAccess,
  }
}

function seedApiKeys(): AdminApiKey[] {
  const rows: Omit<AdminApiKey, 'id'>[] = [
    { name: 'my-api-key', maskedKey: 'Ab2XYZ***', project: 'All Projects', permissions: 'comment, manage…', expiration: 'No expiration', createdAt: ago(45 * MIN), userId: SEED_ADMIN_USER_ID },
    { name: 'ci-key', maskedKey: 'Rw4KLM***', project: 'DP', permissions: 'read', expiration: 'No expiration', createdAt: ago(2 * DAY), userId: SEED_ADMIN_USER_ID },
    { name: 'automation-key', maskedKey: 'Xc9NOP***', project: 'All Projects', permissions: 'comment, manage…', expiration: '90 days', createdAt: ago(5 * DAY), userId: 'admin-user-admin' },
    { name: 'noel-dev', maskedKey: 'Qm7PQR***', project: 'CTMS', permissions: 'read, comment', expiration: '30 days', createdAt: ago(7 * DAY), userId: SEED_USER_IDS.noel },
    { name: 'monica-ci', maskedKey: 'Ty3STU***', project: 'DP', permissions: 'read', expiration: '1 year', createdAt: ago(10 * DAY), userId: SEED_USER_IDS.monica },
    { name: 'arvindh-sync', maskedKey: 'Uv8VWX***', project: 'All Projects', permissions: 'manage', expiration: 'No expiration', createdAt: ago(12 * DAY), userId: SEED_USER_IDS.arvindh },
    { name: 'staging-key', maskedKey: 'Za1BCD***', project: 'IAM', permissions: 'read, comment', expiration: '90 days', createdAt: ago(14 * DAY), userId: SEED_ADMIN_USER_ID },
    { name: 'syed-export', maskedKey: 'Ef5GHI***', project: 'DP1', permissions: 'read', expiration: 'No expiration', createdAt: ago(20 * DAY), userId: SEED_USER_IDS.syed },
  ]
  return rows.map((row, i) => ({ ...row, id: `admin-key-seed-${i + 1}` }))
}

function seedUsers(): AdminUser[] {
  return [
    user(SEED_USER_IDS.demo, 'Demo', 'User', 'demo@relay.app', 'Owner', 'Active', NOW),
    user(SEED_USER_IDS.shaun, 'Shaun', 'Sevume', 'shaun.sevume@relay-dev.local', 'Administrator', 'Active', ago(HOUR)),
    user(SEED_USER_IDS.noel, 'Noel', 'Quadri', 'noel.quadri@relay-dev.local', 'Administrator', 'Active', ago(3 * HOUR)),
    user(SEED_USER_IDS.syed, 'Syed', 'Ahmed', 'syed.ahmed@relay-dev.local', 'Run Manager', 'Active', ago(DAY)),
    user(SEED_USER_IDS.jamil, 'Jamil', 'Khan', 'james.osullivan@relay-dev.local', 'Run Executor', 'Active', ago(2 * DAY), ['DP', 'CTMS']),
    user(SEED_USER_IDS.nasir, 'Nasir', 'Dipto', 'marcus.webb@relay-dev.local', 'Run Executor', 'Active', ago(5 * HOUR), ['DP']),
    user(SEED_USER_IDS.monica, 'Monica', 'Dayalani', 'priya.nair@relay-dev.local', 'Editor', 'Active', ago(30 * MIN), ['DP', 'CTMS']),
    user(SEED_USER_IDS.arvindh, 'Arvindh', 'Chandran', 'viewer@relay-dev.local', 'Editor', 'Active', ago(4 * DAY), ['CTMS']),
    user(SEED_USER_IDS.nadim, 'Nadim', 'Sharif', 'nadim.sharif@relay-dev.local', 'Viewer', 'Active', ago(6 * DAY), ['IAM']),
  ]
}

function seedRoles(): AdminRole[] {
  return ADMIN_USER_ROLES.map((roleName, i) => {
    const meta = BUILTIN_ROLE_META[roleName]
    return {
      id: `admin-role-builtin-${i + 1}`,
      name: roleName,
      description: meta.description,
      userCount: 0,
      isProjectLevel: meta.isProjectLevel,
      isBuiltIn: true,
      permissions: { ...BUILTIN_ROLE_PERMISSIONS[roleName] },
    }
  })
}

export function syncRoleUserCounts(users: AdminUser[], roles: AdminRole[]): AdminRole[] {
  const counts = new Map<string, number>()
  for (const u of users) {
    if (u.status === 'Disabled') continue
    counts.set(u.role, (counts.get(u.role) ?? 0) + 1)
  }
  return roles.map((r) => ({ ...r, userCount: counts.get(r.name) ?? 0 }))
}

function seedCustomFields(): AdminCustomField[] {
  const rows: Omit<AdminCustomField, 'id'>[] = [
    { name: 'Testrail ID', type: 'Text', required: false, enabled: true, inNewProjects: false, projects: 'CTMS, IAM' },
    { name: 'Priority', type: 'Number (integer)', required: false, enabled: true, inNewProjects: true, projects: 'All' },
    { name: 'References', type: 'Multi-Line Text', required: false, enabled: true, inNewProjects: true, projects: 'CTMS, DP' },
    { name: 'Is Automated', type: 'Boolean', required: false, enabled: true, inNewProjects: true, projects: 'All' },
    { name: 'TI Version', type: 'Multi-Select', required: false, enabled: true, inNewProjects: false, projects: 'DP' },
    { name: 'Signature Date', type: 'Date & Time', required: false, enabled: true, inNewProjects: true, projects: 'DP' },
    { name: 'CTMS Tags', type: 'Multi-Select', required: false, enabled: true, inNewProjects: false, projects: 'CTMS' },
    { name: 'Component', type: 'Multi-Select', required: false, enabled: true, inNewProjects: false, projects: 'All' },
  ]
  return rows.map((row, i) => ({ ...row, id: SEED_CUSTOM_FIELD_IDS[i] }))
}

function seedAutomationSources(): AdminAutomationSource[] {
  return [
    { id: 'admin-auto-src-1', name: 'origami-api', displayName: '', project: 'Demo Organization', retentionPeriod: 'Inherited (90 days)' },
    { id: 'admin-auto-src-2', name: 'origami-ui', displayName: '', project: 'Demo Organization', retentionPeriod: 'Inherited (90 days)' },
  ]
}

function seedAutomationFields(): AdminAutomationField[] {
  return [
    { id: 'admin-auto-fld-1', name: 'pw_project', displayName: 'Playwright project', projects: 'Demo Organization' },
    { id: 'admin-auto-fld-2', name: 'run_id', displayName: 'run_id', projects: 'Demo Organization' },
    { id: 'admin-auto-fld-3', name: 'env_arch', displayName: 'Arch', projects: 'Demo Organization' },
    { id: 'admin-auto-fld-4', name: 'env_host', displayName: 'Host', projects: 'Demo Organization' },
  ]
}

function seedAuditLog(): AuditLogEntry[] {
  const rows: Omit<AuditLogEntry, 'id' | 'timestamp'>[] = [
    { area: 'Data', byUser: 'Automation User', operation: 'Create', details: 'Added a comment to test case TC-1001 in test run TR-101' },
    { area: 'Data', byUser: 'Automation User', operation: 'Create', details: 'Inserted a comment' },
    { area: 'Data', byUser: 'Demo User', operation: 'Update', details: 'Updated test case TC-1002 in test run TR-102' },
    { area: 'Data', byUser: 'Demo User', operation: 'Create', details: 'Added a comment to test case TC-1002 in test run TR-102' },
    { area: 'Data', byUser: 'Noel Quadri', operation: 'Create', details: 'Inserted an attachment' },
    { area: 'Data', byUser: 'Noel Quadri', operation: 'Create', details: 'Inserted an attachment' },
    { area: 'Settings', byUser: 'Demo User', operation: 'Update', details: 'Updated organization settings' },
    { area: 'Data', byUser: 'Monica Dayalani', operation: 'Create', details: 'Added a comment to test case TC-1003 in test run TR-103' },
    { area: 'Data', byUser: 'Automation User', operation: 'Create', details: 'Inserted a comment' },
    { area: 'Data', byUser: 'Arvindh Chandran', operation: 'Update', details: 'Updated test case TC-1004' },
    { area: 'Settings', byUser: 'Demo User', operation: 'Create', details: 'Created API key my-api-key' },
    { area: 'Data', byUser: 'Noel Quadri', operation: 'Create', details: 'Added a comment to test case TC-1005' },
    { area: 'Data', byUser: 'Monica Dayalani', operation: 'Create', details: 'Inserted an attachment' },
    { area: 'Settings', byUser: 'Demo User', operation: 'Update', details: 'Updated user role for Monica Dayalani' },
    { area: 'Data', byUser: 'Demo User', operation: 'Create', details: 'Created test run TR-101' },
  ]
  const offsets = [MIN, MIN, 2 * MIN, 2 * MIN, 5 * MIN, 5 * MIN, 10 * MIN, 15 * MIN, 20 * MIN, 30 * MIN, 45 * MIN, HOUR, 2 * HOUR, 3 * HOUR, DAY]
  return rows.map((row, i) => ({
    ...row,
    id: `admin-audit-seed-${i + 1}`,
    timestamp: NOW - offsets[i],
  }))
}

const seedUsersList = seedUsers()
const seedRolesList = syncRoleUserCounts(seedUsersList, seedRoles())

export const initialAdminSettings: AdminSettings = {
  profile: {
    displayName: 'Demo User',
    language: 'English',
    regionalFormat: 'Standard',
    theme: 'Light',
  },
  account: {
    firstName: 'Demo',
    lastName: 'User',
    twoFactorMethods: [
      { method: 'Authenticator', active: false },
      { method: 'Email', active: false },
      { method: 'Hardware key / Passkey', active: false },
    ],
  },
  organization: {
    fullName: 'Demo Organization',
    allowReopeningTestRuns: 'Unlimited',
    allowReopeningMilestones: 'Unlimited',
    allowEditingTestResults: 'Unlimited',
    oauthEnabled: false,
  },
  apiKeys: seedApiKeys(),
  users: seedUsersList,
  roles: seedRolesList,
  customFields: seedCustomFields(),
  automation: {
    retentionPeriod: '90 days',
    sources: seedAutomationSources(),
    fields: seedAutomationFields(),
  },
  auditLog: seedAuditLog(),
}

export function isSeedCustomFieldId(id: string): boolean {
  return (SEED_CUSTOM_FIELD_IDS as readonly string[]).includes(id)
}

export function isInvitedUser(user: AdminUser): boolean {
  return user.id.startsWith('admin-user-inv-')
}

export function formatAdminUserName(u: Pick<AdminUser, 'firstName' | 'lastName' | 'name'>): string {
  const combined = `${u.firstName ?? ''} ${u.lastName ?? ''}`.trim()
  return combined || u.name
}
