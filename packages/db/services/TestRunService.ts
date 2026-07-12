/**
 * TestRunService.ts
 * Relay — Service layer
 *
 * Responsible for:
 *   - Spawning test runs from test plans (createRun)
 *   - Run sealing / reopen / archive + metadata updates (updateRun — added
 *     in Phase 4 screen-wiring; a deliberately small status/title/due patch,
 *     not a general-purpose editor. Case membership is immutable after spawn
 *     by design — see test_run_cases snapshot invariants in schema.ts.)
 *
 * Dependencies (monorepo @relay/db package):
 *   db             — packages/db/src/index.ts
 *   opensearch     — packages/db/src/opensearch/client.ts (stub locally)
 *   createId       — packages/db/src/utils/id.ts
 *   logger         — packages/db/src/logger.ts
 */

import { and, desc, eq, inArray, sql } from 'drizzle-orm'
import {
  auditLog,
  folders,
  projectRoles,
  recentViews,
  runAssignees,
  runCaseEvents,
  runCaseStepSnapshots,
  testCaseSteps,
  testCases,
  testPlanCases,
  testPlans,
  testRunCases,
  testRuns,
  users,
  type NewAuditLog,
  type NewRunAssignee,
  type NewRunCaseEvent,
  type NewRunCaseStepSnapshot,
  type NewTestRunCase,
} from '../schema'
import { db } from '../src/index'
import { logger } from '../src/logger'
import { opensearchClient } from '../src/opensearch/client'
import { assertMinProjectRole } from '../src/rbac/assert-min-role'
import { createId } from '../src/utils/id'
import { recordAudit } from './AuditService'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CreateRunInput {
  /** ULID of the target project. */
  projectId: string
  /** ULID of the source test plan. Optional since the ad-hoc-runs change:
   * when omitted, `caseIds` is required and the run snapshots directly from
   * the live test cases (same snapshot mechanics, different source). */
  testPlanId?: string | null
  /** ULID of the user triggering the spawn. */
  createdBy: string
  /** Optional run title. Defaults to '{plan title} — {formatted date}'. */
  name?: string
  /** Optional environment override. Defaults to plan.environment. */
  environment?: string
  /** Optional free-text run description (new-tables candidate, Phase A). */
  description?: string | null
  /** Run-level assignee user IDs. Defaults to []. */
  assigneeIds?: string[]
  /**
   * Subset of plan case IDs to include.
   * If omitted or empty, all cases in the plan are included.
   */
  caseIds?: string[]
}

