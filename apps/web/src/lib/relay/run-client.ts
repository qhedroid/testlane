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
 *   - stepResults: now backed by run_step_results (new-tables candidate, Phase
 *     A). The server list response carries a `steps` layer per run case (each
 *     step snapshot's id, live originalStepId, position, and status), which
 *     realRunToLocal folds into CaseExecution.stepResults keyed by the live
 *     step id. Writes go through recordRealStepResult, addressed by step
 *     snapshot id (runStepSnapshotMap bridges live step id → snapshot id).
 *   - executionLog: now server-backed by run_case_events (new-tables candidate,
 *     Phase B). The list response carries an `events` array (one 'created' per
 *     case at spawn, one 'result' per status transition), which realRunToLocal
 *     reconstructs into ExecutionLogEntry[] keyed by live test case id — so the
 *     dashboard's week-over-week trend counts and per-case history work for
 *     synced real runs, not just local ones. actorId → display name via the
 *     same seed-user map as executedBy; a stable id is synthesized per event.
 *   - defects: active run_defect_links come back as external defect refs
 *     (strings) and map onto CaseExecution.defects, which the UI already
 *     renders as "legacy external keys".
 */

import type { CaseExecution, DemoRun, ExecStatus, ExecutionLogEntry } from '@/fresh/data/demo-model'
import { EXEC_TO_LEGACY, LEGACY_TO_EXEC, type ResultStatus } from '@/fresh/data/demo-model'
import type { ApiErrorBody, ApiSuccessBody } from '@/lib/api/types'
import { TestlaneApiError } from './project-client'
import { userIdToAssigneeName } from './case-client'

async function parseResponse<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiSuccessBody<T> | ApiErrorBody
  if (!res.ok) {
    const err = 'error' in json ? json.error : { code: 'UNKNOWN', message: res.statusText }
    throw new TestlaneApiError(err.code, err.message)
  }
  return (json as ApiSuccessBody<T>).data
}

// ---------------------------------------------------------------------------
// Server DTO shapes (JSON-serialised from packages/db/src/runs/read.ts and
// packages/db/services/TestRunService.ts)
// ---------------------------------------------------------------------------

export type RealRunStatus = 'active' | 'stalled' | 'sealed' | 'archived'
export type RealCaseResultStatus = 'not_run' | 'pass' | 'fail' | 'blocked' | 'skip' | 'skipped'

export interface RealRunStepResult {
  stepSnapshotId: string
  originalStepId: string | null
  position: number
  status: RealCaseResultStatus
}

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
  steps: RealRunStepResult[]
}

/**
 * One append-only execution event (new-tables candidate, Phase B), from
 * packages/db/src/runs/read.ts RunCaseEventItem. `at` is JSON-serialised to an
 * ISO string; from/to are the server's lowercase result enums (null for
 * 'created' events, which carry no transition). testCaseId is the LIVE case id
 * (resolved server-side from the run case), matching the local executionLog.
 */
export interface RealRunCaseEvent {
  testCaseId: string
  at: string
  actorId: string | null
  event: 'created' | 'result'
  fromStatus: RealCaseResultStatus | null
  toStatus: RealCaseResultStatus | null
}

