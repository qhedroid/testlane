/**
 * ExecutionService — case-level result recording within test runs.
 *
 * Mutates only result columns on test_run_cases. Snapshot columns are never updated.
 */

import { and, eq } from 'drizzle-orm'
import {
  auditLog,
  runCaseEvents,
  runCaseStepSnapshots,
  runStepResults,
  testRunCases,
  testRuns,
  type NewAuditLog,
} from '../schema'
import {
  assertMinProjectRole,
  InsufficientPermissionsError,
} from '../src/rbac/assert-min-role'
import { db } from '../src/index'
import { createId } from '../src/utils/id'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Canonical DB status values (schema enum). */
export type CaseResultStatus = 'not_run' | 'pass' | 'fail' | 'blocked' | 'skip'

/** Input status accepts `skipped` as alias for `skip`. */
export type CaseResultStatusInput = CaseResultStatus | 'skipped'

export interface UpdateCaseResultInput {
  projectId: string
  testRunId: string
  testRunCaseId: string
  actorId: string
  status: CaseResultStatusInput
  /** When omitted, existing comment is left unchanged. Pass null to clear. */
  comment?: string | null
}

export interface UpdateCaseResultResult {
  testRunCaseId: string
  testRunId: string
  projectId: string
  status: CaseResultStatus
  comment: string | null
  executedBy: string | null
  executedAt: Date | null
  updatedAt: Date
}

export type UpdateCaseResultErrorCode =
  | 'INSUFFICIENT_PERMISSIONS'
  | 'RUN_NOT_FOUND'
  | 'CASE_NOT_FOUND'
  | 'STEP_NOT_FOUND'
  | 'RUN_NOT_EXECUTABLE'
  | 'INVALID_STATUS'
  | 'TRANSACTION_FAILED'

