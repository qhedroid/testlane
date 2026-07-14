import { listAuditLog } from '@testlane/db/services/audit'
import { resolveSessionActor } from '@/lib/api/session'
import { handleRouteError } from '@/lib/api/errors'
import { listAuditLogQuerySchema } from '@/lib/api/schemas'
import { jsonSuccess } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ projectId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await resolveSessionActor(request)
    const { projectId } = await context.params
    const { searchParams } = new URL(request.url)
    const query = listAuditLogQuerySchema.parse({
      limit: searchParams.get('limit') ?? undefined,
      before: searchParams.get('before') ?? undefined,
    })

    const entries = await listAuditLog({
      actorId: actor.id,
      projectId,
      limit: query.limit,
      before: query.before,
    })

    return jsonSuccess({ entries })
  } catch (err) {
    return handleRouteError(err)
  }
}
