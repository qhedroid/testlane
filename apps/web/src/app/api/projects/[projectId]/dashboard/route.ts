import { getDashboardSummary } from '@relay/db/services/dashboard'
import { resolveSessionActor } from '@/lib/api/session'
import { handleRouteError } from '@/lib/api/errors'
import { jsonSuccess } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ projectId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await resolveSessionActor(request)
    const { projectId } = await context.params

    const summary = await getDashboardSummary(actor.id, projectId)

    return jsonSuccess(summary)
  } catch (err) {
    return handleRouteError(err)
  }
}
