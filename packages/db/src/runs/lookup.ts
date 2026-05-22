import { eq } from 'drizzle-orm'
import { testRuns } from '../../schema'
import { getDb } from '../index'

export async function getRunProjectId(runId: string): Promise<string | null> {
  const [run] = await getDb()
    .select({ projectId: testRuns.projectId })
    .from(testRuns)
    .where(eq(testRuns.id, runId))
    .limit(1)

  return run?.projectId ?? null
}