export interface CreateRunResult {
  id: string
  runRef: string
  title: string
  status: 'active'
  caseCount: number
  stepCount: number
  environment: string | null
  createdAt: Date
  testPlanId: string | null
  projectId: string
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class RunCreationError extends Error {
  constructor(
    message: string,
    public readonly code: RunCreationErrorCode,
  ) {
    super(message)
    this.name = 'RunCreationError'
  }
}

export type RunCreationErrorCode =
  | 'INSUFFICIENT_PERMISSIONS'
  | 'PLAN_NOT_FOUND'
  | 'PLAN_ARCHIVED'
  | 'PLAN_EMPTY'
  | 'CASES_NOT_IN_PLAN'
  | 'CASES_UNAVAILABLE'
  | 'INVALID_ASSIGNEES'
  | 'DUPLICATE_RUN_REF'
  | 'REF_COUNTER_TIMEOUT'
  | 'TRANSACTION_FAILED'

// ---------------------------------------------------------------------------
// Role hierarchy
// ---------------------------------------------------------------------------

const ROLE_LEVEL = {
  super_admin: 4,
  admin: 3,
  contributor: 2,
  viewer: 1,
} as const

type AnyRole = keyof typeof ROLE_LEVEL

// Minimum role level required to spawn a run (project admin or platform super_admin).
const SPAWN_REQUIRED_LEVEL = ROLE_LEVEL['admin']

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

/** Split an array into chunks of at most `size` elements. */
function chunkArray<T>(arr: T[], size: number): T[][] {
  const chunks: T[][] = []
  for (let i = 0; i < arr.length; i += size) {
    chunks.push(arr.slice(i, i + size))
  }
  return chunks
}

/**
 * Format a Date as a short human-readable label for default run titles.
 * e.g. "21 May 2026"
 */
function formatRunDate(d: Date): string {
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// Phase 1 helpers (outside transaction)
// ---------------------------------------------------------------------------

/**
 * Assert that the user has an effective role of admin or above in the project.
 * Effective role = max(global_role, project_role) in the role hierarchy.
 *
 * Throws RunCreationError('INSUFFICIENT_PERMISSIONS') if the check fails.
 */
async function assertSpawnAccess(
  actorId: string,
  projectId: string,
): Promise<void> {
  // Load the user's global role.
  const [user] = await db
    .select({ globalRole: users.globalRole, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, actorId))
    .limit(1)

  if (!user || !user.isActive) {
    throw new RunCreationError(
      'User not found or inactive.',
      'INSUFFICIENT_PERMISSIONS',
    )
  }

  const globalLevel = ROLE_LEVEL[user.globalRole as AnyRole] ?? 0

  // Super admin bypasses all further checks.
  if (globalLevel >= ROLE_LEVEL['super_admin']) return

  // Global role sufficient?
  if (globalLevel >= SPAWN_REQUIRED_LEVEL) return

  // Check for a project-level role override.
  const [projectRole] = await db
    .select({ role: projectRoles.role })
    .from(projectRoles)
    .where(
      and(eq(projectRoles.projectId, projectId), eq(projectRoles.userId, actorId)),
    )
    .limit(1)

  const projectLevel =
    projectRole ? (ROLE_LEVEL[projectRole.role as AnyRole] ?? 0) : 0

  const effectiveLevel = Math.max(globalLevel, projectLevel)

  if (effectiveLevel < SPAWN_REQUIRED_LEVEL) {
    throw new RunCreationError(
      'Insufficient permissions: admin or above required to spawn runs.',
      'INSUFFICIENT_PERMISSIONS',
    )
  }
}

// ---------------------------------------------------------------------------
// Phase 2 helpers (inside transaction)
// ---------------------------------------------------------------------------

/**
 * Atomically generate and reserve the next run_ref for a project.
 * Uses a SELECT FOR UPDATE on the ref_counters helper table.
 *
 * Returns the ref string, e.g. 'RUN-0042'.
 *
 * IMPORTANT: Must be called inside a db.transaction() callback.
 * The ref_counters table must exist (added in first migration, not in the
 * main 20-table schema).
 *
 * Concurrency: the FOR UPDATE lock ensures serially-unique refs under
 * concurrent transactions. The lock is released on COMMIT or ROLLBACK.
 */
async function generateRunRef(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  projectId: string,
): Promise<string> {
  // 1. Ensure the counter row exists for this project.
  //    ON DUPLICATE KEY UPDATE next_value = next_value + 0 is a no-op if the
  //    row already exists — it just ensures the row is present without changing
  //    it, so the subsequent FOR UPDATE can lock it.
  await tx.execute(sql`
    INSERT INTO ref_counters (project_id, entity_type, next_value)
    VALUES (${projectId}, 'run', 1)
    ON DUPLICATE KEY UPDATE next_value = next_value + 0
  `)

  // 2. Acquire an exclusive lock on the counter row and read the current value.
  //    Any concurrent transaction hitting this step will block here until
  //    this transaction commits or rolls back.
  const counterResult = await tx.execute(sql`
    SELECT next_value
    FROM ref_counters
    WHERE project_id = ${projectId} AND entity_type = 'run'
    FOR UPDATE
  `)

  const rows = counterResult[0] as unknown as Array<{ next_value: number }>
  const counterRow = rows[0]

  if (!counterRow) {
    // Should be impossible after the IODKU above, but guard anyway.
    throw new RunCreationError(
      'Failed to initialise ref counter — counter row missing.',
      'REF_COUNTER_TIMEOUT',
    )
  }

  const currentRef = counterRow.next_value

  // 3. Increment the counter for the next caller.
  await tx.execute(sql`
    UPDATE ref_counters
    SET next_value = next_value + 1
    WHERE project_id = ${projectId} AND entity_type = 'run'
  `)

  return `RUN-${String(currentRef).padStart(4, '0')}`
}

/**
 * Build the test_run_cases row array from the ordered case list.
 * All snapshot fields are copied from the live case data.
 * Result fields are pre-populated as 'not_run'.
 */
function buildRunCaseRows(
  newRunId: string,
  orderedCases: CaseWithFolder[],
): NewTestRunCase[] {
  return orderedCases.map((c, index) => ({
    id: createId(),
    testRunId: newRunId,
    testCaseId: c.id,

    // ── SNAPSHOT (immutable after this point) ──────────────────────────
    snapshotCaseRef: c.caseRef,
    snapshotTitle: c.title,
    snapshotPreconditions: c.preconditions ?? null,
    snapshotDescription: c.description ?? null,
    snapshotPriority: c.priority,
    snapshotType: c.type,
    snapshotFolderName: c.folderName ?? null,
    snapshotTags: (c.tags as string[]) ?? [],

    // ── ASSIGNMENT ──────────────────────────────────────────────────────
    assignedTo: c.assignedTo ?? null,

    // ── RESULT (pre-populated; updated by ExecutionService later) ───────
    status: 'not_run' as const,
    comment: null,
    executedBy: null,
    executedAt: null,

    // ── ORDERING ────────────────────────────────────────────────────────
    // Plan position is preserved as the initial run ordering.
    // The execution case list further sorts by snapshot_priority at query time.
    position: index,
  }))
}

/**
 * Build the run_case_step_snapshots row array from the steps grouped by case.
 * Steps are never mutated. originalStepId links back to the live step row
 * (ON DELETE SET NULL — the snapshot remains even if the live step is deleted).
 */
function buildStepSnapshotRows(
  orderedCases: CaseWithFolder[],
  runCaseIdMap: Map<string, string>,
  stepsByCase: Map<string, StepRow[]>,
): NewRunCaseStepSnapshot[] {
  const rows: NewRunCaseStepSnapshot[] = []

  for (const c of orderedCases) {
    const runCaseId = runCaseIdMap.get(c.id)
    if (!runCaseId) continue // should never happen

    const steps = stepsByCase.get(c.id) ?? []
    for (const step of steps) {
      rows.push({
        id: createId(),
        testRunCaseId: runCaseId,
        originalStepId: step.id,
        position: step.position,
        action: step.action,
        expectedResult: step.expectedResult ?? null,
        // No updatedAt — this table is intentionally immutable.
      })
    }
  }

  return rows
}

/**
 * Build the audit_log row for run creation.
 * This row is inserted inside the transaction — it rolls back if the
 * run creation fails.
 */
function buildAuditRow(
  newRunId: string,
  runRef: string,
  projectId: string,
  actorId: string,
  plan: PlanRow | null,
  resolvedTitle: string,
  resolvedEnvironment: string | null,
  orderedCases: CaseWithFolder[],
  totalStepCount: number,
  assigneeIds: string[],
  isPartialSelection: boolean,
): NewAuditLog {
  return {
    id: createId(),
    projectId,
    entityType: 'test_run',
    entityId: newRunId,
    action: 'run.created',
    actorId,
    oldValue: null,
    newValue: {
      runRef,
      title: resolvedTitle,
      testPlanId: plan?.id ?? null,
      environment: resolvedEnvironment,
      caseCount: orderedCases.length,
      stepCount: totalStepCount,
      assigneeIds,
      status: 'active',
    },
    metadata: {
      planRef: plan?.planRef ?? null,
      planTitle: plan?.title ?? null,
      isPartialSelection,
      selectedCaseRefs: orderedCases.map((c) => c.caseRef),
    },
  }
}

// ---------------------------------------------------------------------------
// Phase 3 helpers (post-commit, fire-and-forget)
// ---------------------------------------------------------------------------

/**
 * Fetch denormalised fields and write the run document to OpenSearch.
 * Updates test_runs.indexed_at on success.
 * Does NOT throw — failures are logged and the run remains unindexed
 * (indexed_at stays NULL, which flags it for the sync job in Phase 2).
 */
async function indexRunDocument(
  runId: string,
  runRef: string,
  title: string,
  environment: string | null,
  projectId: string,
  testPlanId: string | null,
  planTitle: string | null,
  planRef: string | null,
  createdBy: string,
): Promise<void> {
  // Resolve denormalised names for the document.
  const [projectRow] = testPlanId
    ? await db
        .select({ name: testPlans.title })
        .from(testPlans)
        .where(eq(testPlans.id, testPlanId))
        .limit(1)
    : [undefined]

  const [projectMeta] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, createdBy))
    .limit(1)

