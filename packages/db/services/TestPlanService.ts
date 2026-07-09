/**
 * TestPlanService.ts
 * Relay — Service layer
 *
 * Test Plans (Phase 3 of mvp-backend). Modeled on TestCaseService.ts's shape
 * (assertMinProjectRole() for RBAC, a typed XxxServiceError, ref_counters-based
 * ref generation via db.transaction).
 *
 * Deliberate scope decision (see docs/claude/handoff.md for the full write-up
 * — flagged here so it isn't silently re-derived or contradicted later):
 *
 *   The frontend prototype's TestPlan (apps/web/src/fresh/data/demo-model.ts)
 *   is a dynamic, query-based model: a plan stores `queries: TestQuery[]`
 *   (condition / folder / static groups) and its case list is recomputed live
 *   via resolvePlanCases() every time it's needed. The real DB schema has NO
 *   equivalent storage for TestQuery/QueryCondition data — test_plans only
 *   relates to cases via test_plan_cases, a plain static join table with a
 *   `position` column. This isn't an oversight: TestRunService.createRun()
 *   (already implemented, Phase 0) already hard-depends on test_plan_cases
 *   being pre-populated at spawn time — it has zero awareness of dynamic
 *   queries. So this service deliberately only supports the static-list model:
 *   a plan's case membership is whatever's in test_plan_cases at any given
 *   moment, set explicitly via setPlanCases(). Whether/how to support
 *   query-based dynamic plans server-side (e.g. a future test_plan_queries
 *   table) is an open question for whoever wires PlansScreen.tsx — noted in
 *   docs/claude/known-bugs.md so it isn't lost.
 *
 *   Plan ref format: 'PLAN-' + zero-padded 3-digit number (e.g. 'PLAN-001'),
 *   matching the seed data's existing convention exactly (unlike Phase 2's
 *   case refs, which deliberately used the seed's unpadded convention instead
 *   — the two entity types simply have different existing conventions).
 *
 *   "Delete" = archive (status = 'archived'). test_plans already has a
 *   3-value status enum (draft/active/archived) — no separate is_archived
 *   flag needed, unlike test_cases.
 */

import { and, eq, inArray, ne, sql } from 'drizzle-orm'
import {
  projects,
  testCases,
  testPlanCases,
  testPlans,
  type NewTestPlan,
  type NewTestPlanCase,
} from '../schema'
import { db } from '../src/index'
import { logger } from '../src/logger'
import { assertMinProjectRole } from '../src/rbac/assert-min-role'
import { createId } from '../src/utils/id'
import { recordAudit } from './AuditService'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type PlanStatus = 'draft' | 'active' | 'archived'

export interface PlanSummary {
  id: string
  planRef: string
  projectId: string
  title: string
  description: string | null
  status: PlanStatus
  environment: string | null
  ownerId: string | null
  assigneeIds: string[]
  createdBy: string | null
  caseCount: number
  createdAt: Date
  updatedAt: Date
}

export interface PlanCaseRow {
  testCaseId: string
  caseRef: string
  title: string
  position: number
}

export interface PlanDetail extends PlanSummary {
  cases: PlanCaseRow[]
}

/** listPlans() row: summary + ordered member case ids (see listPlans docs). */
export interface PlanListItem extends PlanSummary {
  caseIds: string[]
}

export interface CreatePlanInput {
  actorId: string
  projectId: string
  title: string
  description?: string
  environment?: string
  ownerId?: string
  assigneeIds?: string[]
  caseIds?: string[]
}

export interface UpdatePlanInput {
  actorId: string
  projectId: string
  planId: string
  patch: Partial<{
    title: string
    description: string | null
    status: PlanStatus
    environment: string | null
    ownerId: string | null
    assigneeIds: string[]
  }>
}

export interface SetPlanCasesInput {
  actorId: string
  projectId: string
  planId: string
  caseIds: string[]
}

