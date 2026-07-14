import { resetWorkspace } from '@testlane/db/services/workspace-reset'
import { resolveSessionActor } from '@/lib/api/session'
import { handleRouteError } from '@/lib/api/errors'
import { jsonSuccess } from '@/lib/api/response'

export const dynamic = 'force-dynamic'

/**
 * POST /api/admin/reset — wipe everything and re-insert the default seed
 * baseline (Demo Project fully seeded + CTMS/eTMF/IAM/eFeasibility/GL empty).
 * Global admin+ only (enforced in the service). Local-dev/demo tool — see
 * WorkspaceResetService.ts's file header.
 */
export async function POST(request: Request) {
  try {
    const actor = await resolveSessionActor(request)
    await resetWorkspace(actor.id)
    return jsonSuccess({ ok: true })
  } catch (err) {
    return handleRouteError(err)
  }
}
