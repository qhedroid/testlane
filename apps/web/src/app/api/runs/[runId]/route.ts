import { getRunDetail } from '@testlane/db/services/run-read'
import { updateRun } from '@testlane/db/services/test-run'
import { resolveActor } from '@/lib/api/auth'
import { handleRouteError } from '@/lib/api/errors'
import { getRunDetailQuerySchema, updateRunBodySchema } from '@/lib/api/schemas'
import { jsonSuccess } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ runId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await resolveActor(request)
    const { runId } = await context.params
    const { searchParams } = new URL(request.url)
    const query = getRunDetailQuerySchema.parse({
      projectId: searchParams.get('projectId') ?? undefined,
    })

    const detail = await getRunDetail({
      actorId: actor.id,
      projectId: query.projectId,
      runId,
    })

    return jsonSuccess(detail)
  } catch (err) {
    return handleRouteError(err)
  }
}

/**
 * Patch a run's lifecycle status (seal / reopen / archive) and/or small
 * metadata fields (title, dueDate). Phase 4 (mvp-backend) — the fresh
 * RunsScreen's seal/unseal/archive/edit write-through lands here. Runs are
 * never hard-deleted; the frontend's "delete run" maps to status='archived'.
 */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await resolveActor(request)
    const { runId } = await context.params
    const body = updateRunBodySchema.parse(await request.json())

    const result = await updateRun({
      projectId: body.projectId,
      runId,
      actorId: actor.id,
      status: body.status,
      title: body.title,
      description: body.description,
      dueDate: body.dueDate,
    })

    return jsonSuccess(result)
  } catch (err) {
    return handleRouteError(err)
  }
}
