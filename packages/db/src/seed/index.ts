import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { config as loadEnv } from 'dotenv'
import { closeDb, getDb } from '../index'
import { clearSeedData } from './clear'
import { ids, seedRefs, SEED_ORG_SLUG } from './ids'
import { insertSeedData } from './insert'

const monorepoRoot = path.resolve(process.cwd(), '../..')
loadEnv({ path: path.join(monorepoRoot, '.env') })
loadEnv({ path: path.join(monorepoRoot, '.env.local'), override: true })

function assertLocalDatabase(): void {
  const url = process.env.DATABASE_URL ?? ''
  if (
    !url.includes('127.0.0.1') &&
    !url.includes('localhost') &&
    process.env.ALLOW_REMOTE_SEED !== 'true'
  ) {
    throw new Error(
      'Seed is restricted to local databases (127.0.0.1 / localhost). ' +
        'Set ALLOW_REMOTE_SEED=true to override.',
    )
  }
}

export async function runSeed(): Promise<void> {
  assertLocalDatabase()
  const db = getDb()

  console.log(`[seed] Clearing existing "${SEED_ORG_SLUG}" data…`)
  await clearSeedData(db)

  console.log('[seed] Inserting development data…')
  await insertSeedData(db)

  console.log('[seed] Done.')
  console.log('')
  console.log('Organisation:', SEED_ORG_SLUG)
  console.log('Users: 6 (Noel, Shaun, Priya, Marcus, James, Alex Viewer)')
  console.log('Projects: CTMS, eTMF, Viewer, SSO/IAM, Reporting, API Gateway')
  console.log('CTMS plan:', ids.plans.ctmsRegression, '(PLAN-001, active, 4 cases)')
  console.log('')
  console.log('TestRunService.create() inputs:')
  console.log('  projectId:', seedRefs.projectId)
  console.log('  testPlanId:', seedRefs.testPlanId)
  console.log('  createdBy:', seedRefs.createdBy, '(Shaun Sevume, admin)')
}

async function main(): Promise<void> {
  try {
    await runSeed()
  } catch (err) {
    console.error('[seed] Failed:', err instanceof Error ? err.message : err)
    process.exitCode = 1
  } finally {
    await closeDb()
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main()
}
