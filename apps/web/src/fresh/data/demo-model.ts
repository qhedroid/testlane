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

export interface Case {
  id: string
  title: string
  folderId?: string | null
  priority: CasePriority
  type: string
  preconditions?: string
  steps: CaseStep[]
  generalComments: CaseComment[]
  tags?: string[]
  updatedAt: string
  assignee?: string
}

export interface Folder {
  id: string
  name: string
  parentId?: string | null
}

export interface CaseExecution {
  status: ExecStatus
  assignee?: string
  stepResults: Record<string, ExecStatus>
  defects?: string[]
}

export interface DemoRun {
  id: string
  name: string
  planId?: string
  planName?: string
  due?: string
  createdAt: string
  sealed: boolean
  caseOrder: string[]
  executions: Record<string, CaseExecution>
}

export interface DemoState {
  module: string
  folders: Folder[]
  cases: Case[]
  runs: DemoRun[]
  currentRunId: string
  nextCaseNum: number
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
