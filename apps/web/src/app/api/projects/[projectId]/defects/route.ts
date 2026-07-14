import { listDefects, createDefect } from '@relay/db/services/defect'
import { resolveSessionActor } from '@/lib/api/session'
import { handleRouteError } from '@/lib/api/errors'
import { createDefectBodySchema } from '@/lib/api/schemas'
import { jsonSuccess } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ projectId: string }>
}

/** GET — list the project's defect entities (new-tables candidate, Phase E). */
export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await resolveSessionActor(request)
    const { projectId } = await context.params

    const defects = await listDefects({ actorId: actor.id, projectId })

    return jsonSuccess({ defects })
  } catch (err) {
    return handleRouteError(err)
  }
}

/** POST — create a defect. Body: { title, description?, status? }. */
export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await resolveSessionActor(request)
    const { projectId } = await context.params
    const body = createDefectBodySchema.parse(await request.json())

    const created = await createDefect({
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
