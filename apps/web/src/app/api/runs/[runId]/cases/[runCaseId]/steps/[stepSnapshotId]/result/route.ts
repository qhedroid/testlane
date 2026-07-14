import { updateStepResult } from '@testlane/db/services/execution'
import { resolveActor } from '@/lib/api/auth'
import { handleRouteError } from '@/lib/api/errors'
import { getRunProjectId } from '@testlane/db'
import { stepResultBodySchema } from '@/lib/api/schemas'
import { jsonError, jsonSuccess } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ runId: string; runCaseId: string; stepSnapshotId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await resolveActor(request)
    const { runId, runCaseId, stepSnapshotId } = await context.params
    const body = stepResultBodySchema.parse(await request.json())

    const projectId = await getRunProjectId(runId)
    if (!projectId) {
      return jsonError('RUN_NOT_FOUND', `Test run not found: ${runId}`, 404)
    }

    const result = await updateStepResult({
      projectId,
      testRunId: runId,
      testRunCaseId: runCaseId,
      stepSnapshotId,
      actorId: actor.id,
      status: body.status,
      comment: body.comment,
    })

    return jsonSuccess(result)
  } catch (err) {
    return handleRouteError(err)
  }
}
