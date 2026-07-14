/**
 * plan-client.ts
 *
 * Real-backend test plan CRUD for the Plans screen-wiring pass (mvp-backend).
 * Same pattern as case-client.ts: nested /api/projects/[projectId]/plans/*
 * routes, real session-cookie auth.
 *
 * The big adapter decision here is GAP-01 (docs/claude/known-bugs.md): the
 * frontend's TestPlan is dynamic/query-based (`queries: TestQuery[]`,
 * resolved live via resolvePlanCases()), while the server relates plans to
 * cases only via a static list (test_plan_cases). Resolution — GAP-01
 * Option (a), implemented in the new-tables candidate Phase F:
 *
 *   - The authored query DEFINITIONS are now DURABLE server-side: they're
 *     persisted verbatim on test_plans.query_definition and returned as
 *     `queryDefinition` here. A fresh browser/device (or a reseed) gets the
 *     real authored queries back, not a lossy static snapshot.
 *   - Query RESOLUTION stays client-side. Every time a plan's queries change,
 *     FreshProvider resolves them against current cases/folders and pushes the
 *     resulting case-id list to PUT .../plans/[planId]/cases (setPlanCases) —
 *     so the server's static list still tracks the queries and
 *     TestRunService.createRun()'s hard dependency on test_plan_cases keeps
 *     working (unchanged). Both are sent: definitions for durability, the
 *     resolved list for run-spawn.
 *   - A server plan with NO stored definition (queryDefinition === null —
 *     e.g. a legacy plan) still falls back to a synthesized `static` query
 *     group from its server case list, so the Plans UI works on it unchanged.
 *
 * planKey: the server's `PLAN-<nnn>` ref is used directly (slugToPlanKey in
 * demo-model.ts was taught to recognise it) — not reformatted to the local
 * `TP-<nnnnn>` convention, same principle as case refs.
 */

import type { TestPlan, TestQuery } from '@/fresh/data/demo-model'
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
// Server DTO shapes (JSON-serialised PlanListItem / PlanDetail from
// packages/db/services/TestPlanService.ts)
// ---------------------------------------------------------------------------

export type RealPlanStatus = 'draft' | 'active' | 'archived'

export interface RealPlanSummary {
  id: string
  planRef: string
  projectId: string
  title: string
  description: string | null
  status: RealPlanStatus
  environment: string | null
  ownerId: string | null
  assigneeIds: string[]
  createdBy: string | null
  /**
   * The authored TestQuery[] definition (GAP-01 Option a), or null when the
   * plan has no stored definition (fall back to a synthesized static group).
   * Structurally identical to the frontend TestQuery, so typed as such.
   */
  queryDefinition: TestQuery[] | null
  caseCount: number
  createdAt: string
  updatedAt: string
}

export interface RealPlanListItem extends RealPlanSummary {
  caseIds: string[]
}

export interface RealPlanDetail extends RealPlanSummary {
  cases: Array<{ testCaseId: string; caseRef: string; title: string; position: number }>
}

// ---------------------------------------------------------------------------
// Fetch functions
// ---------------------------------------------------------------------------

/** Archived plans are excluded server-side — matches the local model, where
 * deletePlan() removes the plan from state (the server archives). */
export async function fetchRealPlans(projectId: string): Promise<RealPlanListItem[]> {
  const data = await parseResponse<{ plans: RealPlanListItem[] }>(
    await fetch(`/api/projects/${projectId}/plans`, { credentials: 'same-origin' }),
  )
  return data.plans
}

export async function createRealPlan(
  projectId: string,
  body: { title: string; description?: string; caseIds?: string[]; queryDefinition?: TestQuery[] | null },
): Promise<RealPlanDetail> {
  return parseResponse<RealPlanDetail>(
    await fetch(`/api/projects/${projectId}/plans`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

export async function updateRealPlan(
  projectId: string,
  planId: string,
  body: { title?: string; description?: string | null; queryDefinition?: TestQuery[] | null },
): Promise<RealPlanDetail> {
  return parseResponse<RealPlanDetail>(
    await fetch(`/api/projects/${projectId}/plans/${planId}`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

/** Replace the server's static case list for a plan (see file header). */
export async function setRealPlanCases(
  projectId: string,
  planId: string,
  caseIds: string[],
): Promise<RealPlanDetail> {
  return parseResponse<RealPlanDetail>(
    await fetch(`/api/projects/${projectId}/plans/${planId}/cases`, {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ caseIds }),
    }),
  )
}

/** Server-side this archives (status = 'archived') rather than hard-deleting. */
export async function archiveRealPlan(projectId: string, planId: string): Promise<void> {
  await parseResponse<{ ok: boolean }>(
    await fetch(`/api/projects/${projectId}/plans/${planId}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    }),
  )
}

// ---------------------------------------------------------------------------
// Adapters
// ---------------------------------------------------------------------------

/**
 * Server plan -> frontend TestPlan. GAP-01 Option (a): when the server has a
 * stored `queryDefinition`, it IS the plan's queries (authored dynamic queries
 * survive a fresh browser/reseed — the whole point). Only when it's null (a
 * legacy plan with no stored definition) do we fall back to the synthesized
 * static query group built from the server's resolved case list, so the Plans
 * UI still works on it unchanged.
 */
export function realPlanToLocal(p: RealPlanListItem): TestPlan {
  const queries: TestQuery[] =
    p.queryDefinition && p.queryDefinition.length > 0
      ? p.queryDefinition
      : [
          {
            id: `q-server-${p.id}`,
            title: 'Cases',
            type: 'static',
            caseIds: p.caseIds,
          },
        ]
  return {
    id: p.id,
    planKey: p.planRef,
    projectId: p.projectId,
    title: p.title,
    description: p.description ?? undefined,
    createdAt: p.createdAt,
    queries,
  }
}

/** Same adapter for PlanDetail responses (create/update/setPlanCases). */
export function realPlanDetailToLocal(p: RealPlanDetail): TestPlan {
  return realPlanToLocal({ ...p, caseIds: p.cases.map((c) => c.testCaseId) })
}