  const doc = {
    id: runId,
    run_ref: runRef,
    title,
    status: 'active',
    environment: environment ?? null,
    project_id: projectId,
    plan_title: planTitle ?? '',
    plan_ref: planRef ?? '',
    created_by_name: projectMeta?.name ?? '',
    updated_at: new Date().toISOString(),
  }

  await opensearchClient.index({
    index: 'relay_test_runs',
    id: runId,
    body: doc,
    refresh: false, // eventual consistency is fine for search
  })

  // Mark the run as indexed.
  await db
    .update(testRuns)
    .set({ indexedAt: new Date() })
    .where(eq(testRuns.id, runId))
}

/**
 * Upsert a recent_views entry for the creating user.
 * Enforces a maximum of 15 rows per user by deleting the oldest entries.
 */
async function upsertRecentView(
  userId: string,
  entityId: string,
  projectId: string,
  displayTitle: string,
): Promise<void> {
  await db
    .insert(recentViews)
    .values({
      id: createId(),
      userId,
      entityType: 'test_run',
      entityId,
      projectId,
      displayTitle,
    })
    .onDuplicateKeyUpdate({
      set: {
        displayTitle,
        viewedAt: new Date(),
      },
    })

  // Enforce 15-row maximum per user.
  const stale = await db
    .select({ id: recentViews.id })
    .from(recentViews)
    .where(eq(recentViews.userId, userId))
    .orderBy(desc(recentViews.viewedAt))
    .offset(15)
    .limit(100) // reasonable upper bound on stale rows to delete

  if (stale.length > 0) {
    await db
      .delete(recentViews)
      .where(
        inArray(
          recentViews.id,
          stale.map((r) => r.id),
        ),
      )
  }
}

