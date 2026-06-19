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

const NOW = Date.now()
const MIN = 60_000
const HOUR = 60 * MIN
const DAY = 24 * HOUR

function ago(ms: number): number {
  return NOW - ms
}

export const SEED_ADMIN_USER_ID = 'admin-user-demo'

const SEED_USER_IDS = {
  demo: 'admin-user-demo',
  alice: 'admin-user-alice',
  bob: 'admin-user-bob',
  carol: 'admin-user-carol',
  david: 'admin-user-david',
  eva: 'admin-user-eva',
  frank: 'admin-user-frank',
  grace: 'admin-user-grace',
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

function seedApiKeys(): AdminApiKey[] {
  const rows: Omit<AdminApiKey, 'id'>[] = [
    { name: 'my-api-key', maskedKey: 'Ab2XYZ***', project: 'All Projects', permissions: 'comment, manage…', expiration: 'No expiration', createdAt: ago(45 * MIN), userId: SEED_ADMIN_USER_ID },
    { name: 'ci-key', maskedKey: 'Rw4KLM***', project: 'DP', permissions: 'read', expiration: 'No expiration', createdAt: ago(2 * DAY), userId: SEED_ADMIN_USER_ID },
    { name: 'automation-key', maskedKey: 'Xc9NOP***', project: 'All Projects', permissions: 'comment, manage…', expiration: '90 days', createdAt: ago(5 * DAY), userId: 'admin-user-admin' },
    { name: 'alice-dev', maskedKey: 'Qm7PQR***', project: 'CTMS', permissions: 'read, comment', expiration: '30 days', createdAt: ago(7 * DAY), userId: SEED_USER_IDS.alice },
    { name: 'bob-ci', maskedKey: 'Ty3STU***', project: 'DP', permissions: 'read', expiration: '1 year', createdAt: ago(10 * DAY), userId: SEED_USER_IDS.bob },
    { name: 'carol-sync', maskedKey: 'Uv8VWX***', project: 'All Projects', permissions: 'manage', expiration: 'No expiration', createdAt: ago(12 * DAY), userId: SEED_USER_IDS.carol },
    { name: 'staging-key', maskedKey: 'Za1BCD***', project: 'IAM', permissions: 'read, comment', expiration: '90 days', createdAt: ago(14 * DAY), userId: SEED_ADMIN_USER_ID },
    { name: 'eva-export', maskedKey: 'Ef5GHI***', project: 'DP1', permissions: 'read', expiration: 'No expiration', createdAt: ago(20 * DAY), userId: SEED_USER_IDS.eva },
  ]
  return rows.map((row, i) => ({ ...row, id: `admin-key-seed-${i + 1}` }))
}

function seedUsers(): AdminUser[] {
  return [
    { id: SEED_USER_IDS.demo, name: 'Demo User', email: 'demo@relay.app', twoFa: false, role: 'Owner', status: 'Active', lastLoginAt: NOW },
    { id: SEED_USER_IDS.alice, name: 'Alice Chen', email: 'alice@relay.app', twoFa: false, role: 'Administrator', status: 'Active', lastLoginAt: ago(2 * DAY) },
    { id: SEED_USER_IDS.bob, name: 'Bob Smith', email: 'bob@relay.app', twoFa: false, role: 'Editor', status: 'Active', lastLoginAt: ago(7 * DAY) },
    { id: SEED_USER_IDS.carol, name: 'Carol Jones', email: 'carol@relay.app', twoFa: false, role: 'Editor', status: 'Active', lastLoginAt: ago(3 * DAY) },
    { id: SEED_USER_IDS.david, name: 'David Park', email: 'david@relay.app', twoFa: false, role: 'Viewer', status: 'Active', lastLoginAt: ago(5 * DAY) },
    { id: SEED_USER_IDS.eva, name: 'Eva Martinez', email: 'eva@relay.app', twoFa: false, role: 'Editor', status: 'Active', lastLoginAt: ago(12 * HOUR) },
    { id: SEED_USER_IDS.frank, name: 'Frank Liu', email: 'frank@relay.app', twoFa: false, role: 'Editor', status: 'Inactive', lastLoginAt: ago(30 * DAY) },
    { id: SEED_USER_IDS.grace, name: 'Grace Kim', email: 'grace@relay.app', twoFa: false, role: 'Viewer', status: 'Active', lastLoginAt: ago(DAY) },
  ]
}

function seedRoles(): AdminRole[] {
  return [
    { id: 'admin-role-viewer', name: 'Viewer', description: 'Built-in - Can view project data.', userCount: 1, isOrgLevel: false, isBuiltIn: true },
    { id: 'admin-role-run-exec', name: 'Run Executor', description: 'Built-in - Can execute test runs.', userCount: 0, isOrgLevel: false, isBuiltIn: true },
    { id: 'admin-role-run-mgr', name: 'Run Manager', description: 'Built-in - Can manage and execute test runs.', userCount: 0, isOrgLevel: false, isBuiltIn: true },
    { id: 'admin-role-editor', name: 'Editor', description: 'Built-in - Can manage test case folders and cases.', userCount: 4, isOrgLevel: false, isBuiltIn: true },
    { id: 'admin-role-billing', name: 'Billing Administrator', description: 'Built-in - Can manage billing.', userCount: 0, isOrgLevel: true, isBuiltIn: true },
    { id: 'admin-role-proj-admin', name: 'Project Administrator', description: 'Built-in - Administrator for a specific project.', userCount: 0, isOrgLevel: true, isBuiltIn: true },
    { id: 'admin-role-admin', name: 'Administrator', description: 'Built-in - Includes all permissions.', userCount: 1, isOrgLevel: true, isBuiltIn: true },
  ]
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
    { area: 'Data', byUser: 'Alice Chen', operation: 'Create', details: 'Inserted an attachment' },
    { area: 'Data', byUser: 'Alice Chen', operation: 'Create', details: 'Inserted an attachment' },
    { area: 'Settings', byUser: 'Demo User', operation: 'Update', details: 'Updated organization settings' },
    { area: 'Data', byUser: 'Bob Smith', operation: 'Create', details: 'Added a comment to test case TC-1003 in test run TR-103' },
    { area: 'Data', byUser: 'Automation User', operation: 'Create', details: 'Inserted a comment' },
    { area: 'Data', byUser: 'Carol Jones', operation: 'Update', details: 'Updated test case TC-1004' },
    { area: 'Settings', byUser: 'Demo User', operation: 'Create', details: 'Created API key my-api-key' },
    { area: 'Data', byUser: 'Alice Chen', operation: 'Create', details: 'Added a comment to test case TC-1005' },
    { area: 'Data', byUser: 'Bob Smith', operation: 'Create', details: 'Inserted an attachment' },
    { area: 'Settings', byUser: 'Demo User', operation: 'Update', details: 'Updated user role for Bob Smith' },
    { area: 'Data', byUser: 'Demo User', operation: 'Create', details: 'Created test run TR-101' },
  ]
  const offsets = [MIN, MIN, 2 * MIN, 2 * MIN, 5 * MIN, 5 * MIN, 10 * MIN, 15 * MIN, 20 * MIN, 30 * MIN, 45 * MIN, HOUR, 2 * HOUR, 3 * HOUR, DAY]
  return rows.map((row, i) => ({
    ...row,
    id: `admin-audit-seed-${i + 1}`,
    timestamp: NOW - offsets[i],
  }))
}

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
  users: seedUsers(),
  roles: seedRoles(),
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
