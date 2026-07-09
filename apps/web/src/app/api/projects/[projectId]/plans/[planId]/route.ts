import { getPlan, updatePlan, archivePlan } from '@relay/db/services/test-plan'
import { resolveSessionActor } from '@/lib/api/session'
import { handleRouteError } from '@/lib/api/errors'
import { updatePlanBodySchema } from '@/lib/api/schemas'
import { jsonSuccess } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ projectId: string; planId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await resolveSessionActor(request)
    const { projectId, planId } = await context.params

    const detail = await getPlan(actor.id, projectId, planId)

    return jsonSuccess(detail)
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await resolveSessionActor(request)
    const { projectId, planId } = await context.params
    const patch = updatePlanBodySchema.parse(await request.json())

    const updated = await updatePlan({ actorId: actor.id, projectId, planId, patch })

    return jsonSuccess(updated)
  } catch (err) {
    return handleRouteError(err)
  }
}

/** "Delete" archives the plan (status = 'archived') — see TestPlanService.ts's file header. */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const actor = await resolveSessionActor(request)
    const { projectId, planId } = await context.params

    await archivePlan({ actorId: actor.id, projectId, planId })

    return jsonSuccess({ ok: true })
  } catch (err) {
    return handleRouteError(err)
  }
}
