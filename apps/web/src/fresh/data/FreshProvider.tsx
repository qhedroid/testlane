'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type ReactNode,
} from 'react'
import { buildInitialDemoState, getCurrentRun, mergeSeedRuns } from './demo-seed'
import { migrateDemoState } from './migrate-demo-state'
import type { AdminUser, Case, CaseExecution, Defect, DemoRun, DemoState, ExecStatus, ExecutionLogEntry, Folder, Project, ProjectSettings, Requirement, TestPlan } from './demo-model'
import { isAdminAction, reduceAdminState, type AdminAction, type InviteUserPayload, type UpdateUserPayload } from './admin-reducer'
import { SEED_ADMIN_USER_ID } from './admin-initial-settings'
import type { RolePermissions } from './rbac'
import {
  getActiveProject,
  getActiveProjectCurrentRunId,
  getActiveProjectNextCaseNum,
  getActiveProjectNextDefectNum,
  getActiveProjectNextRequirementNum,
  getActiveProjectNextRunNum,
  getProjectByKey,
  isProjectKeyUnique,
  listActiveProjectDefects,
  listActiveProjectFolders,
  listActiveProjectPlans,
  listActiveProjectRequirements,
  listActiveProjectRuns,
  listActiveProjectTestCases,
  listProjects,
} from './project-selectors'
import { findRunById } from './run-utils'
import { formatCaseKey, formatDefectKey, formatPlanKey, formatRequirementKey, formatRunKey, newId, resolvePlanCases } from './demo-model'
import { fetchRealProjects } from '@/lib/relay/project-client'
import {
  archiveRealCase,
  createRealCase,
  createRealFolder,
  fetchRealCases,
  fetchRealFolders,
  isRealId,
  localCasePatchToUpdateBody,
  localCaseToCreateBody,
  realCaseToLocal,
  realFolderToLocal,
  updateRealCase,
} from '@/lib/relay/case-client'
import {
  archiveRealPlan,
  createRealPlan,
  fetchRealPlans,
  realPlanDetailToLocal,
  realPlanToLocal,
  setRealPlanCases,
  updateRealPlan,
} from '@/lib/relay/plan-client'
import {
  ADMIN_ROLE_TO_GLOBAL,
  GLOBAL_TO_ADMIN_ROLE,
  createRealUser,
  fetchRealUsers,
  updateRealUser,
  type RealUser,
} from '@/lib/relay/user-client'
import {
  createRealRun,
  fetchRealRunDetail,
  fetchRealRuns,
  realCreatedRunToLocal,
  realRunToLocal,
  recordRealCaseResult,
  runCaseIdMap,
  toRealResultStatus,
  updateRealRun,
} from '@/lib/relay/run-client'

const STORAGE_KEY = 'relay-demo-v2'
const DEMO_RESET_PARAM = 'relay-reset'

function isDemoResetRequested(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get(DEMO_RESET_PARAM) === '1'
}

/**
 * Data-layer refactor: the localStorage-only fallback project ("DP",
 * client-side) is gone — the backend is the only source of projects. Persisted
 * state from older versions may still carry local projects; strip them (and
 * their entities) on load so the cache only ever mirrors real data plus
 * local-only fields.
 */
function dropLocalProjects(state: DemoState): DemoState {
  const localIds = Object.values(state.projectsById)
    .filter((p) => p.source !== 'real')
    .map((p) => p.id)
  if (localIds.length === 0) return state
  const gone = new Set(localIds)
  const projectsById = Object.fromEntries(
    Object.entries(state.projectsById).filter(([id]) => !gone.has(id)),
  )
  const remaining = Object.keys(projectsById)
  return {
    ...state,
    projectsById,
    activeProjectId: gone.has(state.activeProjectId)
      ? (remaining[0] ?? '')
      : state.activeProjectId,
    folders: state.folders.filter((f) => !gone.has(f.projectId)),
    cases: state.cases.filter((c) => !gone.has(c.projectId)),
    runs: state.runs.filter((r) => !gone.has(r.projectId)),
    plansById: Object.fromEntries(
      Object.entries(state.plansById).filter(([, pl]) => !gone.has(pl.projectId)),
    ),
    requirementsById: Object.fromEntries(
      Object.entries(state.requirementsById ?? {}).filter(([, r]) => !gone.has(r.projectId)),
    ),
    defectsById: Object.fromEntries(
      Object.entries(state.defectsById ?? {}).filter(([, d]) => !gone.has(d.projectId)),
    ),
  }
}

/** Full-screen boot gate shown while no projects exist in state: connecting
 * spinner until the real-project fetch resolves, then an error/retry panel if
 * it resolved with nothing (API down, not seeded, or session problem). */
function BootGate({ resolved }: { resolved: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', flexDirection: 'column', gap: 12, fontFamily: 'inherit', color: 'var(--text2, #444)' }}>
      {resolved ? (
        <>
          <i className="ti ti-plug-connected-x" style={{ fontSize: 28 }} aria-hidden />
          <div style={{ fontSize: 15, fontWeight: 600 }}>Can&apos;t load projects</div>
          <div style={{ fontSize: 13, maxWidth: 380, textAlign: 'center' }}>
            The Relay API returned no projects. Check that the server and database are running
            and seeded (<code>pnpm db:seed</code>), then retry.
          </div>
          <button type="button" className="btn btn-p" onClick={() => window.location.reload()}>
            Retry
          </button>
        </>
      ) : (
        <>
          <i className="ti ti-loader-2" style={{ fontSize: 26 }} aria-hidden />
          <div style={{ fontSize: 13 }}>Connecting to Relay…</div>
        </>
      )}
    </div>
  )
}

function runIsMutable(state: DemoState, runId: string): boolean {
  const run = findRunById(state, runId)
  return !!run && !run.sealed
}

function loadState(): DemoState {
  if (typeof window === 'undefined') return buildInitialDemoState()
  if (isDemoResetRequested()) {
    try {
      localStorage.removeItem(STORAGE_KEY)
      const fresh = buildInitialDemoState()
      localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh))
      return fresh
    } catch (err) {
      console.error('[relay-demo] Failed to reset persisted state:', err)
      return buildInitialDemoState()
    }
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const migrated = dropLocalProjects(
        migrateDemoState(mergeSeedRuns(JSON.parse(raw) as DemoState)),
      )
      try {
        const next = JSON.stringify(migrated)
        if (next !== raw) localStorage.setItem(STORAGE_KEY, next)
      } catch {
        /* ignore quota */
      }
      return migrated
    }
  } catch (err) {
    console.error('[relay-demo] Failed to load persisted state:', err)
  }
  return buildInitialDemoState()
}

function errMsg(err: unknown): string {
  return err instanceof Error ? err.message : 'Unknown error'
}

function persistState(state: DemoState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (err) {
    console.error('[relay-demo] Failed to persist state:', err)
  }
}

export type FreshAction =
  | AdminAction
  | {
      type: 'REGISTER_REAL_PROJECTS'
      projects: { id: string; slug: string; name: string; description?: string | null }[]
    }
  | { type: 'UPDATE_PROJECT'; projectId: string; patch: Partial<Pick<Project, 'name' | 'key' | 'description'>> }
  | { type: 'UPDATE_ACTIVE_CUSTOM_FIELDS'; projectId: string; activeCustomFieldIds: string[] }
  | { type: 'UPDATE_PROJECT_SETTINGS'; projectId: string; projectSettings: ProjectSettings }
  | { type: 'DELETE_PROJECT'; projectId: string }
  | { type: 'SET_ACTIVE_PROJECT'; projectId: string }
  | { type: 'ADD_CASE'; case: Case }
  | { type: 'UPDATE_CASE'; caseId: string; patch: Partial<Case> }
  | { type: 'REPLACE_CASE'; case: Case }
  | { type: 'DELETE_CASE'; caseId: string }
  | { type: 'UPDATE_RUN_EXECUTION'; runId: string; caseId: string; patch: Partial<CaseExecution> }
  | { type: 'UPDATE_RUN'; runId: string; patch: Partial<Pick<DemoRun, 'name' | 'description' | 'due' | 'planName'>> }
  | { type: 'ADD_CASES_TO_RUN'; runId: string; caseIds: string[] }
  | { type: 'ADD_STEP_COMMENT'; caseId: string; stepId: string; author: string; body: string }
  | { type: 'ADD_GENERAL_COMMENT'; caseId: string; author: string; body: string }
  | { type: 'SEAL_RUN'; runId: string }
  | { type: 'UNSEAL_RUN'; runId: string }
  | { type: 'SET_CURRENT_RUN'; runId: string }
  | { type: 'CREATE_RUN'; id?: string; name: string; description?: string; caseIds?: string[]; planId?: string; planName?: string }
  | { type: 'DUPLICATE_RUN'; runId: string; newRunId?: string }
  | { type: 'ARCHIVE_RUN'; runId: string }
  | { type: 'DELETE_RUN'; runId: string }
  | { type: 'ADD_PLAN'; plan: TestPlan }
  | { type: 'UPDATE_PLAN'; planId: string; patch: Partial<Pick<TestPlan, 'title' | 'description' | 'queries'>> }
  | { type: 'DELETE_PLAN'; planId: string }
  | { type: 'DUPLICATE_PLAN'; newPlan: TestPlan }
  | { type: 'ADD_FOLDER'; folder: Folder }
  | { type: 'ADD_RUN'; run: DemoRun }
  | { type: 'CREATE_REQUIREMENT'; requirement: Requirement }
  | { type: 'LINK_REQUIREMENT_TO_CASE'; caseId: string; requirementId: string }
  | { type: 'CREATE_DEFECT_AND_LINK'; defect: Defect; runId: string; caseId: string }
  | { type: 'LINK_DEFECT_TO_EXECUTION'; runId: string; caseId: string; defectId: string }
  | { type: 'HYDRATE'; state: DemoState }
  | { type: 'SYNC_REAL_PROJECT_DATA'; projectId: string; folders: Folder[]; cases: Case[]; plans: TestPlan[]; runs: DemoRun[] }
  | { type: 'SYNC_REAL_USERS'; users: RealUser[] }
  | { type: 'RECONCILE_ADMIN_USER'; email: string; user: RealUser }

/**
 * Merge fields the real backend has no tables for (comments, custom field
 * values, requirement links, references, template) from an existing local
 * copy of a case onto its server-fetched version. This is what makes
 * CasesScreen a *hybrid* screen for real projects — real data where the DB
 * backs it, localStorage data where it doesn't (per the Phase 2 screen-wiring
 * note in docs/claude/mvp-backend/progress.md).
 *
 * Step comments are matched by step id first, falling back to position —
 * the server regenerates ULIDs for steps submitted with temp local ids, so
 * id-match alone would drop comments right after an optimistic create.
 */
