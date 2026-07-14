/**
 * WorkspaceResetService.ts
 * Relay — Service layer
 *
 * "Reset workspace" (Shaun's 2026-07-10 ask): wipe every project under the
 * seed org and re-insert the default baseline — Demo Project (DP, fully
 * seeded) plus five empty projects (CTMS, eTMF, IAM, eFeasibility, GL) and
 * the 8 seed users. This is exactly what `pnpm db:seed` does, exposed to the
 * app so the UI can offer a reset without shell access. Everything not in
 * the seed — user-created projects, clones, cases, runs, audit rows — is
 * destroyed; that is the point.
 *
 * Global admin+ only. Local-dev / demo tool: a production system would never
 * ship this endpoint.
 */

import { eq } from 'drizzle-orm'
import type { MySql2Database } from 'drizzle-orm/mysql2'
import { users } from '../schema'
import type * as schema from '../schema'
import { db } from '../src/index'
import { logger } from '../src/logger'
import { InsufficientPermissionsError } from '../src/rbac/assert-min-role'
import { clearSeedData } from '../src/seed/clear'
import { insertSeedData } from '../src/seed/insert'

export async function resetWorkspace(actorId: string): Promise<void> {
  const [actor] = await db
    .select({ globalRole: users.globalRole, isActive: users.isActive })
    .from(users)
    .where(eq(users.id, actorId))
    .limit(1)

  if (
    !actor?.isActive ||
    (actor.globalRole !== 'super_admin' && actor.globalRole !== 'admin')
  ) {
    throw new InsufficientPermissionsError(
      'Only global administrators can reset the workspace.',
    )
  }

  logger.info('[WorkspaceResetService] resetting workspace to seed defaults', { actorId })
  const typedDb = db as unknown as MySql2Database<typeof schema>
  await clearSeedData(typedDb)
  await insertSeedData(typedDb)
  logger.info('[WorkspaceResetService] workspace reset complete', { actorId })
}
