import { getCase, updateCase, archiveCase } from '@testlane/db/services/test-case'
import { resolveSessionActor } from '@/lib/api/session'
import { handleRouteError } from '@/lib/api/errors'
import { updateCaseBodySchema } from '@/lib/api/schemas'
import { jsonSuccess } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ projectId: string; caseId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await resolveSessionActor(request)
    const { projectId, caseId } = await context.params

    const detail = await getCase(actor.id, projectId, caseId)

    return jsonSuccess(detail)
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await resolveSessionActor(request)
    const { projectId, caseId } = await context.params
    const patch = updateCaseBodySchema.parse(await request.json())

    const updated = await updateCase({ actorId: actor.id, projectId, caseId, patch })

    return jsonSuccess(updated)
  } catch (err) {
    return handleRouteError(err)
  }
}

/**
 * "Delete" archives the case (is_archived = true) rather than a hard DELETE —
 * see TestCaseService.ts's file header for why (schema.ts documents test
 * cases as never hard-deleted).
 */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const actor = await resolveSessionActor(request)
    const { projectId, caseId } = await context.params

    await archiveCase({ actorId: actor.id, projectId, caseId })

    return jsonSuccess({ ok: true })
  } catch (err) {
    return handleRouteError(err)
  }
}
