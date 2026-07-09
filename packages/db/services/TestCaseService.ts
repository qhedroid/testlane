/**
 * TestCaseService.ts
 * Relay — Service layer
 *
 * Test Cases + Folders (Phase 2 of mvp-backend). Modeled directly on
 * TestRunService.ts's three-phase shape (pre-validation -> transaction ->
 * post-commit side effects), reusing assertMinProjectRole() from
 * ../src/rbac/assert-min-role for RBAC rather than reimplementing role math.
 *
 * Deliberate scope/format decisions (see docs/claude/handoff.md for the full
 * write-up — flagged here so they aren't silently re-derived or contradicted
 * later):
 *   - Case ref format: 'TC-' + a plain integer (e.g. 'TC-1005'), matching the
 *     seed data's existing convention (packages/db/src/seed/insert.ts already
 *     hands out TC-1001..TC-1004 per project and reserves the ref_counters
 *     starting point) — NOT the frontend demo's zero-padded 'TC-00001'
 *     (apps/web/src/fresh/data/demo-model.ts's formatCaseKey), which is a
 *     separate, purely-client-side convention for the localStorage prototype.
 *   - Custom fields (mvp-custom-fields) and Requirements linking are
 *     explicitly OUT of scope here: no custom_field_values or requirements
 *     tables exist in schema.ts, and mvp-custom-fields is excluded from this
 *     whole branch. CasesScreen.tsx's Custom Fields / Requirements tabs stay
 *     on localStorage/FreshProvider when that screen is wired in a later step.
 *   - Folders: only create + list are implemented, matching every folder
 *     operation that exists in the frontend today (FreshProvider has no
 *     rename/delete/reorder for folders at all) — not getting ahead of the UI.
 *   - "Delete" is implemented as archive (is_archived = true), per schema.ts's
 *     own documented invariant that test_cases are "never hard-deleted, only
 *     archived." This differs from the frontend prototype's deleteCase(),
 *     which removes the case from local state entirely — worth knowing when
 *     CasesScreen.tsx is wired to this API.
 *   - ref_counters is not a Drizzle-migration-managed table (see
 *     TestRunService.ts's own comment) — it only exists once the seed script
 *     has run at least once in a given environment (ensureRefCountersTable()
 *     in packages/db/src/seed/insert.ts). Not fixed in this phase; documented
 *     as a known pre-existing gap.
 */

import { and, eq, inArray } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import {
  folders,
  projects,
  testCaseSteps,
  testCases,
  type NewFolder,
  type NewTestCase,
  type NewTestCaseStep,
} from '../schema'
import { db } from '../src/index'
import { logger } from '../src/logger'
import { assertMinProjectRole } from '../src/rbac/assert-min-role'
import { createId } from '../src/utils/id'
import { recordAudit } from './AuditService'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CasePriority = 'critical' | 'high' | 'medium' | 'low'
export type CaseType = 'functional' | 'smoke' | 'regression' | 'integration' | 'security'

export interface FolderSummary {
  id: string
  projectId: string
  parentId: string | null
  name: string
  description: string | null
  position: number
}

export interface CaseStepIO {
  id?: string
  action: string
  expectedResult?: string | null
}

export interface CaseSummary {
  id: string
  caseRef: string
  projectId: string
  folderId: string | null
  title: string
  priority: CasePriority
  type: CaseType
  assignedTo: string | null
  isArchived: boolean
  position: number
  stepCount: number
  createdAt: Date
  updatedAt: Date
}

export interface CaseDetail extends CaseSummary {
  preconditions: string | null
  description: string | null
  automationStatus: 'manual' | 'automated' | 'semi_automated'
  tags: string[]
  createdBy: string | null
  steps: Array<{ id: string; position: number; action: string; expectedResult: string | null }>
}

export interface CreateFolderInput {
  actorId: string
  projectId: string
  name: string
  parentId?: string | null
  description?: string
}

export interface ListCasesInput {
  actorId: string
  projectId: string
  folderId?: string
  includeArchived?: boolean
}

