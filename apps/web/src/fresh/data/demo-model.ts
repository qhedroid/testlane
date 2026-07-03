import type { AdminUserRole, PermissionKey, RolePermissions } from './rbac'

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
  /** Linked local requirement entity ids. */
  requirementIds?: string[]
}

export interface Folder {
  id: string
  projectId: string
  name: string
  parentId?: string | null
}

export type QueryOperator = 'contains' | 'not_contains' | 'equals' | 'not_equals'
export type QueryField = 'title' | 'priority' | 'type' | 'assignee' | 'tags' | 'caseKey'

export interface QueryCondition {
  field: QueryField
  operator: QueryOperator
  value: string
}

export interface TestQuery {
  id: string
  /** Human-readable name for this query group, e.g. "High Priority Cases". */
  title: string
  /** 'condition' = field/operator/value filter; 'folder' = folder-based; 'static' = explicit case list. */
  type: 'condition' | 'folder' | 'static'
  /** For type='condition': all conditions must match (AND logic). */
  conditions?: QueryCondition[]
  /** For type='folder': folder IDs whose cases are included (descendants included). */
  folderIds?: string[]
  /** For type='static': explicit internal Case.id values selected by the user. */
  caseIds?: string[]
}

export interface TestPlan {
  id: string
  /** Project-scoped human-readable key, e.g. TP-00001. */
  planKey: string
  projectId: string
  title: string
  description?: string
  createdAt: string
  queries: TestQuery[]
}

export type RequirementStatus = 'Draft' | 'Approved' | 'Implemented' | 'Obsolete'
export type DefectStatus = 'Open' | 'In progress' | 'Resolved' | 'Closed'

export interface Requirement {
  id: string
  /** Project-scoped display key, e.g. REQ-00001 */
  requirementKey: string
  projectId: string
  title: string
  description?: string
  status: RequirementStatus
  source: 'Local'
  createdAt: string
}

export interface Defect {
  id: string
  /** Project-scoped display key, e.g. DEF-00001 */
  defectKey: string
  projectId: string
  title: string
  description?: string
  status: DefectStatus
  source: 'Local'
  createdAt: string
}

export type ReportScopeType = 'project' | 'plan' | 'run'

/** A saved Reports-page view: control-bar state persisted per project (Area A). */
export interface SavedReport {
  id: string
  projectId: string
  name: string
  scopeType: ReportScopeType
  /** Plan id (scopeType 'plan') or run id (scopeType 'run'). Unset for 'project'. */
  scopeId?: string
  /** Number of most-recent runs (sprint buckets) included in the range. */
  rangeRuns: number
  /** Whether "Compare vs previous sprint" is enabled. */
  compare: boolean
  createdAt: string
}