// ---------------------------------------------------------------------------
// Local type aliases (not exported — internal to this service)
// ---------------------------------------------------------------------------

type PlanRow = {
  id: string
  planRef: string
  title: string
  status: 'draft' | 'active' | 'archived'
  environment: string | null
  projectId: string
}

type CaseWithFolder = {
  id: string
  caseRef: string
  title: string
  priority: 'critical' | 'high' | 'medium' | 'low'
  type: 'functional' | 'smoke' | 'regression' | 'integration' | 'security'
  preconditions: string | null
  description: string | null
  automationStatus: 'manual' | 'automated' | 'semi_automated'
  tags: unknown // JSON — typed as string[] in practice
  assignedTo: string | null
  folderId: string | null
  folderName: string | null
}

type StepRow = {
  id: string
  testCaseId: string
  position: number
  action: string
  expectedResult: string | null
}

// ---------------------------------------------------------------------------
// createRun — main exported function
// ---------------------------------------------------------------------------

/**
 * Spawn a new test run from a test plan.
 *
 * This is the most complex write operation in Relay. It runs in three phases:
 *
 * PHASE 1 — Pre-validation (reads only, no transaction):
 *   RBAC check, plan load, case resolution, case + step load, assignee check.
 *   Fails fast with a typed RunCreationError before touching any write path.
 *
 * PHASE 2 — Transaction (atomic, all-or-nothing):
 *   ref_counter → test_runs → test_run_cases → run_case_step_snapshots
 *   → run_assignees → audit_log
 *   Any failure rolls back the entire transaction. No partial state is possible.
 *
 * PHASE 3 — Post-commit (non-atomic, fire-and-forget):
 *   OpenSearch indexing + recent_views upsert.
 *   Failures are logged. The run is committed to MySQL regardless.
 */
