import { createApiKey, listApiKeys } from '@testlane/db/services/admin-settings'
import { resolveSessionActor } from '@/lib/api/session'
import { handleRouteError } from '@/lib/api/errors'
import { createApiKeyBodySchema } from '@/lib/api/schemas'
import { jsonSuccess } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

/** GET /api/admin/api-keys — list org API keys (global admin+ only). */
export async function GET(request: Request) {
  try {
    const actor = await resolveSessionActor(request)
    const apiKeys = await listApiKeys(actor.id)
    return jsonSuccess({ apiKeys })
  } catch (err) {
    return handleRouteError(err)
  }
}

/** POST /api/admin/api-keys — create an API key (global admin+ only). Stores the
 * already-masked display value; real secret management is out of scope. */
export async function POST(request: Request) {
  try {
    const actor = await resolveSessionActor(request)
    const body = createApiKeyBodySchema.parse(await request.json())

    const apiKey = await createApiKey({
      actorId: actor.id,
      name: body.name,
      keyMasked: body.keyMasked,
      project: body.project,
      permissions: body.permissions,
      expiration: body.expiration,
      createdBy: body.createdBy ?? null,
    })

    return jsonSuccess(apiKey, 201)
  } catch (err) {
    return handleRouteError(err)
  }
}
