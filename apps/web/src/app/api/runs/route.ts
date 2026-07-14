import { createRun } from '@relay/db/services/test-run'
import { listProjectRuns } from '@relay/db/services/run-read'
import { resolveActor } from '@/lib/api/auth'
import { handleRouteError } from '@/lib/api/errors'
import { createRunBodySchema, listRunsQuerySchema } from '@/lib/api/schemas'
import { jsonSuccess } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const actor = await resolveActor(request)
    const { searchParams } = new URL(request.url)
    const query = listRunsQuerySchema.parse({
      projectId: searchParams.get('projectId') ?? undefined,
      status: searchParams.get('status') ?? undefined,
      limit: searchParams.get('limit') ?? undefined,
    })

    const runs = await listProjectRuns({
      actorId: actor.id,
      projectId: query.projectId,
      status: query.status,
      limit: query.limit,
    })

    return jsonSuccess({ runs })
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function POST(request: Request) {
  try {
    const actor = await resolveActor(request)
    const body = createRunBodySchema.parse(await request.json())

    const result = await createRun({
      projectId: body.projectId,
      testPlanId: body.testPlanId,
      createdBy: actor.id,
      name: body.name,
      description: body.description,
      environment: body.environment,
      assigneeIds: body.assigneeIds,
      caseIds: body.caseIds,
    })

    return jsonSuccess(result, 201)
  } catch (err) {
    return handleRouteError(err)
  }
}