export interface CreateCaseInput {
  actorId: string
  projectId: string
  folderId?: string | null
  title: string
  priority?: CasePriority
  type?: CaseType
  preconditions?: string
  description?: string
  tags?: string[]
  assignedTo?: string | null
  steps?: CaseStepIO[]
}

export interface UpdateCaseInput {
  actorId: string
  projectId: string
  caseId: string
  patch: Partial<{
    folderId: string | null
    title: string
    priority: CasePriority
    type: CaseType
    preconditions: string | null
    description: string | null
    tags: string[]
    assignedTo: string | null
    isArchived: boolean
    steps: CaseStepIO[]
  }>
}

export interface ArchiveCaseInput {
  actorId: string
  projectId: string
  caseId: string
}

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export type TestCaseServiceErrorCode =
  | 'PROJECT_NOT_FOUND'
  | 'FOLDER_NOT_FOUND'
  | 'CASE_NOT_FOUND'
  | 'DUPLICATE_CASE_REF'
  | 'REF_COUNTER_TIMEOUT'
  | 'TRANSACTION_FAILED'

export class TestCaseServiceError extends Error {
  constructor(
    message: string,
    public readonly code: TestCaseServiceErrorCode,
  ) {
    super(message)
    this.name = 'TestCaseServiceError'
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
    throw new TestCaseServiceError('Project not found.', 'PROJECT_NOT_FOUND')
  }
}

/**
 * Atomically generate the next case_ref for a project. Mirrors
 * TestRunService.ts's generateRunRef() exactly, but for entity_type='case'
 * and the unpadded 'TC-<n>' format (see file header for why).
 *
 * Must be called inside a db.transaction() callback. The ref_counters table
 * must already exist (created by the seed script — see file header).
 */
async function generateCaseRef(
  tx: Parameters<Parameters<typeof db.transaction>[0]>[0],
  projectId: string,
): Promise<string> {
  await tx.execute(sql`
    INSERT INTO ref_counters (project_id, entity_type, next_value)
    VALUES (${projectId}, 'case', 1)
    ON DUPLICATE KEY UPDATE next_value = next_value + 0
  `)

  const counterResult = await tx.execute(sql`
    SELECT next_value
    FROM ref_counters
    WHERE project_id = ${projectId} AND entity_type = 'case'
    FOR UPDATE
  `)

  const rows = counterResult[0] as unknown as Array<{ next_value: number }>
  const counterRow = rows[0]

  if (!counterRow) {
    throw new TestCaseServiceError(
      'Failed to initialise ref counter — counter row missing.',
      'REF_COUNTER_TIMEOUT',
    )
  }

  const currentRef = counterRow.next_value

  await tx.execute(sql`
    UPDATE ref_counters
    SET next_value = next_value + 1
    WHERE project_id = ${projectId} AND entity_type = 'case'
  `)

  return `TC-${currentRef}`
}

function toCaseSummary(row: typeof testCases.$inferSelect, stepCount: number): CaseSummary {
  return {
    id: row.id,
    caseRef: row.caseRef,
    projectId: row.projectId,
    folderId: row.folderId,
    title: row.title,
    priority: row.priority as CasePriority,
    type: row.type as CaseType,
    assignedTo: row.assignedTo,
    isArchived: row.isArchived,
    position: row.position,
    stepCount,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }
}

// ---------------------------------------------------------------------------
// Folders
// ---------------------------------------------------------------------------

export async function listFolders(actorId: string, projectId: string): Promise<FolderSummary[]> {
  await assertProjectExists(projectId)
  await assertMinProjectRole(actorId, projectId, 'viewer')

  const rows = await db
    .select({
      id: folders.id,
      projectId: folders.projectId,
      parentId: folders.parentId,
      name: folders.name,
      description: folders.description,
      position: folders.position,
    })
    .from(folders)
    .where(eq(folders.projectId, projectId))

  return rows
}

