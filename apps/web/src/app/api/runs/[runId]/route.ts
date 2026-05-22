import { getRunDetail } from '@relay/db/services/run-read'
import { resolveActor } from '@/lib/api/auth'
import { handleRouteError } from '@/lib/api/errors'
import { getRunDetailQuerySchema } from '@/lib/api/schemas'
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
