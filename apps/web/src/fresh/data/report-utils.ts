import type {
  Case,
  CaseExecution,
  DemoRun,
  DemoState,
  ExecStatus,
  Folder,
  ReportScopeType,
  RunSummary,
} from './demo-model'
import { runSummary } from './demo-model'

/**
 * Reports-page computation helpers (Area A of the MVP close-out).
 *
 * "Sprint" note: the prototype has no first-class sprint entity, so trend
 * buckets are **runs ordered by creation date** — each run is one point in a
 * trend. This is derived entirely from live FreshProvider state; nothing here
 * is fabricated.
 */

export interface ScopedRunStat {
  run: DemoRun
  summary: RunSummary
  /** Pass rate over executed cases (0–100), or null when nothing executed. */
  passRate: number | null
  /** Executed cases / cases in run (0–100). */
  progressPct: number
  /** Failed execution count per top-level folder id ('__unfiled__' fallback). */
  failuresByRootFolder: Record<string, number>
}

/** Resolve a case's top-level (root) folder id, or '__unfiled__'. */
export function rootFolderIdForCase(c: Case, foldersById: Map<string, Folder>): string {
  let folderId = c.folderId ?? null
  if (!folderId) return '__unfiled__'
  let guard = 0
  while (guard < 50) {
    const folder = foldersById.get(folderId)
    if (!folder) return '__unfiled__'
    if (!folder.parentId) return folder.id
    folderId = folder.parentId
    guard += 1
  }
  return '__unfiled__'
}

/** Runs in scope, oldest → newest, limited to the last `rangeRuns`. Archived runs excluded. */
export function resolveScopedRuns(
  runs: DemoRun[],
  scopeType: ReportScopeType,
  scopeId: string | undefined,
  rangeRuns: number,
): DemoRun[] {
  let scoped = runs.filter((r) => !r.archivedAt)
  if (scopeType === 'plan' && scopeId) scoped = scoped.filter((r) => r.planId === scopeId)
  if (scopeType === 'run' && scopeId) scoped = scoped.filter((r) => r.id === scopeId)
  scoped = [...scoped].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  return rangeRuns > 0 ? scoped.slice(-rangeRuns) : scoped
}

export function computeScopedRunStats(
  scopedRuns: DemoRun[],
  cases: Case[],
  folders: Folder[],
): ScopedRunStat[] {
  const casesById = new Map(cases.map((c) => [c.id, c]))
  const foldersById = new Map(folders.map((f) => [f.id, f]))
  return scopedRuns.map((run) => {
    const summary = runSummary(run)
    const executed = summary.total - summary.notRun
    const failuresByRootFolder: Record<string, number> = {}
    for (const caseId of run.caseOrder) {
      const ex = run.executions[caseId]
      if (ex?.status !== 'Failed') continue
      const c = casesById.get(caseId)
      const rootId = c ? rootFolderIdForCase(c, foldersById) : '__unfiled__'
      failuresByRootFolder[rootId] = (failuresByRootFolder[rootId] ?? 0) + 1
    }
    return {
      run,
      summary,
      passRate: executed > 0 ? (summary.passed / executed) * 100 : null,
      progressPct: summary.total > 0 ? (executed / summary.total) * 100 : 0,
      failuresByRootFolder,
    }
  })
}

export interface ReportKpis {
  passRate: number | null
  /** Distinct cases included in scoped runs / all project cases (0–100). */
  runCoveragePct: number
  coveredCaseCount: number
  totalCaseCount: number
  openFailures: number
  blocked: number
  /** Executions recorded per distinct active day, from executionLog. Null when no log data. */
  avgCasesPerDay: number | null
  executedCount: number
  passedCount: number
}

export function computeReportKpis(stats: ScopedRunStat[], allCases: Case[]): ReportKpis {
  let executed = 0
  let passed = 0
  let failed = 0
  let blocked = 0
  const covered = new Set<string>()
  let logEntries = 0
  const activeDays = new Set<string>()
  for (const s of stats) {
    executed += s.summary.total - s.summary.notRun
    passed += s.summary.passed
    failed += s.summary.failed
    blocked += s.summary.blocked
    for (const caseId of s.run.caseOrder) covered.add(caseId)
    for (const entry of s.run.executionLog ?? []) {
      if (entry.event === 'created') continue
      logEntries += 1
      activeDays.add(entry.at.slice(0, 10))
    }
  }
  const totalCaseCount = allCases.length
  return {
    passRate: executed > 0 ? (passed / executed) * 100 : null,
    runCoveragePct: totalCaseCount > 0 ? (covered.size / totalCaseCount) * 100 : 0,
    coveredCaseCount: covered.size,
    totalCaseCount,
    openFailures: failed,
    blocked,
    avgCasesPerDay: activeDays.size > 0 ? logEntries / activeDays.size : null,
    executedCount: executed,
    passedCount: passed,
  }
}

export interface FailingCaseStat {
  caseId: string
  caseKey: string
  title: string
  failCount: number
  /** Last up-to-5 execution statuses across scoped runs, oldest → newest. */
  lastStatuses: ExecStatus[]
  /** Defect ids/keys linked to this case's executions in scope. */
  defectIds: string[]
}

