import { listUsers, createUser } from '@relay/db/services/user'
import { resolveSessionActor } from '@/lib/api/session'
import { handleRouteError } from '@/lib/api/errors'
import { createUserBodySchema } from '@/lib/api/schemas'
import { jsonSuccess } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const actor = await resolveSessionActor(request)
    const list = await listUsers(actor.id)
    return jsonSuccess({ users: list })
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function POST(request: Request) {
  try {
    const actor = await resolveSessionActor(request)
    const body = createUserBodySchema.parse(await request.json())

    const user = await createUser({
      actorId: actor.id,
      orgId: body.orgId,
      email: body.email,
      name: body.name,
      globalRole: body.globalRole,
      password: body.password,
    })

    return jsonSuccess(user, 201)
  } catch (err) {
    return handleRouteError(err)
  }
}
