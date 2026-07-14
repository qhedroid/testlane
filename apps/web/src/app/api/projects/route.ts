import { listProjects, createProject } from '@testlane/db/services/project'
import { resolveSessionActor } from '@/lib/api/session'
import { handleRouteError } from '@/lib/api/errors'
import { createProjectBodySchema } from '@/lib/api/schemas'
import { jsonSuccess } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  try {
    const actor = await resolveSessionActor(request)
    const list = await listProjects(actor.id)
    return jsonSuccess({ projects: list })
  } catch (err) {
    return handleRouteError(err)
  }
}

export async function POST(request: Request) {
  try {
    const actor = await resolveSessionActor(request)
    const body = createProjectBodySchema.parse(await request.json())

    const project = await createProject({
      actorId: actor.id,
      orgId: body.orgId,
      slug: body.slug,
      name: body.name,
      description: body.description,
    })

    return jsonSuccess(project, 201)
  } catch (err) {
    return handleRouteError(err)
  }
}
