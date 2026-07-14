/**
 * AuditService.ts
 * Testlane — Service layer
 *
 * Real audit_log read/write (Phase 6 of mvp-backend). `recordAudit()` is a
 * thin, reusable helper other services call inline (see
 * TestCaseService.ts/TestPlanService.ts, retrofitted this phase to call it on
 * every mutation) — mirrors the ad-hoc `buildAuditRow()`+insert pattern
 * TestRunService.ts already uses for run creation, just factored out so it
 * isn't copy-pasted per service.
 */

import { and, desc, eq, lte } from 'drizzle-orm'
import { auditLog, type NewAuditLog } from '../schema'
import { db } from '../src/index'
import { assertMinProjectRole } from '../src/rbac/assert-min-role'
import { createId } from '../src/utils/id'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RecordAuditInput {
  orgId?: string | null
  projectId?: string | null
  entityType: string
  entityId: string
  action: string
  actorId: string | null
  oldValue?: unknown
  newValue?: unknown
  metadata?: unknown
}

export interface AuditLogRow {
  id: string
  projectId: string | null
  entityType: string
  entityId: string
  action: string
  actorId: string | null
  oldValue: unknown
  newValue: unknown
  metadata: unknown
  createdAt: Date
}

export interface ListAuditLogInput {
  actorId: string
  projectId: string
  limit?: number
  before?: Date
}

// ---------------------------------------------------------------------------
// Write
// ---------------------------------------------------------------------------

/**
 * Insert one audit_log row. Never throws on its own logic (mirrors
 * TestRunService's "audit write happens inside the same transaction as the
 * mutation" convention when a `tx` is supplied — pass the transaction client
 * through so the audit row commits/rolls back atomically with its mutation).
 */
export async function recordAudit(
  input: RecordAuditInput,
  tx?: Parameters<Parameters<typeof db.transaction>[0]>[0],
): Promise<void> {
  const client = tx ?? db
  const row: NewAuditLog = {
    id: createId(),
    orgId: input.orgId ?? null,
    projectId: input.projectId ?? null,
    entityType: input.entityType,
    entityId: input.entityId,
    action: input.action,
    actorId: input.actorId,
    oldValue: input.oldValue ?? null,
    newValue: input.newValue ?? null,
    metadata: input.metadata ?? null,
  }
  await client.insert(auditLog).values(row)
}

// ---------------------------------------------------------------------------
// Read
// ---------------------------------------------------------------------------

export async function listAuditLog(input: ListAuditLogInput): Promise<AuditLogRow[]> {
  const { actorId, projectId, limit = 50, before } = input
  await assertMinProjectRole(actorId, projectId, 'viewer')

  const conditions = [eq(auditLog.projectId, projectId)]
  if (before) conditions.push(lte(auditLog.createdAt, before))

  const rows = await db
    .select({
      id: auditLog.id,
      projectId: auditLog.projectId,
      entityType: auditLog.entityType,
      entityId: auditLog.entityId,
      action: auditLog.action,
      actorId: auditLog.actorId,
      oldValue: auditLog.oldValue,
      newValue: auditLog.newValue,
      metadata: auditLog.metadata,
      createdAt: auditLog.createdAt,
    })
    .from(auditLog)
    .where(and(...conditions))
    .orderBy(desc(auditLog.createdAt))
    .limit(Math.min(limit, 200))

  return rows
}
