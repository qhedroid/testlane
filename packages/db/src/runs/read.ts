import { and, desc, eq, inArray, isNull } from 'drizzle-orm'
import { runDefectLinks, testRunCases, testRuns, users, type TestRun } from '../../schema'
import {
  assertMinProjectRole,
  InsufficientPermissionsError,
} from '../rbac/assert-min-role'
import { db } from '../index'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RunStatus = TestRun['status']

export interface CaseCountSummary {
  total: number
  passed: number
  failed: number
  blocked: number
  skipped: number
  notRun: number
}

export interface ListProjectRunsInput {
  actorId: string
  projectId: string
  status?: RunStatus
  limit?: number
}

/**
 * Per-case result row included in run list responses (Phase 4 screen-wiring).
 * Mirrors what the fresh RunsScreen needs to build its local `executions`
 * map: live test case id, current result, and active defect refs. Snapshot
 * display fields (title/priority/…) are deliberately NOT included here — the
 * fresh screens render live case data from their own synced case list; the
 * full snapshot remains available via getRunDetail().
 */
export interface RunCaseResultItem {
  testRunCaseId: string
  testCaseId: string
  status: (typeof testRunCases.$inferSelect)['status']
  comment: string | null
  assignedTo: string | null
  executedBy: string | null
  executedAt: Date | null
  position: number
  /** Active (not-unlinked) external defect refs, e.g. "JIRA-4471". */
  defectRefs: string[]
}

export interface RunListItem {
  id: string
  runRef: string
  title: string
  status: RunStatus
  environment: string | null
  testPlanId: string | null
  dueDate: Date | null
  createdAt: Date
  updatedAt: Date
  caseCounts: CaseCountSummary
  /** Ordered by position. Added Phase 4 (additive — pre-existing /runs/api consumers ignore it). */
  cases: RunCaseResultItem[]
}

export interface RunDetailCaseItem {
  testRunCaseId: string
  originalTestCaseId: string
  caseRef: string
  title: string
  priority: (typeof testRunCases.$inferSelect)['snapshotPriority']
  type: (typeof testRunCases.$inferSelect)['snapshotType']
  module: string | null
  assignedTo: string | null
  assignedToName: string | null
  status: (typeof testRunCases.$inferSelect)['status']
  comment: string | null
  executedBy: string | null
  executedByName: string | null
  executedAt: Date | null
  updatedAt: Date
  position: number
}

export interface GetRunDetailInput {
  actorId: string
  projectId: string
  runId: string
}

export interface RunDetail {
  id: string
  runRef: string
  title: string
  status: RunStatus
  environment: string | null
  createdAt: Date
  testPlanId: string | null
  projectId: string
  isStalled: boolean
  caseCounts: CaseCountSummary
  testRunCases: RunDetailCaseItem[]
}

export type RunReadErrorCode = 'INSUFFICIENT_PERMISSIONS' | 'RUN_NOT_FOUND'