export async function createFolder(input: CreateFolderInput): Promise<FolderSummary> {
  const { actorId, projectId, name, parentId, description } = input
  await assertProjectExists(projectId)
  await assertMinProjectRole(actorId, projectId, 'contributor')

  if (parentId) {
    const [parent] = await db
      .select({ id: folders.id })
      .from(folders)
      .where(and(eq(folders.id, parentId), eq(folders.projectId, projectId)))
      .limit(1)
    if (!parent) {
      throw new TestCaseServiceError('Parent folder not found.', 'FOLDER_NOT_FOUND')
    }
  }

  const newFolder: NewFolder = {
    id: createId(),
    projectId,
    parentId: parentId ?? null,
    name,
    description: description ?? null,
    createdBy: actorId,
  }

  await db.insert(folders).values(newFolder)

  return {
    id: newFolder.id as string,
    projectId,
    parentId: newFolder.parentId ?? null,
    name,
    description: newFolder.description ?? null,
    position: 0,
  }
}

// ---------------------------------------------------------------------------
// Cases — reads
// ---------------------------------------------------------------------------

/**
 * Recursively resolve a folder id to itself + every descendant folder id.
 * Mirrors the frontend prototype's casesInFolder() forward-parentId-chain
 * walk (apps/web/src/fresh/data/demo-model.ts) so folder-scoped listing
 * behaves identically once CasesScreen.tsx is wired to this API.
 */
async function resolveFolderAndDescendantIds(
  projectId: string,
  folderId: string,
): Promise<string[]> {
  const allFolders = await db
    .select({ id: folders.id, parentId: folders.parentId })
    .from(folders)
    .where(eq(folders.projectId, projectId))

  const childrenByParent = new Map<string, string[]>()
  for (const f of allFolders) {
    if (!f.parentId) continue
    const list = childrenByParent.get(f.parentId) ?? []
    list.push(f.id)
    childrenByParent.set(f.parentId, list)
  }

  const result: string[] = []
  const queue = [folderId]
  while (queue.length > 0) {
    const current = queue.shift() as string
    result.push(current)
    const children = childrenByParent.get(current) ?? []
    queue.push(...children)
  }
  return result
}

/**
 * List cases for a project. Unpaginated by design (Phase 2 decision): the
 * frontend prototype's CasesScreen.tsx keeps the entire project's case list
 * in memory and does all filtering/paging client-side — matching that
 * exactly avoids a screen rewrite when this route gets wired in. Revisit if
 * project case counts grow large enough for this to matter.
 *
 * Returns full CaseDetail rows (steps, tags, preconditions, description)
 * rather than thin summaries — changed during the Cases screen-wiring pass:
 * the screen renders step content and tag chips directly from its in-memory
 * case list, so a summary-only list would force an N+1 per-case detail fetch
 * on every project load. One extra step-rows query here (which the previous
 * step-*count* implementation already paid) is far cheaper.
 */
export async function listCases(input: ListCasesInput): Promise<CaseDetail[]> {
  const { actorId, projectId, folderId, includeArchived } = input
  await assertProjectExists(projectId)
  await assertMinProjectRole(actorId, projectId, 'viewer')

  const conditions = [eq(testCases.projectId, projectId)]
  if (!includeArchived) {
    conditions.push(eq(testCases.isArchived, false))
  }

  let folderIds: string[] | undefined
  if (folderId) {
    if (folderId === '__unfiled__') {
      folderIds = undefined // handled by a separate null check below
    } else {
      folderIds = await resolveFolderAndDescendantIds(projectId, folderId)
    }
  }

  const rows = await db
    .select()
    .from(testCases)
    .where(
      and(
        ...conditions,
        folderId === '__unfiled__'
          ? sql`${testCases.folderId} IS NULL`
          : folderIds
            ? inArray(testCases.folderId, folderIds)
            : undefined,
      ),
    )

  if (rows.length === 0) return []

  const stepRows = await db
    .select()
    .from(testCaseSteps)
    .where(
      inArray(
        testCaseSteps.testCaseId,
        rows.map((r) => r.id),
      ),
    )
    .orderBy(testCaseSteps.position)
  const stepsByCase = new Map<string, typeof stepRows>()
  for (const s of stepRows) {
    const list = stepsByCase.get(s.testCaseId) ?? []
    list.push(s)
    stepsByCase.set(s.testCaseId, list)
  }

  return rows.map((row) => {
    const steps = stepsByCase.get(row.id) ?? []
    return {
      ...toCaseSummary(row, steps.length),
      preconditions: row.preconditions,
      description: row.description,
      automationStatus: row.automationStatus as CaseDetail['automationStatus'],
      tags: (row.tags as string[]) ?? [],
      createdBy: row.createdBy,
      steps: steps.map((s) => ({
        id: s.id,
        position: s.position,
        action: s.action,
        expectedResult: s.expectedResult,
      })),
    }
  })
}

