/**
 * RequirementService.ts
 * Testlane — Service layer
 *
 * Requirements (project-scoped entities) + case<->requirement links
 * (new-tables candidate, Phase D). Greenfield — there was no prior table, so
 * this establishes the entity + ref-counter + link pattern that Phase E
 * (defects) reuses. Modeled directly on TestCaseService.ts:
 *   - exported async fns taking one typed input with actorId/projectId
 *   - assertProjectExists + assertMinProjectRole for RBAC (viewer to read,
 *     contributor to write) — no INSUFFICIENT_PERMISSIONS code of its own
 *   - db.transaction() for writes, recordAudit() inside the tx
 *   - createId() for ULIDs; typed RequirementServiceError with a code union
 *
 * Deliberate decisions (flagged so they aren't silently re-derived):
 *   - requirement_ref format: 'REQ-' + a plain integer (e.g. 'REQ-1'), minted
 *     via the same ref_counters transactional pattern as
 *     TestCaseService.generateCaseRef(). The frontend's zero-padded
 *     'REQ-00001' (demo-model.ts formatRequirementKey) is a purely client-side
 *     optimistic-key convention — the DB ref wins once reconciled, exactly like
 *     case_ref. The status enum is lowercase here; requirement-client.ts maps it
 *     to/from the Capitalized frontend RequirementStatus.
 *   - linkRequirementToCase is idempotent (upsert-safe): a re-link of an
 *     already-linked (case, requirement) pair is a no-op, not a duplicate-key
 *     error. Unlink is NOT implemented — the Requirements/Cases UI has no unlink
 *     action today (not getting ahead of the screen).
 *   - ref_counters is created by the seed script, not a Drizzle migration — same
 *     pre-existing gap TestCaseService documents.
 */

import { and, eq, inArray } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import {
  caseRequirements,
  projects,
  requirements,
  testCases,
  type NewCaseRequirement,
  type NewRequirement,
} from '../schema'
import { db } from '../src/index'
import { logger } from '../src/logger'
import { assertMinProjectRole } from '../src/rbac/assert-min-role'
import { createId } from '../src/utils/id'
import { recordAudit } from './AuditService'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RequirementStatus = 'draft' | 'approved' | 'implemented' | 'obsolete'

export interface RequirementSummary {
  id: string
  requirementRef: string
  projectId: string
  title: string
  description: string | null
  status: RequirementStatus
  createdBy: string | null
  createdAt: Date
  updatedAt: Date
}

export interface ListRequirementsInput {
  actorId: string
  projectId: string
}

export interface CreateRequirementInput {
  actorId: string
  projectId: string
  title: string
  description?: string | null
  status?: RequirementStatus
}

export interface LinkRequirementInput {
  actorId: string
  projectId: string
  caseId: string
  requirementId: string
}

