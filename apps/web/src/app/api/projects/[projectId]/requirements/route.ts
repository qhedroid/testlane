import { listRequirements, createRequirement } from '@relay/db/services/requirement'
import { resolveSessionActor } from '@/lib/api/session'
import { handleRouteError } from '@/lib/api/errors'
import { createRequirementBodySchema } from '@/lib/api/schemas'
import { jsonSuccess } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ projectId: string }>
}

/** GET — list the project's requirements (new-tables candidate, Phase D). */
export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await resolveSessionActor(request)
    const { projectId } = await context.params

    const requirements = await listRequirements({ actorId: actor.id, projectId })

    return jsonSuccess({ requirements })
  } catch (err) {
    return handleRouteError(err)
  }
}

/** POST — create a requirement. Body: { title, description?, status? }. */
export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await resolveSessionActor(request)
    const { projectId } = await context.params
    const body = createRequirementBodySchema.parse(await request.json())

    const created = await createRequirement({
      actorId: actor.id,
      projectId,
      title: body.title,
      description: body.description,
      status: body.status,
    })

    return jsonSuccess(created, 201)
  } catch (err) {
    return handleRouteError(err)
  }
}
