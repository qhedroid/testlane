import { listFolders, createFolder } from '@relay/db/services/test-case'
import { resolveSessionActor } from '@/lib/api/session'
import { handleRouteError } from '@/lib/api/errors'
import { createFolderBodySchema } from '@/lib/api/schemas'
import { jsonSuccess } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ projectId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await resolveSessionActor(request)
    const { projectId } = await context.params

    const folders = await listFolders(actor.id, projectId)

    return jsonSuccess({ folders })
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await resolveSessionActor(request)
    const { projectId } = await context.params
    const body = createFolderBodySchema.parse(await request.json())

    const folder = await createFolder({
      actorId: actor.id,
      projectId,
      name: body.name,
      parentId: body.parentId,
      description: body.description,
    })

    return jsonSuccess(folder, 201)
  } catch (err) {
    return handleRouteError(err)
  }
}