export interface ArchivePlanInput {
  actorId: string
  projectId: string
  planId: string
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type TestPlanServiceErrorCode =
  | 'PROJECT_NOT_FOUND'
  | 'PLAN_NOT_FOUND'
  | 'CASES_UNAVAILABLE'
  | 'DUPLICATE_PLAN_REF'
  | 'REF_COUNTER_TIMEOUT'
  | 'TRANSACTION_FAILED'

export class TestPlanServiceError extends Error {
  constructor(
    message: string,
    public readonly code: TestPlanServiceErrorCode,
  ) {
    super(message)
    this.name = 'TestPlanServiceError'
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
    throw new TestPlanServiceError('Project not found.', 'PROJECT_NOT_FOUND')
  }
}

/**
 * Atomically generate the next plan_ref for a project. Mirrors
 * TestCaseService.generateCaseRef() / TestRunService.generateRunRef(), but
 * for entity_type='plan' and the zero-padded 'PLAN-<nnn>' format (matches the
 * seed data's existing PLAN-001 convention — see file header for why this
 * differs from Phase 2's unpadded case-ref choice).
 */
async function generatePlanRef(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  projectId: string,
): Promise<string> {
  await tx.execute(sql`
    INSERT INTO ref_counters (project_id, entity_type, next_value)
    VALUES (${projectId}, 'plan', 1)
    ON DUPLICATE KEY UPDATE next_value = next_value + 0
  `)

  const counterResult = await tx.execute(sql`
    SELECT next_value
    FROM ref_counters
    WHERE project_id = ${projectId} AND entity_type = 'plan'
    FOR UPDATE
  `)

  const rows = counterResult[0] as unknown as Array<{ next_value: number }>
  const counterRow = rows[0]

  if (!counterRow) {
    throw new TestPlanServiceError(
      'Failed to initialise ref counter — counter row missing.',
      'REF_COUNTER_TIMEOUT',
    )
  }

  const currentRef = counterRow.next_value

  await tx.execute(sql`
    UPDATE ref_counters
    SET next_value = next_value + 1
    WHERE project_id = ${projectId} AND entity_type = 'plan'
  `)

  return `PLAN-${String(currentRef).padStart(3, '0')}`
}

function toPlanSummary(row: typeof testPlans.$inferSelect, caseCount: number): PlanSummary {
  return {
    id: row.id,
    planRef: row.planRef,
    projectId: row.projectId,
    title: row.title,
    description: row.description,
    status: row.status as PlanStatus,
    environment: row.environment,
    ownerId: row.ownerId,
    assigneeIds: (row.assigneeIds as string[]) ?? [],
    createdBy: row.createdBy,
    caseCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

/** Insert test_plan_cases rows for a set of case ids, in the given order, starting at position 0. */
async function insertPlanCaseRows(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  planId: string,
  caseIds: string[],
  addedBy: string,
): Promise<void> {
  if (caseIds.length === 0) return
  const rows: NewTestPlanCase[] = caseIds.map((testCaseId, i) => ({
    id: createId(),
    testPlanId: planId,
    testCaseId,
    position: i,
    addedBy,
  }))
  await tx.insert(testPlanCases).values(rows)
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

/**
 * List a project's non-archived plans, each with its ordered member case ids.
 * Changed during the Plans screen-wiring pass: (1) archived plans are
 * excluded — the frontend's deletePlan() removes plans from view, so archived
 * ones reappearing on every sync would look like failed deletes; (2) caseIds
 * are included so the frontend can synthesize its static query group without
 * an N+1 getPlan() per plan on every project load (same reasoning as
 * TestCaseService.listCases() returning full details).
 */
export async function listPlans(actorId: string, projectId: string): Promise<PlanListItem[]> {
  await assertProjectExists(projectId)
  await assertMinProjectRole(actorId, projectId, 'viewer')

  const rows = await db
    .select()
    .from(testPlans)
    .where(and(eq(testPlans.projectId, projectId), ne(testPlans.status, 'archived')))
  if (rows.length === 0) return []

  const pcRows = await db
    .select({
      testPlanId: testPlanCases.testPlanId,
      testCaseId: testPlanCases.testCaseId,
    })
    .from(testPlanCases)
    .where(
      inArray(
        testPlanCases.testPlanId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(testPlanCases.position)
  const caseIdsByPlan = new Map<string, string[]>()
  for (const pc of pcRows) {
    const list = caseIdsByPlan.get(pc.testPlanId) ?? []
    list.push(pc.testCaseId)
    caseIdsByPlan.set(pc.testPlanId, list)
  }

  return rows.map((row) => {
    const caseIds = caseIdsByPlan.get(row.id) ?? []
    return { ...toPlanSummary(row, caseIds.length), caseIds }
  })
}

export async function getPlan(
  actorId: string,
  projectId: string,
  planId: string,
): Promise<PlanDetail> {
  await assertProjectExists(projectId)
  await assertMinProjectRole(actorId, projectId, 'viewer')

  const [row] = await db
    .select()
    .from(testPlans)
    .where(and(eq(testPlans.id, planId), eq(testPlans.projectId, projectId)))
    .limit(1)

  if (!row) {
    throw new TestPlanServiceError('Test plan not found.', 'PLAN_NOT_FOUND')
  }

  const caseRows = await db
    .select({
      testCaseId: testPlanCases.testCaseId,
      position: testPlanCases.position,
      caseRef: testCases.caseRef,
      title: testCases.title,
    })
    .from(testPlanCases)
    .innerJoin(testCases, eq(testCases.id, testPlanCases.testCaseId))
    .where(eq(testPlanCases.testPlanId, planId))
    .orderBy(testPlanCases.position)

  return {
    ...toPlanSummary(row, caseRows.length),
    cases: caseRows,
  }
}

// ---------------------------------------------------------------------------
// Writes
// ---------------------------------------------------------------------------

export async function createPlan(input: CreatePlanInput): Promise<PlanDetail> {
  const {
    actorId,
    projectId,
    title,
    description,
    environment,
    ownerId,
    assigneeIds = [],
    caseIds = [],
  } = input

  await assertProjectExists(projectId)
  await assertMinProjectRole(actorId, projectId, 'contributor')

  if (caseIds.length > 0) {
    const existing = await db
      .select({ id: testCases.id })
      .from(testCases)
      .where(and(eq(testCases.projectId, projectId), inArray(testCases.id, caseIds)))
    if (existing.length !== caseIds.length) {
      throw new TestPlanServiceError(
        'One or more case IDs do not belong to this project.',
        'CASES_UNAVAILABLE',
      )
    }
  }

  const newPlanId = createId()

  try {
    await db.transaction(async (tx) => {
      const ref = await generatePlanRef(tx, projectId)

      const newPlan: NewTestPlan = {
        id: newPlanId,
        planRef: ref,
        projectId,
        title,
        description: description ?? null,
        status: 'draft',
        environment: environment ?? null,
        ownerId: ownerId ?? actorId,
        createdBy: actorId,
        assigneeIds,
      }
      await tx.insert(testPlans).values(newPlan)

      await insertPlanCaseRows(tx, newPlanId, caseIds, actorId)

      await recordAudit(
        {
          projectId,
          entityType: 'test_plan',
          entityId: newPlanId,
          action: 'plan.created',
          actorId,
          newValue: { planRef: ref, title, environment: environment ?? null, caseCount: caseIds.length },
        },
        tx,
      )
    })
  } catch (err: unknown) {
    if (isLockTimeoutError(err)) {
      throw new TestPlanServiceError(
        'Timed out acquiring the plan reference counter lock. Try again.',
        'REF_COUNTER_TIMEOUT',
      )
    }
    if (isDuplicateKeyError(err)) {
      throw new TestPlanServiceError('Duplicate plan reference conflict. Try again.', 'DUPLICATE_PLAN_REF')
    }
    const message = err instanceof Error ? err.message : String(err)
    logger.error('[TestPlanService] createPlan transaction failed', { projectId, error: message })
    throw new TestPlanServiceError(`Plan creation failed: ${message}`, 'TRANSACTION_FAILED')
  }

  return getPlan(actorId, projectId, newPlanId)
}

export async function updatePlan(input: UpdatePlanInput): Promise<PlanDetail> {
  const { actorId, projectId, planId, patch } = input
  await assertProjectExists(projectId)
  await assertMinProjectRole(actorId, projectId, 'contributor')

  const [existing] = await db
    .select({ id: testPlans.id })
    .from(testPlans)
    .where(and(eq(testPlans.id, planId), eq(testPlans.projectId, projectId)))
    .limit(1)
  if (!existing) {
    throw new TestPlanServiceError('Test plan not found.', 'PLAN_NOT_FOUND')
  }

  if (Object.keys(patch).length > 0) {
    await db.update(testPlans).set(patch).where(eq(testPlans.id, planId))

    await recordAudit({
      projectId,
      entityType: 'test_plan',
      entityId: planId,
      action: 'plan.updated',
      actorId,
      newValue: patch,
    })
  }

  return getPlan(actorId, projectId, planId)
}

/**
 * Replace a plan's case membership wholesale (delete + reinsert in the given
 * order). This is the server-side equivalent of the frontend's
 * updatePlan(id, { queries }) — since the server has no query concept (see
 * file header), the caller is responsible for resolving the desired case
 * list before calling this.
 */
export async function setPlanCases(input: SetPlanCasesInput): Promise<PlanDetail> {
  const { actorId, projectId, planId, caseIds } = input
  await assertProjectExists(projectId)
  await assertMinProjectRole(actorId, projectId, 'contributor')

  const [existing] = await db
    .select({ id: testPlans.id })
    .from(testPlans)
    .where(and(eq(testPlans.id, planId), eq(testPlans.projectId, projectId)))
    .limit(1)
  if (!existing) {
    throw new TestPlanServiceError('Test plan not found.', 'PLAN_NOT_FOUND')
  }

  if (caseIds.length > 0) {
    const validCases = await db
      .select({ id: testCases.id })
      .from(testCases)
      .where(and(eq(testCases.projectId, projectId), inArray(testCases.id, caseIds)))
    if (validCases.length !== caseIds.length) {
      throw new TestPlanServiceError(
        'One or more case IDs do not belong to this project.',
        'CASES_UNAVAILABLE',
      )
    }
  }

  try {
    await db.transaction(async (tx) => {
      await tx.delete(testPlanCases).where(eq(testPlanCases.testPlanId, planId))
      await insertPlanCaseRows(tx, planId, caseIds, actorId)

      await recordAudit(
        {
          projectId,
          entityType: 'test_plan',
          entityId: planId,
          action: 'plan.cases_set',
          actorId,
          newValue: { caseCount: caseIds.length },
        },
        tx,
      )
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('[TestPlanService] setPlanCases transaction failed', { planId, error: message })
    throw new TestPlanServiceError(`Setting plan cases failed: ${message}`, 'TRANSACTION_FAILED')
  }

  return getPlan(actorId, projectId, planId)
}

/** "Delete" = archive (status = 'archived'). See file header. */
export async function archivePlan(input: ArchivePlanInput): Promise<void> {
  const { actorId, projectId, planId } = input
  await assertProjectExists(projectId)
  await assertMinProjectRole(actorId, projectId, 'contributor')

  const [existing] = await db
    .select({ id: testPlans.id })
    .from(testPlans)
    .where(and(eq(testPlans.id, planId), eq(testPlans.projectId, projectId)))
    .limit(1)
  if (!existing) {
    throw new TestPlanServiceError('Test plan not found.', 'PLAN_NOT_FOUND')
  }

  await db.update(testPlans).set({ status: 'archived' }).where(eq(testPlans.id, planId))

  await recordAudit({
    projectId,
    entityType: 'test_plan',
    entityId: planId,
    action: 'plan.archived',
    actorId,
  })
}
