import { eq } from 'drizzle-orm'
import { requirements } from '../../schema'
import { getDb } from '../index'

export async function getRequirementProjectId(
  requirementId: string,
): Promise<string | null> {
  const [requirement] = await getDb()
    .select({ projectId: requirements.projectId })
    .from(requirements)
    .where(eq(requirements.id, requirementId))
    .limit(1)

  return requirement?.projectId ?? null
}
