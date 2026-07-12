/**
 * DefectService.ts
 * Relay — Service layer
 *
 * Defect links (Phase 6 of mvp-backend) + defect entities (new-tables
 * candidate, Phase E). Two concerns live here:
 *   1. run_defect_links — a defect reference attached to a specific case
 *      execution within a run. For an *external* ref (e.g. "TI-4419",
 *      "JIRA-123") this is a free-text key with defect_id NULL. For an
 *      *internal* ("Local") defect it is a link to a real `defects` row via
 *      defect_id, with defect_ref = that defect's DEF-<n> key.
 *   2. defects (Phase E) — project-scoped first-class defect ENTITIES, minted
 *      DEF-<n> via the ref_counters pattern (same as case_ref / requirement_ref).
 *      Modeled directly on RequirementService.ts: viewer to read, contributor
 *      to write, db.transaction() + recordAudit() inside the tx.
 *
 * Deliberate scope decisions (flagged so they aren't silently re-derived):
 *   - EXTERNAL defect linking is UNCHANGED — the defect_id FK is additive and
 *     nullable, and linkDefect()'s existing free-text-ref path is preserved
 *     exactly. Only the internal path threads a defect_id.
 *   - No `severity` field on the defect entity — the frontend Defect model has
 *     status only (Open/In progress/Resolved/Closed); deliberately not invented.
 *   - Modeled on ExecutionService.ts's shape for links (projectId/testRunId/
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

import { and, desc, eq, isNull, sql } from 'drizzle-orm'
import {
  defects,
  projects,
  runDefectLinks,
  testRunCases,
  testRuns,
  type NewDefect,
  type NewRunDefectLink,
} from '../schema'
import { db } from '../src/index'
import { logger } from '../src/logger'
import { assertMinProjectRole } from '../src/rbac/assert-min-role'
import { createId } from '../src/utils/id'
import { recordAudit } from './AuditService'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type DefectStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export interface DefectSummary {
  id: string
  defectRef: string
  projectId: string
  title: string
  description: string | null
  status: DefectStatus
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ListDefectsInput {
  actorId: string
  projectId: string
}

export interface CreateDefectInput {
  actorId: string
  projectId: string
  title: string
  description?: string | null
  status?: DefectStatus
}

export interface DefectLinkRow {
  id: string
  testRunCaseId: string
  defectRef: string
  defectId: string | null
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
  /**
   * Internal defect FK (Phase E). When set, the link points at a real
   * `defects` row (validated to belong to `projectId`) and defect_ref should be
   * that defect's DEF-<n> key. Omitted for external free-text refs — that path
   * is unchanged.
   */
  defectId?: string
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
  | 'PROJECT_NOT_FOUND'
  | 'RUN_NOT_FOUND'
  | 'CASE_NOT_FOUND'
  | 'LINK_NOT_FOUND'
  | 'ALREADY_UNLINKED'
  | 'DEFECT_NOT_FOUND'
  | 'DUPLICATE_DEFECT_REF'
  | 'REF_COUNTER_TIMEOUT'
  | 'TRANSACTION_FAILED'

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

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'errno' in err &&
    (err as { errno: number }).errno === 1062
  )
}

function isLockTimeoutError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'errno' in err &&
    (err as { errno: number }).errno === 1205
  )
}

async function assertProjectExists(projectId: string): Promise<void> {
  const [project] = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.id, projectId))
    .limit(1)
  if (!project) {
    throw new DefectServiceError('Project not found.', 'PROJECT_NOT_FOUND')
  }
}

/**
 * Atomically generate the next defect_ref for a project. Mirrors
 * RequirementService.generateRequirementRef() exactly, but for
 * entity_type='defect' and the unpadded 'DEF-<n>' format. Must be called inside
 * a db.transaction().
 */
async function generateDefectRef(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  projectId: string,
): Promise<string> {
  await tx.execute(sql`
    INSERT INTO ref_counters (project_id, entity_type, next_value)
    VALUES (${projectId}, 'defect', 1)
    ON DUPLICATE KEY UPDATE next_value = next_value + 0
  `)

  const counterResult = await tx.execute(sql`
    SELECT next_value
    FROM ref_counters
    WHERE project_id = ${projectId} AND entity_type = 'defect'
    FOR UPDATE
  `)

  const rows = counterResult[0] as unknown as Array<{ next_value: number }>
  const counterRow = rows[0]

  if (!counterRow) {
    throw new DefectServiceError(
      'Failed to initialise ref counter — counter row missing.',
      'REF_COUNTER_TIMEOUT',
    )
  }

  const currentRef = counterRow.next_value

  await tx.execute(sql`
    UPDATE ref_counters
    SET next_value = next_value + 1
    WHERE project_id = ${projectId} AND entity_type = 'defect'
  `)

  return `DEF-${currentRef}`
}

