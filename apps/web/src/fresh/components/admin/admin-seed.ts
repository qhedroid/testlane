export interface AdminApiKeyRow {
  user: string
  name: string
  apiKey: string
  project: string
  permissions: string
  expiration: string
}

export const ADMIN_API_KEYS: AdminApiKeyRow[] = [
  { user: 'Demo User', name: 'my-api-key', apiKey: 'Ab2XYZ***', project: 'All Projects', permissions: 'comment, manage…', expiration: 'No expiration' },
  { user: 'Demo User', name: 'ci-key', apiKey: 'Rw4KLM***', project: 'DP', permissions: 'read', expiration: 'No expiration' },
  { user: 'Admin User', name: 'automation-key', apiKey: 'Xc9NOP***', project: 'All Projects', permissions: 'comment, manage…', expiration: '90 days' },
  { user: 'Alice Chen', name: 'alice-dev', apiKey: 'Qm7PQR***', project: 'CTMS', permissions: 'read, comment', expiration: '30 days' },
  { user: 'Bob Smith', name: 'bob-ci', apiKey: 'Ty3STU***', project: 'DP', permissions: 'read', expiration: '1 year' },
  { user: 'Carol Jones', name: 'carol-sync', apiKey: 'Uv8VWX***', project: 'All Projects', permissions: 'manage', expiration: 'No expiration' },
  { user: 'Demo User', name: 'staging-key', apiKey: 'Za1BCD***', project: 'IAM', permissions: 'read, comment', expiration: '90 days' },
  { user: 'Eva Martinez', name: 'eva-export', apiKey: 'Ef5GHI***', project: 'DP1', permissions: 'read', expiration: 'No expiration' },
]

export interface AdminUserRow {
  name: string
  email: string
  role: string
  status: 'Active' | 'Inactive'
  lastLogin: string
}

export const ADMIN_USERS: AdminUserRow[] = [
  { name: 'Demo User', email: 'demo@relay.app', role: 'Owner', status: 'Active', lastLogin: 'Just now' },
  { name: 'Alice Chen', email: 'alice@relay.app', role: 'Administrator', status: 'Active', lastLogin: '2 days ago' },
  { name: 'Bob Smith', email: 'bob@relay.app', role: 'Editor', status: 'Active', lastLogin: '1 week ago' },
  { name: 'Carol Jones', email: 'carol@relay.app', role: 'Editor', status: 'Active', lastLogin: '3 days ago' },
  { name: 'David Park', email: 'david@relay.app', role: 'Viewer', status: 'Active', lastLogin: '5 days ago' },
  { name: 'Eva Martinez', email: 'eva@relay.app', role: 'Editor', status: 'Active', lastLogin: '12 hours ago' },
  { name: 'Frank Liu', email: 'frank@relay.app', role: 'Editor', status: 'Inactive', lastLogin: '30 days ago' },
  { name: 'Grace Kim', email: 'grace@relay.app', role: 'Viewer', status: 'Active', lastLogin: '1 day ago' },
]

export interface AdminRoleRow {
  name: string
  description: string
  users: number
  organization: boolean
  builtIn: boolean
}

export const ADMIN_ROLES: AdminRoleRow[] = [
  { name: 'Viewer', description: 'Built-in - Can view project data.', users: 1, organization: false, builtIn: true },
  { name: 'Run Executor', description: 'Built-in - Can execute test runs.', users: 0, organization: false, builtIn: true },
  { name: 'Run Manager', description: 'Built-in - Can manage and execute test runs.', users: 0, organization: false, builtIn: true },
  { name: 'Editor', description: 'Built-in - Can manage test case folders and cases.', users: 4, organization: false, builtIn: true },
  { name: 'Billing Administrator', description: 'Built-in - Can manage billing.', users: 0, organization: true, builtIn: true },
  { name: 'Project Administrator', description: 'Built-in - Administrator for a specific project.', users: 0, organization: true, builtIn: true },
  { name: 'Administrator', description: 'Built-in - Includes all permissions.', users: 1, organization: true, builtIn: true },
]

export interface AdminCustomFieldRow {
  name: string
  type: string
  required: boolean
  enabled: boolean
  inNewProjects: boolean
  projects: string
}

export const ADMIN_CUSTOM_FIELDS: AdminCustomFieldRow[] = [
  { name: 'Testrail ID', type: 'Text', required: false, enabled: true, inNewProjects: false, projects: 'CTMS, IAM' },
  { name: 'Priority', type: 'Number (integer)', required: false, enabled: true, inNewProjects: true, projects: 'All' },
  { name: 'References', type: 'Multi-Line Text', required: false, enabled: true, inNewProjects: true, projects: 'CTMS, DP' },
  { name: 'Is Automated', type: 'Boolean', required: false, enabled: true, inNewProjects: true, projects: 'All' },
  { name: 'TI Version', type: 'Multi-Select', required: false, enabled: true, inNewProjects: false, projects: 'DP' },
  { name: 'Signature Date', type: 'Date & Time', required: false, enabled: true, inNewProjects: true, projects: 'DP' },
  { name: 'CTMS Tags', type: 'Multi-Select', required: false, enabled: true, inNewProjects: false, projects: 'CTMS' },
  { name: 'Component', type: 'Multi-Select', required: false, enabled: true, inNewProjects: false, projects: 'All' },
]

