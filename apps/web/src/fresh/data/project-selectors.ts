import type {
  Case,
  CaseExecution,
  CasePriority,
  Defect,
  DemoRun,
  DemoState,
  ExecStatus,
  Folder,
  Project,
  Requirement,
  TestPlan,
} from './demo-model'
import { casesInFolder, runSummary } from './demo-model'

export function listProjects(state: DemoState): Project[] {
  return Object.values(state.projectsById).sort((a, b) => a.name.localeCompare(b.name))
}

export function getActiveProject(state: DemoState): Project | undefined {
  return state.projectsById[state.activeProjectId]
}

export function getProjectByKey(state: DemoState, key: string): Project | undefined {
  const normalized = key.toUpperCase()
  return Object.values(state.projectsById).find((p) => p.key === normalized)
}

export function isProjectKeyUnique(state: DemoState, key: string, excludeProjectId?: string): boolean {
  const normalized = key.toUpperCase()
  return !Object.values(state.projectsById).some(
    (p) => p.key === normalized && p.id !== excludeProjectId,
  )
}

export function listActiveProjectFolders(state: DemoState): Folder[] {
  return state.folders.filter((f) => f.projectId === state.activeProjectId)
}

export function listActiveProjectTestCases(state: DemoState): Case[] {
  return state.cases.filter((c) => c.projectId === state.activeProjectId)
}

export function listActiveProjectRuns(state: DemoState): DemoRun[] {
  return state.runs.filter(
    (r) => r.projectId === state.activeProjectId && !r.archivedAt,
  )
}

export function listActiveProjectPlans(state: DemoState): TestPlan[] {
  return Object.values(state.plansById).filter(
    (p) => p.projectId === state.activeProjectId,
  ).sort((a, b) => a.planKey.localeCompare(b.planKey))
}

export function getActiveProjectNextRunNum(state: DemoState): number {
  return state.nextRunNumByProject[state.activeProjectId] ?? 1
}

export function listProjectFolders(state: DemoState, projectId: string): Folder[] {
  return state.folders.filter((f) => f.projectId === projectId)
}

export function listProjectTestCases(state: DemoState, projectId: string): Case[] {
  return state.cases.filter((c) => c.projectId === projectId)
}

export function listProjectRuns(state: DemoState, projectId: string): DemoRun[] {
  return state.runs.filter((r) => r.projectId === projectId)
}

export function getActiveProjectCurrentRunId(state: DemoState): string {
  return state.currentRunIdByProject[state.activeProjectId] ?? ''
}

export function getActiveProjectNextCaseNum(state: DemoState): number {
  return state.nextCaseNumByProject[state.activeProjectId] ?? 1
}

export function listActiveProjectRequirements(state: DemoState): Requirement[] {
  return Object.values(state.requirementsById ?? {})
    .filter((r) => r.projectId === state.activeProjectId)
    .sort((a, b) => a.requirementKey.localeCompare(b.requirementKey))
}

export function listActiveProjectDefects(state: DemoState): Defect[] {
  return Object.values(state.defectsById ?? {})
    .filter((d) => d.projectId === state.activeProjectId)
    .sort((a, b) => a.defectKey.localeCompare(b.defectKey))
}

export function getActiveProjectNextRequirementNum(state: DemoState): number {
  return state.nextRequirementNumByProject?.[state.activeProjectId] ?? 1
}

export function getActiveProjectNextDefectNum(state: DemoState): number {
  return state.nextDefectNumByProject?.[state.activeProjectId] ?? 1
}

/* ── Dashboard (task-09) ── */

export type DashboardWindow = 7 | 30 | 90

const EXECUTED_STATUSES: ExecStatus[] = ['Passed', 'Failed', 'Blocked', 'Skipped']

export interface DashboardKpis {
  executedPct: number
  totalExecuted: number
  totalCases: number
  passed: number
  failed: number
  blocked: number
  blockedWithDefects: number
  notRun: number
  skipped: number
  openRunCount: number
  runsDueThisWeek: number
  passedThisWeek: number | null
  failedThisWeek: number | null
  hasExecutionHistory: boolean
}

export interface DashboardTimePoint {
  at: number
  passed: number
  failed: number
}

export interface DashboardAssigneeBar {
  name: string
  passed: number
  failed: number
  blocked: number
  total: number
}

