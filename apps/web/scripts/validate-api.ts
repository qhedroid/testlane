/**
 * HTTP API validation — requires the app server on port 3000.
 * Run: pnpm dev (or pnpm start) in another terminal, then pnpm api:validate
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'
import { eq } from 'drizzle-orm'
import { getDb, closeDb } from '@testlane/db'
import { testRuns } from '@testlane/db/schema'
import { ids, runSeed, seedRefs } from '@testlane/db/seed'

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
    query?: Record<string, string>
  } = {},
): Promise<{ status: number; json: Record<string, unknown> }> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (options.userId) {
    headers['x-relay-user-id'] = options.userId
  }

  let url = `${BASE_URL}${path}`
  if (options.query) {
    url += `?${new URLSearchParams(options.query).toString()}`
  }

  const res = await fetch(url, {
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
    userId: ids.users.sam,
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

  console.log('[api] GET /api/runs — missing projectId…')
  const listNoProject = await request('GET', '/api/runs', {
    userId: ids.users.sam,
  })
  assert(listNoProject.status === 400, `expected 400, got ${listNoProject.status}`)

  console.log('[api] GET /api/runs — viewer can list…')
  const listRes = await request('GET', '/api/runs', {
    userId: ids.users.sam,
    query: { projectId: seedRefs.projectId },
  })
  assert(listRes.status === 200, `expected 200, got ${listRes.status}`)
  const runs = (listRes.json.data as { runs?: Array<{ id: string }> })?.runs ?? []
  assert(
    runs.some((r) => r.id === run.id),
    'created run should appear in project run list',
  )

  console.log('[api] GET /api/runs/:runId — cross-project blocked…')
  const wrongProject = await request('GET', `/api/runs/${run.id}`, {
    userId: ids.users.sam,
    query: { projectId: ids.projects.etmf },
  })
  assert(wrongProject.status === 404, `expected 404, got ${wrongProject.status}`)
  assert(
    (wrongProject.json.error as { code?: string })?.code === 'RUN_NOT_FOUND',
    'expected RUN_NOT_FOUND',
  )

  console.log('[api] GET /api/runs/:runId — viewer can read detail…')
  const detailRes = await request('GET', `/api/runs/${run.id}`, {
    userId: ids.users.sam,
    query: { projectId: seedRefs.projectId },
  })
  assert(detailRes.status === 200, `expected 200, got ${detailRes.status}`)
  const detail = detailRes.json.data as {
    testRunCases?: Array<{ testRunCaseId: string }>
    caseCounts?: { total: number }
  }
  assert(
    (detail.testRunCases?.length ?? 0) >= 2,
    'detail should include test run cases',
  )
  assert(!!detail.testRunCases?.[0]?.testRunCaseId, 'testRunCaseId required for result API')
  assert((detail.caseCounts?.total ?? 0) >= 2, 'caseCounts.total should match cases')

  const cases = detail.testRunCases!
  const runCaseIdFromDetail = cases[0].testRunCaseId
  assert(cases.length >= 2, 'expected at least 2 run cases')

  console.log('[api] POST result — update to pass…')
  const passRes = await request(
    'POST',
    `/api/runs/${run.id}/cases/${runCaseIdFromDetail}/result`,
    {
      userId: ids.users.elena,
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
    `/api/runs/${run.id}/cases/${cases[1].testRunCaseId}/result`,
    {
      userId: ids.users.elena,
      body: {
        status: 'fail',
        comment: 'API validation failure note',
      },
    },
  )
  assert(failRes.status === 200, `expected 200, got ${failRes.status}`)

  console.log('[api] GET detail — comment persisted on run case…')
  const detailAfterComment = await request(
    'GET',
    `/api/runs/${run.id}`,
    {
      userId: ids.users.elena,
      query: { projectId: seedRefs.projectId },
    },
  )
  assert(detailAfterComment.status === 200, `expected 200, got ${detailAfterComment.status}`)
  const casesAfter = (
    detailAfterComment.json.data as {
      testRunCases?: Array<{ testRunCaseId: string; comment: string | null }>
    }
  ).testRunCases
  const commented = casesAfter?.find((c) => c.testRunCaseId === cases[1].testRunCaseId)
  assert(
    commented?.comment === 'API validation failure note',
    `expected persisted comment, got ${commented?.comment ?? 'null'}`,
  )

  console.log('[api] POST result — viewer blocked…')
  const viewerUpdate = await request(
    'POST',
    `/api/runs/${run.id}/cases/${runCaseIdFromDetail}/result`,
    {
      userId: ids.users.sam,
      body: { status: 'blocked' },
    },
  )
  assert(viewerUpdate.status === 403, `expected 403, got ${viewerUpdate.status}`)

  console.log('[api] POST result — invalid payload…')
  const invalidUpdate = await request(
    'POST',
    `/api/runs/${run.id}/cases/${runCaseIdFromDetail}/result`,
    {
      userId: ids.users.elena,
      body: { status: 'invalid_status' },
    },
  )
  assert(invalidUpdate.status === 400, `expected 400, got ${invalidUpdate.status}`)

  console.log('[api] POST result — sealed run blocked…')
  const db = getDb()
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
    `/api/runs/${run.id}/cases/${runCaseIdFromDetail}/result`,
    {
      userId: ids.users.elena,
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