export async function createRun(input: CreateRunInput): Promise<CreateRunResult> {
  const {
    projectId,
    testPlanId,
    createdBy,
    assigneeIds = [],
    caseIds,
  } = input

  const spawnedAt = new Date()

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 1 — PRE-VALIDATION
  // All reads. No DB writes. No transaction.
  // Failures throw RunCreationError with no side effects.
  // ══════════════════════════════════════════════════════════════════════════

  // ── 1a. RBAC ──────────────────────────────────────────────────────────────

  await assertSpawnAccess(createdBy, projectId)

  // ── 1b. Load and validate test plan (skipped for ad-hoc runs) ────────────
  // Ad-hoc runs change: `testPlanId` is optional. Without a plan, `caseIds`
  // is required and the run snapshots directly from the live test cases —
  // same snapshot mechanics, just a different source for the case list.

  let plan: PlanRow | null = null
  let selectedCaseIds: string[]
  let wasPartialSelection = false

  if (testPlanId) {
    const [planRow] = await db
      .select({
        id: testPlans.id,
        planRef: testPlans.planRef,
        title: testPlans.title,
        status: testPlans.status,
        environment: testPlans.environment,
        projectId: testPlans.projectId,
      })
      .from(testPlans)
      .where(
        and(eq(testPlans.id, testPlanId), eq(testPlans.projectId, projectId)),
      )
      .limit(1)

    if (!planRow) {
      throw new RunCreationError(
        `Test plan not found: ${testPlanId}`,
        'PLAN_NOT_FOUND',
      )
    }

    if (planRow.status === 'archived') {
      throw new RunCreationError(
        `Cannot spawn a run from an archived plan: ${planRow.planRef}`,
        'PLAN_ARCHIVED',
      )
    }

    // Note: 'draft' plans CAN spawn runs. The plan status is not
    // automatically promoted by this operation.
    plan = planRow

    // ── 1c. Load plan case list and resolve selected cases ─────────────────

    const planCaseRows = await db
      .select({
        testCaseId: testPlanCases.testCaseId,
        position: testPlanCases.position,
      })
      .from(testPlanCases)
      .where(eq(testPlanCases.testPlanId, testPlanId))
      .orderBy(testPlanCases.position)

    if (planCaseRows.length === 0) {
      throw new RunCreationError(
        `Test plan has no cases linked: ${planRow.planRef}`,
        'PLAN_EMPTY',
      )
    }

    const allPlanCaseIds = planCaseRows.map((r) => r.testCaseId)

    if (caseIds && caseIds.length > 0) {
      wasPartialSelection = caseIds.length < allPlanCaseIds.length
      // Validate every requested case ID is actually in the plan.
      const planCaseSet = new Set(allPlanCaseIds)
      const invalidIds = caseIds.filter((id) => !planCaseSet.has(id))
      if (invalidIds.length > 0) {
        throw new RunCreationError(
          `Case IDs not in plan ${planRow.planRef}: ${invalidIds.join(', ')}`,
          'CASES_NOT_IN_PLAN',
        )
      }
      selectedCaseIds = caseIds
    } else {
      // Include all plan cases.
      selectedCaseIds = allPlanCaseIds
    }
  } else {
    // Ad-hoc run — the explicit case list IS the run's contents.
    if (!caseIds || caseIds.length === 0) {
      throw new RunCreationError(
        'An ad-hoc run (no test plan) requires a non-empty caseIds list.',
        'PLAN_EMPTY',
      )
    }
    selectedCaseIds = caseIds
  }

  // ── 1d. Load cases (with folder names) and steps ─────────────────────────

  // Single query — LEFT JOIN to folders for snapshot_folder_name.
  const cases = await db
    .select({
      id: testCases.id,
      caseRef: testCases.caseRef,
      title: testCases.title,
      priority: testCases.priority,
      type: testCases.type,
      preconditions: testCases.preconditions,
      description: testCases.description,
      automationStatus: testCases.automationStatus,
      tags: testCases.tags,
      assignedTo: testCases.assignedTo,
      folderId: testCases.folderId,
      folderName: folders.name,
    })
    .from(testCases)
    .leftJoin(folders, eq(testCases.folderId, folders.id))
    .where(
      and(
        inArray(testCases.id, selectedCaseIds),
        eq(testCases.projectId, projectId),
        eq(testCases.isArchived, false),
      ),
    )

  // Guard: if count differs, some cases are archived or missing.
  if (cases.length !== selectedCaseIds.length) {
    const foundIds = new Set(cases.map((c) => c.id))
    const missingRefs = selectedCaseIds
      .filter((id) => !foundIds.has(id))
      .map((id) => id)
    throw new RunCreationError(
      `${missingRefs.length} case(s) are archived or not found: ${missingRefs.join(', ')}`,
      'CASES_UNAVAILABLE',
    )
  }

  // Load all steps for selected cases in a single batch query.
  // Ordered by testCaseId then position so they can be grouped efficiently.
  const allSteps: StepRow[] = await db
    .select({
      id: testCaseSteps.id,
      testCaseId: testCaseSteps.testCaseId,
      position: testCaseSteps.position,
      action: testCaseSteps.action,
      expectedResult: testCaseSteps.expectedResult,
    })
    .from(testCaseSteps)
    .where(inArray(testCaseSteps.testCaseId, selectedCaseIds))
    .orderBy(testCaseSteps.testCaseId, testCaseSteps.position)

  // Group steps by case ID for O(1) lookup when building snapshot rows.
  const stepsByCase = new Map<string, StepRow[]>()
  for (const step of allSteps) {
    const existing = stepsByCase.get(step.testCaseId)
    if (existing) {
      existing.push(step)
    } else {
      stepsByCase.set(step.testCaseId, [step])
    }
  }

  // ── 1e. Validate assignees ────────────────────────────────────────────────

  if (assigneeIds.length > 0) {
    const validUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(and(inArray(users.id, assigneeIds), eq(users.isActive, true)))

    if (validUsers.length !== assigneeIds.length) {
      const foundIds = new Set(validUsers.map((u) => u.id))
      const invalidIds = assigneeIds.filter((id) => !foundIds.has(id))
      throw new RunCreationError(
        `Invalid or inactive assignees: ${invalidIds.join(', ')}`,
        'INVALID_ASSIGNEES',
      )
    }
  }

  // ── Resolve run title and environment ─────────────────────────────────────

  const resolvedTitle =
    input.name?.trim() ||
    (plan
      ? `${plan.title} — ${formatRunDate(spawnedAt)}`
      : `Ad-hoc run — ${formatRunDate(spawnedAt)}`)

  const resolvedEnvironment: string | null =
    input.environment?.trim() || plan?.environment || null

  const resolvedDescription: string | null = input.description?.trim() || null

  // Sort cases by plan position (for ad-hoc runs, by the order the case ids
  // were supplied — selectedCaseIds preserves both). O(1) lookup map.
  const planPositionMap = new Map(
    selectedCaseIds.map((id, i) => [id, i]),
  )
  const orderedCases: CaseWithFolder[] = [...(cases as CaseWithFolder[])].sort(
    (a, b) =>
      (planPositionMap.get(a.id) ?? 9999) -
      (planPositionMap.get(b.id) ?? 9999),
  )

  // Pre-generate the run ID outside the transaction so it is available
  // in Phase 3 without another query.
  const newRunId = createId()

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 2 — TRANSACTION
  // Atomic. Any thrown error triggers automatic ROLLBACK.
  // Drizzle issues BEGIN before the callback and COMMIT on success.
  // All operations in this block use the same DB connection (tx).
  // ══════════════════════════════════════════════════════════════════════════

  let transactionResult: {
    runRef: string
    caseCount: number
    stepCount: number
  }

  try {
    transactionResult = await db.transaction(async (tx) => {
      // ── 2a. Generate run_ref ────────────────────────────────────────────

      const runRef = await generateRunRef(tx, projectId)

      // ── 2b. Insert test_runs ────────────────────────────────────────────

      await tx.insert(testRuns).values({
        id: newRunId,
        runRef,
        projectId,
        testPlanId: testPlanId ?? null,
        title: resolvedTitle,
        description: resolvedDescription,
        status: 'active',
        environment: resolvedEnvironment,
        isStalled: false,
        createdBy,
        // sealedAt, sealedBy: null (not sealed)
        // indexedAt: null (set after OpenSearch write in Phase 3)
      })

      // ── 2c. Insert test_run_cases ───────────────────────────────────────

      const runCaseRows = buildRunCaseRows(newRunId, orderedCases)

      // Insert in chunks of 100 to avoid max_allowed_packet limits.
      // Each chunk is a single multi-row INSERT.
      for (const chunk of chunkArray(runCaseRows, 100)) {
        await tx.insert(testRunCases).values(chunk)
      }

      // Build the testCaseId → testRunCaseId map for step snapshot inserts.
      const runCaseIdMap = new Map<string, string>(
        runCaseRows.map((r) => [r.testCaseId as string, r.id as string]),
      )

      // ── 2c-bis. Insert run_case_events ('created' per case) ──────────────
      //
      // Append-only transition log (new-tables candidate, Phase B). One
      // 'created' event per run case at spawn, mirroring the local prototype's
      // ADD_CASES_TO_RUN log entries (from/to = 'not_run'). Result transitions
      // are appended later by ExecutionService.updateCaseResult().
      const runCaseEventRows: NewRunCaseEvent[] = runCaseRows.map((rc) => ({
        id: createId(),
        testRunCaseId: rc.id as string,
        actorId: createdBy,
        event: 'created' as const,
        fromStatus: 'not_run' as const,
        toStatus: 'not_run' as const,
        at: spawnedAt,
      }))

      for (const chunk of chunkArray(runCaseEventRows, 100)) {
        await tx.insert(runCaseEvents).values(chunk)
      }

      // ── 2d. Insert run_case_step_snapshots ──────────────────────────────

      // NOTE: run_step_results are NOT created here. They are created lazily
      // by ExecutionService.updateStepResult() on first interaction.

      const stepSnapshotRows = buildStepSnapshotRows(
        orderedCases,
        runCaseIdMap,
        stepsByCase,
      )

      for (const chunk of chunkArray(stepSnapshotRows, 100)) {
        await tx.insert(runCaseStepSnapshots).values(chunk)
      }

      // ── 2e. Insert run_assignees ────────────────────────────────────────

      if (assigneeIds.length > 0) {
        const assigneeRows: NewRunAssignee[] = assigneeIds.map((userId) => ({
          id: createId(),
          testRunId: newRunId,
          userId,
          assignedBy: createdBy,
          // assignedAt: defaultNow() via schema
        }))
        await tx.insert(runAssignees).values(assigneeRows)
      }

      // ── 2f. Insert audit_log ────────────────────────────────────────────
      //
      // This row is part of the transaction.
      // If the run creation fails, this audit event also rolls back.
      // There will never be an audit event for a run that does not exist.

      const auditRow = buildAuditRow(
        newRunId,
        runRef,
        projectId,
        createdBy,
        plan,
        resolvedTitle,
        resolvedEnvironment,
        orderedCases,
        stepSnapshotRows.length,
        assigneeIds,
        wasPartialSelection,
      )

      await tx.insert(auditLog).values(auditRow)

      // Return values needed for Phase 3 and the function return.
      return {
        runRef,
        caseCount: runCaseRows.length,
        stepCount: stepSnapshotRows.length,
      }
    })
  } catch (err: unknown) {
    // Distinguish known MySQL error codes from unexpected failures.
    if (isLockTimeoutError(err)) {
      throw new RunCreationError(
        'Timed out acquiring the run reference counter lock. Try again.',
        'REF_COUNTER_TIMEOUT',
      )
    }

    if (isDuplicateKeyError(err)) {
      // Extremely unlikely with correct FOR UPDATE locking, but handle it.
      throw new RunCreationError(
        'Duplicate run reference conflict. Try again.',
        'DUPLICATE_RUN_REF',
      )
    }

    // Re-throw unknown errors as TRANSACTION_FAILED so the caller can
    // distinguish DB failures from business logic errors.
    const message = err instanceof Error ? err.message : String(err)
    logger.error('[TestRunService] Transaction failed', {
      projectId,
      testPlanId,
      createdBy,
      error: message,
    })

    throw new RunCreationError(
      `Run creation transaction failed: ${message}`,
      'TRANSACTION_FAILED',
    )
  }

  const { runRef, caseCount, stepCount } = transactionResult

  // ══════════════════════════════════════════════════════════════════════════
  // PHASE 3 — POST-COMMIT SIDE EFFECTS
  // Not part of the transaction. Failures are logged but do not affect
  // the committed run. The run is available in MySQL immediately.
  // ══════════════════════════════════════════════════════════════════════════

  // ── 3a. Index run document in OpenSearch ────────────────────────────────
  //
  // Fire-and-forget: if this fails, indexed_at stays NULL on the run row.
  // A background sync job (Phase 2) picks up unindexed runs via:
  //   WHERE indexed_at IS NULL OR updated_at > indexed_at

  indexRunDocument(
    newRunId,
    runRef,
    resolvedTitle,
    resolvedEnvironment,
    projectId,
    testPlanId ?? null,
    plan?.title ?? null,
    plan?.planRef ?? null,
    createdBy,
  ).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('[TestRunService] OpenSearch index failed — run will be retried by sync job', {
      runId: newRunId,
      runRef,
      error: message,
    })
  })

  // ── 3b. Upsert recent_views ────────────────────────────────────────────

  upsertRecentView(
    createdBy,
    newRunId,
    projectId,
    `${runRef} · ${resolvedTitle}`,
  ).catch((err: unknown) => {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('[TestRunService] recent_views upsert failed', {
      userId: createdBy,
      runId: newRunId,
      error: message,
    })
  })

  // ══════════════════════════════════════════════════════════════════════════
  // Return
  // ══════════════════════════════════════════════════════════════════════════

  return {
    id: newRunId,
    runRef,
    title: resolvedTitle,
    status: 'active',
    caseCount,
    stepCount,
    environment: resolvedEnvironment,
    createdAt: spawnedAt,
    testPlanId: testPlanId ?? null,
    projectId,
  }
}

