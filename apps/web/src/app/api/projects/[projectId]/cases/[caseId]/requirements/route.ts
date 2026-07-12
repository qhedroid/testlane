import { linkRequirementToCase } from '@relay/db/services/requirement'
import { resolveSessionActor } from '@/lib/api/session'
import { handleRouteError } from '@/lib/api/errors'
import { linkRequirementBodySchema } from '@/lib/api/schemas'
import { jsonSuccess } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ projectId: string; caseId: string }>
}

/**
 * POST — link a requirement to this test case (new-tables candidate, Phase D).
 * Body: { requirementId }. Idempotent — re-linking an existing pair is a no-op.
 * No DELETE (unlink): the Requirements/Cases UI has no unlink action today.
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await resolveSessionActor(request)
    const { projectId, caseId } = await context.params
    const body = linkRequirementBodySchema.parse(await request.json())

    const result = await linkRequirementToCase({
      actorId: actor.id,
      projectId,
      caseId,
      requirementId: body.requirementId,
    })

    return jsonSuccess(result, 201)
  } catch (err) {
    return handleRouteError(err)
  }
}