function mergeLocalOnlyCaseFields(serverCase: Case, localCase: Case | undefined): Case {
  if (!localCase) return serverCase
  return {
    ...serverCase,
    generalComments: localCase.generalComments,
    customFieldValues: localCase.customFieldValues,
    requirementIds: localCase.requirementIds,
    references: localCase.references,
    template: localCase.template,
    steps: serverCase.steps.map((s, i) => {
      const localStep = localCase.steps.find((ls) => ls.id === s.id) ?? localCase.steps[i]
      return localStep && localStep.comments.length > 0 ? { ...s, comments: localStep.comments } : s
    }),
  }
}

/**
 * The plans equivalent of mergeLocalOnlyCaseFields: `queries` are the
 * local-only authoring model (no server storage — GAP-01). If the local copy
 * has any *authored* query group (anything other than the `q-server-*`
 * static group synthesized by realPlanToLocal), it wins over the server's
 * synthesized static list; otherwise the fresh server list is taken.
 */
function mergeLocalOnlyPlanFields(serverPlan: TestPlan, localPlan: TestPlan | undefined): TestPlan {
  if (!localPlan) return serverPlan
  const hasAuthoredQueries = localPlan.queries.some((q) => !q.id.startsWith('q-server-'))
  return hasAuthoredQueries ? { ...serverPlan, queries: localPlan.queries } : serverPlan
}

/**
 * The runs equivalent (Phase 4): description, per-case stepResults, and the
 * executionLog have no server storage — keep them from the local copy. The
 * server wins on per-case status/comment/defects (same accepted stale-fetch
 * race as cases); local execution entries for cases the server hasn't seen
 * yet are retained.
 */
function mergeLocalOnlyRunFields(serverRun: DemoRun, localRun: DemoRun | undefined): DemoRun {
  if (!localRun) return serverRun
  const executions: Record<string, CaseExecution> = { ...localRun.executions }
  for (const [caseId, serverEx] of Object.entries(serverRun.executions)) {
    const localEx = localRun.executions[caseId]
    executions[caseId] = { ...serverEx, stepResults: localEx?.stepResults ?? {} }
  }
  return {
    ...serverRun,
    description: localRun.description,
    executions,
    executionLog: localRun.executionLog ?? [],
  }
}

