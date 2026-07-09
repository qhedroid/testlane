import { unlinkDefect } from '@relay/db/services/defect'
import { resolveActor } from '@/lib/api/auth'
import { handleRouteError } from '@/lib/api/errors'
import { unlinkDefectBodySchema } from '@/lib/api/schemas'
import { jsonSuccess } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ runId: string; runCaseId: string; linkId: string }>
}

// DELETE takes projectId as a query param (mirrors GET on the parent route,
// see ../route.ts) rather than a body, since DELETE bodies are unreliable
// across HTTP clients/proxies.
export async function DELETE(request: Request, context: RouteContext) {
  try {
    const actor = await resolveActor(request)
    const { runId, runCaseId, linkId } = await context.params
    const { searchParams } = new URL(request.url)
    const body = unlinkDefectBodySchema.parse({
      projectId: searchParams.get('projectId') ?? undefined,
    })

    await unlinkDefect({
      actorId: actor.id,
      projectId: body.projectId,
      testRunId: runId,
      testRunCaseId: runCaseId,
      linkId,
    })

    return jsonSuccess({ ok: true })
  } catch (err) {
    return handleRouteError(err)
  }
}