export interface DashboardOpenRunRow {
  runId: string
  runKey: string
  name: string
  meta: string
  assignee: string
  pass: number
  fail: number
  blocked: number
  skipped: number
  notRun: number
  total: number
  executed: number
}

export interface DashboardUnlinkedFailure {
  key: string
  title: string
  priority: CasePriority
  runName: string
  testedBy?: string
  testedAt?: string
}

export interface DashboardCoverageRow {
  label: string
  pct: number
}

export function getDashboardActiveRuns(runs: DemoRun[]): DemoRun[] {
  return runs.filter((r) => !r.sealed && !r.archivedAt)
}

function isWithinDays(iso: string, days: number, now = Date.now()): boolean {
  const t = new Date(iso).getTime()
  if (Number.isNaN(t)) return false
  return t >= now - days * 24 * 60 * 60 * 1000
}

function parseRunDue(due?: string): Date | null {
  if (!due?.trim()) return null
  const d = new Date(`${due.trim()} 2026`)
  return Number.isNaN(d.getTime()) ? null : d
}

function isDueWithinDays(due: string | undefined, days: number, now = new Date()): boolean {
  const d = parseRunDue(due)
  if (!d) return false
  const end = new Date(now)
  end.setDate(end.getDate() + days)
  end.setHours(23, 59, 59, 999)
  return d >= now && d <= end
}

function countWeeklyTransitions(runs: DemoRun[], status: ExecStatus): number {
  let count = 0
  for (const run of runs) {
    for (const entry of run.executionLog ?? []) {
      if (entry.event === 'created') continue
      if (entry.to === status && entry.from !== status && isWithinDays(entry.at, 7)) {
        count += 1
      }
    }
  }
  return count
}

function hasAnyExecutionHistory(runs: DemoRun[]): boolean {
  for (const run of runs) {
    if ((run.executionLog ?? []).some((e) => e.event !== 'created')) return true
    for (const caseId of run.caseOrder) {
      const ex = run.executions[caseId]
      if (ex?.testedAt) return true
    }
  }
  return false
}

function primaryAssigneeForRun(run: DemoRun, caseById: Map<string, Case>): string {
  for (const caseId of run.caseOrder) {
    const ex = run.executions[caseId]
    const assignee = ex?.assignee?.trim()
    if (assignee) return assignee
    const c = caseById.get(caseId)
    if (c?.assignee?.trim()) return c.assignee.trim()
  }
  return 'Unassigned'
}

export function computeDashboardKpis(runs: DemoRun[]): DashboardKpis {
  const active = getDashboardActiveRuns(runs)
  let passed = 0
  let failed = 0
  let blocked = 0
  let skipped = 0
  let notRun = 0
  let totalCases = 0
  let blockedWithDefects = 0

  for (const run of active) {
    const s = runSummary(run)
    passed += s.passed
    failed += s.failed
    blocked += s.blocked
    skipped += s.skipped
    notRun += s.notRun
    totalCases += s.total
    for (const caseId of run.caseOrder) {
      const ex = run.executions[caseId]
      if (ex?.status === 'Blocked' && (ex.defects?.length ?? 0) > 0) {
        blockedWithDefects += 1
      }
    }
  }

  const totalExecuted = passed + failed + blocked + skipped
  const executedPct = totalCases > 0 ? Math.round((totalExecuted / totalCases) * 100) : 0
  const hasHistory = hasAnyExecutionHistory(active)

  return {
    executedPct,
    totalExecuted,
    totalCases,
    passed,
    failed,
    blocked,
    blockedWithDefects,
    notRun,
    skipped,
    openRunCount: active.length,
    runsDueThisWeek: active.filter((r) => isDueWithinDays(r.due, 7)).length,
    passedThisWeek: hasHistory ? countWeeklyTransitions(active, 'Passed') : null,
    failedThisWeek: hasHistory ? countWeeklyTransitions(active, 'Failed') : null,
    hasExecutionHistory: hasHistory,
  }
}


