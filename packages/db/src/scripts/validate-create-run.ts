/**
 * Local validation script for TestRunService.create()
 * Run: pnpm db:validate-create-run (from repo root)
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'
import { count, eq } from 'drizzle-orm'
import {
  auditLog,
  runAssignees,
  runCaseStepSnapshots,
  runStepResults,
  testRunCases,
  testRuns,
} from '../../schema'
import { closeDb, getDb } from '../index'
import { ids, seedRefs } from '../seed/ids'
import {
  createRun,
  RunCreationError,
} from '../../services/TestRunService'

const monorepoRoot = path.resolve(process.cwd(), '../..')
loadEnv({ path: path.join(monorepoRoot, '.env') })
loadEnv({ path: path.join(monorepoRoot, '.env.local'), override: true })

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`)
}

async function main(): Promise<void> {
  const db = getDb()

  console.log('[validate] RBAC: contributor must not spawn runs…')
  try {
    await createRun({
      projectId: seedRefs.projectId,
      testPlanId: seedRefs.testPlanId,
      createdBy: ids.users.priya,
    })
    throw new Error('Expected INSUFFICIENT_PERMISSIONS for contributor')
  } catch (err) {
    assert(
      err instanceof RunCreationError &&
        err.code === 'INSUFFICIENT_PERMISSIONS',
      `Expected RunCreationError INSUFFICIENT_PERMISSIONS, got ${err}`,
    )
    console.log('[validate] RBAC gate OK')
  }

  console.log('[validate] createRun from seeded CTMS plan…')
  const result = await createRun({
    projectId: seedRefs.projectId,
    testPlanId: seedRefs.testPlanId,
    createdBy: seedRefs.createdBy,
    assigneeIds: [ids.users.shaun, ids.users.priya],
  })

  console.log('[validate] Result:', result)

  assert(result.status === 'active', 'run status must be active')
  assert(result.caseCount === 4, `expected 4 cases, got ${result.caseCount}`)
  assert(result.stepCount === 6, `expected 6 step snapshots, got ${result.stepCount}`)
  assert(/^RUN-\d{4}$/.test(result.runRef), `unexpected runRef ${result.runRef}`)

  const [run] = await db
    .select()
    .from(testRuns)
    .where(eq(testRuns.id, result.id))
    .limit(1)
  assert(!!run, 'test_runs row missing')
  assert(run.testPlanId === seedRefs.testPlanId, 'test_plan_id mismatch')

  const [caseCount] = await db
    .select({ n: count() })
    .from(testRunCases)
    .where(eq(testRunCases.testRunId, result.id))
  assert(caseCount.n === 4, `test_run_cases count ${caseCount.n}`)

  const runCaseIds = await db
    .select({ id: testRunCases.id })
    .from(testRunCases)
    .where(eq(testRunCases.testRunId, result.id))

  let totalSnapshots = 0
  for (const rc of runCaseIds) {
    const [row] = await db
      .select({ n: count() })
      .from(runCaseStepSnapshots)
      .where(eq(runCaseStepSnapshots.testRunCaseId, rc.id))
    totalSnapshots += row.n
  }
  assert(totalSnapshots === 6, `run_case_step_snapshots total ${totalSnapshots}`)

  const [assigneeCount] = await db
    .select({ n: count() })
    .from(runAssignees)
    .where(eq(runAssignees.testRunId, result.id))
  assert(assigneeCount.n === 2, `run_assignees count ${assigneeCount.n}`)

  const [auditRows] = await db
    .select({ n: count() })
    .from(auditLog)
    .where(eq(auditLog.entityId, result.id))
  assert(auditRows.n === 1, `audit_log count ${auditRows.n}`)

  const [stepResultCount] = await db
    .select({ n: count() })
    .from(runStepResults)
    .where(eq(runStepResults.testRunCaseId, runCaseIds[0].id))
  let totalStepResults = 0
  for (const rc of runCaseIds) {
    const [row] = await db
      .select({ n: count() })
      .from(runStepResults)
      .where(eq(runStepResults.testRunCaseId, rc.id))
    totalStepResults += row.n
  }
  assert(totalStepResults === 0, `run_step_results must be empty, got ${totalStepResults}`)

  // Snapshot immutability spot-check: all cases not_run
  const cases = await db
    .select({ status: testRunCases.status, snapshotTitle: testRunCases.snapshotTitle })
    .from(testRunCases)
    .where(eq(testRunCases.testRunId, result.id))
  assert(
    cases.every((c) => c.status === 'not_run'),
    'all run cases should be pre-populated not_run',
  )
  assert(
    cases.some((c) => c.snapshotTitle.includes('study')),
    'snapshot title should be copied from source case',
  )

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