export interface AdminAutomationSourceRow {
  name: string
  displayName: string
  project: string
  retention: string
}

export const ADMIN_AUTOMATION_SOURCES: AdminAutomationSourceRow[] = [
  { name: 'origami-api', displayName: '', project: 'Demo Organization', retention: 'Inherited (90 days)' },
  { name: 'origami-ui', displayName: '', project: 'Demo Organization', retention: 'Inherited (90 days)' },
]

export interface AdminAutomationFieldRow {
  name: string
  displayName: string
  projects: string
}

export const ADMIN_AUTOMATION_FIELDS: AdminAutomationFieldRow[] = [
  { name: 'pw_project', displayName: 'Playwright project', projects: 'Demo Organization' },
  { name: 'run_id', displayName: 'run_id', projects: 'Demo Organization' },
  { name: 'env_arch', displayName: 'Arch', projects: 'Demo Organization' },
  { name: 'env_host', displayName: 'Host', projects: 'Demo Organization' },
]

export interface AdminAuditLogRow {
  timestamp: string
  area: string
  byUser: string
  operation: string
  details: string
}

export const ADMIN_AUDIT_LOG: AdminAuditLogRow[] = [
  { timestamp: '1 minute ago', area: 'Data', byUser: 'Automation User', operation: 'Create', details: 'Added a comment to test case TC-1001 in test run TR-101' },
  { timestamp: '1 minute ago', area: 'Data', byUser: 'Automation User', operation: 'Create', details: 'Inserted a comment' },
  { timestamp: '2 minutes ago', area: 'Data', byUser: 'Demo User', operation: 'Update', details: 'Updated test case TC-1002 in test run TR-102' },
  { timestamp: '2 minutes ago', area: 'Data', byUser: 'Demo User', operation: 'Create', details: 'Added a comment to test case TC-1002 in test run TR-102' },
  { timestamp: '5 minutes ago', area: 'Data', byUser: 'Alice Chen', operation: 'Create', details: 'Inserted an attachment' },
  { timestamp: '5 minutes ago', area: 'Data', byUser: 'Alice Chen', operation: 'Create', details: 'Inserted an attachment' },
  { timestamp: '10 minutes ago', area: 'Settings', byUser: 'Demo User', operation: 'Update', details: 'Updated organization settings' },
  { timestamp: '15 minutes ago', area: 'Data', byUser: 'Bob Smith', operation: 'Create', details: 'Added a comment to test case TC-1003 in test run TR-103' },
  { timestamp: '20 minutes ago', area: 'Data', byUser: 'Automation User', operation: 'Create', details: 'Inserted a comment' },
  { timestamp: '30 minutes ago', area: 'Data', byUser: 'Carol Jones', operation: 'Update', details: 'Updated test case TC-1004' },
  { timestamp: '45 minutes ago', area: 'Settings', byUser: 'Demo User', operation: 'Create', details: 'Created API key my-api-key' },
  { timestamp: '1 hour ago', area: 'Data', byUser: 'Alice Chen', operation: 'Create', details: 'Added a comment to test case TC-1005' },
  { timestamp: '2 hours ago', area: 'Data', byUser: 'Bob Smith', operation: 'Create', details: 'Inserted an attachment' },
  { timestamp: '3 hours ago', area: 'Settings', byUser: 'Demo User', operation: 'Update', details: 'Updated user role for Bob Smith' },
  { timestamp: '1 day ago', area: 'Data', byUser: 'Demo User', operation: 'Create', details: 'Created test run TR-101' },
]

export interface AdminIntegrationConfiguredRow {
  type: string
  name: string
  active: boolean
  projects: string
  itemTypes: string
}

export const ADMIN_CONFIGURED_INTEGRATIONS: AdminIntegrationConfiguredRow[] = [
  { type: 'Jira', name: 'Jira (default)', active: true, projects: 'All Projects', itemTypes: 'Defects, Requirements' },
]

export const ADMIN_NATIVE_INTEGRATIONS = ['Jira', 'GitLab', 'GitHub', 'Azure DevOps', 'Redmine', 'Linear'] as const

export const ADMIN_OTHER_INTEGRATIONS = [
  'Asana', 'Basecamp', 'Bugzilla', 'ClickUp', 'Confluence', 'Linear (legacy)', 'Monday.com', 'Pivotal Tracker',
] as const

export const INTEGRATION_COLORS: Record<string, string> = {
  Jira: '#0052CC',
  GitLab: '#FC6D26',
  GitHub: '#24292F',
  'Azure DevOps': '#0078D4',
  Redmine: '#B32024',
  Linear: '#5E6AD2',
  Asana: '#F06A6A',
  Basecamp: '#1D2D35',
  Bugzilla: '#FF6600',
  ClickUp: '#7B68EE',
  Confluence: '#172B4D',
  'Linear (legacy)': '#5E6AD2',
  'Monday.com': '#FF3D57',
  'Pivotal Tracker': '#517A9E',
}