function reducer(state: DemoState, action: FreshAction): DemoState {
  if (isAdminAction(action)) {
    const next = reduceAdminState(state, action)
    persistState(next)
    return next
  }
  let next: DemoState
  switch (action.type) {
    case 'HYDRATE':
      return action.state
    case 'UPDATE_PROJECT': {
      const existing = state.projectsById[action.projectId]
      if (!existing) return state
      next = {
        ...state,
        projectsById: {
          ...state.projectsById,
          [action.projectId]: { ...existing, ...action.patch },
        },
      }
      break
    }
    case 'REGISTER_REAL_PROJECTS': {
      // Replaces the fresh app's single client-only "Demo Project" (DP) with
      // the real backend projects (mvp-backend "wire everything" session,
      // Shaun's "build a real project picker" call — see handoff.md). Real
      // projects use their actual DB ULID as `id` and `slug.toUpperCase()` as
      // `key`, so every existing folder/case/run/plan action (which all key
      // off `state.activeProjectId`) keeps working unchanged. No-op if the
      // fetch returned nothing (e.g. offline) or everything is already
      // registered, so this doesn't thrash/re-persist on every render.
      const incoming = action.projects
      if (incoming.length === 0) return state

      const existingRealIds = new Set(
        Object.values(state.projectsById)
          .filter((p) => p.source === 'real')
          .map((p) => p.id),
      )
      const incomingIds = new Set(incoming.map((p) => p.id))
      const alreadyRegistered =
        existingRealIds.size === incomingIds.size &&
        incoming.every((p) => existingRealIds.has(p.id))
      if (alreadyRegistered) return state

      const projectsById: Record<string, Project> = { ...state.projectsById }
      const currentRunIdByProject = { ...state.currentRunIdByProject }
      const nextCaseNumByProject = { ...state.nextCaseNumByProject }
      const nextRunNumByProject = { ...state.nextRunNumByProject }
      const nextPlanNumByProject = { ...state.nextPlanNumByProject }
      const nextRequirementNumByProject = { ...(state.nextRequirementNumByProject ?? {}) }
      const nextDefectNumByProject = { ...(state.nextDefectNumByProject ?? {}) }

      // Drop any non-real (local-only) projects — real projects fully replace
      // them once the backend is wired, rather than coexisting confusingly.
      for (const [id, p] of Object.entries(projectsById)) {
        if (p.source === 'real') continue
        delete projectsById[id]
        delete currentRunIdByProject[id]
        delete nextCaseNumByProject[id]
        delete nextRunNumByProject[id]
        delete nextPlanNumByProject[id]
        delete nextRequirementNumByProject[id]
        delete nextDefectNumByProject[id]
      }

      for (const p of incoming) {
        const existing = projectsById[p.id]
        projectsById[p.id] = {
          id: p.id,
          name: p.name,
          key: p.slug.toUpperCase(),
          description: p.description ?? undefined,
          source: 'real',
          activeCustomFieldIds: existing?.activeCustomFieldIds ?? [],
          projectSettings: existing?.projectSettings,
          createdAt: existing?.createdAt ?? new Date().toISOString(),
        }
        if (!(p.id in currentRunIdByProject)) currentRunIdByProject[p.id] = ''
        if (!(p.id in nextCaseNumByProject)) nextCaseNumByProject[p.id] = 1
        if (!(p.id in nextRunNumByProject)) nextRunNumByProject[p.id] = 1
        if (!(p.id in nextPlanNumByProject)) nextPlanNumByProject[p.id] = 1
        if (!(p.id in nextRequirementNumByProject)) nextRequirementNumByProject[p.id] = 1
        if (!(p.id in nextDefectNumByProject)) nextDefectNumByProject[p.id] = 1
      }

      const remainingProjectIds = new Set(Object.keys(projectsById))
      let activeProjectId = state.activeProjectId
      if (!remainingProjectIds.has(activeProjectId)) {
        // Prefer the seeded Demo Project (slug 'dp' — the app's "DP" project)
        // as the default landing project — it's the richly-populated,
        // explorable one — falling back to whichever real project happens to
        // come first if it's missing (e.g. local DB not yet seeded with it).
        const demo = incoming.find((p) => p.slug === 'dp')
        activeProjectId = demo?.id ?? incoming[0]?.id ?? activeProjectId
      }

      next = {
        ...state,
        projectsById,
        activeProjectId,
        currentRunIdByProject,
        nextCaseNumByProject,
        nextRunNumByProject,
        nextPlanNumByProject,
        nextRequirementNumByProject,
        nextDefectNumByProject,
        folders: state.folders.filter((f) => remainingProjectIds.has(f.projectId)),
        cases: state.cases.filter((c) => remainingProjectIds.has(c.projectId)),
        runs: state.runs.filter((r) => remainingProjectIds.has(r.projectId)),
        plansById: Object.fromEntries(
          Object.entries(state.plansById).filter(([, pl]) => remainingProjectIds.has(pl.projectId)),
        ),
        requirementsById: Object.fromEntries(
          Object.entries(state.requirementsById ?? {}).filter(([, r]) => remainingProjectIds.has(r.projectId)),
        ),
        defectsById: Object.fromEntries(
          Object.entries(state.defectsById ?? {}).filter(([, d]) => remainingProjectIds.has(d.projectId)),
        ),
      }
      break
    }
    case 'UPDATE_ACTIVE_CUSTOM_FIELDS': {
      const existing = state.projectsById[action.projectId]
      if (!existing) return state
      next = {
        ...state,
        projectsById: {
          ...state.projectsById,
          [action.projectId]: { ...existing, activeCustomFieldIds: action.activeCustomFieldIds },
        },
      }
      break
    }
    case 'UPDATE_PROJECT_SETTINGS': {
      const existing = state.projectsById[action.projectId]
      if (!existing) return state
      next = {
        ...state,
        projectsById: {
          ...state.projectsById,
          [action.projectId]: { ...existing, projectSettings: action.projectSettings },
        },
      }
      break
    }
    case 'DELETE_PROJECT': {
      const { projectId } = action
      const { [projectId]: _removed, ...restProjects } = state.projectsById
      const { [projectId]: _run, ...restRunIds } = state.currentRunIdByProject
      const { [projectId]: _num, ...restNums } = state.nextCaseNumByProject
      const { [projectId]: _runNum, ...restRunNums } = state.nextRunNumByProject
      const { [projectId]: _planNum, ...restPlanNums } = state.nextPlanNumByProject
      const { [projectId]: _reqNum, ...restReqNums } = state.nextRequirementNumByProject ?? {}
      const { [projectId]: _defNum, ...restDefNums } = state.nextDefectNumByProject ?? {}

      let projectsById = restProjects
      let activeProjectId = state.activeProjectId
      let currentRunIdByProject = restRunIds
      let nextCaseNumByProject = restNums
      let nextRunNumByProject = restRunNums
      let nextPlanNumByProject = restPlanNums
      let nextRequirementNumByProject = restReqNums
      let nextDefectNumByProject = restDefNums

      if (state.activeProjectId === projectId) {
        const remaining = Object.keys(restProjects)
        if (remaining.length > 0) {
          activeProjectId = remaining[0]
        } else {
          // No local fallback project any more (data-layer refactor) — an
          // empty project set makes FreshProvider render its connect gate.
          activeProjectId = ''
        }
      }

      const remainingPlanIds = new Set(
        Object.values(state.plansById)
          .filter((p) => p.projectId !== projectId)
          .map((p) => p.id),
      )
      const remainingRequirementIds = new Set(
        Object.values(state.requirementsById ?? {})
          .filter((r) => r.projectId !== projectId)
          .map((r) => r.id),
      )
      const remainingDefectIds = new Set(
        Object.values(state.defectsById ?? {})
          .filter((d) => d.projectId !== projectId)
          .map((d) => d.id),
      )

      next = {
        ...state,
        projectsById,
        activeProjectId,
        folders: state.folders.filter((f) => f.projectId !== projectId),
        cases: state.cases.filter((c) => c.projectId !== projectId),
        runs: state.runs.filter((r) => r.projectId !== projectId),
        plansById: Object.fromEntries(
          Object.entries(state.plansById).filter(([id]) => remainingPlanIds.has(id)),
        ),
        requirementsById: Object.fromEntries(
          Object.entries(state.requirementsById ?? {}).filter(([id]) => remainingRequirementIds.has(id)),
        ),
        defectsById: Object.fromEntries(
          Object.entries(state.defectsById ?? {}).filter(([id]) => remainingDefectIds.has(id)),
        ),
        currentRunIdByProject,
        nextCaseNumByProject,
        nextRunNumByProject,
        nextPlanNumByProject,
        nextRequirementNumByProject,
        nextDefectNumByProject,
      }
      break
    }
    case 'SET_ACTIVE_PROJECT':
      if (!state.projectsById[action.projectId]) return state
      next = { ...state, activeProjectId: action.projectId }
      break
    case 'ADD_CASE': {
      const projectId = state.activeProjectId
      const num = getActiveProjectNextCaseNum(state)
      // Server-created cases arrive with their real caseKey already set;
      // only local-only creations fall back to the client counter format.
      const caseKey = action.case.caseKey ?? formatCaseKey(num)
      next = {
        ...state,
        cases: [...state.cases, { ...action.case, caseKey }],
        nextCaseNumByProject: { ...state.nextCaseNumByProject, [projectId]: num + 1 },
      }
      break
    }
    case 'UPDATE_CASE':
      next = {
        ...state,
        cases: state.cases.map((c) =>
          c.id === action.caseId ? { ...c, ...action.patch, updatedAt: new Date().toISOString() } : c,
        ),
      }
      break
    case 'REPLACE_CASE':
      next = {
        ...state,
        cases: state.cases.map((c) => {
          if (c.id !== action.case.id) return c
          return { ...action.case, createdAt: c.createdAt ?? action.case.createdAt }
        }),
      }
      break
    case 'DELETE_CASE':
      next = {
        ...state,
        cases: state.cases.filter((c) => c.id !== action.caseId),
        runs: state.runs.map((r) => {
          if (r.sealed) return r
          return {
            ...r,
            caseOrder: r.caseOrder.filter((id) => id !== action.caseId),
            executions: Object.fromEntries(
              Object.entries(r.executions).filter(([id]) => id !== action.caseId)
            ),
          }
        }),
      }
      break
    case 'UPDATE_RUN_EXECUTION': {
      if (!runIsMutable(state, action.runId)) return state
      const runs = state.runs.map((r) => {
        if (r.id !== action.runId) return r
        const prev = r.executions[action.caseId] ?? { status: 'Not run' as ExecStatus, stepResults: {} }
        const newEx: CaseExecution = { ...prev, ...action.patch }
        let executionLog = r.executionLog ?? []
        if (action.patch.status && action.patch.status !== prev.status) {
          executionLog = [
            ...executionLog,
            {
              id: newId('log'),
              caseId: action.caseId,
              at: new Date().toISOString(),
              by: newEx.assignee ?? prev.assignee ?? 'Shaun Sevume',
              from: prev.status,
              to: action.patch.status,
            },
          ]
          if (action.patch.status !== 'Not run') {
            newEx.testedAt = new Date().toISOString()
            newEx.testedBy = newEx.assignee ?? prev.assignee ?? 'Shaun Sevume'
          }
        }
        return {
          ...r,
          executions: { ...r.executions, [action.caseId]: newEx },
          executionLog,
        }
      })
      next = { ...state, runs }
      break
    }
    case 'UPDATE_RUN': {
      next = {
        ...state,
        runs: state.runs.map((r) =>
          r.id === action.runId ? { ...r, ...action.patch } : r,
        ),
      }
      break
    }
    case 'ADD_CASES_TO_RUN': {
      const now = new Date().toISOString()
      next = {
        ...state,
        runs: state.runs.map((r) => {
          if (r.id !== action.runId) return r
          const existing = new Set(r.caseOrder)
          const newIds = action.caseIds.filter((id) => !existing.has(id))
          if (newIds.length === 0) return r
          const createdEntries: ExecutionLogEntry[] = newIds.map((caseId) => ({
            id: newId('log'),
            caseId,
            at: now,
            by: 'Shaun Sevume',
            from: 'Not run' as ExecStatus,
            to: 'Not run' as ExecStatus,
            event: 'created' as const,
          }))
          return {
            ...r,
            caseOrder: [...r.caseOrder, ...newIds],
            executionLog: [...(r.executionLog ?? []), ...createdEntries],
          }
        }),
      }
      break
    }
    case 'ADD_STEP_COMMENT': {
      const cases = state.cases.map((c) => {
        if (c.id !== action.caseId) return c
        return {
          ...c,
          updatedAt: new Date().toISOString(),
          steps: c.steps.map((s) =>
            s.id === action.stepId
              ? {
                  ...s,
                  comments: [
                    ...s.comments,
                    { id: newId('cmt'), author: action.author, createdAt: new Date().toISOString(), body: action.body },
                  ],
                }
              : s,
          ),
        }
      })
      next = { ...state, cases }
      break
    }
    case 'ADD_GENERAL_COMMENT': {
      const cases = state.cases.map((c) => {
        if (c.id !== action.caseId) return c
        return {
          ...c,
          updatedAt: new Date().toISOString(),
          generalComments: [
            ...c.generalComments,
            { id: newId('gcmt'), author: action.author, createdAt: new Date().toISOString(), body: action.body },
          ],
        }
      })
      next = { ...state, cases }
      break
    }
    case 'SEAL_RUN':
      next = {
        ...state,
        runs: state.runs.map((r) => (r.id === action.runId ? { ...r, sealed: true } : r)),
      }
      break
    case 'UNSEAL_RUN':
      next = {
        ...state,
        runs: state.runs.map((r) => (r.id === action.runId ? { ...r, sealed: false } : r)),
      }
      break
    case 'CREATE_RUN': {
      const projectId = state.activeProjectId
      const num = getActiveProjectNextRunNum(state)
      const runKey = formatRunKey(num)
      // Callers that need the id up-front (real-API write-through reconcile)
      // pass their own; everyone else keeps the reducer-generated one.
      const id = action.id ?? newId('run')
      const caseOrder = action.caseIds ?? listActiveProjectTestCases(state).map((c) => c.id)
      const run: DemoRun = {
        id,
        projectId,
        runKey,
        name: action.name.trim() || 'Untitled run',
        description: action.description?.trim() || undefined,
        planId: action.planId,
        planName: action.planName,
        createdAt: new Date().toISOString(),
        sealed: false,
        caseOrder,
        executions: {},
      }
      next = {
        ...state,
        runs: [...state.runs, run],
        nextRunNumByProject: { ...state.nextRunNumByProject, [projectId]: num + 1 },
        currentRunIdByProject: { ...state.currentRunIdByProject, [projectId]: id },
      }
      break
    }
    case 'DUPLICATE_RUN': {
      const source = findRunById(state, action.runId)
      if (!source) return state
      const projectId = source.projectId
      const num = state.nextRunNumByProject[projectId] ?? 1
      const runKey = formatRunKey(num)
      const id = action.newRunId ?? newId('run')
      const copy: DemoRun = {
        ...source,
        id,
        runKey,
        name: `${source.name} (copy)`,
        description: source.description,
        createdAt: new Date().toISOString(),
        sealed: false,
        archivedAt: undefined,
        caseOrder: [...source.caseOrder],
        executions: {},
      }
      next = {
        ...state,
        runs: [...state.runs, copy],
        nextRunNumByProject: { ...state.nextRunNumByProject, [projectId]: num + 1 },
        currentRunIdByProject: { ...state.currentRunIdByProject, [projectId]: id },
      }
      break
    }
    case 'ARCHIVE_RUN': {
      const archivedAt = new Date().toISOString()
      next = {
        ...state,
        runs: state.runs.map((r) =>
          r.id === action.runId ? { ...r, archivedAt } : r,
        ),
        currentRunIdByProject:
          state.currentRunIdByProject[state.activeProjectId] === action.runId
            ? { ...state.currentRunIdByProject, [state.activeProjectId]: '' }
            : state.currentRunIdByProject,
      }
      break
    }
    case 'DELETE_RUN': {
      const run = findRunById(state, action.runId)
      if (!run) return state
      const clearsSelection = state.currentRunIdByProject[run.projectId] === action.runId
      next = {
        ...state,
        runs: state.runs.filter((r) => r.id !== action.runId),
        currentRunIdByProject: clearsSelection
          ? { ...state.currentRunIdByProject, [run.projectId]: '' }
          : state.currentRunIdByProject,
      }
      break
    }
    case 'SET_CURRENT_RUN':
      next = {
        ...state,
        currentRunIdByProject: {
          ...state.currentRunIdByProject,
          [state.activeProjectId]: action.runId,
        },
      }
      break
    case 'ADD_FOLDER':
      next = { ...state, folders: [...state.folders, action.folder] }
      break
    case 'ADD_PLAN': {
      next = {
        ...state,
        plansById: { ...state.plansById, [action.plan.id]: action.plan },
        nextPlanNumByProject: {
          ...state.nextPlanNumByProject,
          [action.plan.projectId]: (state.nextPlanNumByProject[action.plan.projectId] ?? 1) + 1,
        },
      }
      break
    }
    case 'UPDATE_PLAN': {
      const existing = state.plansById[action.planId]
      if (!existing) return state
      next = {
        ...state,
        plansById: {
          ...state.plansById,
          [action.planId]: { ...existing, ...action.patch },
        },
      }
      break
    }
    case 'DELETE_PLAN': {
      const { [action.planId]: _removed, ...rest } = state.plansById
      next = { ...state, plansById: rest }
      break
    }
    case 'DUPLICATE_PLAN': {
      next = {
        ...state,
        plansById: { ...state.plansById, [action.newPlan.id]: action.newPlan },
        nextPlanNumByProject: {
          ...state.nextPlanNumByProject,
          [action.newPlan.projectId]: (state.nextPlanNumByProject[action.newPlan.projectId] ?? 1) + 1,
        },
      }
      break
    }
    case 'CREATE_REQUIREMENT': {
      next = {
        ...state,
        requirementsById: { ...(state.requirementsById ?? {}), [action.requirement.id]: action.requirement },
        nextRequirementNumByProject: {
          ...(state.nextRequirementNumByProject ?? {}),
          [action.requirement.projectId]:
            (state.nextRequirementNumByProject[action.requirement.projectId] ?? 1) + 1,
        },
      }
      break
    }
    case 'LINK_REQUIREMENT_TO_CASE': {
      next = {
        ...state,
        cases: state.cases.map((c) => {
          if (c.id !== action.caseId) return c
          const existing = c.requirementIds ?? []
          if (existing.includes(action.requirementId)) return c
          return { ...c, requirementIds: [...existing, action.requirementId], updatedAt: new Date().toISOString() }
        }),
      }
      break
    }
    case 'CREATE_DEFECT_AND_LINK': {
      if (!runIsMutable(state, action.runId)) return state
      const runs = state.runs.map((r) => {
        if (r.id !== action.runId) return r
        const prev = r.executions[action.caseId] ?? { status: 'Not run' as ExecStatus, stepResults: {} }
        const defects = prev.defects ?? []
        const defectIds = defects.includes(action.defect.id) ? defects : [...defects, action.defect.id]
        return {
          ...r,
          executions: {
            ...r.executions,
            [action.caseId]: { ...prev, defects: defectIds },
          },
        }
      })
      next = {
        ...state,
        runs,
        defectsById: { ...(state.defectsById ?? {}), [action.defect.id]: action.defect },
        nextDefectNumByProject: {
          ...(state.nextDefectNumByProject ?? {}),
          [action.defect.projectId]: (state.nextDefectNumByProject[action.defect.projectId] ?? 1) + 1,
        },
      }
      break
    }
    case 'LINK_DEFECT_TO_EXECUTION': {
      if (!runIsMutable(state, action.runId)) return state
      const defect = state.defectsById?.[action.defectId]
      if (!defect) return state
      const runs = state.runs.map((r) => {
        if (r.id !== action.runId) return r
        const prev = r.executions[action.caseId] ?? { status: 'Not run' as ExecStatus, stepResults: {} }
        const defects = prev.defects ?? []
        if (defects.includes(action.defectId)) return r
        return {
          ...r,
          executions: {
            ...r.executions,
            [action.caseId]: { ...prev, defects: [...defects, action.defectId] },
          },
        }
      })
      next = { ...state, runs }
      break
    }
    case 'ADD_RUN': {
      // Insert a server-created run (spawn-from-plan / duplicate) and make it
      // the project's current run — wait-for-server world's CREATE_RUN.
      next = {
        ...state,
        runs: [...state.runs, action.run],
        currentRunIdByProject: {
          ...state.currentRunIdByProject,
          [action.run.projectId]: action.run.id,
        },
      }
      break
    }
    case 'SYNC_REAL_PROJECT_DATA': {
      // Server data replaces this project's cases/folders wholesale, with two
      // exceptions: (1) local-only fields are merged back in per case (see
      // mergeLocalOnlyCaseFields), and (2) optimistic creates whose POST
      // hasn't reconciled yet (still carrying temp non-ULID ids) are kept, so
      // an in-flight create isn't wiped by a concurrently-resolving sync.
      // Real-id local cases the server no longer returns are dropped
      // (archived/removed elsewhere).
      const { projectId } = action
      const localCasesById = new Map(
        state.cases.filter((c) => c.projectId === projectId).map((c) => [c.id, c]),
      )
      const mergedCases = action.cases.map((serverCase) =>
        mergeLocalOnlyCaseFields(serverCase, localCasesById.get(serverCase.id)),
      )
      const pendingCases = state.cases.filter(
        (c) => c.projectId === projectId && !isRealId(c.id),
      )
      const pendingFolders = state.folders.filter(
        (f) => f.projectId === projectId && !isRealId(f.id),
      )
      const localProjectPlans = Object.values(state.plansById).filter(
        (p) => p.projectId === projectId,
      )
      const localPlanById = new Map(localProjectPlans.map((p) => [p.id, p]))
      const mergedPlans = action.plans.map((serverPlan) =>
        mergeLocalOnlyPlanFields(serverPlan, localPlanById.get(serverPlan.id)),
      )
      const pendingPlans = localProjectPlans.filter((p) => !isRealId(p.id))
      const localProjectRuns = state.runs.filter((r) => r.projectId === projectId)
      const localRunById = new Map(localProjectRuns.map((r) => [r.id, r]))
      const mergedRuns = action.runs.map((serverRun) =>
        mergeLocalOnlyRunFields(serverRun, localRunById.get(serverRun.id)),
      )
      const pendingRuns = localProjectRuns.filter((r) => !isRealId(r.id))
      // Clear a dangling current-run selection (e.g. a stale local run the
      // server replaced) so the screen falls back to its own picker logic.
      const validRunIds = new Set([...mergedRuns, ...pendingRuns].map((r) => r.id))
      const currentForProject = state.currentRunIdByProject[projectId]
      const currentRunIdByProject =
        currentForProject && !validRunIds.has(currentForProject)
          ? { ...state.currentRunIdByProject, [projectId]: '' }
          : state.currentRunIdByProject
      next = {
        ...state,
        cases: [
          ...state.cases.filter((c) => c.projectId !== projectId),
          ...mergedCases,
          ...pendingCases,
        ],
        folders: [
          ...state.folders.filter((f) => f.projectId !== projectId),
          ...action.folders,
          ...pendingFolders,
        ],
        plansById: {
          ...Object.fromEntries(
            Object.entries(state.plansById).filter(([, p]) => p.projectId !== projectId),
          ),
          ...Object.fromEntries(mergedPlans.map((p) => [p.id, p])),
          ...Object.fromEntries(pendingPlans.map((p) => [p.id, p])),
        },
        runs: [
          ...state.runs.filter((r) => r.projectId !== projectId),
          ...mergedRuns,
          ...pendingRuns,
        ],
        currentRunIdByProject,
      }
      break
    }
    case 'SYNC_REAL_USERS': {
      // Merge the real users table into the Admin mock user list (Phase 7).
      // Server users are matched to existing local rows by display name (the
      // 2026-07-09 seed/admin-mock overhaul aligned both sides on the same
      // 8-name roster); matched rows keep their local-only granular fields
      // (role, twoFa, projectAccess) and adopt the server id/email/active
      // state. Unmatched local rows with temp ids (e.g. "Demo User", fresh
      // invites still in flight) are kept; unmatched server users get a
      // synthesized row with the compressed-role reverse mapping.
      const byNameLocal = new Map(
        state.adminSettings.users.map((u) => [u.name.trim().toLowerCase(), u]),
      )
      const matchedLocalIds = new Set<string>()
      let currentActorUserId = state.currentActorUserId
      const merged: AdminUser[] = action.users.map((su) => {
        const local = byNameLocal.get(su.name.trim().toLowerCase())
        if (local) {
          matchedLocalIds.add(local.id)
          if (currentActorUserId === local.id) currentActorUserId = su.id
          return {
            ...local,
            id: su.id,
            email: su.email,
            status: !su.isActive
              ? ('Disabled' as const)
              : local.status === 'Disabled'
                ? ('Active' as const)
                : local.status,
            lastLoginAt: su.lastLoginAt ? new Date(su.lastLoginAt).getTime() : local.lastLoginAt,
          }
        }
        const [firstName, ...restName] = su.name.trim().split(/\s+/)
        return {
          id: su.id,
          firstName: firstName ?? su.name,
          lastName: restName.join(' '),
          name: su.name,
          email: su.email,
          twoFa: false,
          role: GLOBAL_TO_ADMIN_ROLE[su.globalRole] ?? ('Editor' as const),
          status: su.isActive ? ('Active' as const) : ('Disabled' as const),
          lastLoginAt: su.lastLoginAt ? new Date(su.lastLoginAt).getTime() : 0,
          projectAccess: ['__all__'],
        }
      })
      // Unmatched local rows are DROPPED, with exactly two exceptions:
      // "Demo User" (Shaun's explicit keep — the local current-actor
      // mechanism) and in-flight invites (temp 'admin-user-inv-*' ids whose
      // POST hasn't reconciled). This is what clears stale fake/mock users
      // (Alice Chen etc.) out of old persisted localStorage state — the real
      // users table is the source of truth for who exists now.
      const keptLocal = state.adminSettings.users.filter(
        (u) =>
          !matchedLocalIds.has(u.id) &&
          (u.id === SEED_ADMIN_USER_ID || u.id.startsWith('admin-user-inv')),
      )
      next = {
        ...state,
        currentActorUserId,
        adminSettings: { ...state.adminSettings, users: [...keptLocal, ...merged] },
      }
      break
    }
    case 'RECONCILE_ADMIN_USER': {
      // An admin invite's POST resolved — adopt the server's real user id
      // (matched by email, since admin/inviteUser generates its temp id
      // inside the admin reducer where the callback can't see it).
      const email = action.email.trim().toLowerCase()
      const target = state.adminSettings.users.find(
        (u) => u.email.trim().toLowerCase() === email,
      )
      if (!target || isRealId(target.id)) return state
      let currentActorUserId = state.currentActorUserId
      if (currentActorUserId === target.id) currentActorUserId = action.user.id
      next = {
        ...state,
        currentActorUserId,
        adminSettings: {
          ...state.adminSettings,
          users: state.adminSettings.users.map((u) =>
            u.id === target.id ? { ...u, id: action.user.id, email: action.user.email } : u,
          ),
        },
      }
      break
    }
    default:
      return state
  }
  persistState(next)
  return next
}

