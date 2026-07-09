/**
 * DefectService.ts
 * Relay — Service layer
 *
 * Defect links (Phase 6 of mvp-backend). Manages run_defect_links only — an
 * external defect reference (e.g. "TI-4419", "JIRA-123") attached to a
 * specific case execution within a run. Relay does not manage the defect
 * lifecycle itself (see schema.ts's own comment on run_defect_links); this
 * service only records/soft-deletes the link.
 *
 * Deliberate scope decision (see docs/claude/handoff.md for the full write-up
 * — flagged here so it isn't silently re-derived or contradicted later):
 *   - No new standalone `defects` table is introduced this phase. The
 *     frontend prototype's DefectsScreen.tsx models defects as first-class
 *     objects (title, severity, status, etc.) with no real backing table —
 *     that richer model is out of scope here, same reasoning as Phase 2/3
 *     excluding custom fields and dynamic plan queries. This service only
 *     covers what run_defect_links can actually represent: a link between a
 *     run case execution and an external defect ref/URL.
 *   - Modeled on ExecutionService.ts's shape (projectId/testRunId/
 *     testRunCaseId all passed in explicitly, validated via getRunProjectId
 *     equivalent checks) rather than TestCaseService's nested-route shape,
 *     since defect links hang off /api/runs/* — a route family Phase 4
 *     deliberately left untouched (see docs/claude/mvp-backend/progress.md).
 *     These are net-new routes, not modifications to the already-live
 *     /api/runs/* routes, so this is safe to add without touching Phase 4.
 *   - "Unlink" is soft-delete (unlinked_at set), never a hard row delete —
 *     matches schema.ts's documented invariant that link history is
 *     preserved for audit_log.
 */

import { and, desc, eq, isNull } from 'drizzle-orm'
import { runDefectLinks, testRunCases, testRuns, type NewRunDefectLink } from '../schema'
import { db } from '../src/index'
import { logger } from '../src/logger'
import { assertMinProjectRole } from '../src/rbac/assert-min-role'
import { createId } from '../src/utils/id'
import { recordAudit } from './AuditService'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface DefectLinkRow {
  id: string
  testRunCaseId: string
  defectRef: string
  defectUrl: string | null
  linkedBy: string | null
  linkedAt: Date
  unlinkedAt: Date | null
  unlinkedBy: string | null
}

export interface ListDefectLinksInput {
  actorId: string
  projectId: string
  testRunId: string
  testRunCaseId: string
  /** Default false: only active (unlinked_at IS NULL) links. */
  includeUnlinked?: boolean
}

export interface LinkDefectInput {
  actorId: string
  projectId: string
  testRunId: string
  testRunCaseId: string
  defectRef: string
  defectUrl?: string
}

