/** Integrations seed data — static; not stored in AdminSettings. */
export const ADMIN_CONFIGURED_INTEGRATIONS = [
  { type: 'Jira', name: 'Jira (default)', active: true, projects: 'All Projects', itemTypes: 'Defects, Requirements' },
] as const

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
