import {
  createRoleDefinition,
  listRoleDefinitions,
} from '@testlane/db/services/admin-settings'
import { resolveSessionActor } from '@/lib/api/session'
import { handleRouteError } from '@/lib/api/errors'
import { createRoleDefinitionBodySchema } from '@/lib/api/schemas'
import { jsonSuccess } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

/** GET /api/admin/roles — list org role definitions (global admin+ only). */
export async function GET(request: Request) {
  try {
    const actor = await resolveSessionActor(request)
    const roles = await listRoleDefinitions(actor.id)
    return jsonSuccess({ roles })
  } catch (err) {
    return handleRouteError(err)
  }
}

/** POST /api/admin/roles — create a custom role definition (global admin+ only). */
export async function POST(request: Request) {
  try {
    const actor = await resolveSessionActor(request)
    const body = createRoleDefinitionBodySchema.parse(await request.json())

    const role = await createRoleDefinition({
      actorId: actor.id,
      name: body.name,
      description: body.description ?? null,
      isProjectLevel: body.isProjectLevel,
      permissions: body.permissions,
    })

    return jsonSuccess(role, 201)
  } catch (err) {
    return handleRouteError(err)
  }
}
