/**
 * ProjectCloneService.ts
 * Relay — Service layer
 *
 * Deep-clones a project's folders/cases/steps/plans/plan-cases/runs/run-cases/
 * step-snapshots/step-results/defect-links/run-assignees/run-case-events into a
 * brand new project row, with fresh IDs throughout (mvp-backend "wire everything"
 * session — backs the "Create Demo Project" button in ProjectSwitcher.tsx,
 * Shaun's ask for an on-demand fresh copy of the seeded Demo Project).
 *
 * Deliberately generic (clone ANY project by id), not demo-project-specific —
 * the frontend just always passes the real Demo Project's id as the source.
 *
 * Scope decisions:
 *   - Any active user can clone (not gated to global admin like
 *     `createProject()` — cloning read-only demo content is lower-stakes and
 *     meant to be self-serve). The cloning actor is granted an 'admin'
 *     project_roles row on the new project so it's visible to them even if
 *     they aren't a global admin (contributor/viewer accounts otherwise only
 *     see projects with an explicit project_roles row — see
 *     ProjectService.listProjects()).
 *   - Ref strings (case_ref/run_ref/plan_ref) are copied as-is into the new
 *     project — they're only unique per (project_id, ref), not globally (see
 *     schema.ts's `*_project_ref_unique` constraints), so reusing the same
 *     strings in a fresh project is safe.
 *   - `audit_log` and `run_execution_comments` are NOT cloned — supplementary
 *     history, not needed for the new copy to be a fully explorable/workable
 *     project on its own.
 *   - ref_counters for the new project are seeded to continue right after
 *     the highest cloned case/run/plan number, so future creates via
 *     TestCaseService/TestPlanService/TestRunService don't collide with the
 *     cloned refs.
 */

import { asc, eq, inArray, sql } from 'drizzle-orm'
import {
  folders,
  projectRoles,
  projects,
  runAssignees,
  runCaseEvents,
  runCaseStepSnapshots,
  runDefectLinks,
  runStepResults,
  testCaseSteps,
  testCases,
  testPlanCases,
  testPlans,
  testRunCases,
  testRuns,
  users,
  type NewFolder,
  type NewProjectRole,
  type NewRunAssignee,
  type NewRunCaseEvent,
  type NewRunCaseStepSnapshot,
  type NewRunDefectLink,
  type NewRunStepResult,
  type NewTestCase,
  type NewTestCaseStep,
  type NewTestPlan,
  type NewTestPlanCase,
  type NewTestRun,
  type NewTestRunCase,
} from '../schema'
import { db } from '../src/index'
import { createId } from '../src/utils/id'
import type { ProjectSummary } from './ProjectService'

export interface CloneProjectInput {
  actorId: string
  sourceProjectId: string
  /** Optional overrides — a reasonable default slug/name is generated if omitted. */
  slug?: string
  name?: string
}

export type ProjectCloneErrorCode = 'PROJECT_NOT_FOUND' | 'INSUFFICIENT_PERMISSIONS' | 'DUPLICATE_SLUG'

export class ProjectCloneError extends Error {
  constructor(
    message: string,
    public readonly code: ProjectCloneErrorCode,
  ) {
    super(message)
    this.name = 'ProjectCloneError'
  }
}

function isDuplicateKeyError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'errno' in err &&
    (err as { errno: number }).errno === 1062
  )
}

