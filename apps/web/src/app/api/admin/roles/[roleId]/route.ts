import {
  deleteRoleDefinition,
  updateRoleDefinition,
} from '@testlane/db/services/admin-settings'
import { resolveSessionActor } from '@/lib/api/session'
import { handleRouteError } from '@/lib/api/errors'
import { updateRoleDefinitionBodySchema } from '@/lib/api/schemas'
import { jsonSuccess } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ roleId: string }>
}

/** PATCH /api/admin/roles/[roleId] — update a custom role (built-ins are 409). */
export async function PATCH(request: Request, context: RouteContext) {
  try {
    const actor = await resolveSessionActor(request)
    const { roleId } = await context.params
    const patch = updateRoleDefinitionBodySchema.parse(await request.json())

    const role = await updateRoleDefinition({ actorId: actor.id, roleId, patch })

    return jsonSuccess(role)
  } catch (err) {
    return handleRouteError(err)
  }
}

/** DELETE /api/admin/roles/[roleId] — delete a custom role (built-ins are 409). */
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const actor = await resolveSessionActor(request)
    const { roleId } = await context.params

    const result = await deleteRoleDefinition({ actorId: actor.id, roleId })

    return jsonSuccess(result)
  } catch (err) {
    return handleRouteError(err)
  }
}
