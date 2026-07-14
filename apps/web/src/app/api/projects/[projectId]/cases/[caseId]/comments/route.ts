import { addCaseComment } from '@testlane/db/services/test-case'
import { resolveSessionActor } from '@/lib/api/session'
import { handleRouteError } from '@/lib/api/errors'
import { createCaseCommentBodySchema } from '@/lib/api/schemas'
import { jsonSuccess } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ projectId: string; caseId: string }>
}

/**
 * Add a comment to a test-case definition (new-tables candidate, Phase C).
 * Body: { stepId?: string | null, body: string } — stepId null/omitted creates
 * a general/case-level comment; a step id creates a step comment. The author is
 * the session actor (never sent by the client).
 */
export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await resolveSessionActor(request)
    const { projectId, caseId } = await context.params
    const body = createCaseCommentBodySchema.parse(await request.json())

    const created = await addCaseComment({
      actorId: actor.id,
      projectId,
      caseId,
      stepId: body.stepId ?? null,
      body: body.body,
    })

    return jsonSuccess(created, 201)
  } catch (err) {
    return handleRouteError(err)
  }
}
