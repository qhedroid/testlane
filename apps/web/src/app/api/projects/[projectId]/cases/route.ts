import { listCases, createCase } from '@testlane/db/services/test-case'
import { resolveSessionActor } from '@/lib/api/session'
import { handleRouteError } from '@/lib/api/errors'
import { listCasesQuerySchema, createCaseBodySchema } from '@/lib/api/schemas'
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
    const query = listCasesQuerySchema.parse({
      folderId: searchParams.get('folderId') ?? undefined,
      includeArchived: searchParams.get('includeArchived') ?? undefined,
    })

    const cases = await listCases({
      actorId: actor.id,
      projectId,
      folderId: query.folderId,
      includeArchived: query.includeArchived,
    })

    return jsonSuccess({ cases })
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await resolveSessionActor(request)
    const { projectId } = await context.params
    const body = createCaseBodySchema.parse(await request.json())

    const created = await createCase({
      actorId: actor.id,
      projectId,
      folderId: body.folderId,
      title: body.title,
      priority: body.priority,
      type: body.type,
      preconditions: body.preconditions,
      description: body.description,
      tags: body.tags,
      assignedTo: body.assignedTo,
      steps: body.steps,
    })

    return jsonSuccess(created, 201)
  } catch (err) {
    return handleRouteError(err)
  }
}