export interface CaseExecution {
  status: ExecStatus
  assignee?: string
  stepResults: Record<string, ExecStatus>
  /** Defect entity ids (local demo) or legacy external keys (e.g. TI-4419). */
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

export const DEMO_SCHEMA_VERSION = 15

/** Format a per-project run counter as a 5-digit key (00001 … 99999). */
export function formatRunKey(n: number): string {
  return n.toString().padStart(5, '0')
}

/** Format a per-project case counter as a 5-digit key, e.g. TC-00001. */
export function formatCaseKey(n: number): string {
  return `TC-${n.toString().padStart(5, '0')}`
}

/** Format a per-project plan counter as a 5-digit key, e.g. TP-00001. */
export function formatPlanKey(n: number): string {
  return `TP-${n.toString().padStart(5, '0')}`
}

/** Format a per-project requirement counter as a 5-digit key, e.g. REQ-00001. */
export function formatRequirementKey(n: number): string {
  return `REQ-${n.toString().padStart(5, '0')}`
}

/** Format a per-project defect counter as a 5-digit key, e.g. DEF-00001. */
export function formatDefectKey(n: number): string {
  return `DEF-${n.toString().padStart(5, '0')}`
}

/** Strip TP- prefix for use in URL slugs, e.g. TP-00001 → 00001. */
export function planKeyToSlug(planKey: string): string {
  return planKey.replace(/^TP-/i, '')
}

/** Restore TP- prefix from a URL slug, e.g. 00001 → TP-00001. */
export function slugToPlanKey(slug: string): string {
  return /^TP-/i.test(slug) ? slug : `TP-${slug}`
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

export type AdminUserStatus = 'Active' | 'Pending invite' | 'Silent created' | 'Disabled'

export interface AdminUser {
  id: string
  firstName: string
  lastName: string
  /** Display name — kept for backwards compatibility in audit strings. */
  name: string
  email: string
  twoFa: boolean
  role: AdminUserRole
  status: AdminUserStatus
  lastLoginAt: number
  /** Project keys, or `__all__` for all projects. */
  projectAccess: string[]
}

export interface AdminRole {
  id: string
  name: string
  description: string
  userCount: number
  isProjectLevel: boolean
  isBuiltIn: boolean
  permissions: RolePermissions
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
  /** Demo actor for RBAC — persisted in localStorage. */
  currentActorUserId: string
  plansById: Record<string, TestPlan>
  nextPlanNumByProject: Record<string, number>
  requirementsById: Record<string, Requirement>
  defectsById: Record<string, Defect>
  nextRequirementNumByProject: Record<string, number>
  nextDefectNumByProject: Record<string, number>
  /** v15 — saved Reports-page views, keyed by SavedReport.id. */
  savedReportsById: Record<string, SavedReport>
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

function evaluateCondition(c: Case, cond: QueryCondition): boolean {
  const v = cond.value.toLowerCase()
  let fv = ''
  if (cond.field === 'title') fv = c.title
  else if (cond.field === 'priority') fv = c.priority
  else if (cond.field === 'type') fv = c.type
  else if (cond.field === 'assignee') fv = c.assignee ?? ''
  else if (cond.field === 'tags') fv = (c.tags ?? []).join(',')
  else if (cond.field === 'caseKey') fv = c.caseKey ?? c.id
  fv = fv.toLowerCase()
  if (cond.operator === 'equals') return fv === v
  if (cond.operator === 'not_equals') return fv !== v
  if (cond.operator === 'contains') return fv.includes(v)
  if (cond.operator === 'not_contains') return !fv.includes(v)
  return false
}

/**
 * Resolve all case IDs referenced by a plan's query groups.
 * Returns cases in their original order, deduplicated.
 */
export function resolvePlanCases(plan: TestPlan, cases: Case[], folders: Folder[]): Case[] {
  const seen = new Set<string>()
  const result: Case[] = []
  for (const query of plan.queries) {
    let matched: Case[] = []
    if (query.type === 'static') {
      const ids = new Set(query.caseIds ?? [])
      matched = cases.filter((c) => ids.has(c.id))
    } else if (query.type === 'folder') {
      const allowed = new Set<string | null>()
      for (const fid of query.folderIds ?? []) {
        if (fid === '__unfiled__') {
          allowed.add(null)
        } else {
          folderDescendantIds(folders, fid).forEach((id) => allowed.add(id))
        }
      }
      matched = cases.filter((c) => allowed.has(c.folderId ?? null))
    } else if (query.type === 'condition') {
      const conditions = query.conditions ?? []
      if (conditions.length > 0) {
        matched = cases.filter((c) => conditions.every((cond) => evaluateCondition(c, cond)))
      }
    }
    for (const c of matched) {
      if (!seen.has(c.id)) {
        seen.add(c.id)
        result.push(c)
      }
    }
  }
  return result
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

/** Collect unique defect ids linked to a test case across run executions. */
export function defectIdsForCaseFromRuns(runs: DemoRun[], caseId: string): string[] {
  const ids = new Set<string>()
  for (const run of runs) {
    const ex = run.executions[caseId]
    for (const id of ex?.defects ?? []) ids.add(id)
  }
  return [...ids]
}