export interface RealRunListItem {
  id: string
  runRef: string
  title: string
  description: string | null
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
  /** Chronological run_case_events (new-tables candidate, Phase B). Feeds executionLog. */
  events: RealRunCaseEvent[]
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
  description?: string | null
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
    description?: string | null
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

/** Record a per-step result (new-tables candidate, Phase A). Addressed by the
 * step snapshot id — the caller resolves it from the live step id via
 * runStepSnapshotMap / FreshProvider's runStepSnapshotIdsRef. */
export async function recordRealStepResult(
  runId: string,
  testRunCaseId: string,
  stepSnapshotId: string,
  body: { status: RealCaseResultStatus; comment?: string | null },
): Promise<void> {
  await parseResponse(
    await fetch(
      `/api/runs/${runId}/cases/${testRunCaseId}/steps/${stepSnapshotId}/result`,
      {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
    ),
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
 * testCaseId -> (live originalStepId -> stepSnapshotId) for a fetched run
 * (new-tables candidate, Phase A). The step-result endpoint is addressed by
 * step snapshot id, but CaseExecution.stepResults is keyed by live step id —
 * FreshProvider caches this map (runStepSnapshotIdsRef) to bridge step writes.
 * Steps whose originalStepId is null (the live step was deleted after snapshot)
 * are omitted — they can't be matched to a fresh-screen step id.
 */
export function runStepSnapshotMap(
  cases: RealRunCaseResult[],
): Record<string, Record<string, string>> {
  const result: Record<string, Record<string, string>> = {}
  for (const c of cases) {
    const stepMap: Record<string, string> = {}
    for (const s of c.steps) {
      if (s.originalStepId) stepMap[s.originalStepId] = s.stepSnapshotId
    }
    result[c.testCaseId] = stepMap
  }
  return result
}

/**
 * Server run -> frontend DemoRun. `planTitleById` fills planName from the
 * already-synced plans. description, per-step results, and the executionLog are
 * all server-backed now (new-tables candidate, Phases A + B): executionLog is
 * rebuilt from the run's `events` (run_case_events), so the dashboard's
 * week-over-week trend counts and per-case history work for synced real runs.
 *
 * `defectIdByRef` (new-tables candidate, Phase E) maps a defect_ref back to its
 * internal defect entity id. Active defect refs on a run-case are INTERNAL when
 * present in this map (rendered/linked by entity id, matching the local
 * CREATE_DEFECT_AND_LINK model) and EXTERNAL otherwise (kept as the free-text
 * ref string, exactly as before — unchanged behaviour).
 */
export function realRunToLocal(
  r: RealRunListItem,
  projectId: string,
  planTitleById: Map<string, string>,
  defectIdByRef?: Map<string, string>,
): DemoRun {
  const ordered = [...r.cases].sort((a, b) => a.position - b.position)
  const executions: Record<string, CaseExecution> = {}
  for (const c of ordered) {
    // Step results keyed by the live step id (originalStepId). Steps with no
    // result yet (not_run) or a deleted live step (null originalStepId) are
    // omitted from the map.
    const stepResults: Record<string, ExecStatus> = {}
    for (const s of c.steps) {
      if (!s.originalStepId || s.status === 'not_run') continue
      stepResults[s.originalStepId] = toExecStatus(s.status)
    }
    const hasStepResults = Object.keys(stepResults).length > 0
    const hasAnything =
      c.status !== 'not_run' ||
      c.comment ||
      c.defectRefs.length > 0 ||
      c.assignedTo ||
      hasStepResults
    if (!hasAnything) continue
    executions[c.testCaseId] = {
      status: toExecStatus(c.status),
      stepResults,
      ...(c.assignedTo ? { assignee: userIdToAssigneeName(c.assignedTo) } : {}),
      ...(c.comment ? { resultNotes: c.comment } : {}),
      ...(c.defectRefs.length > 0
        ? { defects: c.defectRefs.map((ref) => defectIdByRef?.get(ref) ?? ref) }
        : {}),
      ...(c.executedAt ? { testedAt: c.executedAt } : {}),
      ...(c.executedBy ? { testedBy: userIdToAssigneeName(c.executedBy) } : {}),
    }
  }
  // executionLog from run_case_events (new-tables candidate, Phase B). The
  // server orders events chronologically; from/to are null for 'created'
  // events (which project-selectors skips) — default them to 'Not run' so the
  // ExecutionLogEntry.from/to shape (non-null ExecStatus) always holds. The id
  // is synthesized stably (server order + index) so collectHistoryEvents'
  // dedup key `${run.id}:${entry.id}` stays unique across fetches.
  const executionLog: ExecutionLogEntry[] = (r.events ?? []).map((e, i) => ({
    id: `evt-${e.event}-${e.testCaseId}-${new Date(e.at).getTime()}-${i}`,
    caseId: e.testCaseId,
    at: new Date(e.at).toISOString(),
    by: userIdToAssigneeName(e.actorId) ?? 'Unknown',
    from: e.fromStatus ? toExecStatus(e.fromStatus) : 'Not run',
    to: e.toStatus ? toExecStatus(e.toStatus) : 'Not run',
    ...(e.event === 'created' ? { event: 'created' as const } : {}),
  }))
  return {
    id: r.id,
    projectId,
    runKey: r.runRef,
    name: r.title,
    description: r.description ?? undefined,
    planId: r.testPlanId ?? undefined,
    planName: r.testPlanId ? planTitleById.get(r.testPlanId) : undefined,
    due: r.dueDate ?? undefined,
    createdAt: r.createdAt,
    sealed: r.status === 'sealed',
    ...(r.status === 'archived' ? { archivedAt: r.updatedAt } : {}),
    caseOrder: ordered.map((c) => c.testCaseId),
    executions,
    executionLog,
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