export async function getCase(
  actorId: string,
  projectId: string,
  caseId: string,
): Promise<CaseDetail> {
  await assertProjectExists(projectId)
  await assertMinProjectRole(actorId, projectId, 'viewer')

  const [row] = await db
    .select()
    .from(testCases)
    .where(and(eq(testCases.id, caseId), eq(testCases.projectId, projectId)))
    .limit(1)

  if (!row) {
    throw new TestCaseServiceError('Test case not found.', 'CASE_NOT_FOUND')
  }

  const stepRows = await db
    .select()
    .from(testCaseSteps)
    .where(eq(testCaseSteps.testCaseId, caseId))
    .orderBy(testCaseSteps.position)

  return {
    ...toCaseSummary(row, stepRows.length),
    preconditions: row.preconditions,
    description: row.description,
    automationStatus: row.automationStatus as CaseDetail['automationStatus'],
    tags: (row.tags as string[]) ?? [],
    createdBy: row.createdBy,
    steps: stepRows.map((s) => ({
      id: s.id,
      position: s.position,
      action: s.action,
      expectedResult: s.expectedResult,
    })),
  }
}

// ---------------------------------------------------------------------------
// Cases — writes
// ---------------------------------------------------------------------------

export async function createCase(input: CreateCaseInput): Promise<CaseDetail> {
  const {
    actorId,
    projectId,
    folderId,
    title,
    priority = 'medium',
    type = 'functional',
    preconditions,
    description,
    tags = [],
    assignedTo,
    steps = [],
  } = input

  await assertProjectExists(projectId)
  await assertMinProjectRole(actorId, projectId, 'contributor')

  if (folderId) {
    const [folder] = await db
      .select({ id: folders.id })
      .from(folders)
      .where(and(eq(folders.id, folderId), eq(folders.projectId, projectId)))
      .limit(1)
    if (!folder) {
      throw new TestCaseServiceError('Folder not found.', 'FOLDER_NOT_FOUND')
    }
  }

  const newCaseId = createId()

  let caseRef: string
  try {
    caseRef = await db.transaction(async (tx) => {
      const ref = await generateCaseRef(tx, projectId)

      const newCase: NewTestCase = {
        id: newCaseId,
        caseRef: ref,
        projectId,
        folderId: folderId ?? null,
        title,
        priority,
        type,
        preconditions: preconditions ?? null,
        description: description ?? null,
        tags,
        assignedTo: assignedTo ?? null,
        createdBy: actorId,
      }
      await tx.insert(testCases).values(newCase)

      if (steps.length > 0) {
        const stepRows: NewTestCaseStep[] = steps.map((s, i) => ({
          id: createId(),
          testCaseId: newCaseId,
          position: i + 1,
          action: s.action,
          expectedResult: s.expectedResult ?? null,
        }))
        await tx.insert(testCaseSteps).values(stepRows)
      }

      await recordAudit(
        {
          projectId,
          entityType: 'test_case',
          entityId: newCaseId,
          action: 'case.created',
          actorId,
          newValue: { caseRef: ref, title, priority, type, folderId: folderId ?? null },
        },
        tx,
      )

      return ref
    })
  } catch (err: unknown) {
    if (isLockTimeoutError(err)) {
      throw new TestCaseServiceError(
        'Timed out acquiring the case reference counter lock. Try again.',
        'REF_COUNTER_TIMEOUT',
      )
    }
    if (isDuplicateKeyError(err)) {
      throw new TestCaseServiceError('Duplicate case reference conflict. Try again.', 'DUPLICATE_CASE_REF')
    }
    const message = err instanceof Error ? err.message : String(err)
    logger.error('[TestCaseService] createCase transaction failed', { projectId, error: message })
    throw new TestCaseServiceError(`Case creation failed: ${message}`, 'TRANSACTION_FAILED')
  }

  logger.info('[TestCaseService] case created', { caseId: newCaseId, caseRef, projectId })

  return getCase(actorId, projectId, newCaseId)
}

