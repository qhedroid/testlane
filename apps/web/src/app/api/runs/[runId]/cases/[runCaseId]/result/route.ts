import { updateCaseResult } from '@relay/db/services/execution'
import { resolveActor } from '@/lib/api/auth'
import { handleRouteError } from '@/lib/api/errors'
import { getRunProjectId } from '@relay/db'
import { updateCaseResultBodySchema } from '@/lib/api/schemas'
import { jsonError, jsonSuccess } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ runId: string; runCaseId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await resolveActor(request)
    const { runId, runCaseId } = await context.params
    const body = updateCaseResultBodySchema.parse(await request.json())

    const projectId = await getRunProjectId(runId)
    if (!projectId) {
      return jsonError('RUN_NOT_FOUND', `Test run not found: ${runId}`, 404)
    }

    const result = await updateCaseResult({
      projectId,
      testRunId: runId,
      testRunCaseId: runCaseId,
      actorId: actor.id,
      status: body.status,
      comment: body.comment,
    })

    return jsonSuccess(result)
  } catch (err) {
    return handleRouteError(err)
  }
}
