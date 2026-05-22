import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import { testRunCases, testRuns, type TestRun } from '../../schema'
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

export interface RunListItem {
  id: string
  runRef: string
  title: string
  status: RunStatus
  environment: string | null
  createdAt: Date
  caseCounts: CaseCountSummary
}

export interface RunDetailCaseItem {
  testRunCaseId: string
  originalTestCaseId: string
  caseRef: string
  title: string
  priority: (typeof testRunCases.$inferSelect)['snapshotPriority']
  type: (typeof testRunCases.$inferSelect)['snapshotType']
  assignedTo: string | null
  status: (typeof testRunCases.$inferSelect)['status']
  comment: string | null
  executedBy: string | null
  executedAt: Date | null
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

function countsFromAggregate(row: {
  total: number
  passed: number
  failed: number
  blocked: number
  skipped: number
  notRun: number
}): CaseCountSummary {
  return {
    total: row.total,
    passed: row.passed,
    failed: row.failed,
    blocked: row.blocked,
    skipped: row.skipped,
    notRun: row.notRun,
  }
}

async function loadCaseCountsByRunId(
  runIds: string[],
): Promise<Map<string, CaseCountSummary>> {
  if (runIds.length === 0) return new Map()

  const rows = await db
    .select({
      testRunId: testRunCases.testRunId,
      total: sql<number>`count(*)`.mapWith(Number),
      passed: sql<number>`coalesce(sum(case when ${testRunCases.status} = 'pass' then 1 else 0 end), 0)`.mapWith(
        Number,
      ),
      failed: sql<number>`coalesce(sum(case when ${testRunCases.status} = 'fail' then 1 else 0 end), 0)`.mapWith(
        Number,
      ),
      blocked: sql<number>`coalesce(sum(case when ${testRunCases.status} = 'blocked' then 1 else 0 end), 0)`.mapWith(
        Number,
      ),
      skipped: sql<number>`coalesce(sum(case when ${testRunCases.status} = 'skip' then 1 else 0 end), 0)`.mapWith(
        Number,
      ),
      notRun: sql<number>`coalesce(sum(case when ${testRunCases.status} = 'not_run' then 1 else 0 end), 0)`.mapWith(
        Number,
      ),
    })
    .from(testRunCases)
    .where(inArray(testRunCases.testRunId, runIds))
    .groupBy(testRunCases.testRunId)

  return new Map(
    rows.map((r) => [r.testRunId, countsFromAggregate(r)]),
  )
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
      createdAt: testRuns.createdAt,
    })
    .from(testRuns)
    .where(and(...conditions))
    .orderBy(desc(testRuns.createdAt))
    .limit(limit)

  const countMap = await loadCaseCountsByRunId(runs.map((r) => r.id))

  return runs.map((run) => ({
    ...run,
    caseCounts: countMap.get(run.id) ?? { ...EMPTY_COUNTS },
  }))
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

  const cases = await db
    .select({
      testRunCaseId: testRunCases.id,
      originalTestCaseId: testRunCases.testCaseId,
      caseRef: testRunCases.snapshotCaseRef,
      title: testRunCases.snapshotTitle,
      priority: testRunCases.snapshotPriority,
      type: testRunCases.snapshotType,
      assignedTo: testRunCases.assignedTo,
      status: testRunCases.status,
      comment: testRunCases.comment,
      executedBy: testRunCases.executedBy,
      executedAt: testRunCases.executedAt,
      position: testRunCases.position,
    })
    .from(testRunCases)
    .where(eq(testRunCases.testRunId, runId))
    .orderBy(testRunCases.position)

  return {
    ...run,
    caseCounts: countsFromCaseRows(cases),
    testRunCases: cases,
  }
}