export function computeTopFailingCases(
  stats: ScopedRunStat[],
  cases: Case[],
  limit = 8,
): FailingCaseStat[] {
  const casesById = new Map(cases.map((c) => [c.id, c]))
  const byCase = new Map<string, { failCount: number; statuses: ExecStatus[]; defects: Set<string> }>()
  for (const s of stats) {
    for (const caseId of s.run.caseOrder) {
      const ex = s.run.executions[caseId]
      if (!ex || ex.status === 'Not run') continue
      const entry = byCase.get(caseId) ?? { failCount: 0, statuses: [], defects: new Set<string>() }
      entry.statuses.push(ex.status)
      if (ex.status === 'Failed') entry.failCount += 1
      for (const d of ex.defects ?? []) entry.defects.add(d)
      byCase.set(caseId, entry)
    }
  }
  return [...byCase.entries()]
    .filter(([, v]) => v.failCount > 0)
    .sort((a, b) => b[1].failCount - a[1].failCount)
    .slice(0, limit)
    .map(([caseId, v]) => {
      const c = casesById.get(caseId)
      return {
        caseId,
        caseKey: c?.caseKey ?? caseId,
        title: c?.title ?? 'Unknown case',
        failCount: v.failCount,
        lastStatuses: v.statuses.slice(-5),
        defectIds: [...v.defects],
      }
    })
}

export interface DrillDownRow {
  runId: string
  runKey: string
  runName: string
  runSealed: boolean
  caseId: string
  caseKey: string
  caseTitle: string
  rootFolderId: string
  status: ExecStatus
  testedBy?: string
  testedAt?: string
  defectIds: string[]
  execution: CaseExecution
}

export interface DrillDownFilter {
  runId?: string
  rootFolderId?: string
  statuses?: ExecStatus[]
}

export function computeDrillDownRows(
  stats: ScopedRunStat[],
  cases: Case[],
  folders: Folder[],
  filter: DrillDownFilter,
): DrillDownRow[] {
  const casesById = new Map(cases.map((c) => [c.id, c]))
  const foldersById = new Map(folders.map((f) => [f.id, f]))
  const statuses = filter.statuses && filter.statuses.length > 0 ? new Set(filter.statuses) : null
  const rows: DrillDownRow[] = []
  for (const s of stats) {
    if (filter.runId && s.run.id !== filter.runId) continue
    for (const caseId of s.run.caseOrder) {
      const ex = s.run.executions[caseId]
      if (!ex || ex.status === 'Not run') continue
      if (statuses && !statuses.has(ex.status)) continue
      const c = casesById.get(caseId)
      const rootFolderId = c ? rootFolderIdForCase(c, foldersById) : '__unfiled__'
      if (filter.rootFolderId && rootFolderId !== filter.rootFolderId) continue
      rows.push({
        runId: s.run.id,
        runKey: s.run.runKey,
        runName: s.run.name,
        runSealed: s.run.sealed,
        caseId,
        caseKey: c?.caseKey ?? caseId,
        caseTitle: c?.title ?? 'Unknown case',
        rootFolderId,
        status: ex.status,
        testedBy: ex.testedBy,
        testedAt: ex.testedAt,
        defectIds: ex.defects ?? [],
        execution: ex,
      })
    }
  }
  return rows
}

/** Requirement coverage rollup (Area H). Derived entirely from existing state. */
export type RequirementCoverageStatus =
  | 'Uncovered'
  | 'Covered — not run'
  | 'Covered — passing'
  | 'Covered — has failures'

export interface RequirementCoverage {
  requirementId: string
  linkedCaseCount: number
  passed: number
  failed: number
  blocked: number
  notRun: number
  status: RequirementCoverageStatus
}

export function resolveRequirementCoverage(state: DemoState, projectId: string): RequirementCoverage[] {
  const requirements = Object.values(state.requirementsById ?? {}).filter(
    (r) => r.projectId === projectId,
  )
  const projectCases = state.cases.filter((c) => c.projectId === projectId)
  const projectRuns = state.runs.filter((r) => r.projectId === projectId && !r.archivedAt)

  // Latest execution status per case across non-archived runs (newest run wins).
  const latestStatusByCase = new Map<string, ExecStatus>()
  const sortedRuns = [...projectRuns].sort((a, b) => a.createdAt.localeCompare(b.createdAt))
  for (const run of sortedRuns) {
    for (const [caseId, ex] of Object.entries(run.executions)) {
      if (ex.status !== 'Not run') latestStatusByCase.set(caseId, ex.status)
    }
  }

  return requirements
    .sort((a, b) => a.requirementKey.localeCompare(b.requirementKey))
    .map((req) => {
      const linked = projectCases.filter((c) => (c.requirementIds ?? []).includes(req.id))
      let passed = 0
      let failed = 0
      let blocked = 0
      let notRun = 0
      for (const c of linked) {
        const status = latestStatusByCase.get(c.id)
        if (status === 'Passed') passed += 1
        else if (status === 'Failed') failed += 1
        else if (status === 'Blocked') blocked += 1
        else notRun += 1
      }
      let status: RequirementCoverageStatus = 'Uncovered'
      if (linked.length > 0) {
        if (failed > 0 || blocked > 0) status = 'Covered — has failures'
        else if (passed > 0) status = 'Covered — passing'
        else status = 'Covered — not run'
      }
      return {
        requirementId: req.id,
        linkedCaseCount: linked.length,
        passed,
        failed,
        blocked,
        notRun,
        status,
      }
    })
}