// ---------------------------------------------------------------------------
// updateRun — run lifecycle (seal / reopen / archive) + small metadata patch
// ---------------------------------------------------------------------------

export type RunUpdateErrorCode = 'RUN_NOT_FOUND' | 'TRANSACTION_FAILED'

export class RunUpdateError extends Error {
  constructor(
    message: string,
    public readonly code: RunUpdateErrorCode,
  ) {
    super(message)
    this.name = 'RunUpdateError'
  }
}

export interface UpdateRunInput {
  projectId: string
  runId: string
  actorId: string
  /**
   * Lifecycle transition. 'sealed' stamps sealedAt/sealedBy; 'active'
   * clears them (reopen); 'archived' hides the run from default lists
   * (the archive/"delete" path — runs are never hard-deleted, matching the
   * schema's soft-delete invariants). No transition-graph validation beyond
   * that: this is a demo-scale admin operation.
   */
  status?: 'active' | 'sealed' | 'archived'
  title?: string
  description?: string | null
  dueDate?: Date | null
}

export interface UpdateRunResult {
  id: string
  runRef: string
  projectId: string
  status: 'active' | 'stalled' | 'sealed' | 'archived'
  title: string
  description: string | null
  dueDate: Date | null
  sealedAt: Date | null
  sealedBy: string | null
}

