'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import { buildInitialDemoState, getCurrentRun, mergeSeedRuns } from './demo-seed'
import { migrateDemoState } from './migrate-demo-state'
import type { Case, CaseExecution, CaseVersion, CaseVersionChange, DashboardLayout, Defect, DemoRun, DemoState, ExecStatus, ExecutionLogEntry, ExportArtifact, Folder, Project, ProjectSettings, Requirement, SavedFilter, SavedFilterSurface, SavedReport, ScheduledRun, TestPlan } from './demo-model'
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
  listActiveProjectExports,
  listActiveProjectRequirements,
  listActiveProjectRuns,
  listActiveProjectSavedFilters,
  listActiveProjectSavedReports,
  listActiveProjectScheduledRuns,
  listActiveProjectTestCases,
  listProjects,
} from './project-selectors'
import { findRunById } from './run-utils'
import { CASE_VERSION_CAP, DEFAULT_SEED_PROJECT_KEY, formatCaseKey, formatDefectKey, formatPlanKey, formatRequirementKey, formatRunKey, newId, resolvePlanCases } from './demo-model'
import { appendClonedDemoProject, buildClonedDemoProjectMeta } from './demo-project-utils'

const STORAGE_KEY = 'relay-demo-v2'
const DEMO_RESET_PARAM = 'relay-reset'

function isDemoResetRequested(): boolean {
  if (typeof window === 'undefined') return false
  return new URLSearchParams(window.location.search).get(DEMO_RESET_PARAM) === '1'
}

function runIsMutable(state: DemoState, runId: string): boolean {
  const run = findRunById(state, runId)
  return !!run && !run.sealed
}

/** Current demo actor's display name, for audit/version attribution. */
function currentActorName(state: DemoState): string {
  const id = state.currentActorUserId ?? SEED_ADMIN_USER_ID
  return state.adminSettings.users.find((u) => u.id === id)?.name ?? 'Demo User'
}

function caseVersionSnapshot(c: Case): CaseVersion['snapshot'] {
  return {
    title: c.title,
    summary: c.summary,
    preconditions: c.preconditions,
    references: c.references,
    priority: c.priority,
    type: c.type,
    template: c.template,
    assignee: c.assignee,
    tags: c.tags ? [...c.tags] : undefined,
    steps: c.steps.map((s) => ({ ...s, comments: s.comments.map((cm) => ({ ...cm })) })),
    customFieldValues: c.customFieldValues ? { ...c.customFieldValues } : undefined,
  }
}

const VERSIONED_SCALAR_FIELDS: { field: string; get: (c: Case) => string }[] = [
  { field: 'title', get: (c) => c.title },
  { field: 'summary', get: (c) => c.summary ?? '' },
  { field: 'preconditions', get: (c) => c.preconditions ?? '' },
  { field: 'references', get: (c) => c.references ?? '' },
  { field: 'priority', get: (c) => c.priority },
  { field: 'type', get: (c) => c.type },
  { field: 'template', get: (c) => c.template ?? 'text' },
  { field: 'assignee', get: (c) => c.assignee ?? '' },
  { field: 'tags', get: (c) => (c.tags ?? []).join(', ') },
  { field: 'custom fields', get: (c) => JSON.stringify(c.customFieldValues ?? {}) },
]

/** Diff the editable content fields of two case states (Area L). */
function diffCaseVersions(before: Case, after: Case): CaseVersionChange[] {
  const changes: CaseVersionChange[] = []
  for (const { field, get } of VERSIONED_SCALAR_FIELDS) {
    const from = get(before)
    const to = get(after)
    if (from !== to) changes.push({ field, from, to })
  }
  const stepsText = (c: Case) => c.steps.map((s) => `${s.action}${s.expected}`).join('')
  if (stepsText(before) !== stepsText(after)) {
    changes.push({
      field: 'steps',
      from: `${before.steps.length} step${before.steps.length === 1 ? '' : 's'}`,
      to: `${after.steps.length} step${after.steps.length === 1 ? '' : 's'} (content changed)`,
    })
  }
  return changes
}

/** Append a pre-edit version entry for a case, capped at CASE_VERSION_CAP. */
function appendCaseVersion(
  state: DemoState,
  before: Case,
  after: Case,
): Record<string, CaseVersion[]> {
  const changes = diffCaseVersions(before, after)
  if (changes.length === 0) return state.caseVersionsById ?? {}
  const existing = state.caseVersionsById?.[before.id] ?? []
  const version: CaseVersion = {
    id: newId('ver'),
    caseId: before.id,
    editedAt: new Date().toISOString(),
    editedBy: currentActorName(state),
    changes,
    snapshot: caseVersionSnapshot(before),
  }
  return {
    ...(state.caseVersionsById ?? {}),
    [before.id]: [...existing, version].slice(-CASE_VERSION_CAP),
  }
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
      const migrated = migrateDemoState(mergeSeedRuns(JSON.parse(raw) as DemoState))
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

function persistState(state: DemoState) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (err) {
    console.error('[relay-demo] Failed to persist state:', err)
  }
}

function makeDefaultProject(): Project {
  return {
    id: newId('proj'),
    name: 'Demo Project',
    key: DEFAULT_SEED_PROJECT_KEY,
    description: 'Default demo workspace with seed cases, folders, and runs.',
    seedTemplate: 'demo',
    activeCustomFieldIds: [],
    createdAt: new Date().toISOString(),
  }
}