function collectHistoryEvents(runs: DemoRun[]): { at: number; passed: boolean; failed: boolean }[] {
  const events: { at: number; passed: boolean; failed: boolean }[] = []
  const seen = new Set<string>()

  for (const run of runs) {
    for (const entry of run.executionLog ?? []) {
      if (entry.event === 'created') continue
      if (!EXECUTED_STATUSES.includes(entry.to)) continue
      const key = `${run.id}:${entry.id}`
      if (seen.has(key)) continue
      seen.add(key)
      events.push({
        at: new Date(entry.at).getTime(),
        passed: entry.to === 'Passed',
        failed: entry.to === 'Failed',
      })
    }
    for (const caseId of run.caseOrder) {
      const ex = run.executions[caseId]
      if (!ex?.testedAt || ex.status === 'Not run') continue
      const key = `${run.id}:${caseId}:${ex.testedAt}`
      if (seen.has(key)) continue
      seen.add(key)
      events.push({
        at: new Date(ex.testedAt).getTime(),
        passed: ex.status === 'Passed',
        failed: ex.status === 'Failed',
      })
    }
  }

  return events.sort((a, b) => a.at - b.at)
}

export function computeDashboardTimeSeries(
  runs: DemoRun[],
  windowDays: DashboardWindow,
): DashboardTimePoint[] {
  const active = getDashboardActiveRuns(runs)
  const now = Date.now()
  const start = now - windowDays * 24 * 60 * 60 * 1000
  const events = collectHistoryEvents(active).filter((e) => e.at >= start)

  const bucketCount = windowDays === 7 ? 7 : windowDays === 30 ? 10 : 12
  const bucketMs = (windowDays * 24 * 60 * 60 * 1000) / bucketCount
  const buckets: DashboardTimePoint[] = []

  let cumPassed = 0
  let cumFailed = 0
  let eventIdx = 0

  for (let i = 0; i < bucketCount; i += 1) {
    const bucketEnd = start + (i + 1) * bucketMs
    while (eventIdx < events.length && events[eventIdx].at <= bucketEnd) {
      if (events[eventIdx].passed) cumPassed += 1
      if (events[eventIdx].failed) cumFailed += 1
      eventIdx += 1
    }
    buckets.push({ at: bucketEnd, passed: cumPassed, failed: cumFailed })
  }

  if (events.length === 0) {
    const kpis = computeDashboardKpis(active)
    return buckets.map((b) => ({ ...b, passed: kpis.passed, failed: kpis.failed }))
  }

  return buckets
}

/** Normalized 0–100 values for a sparkline (pass-rate trend). */
export function computeDashboardPassTrend(
  runs: DemoRun[],
  points = 15,
): { values: number[]; isFlatFallback: boolean } {
  const active = getDashboardActiveRuns(runs)
  const now = Date.now()
  const start = now - 30 * 24 * 60 * 60 * 1000
  const events = collectHistoryEvents(active).filter((e) => e.at >= start && e.passed)

  if (events.length === 0) {
    const kpis = computeDashboardKpis(active)
    const rate =
      kpis.totalExecuted > 0 ? Math.round((kpis.passed / kpis.totalExecuted) * 100) : 0
    return { values: Array(points).fill(rate), isFlatFallback: true }
  }

  const bucketMs = (30 * 24 * 60 * 60 * 1000) / points
  const values: number[] = []
  let cumPassed = 0
  let cumExecuted = 0
  let eventIdx = 0
  const allEvents = collectHistoryEvents(active).filter((e) => e.at >= start)

  for (let i = 0; i < points; i += 1) {
    const bucketEnd = start + (i + 1) * bucketMs
    while (eventIdx < allEvents.length && allEvents[eventIdx].at <= bucketEnd) {
      cumExecuted += 1
      if (allEvents[eventIdx].passed) cumPassed += 1
      eventIdx += 1
    }
    const rate = cumExecuted > 0 ? Math.round((cumPassed / cumExecuted) * 100) : 0
    values.push(rate)
  }

  return { values, isFlatFallback: false }
}

export function computeDashboardAssigneeBars(
  runs: DemoRun[],
  cases: Case[],
): DashboardAssigneeBar[] {
  const active = getDashboardActiveRuns(runs)
  const caseById = new Map(cases.map((c) => [c.id, c]))
  const tallies = new Map<string, { passed: number; failed: number; blocked: number }>()

  function bump(name: string, status: ExecStatus) {
    const key = name.trim() || 'Unassigned'
    const row = tallies.get(key) ?? { passed: 0, failed: 0, blocked: 0 }
    if (status === 'Passed') row.passed += 1
    else if (status === 'Failed') row.failed += 1
    else if (status === 'Blocked') row.blocked += 1
    tallies.set(key, row)
  }

  for (const run of active) {
    for (const caseId of run.caseOrder) {
      const ex: CaseExecution | undefined = run.executions[caseId]
      const status = ex?.status ?? 'Not run'
      if (status === 'Not run' || status === 'Skipped') continue
      const assignee = ex?.assignee?.trim() || caseById.get(caseId)?.assignee?.trim() || 'Unassigned'
      bump(assignee, status)
    }
  }

  return [...tallies.entries()]
    .map(([name, counts]) => ({
      name,
      ...counts,
      total: counts.passed + counts.failed + counts.blocked,
    }))
    .filter((r) => r.total > 0)
    .sort((a, b) => b.total - a.total)
}

