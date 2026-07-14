import { updateUser } from '@testlane/db/services/user'
import { resolveSessionActor } from '@/lib/api/session'
import { handleRouteError } from '@/lib/api/errors'
import { updateUserBodySchema } from '@/lib/api/schemas'
import { jsonSuccess } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ userId: string }>
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await resolveSessionActor(request)
    const { userId } = await context.params
    const patch = updateUserBodySchema.parse(await request.json())

    const user = await updateUser({ actorId: actor.id, userId, patch })

    return jsonSuccess(user)
  } catch (err) {
    return handleRouteError(err)
  }
}
