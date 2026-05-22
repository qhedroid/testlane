/**
 * Validates ExecutionService.updateCaseResult() against seeded data.
 * Run: pnpm db:validate-update-case-result
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'
import { and, asc, count, eq } from 'drizzle-orm'
import { auditLog, testRunCases, testRuns } from '../../schema'
import { closeDb, getDb } from '../index'
import { ids, seedRefs } from '../seed/ids'
import { runSeed } from '../seed/index'
import { createRun } from '../../services/TestRunService'
import {
  updateCaseResult,
  UpdateCaseResultError,
} from '../../services/ExecutionService'

const monorepoRoot = path.resolve(process.cwd(), '../..')
loadEnv({ path: path.join(monorepoRoot, '.env') })
loadEnv({ path: path.join(monorepoRoot, '.env.local'), override: true })

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`)
}

async function main(): Promise<void> {
  console.log('[validate] Resetting seed data…')
  await runSeed()

  const db = getDb()

  console.log('[validate] Creating run via TestRunService.create()…')
  const run = await createRun({
    projectId: seedRefs.projectId,
    testPlanId: seedRefs.testPlanId,
    createdBy: seedRefs.createdBy,
  })

  const cases = await db
    .select({
      id: testRunCases.id,
      position: testRunCases.position,
      snapshotCaseRef: testRunCases.snapshotCaseRef,
      snapshotTitle: testRunCases.snapshotTitle,
      snapshotPriority: testRunCases.snapshotPriority,
      snapshotFolderName: testRunCases.snapshotFolderName,
    })
    .from(testRunCases)
    .where(eq(testRunCases.testRunId, run.id))
    .orderBy(asc(testRunCases.position))

  assert(cases.length >= 2, 'need at least 2 run cases from seed plan')

  const casePass = cases[0]
  const caseFail = cases[1]
  const snapshotBefore = { ...casePass }

  console.log('[validate] RBAC: viewer blocked…')
  try {
    await updateCaseResult({
      projectId: seedRefs.projectId,
      testRunId: run.id,
      testRunCaseId: casePass.id,
      actorId: ids.users.viewer,
      status: 'pass',
    })
    throw new Error('Expected INSUFFICIENT_PERMISSIONS for viewer')
  } catch (err) {
    assert(
      err instanceof UpdateCaseResultError &&
        err.code === 'INSUFFICIENT_PERMISSIONS',
      `viewer RBAC: ${err}`,
    )
    console.log('[validate] Viewer blocked OK')
  }

  console.log('[validate] Contributor updates case to pass…')
  const passResult = await updateCaseResult({
    projectId: seedRefs.projectId,
    testRunId: run.id,
    testRunCaseId: casePass.id,
    actorId: ids.users.priya,
    status: 'pass',
  })
  assert(passResult.status === 'pass', 'status should be pass')
  assert(passResult.executedBy === ids.users.priya, 'executed_by set')

  console.log('[validate] Contributor updates case to fail with comment…')
  const failResult = await updateCaseResult({
    projectId: seedRefs.projectId,
    testRunId: run.id,
    testRunCaseId: caseFail.id,
    actorId: ids.users.priya,
    status: 'fail',
    comment: 'Login button unresponsive after SSO redirect',
  })
  assert(failResult.status === 'fail', 'status should be fail')
  assert(
    failResult.comment === 'Login button unresponsive after SSO redirect',
    'comment should be saved',
  )

  const [casePassAfter] = await db
    .select({
      snapshotCaseRef: testRunCases.snapshotCaseRef,
      snapshotTitle: testRunCases.snapshotTitle,
      snapshotPriority: testRunCases.snapshotPriority,
      snapshotFolderName: testRunCases.snapshotFolderName,
      status: testRunCases.status,
    })
    .from(testRunCases)
    .where(eq(testRunCases.id, casePass.id))
    .limit(1)

  assert(
    casePassAfter.snapshotCaseRef === snapshotBefore.snapshotCaseRef,
    'snapshotCaseRef mutated',
  )
  assert(
    casePassAfter.snapshotTitle === snapshotBefore.snapshotTitle,
    'snapshotTitle mutated',
  )
  assert(
    casePassAfter.snapshotPriority === snapshotBefore.snapshotPriority,
    'snapshotPriority mutated',
  )
  assert(
    casePassAfter.snapshotFolderName === snapshotBefore.snapshotFolderName,
    'snapshotFolderName mutated',
  )
  assert(casePassAfter.status === 'pass', 'result status not persisted')

  const [resultAuditCount] = await db
    .select({ n: count() })
    .from(auditLog)
    .where(
      and(
        eq(auditLog.entityType, 'test_run_case'),
        eq(auditLog.action, 'result.updated'),
      ),
    )
  assert(resultAuditCount.n >= 2, `expected >=2 result.updated audits, got ${resultAuditCount.n}`)

  console.log('[validate] Sealed run rejects updates…')
  await db
    .update(testRuns)
    .set({ status: 'sealed', sealedAt: new Date(), sealedBy: seedRefs.createdBy })
    .where(eq(testRuns.id, run.id))

  try {
    await updateCaseResult({
      projectId: seedRefs.projectId,
      testRunId: run.id,
      testRunCaseId: casePass.id,
      actorId: ids.users.priya,
      status: 'blocked',
    })
    throw new Error('Expected RUN_NOT_EXECUTABLE on sealed run')
  } catch (err) {
    assert(
      err instanceof UpdateCaseResultError &&
        err.code === 'RUN_NOT_EXECUTABLE',
      `sealed run: ${err}`,
    )
    console.log('[validate] Sealed run blocked OK')
  }

  console.log('[validate] skipped alias maps to skip…')
  await db
    .update(testRuns)
    .set({ status: 'active', sealedAt: null, sealedBy: null })
    .where(eq(testRuns.id, run.id))

  const skipResult = await updateCaseResult({
    projectId: seedRefs.projectId,
    testRunId: run.id,
    testRunCaseId: cases[2]?.id ?? caseFail.id,
    actorId: ids.users.priya,
    status: 'skipped',
  })
  assert(skipResult.status === 'skip', 'skipped should map to skip')

  console.log('[validate] All checks passed.')
}

async function run(): Promise<void> {
  try {
    await main()
  } catch (err) {
    console.error('[validate] Failed:', err instanceof Error ? err.message : err)
    process.exitCode = 1
  } finally {
    await closeDb()
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void run()
}
