'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import { buildInitialDemoState, getCurrentRun, mergeSeedRuns } from './demo-seed'
import { migrateDemoState } from './migrate-demo-state'
import type { Case, CaseExecution, DemoRun, DemoState, ExecStatus, ExecutionLogEntry, Folder, Project, ProjectSettings, TestPlan } from './demo-model'
import { isAdminAction, reduceAdminState, type AdminAction, type InviteUserPayload, type UpdateUserPayload } from './admin-reducer'
import { SEED_ADMIN_USER_ID } from './admin-initial-settings'
import type { RolePermissions } from './rbac'
import {
  getActiveProject,
  getActiveProjectCurrentRunId,
  getActiveProjectNextCaseNum,
  getActiveProjectNextRunNum,
  getProjectByKey,
  isProjectKeyUnique,
  listActiveProjectFolders,
  listActiveProjectPlans,
  listActiveProjectRuns,
  listActiveProjectTestCases,
  listProjects,
} from './project-selectors'
import { findRunById } from './run-utils'
import { DEFAULT_SEED_PROJECT_KEY, formatCaseKey, formatPlanKey, formatRunKey, newId, resolvePlanCases } from './demo-model'
import { appendClonedDemoProject, buildClonedDemoProjectMeta } from './demo-project-utils'

const STORAGE_KEY = 'relay-demo-v2'

function runIsMutable(state: DemoState, runId: string): boolean {
  const run = findRunById(state, runId)
  return !!run && !run.sealed
}

function loadState(): DemoState {
  if (typeof window === 'undefined') return buildInitialDemoState()
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
  | { type: 'ARCHIVE_RUN'; runId: string }
  | { type: 'DELETE_RUN'; runId: string }
  | { type: 'ADD_PLAN'; plan: TestPlan }
  | { type: 'UPDATE_PLAN'; planId: string; patch: Partial<Pick<TestPlan, 'title' | 'description' | 'queries'>> }
  | { type: 'DELETE_PLAN'; planId: string }
  | { type: 'DUPLICATE_PLAN'; newPlan: TestPlan }
  | { type: 'ADD_FOLDER'; folder: Folder }
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

      let projectsById = restProjects
      let activeProjectId = state.activeProjectId
      let currentRunIdByProject = restRunIds
      let nextCaseNumByProject = restNums
      let nextRunNumByProject = restRunNums
      let nextPlanNumByProject = restPlanNums

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
        }
      }

      const remainingPlanIds = new Set(
        Object.values(state.plansById)
          .filter((p) => p.projectId !== projectId)
          .map((p) => p.id),
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
        currentRunIdByProject,
        nextCaseNumByProject,
        nextRunNumByProject,
        nextPlanNumByProject,
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
      const id = newId('run')
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
  archiveRun: (runId: string) => void
  deleteRun: (runId: string) => void
  editRun: (runId: string, patch: Partial<Pick<DemoRun, 'name' | 'description' | 'due' | 'planName'>>) => void
  addCasesToRun: (runId: string, caseIds: string[]) => void
  addPlan: (title: string, description?: string) => { planKey: string; planId: string }
  updatePlan: (planId: string, patch: Partial<Pick<TestPlan, 'title' | 'description' | 'queries'>>) => void
  deletePlan: (planId: string) => void
  duplicatePlan: (planId: string) => { planKey: string; planId: string } | null
  spawnRunFromPlan: (planId: string, name: string, description?: string) => { runKey: string } | null
  addFolder: (name: string, parentId?: string | null) => string
  isRunSealed: boolean
}

const FreshContext = createContext<FreshContextValue | null>(null)

export function FreshProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  const activeProject = useMemo(
    () => getActiveProject(state) ?? Object.values(state.projectsById)[0],
    [state],
  )
  const projects = useMemo(() => listProjects(state), [state])
  const activeFolders = useMemo(() => listActiveProjectFolders(state), [state])
  const activeCases = useMemo(() => listActiveProjectTestCases(state), [state])
  const activeRuns = useMemo(() => listActiveProjectRuns(state), [state])
  const activePlans = useMemo(() => listActiveProjectPlans(state), [state])
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

  const archiveRun = useCallback((runId: string) => {
    dispatch({ type: 'ARCHIVE_RUN', runId })
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
    }),
    [
      state,
      activeProject,
      projects,
      activeFolders,
      activeCases,
      activeRuns,
      activePlans,
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
    ],
  )

  return <FreshContext.Provider value={value}>{children}</FreshContext.Provider>
}

export function useFresh() {
  const ctx = useContext(FreshContext)
  if (!ctx) throw new Error('useFresh must be used within FreshProvider')
  return ctx
}
