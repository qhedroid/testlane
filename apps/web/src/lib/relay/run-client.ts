/**
 * run-client.ts
 *
 * Real-backend test run fetch/create/update + case-result recording for the
 * Runs screen-wiring pass (mvp-backend Phase 4 — the LAST screen). Same
 * pattern as case-/plan-client, with one difference: these routes are the
 * pre-existing, flat /api/runs/* family (projectId as query/body param, not a
 * route segment), whose auth is now session-first with an x-relay-user-id
 * dev-header fallback (see apps/web/src/lib/api/auth.ts resolveActor()).
 *
 * Adapter decisions (Phase 4):
 *   - runKey: the server's runRef ('RUN-0042') is used directly — run URLs
 *     (/tr/<runKey>) pass the key through verbatim with no prefix mangling,
 *     so no route-parsing change is needed (unlike plans' slugToPlanKey fix).
 *   - executions are keyed by the LIVE test case id (RunCaseResultItem's
 *     testCaseId), matching the local DemoRun model. The testRunCaseId needed
 *     for result-recording writes is tracked separately by FreshProvider
 *     (runCaseIdsRef) — it is deliberately not stored in DemoRun, which
 *     screens treat as a purely-local shape.
 *   - stepResults: the server list response carries no per-step results
 *     (run_step_results stay server-side for now) — synced runs get an empty
 *     stepResults map, and any local step ticks are preserved across syncs by
 *     the provider's merge (local-only field, same hybrid rule as comments).
 *   - executionLog: no server equivalent exists (the schema stores one final
 *     status + executed_at per run case, not an append-only transition log) —
 *     synced runs come back with an empty log; local logs are preserved by
 *     the provider merge but do NOT survive a fresh browser. Documented gap.
 *   - defects: active run_defect_links come back as external defect refs
 *     (strings) and map onto CaseExecution.defects, which the UI already
 *     renders as "legacy external keys".
 */

import type { CaseExecution, DemoRun, ExecStatus } from '@/fresh/data/demo-model'
import { EXEC_TO_LEGACY, LEGACY_TO_EXEC, type ResultStatus } from '@/fresh/data/demo-model'
import type { ApiErrorBody, ApiSuccessBody } from '@/lib/api/types'
import { RelayApiError } from './project-client'
import { userIdToAssigneeName } from './case-client'

async function parseResponse<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiSuccessBody<T> | ApiErrorBody
  if (!res.ok) {
    const err = 'error' in json ? json.error : { code: 'UNKNOWN', message: res.statusText }
    throw new RelayApiError(err.code, err.message)
  }
  return (json as ApiSuccessBody<T>).data
}

// ---------------------------------------------------------------------------
// Server DTO shapes (JSON-serialised from packages/db/src/runs/read.ts and
// packages/db/services/TestRunService.ts)
// ---------------------------------------------------------------------------

export type RealRunStatus = 'active' | 'stalled' | 'sealed' | 'archived'
export type RealCaseResultStatus = 'not_run' | 'pass' | 'fail' | 'blocked' | 'skip' | 'skipped'

export interface RealRunCaseResult {
  testRunCaseId: string
  testCaseId: string
  status: RealCaseResultStatus
  comment: string | null
  assignedTo: string | null
  executedBy: string | null
  executedAt: string | null
  position: number
  defectRefs: string[]
}

export interface RealRunListItem {
  id: string
  runRef: string
  title: string
  status: RealRunStatus
  environment: string | null
  testPlanId: string | null
  dueDate: string | null
  createdAt: string
  updatedAt: string
  caseCounts: {
    total: number
    passed: number
    failed: number
    blocked: number
    skipped: number
    notRun: number
  }
  cases: RealRunCaseResult[]
}

export interface RealRunDetailCase {
  testRunCaseId: string
  originalTestCaseId: string
  status: RealCaseResultStatus
  position: number
}

export interface RealRunDetail {
  id: string
  runRef: string
  title: string
  status: RealRunStatus
  testRunCases: RealRunDetailCase[]
}

export interface RealCreateRunResult {
  id: string
  runRef: string
  title: string
  status: 'active'
  caseCount: number
  testPlanId: string | null
  projectId: string
  createdAt: string
}

// ---------------------------------------------------------------------------
// Fetch functions
// ---------------------------------------------------------------------------

export async function fetchRealRuns(projectId: string): Promise<RealRunListItem[]> {
  const data = await parseResponse<{ runs: RealRunListItem[] }>(
    await fetch(`/api/runs?projectId=${projectId}&limit=100`, { credentials: 'same-origin' }),
  )
  return data.runs
}

