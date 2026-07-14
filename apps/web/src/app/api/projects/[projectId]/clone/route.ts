import { cloneProject } from '@testlane/db/services/project-clone'
import { resolveSessionActor } from '@/lib/api/session'
import { handleRouteError } from '@/lib/api/errors'
import { cloneProjectBodySchema } from '@/lib/api/schemas'
import { jsonSuccess } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ projectId: string }>
}

// Any active user can clone (see ProjectCloneService.ts's file header for
// why this doesn't require global-admin like POST /api/projects does).
export async function POST(request: Request, context: RouteContext) {
  try {
    const actor = await resolveSessionActor(request)
    const { projectId } = await context.params
    const body = cloneProjectBodySchema.parse(await request.json().catch(() => ({})))

    const project = await cloneProject({
      actorId: actor.id,
      sourceProjectId: projectId,
      slug: body.slug,
      name: body.name,
    })

    return jsonSuccess(project, 201)
  } catch (err) {
    return handleRouteError(err)
  }
}
