/**
 * project-client.ts
 *
 * Real-backend project list/create, used to replace the fresh app's single
 * client-only "Demo Project" (DP) with the actual DB projects (CTMS, eTMF,
 * Viewer, SSO/IAM, Reporting, API Gateway — see packages/db/src/seed/ids.ts).
 *
 * Unlike api-client.ts (which targets the legacy /api/runs/* dev-header
 * auth), these calls hit the nested /api/projects/* routes, which use the
 * real NextAuth session cookie (resolveSessionActor) — no x-relay-user-id
 * header needed. The browser sends the session cookie automatically on
 * same-origin fetches, so no extra headers are required here.
 */

import { RELAY_ORG_ID } from './config'
import type { ApiErrorBody, ApiSuccessBody } from '@/lib/api/types'

export class TestlaneApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'TestlaneApiError'
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiSuccessBody<T> | ApiErrorBody
  if (!res.ok) {
    const err = 'error' in json ? json.error : { code: 'UNKNOWN', message: res.statusText }
    throw new TestlaneApiError(err.code, err.message)
  }
  return (json as ApiSuccessBody<T>).data
}

export interface RealProject {
  id: string
  slug: string
  name: string
  description: string | null
  status: string
}

export async function fetchRealProjects(): Promise<RealProject[]> {
  const data = await parseResponse<{ projects: RealProject[] }>(
    await fetch('/api/projects', { credentials: 'same-origin' }),
  )
  return data.projects
}

export interface CreateRealProjectInput {
  slug: string
  name: string
  description?: string
}

export async function createRealProject(input: CreateRealProjectInput): Promise<RealProject> {
  return parseResponse<RealProject>(
    await fetch('/api/projects', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orgId: RELAY_ORG_ID,
        slug: input.slug,
        name: input.name,
        description: input.description,
      }),
    }),
  )
}

/** The seeded Demo Project's slug — see packages/db/src/seed/demo-project-seed.ts. */
export const DEMO_PROJECT_SLUG = 'dp'

/**
 * "Create Demo Project" — deep-clones the seeded Demo Project (folders,
 * cases, plans, runs, everything) into a brand new real project. Any active
 * user can call this (see the route/service file headers for why it's not
 * admin-gated like createRealProject above).
 */
export async function cloneRealProject(sourceProjectId: string): Promise<RealProject> {
  return parseResponse<RealProject>(
    await fetch(`/api/projects/${sourceProjectId}/clone`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }),
  )
}

/**
 * "Reset workspace" — wipes ALL projects/data and re-inserts the default
 * seed baseline (Demo Project fully seeded + CTMS/eTMF/IAM/eFeasibility/GL
 * empty). Global admin+ only (server-enforced). Local-dev/demo tool.
 */
export async function resetRealWorkspace(): Promise<void> {
  await parseResponse<{ ok: boolean }>(
    await fetch('/api/admin/reset', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    }),
  )
}
