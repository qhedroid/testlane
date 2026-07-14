import { setPlanCases } from '@testlane/db/services/test-plan'
import { resolveSessionActor } from '@/lib/api/session'
import { handleRouteError } from '@/lib/api/errors'
import { setPlanCasesBodySchema } from '@/lib/api/schemas'
import { jsonSuccess } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ projectId: string; planId: string }>
}

/**
 * Replace a plan's case membership wholesale, in the given order.
 * Server-side equivalent of the frontend's updatePlan(id, { queries }) —
 * the caller resolves the desired case list (e.g. from folder/condition
 * criteria) before calling this; see TestPlanService.ts's file header for
 * why the server doesn't evaluate queries itself.
 */
export async function PUT(request: Request, context: RouteContext) {
  try {
    const actor = await resolveSessionActor(request)
    const { projectId, planId } = await context.params
    const body = setPlanCasesBodySchema.parse(await request.json())

    const updated = await setPlanCases({
      actorId: actor.id,
      projectId,
      planId,
      caseIds: body.caseIds,
    })

    return jsonSuccess(updated)
  } catch (err) {
    return handleRouteError(err)
  }
}
