/**
 * dashboard-client.ts
 *
 * Server-computed dashboard summary (data-layer refactor). DashboardService
 * (`GET /api/projects/:id/dashboard`) was built in Phase 5 but sat unused
 * while Dashboard computed everything client-side; the KPI strip and
 * completion donut now use these server-aggregated numbers (SQL does the
 * counting — the production pattern), while the richer widgets (open-runs
 * list, assignee bars, trend chart) still derive from synced reducer state,
 * which the screen needs loaded anyway.
 */

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

/** JSON-serialised DashboardSummary from packages/db/services/DashboardService.ts. */
export interface RealDashboardSummary {
  activeRunCount: number
  passRatePct: number
  openFailureCount: number
  unlinkedFailureCount: number
  runCoveragePct: number
  totalCaseCount: number
  resultBreakdown: {
    pass: number
    fail: number
    blocked: number
    skip: number
    notRun: number
  }
}

export async function fetchRealDashboardSummary(
  projectId: string,
): Promise<RealDashboardSummary> {
  return parseResponse<RealDashboardSummary>(
    await fetch(`/api/projects/${projectId}/dashboard`, { credentials: 'same-origin' }),
  )
}
