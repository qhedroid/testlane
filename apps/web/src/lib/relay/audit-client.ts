/**
 * audit-client.ts
 *
 * Real-backend audit log read for the Audit screen-wiring pass (mvp-backend).
 *
 * Unlike cases/plans, audit is wired as a *screen-level fetch* rather than
 * through FreshProvider's reducer-sync — a deliberate exception: it's a
 * read-only feed, nothing writes to it from the UI, and no other
 * screen/selector consumes it, so putting it in reducer state (+ localStorage
 * persistence + DemoState schema churn) would be all cost, no benefit.
 * AuditScreen.tsx fetches on mount for real projects and falls back to the
 * static demo events for local projects.
 *
 * The adapter renders server audit rows into the screen's existing
 * AuditEvent display shape (icon + HTML line + context + relative time).
 * Because AuditScreen renders `html` via dangerouslySetInnerHTML, every
 * dynamic value here is HTML-escaped before interpolation.
 */

import type { AuditEvent } from '@/fresh/data/types'
import { formatRelativeTime } from '@/fresh/data/demo-model'
import type { ApiErrorBody, ApiSuccessBody } from '@/lib/api/types'
import { RelayApiError } from './project-client'
import { SEED_USER_NAME_BY_ID } from './case-client'

async function parseResponse<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiSuccessBody<T> | ApiErrorBody
  if (!res.ok) {
    const err = 'error' in json ? json.error : { code: 'UNKNOWN', message: res.statusText }
    throw new RelayApiError(err.code, err.message)
  }
  return (json as ApiSuccessBody<T>).data
}

/** JSON-serialised AuditLogRow from packages/db/services/AuditService.ts. */
export interface RealAuditEntry {
  id: string
  projectId: string | null
  entityType: string
  entityId: string
  action: string
  actorId: string | null
  oldValue: unknown
  newValue: unknown
  metadata: unknown
  createdAt: string
}

export async function fetchRealAuditLog(
  projectId: string,
  limit = 100,
): Promise<RealAuditEntry[]> {
  const data = await parseResponse<{ entries: RealAuditEntry[] }>(
    await fetch(`/api/projects/${projectId}/audit?limit=${limit}`, {
      credentials: 'same-origin',
    }),
  )
  return data.entries
}

// ---------------------------------------------------------------------------
// Display adapter
// ---------------------------------------------------------------------------

function esc(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const ENTITY_LABEL: Record<string, string> = {
  test_case: 'test case',
  test_plan: 'test plan',
  test_run: 'test run',
  test_run_case: 'run case',
  folder: 'folder',
  project: 'project',
  user: 'user',
  defect: 'defect',
}

/** action suffix -> [verb phrase, icon, iconClass] */
const ACTION_RENDER: Record<string, [string, string, string]> = {
  created: ['created', 'create', 'ti-file-plus'],
  updated: ['updated', 'edit', 'ti-edit'],
  archived: ['archived', 'seal', 'ti-archive'],
  cases_set: ['updated the case list of', 'edit', 'ti-list-check'],
  linked: ['linked a defect on', 'link', 'ti-bug'],
  unlinked: ['unlinked a defect on', 'link', 'ti-bug-off'],
  sealed: ['sealed', 'seal', 'ti-lock'],
  reopened: ['reopened', 'seal', 'ti-lock-open'],
  result_updated: ['recorded a result on', 'result', 'ti-check'],
}

function pickString(value: unknown, key: string): string | undefined {
  if (typeof value !== 'object' || value === null) return undefined
  const v = (value as Record<string, unknown>)[key]
  return typeof v === 'string' ? v : undefined
}

export function realAuditEntryToEvent(entry: RealAuditEntry): AuditEvent {
  const actorName = entry.actorId ? (SEED_USER_NAME_BY_ID[entry.actorId] ?? 'Unknown user') : 'System'
  const entityLabel = ENTITY_LABEL[entry.entityType] ?? entry.entityType.replace(/_/g, ' ')
  const actionSuffix = entry.action.split('.').pop() ?? entry.action
  const [verb, icon, iconClass] = ACTION_RENDER[actionSuffix] ?? [
    actionSuffix.replace(/_/g, ' '),
    'edit',
    'ti-activity',
  ]

  const ref =
    pickString(entry.newValue, 'caseRef') ??
    pickString(entry.newValue, 'planRef') ??
    pickString(entry.newValue, 'runRef') ??
    entry.entityId.slice(-8)
  const title = pickString(entry.newValue, 'title')

  const html =
    `<strong>${esc(actorName)}</strong> ${esc(verb)} ${esc(entityLabel)} ` +
    `<span class="audit-ref">${esc(ref)}</span>` +
    (title ? ` <em style="color:var(--text3);font-size:11px">${esc(title)}</em>` : '')

  return {
    icon,
    iconClass,
    html,
    ctx: `${esc(entityLabel)} · ${esc(entry.action)}`,
    time: formatRelativeTime(entry.createdAt),
  }
}