export class RunReadError extends Error {
  constructor(
    message: string,
    public readonly code: RunReadErrorCode,
  ) {
    super(message)
    this.name = 'RunReadError'
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const EMPTY_COUNTS: CaseCountSummary = {
  total: 0,
  passed: 0,
  failed: 0,
  blocked: 0,
  skipped: 0,
  notRun: 0,
}

async function assertViewerAccess(actorId: string, projectId: string): Promise<void> {
  try {
    await assertMinProjectRole(actorId, projectId, 'viewer')
  } catch (err) {
    if (err instanceof InsufficientPermissionsError) {
      throw new RunReadError(err.message, 'INSUFFICIENT_PERMISSIONS')
    }
    throw err
  }
}

function countsFromCaseRows(
  cases: Array<{ status: (typeof testRunCases.$inferSelect)['status'] }>,
): CaseCountSummary {
  const counts = { ...EMPTY_COUNTS, total: cases.length }
  for (const c of cases) {
    switch (c.status) {
      case 'pass':
        counts.passed++
        break
      case 'fail':
        counts.failed++
        break
      case 'blocked':
        counts.blocked++
        break
      case 'skip':
        counts.skipped++
        break
      case 'not_run':
        counts.notRun++
        break
    }
  }
  return counts
}

// ---------------------------------------------------------------------------
// listProjectRuns
// ---------------------------------------------------------------------------

export async function listProjectRuns(
  input: ListProjectRunsInput,
): Promise<RunListItem[]> {
  const { actorId, projectId, status } = input
  const limit = input.limit ?? 20

  await assertViewerAccess(actorId, projectId)

  const conditions = [eq(testRuns.projectId, projectId)]
  if (status) {
    conditions.push(eq(testRuns.status, status))
  }

  const runs = await db
    .select({
      id: testRuns.id,
      runRef: testRuns.runRef,
      title: testRuns.title,
      status: testRuns.status,
      environment: testRuns.environment,
      testPlanId: testRuns.testPlanId,
      dueDate: testRuns.dueDate,
      createdAt: testRuns.createdAt,
      updatedAt: testRuns.updatedAt,
    })
    .from(testRuns)
    .where(and(...conditions))
    .orderBy(desc(testRuns.createdAt))
    .limit(limit)

  const runIds = runs.map((r) => r.id)

  // Phase 4: one batch query for every listed run's case results (no N+1),
  // plus one for active defect links. caseCounts are computed from the same
  // rows (replaces the old aggregate-only query — same total query count).
  const caseRows =
    runIds.length === 0
      ? []
      : await db
          .select({
            testRunCaseId: testRunCases.id,
            testRunId: testRunCases.testRunId,
            testCaseId: testRunCases.testCaseId,
            status: testRunCases.status,
            comment: testRunCases.comment,
            assignedTo: testRunCases.assignedTo,
            executedBy: testRunCases.executedBy,
            executedAt: testRunCases.executedAt,
            position: testRunCases.position,
          })
          .from(testRunCases)
          .where(inArray(testRunCases.testRunId, runIds))
          .orderBy(testRunCases.testRunId, testRunCases.position)

  const defectRefsByRunCaseId = new Map<string, string[]>()
  if (caseRows.length > 0) {
    const defectRows = await db
      .select({
        testRunCaseId: runDefectLinks.testRunCaseId,
        defectRef: runDefectLinks.defectRef,
      })
      .from(runDefectLinks)
      .where(
        and(
          inArray(
            runDefectLinks.testRunCaseId,
            caseRows.map((c) => c.testRunCaseId),
          ),
          isNull(runDefectLinks.unlinkedAt),
        ),
      )
    for (const d of defectRows) {
      const existing = defectRefsByRunCaseId.get(d.testRunCaseId)
      if (existing) existing.push(d.defectRef)
      else defectRefsByRunCaseId.set(d.testRunCaseId, [d.defectRef])
    }
  }

  const casesByRunId = new Map<string, RunCaseResultItem[]>()
  for (const c of caseRows) {
    const item: RunCaseResultItem = {
      testRunCaseId: c.testRunCaseId,
      testCaseId: c.testCaseId,
      status: c.status,
      comment: c.comment,
      assignedTo: c.assignedTo,
      executedBy: c.executedBy,
      executedAt: c.executedAt,
      position: c.position,
      defectRefs: defectRefsByRunCaseId.get(c.testRunCaseId) ?? [],
    }
    const existing = casesByRunId.get(c.testRunId)
    if (existing) existing.push(item)
    else casesByRunId.set(c.testRunId, [item])
  }

  return runs.map((run) => {
    const cases = casesByRunId.get(run.id) ?? []
    return {
      ...run,
      caseCounts: cases.length > 0 ? countsFromCaseRows(cases) : { ...EMPTY_COUNTS },
      cases,
    }
  })
}

// ---------------------------------------------------------------------------
// getRunDetail
// ---------------------------------------------------------------------------

export async function getRunDetail(input: GetRunDetailInput): Promise<RunDetail> {
  const { actorId, projectId, runId } = input

  await assertViewerAccess(actorId, projectId)

  const [run] = await db
    .select({
      id: testRuns.id,
      runRef: testRuns.runRef,
      title: testRuns.title,
      status: testRuns.status,
      environment: testRuns.environment,
      createdAt: testRuns.createdAt,
      testPlanId: testRuns.testPlanId,
      projectId: testRuns.projectId,
      isStalled: testRuns.isStalled,
    })
    .from(testRuns)
    .where(and(eq(testRuns.id, runId), eq(testRuns.projectId, projectId)))
    .limit(1)

  if (!run) {
    throw new RunReadError(`Test run not found: ${runId}`, 'RUN_NOT_FOUND')
  }

  const caseRows = await db
    .select({
      testRunCaseId: testRunCases.id,
      originalTestCaseId: testRunCases.testCaseId,
      caseRef: testRunCases.snapshotCaseRef,
      title: testRunCases.snapshotTitle,
      priority: testRunCases.snapshotPriority,
      type: testRunCases.snapshotType,
      module: testRunCases.snapshotFolderName,
      assignedTo: testRunCases.assignedTo,
      status: testRunCases.status,
      comment: testRunCases.comment,
      executedBy: testRunCases.executedBy,
      executedAt: testRunCases.executedAt,
      updatedAt: testRunCases.updatedAt,
      position: testRunCases.position,
    })
    .from(testRunCases)
    .where(eq(testRunCases.testRunId, runId))
    .orderBy(testRunCases.position)

  const userIds = [
    ...new Set(
      caseRows.flatMap((c) =>
        [c.assignedTo, c.executedBy].filter((id): id is string => !!id),
      ),
    ),
  ]

  const nameById = new Map<string, string>()
  if (userIds.length > 0) {
    const userRows = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(inArray(users.id, userIds))
    for (const u of userRows) {
      nameById.set(u.id, u.name)
    }
  }

  const cases: RunDetailCaseItem[] = caseRows.map((c) => ({
    ...c,
    assignedToName: c.assignedTo ? (nameById.get(c.assignedTo) ?? null) : null,
    executedByName: c.executedBy ? (nameById.get(c.executedBy) ?? null) : null,
  }))

  return {
    ...run,
    caseCounts: countsFromCaseRows(cases),
    testRunCases: cases,
  }
}
