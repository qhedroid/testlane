import { linkDefect, listDefectLinks } from '@relay/db/services/defect'
import { resolveActor } from '@/lib/api/auth'
import { handleRouteError } from '@/lib/api/errors'
import { linkDefectBodySchema, listDefectLinksQuerySchema } from '@/lib/api/schemas'
import { jsonSuccess } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ runId: string; runCaseId: string }>
}

// Mirrors ../result/route.ts: legacy resolveActor() header auth, projectId
// passed explicitly rather than via a nested route segment — matching the
// rest of the /api/runs/* family. See DefectService.ts file header for why
// this doesn't need to wait for Phase 4 (net-new route, not a modification
// of an already-live one).

export async function GET(request: Request, context: RouteContext) {
  try {
    const actor = await resolveActor(request)
    const { runId, runCaseId } = await context.params
    const { searchParams } = new URL(request.url)
    const query = listDefectLinksQuerySchema.parse({
      projectId: searchParams.get('projectId') ?? undefined,
      includeUnlinked: searchParams.get('includeUnlinked') ?? undefined,
    })

    const links = await listDefectLinks({
      actorId: actor.id,
      projectId: query.projectId,
      testRunId: runId,
      testRunCaseId: runCaseId,
      includeUnlinked: query.includeUnlinked,
    })

    return jsonSuccess({ links })
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await resolveActor(request)
    const { runId, runCaseId } = await context.params
    const body = linkDefectBodySchema.parse(await request.json())

    const link = await linkDefect({
      actorId: actor.id,
      projectId: body.projectId,
      testRunId: runId,
      testRunCaseId: runCaseId,
      defectRef: body.defectRef,
      defectUrl: body.defectUrl,
      // Internal defect (Phase E): additive, backward compatible — omitted for
      // external free-text refs.
      defectId: body.defectId,
    })

    return jsonSuccess(link, 201)
  } catch (err) {
    return handleRouteError(err)
  }
}
