import { assignProjectRole } from '@testlane/db/services/project'
import { resolveSessionActor } from '@/lib/api/session'
import { handleRouteError } from '@/lib/api/errors'
import { assignProjectRoleBodySchema } from '@/lib/api/schemas'
import { jsonSuccess } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ projectId: string }>
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await resolveSessionActor(request)
    const { projectId } = await context.params
    const body = assignProjectRoleBodySchema.parse(await request.json())

    await assignProjectRole({
      actorId: actor.id,
      projectId,
      userId: body.userId,
      role: body.role,
    })

    return jsonSuccess({ ok: true })
  } catch (err) {
    return handleRouteError(err)
  }
}
