/** Consistent demo data model for /cases and /runs */

export type ExecStatus = 'Not run' | 'Passed' | 'Failed' | 'Blocked' | 'Skipped'
export type CasePriority = 'Critical' | 'High' | 'Medium' | 'Low'

/** Legacy lowercase status used by dashboard pills */
export type ResultStatus = 'pass' | 'fail' | 'blocked' | 'not_run' | 'skip'
export type Priority = 'critical' | 'high' | 'medium' | 'low'

export interface StepComment {
  id: string
  author: string
  createdAt: string
  body: string
}

export interface CaseStep {
  id: string
  action: string
  expected: string
  comments: StepComment[]
}

export interface CaseComment {
  id: string
  author: string
  createdAt: string
  body: string
}

export type ProjectPolicyValue = 'inherit' | 'unlimited' | 'never' | 'admins_only'
export type ProjectReportLogoValue = 'inherit' | 'override'

export interface ProjectSettings {
  allowReopeningTestRuns: ProjectPolicyValue
  allowReopeningMilestones: ProjectPolicyValue
  allowEditingTestResults: ProjectPolicyValue
  reportLogo: ProjectReportLogoValue
}

export const DEFAULT_PROJECT_SETTINGS: ProjectSettings = {
  allowReopeningTestRuns: 'inherit',
  allowReopeningMilestones: 'inherit',
  allowEditingTestResults: 'inherit',
  reportLogo: 'inherit',
}

export interface Project {
  id: string
  name: string
  key: string
  description?: string
  /** When `'demo'`, project shows seeded dashboard UI and was created from the immutable demo template. */
  seedTemplate?: 'demo'
  /** IDs from `adminSettings.customFields` that are active for this project. */
  activeCustomFieldIds: string[]
  /** Per-project overrides for org-level policies; omitted fields default to inherit in UI. */
  projectSettings?: ProjectSettings
  createdAt: string
}

export interface Case {
  id: string
  /** Project-scoped human-readable ID, e.g. TC-00001. Assigned on creation. */
  caseKey?: string
  projectId: string
  title: string
  folderId?: string | null
  priority: CasePriority
  type: string
  preconditions?: string
  steps: CaseStep[]
  generalComments: CaseComment[]
  tags?: string[]
  updatedAt: string
  createdAt?: string
  assignee?: string
  /** Step template format. Defaults to 'text'. */
  template?: 'text' | 'bdd'
  /** Free-text references (issue links, doc links, etc.). */
  references?: string
  /** One-line summary / description. */
  summary?: string
  /** Values for active custom fields. Key = AdminCustomField.id */
  customFieldValues?: Record<string, string | boolean | string[]>
}

export interface Folder {
  id: string
  projectId: string
  name: string
  parentId?: string | null
}

export interface CaseExecution {
  status: ExecStatus
  assignee?: string
  stepResults: Record<string, ExecStatus>
  defects?: string[]
  resultNotes?: string
  testedAt?: string
  testedBy?: string
}

export interface ExecutionLogEntry {
  id: string
  caseId: string
  at: string
  by: string
  from: ExecStatus
  to: ExecStatus
  event?: 'created'
}

export interface DemoRun {
  id: string
  projectId: string
  /** Project-scoped display id for URLs, e.g. "00001" */
  runKey: string
  name: string
  description?: string
  planId?: string
  planName?: string
  due?: string
  createdAt: string
  sealed: boolean
  /** When set, run is hidden from the default picker list */
  archivedAt?: string
  caseOrder: string[]
  executions: Record<string, CaseExecution>
  executionLog?: ExecutionLogEntry[]
}

export const DEMO_SCHEMA_VERSION = 11

/** Format a per-project run counter as a 5-digit key (00001 … 99999). */
export function formatRunKey(n: number): string {
  return n.toString().padStart(5, '0')
}

/** Format a per-project case counter as a 5-digit key, e.g. TC-00001. */
export function formatCaseKey(n: number): string {
  return `TC-${n.toString().padStart(5, '0')}`
}

export const DEFAULT_SEED_PROJECT_ID = 'proj-ti-core'
export const DEFAULT_SEED_PROJECT_KEY = 'DP'

/** Prefix for cloned demo projects (DP1, DP2, …). Initial seed uses `DP` exactly. */
export const CLONED_DEMO_KEY_PREFIX = 'DP'

/** @deprecated Pre-v2 shape; used only during migration */
export interface LegacyDemoState {
  module?: string
  folders: Folder[]
  cases: Case[]
  runs: DemoRun[]
  currentRunId?: string
  nextCaseNum?: number
  schemaVersion?: number
  projectsById?: Record<string, Project>
  activeProjectId?: string
  currentRunIdByProject?: Record<string, string>
  nextCaseNumByProject?: Record<string, number>
  nextRunNumByProject?: Record<string, number>
}

export interface AdminApiKey {
  id: string
  name: string
  maskedKey: string
  project: string
  permissions: string
  expiration: string
  createdAt: number
  userId: string
}

export interface AdminUser {
  id: string
  name: string
  email: string
  twoFa: boolean
  role: 'Owner' | 'Administrator' | 'Editor' | 'Viewer'
  status: 'Active' | 'Inactive'
  lastLoginAt: number
}

export interface AdminRole {
  id: string
  name: string
  description: string
  userCount: number
  isOrgLevel: boolean
  isBuiltIn: boolean
}

export interface AdminCustomField {
  id: string
  name: string
  type: 'Text' | 'Multi-Line Text' | 'Number (integer)' | 'Boolean' | 'Multi-Select' | 'Date & Time'
  required: boolean
  enabled: boolean
  inNewProjects: boolean
  projects: string
}