interface FreshContextValue {
  state: DemoState
  dispatch: React.Dispatch<FreshAction>
  /** Whether the real-project fetch has resolved at least once (success or failure). See ProjectRouteSync.tsx. */
  realProjectsLoaded: boolean
  activeProject: Project
  projects: Project[]
  activeFolders: Folder[]
  activeCases: Case[]
  activeRuns: DemoRun[]
  activePlans: TestPlan[]
  currentRun: DemoRun | undefined
  getActiveProject: () => Project | undefined
  listProjects: () => Project[]
  listActiveProjectFolders: () => Folder[]
  listActiveProjectTestCases: () => Case[]
  listActiveProjectRuns: () => DemoRun[]
  getProjectByKey: (key: string) => Project | undefined
  isProjectKeyUnique: (key: string, excludeProjectId?: string) => boolean
  adminSettings: DemoState['adminSettings']
  currentActor: DemoState['adminSettings']['users'][number]
  setCurrentActor: (userId: string) => void
  saveAdminProfile: (payload: Partial<DemoState['adminSettings']['profile']>) => void
  saveAdminAccount: (payload: Partial<DemoState['adminSettings']['account']>) => void
  toggleAdmin2FA: (method: string) => void
  saveAdminOrganization: (payload: Partial<DemoState['adminSettings']['organization']>) => void
  createAdminApiKey: (payload: Omit<DemoState['adminSettings']['apiKeys'][number], 'id' | 'createdAt' | 'maskedKey' | 'userId'>) => void
  deleteAdminApiKey: (id: string) => void
  inviteAdminUser: (payload: InviteUserPayload) => void
  updateAdminUser: (payload: UpdateUserPayload) => void
  disableAdminUser: (id: string) => void
  reactivateAdminUser: (id: string) => void
  updateAdminUserRole: (id: string, role: DemoState['adminSettings']['users'][number]['role']) => void
  createAdminRole: (payload: { name: string; description: string; isProjectLevel: boolean; permissions: RolePermissions }) => void
  updateAdminRole: (payload: { id: string; name: string; description: string; isProjectLevel: boolean; permissions: RolePermissions }) => void
  deleteAdminRole: (id: string) => void
  addAdminCustomField: (payload: Omit<DemoState['adminSettings']['customFields'][number], 'id'>) => void
  deleteAdminCustomField: (id: string) => void
  saveAdminAutomationRetention: (retentionPeriod: string) => void
  updateAdminAutomationSource: (source: DemoState['adminSettings']['automation']['sources'][number]) => void
  deleteAdminAutomationSource: (id: string) => void
  updateAdminAutomationField: (field: DemoState['adminSettings']['automation']['fields'][number]) => void
  deleteAdminAutomationField: (id: string) => void
  updateProject: (projectId: string, patch: Partial<Pick<Project, 'name' | 'key' | 'description'>>) => void
  updateActiveCustomFields: (projectId: string, activeCustomFieldIds: string[]) => void
  updateProjectSettings: (projectId: string, projectSettings: ProjectSettings) => void
  deleteProject: (projectId: string) => void
  setActiveProject: (projectId: string) => void
  getCase: (caseId: string) => Case | undefined
  addCase: (data: Omit<Case, 'id' | 'updatedAt' | 'createdAt' | 'projectId'>) => Promise<string | null>
  updateCase: (caseId: string, patch: Partial<Case>) => void
  replaceCase: (caseData: Case) => void
  deleteCase: (caseId: string) => void
  updateExecution: (caseId: string, patch: Partial<CaseExecution>) => void
  addStepComment: (caseId: string, stepId: string, body: string, author?: string) => void
  addGeneralComment: (caseId: string, body: string, author?: string) => void
  sealRun: () => void
  unsealRun: () => void
  setCurrentRun: (runId: string) => void
  createRun: (input: { name: string; description?: string; caseIds?: string[] }) => { runKey: string }
  duplicateRun: (runId: string) => Promise<{ runKey: string } | null>
  archiveRun: (runId: string) => void
  deleteRun: (runId: string) => void
  editRun: (runId: string, patch: Partial<Pick<DemoRun, 'name' | 'description' | 'due' | 'planName'>>) => void
  addCasesToRun: (runId: string, caseIds: string[]) => void
  addPlan: (title: string, description?: string) => Promise<{ planKey: string; planId: string } | null>
  updatePlan: (planId: string, patch: Partial<Pick<TestPlan, 'title' | 'description' | 'queries'>>) => void
  deletePlan: (planId: string) => void
  duplicatePlan: (planId: string) => Promise<{ planKey: string; planId: string } | null>
  spawnRunFromPlan: (planId: string, name: string, description?: string) => Promise<{ runKey: string } | null>
  addFolder: (name: string, parentId?: string | null) => Promise<string | null>
  isRunSealed: boolean
  activeRequirements: Requirement[]
  activeDefects: Defect[]
  createRequirement: (input: { title: string; description?: string; status?: Requirement['status'] }) => { requirementKey: string; requirementId: string }
  linkRequirementToCase: (caseId: string, requirementId: string) => void
  createDefectFromExecution: (runId: string, caseId: string, input: { title: string; description?: string }) => { defectKey: string } | null
  linkDefectToExecution: (runId: string, caseId: string, defectId: string) => void
  getDefect: (defectId: string) => Defect | undefined
  getRequirement: (requirementId: string) => Requirement | undefined
}

