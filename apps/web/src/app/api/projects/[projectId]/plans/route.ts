import { listPlans, createPlan } from '@relay/db/services/test-plan'
import { resolveSessionActor } from '@/lib/api/session'
import { handleRouteError } from '@/lib/api/errors'
import { createPlanBodySchema } from '@/lib/api/schemas'
import { jsonSuccess } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ projectId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await resolveSessionActor(request)
    const { projectId } = await context.params

    const plans = await listPlans(actor.id, projectId)

    return jsonSuccess({ plans })
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await resolveSessionActor(request)
    const { projectId } = await context.params
    const body = createPlanBodySchema.parse(await request.json())

    const plan = await createPlan({
      actorId: actor.id,
      projectId,
      title: body.title,
      description: body.description,
      environment: body.environment,
      ownerId: body.ownerId,
      assigneeIds: body.assigneeIds,
      caseIds: body.caseIds,
    })

    return jsonSuccess(plan, 201)
  } catch (err) {
    return handleRouteError(err)
  }
}
