import { createRun } from '@relay/db/services/test-run'
import { resolveActor } from '@/lib/api/auth'
import { handleRouteError } from '@/lib/api/errors'
import { createRunBodySchema } from '@/lib/api/schemas'
import { jsonSuccess } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const actor = await resolveActor(request)
    const body = createRunBodySchema.parse(await request.json())

    const result = await createRun({
      projectId: body.projectId,
      testPlanId: body.testPlanId,
      createdBy: actor.id,
      name: body.name,
      environment: body.environment,
      assigneeIds: body.assigneeIds,
      caseIds: body.caseIds,
    })

    return jsonSuccess(result, 201)
  } catch (err) {
    return handleRouteError(err)
  }
}