/**
 * Whole-object-shaped update, matching the frontend prototype's replaceCase()
 * (its only save path — there is no granular per-field patch in the UI
 * today). Steps, if provided, fully replace the existing step list.
 */
export async function updateCase(input: UpdateCaseInput): Promise<CaseDetail> {
  const { actorId, projectId, caseId, patch } = input
  await assertProjectExists(projectId)
  await assertMinProjectRole(actorId, projectId, 'contributor')

  const [existing] = await db
    .select({ id: testCases.id })
    .from(testCases)
    .where(and(eq(testCases.id, caseId), eq(testCases.projectId, projectId)))
    .limit(1)
  if (!existing) {
    throw new TestCaseServiceError('Test case not found.', 'CASE_NOT_FOUND')
  }

  if (patch.folderId) {
    const [folder] = await db
      .select({ id: folders.id })
      .from(folders)
      .where(and(eq(folders.id, patch.folderId), eq(folders.projectId, projectId)))
      .limit(1)
    if (!folder) {
      throw new TestCaseServiceError('Folder not found.', 'FOLDER_NOT_FOUND')
    }
  }

  const { steps, ...caseFields } = patch

  try {
    await db.transaction(async (tx) => {
      if (Object.keys(caseFields).length > 0) {
        await tx.update(testCases).set(caseFields).where(eq(testCases.id, caseId))
      }

      if (steps) {
        await tx.delete(testCaseSteps).where(eq(testCaseSteps.testCaseId, caseId))
        if (steps.length > 0) {
          const stepRows: NewTestCaseStep[] = steps.map((s, i) => ({
            id: s.id ?? createId(),
            testCaseId: caseId,
            position: i + 1,
            action: s.action,
            expectedResult: s.expectedResult ?? null,
          }))
          await tx.insert(testCaseSteps).values(stepRows)
        }
      }

      await recordAudit(
        {
          projectId,
          entityType: 'test_case',
          entityId: caseId,
          action: 'case.updated',
          actorId,
          newValue: caseFields,
        },
        tx,
      )
    })
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err)
    logger.error('[TestCaseService] updateCase transaction failed', { caseId, error: message })
    throw new TestCaseServiceError(`Case update failed: ${message}`, 'TRANSACTION_FAILED')
  }

  return getCase(actorId, projectId, caseId)
}

/**
 * "Delete" = archive (is_archived = true). schema.ts documents test_cases as
 * never hard-deleted — see file header for why this differs from the
 * frontend prototype's deleteCase(), which removes the case from state
 * entirely.
 */
export async function archiveCase(input: ArchiveCaseInput): Promise<void> {
  const { actorId, projectId, caseId } = input
  await assertProjectExists(projectId)
  await assertMinProjectRole(actorId, projectId, 'contributor')

  const [existing] = await db
    .select({ id: testCases.id })
    .from(testCases)
    .where(and(eq(testCases.id, caseId), eq(testCases.projectId, projectId)))
    .limit(1)
  if (!existing) {
    throw new TestCaseServiceError('Test case not found.', 'CASE_NOT_FOUND')
  }

  await db.update(testCases).set({ isArchived: true }).where(eq(testCases.id, caseId))

  await recordAudit({
    projectId,
    entityType: 'test_case',
    entityId: caseId,
    action: 'case.archived',
    actorId,
  })
}
