/**
 * HTTP API validation — requires the app server on port 3000.
 * Run: pnpm dev (or pnpm start) in another terminal, then pnpm api:validate
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'
import { asc, eq } from 'drizzle-orm'
import { getDb, closeDb } from '@relay/db'
import { testRunCases, testRuns } from '@relay/db/schema'
import { ids, runSeed, seedRefs } from '@relay/db/seed'

const monorepoRoot = path.resolve(process.cwd(), '../..')
loadEnv({ path: path.join(monorepoRoot, '.env') })
loadEnv({ path: path.join(monorepoRoot, '.env.local'), override: true })

const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:3000'

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`Assertion failed: ${message}`)
}

async function request(
  method: string,
  path: string,
  options: {
    userId?: string
    body?: unknown
  } = {},
): Promise<{ status: number; json: Record<string, unknown> }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (options.userId) {
    headers['x-relay-user-id'] = options.userId
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  const json = (await res.json()) as Record<string, unknown>
  return { status: res.status, json }
}

async function assertServerReady(): Promise<void> {
  let health: Response
  try {
    health = await fetch(`${BASE_URL}/api/health`)
  } catch {
    throw new Error(
      `Cannot connect to ${BASE_URL}. In another terminal run: pnpm dev\n` +
        `(If port 3000 is in use but broken, run: pnpm dev:reset && pnpm dev)`,
    )
  }

  if (!health.ok) {
    const body = await health.text()
    const brokenNext =
      body.includes('<!DOCTYPE') ||
      body.includes('vendor-chunks') ||
      body.includes('Cannot find module')
    const hint = brokenNext
      ? '\nFix: pnpm dev:reset   then   pnpm dev'
      : '\nCheck: docker compose ps   and   curl -s http://localhost:3000/api/health'
    throw new Error(
      `GET /api/health returned HTTP ${health.status} (expected 200).${hint}`,
    )
  }
}

async function main(): Promise<void> {
  console.log(`[api] Checking server at ${BASE_URL}…`)
  await assertServerReady()

  console.log('[api] Seeding database…')
  await runSeed()

  console.log('[api] POST /api/runs — viewer blocked…')
  const viewerCreate = await request('POST', '/api/runs', {
    userId: ids.users.viewer,
    body: {
      projectId: seedRefs.projectId,
      testPlanId: seedRefs.testPlanId,
    },
  })
  assert(viewerCreate.status === 403, `expected 403, got ${viewerCreate.status}`)
  assert(
    (viewerCreate.json.error as { code?: string })?.code ===
      'INSUFFICIENT_PERMISSIONS',
    'expected INSUFFICIENT_PERMISSIONS',
  )

  console.log('[api] POST /api/runs — invalid payload…')
  const invalidCreate = await request('POST', '/api/runs', {
    userId: seedRefs.createdBy,
    body: { testPlanId: seedRefs.testPlanId },
  })
  assert(invalidCreate.status === 400, `expected 400, got ${invalidCreate.status}`)
  assert(
    (invalidCreate.json.error as { code?: string })?.code === 'VALIDATION_ERROR',
    'expected VALIDATION_ERROR',
  )

  console.log('[api] POST /api/runs — create run…')
  const create = await request('POST', '/api/runs', {
    userId: seedRefs.createdBy,
    body: {
      projectId: seedRefs.projectId,
      testPlanId: seedRefs.testPlanId,
    },
  })
  assert(create.status === 201, `expected 201, got ${create.status}`)
  const run = (create.json.data as { id: string; runRef: string }) ?? {}
  assert(!!run.id, 'missing run id in response')

  const db = getDb()
  const cases = await db
    .select({ id: testRunCases.id })
    .from(testRunCases)
    .where(eq(testRunCases.testRunId, run.id))
    .orderBy(asc(testRunCases.position))
  assert(cases.length >= 2, 'expected at least 2 run cases')

  console.log('[api] POST result — update to pass…')
  const passRes = await request(
    'POST',
    `/api/runs/${run.id}/cases/${cases[0].id}/result`,
    {
      userId: ids.users.priya,
      body: { status: 'pass' },
    },
  )
  assert(passRes.status === 200, `expected 200, got ${passRes.status}`)
  assert(
    (passRes.json.data as { status?: string })?.status === 'pass',
    'status should be pass',
  )

  console.log('[api] POST result — update to fail with comment…')
  const failRes = await request(
    'POST',
    `/api/runs/${run.id}/cases/${cases[1].id}/result`,
    {
      userId: ids.users.priya,
      body: {
        status: 'fail',
        comment: 'API validation failure note',
      },
    },
  )
  assert(failRes.status === 200, `expected 200, got ${failRes.status}`)

  console.log('[api] POST result — viewer blocked…')
  const viewerUpdate = await request(
    'POST',
    `/api/runs/${run.id}/cases/${cases[0].id}/result`,
    {
      userId: ids.users.viewer,
      body: { status: 'blocked' },
    },
  )
  assert(viewerUpdate.status === 403, `expected 403, got ${viewerUpdate.status}`)

  console.log('[api] POST result — invalid payload…')
  const invalidUpdate = await request(
    'POST',
    `/api/runs/${run.id}/cases/${cases[0].id}/result`,
    {
      userId: ids.users.priya,
      body: { status: 'invalid_status' },
    },
  )
  assert(invalidUpdate.status === 400, `expected 400, got ${invalidUpdate.status}`)

  console.log('[api] POST result — sealed run blocked…')
  await db
    .update(testRuns)
    .set({
      status: 'sealed',
      sealedAt: new Date(),
      sealedBy: seedRefs.createdBy,
    })
    .where(eq(testRuns.id, run.id))

  const sealedRes = await request(
    'POST',
    `/api/runs/${run.id}/cases/${cases[0].id}/result`,
    {
      userId: ids.users.priya,
      body: { status: 'blocked' },
    },
  )
  assert(sealedRes.status === 409, `expected 409, got ${sealedRes.status}`)
  assert(
    (sealedRes.json.error as { code?: string })?.code === 'RUN_NOT_EXECUTABLE',
    'expected RUN_NOT_EXECUTABLE',
  )

  console.log('[api] All checks passed.')
  console.log(`[api] Created run: ${run.runRef} (${run.id})`)
}

async function run(): Promise<void> {
  try {
    await main()
  } catch (err) {
    console.error('[api] Failed:', err instanceof Error ? err.message : err)
    process.exitCode = 1
  } finally {
    await closeDb()
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void run()
}