export class UpdateCaseResultError extends Error {
  constructor(
    message: string,
    public readonly code: UpdateCaseResultErrorCode,
  ) {
    super(message)
    this.name = 'UpdateCaseResultError'
  }
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const VALID_STATUSES: CaseResultStatus[] = [
  'not_run',
  'pass',
  'fail',
  'blocked',
  'skip',
]

function normalizeStatus(status: CaseResultStatusInput): CaseResultStatus {
  if (status === 'skipped') return 'skip'
  if (!VALID_STATUSES.includes(status as CaseResultStatus)) {
    throw new UpdateCaseResultError(
      `Invalid status: ${status}`,
      'INVALID_STATUS',
    )
  }
  return status as CaseResultStatus
}

// ---------------------------------------------------------------------------
// updateCaseResult
// ---------------------------------------------------------------------------

/**
 * Update the execution result on a test_run_cases row.
 *
 * Preconditions (Phase 1 — outside transaction):
 *   - Actor has contributor, admin, or super_admin effective role
 *   - Run exists in project and status is `active`
 *   - Run case belongs to the run
 *
 * Transaction (Phase 2):
 *   - UPDATE result fields only (status, comment, executed_by, executed_at, updated_at)
 *   - INSERT audit_log (`result.updated`)
 */
export async function updateCaseResult(
  input: UpdateCaseResultInput,
): Promise<UpdateCaseResultResult> {
  const { projectId, testRunId, testRunCaseId, actorId, comment } = input
  const status = normalizeStatus(input.status)

  // ── RBAC: contributor or above ───────────────────────────────────────────
  try {
    await assertMinProjectRole(actorId, projectId, 'contributor')
  } catch (err) {
    if (err instanceof InsufficientPermissionsError) {
      throw new UpdateCaseResultError(
        'Insufficient permissions: contributor or above required to update results.',
        'INSUFFICIENT_PERMISSIONS',
      )
    }
    throw err
  }

  // ── Load run ───────────────────────────────────────────────────────────────
  const [run] = await db
    .select({
      id: testRuns.id,
      status: testRuns.status,
      runRef: testRuns.runRef,
    })
    .from(testRuns)
    .where(and(eq(testRuns.id, testRunId), eq(testRuns.projectId, projectId)))
    .limit(1)

  if (!run) {
    throw new UpdateCaseResultError(
      `Test run not found: ${testRunId}`,
      'RUN_NOT_FOUND',
    )
  }

  if (run.status !== 'active') {
    throw new UpdateCaseResultError(
      `Cannot update results on run with status '${run.status}'. Only active runs accept result changes.`,
      'RUN_NOT_EXECUTABLE',
    )
  }

  // ── Load run case (snapshot + current result for audit) ────────────────────
  const [runCase] = await db
    .select({
      id: testRunCases.id,
      testRunId: testRunCases.testRunId,
      snapshotCaseRef: testRunCases.snapshotCaseRef,
      snapshotTitle: testRunCases.snapshotTitle,
      snapshotPriority: testRunCases.snapshotPriority,
      status: testRunCases.status,
      comment: testRunCases.comment,
      executedBy: testRunCases.executedBy,
      executedAt: testRunCases.executedAt,
    })
    .from(testRunCases)
    .where(
      and(
        eq(testRunCases.id, testRunCaseId),
        eq(testRunCases.testRunId, testRunId),
      ),
    )
    .limit(1)

  if (!runCase) {
    throw new UpdateCaseResultError(
      `Test run case not found: ${testRunCaseId}`,
      'CASE_NOT_FOUND',
    )
  }

  const executedAt = status === 'not_run' ? null : new Date()
  const executedBy = status === 'not_run' ? null : actorId

  const resultFields: {
    status: CaseResultStatus
    executedBy: string | null
    executedAt: Date | null
    comment?: string | null
  } = {
    status,
    executedBy,
    executedAt,
  }

  if (comment !== undefined) {
    resultFields.comment = comment
  }

  const oldValue = {
    status: runCase.status,
    comment: runCase.comment,
    executedBy: runCase.executedBy,
    executedAt: runCase.executedAt,
  }

  const newValue = {
    status,
    comment: comment !== undefined ? comment : runCase.comment,
    executedBy,
    executedAt,
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .update(testRunCases)
        .set(resultFields)
        .where(eq(testRunCases.id, testRunCaseId))

      // Append-only transition log (new-tables candidate, Phase B). Only a
      // genuine status change is a transition — comment-only edits don't log.
      // Feeds DemoRun.executionLog (via listProjectRuns.events) and the
      // dashboard trend counts.
      if (status !== runCase.status) {
        await tx.insert(runCaseEvents).values({
          id: createId(),
          testRunCaseId,
          actorId,
          event: 'result',
          fromStatus: runCase.status,
          toStatus: status,
          at: new Date(),
        })
      }

      const auditRow: NewAuditLog = {
        id: createId(),
        projectId,
        entityType: 'test_run_case',
        entityId: testRunCaseId,
        action: 'result.updated',
        actorId,
        oldValue,
        newValue,
        metadata: {
          testRunId,
          runRef: run.runRef,
          snapshotCaseRef: runCase.snapshotCaseRef,
          snapshotTitle: runCase.snapshotTitle,
        },
      }

      await tx.insert(auditLog).values(auditRow)
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new UpdateCaseResultError(
      `Failed to update case result: ${message}`,
      'TRANSACTION_FAILED',
    )
  }

  const [updated] = await db
    .select({
      status: testRunCases.status,
      comment: testRunCases.comment,
      executedBy: testRunCases.executedBy,
      executedAt: testRunCases.executedAt,
      updatedAt: testRunCases.updatedAt,
    })
    .from(testRunCases)
    .where(eq(testRunCases.id, testRunCaseId))
    .limit(1)

  return {
    testRunCaseId,
    testRunId,
    projectId,
    status: updated.status as CaseResultStatus,
    comment: updated.comment,
    executedBy: updated.executedBy,
    executedAt: updated.executedAt,
    updatedAt: updated.updatedAt,
  }
}

// ---------------------------------------------------------------------------
// updateStepResult — per-step result recording (new-tables candidate, Phase A)
// ---------------------------------------------------------------------------

export interface UpdateStepResultInput {
  projectId: string
  testRunId: string
  testRunCaseId: string
  /** run_case_step_snapshots.id — the immutable per-step snapshot row. */
  stepSnapshotId: string
  actorId: string
  status: CaseResultStatusInput
  /** When omitted, existing comment is left unchanged. Pass null to clear. */
  comment?: string | null
}

export interface UpdateStepResultResult {
  id: string
  testRunCaseId: string
  stepSnapshotId: string
  status: CaseResultStatus
  comment: string | null
  executedBy: string | null
  executedAt: Date | null
  updatedAt: Date
}

/**
 * Upsert a per-step execution result on a run_step_results row.
 *
 * Mirrors updateCaseResult's structure: contributor+ RBAC, load run (assert
 * active), load run case, validate the step snapshot belongs to that run case,
 * then a transaction that UPSERTs the step result (via the unique
 * (test_run_case_id, step_snapshot_id) constraint) and inserts an audit_log
 * row (`step_result.updated`).
 *
 * Step results are informational — they do not auto-aggregate into the
 * case-level status (see run_step_results notes in schema.ts).
 */
export async function updateStepResult(
  input: UpdateStepResultInput,
): Promise<UpdateStepResultResult> {
  const { projectId, testRunId, testRunCaseId, stepSnapshotId, actorId, comment } =
    input
  const status = normalizeStatus(input.status)

  // ── RBAC: contributor or above ───────────────────────────────────────────
  try {
    await assertMinProjectRole(actorId, projectId, 'contributor')
  } catch (err) {
    if (err instanceof InsufficientPermissionsError) {
      throw new UpdateCaseResultError(
        'Insufficient permissions: contributor or above required to update results.',
        'INSUFFICIENT_PERMISSIONS',
      )
    }
    throw err
  }

  // ── Load run ───────────────────────────────────────────────────────────────
  const [run] = await db
    .select({
      id: testRuns.id,
      status: testRuns.status,
      runRef: testRuns.runRef,
    })
    .from(testRuns)
    .where(and(eq(testRuns.id, testRunId), eq(testRuns.projectId, projectId)))
    .limit(1)

  if (!run) {
    throw new UpdateCaseResultError(
      `Test run not found: ${testRunId}`,
      'RUN_NOT_FOUND',
    )
  }

  if (run.status !== 'active') {
    throw new UpdateCaseResultError(
      `Cannot update results on run with status '${run.status}'. Only active runs accept result changes.`,
      'RUN_NOT_EXECUTABLE',
    )
  }

  // ── Load run case ────────────────────────────────────────────────────────
  const [runCase] = await db
    .select({
      id: testRunCases.id,
      testRunId: testRunCases.testRunId,
      snapshotCaseRef: testRunCases.snapshotCaseRef,
      snapshotTitle: testRunCases.snapshotTitle,
    })
    .from(testRunCases)
    .where(
      and(
        eq(testRunCases.id, testRunCaseId),
        eq(testRunCases.testRunId, testRunId),
      ),
    )
    .limit(1)

  if (!runCase) {
    throw new UpdateCaseResultError(
      `Test run case not found: ${testRunCaseId}`,
      'CASE_NOT_FOUND',
    )
  }

  // ── Validate the step snapshot belongs to this run case ────────────────────
  const [snapshot] = await db
    .select({
      id: runCaseStepSnapshots.id,
      position: runCaseStepSnapshots.position,
    })
    .from(runCaseStepSnapshots)
    .where(
      and(
        eq(runCaseStepSnapshots.id, stepSnapshotId),
        eq(runCaseStepSnapshots.testRunCaseId, testRunCaseId),
      ),
    )
    .limit(1)

  if (!snapshot) {
    throw new UpdateCaseResultError(
      `Step snapshot not found on run case: ${stepSnapshotId}`,
      'STEP_NOT_FOUND',
    )
  }

  // ── Existing step result (for the audit oldValue) ──────────────────────────
  const [existing] = await db
    .select({
      status: runStepResults.status,
      comment: runStepResults.comment,
      executedBy: runStepResults.executedBy,
      executedAt: runStepResults.executedAt,
    })
    .from(runStepResults)
    .where(
      and(
        eq(runStepResults.testRunCaseId, testRunCaseId),
        eq(runStepResults.stepSnapshotId, stepSnapshotId),
      ),
    )
    .limit(1)

  const executedAt = status === 'not_run' ? null : new Date()
  const executedBy = status === 'not_run' ? null : actorId

  const updateSet: {
    status: CaseResultStatus
    executedBy: string | null
    executedAt: Date | null
    comment?: string | null
  } = {
    status,
    executedBy,
    executedAt,
  }
  if (comment !== undefined) {
    updateSet.comment = comment
  }

  const oldValue = existing
    ? {
        status: existing.status,
        comment: existing.comment,
        executedBy: existing.executedBy,
        executedAt: existing.executedAt,
      }
    : null

  const newValue = {
    status,
    comment: comment !== undefined ? comment : (existing?.comment ?? null),
    executedBy,
    executedAt,
  }

  try {
    await db.transaction(async (tx) => {
      await tx
        .insert(runStepResults)
        .values({
          id: createId(),
          testRunCaseId,
          stepSnapshotId,
          status,
          comment: comment !== undefined ? comment : null,
          executedBy,
          executedAt,
        })
        .onDuplicateKeyUpdate({ set: updateSet })

      const auditRow: NewAuditLog = {
        id: createId(),
        projectId,
        entityType: 'run_step_result',
        entityId: stepSnapshotId,
        action: 'step_result.updated',
        actorId,
        oldValue,
        newValue,
        metadata: {
          testRunId,
          runRef: run.runRef,
          testRunCaseId,
          stepSnapshotId,
          snapshotCaseRef: runCase.snapshotCaseRef,
          position: snapshot.position,
        },
      }

      await tx.insert(auditLog).values(auditRow)
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    throw new UpdateCaseResultError(
      `Failed to update step result: ${message}`,
      'TRANSACTION_FAILED',
    )
  }

  const [updated] = await db
    .select({
      id: runStepResults.id,
      status: runStepResults.status,
      comment: runStepResults.comment,
      executedBy: runStepResults.executedBy,
      executedAt: runStepResults.executedAt,
      updatedAt: runStepResults.updatedAt,
    })
    .from(runStepResults)
    .where(
      and(
        eq(runStepResults.testRunCaseId, testRunCaseId),
        eq(runStepResults.stepSnapshotId, stepSnapshotId),
      ),
    )
    .limit(1)

  return {
    id: updated.id,
    testRunCaseId,
    stepSnapshotId,
    status: updated.status as CaseResultStatus,
    comment: updated.comment,
    executedBy: updated.executedBy,
    executedAt: updated.executedAt,
    updatedAt: updated.updatedAt,
  }
}
