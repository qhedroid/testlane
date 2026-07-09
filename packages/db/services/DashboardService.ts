/**
 * DashboardService.ts
 * Relay — Service layer
 *
 * Server-side aggregation for the Dashboard (Phase 5 of mvp-backend),
 * computing from real tables what apps/web/src/fresh/data/project-selectors.ts
 * currently computes client-side over localStorage state.
 *
 * Deliberate scope decision (see docs/claude/handoff.md for the full write-up):
 * this only aggregates what's actually backed by real tables today —
 * test_runs / test_run_cases / run_defect_links. The frontend Dashboard also
 * shows widgets with no real backing yet (Requirements coverage, Milestones,
 * results-over-time trend charts needing historical snapshots) — those stay
 * out of scope here, same reasoning as Phase 2/3 excluding custom fields and
 * dynamic plan queries. `run_defect_links` only stores an external defect
 * ref/URL (no severity/status) — the "needs attention" metric below counts
 * *unlinked* failures/blocked cases (a case result of fail/blocked with no
 * defect link yet), which is what that DB table can actually tell us.
 */

import { and, eq, inArray } from 'drizzle-orm'
import { projects, runDefectLinks, testCases, testRunCases, testRuns } from '../schema'
import { db } from '../src/index'
import { assertMinProjectRole } from '../src/rbac/assert-min-role'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DashboardSummary {
  projectId: string
  activeRunCount: number
  /** Pass rate across all case results in active (non-archived) runs, 0-100. */
  passRatePct: number
  /** Case results currently fail/blocked in active runs. */
  openFailureCount: number
  /** Of openFailureCount, how many have no run_defect_links row yet. */
  unlinkedFailureCount: number
  /** % of the project's non-archived test cases that appear in at least one active run. */
  runCoveragePct: number
  totalCaseCount: number
  resultBreakdown: {
    pass: number
    fail: number
    blocked: number
    skip: number
    notRun: number
  }
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type DashboardServiceErrorCode = 'PROJECT_NOT_FOUND'

export class DashboardServiceError extends Error {
  constructor(
    message: string,
    public readonly code: DashboardServiceErrorCode,
  ) {
    super(message)
    this.name = 'DashboardServiceError'
  }
}

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export async function getDashboardSummary(
  actorId: string,
  projectId: string,
): Promise<DashboardSummary> {
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  if (!project) {
    throw new DashboardServiceError('Project not found.', 'PROJECT_NOT_FOUND')
  }

  await assertMinProjectRole(actorId, projectId, 'viewer')

  const activeRuns = await db
    .select({ id: testRuns.id })
    .from(testRuns)
    .where(and(eq(testRuns.projectId, projectId), eq(testRuns.status, 'active')))

  const activeRunIds = activeRuns.map((r) => r.id)

  const breakdown = { pass: 0, fail: 0, blocked: 0, skip: 0, notRun: 0 }
  let openFailureCount = 0
  let unlinkedFailureCount = 0

  if (activeRunIds.length > 0) {
    const caseResults = await db
      .select({ id: testRunCases.id, status: testRunCases.status })
      .from(testRunCases)
      .where(inArray(testRunCases.testRunId, activeRunIds))

    for (const row of caseResults) {
      if (row.status === 'pass') breakdown.pass++
      else if (row.status === 'fail') breakdown.fail++
      else if (row.status === 'blocked') breakdown.blocked++
      else if (row.status === 'skip') breakdown.skip++
      else breakdown.notRun++
    }
    openFailureCount = breakdown.fail + breakdown.blocked

    if (openFailureCount > 0) {
      const failingIds = caseResults
        .filter((r) => r.status === 'fail' || r.status === 'blocked')
        .map((r) => r.id)

      // Any run_defect_links row (linked or previously-unlinked) counts as
      // "has been addressed" for this simple metric — good enough for a
      // dashboard tile; a more precise "still open" count would need to
      // filter unlinkedAt IS NULL, deferred as unnecessary complexity here.
      const linked = await db
        .select({ testRunCaseId: runDefectLinks.testRunCaseId })
        .from(runDefectLinks)
        .where(inArray(runDefectLinks.testRunCaseId, failingIds))
      const linkedIdSet = new Set(linked.map((l) => l.testRunCaseId))
      unlinkedFailureCount = failingIds.filter((id) => !linkedIdSet.has(id)).length
    }
  }

  const totalResults = breakdown.pass + breakdown.fail + breakdown.blocked + breakdown.skip
  const passRatePct = totalResults > 0 ? Math.round((breakdown.pass / totalResults) * 100) : 0

  const activeCaseRows = await db
    .select({ id: testCases.id })
    .from(testCases)
    .where(and(eq(testCases.projectId, projectId), eq(testCases.isArchived, false)))
  const totalCaseCount = activeCaseRows.length

  const distinctCoveredCases = new Set<string>()
  if (activeRunIds.length > 0) {
    const covered = await db
      .select({ testCaseId: testRunCases.testCaseId })
      .from(testRunCases)
      .where(inArray(testRunCases.testRunId, activeRunIds))
    for (const c of covered) distinctCoveredCases.add(c.testCaseId)
  }
  const runCoveragePct =
    totalCaseCount > 0 ? Math.round((distinctCoveredCases.size / totalCaseCount) * 100) : 0

  return {
    projectId,
    activeRunCount: activeRunIds.length,
    passRatePct,
    openFailureCount,
    unlinkedFailureCount,
    runCoveragePct,
    totalCaseCount,
    resultBreakdown: breakdown,
  }
}
