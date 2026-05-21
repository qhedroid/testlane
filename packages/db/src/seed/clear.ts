import { eq, inArray, sql } from 'drizzle-orm'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import {
  auditLog,
  folders,
  organisations,
  projectRoles,
  projects,
  runAssignees,
  runCaseStepSnapshots,
  runDefectLinks,
  runExecutionComments,
  runStepResults,
  testCaseSteps,
  testCases,
  testPlanCases,
  testPlans,
  testRunCases,
  testRuns,
  users,
} from '../../schema'
import type * as schema from '../../schema'
import { SEED_ORG_SLUG } from './ids'

export async function clearSeedData(
  db: MySql2Database<typeof schema>,
): Promise<void> {
  const [org] = await db
    .select({ id: organisations.id })
    .from(organisations)
    .where(eq(organisations.slug, SEED_ORG_SLUG))
    .limit(1)

  if (!org) return

  const orgProjects = await db
    .select({ id: projects.id })
    .from(projects)
    .where(eq(projects.orgId, org.id))

  const projectIds = orgProjects.map((p) => p.id)
  if (projectIds.length === 0) {
    await db.delete(users).where(eq(users.orgId, org.id))
    await db.delete(organisations).where(eq(organisations.id, org.id))
    return
  }

  const orgRuns = await db
    .select({ id: testRuns.id })
    .from(testRuns)
    .where(inArray(testRuns.projectId, projectIds))
  const runIds = orgRuns.map((r) => r.id)

  if (runIds.length > 0) {
    const runCases = await db
      .select({ id: testRunCases.id })
      .from(testRunCases)
      .where(inArray(testRunCases.testRunId, runIds))
    const runCaseIds = runCases.map((c) => c.id)

    if (runCaseIds.length > 0) {
      await db
        .delete(runExecutionComments)
        .where(inArray(runExecutionComments.testRunCaseId, runCaseIds))
      await db
        .delete(runDefectLinks)
        .where(inArray(runDefectLinks.testRunCaseId, runCaseIds))
      await db
        .delete(runStepResults)
        .where(inArray(runStepResults.testRunCaseId, runCaseIds))
      await db
        .delete(runCaseStepSnapshots)
        .where(inArray(runCaseStepSnapshots.testRunCaseId, runCaseIds))
      await db.delete(testRunCases).where(inArray(testRunCases.id, runCaseIds))
    }

    await db.delete(runAssignees).where(inArray(runAssignees.testRunId, runIds))
    await db.delete(testRuns).where(inArray(testRuns.id, runIds))
  }

  const orgPlans = await db
    .select({ id: testPlans.id })
    .from(testPlans)
    .where(inArray(testPlans.projectId, projectIds))
  const planIds = orgPlans.map((p) => p.id)

  if (planIds.length > 0) {
    await db.delete(testPlanCases).where(inArray(testPlanCases.testPlanId, planIds))
    await db.delete(testPlans).where(inArray(testPlans.id, planIds))
  }

  const orgCases = await db
    .select({ id: testCases.id })
    .from(testCases)
    .where(inArray(testCases.projectId, projectIds))
  const caseIds = orgCases.map((c) => c.id)

  if (caseIds.length > 0) {
    await db.delete(testCaseSteps).where(inArray(testCaseSteps.testCaseId, caseIds))
    await db.delete(testCases).where(inArray(testCases.id, caseIds))
  }

  await db.delete(folders).where(inArray(folders.projectId, projectIds))
  await db.delete(projectRoles).where(inArray(projectRoles.projectId, projectIds))
  await db.delete(auditLog).where(eq(auditLog.orgId, org.id))

  for (const projectId of projectIds) {
    await db.execute(
      sql`DELETE FROM ref_counters WHERE project_id = ${projectId}`,
    )
  }

  await db.delete(projects).where(inArray(projects.id, projectIds))
  await db.delete(users).where(eq(users.orgId, org.id))
  await db.delete(organisations).where(eq(organisations.id, org.id))
}