const FreshContext = createContext<FreshContextValue | null>(null)

export function FreshProvider({ children }: { children: ReactNode }) {
  // SSR-safe, deterministic default — matches what the server rendered
  // exactly. `loadState()` (localStorage-backed) is now only ever called
  // from the effect below, which only runs client-side after hydration.
  //
  // Fix (mvp-backend "wire everything" session): this used to be
  // `useReducer(reducer, undefined, loadState)`, which read `localStorage`
  // synchronously as part of the client's very first render — a render that
  // has to match the server's HTML for hydration to succeed. Since SSR has
  // no `localStorage`, any persisted state that differs at all from a fresh
  // `buildInitialDemoState()` (which is virtually guaranteed once real
  // projects get registered — see REGISTER_REAL_PROJECTS below) caused a
  // real, reproducible hydration mismatch (Shaun hit this on
  // /DEMO/dashboard: SSR rendered the empty-cases state, the client's
  // localStorage-derived state had a different case count). Deferring the
  // localStorage read to a post-mount effect means the very first client
  // render always matches SSR, at the cost of a brief flash from
  // "fresh/empty" to "actual persisted" state immediately after mount —
  // the standard, accepted trade-off for localStorage-backed state under SSR.
  const [state, dispatch] = useReducer(reducer, undefined, buildInitialDemoState)

  useEffect(() => {
    dispatch({ type: 'HYDRATE', state: loadState() })
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined' || !isDemoResetRequested()) return
    const params = new URLSearchParams(window.location.search)
    params.delete(DEMO_RESET_PARAM)
    const qs = params.toString()
    const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`
    window.history.replaceState(null, '', next)
  }, [])

  // Replace the client-only "Demo Project" with the real backend projects on
  // mount (mvp-backend "wire everything" session). Runs once per mount;
  // REGISTER_REAL_PROJECTS itself no-ops if the same set is already
  // registered, so this is safe under React 18 dev-mode double-invoke. If the
  // fetch fails (e.g. offline, session not ready yet), we just log and leave
  // whatever project state already exists — the app stays usable, it just
  // won't see real data until a later successful fetch/reload.
  // Tracks whether the real-project fetch above has resolved at least once
  // (success or failure) — exposed via context so ProjectRouteSync.tsx can
  // hold off on its "unknown project key -> redirect" logic until we've
  // actually had a chance to register real projects. Without this, visiting
  // e.g. /DEMO/dashboard would redirect to /DP/dashboard (URL key not found
  // yet, since the fetch is still in flight) and then immediately redirect
  // back to /DEMO once the fetch resolves — a visible double-redirect
  // flicker Shaun hit in practice.
  const [realProjectsLoaded, setRealProjectsLoaded] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchRealProjects()
      .then((projects) => {
        if (cancelled) return
        if (projects.length > 0) {
          dispatch({ type: 'REGISTER_REAL_PROJECTS', projects })
        }
        setRealProjectsLoaded(true)
      })
      .catch((err) => {
        console.error('[relay] Failed to load real projects, staying on local project state:', err)
        if (!cancelled) setRealProjectsLoaded(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  // real run id -> { live testCaseId -> testRunCaseId } (Phase 4). The result
  // endpoint is addressed by test_run_cases id, but DemoRun.executions is
  // keyed by live case id — this map bridges the two for result writes.
  const runCaseIdsRef = useRef(new Map<string, Record<string, string>>())

  // -------------------------------------------------------------------
  // Write semantics (data-layer refactor): writes WAIT FOR THE SERVER by
  // default — the local dispatch happens only after the API confirms, so
  // ids/refs are always server-generated and no temp-id reconciliation
  // exists anywhere. The one exception is updateExecution (P/F/B/S
  // recording), which stays optimistic for keyboard-speed execution and
  // rolls back to the previous execution state if the API rejects the
  // write. Failed writes surface as dismissible error toasts.
  // -------------------------------------------------------------------
  const [writeErrors, setWriteErrors] = useState<{ id: number; message: string }[]>([])
  const notifyError = useCallback((message: string) => {
    const id = Date.now() + Math.random()
    setWriteErrors((prev) => [...prev.slice(-2), { id, message }])
    setTimeout(() => {
      setWriteErrors((prev) => prev.filter((e) => e.id !== id))
    }, 6000)
  }, [])

  // Sync the active real project's cases + folders from the real API into
  // reducer state (same pattern REGISTER_REAL_PROJECTS uses for the project
  // list itself). Screens keep reading activeCases/activeFolders unchanged —
  // this is the "reducer-sync" half of the screen-wiring architecture pivot.
  const activeProjectSource = state.projectsById[state.activeProjectId]?.source

  useEffect(() => {
    if (!realProjectsLoaded || activeProjectSource !== 'real') return
    const projectId = state.activeProjectId
    let cancelled = false
    Promise.all([
      fetchRealFolders(projectId),
      fetchRealCases(projectId),
      fetchRealPlans(projectId),
      fetchRealRuns(projectId),
    ])
      .then(([realFolders, realCases, realPlans, realRuns]) => {
        if (cancelled) return
        const planTitleById = new Map(realPlans.map((p) => [p.id, p.title]))
        for (const r of realRuns) {
          runCaseIdsRef.current.set(r.id, runCaseIdMap(r.cases))
        }
        dispatch({
          type: 'SYNC_REAL_PROJECT_DATA',
          projectId,
          folders: realFolders.map(realFolderToLocal),
          cases: realCases.map(realCaseToLocal),
          plans: realPlans.map(realPlanToLocal),
          runs: realRuns.map((r) => realRunToLocal(r, projectId, planTitleById)),
        })
      })
      .catch((err) => {
        console.error('[relay] Failed to sync cases/folders/plans/runs from the real API:', err)
      })
    return () => {
      cancelled = true
    }
  }, [realProjectsLoaded, activeProjectSource, state.activeProjectId])

  // Whether the real backend is present at all (users are global, not
  // per-project — any registered real project implies a live API + session).
  const hasRealBackend = useMemo(
    () => Object.values(state.projectsById).some((p) => p.source === 'real'),
    [state.projectsById],
  )

  // Sync the real users table into the Admin mock user list (Phase 7). The
  // server 403s this for non-global-admin sessions — expected; the Admin
  // panel then just keeps showing the local mock roster.
  useEffect(() => {
    if (!realProjectsLoaded || !hasRealBackend) return
    let cancelled = false
    fetchRealUsers()
      .then((users) => {
        if (!cancelled && users.length > 0) dispatch({ type: 'SYNC_REAL_USERS', users })
      })
      .catch((err) => {
        console.warn('[relay] Could not sync real users (requires a global-admin session):', err)
      })
    return () => {
      cancelled = true
    }
  }, [realProjectsLoaded, hasRealBackend])

  const activeProject = useMemo(
    () => getActiveProject(state) ?? Object.values(state.projectsById)[0],
    [state],
  )
  const projects = useMemo(() => listProjects(state), [state])
  const activeFolders = useMemo(() => listActiveProjectFolders(state), [state])
  const activeCases = useMemo(() => listActiveProjectTestCases(state), [state])
  const activeRuns = useMemo(() => listActiveProjectRuns(state), [state])
  const activePlans = useMemo(() => listActiveProjectPlans(state), [state])
  const activeRequirements = useMemo(() => listActiveProjectRequirements(state), [state])
  const activeDefects = useMemo(() => listActiveProjectDefects(state), [state])
  const currentRun = useMemo(() => getCurrentRun(state), [state])
  const currentActor = useMemo(() => {
    const id = state.currentActorUserId ?? SEED_ADMIN_USER_ID
    return state.adminSettings.users.find((u) => u.id === id) ?? state.adminSettings.users[0]
  }, [state])

  const setCurrentActor = useCallback((userId: string) => {
    dispatch({ type: 'admin/setCurrentActor', payload: { userId } })
  }, [])

  const getCase = useCallback(
    (caseId: string) => activeCases.find((c) => c.id === caseId),
    [activeCases],
  )

  const addCase = useCallback(
    async (data: Omit<Case, 'id' | 'updatedAt' | 'createdAt' | 'projectId'>): Promise<string | null> => {
      const projectId = state.activeProjectId
      try {
        const real = await createRealCase(
          projectId,
          localCaseToCreateBody({ ...data, folderId: data.folderId ?? null }, (fid) =>
            isRealId(fid) ? fid : undefined,
          ),
        )
        const created = realCaseToLocal(real)
        dispatch({
          type: 'ADD_CASE',
          case: {
            ...created,
            generalComments: data.generalComments ?? [],
            customFieldValues: data.customFieldValues,
            requirementIds: data.requirementIds,
            references: data.references,
            template: data.template,
          },
        })
        return created.id
      } catch (err) {
        notifyError(`Couldn't create test case: ${errMsg(err)}`)
        return null
      }
    },
    [state.activeProjectId, notifyError],
  )

  const updateCase = useCallback(
    (caseId: string, patch: Partial<Case>) => {
      const projectId = state.activeProjectId
      const body = localCasePatchToUpdateBody(patch, (fid) => (isRealId(fid) ? fid : undefined))
      if (!body) {
        // Patch touches only local-only fields — nothing to persist remotely.
        dispatch({ type: 'UPDATE_CASE', caseId, patch })
        return
      }
      void (async () => {
        await updateRealCase(projectId, caseId, body)
        dispatch({ type: 'UPDATE_CASE', caseId, patch })
      })().catch((err) => notifyError(`Couldn't save test case: ${errMsg(err)}`))
    },
    [state.activeProjectId, notifyError],
  )

  const replaceCase = useCallback(
    (caseItem: Case) => {
      const projectId = state.activeProjectId
      const body = localCasePatchToUpdateBody(caseItem, (fid) => (isRealId(fid) ? fid : undefined))
      if (!body) {
        dispatch({ type: 'REPLACE_CASE', case: caseItem })
        return
      }
      void (async () => {
        await updateRealCase(projectId, caseItem.id, body)
        dispatch({ type: 'REPLACE_CASE', case: caseItem })
      })().catch((err) => notifyError(`Couldn't save test case: ${errMsg(err)}`))
    },
    [state.activeProjectId, notifyError],
  )

  const deleteCase = useCallback(
    (caseId: string) => {
      const projectId = state.activeProjectId
      void (async () => {
        // Server-side this archives rather than hard-deletes (documented
        // behavior difference — see TestCaseService.ts's file header).
        await archiveRealCase(projectId, caseId)
        dispatch({ type: 'DELETE_CASE', caseId })
      })().catch((err) => notifyError(`Couldn't delete test case: ${errMsg(err)}`))
    },
    [state.activeProjectId, notifyError],
  )

  // Push a run lifecycle change (seal/reopen/archive) to the real API.
  // The frontend's "delete run" also lands here as 'archived' — the server
  // never hard-deletes runs.
  const pushRunStatus = useCallback(
    (
      projectId: string,
      runId: string,
      status: 'active' | 'sealed' | 'archived',
      apply: () => void,
    ) => {
      if (!isRealId(runId)) {
        // Local-only (ad-hoc) run — nothing to persist remotely.
        apply()
        return
      }
      void (async () => {
        await updateRealRun(runId, { projectId, status })
        apply()
      })().catch((err) => notifyError(`Couldn't update run: ${errMsg(err)}`))
    },
    [notifyError],
  )

  const updateExecution = useCallback(
    (caseId: string, patch: Partial<CaseExecution>) => {
      const runId = getActiveProjectCurrentRunId(state)
      if (!runId || !runIsMutable(state, runId)) return
      // OPTIMISTIC — the one exception to wait-for-server: P/F/B/S recording
      // must keep its keyboard-speed feel. Rolls back to the previous
      // execution state if the API rejects the write.
      const prevExecution = findRunById(state, runId)?.executions[caseId]
      dispatch({ type: 'UPDATE_RUN_EXECUTION', runId, caseId, patch })

      if (!isRealId(runId)) return // local-only ad-hoc run
      if (patch.status === undefined && patch.resultNotes === undefined) return
      const testRunCaseId = runCaseIdsRef.current.get(runId)?.[caseId]
      if (!testRunCaseId) {
        console.warn('[relay] updateExecution: no run-case mapping — result kept locally only')
        return
      }
      const statusToSend = patch.status ?? prevExecution?.status ?? 'Not run'
      recordRealCaseResult(runId, testRunCaseId, {
        status: toRealResultStatus(statusToSend),
        ...(patch.resultNotes !== undefined ? { comment: patch.resultNotes ?? null } : {}),
      }).catch((err) => {
        dispatch({
          type: 'UPDATE_RUN_EXECUTION',
          runId,
          caseId,
          patch: prevExecution ?? { status: 'Not run' as ExecStatus, stepResults: {} },
        })
        notifyError(`Result not saved — rolled back: ${errMsg(err)}`)
      })
    },
    [state, notifyError],
  )

  const addStepComment = useCallback(
    (caseId: string, stepId: string, body: string, author = 'Shaun Sevume') => {
      const runId = getActiveProjectCurrentRunId(state)
      if (!runId || !runIsMutable(state, runId)) return
      dispatch({ type: 'ADD_STEP_COMMENT', caseId, stepId, author, body })
    },
    [state],
  )

  const addGeneralComment = useCallback(
    (caseId: string, body: string, author = 'Shaun Sevume') => {
      const runId = getActiveProjectCurrentRunId(state)
      if (!runId || !runIsMutable(state, runId)) return
      dispatch({ type: 'ADD_GENERAL_COMMENT', caseId, author, body })
    },
    [state],
  )

  const sealRun = useCallback(() => {
    const runId = getActiveProjectCurrentRunId(state)
    if (!runId) return
    pushRunStatus(state.activeProjectId, runId, 'sealed', () => dispatch({ type: 'SEAL_RUN', runId }))
  }, [state, pushRunStatus])

  const unsealRun = useCallback(() => {
    const runId = getActiveProjectCurrentRunId(state)
    if (!runId) return
    pushRunStatus(state.activeProjectId, runId, 'active', () => dispatch({ type: 'UNSEAL_RUN', runId }))
  }, [state, pushRunStatus])

  const setCurrentRun = useCallback((runId: string) => {
    dispatch({ type: 'SET_CURRENT_RUN', runId })
  }, [])

  const createRun = useCallback(
    (input: { name: string; description?: string; caseIds?: string[] }) => {
      const num = getActiveProjectNextRunNum(state)
      const runKey = formatRunKey(num)
      dispatch({ type: 'CREATE_RUN', name: input.name, description: input.description, caseIds: input.caseIds })
      // Documented gap: the server's createRun requires a test plan to
      // snapshot, so ad-hoc runs live in this browser only.
      notifyError(
        "Heads up: runs created without a test plan aren't saved to the server yet — this run is local to this browser.",
      )
      return { runKey }
    },
    [state, notifyError],
  )

  const duplicateRun = useCallback(
    async (runId: string): Promise<{ runKey: string } | null> => {
      const source = findRunById(state, runId)
      if (!source) return null
      const projectId = source.projectId
      if (!source.planId || !isRealId(source.planId)) {
        const num = state.nextRunNumByProject[projectId] ?? 1
        const runKey = formatRunKey(num)
        dispatch({ type: 'DUPLICATE_RUN', runId })
        notifyError('Copy created locally only — the source run has no server-side test plan.')
        return { runKey }
      }
      try {
        // Note: the server snapshots the plan's CURRENT case list, which can
        // differ from the source run's frozen caseOrder — acceptable
        // demo-scale divergence, documented in progress.md.
        const created = await createRealRun({
          projectId,
          testPlanId: source.planId,
          name: `${source.name} (copy)`,
        })
        const detail = await fetchRealRunDetail(created.id, projectId)
        runCaseIdsRef.current.set(
          created.id,
          Object.fromEntries(detail.testRunCases.map((c) => [c.originalTestCaseId, c.testRunCaseId])),
        )
        dispatch({ type: 'ADD_RUN', run: realCreatedRunToLocal(created, detail, source.planName) })
        return { runKey: created.runRef }
      } catch (err) {
        notifyError(`Couldn't duplicate run: ${errMsg(err)}`)
        return null
      }
    },
    [state, notifyError],
  )

  const archiveRun = useCallback(
    (runId: string) => {
      pushRunStatus(state.activeProjectId, runId, 'archived', () =>
        dispatch({ type: 'ARCHIVE_RUN', runId }),
      )
    },
    [state.activeProjectId, pushRunStatus],
  )

  const deleteRun = useCallback(
    (runId: string) => {
      // Server-side "delete" = archive (runs are never hard-deleted); the
      // local state removes the run entirely.
      pushRunStatus(state.activeProjectId, runId, 'archived', () =>
        dispatch({ type: 'DELETE_RUN', runId }),
      )
    },
    [state.activeProjectId, pushRunStatus],
  )

  const editRun = useCallback(
    (runId: string, patch: Partial<Pick<DemoRun, 'name' | 'description' | 'due' | 'planName'>>) => {
      const projectId = state.activeProjectId
      const body: { projectId: string; title?: string; dueDate?: string | null } = { projectId }
      if (patch.name !== undefined && patch.name.trim().length > 0) body.title = patch.name
      if ('due' in patch) body.dueDate = patch.due ?? null
      const hasRemoteFields = body.title !== undefined || 'dueDate' in body
      if (!isRealId(runId) || !hasRemoteFields) {
        // description/planName are local-only; ad-hoc runs are local-only.
        dispatch({ type: 'UPDATE_RUN', runId, patch })
        return
      }
      void (async () => {
        await updateRealRun(runId, body)
        dispatch({ type: 'UPDATE_RUN', runId, patch })
      })().catch((err) => notifyError(`Couldn't save run: ${errMsg(err)}`))
    },
    [state.activeProjectId, notifyError],
  )

  const addCasesToRun = useCallback(
    (runId: string, caseIds: string[]) => {
      dispatch({ type: 'ADD_CASES_TO_RUN', runId, caseIds })
    },
    [],
  )

  const addFolder = useCallback(
    async (name: string, parentId?: string | null): Promise<string | null> => {
      const projectId = state.activeProjectId
      try {
        const real = await createRealFolder(projectId, {
          name,
          ...(parentId && isRealId(parentId) ? { parentId } : {}),
        })
        dispatch({ type: 'ADD_FOLDER', folder: realFolderToLocal(real) })
        return real.id
      } catch (err) {
        notifyError(`Couldn't create folder: ${errMsg(err)}`)
        return null
      }
    },
    [state.activeProjectId, notifyError],
  )

  // Resolve a plan's queries to the real-ULID case ids the server should
  // store, dropping cases whose own optimistic creates haven't reconciled yet
  // (they get picked up on the next queries change / sync).
  const resolveRealPlanCaseIds = useCallback(
    (plan: TestPlan): string[] => {
      const projectCases = state.cases.filter((c) => c.projectId === plan.projectId)
      const projectFolders = state.folders.filter((f) => f.projectId === plan.projectId)
      return resolvePlanCases(plan, projectCases, projectFolders)
        .map((c) => c.id)
        .filter((id) => isRealId(id))
    },
    [state],
  )

  const addPlan = useCallback(
    async (title: string, description?: string): Promise<{ planKey: string; planId: string } | null> => {
      const projectId = state.activeProjectId
      try {
        const real = await createRealPlan(projectId, {
          title,
          ...(description?.trim() ? { description } : {}),
        })
        dispatch({ type: 'ADD_PLAN', plan: realPlanDetailToLocal(real) })
        return { planKey: real.planRef, planId: real.id }
      } catch (err) {
        notifyError(`Couldn't create test plan: ${errMsg(err)}`)
        return null
      }
    },
    [state.activeProjectId, notifyError],
  )

  const updatePlan = useCallback(
    (planId: string, patch: Partial<Pick<TestPlan, 'title' | 'description' | 'queries'>>) => {
      const projectId = state.activeProjectId
      const plan = state.plansById[planId]
      if (!plan) return
      void (async () => {
        if (patch.title !== undefined || 'description' in patch) {
          await updateRealPlan(projectId, planId, {
            ...(patch.title !== undefined ? { title: patch.title } : {}),
            ...('description' in patch ? { description: patch.description ?? null } : {}),
          })
        }
        // Queries are local-only (GAP-01) — the server tracks the *resolved*
        // case list, replaced wholesale on every queries change.
        if (patch.queries) {
          await setRealPlanCases(projectId, planId, resolveRealPlanCaseIds({ ...plan, ...patch }))
        }
        dispatch({ type: 'UPDATE_PLAN', planId, patch })
      })().catch((err) => notifyError(`Couldn't save test plan: ${errMsg(err)}`))
    },
    [state, resolveRealPlanCaseIds, notifyError],
  )

  const deletePlan = useCallback(
    (planId: string) => {
      const projectId = state.activeProjectId
      void (async () => {
        await archiveRealPlan(projectId, planId)
        dispatch({ type: 'DELETE_PLAN', planId })
      })().catch((err) => notifyError(`Couldn't delete test plan: ${errMsg(err)}`))
    },
    [state.activeProjectId, notifyError],
  )

  const duplicatePlan = useCallback(
    async (planId: string): Promise<{ planKey: string; planId: string } | null> => {
      const original = state.plansById[planId]
      if (!original) return null
      const projectId = state.activeProjectId
      try {
        const real = await createRealPlan(projectId, {
          title: `Copy of ${original.title}`,
          ...(original.description?.trim() ? { description: original.description } : {}),
          caseIds: resolveRealPlanCaseIds(original),
        })
        const newPlan: TestPlan = {
          ...realPlanDetailToLocal(real),
          queries: original.queries.map((q) => ({ ...q, id: newId('tq') })),
        }
        dispatch({ type: 'DUPLICATE_PLAN', newPlan })
        return { planKey: real.planRef, planId: real.id }
      } catch (err) {
        notifyError(`Couldn't duplicate test plan: ${errMsg(err)}`)
        return null
      }
    },
    [state, resolveRealPlanCaseIds, notifyError],
  )

  const spawnRunFromPlan = useCallback(
    async (planId: string, name: string, description?: string): Promise<{ runKey: string } | null> => {
      const plan = state.plansById[planId]
      if (!plan) return null
      const projectId = state.activeProjectId
      try {
        // caseIds deliberately omitted: the server snapshots the plan's full
        // test_plan_cases, which the plan write-through keeps in sync with
        // the resolved queries.
        const created = await createRealRun({ projectId, testPlanId: planId, name })
        const detail = await fetchRealRunDetail(created.id, projectId)
        runCaseIdsRef.current.set(
          created.id,
          Object.fromEntries(detail.testRunCases.map((c) => [c.originalTestCaseId, c.testRunCaseId])),
        )
        const run = {
          ...realCreatedRunToLocal(created, detail, plan.title),
          description: description?.trim() || undefined,
        }
        dispatch({ type: 'ADD_RUN', run })
        return { runKey: created.runRef }
      } catch (err) {
        notifyError(`Couldn't start run: ${errMsg(err)}`)
        return null
      }
    },
    [state, notifyError],
  )

  const getRequirement = useCallback(
    (requirementId: string) => state.requirementsById?.[requirementId],
    [state.requirementsById],
  )

  const getDefect = useCallback(
    (defectId: string) => state.defectsById?.[defectId],
    [state.defectsById],
  )

  const createRequirement = useCallback(
    (input: { title: string; description?: string; status?: Requirement['status'] }) => {
      const projectId = state.activeProjectId
      const num = getActiveProjectNextRequirementNum(state)
      const requirementKey = formatRequirementKey(num)
      const requirement: Requirement = {
        id: newId('req'),
        requirementKey,
        projectId,
        title: input.title.trim() || 'Untitled requirement',
        description: input.description?.trim() || undefined,
        status: input.status ?? 'Draft',
        source: 'Local',
        createdAt: new Date().toISOString(),
      }
      dispatch({ type: 'CREATE_REQUIREMENT', requirement })
      return { requirementKey, requirementId: requirement.id }
    },
    [state],
  )

  const linkRequirementToCase = useCallback((caseId: string, requirementId: string) => {
    dispatch({ type: 'LINK_REQUIREMENT_TO_CASE', caseId, requirementId })
  }, [])

  const createDefectFromExecution = useCallback(
    (runId: string, caseId: string, input: { title: string; description?: string }) => {
      if (!runIsMutable(state, runId)) return null
      const projectId = state.activeProjectId
      const num = getActiveProjectNextDefectNum(state)
      const defectKey = formatDefectKey(num)
      const defect: Defect = {
        id: newId('defect'),
        defectKey,
        projectId,
        title: input.title.trim() || 'Untitled defect',
        description: input.description?.trim() || undefined,
        status: 'Open',
        source: 'Local',
        createdAt: new Date().toISOString(),
      }
      dispatch({ type: 'CREATE_DEFECT_AND_LINK', defect, runId, caseId })
      return { defectKey }
    },
    [state],
  )

  const linkDefectToExecution = useCallback((runId: string, caseId: string, defectId: string) => {
    dispatch({ type: 'LINK_DEFECT_TO_EXECUTION', runId, caseId, defectId })
  }, [])

  const saveAdminProfile = useCallback((payload: Partial<DemoState['adminSettings']['profile']>) => {
    dispatch({ type: 'admin/saveProfile', payload })
  }, [])

  const saveAdminAccount = useCallback((payload: Partial<DemoState['adminSettings']['account']>) => {
    dispatch({ type: 'admin/saveAccount', payload })
  }, [])

  const toggleAdmin2FA = useCallback((method: string) => {
    dispatch({ type: 'admin/toggle2FA', payload: { method } })
  }, [])

  const saveAdminOrganization = useCallback((payload: Partial<DemoState['adminSettings']['organization']>) => {
    dispatch({ type: 'admin/saveOrganization', payload })
  }, [])

  const createAdminApiKey = useCallback(
    (payload: Omit<DemoState['adminSettings']['apiKeys'][number], 'id' | 'createdAt' | 'maskedKey' | 'userId'>) => {
      dispatch({ type: 'admin/createApiKey', payload })
    },
    [],
  )

  const deleteAdminApiKey = useCallback((id: string) => {
    dispatch({ type: 'admin/deleteApiKey', payload: { id } })
  }, [])

  const inviteAdminUser = useCallback(
    (payload: InviteUserPayload) => {
      const name = `${payload.firstName.trim()} ${payload.lastName.trim()}`.trim()
      void (async () => {
        const real = await createRealUser({ email: payload.email.trim(), name, role: payload.role })
        dispatch({ type: 'admin/inviteUser', payload })
        // Adopt the server's user id (the admin reducer generates its own
        // temp id internally, so match by email).
        dispatch({ type: 'RECONCILE_ADMIN_USER', email: payload.email, user: real })
      })().catch((err) => notifyError(`Couldn't invite user: ${errMsg(err)}`))
    },
    [notifyError],
  )

  const updateAdminUser = useCallback(
    (payload: UpdateUserPayload) => {
      if (!isRealId(payload.id)) {
        // Local-only rows ("Demo User") have no server counterpart.
        dispatch({ type: 'admin/updateUser', payload })
        return
      }
      void (async () => {
        // Email edits stay local-only (server updateUser has no email field);
        // the granular role compresses onto globalRole.
        await updateRealUser(payload.id, {
          name: `${payload.firstName.trim()} ${payload.lastName.trim()}`.trim(),
          globalRole: ADMIN_ROLE_TO_GLOBAL[payload.role],
        })
        dispatch({ type: 'admin/updateUser', payload })
      })().catch((err) => notifyError(`Couldn't update user: ${errMsg(err)}`))
    },
    [notifyError],
  )

  const disableAdminUser = useCallback(
    (id: string) => {
      if (!isRealId(id)) {
        dispatch({ type: 'admin/disableUser', payload: { id } })
        return
      }
      void (async () => {
        await updateRealUser(id, { isActive: false })
        dispatch({ type: 'admin/disableUser', payload: { id } })
      })().catch((err) => notifyError(`Couldn't disable user: ${errMsg(err)}`))
    },
    [notifyError],
  )

  const reactivateAdminUser = useCallback(
    (id: string) => {
      if (!isRealId(id)) {
        dispatch({ type: 'admin/reactivateUser', payload: { id } })
        return
      }
      void (async () => {
        await updateRealUser(id, { isActive: true })
        dispatch({ type: 'admin/reactivateUser', payload: { id } })
      })().catch((err) => notifyError(`Couldn't reactivate user: ${errMsg(err)}`))
    },
    [notifyError],
  )

  const updateAdminUserRole = useCallback(
    (id: string, role: DemoState['adminSettings']['users'][number]['role']) => {
      if (!isRealId(id)) {
        dispatch({ type: 'admin/updateUserRole', payload: { id, role } })
        return
      }
      void (async () => {
        await updateRealUser(id, { globalRole: ADMIN_ROLE_TO_GLOBAL[role] })
        dispatch({ type: 'admin/updateUserRole', payload: { id, role } })
      })().catch((err) => notifyError(`Couldn't change role: ${errMsg(err)}`))
    },
    [notifyError],
  )

  const createAdminRole = useCallback(
    (payload: { name: string; description: string; isProjectLevel: boolean; permissions: RolePermissions }) => {
      dispatch({ type: 'admin/createRole', payload })
    },
    [],
  )

  const updateAdminRole = useCallback(
    (payload: { id: string; name: string; description: string; isProjectLevel: boolean; permissions: RolePermissions }) => {
      dispatch({ type: 'admin/updateRole', payload })
    },
    [],
  )

  const deleteAdminRole = useCallback((id: string) => {
    dispatch({ type: 'admin/deleteRole', payload: { id } })
  }, [])

  const addAdminCustomField = useCallback(
    (payload: Omit<DemoState['adminSettings']['customFields'][number], 'id'>) => {
      dispatch({ type: 'admin/addCustomField', payload })
    },
    [],
  )

  const deleteAdminCustomField = useCallback((id: string) => {
    dispatch({ type: 'admin/deleteCustomField', payload: { id } })
  }, [])

  const saveAdminAutomationRetention = useCallback((retentionPeriod: string) => {
    dispatch({ type: 'admin/saveAutomationRetention', payload: { retentionPeriod } })
  }, [])

  const updateAdminAutomationSource = useCallback(
    (source: DemoState['adminSettings']['automation']['sources'][number]) => {
      dispatch({ type: 'admin/updateAutomationSource', payload: source })
    },
    [],
  )

  const deleteAdminAutomationSource = useCallback((id: string) => {
    dispatch({ type: 'admin/deleteAutomationSource', payload: { id } })
  }, [])

  const updateAdminAutomationField = useCallback(
    (field: DemoState['adminSettings']['automation']['fields'][number]) => {
      dispatch({ type: 'admin/updateAutomationField', payload: field })
    },
    [],
  )

  const deleteAdminAutomationField = useCallback((id: string) => {
    dispatch({ type: 'admin/deleteAutomationField', payload: { id } })
  }, [])

  const updateProject = useCallback(
    (projectId: string, patch: Partial<Pick<Project, 'name' | 'key' | 'description'>>) => {
      dispatch({ type: 'UPDATE_PROJECT', projectId, patch })
    },
    [],
  )

  const updateActiveCustomFields = useCallback((projectId: string, activeCustomFieldIds: string[]) => {
    dispatch({ type: 'UPDATE_ACTIVE_CUSTOM_FIELDS', projectId, activeCustomFieldIds })
  }, [])

  const updateProjectSettings = useCallback((projectId: string, projectSettings: ProjectSettings) => {
    dispatch({ type: 'UPDATE_PROJECT_SETTINGS', projectId, projectSettings })
  }, [])

  const getProjectByKeyFn = useCallback((key: string) => getProjectByKey(state, key), [state])
  const isProjectKeyUniqueFn = useCallback(
    (key: string, excludeProjectId?: string) => isProjectKeyUnique(state, key, excludeProjectId),
    [state],
  )

  const deleteProject = useCallback((projectId: string) => {
    dispatch({ type: 'DELETE_PROJECT', projectId })
  }, [])

  const setActiveProject = useCallback((projectId: string) => {
    dispatch({ type: 'SET_ACTIVE_PROJECT', projectId })
  }, [])

  const isRunSealed = currentRun?.sealed ?? false

  const value = useMemo(
    () => ({
      state,
      dispatch,
      realProjectsLoaded,
      activeProject,
      projects,
      activeFolders,
      activeCases,
      activeRuns,
      activePlans,
      activeRequirements,
      activeDefects,
      currentRun,
      getActiveProject: () => getActiveProject(state),
      listProjects: () => listProjects(state),
      listActiveProjectFolders: () => listActiveProjectFolders(state),
      listActiveProjectTestCases: () => listActiveProjectTestCases(state),
      listActiveProjectRuns: () => listActiveProjectRuns(state),
      getProjectByKey: getProjectByKeyFn,
      isProjectKeyUnique: isProjectKeyUniqueFn,
      adminSettings: state.adminSettings,
      currentActor,
      setCurrentActor,
      saveAdminProfile,
      saveAdminAccount,
      toggleAdmin2FA,
      saveAdminOrganization,
      createAdminApiKey,
      deleteAdminApiKey,
      inviteAdminUser,
      updateAdminUser,
      disableAdminUser,
      reactivateAdminUser,
      updateAdminUserRole,
      createAdminRole,
      updateAdminRole,
      deleteAdminRole,
      addAdminCustomField,
      deleteAdminCustomField,
      saveAdminAutomationRetention,
      updateAdminAutomationSource,
      deleteAdminAutomationSource,
      updateAdminAutomationField,
      deleteAdminAutomationField,
      updateProject,
      updateActiveCustomFields,
      updateProjectSettings,
      deleteProject,
      setActiveProject,
      getCase,
      addCase,
      updateCase,
      replaceCase,
      deleteCase,
      updateExecution,
      addStepComment,
      addGeneralComment,
      sealRun,
      unsealRun,
      setCurrentRun,
      createRun,
      duplicateRun,
      archiveRun,
      deleteRun,
      editRun,
      addCasesToRun,
      addPlan,
      updatePlan,
      deletePlan,
      duplicatePlan,
      spawnRunFromPlan,
      addFolder,
      isRunSealed,
      createRequirement,
      linkRequirementToCase,
      createDefectFromExecution,
      linkDefectToExecution,
      getDefect,
      getRequirement,
    }),
    [
      state,
      realProjectsLoaded,
      activeProject,
      projects,
      activeFolders,
      activeCases,
      activeRuns,
      activePlans,
      activeRequirements,
      activeDefects,
      currentRun,
      getProjectByKeyFn,
      isProjectKeyUniqueFn,
      saveAdminProfile,
      saveAdminAccount,
      toggleAdmin2FA,
      saveAdminOrganization,
      createAdminApiKey,
      deleteAdminApiKey,
      inviteAdminUser,
      updateAdminUser,
      disableAdminUser,
      reactivateAdminUser,
      updateAdminUserRole,
      createAdminRole,
      updateAdminRole,
      deleteAdminRole,
      currentActor,
      setCurrentActor,
      addAdminCustomField,
      deleteAdminCustomField,
      saveAdminAutomationRetention,
      updateAdminAutomationSource,
      deleteAdminAutomationSource,
      updateAdminAutomationField,
      deleteAdminAutomationField,
      updateProject,
      updateActiveCustomFields,
      updateProjectSettings,
      deleteProject,
      setActiveProject,
      getCase,
      addCase,
      updateCase,
      replaceCase,
      deleteCase,
      updateExecution,
      addStepComment,
      addGeneralComment,
      sealRun,
      unsealRun,
      setCurrentRun,
      createRun,
      duplicateRun,
      archiveRun,
      deleteRun,
      editRun,
      addCasesToRun,
      addPlan,
      updatePlan,
      deletePlan,
      duplicatePlan,
      spawnRunFromPlan,
      addFolder,
      isRunSealed,
      createRequirement,
      linkRequirementToCase,
      createDefectFromExecution,
      linkDefectToExecution,
      getDefect,
      getRequirement,
    ],
  )

  const hasProjects = Object.keys(state.projectsById).length > 0

  return (
    <FreshContext.Provider value={value}>
      {hasProjects ? children : <BootGate resolved={realProjectsLoaded} />}
      {writeErrors.length > 0 ? (
        <div style={{ position: 'fixed', bottom: 16, right: 16, display: 'flex', flexDirection: 'column', gap: 8, zIndex: 4000, maxWidth: 380 }}>
          {writeErrors.map((e) => (
            <div key={e.id} role="alert" style={{ background: '#7f1d1d', color: '#fff', borderRadius: 8, padding: '10px 14px', fontSize: 13, boxShadow: '0 4px 12px rgba(0,0,0,.25)', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
              <i className="ti ti-alert-triangle" style={{ fontSize: 15, marginTop: 1 }} aria-hidden />
              <span style={{ flex: 1 }}>{e.message}</span>
              <button
                type="button"
                onClick={() => setWriteErrors((prev) => prev.filter((x) => x.id !== e.id))}
                style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', padding: 0 }}
                aria-label="Dismiss"
              >
                <i className="ti ti-x" style={{ fontSize: 13 }} />
              </button>
            </div>
          ))}
        </div>
      ) : null}
    </FreshContext.Provider>
  )
}

export function useFresh() {
  const ctx = useContext(FreshContext)
  if (!ctx) throw new Error('useFresh must be used within FreshProvider')
  return ctx
}