export async function cloneProject(input: CloneProjectInput): Promise<ProjectSummary> {
  const { actorId, sourceProjectId } = input

  const [actor] = await db
    .select({ id: users.id, orgId: users.orgId, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, actorId))
    .limit(1)
  if (!actor?.isActive) {
    throw new ProjectCloneError('Insufficient permissions for this action.', 'INSUFFICIENT_PERMISSIONS')
  }

  const [source] = await db.select().from(projects).where(eq(projects.id, sourceProjectId)).limit(1)
  if (!source) {
    throw new ProjectCloneError('Source project not found.', 'PROJECT_NOT_FOUND')
  }

  const newProjectId = createId()
  // Sequential clone slugs: dp2, dp3, ... (keys DP2, DP3, ...) instead of a
  // random suffix — matches the old local clones' DP1/DP2 naming.
  let slug = input.slug
  if (!slug) {
    const existing = await db
      .select({ slug: projects.slug })
      .from(projects)
      .where(eq(projects.orgId, source.orgId))
    const taken = new Set(existing.map((p) => p.slug))
    let n = 2
    while (taken.has(`${source.slug}${n}`)) n += 1
    slug = `${source.slug}${n}`
  }
  // "Demo Project 2" for slug dp2, etc.; generic "(copy)" when the slug was
  // caller-supplied and doesn't follow the sequential pattern.
  const seqMatch = slug.startsWith(source.slug) ? slug.slice(source.slug.length) : ''
  const name =
    input.name ?? (/^\d+$/.test(seqMatch) ? `${source.name} ${seqMatch}` : `${source.name} (copy)`)

  const sourceFolders = await db.select().from(folders).where(eq(folders.projectId, sourceProjectId))
  const sourceCases = await db.select().from(testCases).where(eq(testCases.projectId, sourceProjectId))
  const sourceCaseIds = sourceCases.map((c) => c.id)
  const sourceSteps = sourceCaseIds.length
    ? await db.select().from(testCaseSteps).where(inArray(testCaseSteps.testCaseId, sourceCaseIds))
    : []
  const sourcePlans = await db.select().from(testPlans).where(eq(testPlans.projectId, sourceProjectId))
  const sourcePlanIds = sourcePlans.map((p) => p.id)
  const sourcePlanCases = sourcePlanIds.length
    ? await db.select().from(testPlanCases).where(inArray(testPlanCases.testPlanId, sourcePlanIds))
    : []
  const sourceRuns = await db
    .select()
    .from(testRuns)
    .where(eq(testRuns.projectId, sourceProjectId))
    .orderBy(asc(testRuns.createdAt))
  const sourceRunIds = sourceRuns.map((r) => r.id)
  const sourceRunCases = sourceRunIds.length
    ? await db.select().from(testRunCases).where(inArray(testRunCases.testRunId, sourceRunIds))
    : []
  const sourceRunCaseIds = sourceRunCases.map((rc) => rc.id)
  const sourceStepSnapshots = sourceRunCaseIds.length
    ? await db.select().from(runCaseStepSnapshots).where(inArray(runCaseStepSnapshots.testRunCaseId, sourceRunCaseIds))
    : []
  const sourceStepResults = sourceRunCaseIds.length
    ? await db.select().from(runStepResults).where(inArray(runStepResults.testRunCaseId, sourceRunCaseIds))
    : []
  const sourceDefectLinks = sourceRunCaseIds.length
    ? await db.select().from(runDefectLinks).where(inArray(runDefectLinks.testRunCaseId, sourceRunCaseIds))
    : []
  const sourceRunCaseEvents = sourceRunCaseIds.length
    ? await db.select().from(runCaseEvents).where(inArray(runCaseEvents.testRunCaseId, sourceRunCaseIds))
    : []
  const sourceRunAssignees = sourceRunIds.length
    ? await db.select().from(runAssignees).where(inArray(runAssignees.testRunId, sourceRunIds))
    : []

  const folderIdMap = new Map<string, string>(sourceFolders.map((f) => [f.id, createId()]))
  const caseIdMap = new Map<string, string>(sourceCases.map((c) => [c.id, createId()]))
  const stepIdMap = new Map<string, string>(sourceSteps.map((s) => [s.id, createId()]))
  const planIdMap = new Map<string, string>(sourcePlans.map((p) => [p.id, createId()]))
  const runIdMap = new Map<string, string>(sourceRuns.map((r) => [r.id, createId()]))
  const runCaseIdMap = new Map<string, string>(sourceRunCases.map((rc) => [rc.id, createId()]))
  const stepSnapshotIdMap = new Map<string, string>(sourceStepSnapshots.map((s) => [s.id, createId()]))

  const newFolders: NewFolder[] = sourceFolders.map((f) => ({
    ...f,
    id: folderIdMap.get(f.id)!,
    projectId: newProjectId,
    parentId: f.parentId ? folderIdMap.get(f.parentId) ?? null : null,
  }))

  const newCases: NewTestCase[] = sourceCases.map((c) => ({
    ...c,
    id: caseIdMap.get(c.id)!,
    projectId: newProjectId,
    folderId: c.folderId ? folderIdMap.get(c.folderId) ?? null : null,
  }))

  const newSteps: NewTestCaseStep[] = sourceSteps.map((s) => ({
    ...s,
    id: stepIdMap.get(s.id)!,
    testCaseId: caseIdMap.get(s.testCaseId)!,
  }))

  const newPlans: NewTestPlan[] = sourcePlans.map((p) => ({
    ...p,
    id: planIdMap.get(p.id)!,
    projectId: newProjectId,
    // GAP-01 Option (a): the query definition references source case/folder ids
    // (static caseIds / folder folderIds); remap them to the clone's fresh ids
    // so the copied plan resolves to the same cases. The '__unfiled__' sentinel
    // and condition groups (field/operator/value, no ids) pass through as-is.
    queryDefinition: p.queryDefinition
      ? p.queryDefinition.map((q) => ({
          ...q,
          ...(q.caseIds
            ? { caseIds: q.caseIds.map((id) => caseIdMap.get(id) ?? id) }
            : {}),
          ...(q.folderIds
            ? {
                folderIds: q.folderIds.map((id) =>
                  id === '__unfiled__' ? id : folderIdMap.get(id) ?? id,
                ),
              }
            : {}),
        }))
      : null,
  }))

  const newPlanCases: NewTestPlanCase[] = sourcePlanCases.map((pc) => ({
    ...pc,
    id: createId(),
    testPlanId: planIdMap.get(pc.testPlanId)!,
    testCaseId: caseIdMap.get(pc.testCaseId)!,
  }))

  const newRuns: NewTestRun[] = sourceRuns.map((r) => ({
    ...r,
    id: runIdMap.get(r.id)!,
    projectId: newProjectId,
    testPlanId: r.testPlanId ? planIdMap.get(r.testPlanId) ?? null : null,
  }))

  const newRunCases: NewTestRunCase[] = sourceRunCases.map((rc) => ({
    ...rc,
    id: runCaseIdMap.get(rc.id)!,
    testRunId: runIdMap.get(rc.testRunId)!,
    testCaseId: caseIdMap.get(rc.testCaseId)!,
  }))

  const newStepSnapshots: NewRunCaseStepSnapshot[] = sourceStepSnapshots.map((s) => ({
    ...s,
    id: stepSnapshotIdMap.get(s.id)!,
    testRunCaseId: runCaseIdMap.get(s.testRunCaseId)!,
    originalStepId: s.originalStepId ? stepIdMap.get(s.originalStepId) ?? null : null,
  }))

  const newStepResults: NewRunStepResult[] = sourceStepResults.map((s) => ({
    ...s,
    id: createId(),
    testRunCaseId: runCaseIdMap.get(s.testRunCaseId)!,
    stepSnapshotId: stepSnapshotIdMap.get(s.stepSnapshotId)!,
  }))

  const newDefectLinks: NewRunDefectLink[] = sourceDefectLinks.map((d) => ({
    ...d,
    id: createId(),
    testRunCaseId: runCaseIdMap.get(d.testRunCaseId)!,
    // Phase E: `defects` entities are not cloned (same deferred clone gap as
    // case_requirements/case_comments), so drop any internal FK to avoid the
    // clone referencing the SOURCE project's defect row. defect_ref (the DEF-<n>
    // key) is preserved, so the chip still renders as a plain ref. Proper fix
    // (clone defects + remap) is a later cleanup-pass item.
    defectId: null,
  }))

  const newRunCaseEvents: NewRunCaseEvent[] = sourceRunCaseEvents.map((e) => ({
    ...e,
    id: createId(),
    testRunCaseId: runCaseIdMap.get(e.testRunCaseId)!,
  }))

  const newRunAssignees: NewRunAssignee[] = sourceRunAssignees.map((a) => ({
    ...a,
    id: createId(),
    testRunId: runIdMap.get(a.testRunId)!,
  }))

  const actorRoleRow: NewProjectRole = {
    id: createId(),
    projectId: newProjectId,
    userId: actorId,
    role: 'admin',
    grantedBy: actorId,
  }

  const nextCaseNum =
    Math.max(
      0,
      ...sourceCases.map((c) => Number.parseInt(c.caseRef.replace(/^\D+/, ''), 10) || 0),
    ) + 1
  const nextRunNum =
    Math.max(
      0,
      ...sourceRuns.map((r) => Number.parseInt(r.runRef.replace(/^\D+/, ''), 10) || 0),
    ) + 1
  const nextPlanNum =
    Math.max(
      0,
      ...sourcePlans.map((p) => Number.parseInt(p.planRef.replace(/^\D+/, ''), 10) || 0),
    ) + 1

  try {
    await db.transaction(async (tx) => {
      await tx.insert(projects).values({
        id: newProjectId,
        orgId: source.orgId,
        slug,
        name,
        description: source.description,
        status: 'active',
        createdBy: actorId,
      })
      await tx.insert(projectRoles).values(actorRoleRow)
      if (newFolders.length) await tx.insert(folders).values(newFolders)
      if (newCases.length) await tx.insert(testCases).values(newCases)
      if (newSteps.length) await tx.insert(testCaseSteps).values(newSteps)
      if (newPlans.length) await tx.insert(testPlans).values(newPlans)
      if (newPlanCases.length) await tx.insert(testPlanCases).values(newPlanCases)
      if (newRuns.length) await tx.insert(testRuns).values(newRuns)
      if (newRunCases.length) await tx.insert(testRunCases).values(newRunCases)
      if (newStepSnapshots.length) await tx.insert(runCaseStepSnapshots).values(newStepSnapshots)
      if (newStepResults.length) await tx.insert(runStepResults).values(newStepResults)
      if (newDefectLinks.length) await tx.insert(runDefectLinks).values(newDefectLinks)
      if (newRunAssignees.length) await tx.insert(runAssignees).values(newRunAssignees)
      if (newRunCaseEvents.length) await tx.insert(runCaseEvents).values(newRunCaseEvents)

      await tx.execute(sql`
        INSERT INTO ref_counters (project_id, entity_type, next_value)
        VALUES (${newProjectId}, 'case', ${nextCaseNum}),
               (${newProjectId}, 'run', ${nextRunNum}),
               (${newProjectId}, 'plan', ${nextPlanNum})
      `)
    })
  } catch (err: unknown) {
    if (isDuplicateKeyError(err)) {
      throw new ProjectCloneError('A project with this slug already exists.', 'DUPLICATE_SLUG')
    }
    throw err
  }

  const [row] = await db.select().from(projects).where(eq(projects.id, newProjectId)).limit(1)
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    status: row.status,
  }
}
