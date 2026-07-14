/**
 * requirement-client.ts
 *
 * Real-backend requirement CRUD + case<->requirement linking for the
 * Requirements/Cases screen-wiring (new-tables candidate, Phase D). Mirrors
 * case-client.ts: nested /api/projects/[projectId]/... routes, real NextAuth
 * session cookie auth (resolveSessionActor server-side) — no x-relay-user-id
 * header.
 *
 * Adapters owned here (same split as case-client):
 *   - status: the DB enum is lowercase ('draft'…); the fresh app's Requirement
 *     model uses a Capitalized RequirementStatus ('Draft'…). Converted both ways.
 *   - requirementKey: the server's requirementRef ('REQ-1', unpadded) is used
 *     directly as the frontend requirementKey — same convention as caseRef→caseKey
 *     (the DB ref wins; the local zero-padded 'REQ-00001' is only an optimistic
 *     temp key that gets reconciled away).
 *   - source: always 'Local' (the frontend Requirement model's only value — the
 *     backend has no external-requirement concept).
 */

import type { Requirement, RequirementStatus } from '@/fresh/data/demo-model'
import type { ApiErrorBody, ApiSuccessBody } from '@/lib/api/types'
import { RelayApiError } from './project-client'

async function parseResponse<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiSuccessBody<T> | ApiErrorBody
  if (!res.ok) {
    const err = 'error' in json ? json.error : { code: 'UNKNOWN', message: res.statusText }
    throw new RelayApiError(err.code, err.message)
  }
  return (json as ApiSuccessBody<T>).data
}

// ---------------------------------------------------------------------------
// Server DTO shapes (JSON-serialised RequirementSummary from
// packages/db/services/RequirementService.ts — Dates arrive as ISO strings)
// ---------------------------------------------------------------------------

export type RealRequirementStatus = 'draft' | 'approved' | 'implemented' | 'obsolete'

export interface RealRequirement {
  id: string
  requirementRef: string
  projectId: string
  title: string
  description: string | null
  status: RealRequirementStatus
  createdBy: string | null
  createdAt: string
  updatedAt: string
}

export interface CreateRealRequirementBody {
  title: string
  description?: string | null
  status?: RealRequirementStatus
}

export interface LinkRequirementResult {
  testCaseId: string
  requirementId: string
  created: boolean
}

// ---------------------------------------------------------------------------
// Fetch functions
// ---------------------------------------------------------------------------

export async function fetchRealRequirements(projectId: string): Promise<RealRequirement[]> {
  const data = await parseResponse<{ requirements: RealRequirement[] }>(
    await fetch(`/api/projects/${projectId}/requirements`, { credentials: 'same-origin' }),
  )
  return data.requirements
}

export async function createRealRequirement(
  projectId: string,
  body: CreateRealRequirementBody,
): Promise<RealRequirement> {
  return parseResponse<RealRequirement>(
    await fetch(`/api/projects/${projectId}/requirements`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

export async function linkRealRequirementToCase(
  projectId: string,
  caseId: string,
  requirementId: string,
): Promise<LinkRequirementResult> {
  return parseResponse<LinkRequirementResult>(
    await fetch(`/api/projects/${projectId}/cases/${caseId}/requirements`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ requirementId }),
    }),
  )
}

// ---------------------------------------------------------------------------
// Status adapters (DB lowercase enum <-> frontend Capitalized RequirementStatus)
// ---------------------------------------------------------------------------

const STATUS_TO_LOCAL: Record<RealRequirementStatus, RequirementStatus> = {
  draft: 'Draft',
  approved: 'Approved',
  implemented: 'Implemented',
  obsolete: 'Obsolete',
}

const STATUS_TO_REAL: Record<RequirementStatus, RealRequirementStatus> = {
  Draft: 'draft',
  Approved: 'approved',
  Implemented: 'implemented',
  Obsolete: 'obsolete',
}

export function toLocalRequirementStatus(status: RealRequirementStatus): RequirementStatus {
  return STATUS_TO_LOCAL[status] ?? 'Draft'
}

export function toRealRequirementStatus(status: RequirementStatus | undefined): RealRequirementStatus {
  return STATUS_TO_REAL[status ?? 'Draft'] ?? 'draft'
}

// ---------------------------------------------------------------------------
// Model adapters
// ---------------------------------------------------------------------------

/** Server RequirementSummary -> frontend Requirement. requirementRef is used
 * directly as requirementKey; status is Capitalized; source is always 'Local'. */
export function realRequirementToLocal(r: RealRequirement): Requirement {
  return {
    id: r.id,
    requirementKey: r.requirementRef,
    projectId: r.projectId,
    title: r.title,
    description: r.description ?? undefined,
    status: toLocalRequirementStatus(r.status),
    source: 'Local',
    createdAt: r.createdAt,
  }
}

/** Build the POST /requirements body from local create input. */
export function localRequirementToCreateBody(input: {
  title: string
  description?: string
  status?: RequirementStatus
}): CreateRealRequirementBody {
  return {
    title: input.title.trim() || 'Untitled requirement',
    ...(input.description?.trim() ? { description: input.description.trim() } : {}),
    status: toRealRequirementStatus(input.status),
  }
}