export interface AdminAutomationSource {
  id: string
  name: string
  displayName: string
  project: string
  retentionPeriod: string
}

export interface AdminAutomationField {
  id: string
  name: string
  displayName: string
  projects: string
}

export interface AuditLogEntry {
  id: string
  timestamp: number
  area: 'Data' | 'Settings'
  byUser: string
  operation: 'Create' | 'Update' | 'Delete'
  details: string
}

export interface AdminSettings {
  profile: {
    displayName: string
    language: string
    regionalFormat: string
    theme: 'Light' | 'Dark' | 'System'
  }
  account: {
    firstName: string
    lastName: string
    twoFactorMethods: { method: string; active: boolean }[]
  }
  organization: {
    fullName: string
    allowReopeningTestRuns: string
    allowReopeningMilestones: string
    allowEditingTestResults: string
    oauthEnabled: boolean
  }
  apiKeys: AdminApiKey[]
  users: AdminUser[]
  roles: AdminRole[]
  customFields: AdminCustomField[]
  automation: {
    retentionPeriod: string
    sources: AdminAutomationSource[]
    fields: AdminAutomationField[]
  }
  auditLog: AuditLogEntry[]
}

export interface DemoState {
  schemaVersion: number
  projectsById: Record<string, Project>
  activeProjectId: string
  folders: Folder[]
  cases: Case[]
  runs: DemoRun[]
  currentRunIdByProject: Record<string, string>
  nextCaseNumByProject: Record<string, number>
  nextRunNumByProject: Record<string, number>
  adminSettings: AdminSettings
}

export interface RunSummary {
  total: number
  passed: number
  failed: number
  blocked: number
  skipped: number
  notRun: number
}

export const EXEC_STATUS_LABEL: Record<ExecStatus, string> = {
  'Not run': 'Not run',
  Passed: 'Passed',
  Failed: 'Failed',
  Blocked: 'Blocked',
  Skipped: 'Skipped',
}

export const EXEC_TO_LEGACY: Record<ExecStatus, ResultStatus> = {
  'Not run': 'not_run',
  Passed: 'pass',
  Failed: 'fail',
  Blocked: 'blocked',
  Skipped: 'skip',
}

export const LEGACY_TO_EXEC: Record<ResultStatus, ExecStatus> = {
  not_run: 'Not run',
  pass: 'Passed',
  fail: 'Failed',
  blocked: 'Blocked',
  skip: 'Skipped',
}

export const PRIORITY_TO_LEGACY: Record<CasePriority, Priority> = {
  Critical: 'critical',
  High: 'high',
  Medium: 'medium',
  Low: 'low',
}

export const LEGACY_TO_PRIORITY: Record<Priority, CasePriority> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
}

let idCounter = 0

export function newId(prefix: string): string {
  idCounter += 1
  return `${prefix}-${Date.now()}-${idCounter}`
}

export function commentCount(c: Case): number {
  const stepComments = c.steps.reduce((n, s) => n + s.comments.length, 0)
  return stepComments + c.generalComments.length
}

export function runSummary(run: DemoRun): RunSummary {
  const counts: RunSummary = {
    total: run.caseOrder.length,
    passed: 0,
    failed: 0,
    blocked: 0,
    skipped: 0,
    notRun: 0,
  }
  for (const caseId of run.caseOrder) {
    const ex = run.executions[caseId]
    const status = ex?.status ?? 'Not run'
    if (status === 'Passed') counts.passed += 1
    else if (status === 'Failed') counts.failed += 1
    else if (status === 'Blocked') counts.blocked += 1
    else if (status === 'Skipped') counts.skipped += 1
    else counts.notRun += 1
  }
  return counts
}

export function folderDescendantIds(folders: Folder[], folderId: string | null): Set<string | null> {
  const ids = new Set<string | null>([folderId])
  if (folderId === null) return ids
  let changed = true
  while (changed) {
    changed = false
    for (const f of folders) {
      if (f.parentId != null && ids.has(f.parentId) && !ids.has(f.id)) {
        ids.add(f.id)
        changed = true
      }
    }
  }
  return ids
}

export function casesInFolder(cases: Case[], folders: Folder[], folderId: string | null): Case[] {
  if (folderId === '__unfiled__') {
    return cases.filter((c) => c.folderId == null || c.folderId === undefined)
  }
  const allowed = folderDescendantIds(folders, folderId)
  return cases.filter((c) => allowed.has(c.folderId ?? null))
}

export function folderLabel(folders: Folder[], folderId: string | null | undefined): string {
  if (!folderId) return 'Unfiled'
  return folders.find((f) => f.id === folderId)?.name ?? 'Unfiled'
}

export function parseTagsCsv(value: string): string[] {
  return value.split(',').map((part) => part.trim()).filter(Boolean)
}

export const TYPE_PLACEHOLDER_TAGS = [
  'Functional (placeholder)',
  'Integration (placeholder)',
  'Security (placeholder)',
  'Smoke (placeholder)',
] as const

export function stepResultCounts(
  steps: { id: string }[],
  stepResults: Record<string, ExecStatus>,
): { pass: number; fail: number; blocked: number; notrun: number } {
  const counts = { pass: 0, fail: 0, blocked: 0, notrun: 0 }
  for (const step of steps) {
    const sr = stepResults[step.id] ?? 'Not run'
    if (sr === 'Passed') counts.pass += 1
    else if (sr === 'Failed') counts.fail += 1
    else if (sr === 'Blocked') counts.blocked += 1
    else counts.notrun += 1
  }
  return counts
}

export function formatRelativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 2) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
}