export type FreshAction =
  | AdminAction
  | { type: 'ADD_DEMO_PROJECT' }
  | { type: 'CREATE_PROJECT'; name: string; key: string; description?: string }
  | { type: 'UPDATE_PROJECT'; projectId: string; patch: Partial<Pick<Project, 'name' | 'key' | 'description'>> }
  | { type: 'UPDATE_ACTIVE_CUSTOM_FIELDS'; projectId: string; activeCustomFieldIds: string[] }
  | { type: 'UPDATE_PROJECT_SETTINGS'; projectId: string; projectSettings: ProjectSettings }
  | { type: 'DELETE_PROJECT'; projectId: string }
  | { type: 'SET_ACTIVE_PROJECT'; projectId: string }
  | { type: 'ADD_CASE'; case: Case }
  | { type: 'UPDATE_CASE'; caseId: string; patch: Partial<Case> }
  | { type: 'REPLACE_CASE'; case: Case }
  | { type: 'RESTORE_CASE_VERSION'; caseId: string; versionId: string }
  | { type: 'DELETE_CASE'; caseId: string }
  | { type: 'UPDATE_RUN_EXECUTION'; runId: string; caseId: string; patch: Partial<CaseExecution> }
  | { type: 'UPDATE_RUN'; runId: string; patch: Partial<Pick<DemoRun, 'name' | 'description' | 'due' | 'planName'>> }
  | { type: 'ADD_CASES_TO_RUN'; runId: string; caseIds: string[] }
  | { type: 'ADD_STEP_COMMENT'; caseId: string; stepId: string; author: string; body: string }
  | { type: 'ADD_GENERAL_COMMENT'; caseId: string; author: string; body: string }
  | { type: 'SEAL_RUN'; runId: string }
  | { type: 'UNSEAL_RUN'; runId: string }
  | { type: 'SET_CURRENT_RUN'; runId: string }
  | { type: 'CREATE_RUN'; name: string; description?: string; caseIds?: string[]; planId?: string; planName?: string }
  | { type: 'DUPLICATE_RUN'; runId: string }
  | { type: 'CREATE_RERUN'; sourceRunId: string; name: string; caseIds: string[]; assignMode: 'keep' | 'reassign'; reassignTo?: string }
  | { type: 'ARCHIVE_RUN'; runId: string }
  | { type: 'UNARCHIVE_RUN'; runId: string }
  | { type: 'DELETE_RUN'; runId: string }
  | { type: 'ADD_PLAN'; plan: TestPlan }
  | { type: 'UPDATE_PLAN'; planId: string; patch: Partial<Pick<TestPlan, 'title' | 'description' | 'queries'>> }
  | { type: 'DELETE_PLAN'; planId: string }
  | { type: 'DUPLICATE_PLAN'; newPlan: TestPlan }
  | { type: 'ADD_FOLDER'; folder: Folder }
  | { type: 'MOVE_CASES'; caseIds: string[]; targetFolderId: string | null }
  | { type: 'COPY_CASES'; caseIds: string[]; targetProjectId: string; targetFolderId: string | null; keepTags: boolean; keepRequirements: boolean }
  | { type: 'REORDER_CASES'; caseIds: string[]; targetFolderId: string | null; beforeCaseId?: string }
  | { type: 'ASSIGN_CASES'; caseIds: string[]; assignee: string }
  | { type: 'ARCHIVE_CASES'; caseIds: string[] }
  | { type: 'UNARCHIVE_CASES'; caseIds: string[] }
  | { type: 'UPDATE_FOLDER'; folderId: string; patch: Partial<Pick<Folder, 'name'>> }
  | { type: 'MOVE_FOLDER'; folderId: string; newParentId: string | null }
  | { type: 'COPY_FOLDER'; folderId: string; targetParentId: string | null }
  | { type: 'ARCHIVE_FOLDER'; folderId: string }
  | { type: 'ADD_SCHEDULED_RUN'; schedule: ScheduledRun }
  | { type: 'UPDATE_SCHEDULED_RUN'; scheduleId: string; patch: Partial<Pick<ScheduledRun, 'name' | 'cadence' | 'nextRunAt' | 'defaultAssignee' | 'active'>> }
  | { type: 'DELETE_SCHEDULED_RUN'; scheduleId: string }
  | { type: 'FIRE_DUE_SCHEDULED_RUNS'; now: string }
  | { type: 'SET_DASHBOARD_LAYOUT'; actorUserId: string; layout: DashboardLayout }
  | { type: 'RECORD_EXPORT'; artifact: ExportArtifact }
  | { type: 'DELETE_EXPORT'; exportId: string }
  | { type: 'SAVE_FILTER'; filter: SavedFilter }
  | { type: 'RENAME_SAVED_FILTER'; filterId: string; name: string }
  | { type: 'DELETE_SAVED_FILTER'; filterId: string }
  | { type: 'SAVE_REPORT'; report: SavedReport }
  | { type: 'RENAME_SAVED_REPORT'; reportId: string; name: string }
  | { type: 'DELETE_SAVED_REPORT'; reportId: string }
  | { type: 'CREATE_REQUIREMENT'; requirement: Requirement }
  | { type: 'LINK_REQUIREMENT_TO_CASE'; caseId: string; requirementId: string }
  | { type: 'CREATE_DEFECT_AND_LINK'; defect: Defect; runId: string; caseId: string }
  | { type: 'LINK_DEFECT_TO_EXECUTION'; runId: string; caseId: string; defectId: string }
  | { type: 'HYDRATE'; state: DemoState }

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
    case 'ADD_DEMO_PROJECT': {
      const meta = buildClonedDemoProjectMeta(state)
      next = appendClonedDemoProject(state, meta)
      break
    }
    case 'CREATE_PROJECT': {
      const project: Project = {
        id: newId('proj'),
        name: action.name.trim() || 'Untitled project',
        key: action.key.toUpperCase(),
        description: action.description?.trim() || undefined,
        activeCustomFieldIds: [],
        createdAt: new Date().toISOString(),
      }
      next = {
        ...state,
        projectsById: { ...state.projectsById, [project.id]: project },
        activeProjectId: project.id,
        currentRunIdByProject: { ...state.currentRunIdByProject, [project.id]: '' },
        nextCaseNumByProject: { ...state.nextCaseNumByProject, [project.id]: 1 },
        nextRunNumByProject: { ...state.nextRunNumByProject, [project.id]: 1 },
        nextPlanNumByProject: { ...state.nextPlanNumByProject, [project.id]: 1 },
        nextRequirementNumByProject: { ...state.nextRequirementNumByProject, [project.id]: 1 },
        nextDefectNumByProject: { ...state.nextDefectNumByProject, [project.id]: 1 },
      }
      break
    }
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
          const fallback = makeDefaultProject()
          projectsById = { [fallback.id]: fallback }
          activeProjectId = fallback.id
          currentRunIdByProject = { [fallback.id]: '' }
          nextCaseNumByProject = { [fallback.id]: 1 }
          nextRunNumByProject = { [fallback.id]: 1 }
          nextPlanNumByProject = { [fallback.id]: 1 }
          nextRequirementNumByProject = { [fallback.id]: 1 }
          nextDefectNumByProject = { [fallback.id]: 1 }
        }
      }

      const removedCaseIds = new Set(
        state.cases.filter((c) => c.projectId === projectId).map((c) => c.id),
      )

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
        savedReportsById: Object.fromEntries(
          Object.entries(state.savedReportsById ?? {}).filter(([, r]) => r.projectId !== projectId),
        ),
        exportsById: Object.fromEntries(
          Object.entries(state.exportsById ?? {}).filter(([, e]) => e.projectId !== projectId),
        ),
        scheduledRunsById: Object.fromEntries(
          Object.entries(state.scheduledRunsById ?? {}).filter(([, s]) => s.projectId !== projectId),
        ),
        savedFiltersById: Object.fromEntries(
          Object.entries(state.savedFiltersById ?? {}).filter(([, f]) => f.projectId !== projectId),
        ),
        caseVersionsById: Object.fromEntries(
          Object.entries(state.caseVersionsById ?? {}).filter(([caseId]) => !removedCaseIds.has(caseId)),
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
      const caseKey = formatCaseKey(num)
      const maxPos = state.cases
        .filter((c) => c.projectId === projectId)
        .reduce((m, c) => Math.max(m, c.position ?? 0), 0)
      next = {
        ...state,
        cases: [...state.cases, { ...action.case, caseKey, position: action.case.position ?? maxPos + 1 }],
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
    case 'REPLACE_CASE': {
      const before = state.cases.find((c) => c.id === action.case.id)
      next = {
        ...state,
        cases: state.cases.map((c) => {
          if (c.id !== action.case.id) return c
          return { ...action.case, createdAt: c.createdAt ?? action.case.createdAt }
        }),
        // Area L: snapshot the pre-edit state as a version entry (real history)
        caseVersionsById: before ? appendCaseVersion(state, before, action.case) : state.caseVersionsById,
      }
      break
    }
    case 'RESTORE_CASE_VERSION': {
      const target = state.cases.find((c) => c.id === action.caseId)
      const version = (state.caseVersionsById?.[action.caseId] ?? []).find((v) => v.id === action.versionId)
      if (!target || !version) return state
      // Restore editable content fields only — identity fields stay untouched.
      const restored: Case = {
        ...target,
        ...version.snapshot,
        updatedAt: new Date().toISOString(),
      }
      next = {
        ...state,
        cases: state.cases.map((c) => (c.id === action.caseId ? restored : c)),
        // The restore itself is recorded as a new version (pre-restore state).
        caseVersionsById: appendCaseVersion(state, target, restored),
      }
      break
    }
    case 'DELETE_CASE': {
      const { [action.caseId]: _removedVersions, ...restVersions } = state.caseVersionsById ?? {}
      next = {
        ...state,
        caseVersionsById: restVersions,
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
    }
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
      const id = newId('run')
      const caseOrder = action.caseIds ?? listActiveProjectTestCases(state).filter((c) => !c.archivedAt).map((c) => c.id)
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
      const id = newId('run')
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
    case 'CREATE_RERUN': {
      const source = findRunById(state, action.sourceRunId)
      if (!source) return state
      const projectId = source.projectId
      const num = state.nextRunNumByProject[projectId] ?? 1
      const runKey = formatRunKey(num)
      const id = newId('run')
      // Seed Not-run executions carrying assignees per the chosen assignment mode.
      // Source results are never copied or overwritten.
      const executions: Record<string, CaseExecution> = {}
      for (const caseId of action.caseIds) {
        const srcEx = source.executions[caseId]
        const assignee = action.assignMode === 'reassign' ? action.reassignTo : srcEx?.assignee
        if (assignee) {
          executions[caseId] = { status: 'Not run', stepResults: {}, assignee }
        }
      }
      const rerun: DemoRun = {
        id,
        projectId,
        runKey,
        name: action.name.trim() || `${source.name} · Re-run`,
        description: source.description,
        planId: source.planId,
        planName: source.planName,
        createdAt: new Date().toISOString(),
        sealed: false,
        rerunOf: source.id,
        caseOrder: [...action.caseIds],
        executions,
        executionLog: [],
      }
      next = {
        ...state,
        runs: [...state.runs, rerun],
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
    case 'UNARCHIVE_RUN': {
      next = {
        ...state,
        runs: state.runs.map((r) =>
          r.id === action.runId ? { ...r, archivedAt: undefined } : r,
        ),
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
    case 'MOVE_CASES': {
      const ids = new Set(action.caseIds)
      const now = new Date().toISOString()
      next = {
        ...state,
        cases: state.cases.map((c) =>
          ids.has(c.id) ? { ...c, folderId: action.targetFolderId, updatedAt: now } : c,
        ),
      }
      break
    }
    case 'COPY_CASES': {
      const sources = action.caseIds
        .map((id) => state.cases.find((c) => c.id === id))
        .filter((c): c is Case => !!c)
      if (sources.length === 0) return state
      const now = new Date().toISOString()
      let nextNum = state.nextCaseNumByProject[action.targetProjectId] ?? 1
      let nextPos = state.cases
        .filter((c) => c.projectId === action.targetProjectId)
        .reduce((m, c) => Math.max(m, c.position ?? 0), 0)
      const crossProject = sources.some((c) => c.projectId !== action.targetProjectId)
      const copies: Case[] = sources.map((src) => {
        nextPos += 1
        const copy: Case = {
          ...src,
          id: newId('case'),
          caseKey: formatCaseKey(nextNum),
          projectId: action.targetProjectId,
          folderId: action.targetFolderId,
          createdAt: now,
          updatedAt: now,
          position: nextPos,
          archivedAt: undefined,
          tags: action.keepTags ? src.tags : [],
          // Requirements are project-scoped — links can only be kept same-project.
          requirementIds: action.keepRequirements && !crossProject ? src.requirementIds : [],
          steps: src.steps.map((s) => ({ ...s, id: newId('step'), comments: [] })),
          generalComments: [],
        }
        nextNum += 1
        return copy
      })
      next = {
        ...state,
        cases: [...state.cases, ...copies],
        nextCaseNumByProject: { ...state.nextCaseNumByProject, [action.targetProjectId]: nextNum },
      }
      break
    }
    case 'REORDER_CASES': {
      const moving = new Set(action.caseIds)
      const projectCases = state.cases
        .filter((c) => c.projectId === state.activeProjectId && !moving.has(c.id))
        .sort((a, b) => (a.position ?? 0) - (b.position ?? 0))
      const beforePos = action.beforeCaseId
        ? projectCases.find((c) => c.id === action.beforeCaseId)?.position ?? null
        : null
      let insertAfter: number
      if (beforePos == null) {
        insertAfter = projectCases.reduce((m, c) => Math.max(m, c.position ?? 0), 0)
      } else {
        const beforeIdx = projectCases.findIndex((c) => c.id === action.beforeCaseId)
        insertAfter = beforeIdx > 0 ? projectCases[beforeIdx - 1].position ?? 0 : 0
      }
      const span = beforePos == null ? 1 : (beforePos - insertAfter) / (action.caseIds.length + 1)
      const positionById = new Map<string, number>()
      action.caseIds.forEach((id, i) => {
        positionById.set(id, insertAfter + span * (i + 1))
      })
      next = {
        ...state,
        cases: state.cases.map((c) =>
          positionById.has(c.id)
            ? { ...c, position: positionById.get(c.id)!, folderId: action.targetFolderId }
            : c,
        ),
      }
      break
    }
    case 'ASSIGN_CASES': {
      const ids = new Set(action.caseIds)
      const now = new Date().toISOString()
      next = {
        ...state,
        cases: state.cases.map((c) => (ids.has(c.id) ? { ...c, assignee: action.assignee, updatedAt: now } : c)),
      }
      break
    }
    case 'ARCHIVE_CASES': {
      const ids = new Set(action.caseIds)
      const now = new Date().toISOString()
      next = {
        ...state,
        cases: state.cases.map((c) => (ids.has(c.id) ? { ...c, archivedAt: now } : c)),
      }
      break
    }
    case 'UNARCHIVE_CASES': {
      const ids = new Set(action.caseIds)
      // Also unarchive ancestor folders so restored cases are reachable again.
      const foldersToRestore = new Set<string>()
      for (const c of state.cases) {
        if (!ids.has(c.id)) continue
        let folderId = c.folderId ?? null
        let guard = 0
        while (folderId && guard < 50) {
          const f = state.folders.find((x) => x.id === folderId)
          if (!f) break
          if (f.archivedAt) foldersToRestore.add(f.id)
          folderId = f.parentId ?? null
          guard += 1
        }
      }
      next = {
        ...state,
        cases: state.cases.map((c) => (ids.has(c.id) ? { ...c, archivedAt: undefined } : c)),
        folders: state.folders.map((f) =>
          foldersToRestore.has(f.id) ? { ...f, archivedAt: undefined } : f,
        ),
      }
      break
    }
    case 'UPDATE_FOLDER': {
      next = {
        ...state,
        folders: state.folders.map((f) => (f.id === action.folderId ? { ...f, ...action.patch } : f)),
      }
      break
    }
    case 'MOVE_FOLDER': {
      // Guard against re-nesting a folder into itself or its own subtree.
      if (action.newParentId) {
        let cur: string | null | undefined = action.newParentId
        let guard = 0
        while (cur && guard < 50) {
          if (cur === action.folderId) return state
          cur = state.folders.find((f) => f.id === cur)?.parentId
          guard += 1
        }
      }
      next = {
        ...state,
        folders: state.folders.map((f) =>
          f.id === action.folderId ? { ...f, parentId: action.newParentId } : f,
        ),
      }
      break
    }
    case 'COPY_FOLDER': {
      const source = state.folders.find((f) => f.id === action.folderId)
      if (!source) return state
      const projectId = source.projectId
      // Collect subtree folders breadth-first.
      const subtree: Folder[] = []
      const queue = [source]
      while (queue.length > 0) {
        const f = queue.shift()!
        subtree.push(f)
        queue.push(...state.folders.filter((x) => x.parentId === f.id))
      }
      const idMap = new Map<string, string>()
      const newFolders: Folder[] = subtree.map((f) => {
        const cloneId = newId('folder')
        idMap.set(f.id, cloneId)
        return {
          ...f,
          id: cloneId,
          name: f.id === source.id ? `${f.name} (copy)` : f.name,
          parentId: f.id === source.id ? action.targetParentId : idMap.get(f.parentId ?? '') ?? action.targetParentId,
          archivedAt: undefined,
        }
      })
      const subtreeIds = new Set(subtree.map((f) => f.id))
      const sourceCases = state.cases.filter((c) => c.folderId && subtreeIds.has(c.folderId) && !c.archivedAt)
      const now = new Date().toISOString()
      let nextNum = state.nextCaseNumByProject[projectId] ?? 1
      let nextPos = state.cases
        .filter((c) => c.projectId === projectId)
        .reduce((m, c) => Math.max(m, c.position ?? 0), 0)
      const caseCopies: Case[] = sourceCases.map((src) => {
        nextPos += 1
        const copy: Case = {
          ...src,
          id: newId('case'),
          caseKey: formatCaseKey(nextNum),
          folderId: idMap.get(src.folderId!) ?? action.targetParentId,
          createdAt: now,
          updatedAt: now,
          position: nextPos,
          steps: src.steps.map((s) => ({ ...s, id: newId('step'), comments: [] })),
          generalComments: [],
        }
        nextNum += 1
        return copy
      })
      next = {
        ...state,
        folders: [...state.folders, ...newFolders],
        cases: [...state.cases, ...caseCopies],
        nextCaseNumByProject: { ...state.nextCaseNumByProject, [projectId]: nextNum },
      }
      break
    }
    case 'ARCHIVE_FOLDER': {
      const now = new Date().toISOString()
      const subtreeIds = new Set<string>([action.folderId])
      let changed = true
      while (changed) {
        changed = false
        for (const f of state.folders) {
          if (f.parentId && subtreeIds.has(f.parentId) && !subtreeIds.has(f.id)) {
            subtreeIds.add(f.id)
            changed = true
          }
        }
      }
      next = {
        ...state,
        folders: state.folders.map((f) => (subtreeIds.has(f.id) ? { ...f, archivedAt: now } : f)),
        cases: state.cases.map((c) =>
          c.folderId && subtreeIds.has(c.folderId) ? { ...c, archivedAt: now } : c,
        ),
      }
      break
    }
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
    case 'ADD_SCHEDULED_RUN': {
      next = {
        ...state,
        scheduledRunsById: { ...(state.scheduledRunsById ?? {}), [action.schedule.id]: action.schedule },
      }
      break
    }
    case 'UPDATE_SCHEDULED_RUN': {
      const existing = state.scheduledRunsById?.[action.scheduleId]
      if (!existing) return state
      next = {
        ...state,
        scheduledRunsById: {
          ...state.scheduledRunsById,
          [action.scheduleId]: { ...existing, ...action.patch },
        },
      }
      break
    }
    case 'DELETE_SCHEDULED_RUN': {
      const { [action.scheduleId]: _removedSchedule, ...restSchedules } = state.scheduledRunsById ?? {}
      next = { ...state, scheduledRunsById: restSchedules }
      break
    }
    case 'FIRE_DUE_SCHEDULED_RUNS': {
      // Simulated firing — spawns runs for due schedules NOW, in this reducer
      // pass. No real background job exists; the UI labels this plainly.
      const nowIso = action.now
      const due = Object.values(state.scheduledRunsById ?? {}).filter(
        (s) => s.active && s.nextRunAt <= nowIso,
      )
      if (due.length === 0) return state
      let working: DemoState = state
      const scheduledRunsById = { ...(state.scheduledRunsById ?? {}) }
      for (const schedule of due) {
        const plan = working.plansById[schedule.planId]
        const projectId = schedule.projectId
        let spawnedRunId: string | undefined
        if (plan) {
          const projectCases = working.cases.filter((c) => c.projectId === projectId && !c.archivedAt)
          const projectFolders = working.folders.filter((f) => f.projectId === projectId)
          const caseIds = resolvePlanCases(plan, projectCases, projectFolders).map((c) => c.id)
          const num = working.nextRunNumByProject[projectId] ?? 1
          const runId = newId('run')
          const executions: Record<string, CaseExecution> = {}
          if (schedule.defaultAssignee) {
            for (const caseId of caseIds) {
              executions[caseId] = { status: 'Not run', stepResults: {}, assignee: schedule.defaultAssignee }
            }
          }
          const run: DemoRun = {
            id: runId,
            projectId,
            runKey: formatRunKey(num),
            name: `${schedule.name} — ${new Date(nowIso).toLocaleDateString()}`,
            description: `Created by scheduled run “${schedule.name}” (simulated firing — no real background job).`,
            planId: plan.id,
            planName: plan.title,
            createdAt: nowIso,
            sealed: false,
            caseOrder: caseIds,
            executions,
            executionLog: [],
          }
          working = {
            ...working,
            runs: [...working.runs, run],
            nextRunNumByProject: { ...working.nextRunNumByProject, [projectId]: num + 1 },
          }
          spawnedRunId = runId
        }
        // Advance nextRunAt past now (or deactivate one-off schedules).
        let nextAt = new Date(schedule.nextRunAt)
        let active = schedule.active
        if (schedule.cadence === 'once') {
          active = false
        } else {
          let guard = 0
          while (nextAt.toISOString() <= nowIso && guard < 400) {
            if (schedule.cadence === 'daily') nextAt = new Date(nextAt.getTime() + 86400000)
            else if (schedule.cadence === 'weekly') nextAt = new Date(nextAt.getTime() + 7 * 86400000)
            else nextAt = new Date(new Date(nextAt).setMonth(nextAt.getMonth() + 1))
            guard += 1
          }
        }
        scheduledRunsById[schedule.id] = {
          ...schedule,
          active,
          nextRunAt: nextAt.toISOString(),
          spawnedRunIds: spawnedRunId
            ? [...(schedule.spawnedRunIds ?? []), spawnedRunId]
            : schedule.spawnedRunIds ?? [],
        }
      }
      next = { ...working, scheduledRunsById }
      break
    }
    case 'SET_DASHBOARD_LAYOUT': {
      next = {
        ...state,
        dashboardLayoutByActor: {
          ...(state.dashboardLayoutByActor ?? {}),
          [action.actorUserId]: action.layout,
        },
      }
      break
    }
    case 'RECORD_EXPORT': {
      next = {
        ...state,
        exportsById: { ...(state.exportsById ?? {}), [action.artifact.id]: action.artifact },
      }
      break
    }
    case 'DELETE_EXPORT': {
      const { [action.exportId]: _removedExport, ...restExports } = state.exportsById ?? {}
      next = { ...state, exportsById: restExports }
      break
    }
    case 'SAVE_FILTER': {
      next = {
        ...state,
        savedFiltersById: { ...(state.savedFiltersById ?? {}), [action.filter.id]: action.filter },
      }
      break
    }
    case 'RENAME_SAVED_FILTER': {
      const existing = state.savedFiltersById?.[action.filterId]
      if (!existing) return state
      next = {
        ...state,
        savedFiltersById: {
          ...state.savedFiltersById,
          [action.filterId]: { ...existing, name: action.name.trim() || existing.name },
        },
      }
      break
    }
    case 'DELETE_SAVED_FILTER': {
      const { [action.filterId]: _removedFilter, ...restFilters } = state.savedFiltersById ?? {}
      next = { ...state, savedFiltersById: restFilters }
      break
    }
    case 'SAVE_REPORT': {
      next = {
        ...state,
        savedReportsById: { ...(state.savedReportsById ?? {}), [action.report.id]: action.report },
      }
      break
    }
    case 'RENAME_SAVED_REPORT': {
      const existing = state.savedReportsById?.[action.reportId]
      if (!existing) return state
      next = {
        ...state,
        savedReportsById: {
          ...state.savedReportsById,
          [action.reportId]: { ...existing, name: action.name.trim() || existing.name },
        },
      }
      break
    }
    case 'DELETE_SAVED_REPORT': {
      const { [action.reportId]: _removedReport, ...restReports } = state.savedReportsById ?? {}
      next = { ...state, savedReportsById: restReports }
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
    default:
      return state
  }
  persistState(next)
  return next
}

interface FreshContextValue {
  state: DemoState
  dispatch: React.Dispatch<FreshAction>
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
  addDemoProject: () => { key: string; name: string }
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
  removeAdminUser: (id: string) => void
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
  createProject: (input: { name: string; key: string; description?: string }) => void
  updateProject: (projectId: string, patch: Partial<Pick<Project, 'name' | 'key' | 'description'>>) => void
  updateActiveCustomFields: (projectId: string, activeCustomFieldIds: string[]) => void
  updateProjectSettings: (projectId: string, projectSettings: ProjectSettings) => void
  deleteProject: (projectId: string) => void
  setActiveProject: (projectId: string) => void
  getCase: (caseId: string) => Case | undefined
  addCase: (data: Omit<Case, 'id' | 'updatedAt' | 'createdAt' | 'projectId'>) => string
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
  duplicateRun: (runId: string) => { runKey: string } | null
  createRerun: (input: { sourceRunId: string; name: string; caseIds: string[]; assignMode: 'keep' | 'reassign'; reassignTo?: string }) => { runKey: string } | null
  archiveRun: (runId: string) => void
  unarchiveRun: (runId: string) => void
  deleteRun: (runId: string) => void
  editRun: (runId: string, patch: Partial<Pick<DemoRun, 'name' | 'description' | 'due' | 'planName'>>) => void
  addCasesToRun: (runId: string, caseIds: string[]) => void
  addPlan: (title: string, description?: string) => { planKey: string; planId: string }
  updatePlan: (planId: string, patch: Partial<Pick<TestPlan, 'title' | 'description' | 'queries'>>) => void
  deletePlan: (planId: string) => void
  duplicatePlan: (planId: string) => { planKey: string; planId: string } | null
  spawnRunFromPlan: (planId: string, name: string, description?: string) => { runKey: string } | null
  addFolder: (name: string, parentId?: string | null) => string
  moveCases: (caseIds: string[], targetFolderId: string | null) => void
  copyCases: (input: { caseIds: string[]; targetProjectId: string; targetFolderId: string | null; keepTags: boolean; keepRequirements: boolean }) => void
  reorderCases: (caseIds: string[], targetFolderId: string | null, beforeCaseId?: string) => void
  assignCases: (caseIds: string[], assignee: string) => void
  archiveCases: (caseIds: string[]) => void
  unarchiveCases: (caseIds: string[]) => void
  renameFolder: (folderId: string, name: string) => void
  moveFolder: (folderId: string, newParentId: string | null) => void
  copyFolder: (folderId: string, targetParentId: string | null) => void
  archiveFolder: (folderId: string) => void
  isRunSealed: boolean
  activeSavedReports: SavedReport[]
  saveReport: (input: Omit<SavedReport, 'id' | 'projectId' | 'createdAt'>) => { reportId: string }
  renameSavedReport: (reportId: string, name: string) => void
  deleteSavedReport: (reportId: string) => void
  activeExports: ExportArtifact[]
  recordExport: (artifact: ExportArtifact) => void
  deleteExport: (exportId: string) => void
  activeScheduledRuns: ScheduledRun[]
  addScheduledRun: (input: Omit<ScheduledRun, 'id' | 'projectId' | 'createdAt' | 'spawnedRunIds'>) => void
  updateScheduledRun: (scheduleId: string, patch: Partial<Pick<ScheduledRun, 'name' | 'cadence' | 'nextRunAt' | 'defaultAssignee' | 'active'>>) => void
  deleteScheduledRun: (scheduleId: string) => void
  /** Simulated firing — returns how many schedules were due before dispatching. */
  checkDueScheduledRuns: () => { dueCount: number }
  /** Dashboard layout for the current demo actor (Area J). */
  dashboardLayout: DashboardLayout | undefined
  setDashboardLayout: (layout: DashboardLayout) => void
  getCaseVersions: (caseId: string) => CaseVersion[]
  restoreCaseVersion: (caseId: string, versionId: string) => void
  listSavedFilters: (surface: SavedFilterSurface) => SavedFilter[]
  saveFilter: (input: Omit<SavedFilter, 'id' | 'projectId' | 'createdAt'>) => void
  renameSavedFilter: (filterId: string, name: string) => void
  deleteSavedFilter: (filterId: string) => void
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
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  useEffect(() => {
    if (typeof window === 'undefined' || !isDemoResetRequested()) return
    const params = new URLSearchParams(window.location.search)
    params.delete(DEMO_RESET_PARAM)
    const qs = params.toString()
    const next = `${window.location.pathname}${qs ? `?${qs}` : ''}${window.location.hash}`
    window.history.replaceState(null, '', next)
  }, [])

  const activeProject = useMemo(
    () => getActiveProject(state) ?? Object.values(state.projectsById)[0],
    [state],
  )
  const projects = useMemo(() => listProjects(state), [state])
  const activeFolders = useMemo(() => listActiveProjectFolders(state), [state])
  const activeCases = useMemo(() => listActiveProjectTestCases(state), [state])
  const activeRuns = useMemo(() => listActiveProjectRuns(state), [state])
  const activePlans = useMemo(() => listActiveProjectPlans(state), [state])
  const activeSavedReports = useMemo(() => listActiveProjectSavedReports(state), [state])
  const activeExports = useMemo(() => listActiveProjectExports(state), [state])
  const activeScheduledRuns = useMemo(() => listActiveProjectScheduledRuns(state), [state])
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
    (data: Omit<Case, 'id' | 'updatedAt' | 'createdAt' | 'projectId'>) => {
      const id = newId('case')
      const now = new Date().toISOString()
      const newCase: Case = {
        ...data,
        id,
        projectId: state.activeProjectId,
        createdAt: now,
        updatedAt: now,
      }
      dispatch({ type: 'ADD_CASE', case: newCase })
      return id
    },
    [state],
  )

  const updateCase = useCallback((caseId: string, patch: Partial<Case>) => {
    dispatch({ type: 'UPDATE_CASE', caseId, patch })
  }, [])

  const replaceCase = useCallback((caseItem: Case) => {
    dispatch({ type: 'REPLACE_CASE', case: caseItem })
  }, [])

  const deleteCase = useCallback((caseId: string) => {
    dispatch({ type: 'DELETE_CASE', caseId })
  }, [])

  const updateExecution = useCallback(
    (caseId: string, patch: Partial<CaseExecution>) => {
      const runId = getActiveProjectCurrentRunId(state)
      if (!runId || !runIsMutable(state, runId)) return
      dispatch({ type: 'UPDATE_RUN_EXECUTION', runId, caseId, patch })
    },
    [state],
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
    dispatch({ type: 'SEAL_RUN', runId })
  }, [state])

  const unsealRun = useCallback(() => {
    const runId = getActiveProjectCurrentRunId(state)
    if (!runId) return
    dispatch({ type: 'UNSEAL_RUN', runId })
  }, [state])

  const setCurrentRun = useCallback((runId: string) => {
    dispatch({ type: 'SET_CURRENT_RUN', runId })
  }, [])

  const createRun = useCallback(
    (input: { name: string; description?: string; caseIds?: string[] }) => {
      const num = getActiveProjectNextRunNum(state)
      const runKey = formatRunKey(num)
      dispatch({ type: 'CREATE_RUN', name: input.name, description: input.description, caseIds: input.caseIds })
      return { runKey }
    },
    [state],
  )

  const duplicateRun = useCallback(
    (runId: string) => {
      const source = findRunById(state, runId)
      if (!source) return null
      const num = state.nextRunNumByProject[source.projectId] ?? 1
      const runKey = formatRunKey(num)
      dispatch({ type: 'DUPLICATE_RUN', runId })
      return { runKey }
    },
    [state],
  )

  const createRerun = useCallback(
    (input: { sourceRunId: string; name: string; caseIds: string[]; assignMode: 'keep' | 'reassign'; reassignTo?: string }) => {
      const source = findRunById(state, input.sourceRunId)
      if (!source || input.caseIds.length === 0) return null
      const num = state.nextRunNumByProject[source.projectId] ?? 1
      const runKey = formatRunKey(num)
      dispatch({ type: 'CREATE_RERUN', ...input })
      return { runKey }
    },
    [state],
  )

  const archiveRun = useCallback((runId: string) => {
    dispatch({ type: 'ARCHIVE_RUN', runId })
  }, [])

  const unarchiveRun = useCallback((runId: string) => {
    dispatch({ type: 'UNARCHIVE_RUN', runId })
  }, [])

  const deleteRun = useCallback((runId: string) => {
    dispatch({ type: 'DELETE_RUN', runId })
  }, [])

  const editRun = useCallback(
    (runId: string, patch: Partial<Pick<DemoRun, 'name' | 'description' | 'due' | 'planName'>>) => {
      dispatch({ type: 'UPDATE_RUN', runId, patch })
    },
    [],
  )

  const addCasesToRun = useCallback(
    (runId: string, caseIds: string[]) => {
      dispatch({ type: 'ADD_CASES_TO_RUN', runId, caseIds })
    },
    [],
  )

  const addFolder = useCallback(
    (name: string, parentId?: string | null) => {
      const id = newId('folder')
      dispatch({
        type: 'ADD_FOLDER',
        folder: { id, projectId: state.activeProjectId, name, parentId: parentId ?? null },
      })
      return id
    },
    [state.activeProjectId],
  )

  const moveCases = useCallback((caseIds: string[], targetFolderId: string | null) => {
    dispatch({ type: 'MOVE_CASES', caseIds, targetFolderId })
  }, [])

  const copyCases = useCallback(
    (input: { caseIds: string[]; targetProjectId: string; targetFolderId: string | null; keepTags: boolean; keepRequirements: boolean }) => {
      dispatch({ type: 'COPY_CASES', ...input })
    },
    [],
  )

  const reorderCases = useCallback((caseIds: string[], targetFolderId: string | null, beforeCaseId?: string) => {
    dispatch({ type: 'REORDER_CASES', caseIds, targetFolderId, beforeCaseId })
  }, [])

  const assignCases = useCallback((caseIds: string[], assignee: string) => {
    dispatch({ type: 'ASSIGN_CASES', caseIds, assignee })
  }, [])

  const archiveCases = useCallback((caseIds: string[]) => {
    dispatch({ type: 'ARCHIVE_CASES', caseIds })
  }, [])

  const unarchiveCases = useCallback((caseIds: string[]) => {
    dispatch({ type: 'UNARCHIVE_CASES', caseIds })
  }, [])

  const renameFolder = useCallback((folderId: string, name: string) => {
    dispatch({ type: 'UPDATE_FOLDER', folderId, patch: { name } })
  }, [])

  const moveFolder = useCallback((folderId: string, newParentId: string | null) => {
    dispatch({ type: 'MOVE_FOLDER', folderId, newParentId })
  }, [])

  const copyFolder = useCallback((folderId: string, targetParentId: string | null) => {
    dispatch({ type: 'COPY_FOLDER', folderId, targetParentId })
  }, [])

  const archiveFolder = useCallback((folderId: string) => {
    dispatch({ type: 'ARCHIVE_FOLDER', folderId })
  }, [])

  const addPlan = useCallback(
    (title: string, description?: string) => {
      const projectId = state.activeProjectId
      const num = state.nextPlanNumByProject[projectId] ?? 1
      const planKey = formatPlanKey(num)
      const plan: TestPlan = {
        id: newId('plan'),
        planKey,
        projectId,
        title,
        description,
        createdAt: new Date().toISOString(),
        queries: [],
      }
      dispatch({ type: 'ADD_PLAN', plan })
      return { planKey, planId: plan.id }
    },
    [state],
  )

  const updatePlan = useCallback(
    (planId: string, patch: Partial<Pick<TestPlan, 'title' | 'description' | 'queries'>>) => {
      dispatch({ type: 'UPDATE_PLAN', planId, patch })
    },
    [],
  )

  const deletePlan = useCallback((planId: string) => {
    dispatch({ type: 'DELETE_PLAN', planId })
  }, [])

  const duplicatePlan = useCallback(
    (planId: string) => {
      const original = state.plansById[planId]
      if (!original) return null
      const projectId = state.activeProjectId
      const num = state.nextPlanNumByProject[projectId] ?? 1
      const planKey = formatPlanKey(num)
      const newPlan: TestPlan = {
        ...original,
        id: newId('plan'),
        planKey,
        title: `Copy of ${original.title}`,
        createdAt: new Date().toISOString(),
        queries: original.queries.map((q) => ({ ...q, id: newId('tq') })),
      }
      dispatch({ type: 'DUPLICATE_PLAN', newPlan })
      return { planKey, planId: newPlan.id }
    },
    [state],
  )

  const spawnRunFromPlan = useCallback(
    (planId: string, name: string, description?: string) => {
      const plan = state.plansById[planId]
      if (!plan) return null
      const projectCases = listActiveProjectTestCases(state)
      const projectFolders = listActiveProjectFolders(state)
      const caseIds = resolvePlanCases(plan, projectCases, projectFolders).map((c) => c.id)
      const num = state.nextRunNumByProject[state.activeProjectId] ?? 1
      const runKey = formatRunKey(num)
      dispatch({
        type: 'CREATE_RUN',
        name,
        description,
        caseIds,
        planId,
        planName: plan.title,
      })
      return { runKey }
    },
    [state],
  )

  const addDemoProject = useCallback(() => {
    const meta = buildClonedDemoProjectMeta(state)
    dispatch({ type: 'ADD_DEMO_PROJECT' })
    return { key: meta.key, name: meta.name }
  }, [state])

  const addScheduledRun = useCallback(
    (input: Omit<ScheduledRun, 'id' | 'projectId' | 'createdAt' | 'spawnedRunIds'>) => {
      const schedule: ScheduledRun = {
        ...input,
        id: newId('sched'),
        projectId: state.activeProjectId,
        createdAt: new Date().toISOString(),
        spawnedRunIds: [],
      }
      dispatch({ type: 'ADD_SCHEDULED_RUN', schedule })
    },
    [state.activeProjectId],
  )

  const updateScheduledRun = useCallback(
    (scheduleId: string, patch: Partial<Pick<ScheduledRun, 'name' | 'cadence' | 'nextRunAt' | 'defaultAssignee' | 'active'>>) => {
      dispatch({ type: 'UPDATE_SCHEDULED_RUN', scheduleId, patch })
    },
    [],
  )

  const deleteScheduledRun = useCallback((scheduleId: string) => {
    dispatch({ type: 'DELETE_SCHEDULED_RUN', scheduleId })
  }, [])

  const checkDueScheduledRuns = useCallback(() => {
    const now = new Date().toISOString()
    const dueCount = Object.values(state.scheduledRunsById ?? {}).filter(
      (s) => s.active && s.nextRunAt <= now,
    ).length
    if (dueCount > 0) dispatch({ type: 'FIRE_DUE_SCHEDULED_RUNS', now })
    return { dueCount }
  }, [state.scheduledRunsById])

  const dashboardLayout = useMemo(
    () => state.dashboardLayoutByActor?.[state.currentActorUserId ?? SEED_ADMIN_USER_ID],
    [state.dashboardLayoutByActor, state.currentActorUserId],
  )

  const setDashboardLayout = useCallback(
    (layout: DashboardLayout) => {
      dispatch({
        type: 'SET_DASHBOARD_LAYOUT',
        actorUserId: state.currentActorUserId ?? SEED_ADMIN_USER_ID,
        layout,
      })
    },
    [state.currentActorUserId],
  )

  const recordExport = useCallback((artifact: ExportArtifact) => {
    dispatch({ type: 'RECORD_EXPORT', artifact })
  }, [])

  const getCaseVersions = useCallback(
    (caseId: string) => state.caseVersionsById?.[caseId] ?? [],
    [state.caseVersionsById],
  )

  const restoreCaseVersion = useCallback((caseId: string, versionId: string) => {
    dispatch({ type: 'RESTORE_CASE_VERSION', caseId, versionId })
  }, [])

  const listSavedFilters = useCallback(
    (surface: SavedFilterSurface) => listActiveProjectSavedFilters(state, surface),
    [state],
  )

  const saveFilter = useCallback(
    (input: Omit<SavedFilter, 'id' | 'projectId' | 'createdAt'>) => {
      const filter: SavedFilter = {
        ...input,
        id: newId('filter'),
        projectId: state.activeProjectId,
        createdAt: new Date().toISOString(),
      }
      dispatch({ type: 'SAVE_FILTER', filter })
    },
    [state.activeProjectId],
  )

  const renameSavedFilter = useCallback((filterId: string, name: string) => {
    dispatch({ type: 'RENAME_SAVED_FILTER', filterId, name })
  }, [])

  const deleteSavedFilter = useCallback((filterId: string) => {
    dispatch({ type: 'DELETE_SAVED_FILTER', filterId })
  }, [])

  const deleteExport = useCallback((exportId: string) => {
    dispatch({ type: 'DELETE_EXPORT', exportId })
  }, [])

  const saveReport = useCallback(
    (input: Omit<SavedReport, 'id' | 'projectId' | 'createdAt'>) => {
      const report: SavedReport = {
        ...input,
        id: newId('report'),
        projectId: state.activeProjectId,
        createdAt: new Date().toISOString(),
      }
      dispatch({ type: 'SAVE_REPORT', report })
      return { reportId: report.id }
    },
    [state.activeProjectId],
  )

  const renameSavedReport = useCallback((reportId: string, name: string) => {
    dispatch({ type: 'RENAME_SAVED_REPORT', reportId, name })
  }, [])

  const deleteSavedReport = useCallback((reportId: string) => {
    dispatch({ type: 'DELETE_SAVED_REPORT', reportId })
  }, [])

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

  const createProject = useCallback((input: { name: string; key: string; description?: string }) => {
    dispatch({ type: 'CREATE_PROJECT', ...input })
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

  const inviteAdminUser = useCallback((payload: InviteUserPayload) => {
    dispatch({ type: 'admin/inviteUser', payload })
  }, [])

  const updateAdminUser = useCallback((payload: UpdateUserPayload) => {
    dispatch({ type: 'admin/updateUser', payload })
  }, [])

  const disableAdminUser = useCallback((id: string) => {
    dispatch({ type: 'admin/disableUser', payload: { id } })
  }, [])

  const removeAdminUser = useCallback((id: string) => {
    dispatch({ type: 'admin/removeUser', payload: { id } })
  }, [])

  const reactivateAdminUser = useCallback((id: string) => {
    dispatch({ type: 'admin/reactivateUser', payload: { id } })
  }, [])

  const updateAdminUserRole = useCallback((id: string, role: DemoState['adminSettings']['users'][number]['role']) => {
    dispatch({ type: 'admin/updateUserRole', payload: { id, role } })
  }, [])

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
      removeAdminUser,
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
      createProject,
      addDemoProject,
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
      createRerun,
      archiveRun,
      unarchiveRun,
      deleteRun,
      editRun,
      addCasesToRun,
      addPlan,
      updatePlan,
      deletePlan,
      duplicatePlan,
      spawnRunFromPlan,
      addFolder,
      moveCases,
      copyCases,
      reorderCases,
      assignCases,
      archiveCases,
      unarchiveCases,
      renameFolder,
      moveFolder,
      copyFolder,
      archiveFolder,
      isRunSealed,
      activeSavedReports,
      saveReport,
      renameSavedReport,
      deleteSavedReport,
      activeExports,
      recordExport,
      deleteExport,
      activeScheduledRuns,
      addScheduledRun,
      updateScheduledRun,
      deleteScheduledRun,
      checkDueScheduledRuns,
      dashboardLayout,
      setDashboardLayout,
      listSavedFilters,
      saveFilter,
      renameSavedFilter,
      deleteSavedFilter,
      getCaseVersions,
      restoreCaseVersion,
      createRequirement,
      linkRequirementToCase,
      createDefectFromExecution,
      linkDefectToExecution,
      getDefect,
      getRequirement,
    }),
    [
      state,
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
      removeAdminUser,
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
      createProject,
      addDemoProject,
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
      createRerun,
      archiveRun,
      unarchiveRun,
      deleteRun,
      editRun,
      addCasesToRun,
      addPlan,
      updatePlan,
      deletePlan,
      duplicatePlan,
      spawnRunFromPlan,
      addFolder,
      moveCases,
      copyCases,
      reorderCases,
      assignCases,
      archiveCases,
      unarchiveCases,
      renameFolder,
      moveFolder,
      copyFolder,
      archiveFolder,
      isRunSealed,
      activeSavedReports,
      saveReport,
      renameSavedReport,
      deleteSavedReport,
      activeExports,
      recordExport,
      deleteExport,
      activeScheduledRuns,
      addScheduledRun,
      updateScheduledRun,
      deleteScheduledRun,
      checkDueScheduledRuns,
      dashboardLayout,
      setDashboardLayout,
      listSavedFilters,
      saveFilter,
      renameSavedFilter,
      deleteSavedFilter,
      getCaseVersions,
      restoreCaseVersion,
      createRequirement,
      linkRequirementToCase,
      createDefectFromExecution,
      linkDefectToExecution,
      getDefect,
      getRequirement,
    ],
  )

  return <FreshContext.Provider value={value}>{children}</FreshContext.Provider>
}

export function useFresh() {
  const ctx = useContext(FreshContext)
  if (!ctx) throw new Error('useFresh must be used within FreshProvider')
  return ctx
}
