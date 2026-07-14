/**
 * defect-client.ts
 *
 * Real-backend defect ENTITY CRUD + internal defect linking to a run-case
 * execution (new-tables candidate, Phase E). Two route families:
 *   - defect entities live under /api/projects/[projectId]/defects (nested,
 *     real NextAuth session cookie auth — resolveSessionActor server-side),
 *     mirroring requirement-client.ts.
 *   - the internal LINK goes to /api/runs/[runId]/cases/[runCaseId]/defects
 *     (flat /api/runs/* family, session-first-with-dev-header auth), the same
 *     endpoint external defect linking already uses — we just additionally send
 *     defectId. External linking (defectRef only, no defectId) is untouched.
 *
 * Adapters owned here (same split as requirement-client):
 *   - status: the DB enum is lowercase ('open','in_progress',…); the fresh
 *     app's Defect model uses a Capitalized/spaced DefectStatus
 *     ('Open','In progress','Resolved','Closed'). Converted both ways — note the
 *     EXACT 'In progress' (space, lowercase p) <-> 'in_progress' mapping.
 *   - defectKey: the server's defectRef ('DEF-1', unpadded) is used directly as
 *     the frontend defectKey — same convention as caseRef→caseKey /
 *     requirementRef→requirementKey.
 *   - source: always 'Local' (the frontend Defect model's only value).
 */

import type { Defect, DefectStatus } from '@/fresh/data/demo-model'
import type { ApiErrorBody, ApiSuccessBody } from '@/lib/api/types'
import { TestlaneApiError } from './project-client'

async function parseResponse<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiSuccessBody<T> | ApiErrorBody
  if (!res.ok) {
    const err = 'error' in json ? json.error : { code: 'UNKNOWN', message: res.statusText }
    throw new TestlaneApiError(err.code, err.message)
  }
  return (json as ApiSuccessBody<T>).data
}

// ---------------------------------------------------------------------------
// Server DTO shapes (JSON-serialised DefectSummary from
// packages/db/services/DefectService.ts — Dates arrive as ISO strings)
// ---------------------------------------------------------------------------

export type RealDefectStatus = 'open' | 'in_progress' | 'resolved' | 'closed'

export interface RealDefect {
  id: string
  defectRef: string
  projectId: string
  title: string
  description: string | null
  status: RealDefectStatus
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateRealDefectBody {
  title: string
  description?: string | null
  status?: RealDefectStatus
}

// ---------------------------------------------------------------------------
// Fetch functions — entities
// ---------------------------------------------------------------------------

export async function fetchRealDefects(projectId: string): Promise<RealDefect[]> {
  const data = await parseResponse<{ defects: RealDefect[] }>(
    await fetch(`/api/projects/${projectId}/defects`, { credentials: 'same-origin' }),
  )
  return data.defects
}

export async function createRealDefect(
  projectId: string,
  body: CreateRealDefectBody,
): Promise<RealDefect> {
  return parseResponse<RealDefect>(
    await fetch(`/api/projects/${projectId}/defects`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

// ---------------------------------------------------------------------------
// Link an internal defect to a run-case execution. Reuses the external
// defect-link endpoint, additionally sending defectId (which promotes the link
// to an internal one). defectRef must be the defect's DEF-<n> key.
// ---------------------------------------------------------------------------

export async function linkRealDefectToRunCase(
  runId: string,
  runCaseId: string,
  input: { projectId: string; defectId: string; defectRef: string; defectUrl?: string },
): Promise<{ id: string }> {
  return parseResponse<{ id: string }>(
    await fetch(`/api/runs/${runId}/cases/${runCaseId}/defects`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        projectId: input.projectId,
        defectRef: input.defectRef,
        defectId: input.defectId,
        ...(input.defectUrl ? { defectUrl: input.defectUrl } : {}),
      }),
    }),
  )
}

// ---------------------------------------------------------------------------
// Status adapters (DB lowercase enum <-> frontend Capitalized DefectStatus)
// ---------------------------------------------------------------------------

const STATUS_TO_LOCAL: Record<RealDefectStatus, DefectStatus> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
}

const STATUS_TO_REAL: Record<DefectStatus, RealDefectStatus> = {
  Open: 'open',
  'In progress': 'in_progress',
  Resolved: 'resolved',
  Closed: 'closed',
}

export function toLocalDefectStatus(status: RealDefectStatus): DefectStatus {
  return STATUS_TO_LOCAL[status] ?? 'Open'
}

export function toRealDefectStatus(status: DefectStatus | undefined): RealDefectStatus {
  return STATUS_TO_REAL[status ?? 'Open'] ?? 'open'
}

// ---------------------------------------------------------------------------
// Model adapters
// ---------------------------------------------------------------------------

/** Server DefectSummary -> frontend Defect. defectRef is used directly as
 * defectKey; status is Capitalized; source is always 'Local'. */
export function realDefectToLocal(d: RealDefect): Defect {
  return {
    id: d.id,
    defectKey: d.defectRef,
    projectId: d.projectId,
    title: d.title,
    description: d.description ?? undefined,
    status: toLocalDefectStatus(d.status),
    source: 'Local',
    createdAt: d.createdAt,
  }
}

/** Build the POST /defects body from local create input. */
export function localDefectToCreateBody(input: {
  title: string
  description?: string
  status?: DefectStatus
}): CreateRealDefectBody {
  return {
    title: input.title.trim() || 'Untitled defect',
    ...(input.description?.trim() ? { description: input.description.trim() } : {}),
    status: toRealDefectStatus(input.status),
  }
}