export function computeDashboardOpenRuns(
  runs: DemoRun[],
  cases: Case[],
): DashboardOpenRunRow[] {
  const active = getDashboardActiveRuns(runs)
  const caseById = new Map(cases.map((c) => [c.id, c]))

  return active.map((run) => {
    const s = runSummary(run)
    const executed = s.passed + s.failed + s.blocked + s.skipped
    const assignee = primaryAssigneeForRun(run, caseById)
    const parts = [run.planName ?? '—']
    if (run.due) parts.push(`due ${run.due}`)
    if (assignee !== 'Unassigned') parts.push(assignee)
    return {
      runId: run.id,
      runKey: run.runKey,
      name: run.name,
      meta: parts.join(' · '),
      assignee,
      pass: s.passed,
      fail: s.failed,
      blocked: s.blocked,
      skipped: s.skipped,
      notRun: s.notRun,
      total: s.total,
      executed,
    }
  })
}

export function collectDashboardUnlinkedFailures(
  runs: DemoRun[],
  cases: Case[],
): DashboardUnlinkedFailure[] {
  const active = getDashboardActiveRuns(runs)
  const caseById = new Map(cases.map((c) => [c.id, c]))
  const items: DashboardUnlinkedFailure[] = []

  for (const run of active) {
    for (const caseId of run.caseOrder) {
      const ex = run.executions[caseId]
      if (ex?.status === 'Failed' && (!ex.defects || ex.defects.length === 0)) {
        const c = caseById.get(caseId)
        if (c) {
          items.push({
            key: `${run.id}:${caseId}`,
            title: c.title,
            priority: c.priority,
            runName: run.name,
            testedBy: ex.testedBy,
            testedAt: ex.testedAt,
          })
        }
      }
    }
  }

  return items.sort((a, b) => {
    const aTime = a.testedAt ? new Date(a.testedAt).getTime() : 0
    const bTime = b.testedAt ? new Date(b.testedAt).getTime() : 0
    if (bTime !== aTime) return bTime - aTime
    return a.runName.localeCompare(b.runName)
  })
}

function coverageColor(pct: number): string {
  if (pct >= 80) return 'var(--pass)'
  if (pct <= 50) return 'var(--fail)'
  return 'var(--accent)'
}

export function computeDashboardCoverageRows(
  cases: Case[],
  folders: Folder[],
  runs: DemoRun[],
): DashboardCoverageRow[] {
  const active = getDashboardActiveRuns(runs)
  const coveredCaseIds = new Set<string>()

  for (const run of active) {
    for (const caseId of run.caseOrder) {
      const status = run.executions[caseId]?.status ?? 'Not run'
      if (status !== 'Not run') coveredCaseIds.add(caseId)
    }
  }

  const rows: DashboardCoverageRow[] = []
  const rootFolders = folders
    .filter((f) => f.parentId == null)
    .sort((a, b) => a.name.localeCompare(b.name))

  for (const folder of rootFolders) {
    const folderCases = casesInFolder(cases, folders, folder.id)
    if (folderCases.length === 0) continue
    const covered = folderCases.filter((c) => coveredCaseIds.has(c.id)).length
    const pct = Math.round((covered / folderCases.length) * 100)
    rows.push({ label: folder.name, pct })
  }

  const unfiledCases = casesInFolder(cases, folders, '__unfiled__')
  if (unfiledCases.length > 0) {
    const covered = unfiledCases.filter((c) => coveredCaseIds.has(c.id)).length
    const pct = Math.round((covered / unfiledCases.length) * 100)
    rows.push({ label: 'Unfiled', pct })
  }

  return rows.sort((a, b) => a.pct - b.pct)
}

export { coverageColor as dashboardCoverageColor }