function toDefectSummary(row: typeof defects.$inferSelect): DefectSummary {
  return {
    id: row.id,
    defectRef: row.defectRef,
    projectId: row.projectId,
    title: row.title,
    description: row.description,
    status: row.status as DefectStatus,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

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
// Defect entities (Phase E) — reads
// ---------------------------------------------------------------------------

export async function listDefects(input: ListDefectsInput): Promise<DefectSummary[]> {
  const { actorId, projectId } = input
  await assertProjectExists(projectId)
  await assertMinProjectRole(actorId, projectId, 'viewer')

  const rows = await db
    .select()
    .from(defects)
    .where(eq(defects.projectId, projectId))
    .orderBy(defects.defectRef)

  return rows.map(toDefectSummary)
}

// ---------------------------------------------------------------------------
// Defect entities (Phase E) — writes
// ---------------------------------------------------------------------------

export async function createDefect(input: CreateDefectInput): Promise<DefectSummary> {
  const { actorId, projectId, title, description, status = 'open' } = input

  await assertProjectExists(projectId)
  await assertMinProjectRole(actorId, projectId, 'contributor')

  const newDefectId = createId()

  let defectRef: string
  try {
    defectRef = await db.transaction(async (tx) => {
      const ref = await generateDefectRef(tx, projectId)

      const newRow: NewDefect = {
        id: newDefectId,
        defectRef: ref,
        projectId,
        title,
        description: description ?? null,
        status,
        createdBy: actorId,
      }
      await tx.insert(defects).values(newRow)

      await recordAudit(
        {
          projectId,
          entityType: 'defect',
          entityId: newDefectId,
          action: 'defect.created',
          actorId,
          newValue: { defectRef: ref, title, status },
        },
        tx,
      )

      return ref
    })
  } catch (err: unknown) {
    if (isLockTimeoutError(err)) {
      throw new DefectServiceError(
        'Timed out acquiring the defect reference counter lock. Try again.',
        'REF_COUNTER_TIMEOUT',
      )
    }
    if (isDuplicateKeyError(err)) {
      throw new DefectServiceError(
        'Duplicate defect reference conflict. Try again.',
        'DUPLICATE_DEFECT_REF',
      )
    }
    const message = err instanceof Error ? err.message : String(err)
    logger.error('[DefectService] createDefect transaction failed', {
      projectId,
      error: message,
    })
    throw new DefectServiceError(`Defect creation failed: ${message}`, 'TRANSACTION_FAILED')
  }

  logger.info('[DefectService] defect created', { defectId: newDefectId, defectRef, projectId })

  return {
    id: newDefectId,
    defectRef,
    projectId,
    title,
    description: description ?? null,
    status,
    createdBy: actorId,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

// ---------------------------------------------------------------------------
// Defect links — reads
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
  const { actorId, projectId, testRunId, testRunCaseId, defectRef, defectUrl, defectId } = input
  await assertMinProjectRole(actorId, projectId, 'contributor')
  const { runRef, snapshotCaseRef } = await assertRunCaseInProject(
    projectId,
    testRunId,
    testRunCaseId,
  )

  // Internal defect (Phase E): validate the FK belongs to this project. External
  // refs pass no defectId and skip this — that path is unchanged.
  if (defectId) {
    const [existingDefect] = await db
      .select({ id: defects.id })
      .from(defects)
      .where(and(eq(defects.id, defectId), eq(defects.projectId, projectId)))
      .limit(1)
    if (!existingDefect) {
      throw new DefectServiceError(`Defect not found: ${defectId}`, 'DEFECT_NOT_FOUND')
    }
  }

  const newLinkId = createId()
  const newLink: NewRunDefectLink = {
    id: newLinkId,
    testRunCaseId,
    defectRef,
    defectId: defectId ?? null,
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