export interface LinkRequirementResult {
  testCaseId: string
  requirementId: string
  /** false when the link already existed (idempotent re-link). */
  created: boolean
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type RequirementServiceErrorCode =
  | 'PROJECT_NOT_FOUND'
  | 'CASE_NOT_FOUND'
  | 'REQUIREMENT_NOT_FOUND'
  | 'DUPLICATE_REQUIREMENT_REF'
  | 'REF_COUNTER_TIMEOUT'
  | 'TRANSACTION_FAILED'

export class RequirementServiceError extends Error {
  constructor(
    message: string,
    public readonly code: RequirementServiceErrorCode,
  ) {
    super(message)
    this.name = 'RequirementServiceError'
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
    throw new RequirementServiceError('Project not found.', 'PROJECT_NOT_FOUND')
  }
}

/**
 * Atomically generate the next requirement_ref for a project. Mirrors
 * TestCaseService.generateCaseRef() exactly, but for entity_type='requirement'
 * and the unpadded 'REQ-<n>' format. Must be called inside a db.transaction().
 */
async function generateRequirementRef(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  projectId: string,
): Promise<string> {
  await tx.execute(sql`
    INSERT INTO ref_counters (project_id, entity_type, next_value)
    VALUES (${projectId}, 'requirement', 1)
    ON DUPLICATE KEY UPDATE next_value = next_value + 0
  `)

  const counterResult = await tx.execute(sql`
    SELECT next_value
    FROM ref_counters
    WHERE project_id = ${projectId} AND entity_type = 'requirement'
    FOR UPDATE
  `)

  const rows = counterResult[0] as unknown as Array<{ next_value: number }>
  const counterRow = rows[0]

  if (!counterRow) {
    throw new RequirementServiceError(
      'Failed to initialise ref counter — counter row missing.',
      'REF_COUNTER_TIMEOUT',
    )
  }

  const currentRef = counterRow.next_value

  await tx.execute(sql`
    UPDATE ref_counters
    SET next_value = next_value + 1
    WHERE project_id = ${projectId} AND entity_type = 'requirement'
  `)

  return `REQ-${currentRef}`
}

function toRequirementSummary(row: typeof requirements.$inferSelect): RequirementSummary {
  return {
    id: row.id,
    requirementRef: row.requirementRef,
    projectId: row.projectId,
    title: row.title,
    description: row.description,
    status: row.status as RequirementStatus,
    createdBy: row.createdBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/**
 * Batch-load requirement ids linked to a set of case ids, grouped by case id
 * and ordered oldest-link-first. One query for the whole set (no N+1) — used by
 * TestCaseService.listCases()/getCase() to attach requirementIds to each case.
 */
export async function loadRequirementIdsByCase(
  caseIds: string[],
): Promise<Map<string, string[]>> {
  const byCase = new Map<string, string[]>()
  if (caseIds.length === 0) return byCase
  const rows = await db
    .select({
      testCaseId: caseRequirements.testCaseId,
      requirementId: caseRequirements.requirementId,
    })
    .from(caseRequirements)
    .where(inArray(caseRequirements.testCaseId, caseIds))
    .orderBy(caseRequirements.createdAt)
  for (const r of rows) {
    const list = byCase.get(r.testCaseId) ?? []
    list.push(r.requirementId)
    byCase.set(r.testCaseId, list)
  }
  return byCase
}

// ---------------------------------------------------------------------------
// Requirements — reads
// ---------------------------------------------------------------------------

export async function listRequirements(
  input: ListRequirementsInput,
): Promise<RequirementSummary[]> {
  const { actorId, projectId } = input
  await assertProjectExists(projectId)
  await assertMinProjectRole(actorId, projectId, 'viewer')

  const rows = await db
    .select()
    .from(requirements)
    .where(eq(requirements.projectId, projectId))
    .orderBy(requirements.requirementRef)

  return rows.map(toRequirementSummary)
}

// ---------------------------------------------------------------------------
// Requirements — writes
// ---------------------------------------------------------------------------

export async function createRequirement(
  input: CreateRequirementInput,
): Promise<RequirementSummary> {
  const { actorId, projectId, title, description, status = 'draft' } = input

  await assertProjectExists(projectId)
  await assertMinProjectRole(actorId, projectId, 'contributor')

  const newRequirementId = createId()

  let requirementRef: string
  try {
    requirementRef = await db.transaction(async (tx) => {
      const ref = await generateRequirementRef(tx, projectId)

      const newRow: NewRequirement = {
        id: newRequirementId,
        requirementRef: ref,
        projectId,
        title,
        description: description ?? null,
        status,
        createdBy: actorId,
      }
      await tx.insert(requirements).values(newRow)

      await recordAudit(
        {
          projectId,
          entityType: 'requirement',
          entityId: newRequirementId,
          action: 'requirement.created',
          actorId,
          newValue: { requirementRef: ref, title, status },
        },
        tx,
      )

      return ref
    })
  } catch (err: unknown) {
    if (isLockTimeoutError(err)) {
      throw new RequirementServiceError(
        'Timed out acquiring the requirement reference counter lock. Try again.',
        'REF_COUNTER_TIMEOUT',
      )
    }
    if (isDuplicateKeyError(err)) {
      throw new RequirementServiceError(
        'Duplicate requirement reference conflict. Try again.',
        'DUPLICATE_REQUIREMENT_REF',
      )
    }
    const message = err instanceof Error ? err.message : String(err)
    logger.error('[RequirementService] createRequirement transaction failed', {
      projectId,
      error: message,
    })
    throw new RequirementServiceError(
      `Requirement creation failed: ${message}`,
      'TRANSACTION_FAILED',
    )
  }

  logger.info('[RequirementService] requirement created', {
    requirementId: newRequirementId,
    requirementRef,
    projectId,
  })

  return {
    id: newRequirementId,
    requirementRef,
    projectId,
    title,
    description: description ?? null,
    status,
    createdBy: actorId,
    createdAt: new Date(),
    updatedAt: new Date(),
  }
}

/**
 * Link a requirement to a test case. Both must belong to `projectId`. Idempotent
 * (upsert-safe): if the (case, requirement) pair is already linked, this is a
 * no-op returning `created: false` rather than a duplicate-key error. Audits
 * `requirement.linked` only when a new row is actually inserted.
 */
export async function linkRequirementToCase(
  input: LinkRequirementInput,
): Promise<LinkRequirementResult> {
  const { actorId, projectId, caseId, requirementId } = input

  await assertProjectExists(projectId)
  await assertMinProjectRole(actorId, projectId, 'contributor')

  const [existingCase] = await db
    .select({ id: testCases.id })
    .from(testCases)
    .where(and(eq(testCases.id, caseId), eq(testCases.projectId, projectId)))
    .limit(1)
  if (!existingCase) {
    throw new RequirementServiceError('Test case not found.', 'CASE_NOT_FOUND')
  }

  const [existingReq] = await db
    .select({ id: requirements.id })
    .from(requirements)
    .where(and(eq(requirements.id, requirementId), eq(requirements.projectId, projectId)))
    .limit(1)
  if (!existingReq) {
    throw new RequirementServiceError('Requirement not found.', 'REQUIREMENT_NOT_FOUND')
  }

  const [alreadyLinked] = await db
    .select({ id: caseRequirements.id })
    .from(caseRequirements)
    .where(
      and(
        eq(caseRequirements.testCaseId, caseId),
        eq(caseRequirements.requirementId, requirementId),
      ),
    )
    .limit(1)
  if (alreadyLinked) {
    return { testCaseId: caseId, requirementId, created: false }
  }

  try {
    await db.transaction(async (tx) => {
      const link: NewCaseRequirement = {
        id: createId(),
        testCaseId: caseId,
        requirementId,
      }
      await tx.insert(caseRequirements).values(link)

      await recordAudit(
        {
          projectId,
          entityType: 'requirement',
          entityId: requirementId,
          action: 'requirement.linked',
          actorId,
          newValue: { testCaseId: caseId, requirementId },
        },
        tx,
      )
    })
  } catch (err: unknown) {
    // A concurrent link of the same pair races past the pre-check above and
    // hits the UNIQUE constraint — treat as the idempotent no-op it is.
    if (isDuplicateKeyError(err)) {
      return { testCaseId: caseId, requirementId, created: false }
    }
    const message = err instanceof Error ? err.message : String(err)
    logger.error('[RequirementService] linkRequirementToCase transaction failed', {
      caseId,
      requirementId,
      error: message,
    })
    throw new RequirementServiceError(
      `Requirement link failed: ${message}`,
      'TRANSACTION_FAILED',
    )
  }

  logger.info('[RequirementService] requirement linked to case', {
    caseId,
    requirementId,
    projectId,
  })

  return { testCaseId: caseId, requirementId, created: true }
}