export async function fetchRealRunDetail(
  runId: string,
  projectId: string,
): Promise<RealRunDetail> {
  return parseResponse<RealRunDetail>(
    await fetch(`/api/runs/${runId}?projectId=${projectId}`, { credentials: 'same-origin' }),
  )
}

/** Create a run from a plan (testPlanId) or ad-hoc from an explicit case
 * list (caseIds, no plan) — the server snapshots either way. */
export async function createRealRun(body: {
  projectId: string
  testPlanId?: string
  name?: string
  caseIds?: string[]
}): Promise<RealCreateRunResult> {
  return parseResponse<RealCreateRunResult>(
    await fetch('/api/runs', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

/** Seal / reopen / archive / retitle a run. The frontend's "delete run" maps
 * to status='archived' — runs are never hard-deleted server-side. */
export async function updateRealRun(
  runId: string,
  body: {
    projectId: string
    status?: 'active' | 'sealed' | 'archived'
    title?: string
    dueDate?: string | null
  },
): Promise<{ id: string; runRef: string; status: RealRunStatus }> {
  return parseResponse(
    await fetch(`/api/runs/${runId}`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

export async function recordRealCaseResult(
  runId: string,
  testRunCaseId: string,
  body: { status: RealCaseResultStatus; comment?: string | null },
): Promise<void> {
  await parseResponse(
    await fetch(`/api/runs/${runId}/cases/${testRunCaseId}/result`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

// ---------------------------------------------------------------------------
// Adapters
// ---------------------------------------------------------------------------

export function toExecStatus(status: RealCaseResultStatus): ExecStatus {
  if (status === 'skipped') return 'Skipped'
  return LEGACY_TO_EXEC[status as ResultStatus] ?? 'Not run'
}

export function toRealResultStatus(status: ExecStatus): RealCaseResultStatus {
  return EXEC_TO_LEGACY[status] ?? 'not_run'
}

/** testCaseId -> testRunCaseId for a fetched run (needed by result writes). */
export function runCaseIdMap(cases: RealRunCaseResult[]): Record<string, string> {
  return Object.fromEntries(cases.map((c) => [c.testCaseId, c.testRunCaseId]))
}

/**
 * Server run -> frontend DemoRun. `planTitleById` fills planName from the
 * already-synced plans; local-only fields (description, executionLog, step
 * results) come back empty and are preserved from any existing local copy by
 * FreshProvider's merge.
 */
export function realRunToLocal(
  r: RealRunListItem,
  projectId: string,
  planTitleById: Map<string, string>,
): DemoRun {
  const ordered = [...r.cases].sort((a, b) => a.position - b.position)
  const executions: Record<string, CaseExecution> = {}
  for (const c of ordered) {
    const hasAnything =
      c.status !== 'not_run' || c.comment || c.defectRefs.length > 0 || c.assignedTo
    if (!hasAnything) continue
    executions[c.testCaseId] = {
      status: toExecStatus(c.status),
      stepResults: {},
      ...(c.assignedTo ? { assignee: userIdToAssigneeName(c.assignedTo) } : {}),
      ...(c.comment ? { resultNotes: c.comment } : {}),
      ...(c.defectRefs.length > 0 ? { defects: c.defectRefs } : {}),
      ...(c.executedAt ? { testedAt: c.executedAt } : {}),
      ...(c.executedBy ? { testedBy: userIdToAssigneeName(c.executedBy) } : {}),
    }
  }
  return {
    id: r.id,
    projectId,
    runKey: r.runRef,
    name: r.title,
    planId: r.testPlanId ?? undefined,
    planName: r.testPlanId ? planTitleById.get(r.testPlanId) : undefined,
    due: r.dueDate ?? undefined,
    createdAt: r.createdAt,
    sealed: r.status === 'sealed',
    ...(r.status === 'archived' ? { archivedAt: r.updatedAt } : {}),
    caseOrder: ordered.map((c) => c.testCaseId),
    executions,
    executionLog: [],
  }
}

/** Freshly-created run (create + detail fetch) -> DemoRun. Nothing executed yet. */
export function realCreatedRunToLocal(
  created: RealCreateRunResult,
  detail: RealRunDetail,
  planTitle: string | undefined,
): DemoRun {
  const ordered = [...detail.testRunCases].sort((a, b) => a.position - b.position)
  return {
    id: created.id,
    projectId: created.projectId,
    runKey: created.runRef,
    name: created.title,
    planId: created.testPlanId ?? undefined,
    planName: planTitle,
    createdAt: created.createdAt,
    sealed: false,
    caseOrder: ordered.map((c) => c.originalTestCaseId),
    executions: {},
    executionLog: [],
  }
}
