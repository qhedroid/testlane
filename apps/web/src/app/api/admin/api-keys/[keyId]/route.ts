import { deleteApiKey } from '@testlane/db/services/admin-settings'
import { resolveSessionActor } from '@/lib/api/session'
import { handleRouteError } from '@/lib/api/errors'
import { jsonSuccess } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ keyId: string }>
}

/** DELETE /api/admin/api-keys/[keyId] — delete an API key (global admin+ only). */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const actor = await resolveSessionActor(request)
    const { keyId } = await context.params

    const result = await deleteApiKey({ actorId: actor.id, keyId })

    return jsonSuccess(result)
  } catch (err) {
    return handleRouteError(err)
  }
}