/**
 * Patch a run's lifecycle status and/or small metadata fields.
 *
 * RBAC: admin or above (same level as spawning — run lifecycle management),
 * via the shared assertMinProjectRole() (InsufficientPermissionsError is
 * handled generically by the route error mapper). Audit action is
 * 'run.sealed' / 'run.reopened' / 'run.archived' for transitions,
 * 'run.updated' for metadata-only patches — recorded in the same
 * transaction as the update.
 */
export async function updateRun(input: UpdateRunInput): Promise<UpdateRunResult> {
  const { projectId, runId, actorId } = input

  await assertMinProjectRole(actorId, projectId, 'admin')

  const [run] = await db
    .select({
      id: testRuns.id,
      runRef: testRuns.runRef,
      status: testRuns.status,
      title: testRuns.title,
      description: testRuns.description,
      dueDate: testRuns.dueDate,
      sealedAt: testRuns.sealedAt,
      sealedBy: testRuns.sealedBy,
    })
    .from(testRuns)
    .where(and(eq(testRuns.id, runId), eq(testRuns.projectId, projectId)))
    .limit(1)

  if (!run) {
    throw new RunUpdateError(`Test run not found: ${runId}`, 'RUN_NOT_FOUND')
  }

  const set: Partial<{
    status: 'active' | 'stalled' | 'sealed' | 'archived'
    title: string
    description: string | null
    dueDate: Date | null
    sealedAt: Date | null
    sealedBy: string | null
  }> = {}

  if (input.title !== undefined && input.title !== run.title) set.title = input.title
  if (input.description !== undefined && input.description !== run.description)
    set.description = input.description
  if (input.dueDate !== undefined) set.dueDate = input.dueDate

  let auditAction = 'run.updated'
  if (input.status !== undefined && input.status !== run.status) {
    set.status = input.status
    if (input.status === 'sealed') {
      set.sealedAt = new Date()
      set.sealedBy = actorId
      auditAction = 'run.sealed'
    } else if (input.status === 'active') {
      set.sealedAt = null
      set.sealedBy = null
      auditAction = run.status === 'sealed' ? 'run.reopened' : 'run.updated'
    } else {
      auditAction = 'run.archived'
    }
  }

  if (Object.keys(set).length === 0) {
    // Nothing to change — return current state, no write, no audit noise.
    return {
      id: run.id,
      runRef: run.runRef,
      projectId,
      status: run.status,
      title: run.title,
      description: run.description ?? null,
      dueDate: run.dueDate ?? null,
      sealedAt: run.sealedAt ?? null,
      sealedBy: run.sealedBy ?? null,
    }
  }

  try {
    await db.transaction(async (tx) => {
      await tx.update(testRuns).set(set).where(eq(testRuns.id, runId))

      await recordAudit(
        {
          projectId,
          entityType: 'test_run',
          entityId: runId,
          action: auditAction,
          actorId,
          oldValue: {
            status: run.status,
            title: run.title,
            dueDate: run.dueDate ?? null,
          },
          newValue: {
            status: set.status ?? run.status,
            title: set.title ?? run.title,
            dueDate: set.dueDate !== undefined ? set.dueDate : (run.dueDate ?? null),
          },
          metadata: { runRef: run.runRef },
        },
        tx,
      )
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('[TestRunService] updateRun transaction failed', {
      projectId,
      runId,
      actorId,
      error: message,
    })
    throw new RunUpdateError(`Run update transaction failed: ${message}`, 'TRANSACTION_FAILED')
  }

  return {
    id: run.id,
    runRef: run.runRef,
    projectId,
    status: set.status ?? run.status,
    title: set.title ?? run.title,
    description:
      set.description !== undefined ? set.description : (run.description ?? null),
    dueDate: set.dueDate !== undefined ? set.dueDate : (run.dueDate ?? null),
    sealedAt: set.sealedAt !== undefined ? set.sealedAt : (run.sealedAt ?? null),
    sealedBy: set.sealedBy !== undefined ? set.sealedBy : (run.sealedBy ?? null),
  }
}

// ---------------------------------------------------------------------------
// MySQL error helpers
// ---------------------------------------------------------------------------

/**
 * MySQL error number for lock wait timeout.
 * Thrown when a FOR UPDATE cannot acquire the lock within innodb_lock_wait_timeout.
 */
function isLockTimeoutError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'errno' in err &&
    (err as { errno: number }).errno === 1205
  )
}

/**
 * MySQL error number for duplicate entry (unique constraint violation).
 * Used to detect race conditions on run_ref generation.
 */
function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'errno' in err &&
    (err as { errno: number }).errno === 1062
  )
}