export interface UnlinkDefectInput {
  actorId: string
  projectId: string
  testRunId: string
  testRunCaseId: string
  linkId: string
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type DefectServiceErrorCode =
  | 'RUN_NOT_FOUND'
  | 'CASE_NOT_FOUND'
  | 'LINK_NOT_FOUND'
  | 'ALREADY_UNLINKED'

export class DefectServiceError extends Error {
  constructor(
    message: string,
    public readonly code: DefectServiceErrorCode,
  ) {
    super(message)
    this.name = 'DefectServiceError'
  }
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/** Confirms testRunId belongs to projectId and testRunCaseId belongs to testRunId. Returns the run's runRef for audit metadata. */
async function assertRunCaseInProject(
  projectId: string,
  testRunId: string,
  testRunCaseId: string,
): Promise<{ runRef: string; snapshotCaseRef: string }> {
  const [run] = await db
    .select({ id: testRuns.id, runRef: testRuns.runRef })
    .from(testRuns)
    .where(and(eq(testRuns.id, testRunId), eq(testRuns.projectId, projectId)))
    .limit(1)
  if (!run) {
    throw new DefectServiceError(`Test run not found: ${testRunId}`, 'RUN_NOT_FOUND')
  }

  const [runCase] = await db
    .select({ id: testRunCases.id, snapshotCaseRef: testRunCases.snapshotCaseRef })
    .from(testRunCases)
    .where(and(eq(testRunCases.id, testRunCaseId), eq(testRunCases.testRunId, testRunId)))
    .limit(1)
  if (!runCase) {
    throw new DefectServiceError(`Test run case not found: ${testRunCaseId}`, 'CASE_NOT_FOUND')
  }

  return { runRef: run.runRef, snapshotCaseRef: runCase.snapshotCaseRef }
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function listDefectLinks(input: ListDefectLinksInput): Promise<DefectLinkRow[]> {
  const { actorId, projectId, testRunId, testRunCaseId, includeUnlinked = false } = input
  await assertMinProjectRole(actorId, projectId, 'viewer')
  await assertRunCaseInProject(projectId, testRunId, testRunCaseId)

  const conditions = [eq(runDefectLinks.testRunCaseId, testRunCaseId)]
  if (!includeUnlinked) {
    conditions.push(isNull(runDefectLinks.unlinkedAt))
  }

  return db
    .select()
    .from(runDefectLinks)
    .where(and(...conditions))
    .orderBy(desc(runDefectLinks.linkedAt))
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function linkDefect(input: LinkDefectInput): Promise<DefectLinkRow> {
  const { actorId, projectId, testRunId, testRunCaseId, defectRef, defectUrl } = input
  await assertMinProjectRole(actorId, projectId, 'contributor')
  const { runRef, snapshotCaseRef } = await assertRunCaseInProject(
    projectId,
    testRunId,
    testRunCaseId,
  )

  const newLinkId = createId()
  const newLink: NewRunDefectLink = {
    id: newLinkId,
    testRunCaseId,
    defectRef,
    defectUrl: defectUrl ?? null,
    linkedBy: actorId,
  }

  try {
    await db.transaction(async (tx) => {
      await tx.insert(runDefectLinks).values(newLink)

      await recordAudit(
        {
          projectId,
          entityType: 'run_defect_link',
          entityId: newLinkId,
          action: 'defect.linked',
          actorId,
          newValue: { defectRef, defectUrl: defectUrl ?? null },
          metadata: { testRunId, runRef, testRunCaseId, snapshotCaseRef },
        },
        tx,
      )
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('[DefectService] linkDefect transaction failed', { testRunCaseId, error: message })
    throw err
  }

  const [row] = await db
    .select()
    .from(runDefectLinks)
    .where(eq(runDefectLinks.id, newLinkId))
    .limit(1)
  return row
}

export async function unlinkDefect(input: UnlinkDefectInput): Promise<void> {
  const { actorId, projectId, testRunId, testRunCaseId, linkId } = input
  await assertMinProjectRole(actorId, projectId, 'contributor')
  const { runRef, snapshotCaseRef } = await assertRunCaseInProject(
    projectId,
    testRunId,
    testRunCaseId,
  )

  const [existing] = await db
    .select({ id: runDefectLinks.id, unlinkedAt: runDefectLinks.unlinkedAt, defectRef: runDefectLinks.defectRef })
    .from(runDefectLinks)
    .where(and(eq(runDefectLinks.id, linkId), eq(runDefectLinks.testRunCaseId, testRunCaseId)))
    .limit(1)
  if (!existing) {
    throw new DefectServiceError(`Defect link not found: ${linkId}`, 'LINK_NOT_FOUND')
  }
  if (existing.unlinkedAt) {
    throw new DefectServiceError('Defect link is already unlinked.', 'ALREADY_UNLINKED')
  }

  await db
    .update(runDefectLinks)
    .set({ unlinkedAt: new Date(), unlinkedBy: actorId })
    .where(eq(runDefectLinks.id, linkId))

  await recordAudit({
    projectId,
    entityType: 'run_defect_link',
    entityId: linkId,
    action: 'defect.unlinked',
    actorId,
    oldValue: { defectRef: existing.defectRef },
    metadata: { testRunId, runRef, testRunCaseId, snapshotCaseRef },
  })
}
