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
import type { Case, CaseExecution, DemoRun, DemoState, ExecStatus, Folder, Project, ProjectSettings } from './demo-model'
import { isAdminAction, reduceAdminState, type AdminAction } from './admin-reducer'
import {
  getActiveProject,
  getActiveProjectCurrentRunId,
  getActiveProjectNextCaseNum,
  getActiveProjectNextRunNum,
  getProjectByKey,
  isProjectKeyUnique,
  listActiveProjectFolders,
  listActiveProjectRuns,
  listActiveProjectTestCases,
  listProjects,
} from './project-selectors'
import { findRunById } from './run-utils'
import { DEFAULT_SEED_PROJECT_KEY, formatCaseKey, formatRunKey, newId } from './demo-model'
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
  | { type: 'ADD_STEP_COMMENT'; caseId: string; stepId: string; author: string; body: string }
  | { type: 'ADD_GENERAL_COMMENT'; caseId: string; author: string; body: string }
  | { type: 'SEAL_RUN'; runId: string }
  | { type: 'UNSEAL_RUN'; runId: string }
  | { type: 'SET_CURRENT_RUN'; runId: string }
  | { type: 'CREATE_RUN'; name: string; description?: string }
  | { type: 'DUPLICATE_RUN'; runId: string }
  | { type: 'ARCHIVE_RUN'; runId: string }
  | { type: 'DELETE_RUN'; runId: string }
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

      let projectsById = restProjects
      let activeProjectId = state.activeProjectId
      let currentRunIdByProject = restRunIds
      let nextCaseNumByProject = restNums
      let nextRunNumByProject = restRunNums

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
        }
      }

      next = {
        ...state,
        projectsById,
        activeProjectId,
        folders: state.folders.filter((f) => f.projectId !== projectId),
        cases: state.cases.filter((c) => c.projectId !== projectId),
        runs: state.runs.filter((r) => r.projectId !== projectId),
        currentRunIdByProject,
        nextCaseNumByProject,
        nextRunNumByProject,
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
        cases: state.cases.map((c) => (c.id === action.case.id ? action.case : c)),
      }
      break
    case 'DELETE_CASE':
      next = { ...state, cases: state.cases.filter((c) => c.id !== action.caseId) }
      break
    case 'UPDATE_RUN_EXECUTION': {
      if (!runIsMutable(state, action.runId)) return state
      const runs = state.runs.map((r) => {
        if (r.id !== action.runId) return r
        const prev = r.executions[action.caseId] ?? { status: 'Not run' as ExecStatus, stepResults: {} }
        return {
          ...r,
          executions: {
            ...r.executions,
            [action.caseId]: { ...prev, ...action.patch },
          },
        }
      })
      next = { ...state, runs }
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
      const caseOrder = listActiveProjectTestCases(state).map((c) => c.id)
      const run: DemoRun = {
        id,
        projectId,
        runKey,
        name: action.name.trim() || 'Untitled run',
        description: action.description?.trim() || undefined,
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
  saveAdminProfile: (payload: Partial<DemoState['adminSettings']['profile']>) => void
  saveAdminAccount: (payload: Partial<DemoState['adminSettings']['account']>) => void
  toggleAdmin2FA: (method: string) => void
  saveAdminOrganization: (payload: Partial<DemoState['adminSettings']['organization']>) => void
  createAdminApiKey: (payload: Omit<DemoState['adminSettings']['apiKeys'][number], 'id' | 'createdAt' | 'maskedKey' | 'userId'>) => void
  deleteAdminApiKey: (id: string) => void
  inviteAdminUser: (payload: Omit<DemoState['adminSettings']['users'][number], 'id' | 'lastLoginAt' | 'twoFa' | 'status'>) => void
  updateAdminUserRole: (id: string, role: DemoState['adminSettings']['users'][number]['role']) => void
  createAdminRole: (payload: Omit<DemoState['adminSettings']['roles'][number], 'id' | 'userCount' | 'isBuiltIn'>) => void
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
  addCase: (data: Omit<Case, 'id' | 'updatedAt' | 'projectId'>) => string
  updateCase: (caseId: string, patch: Partial<Case>) => void
  replaceCase: (caseData: Case) => void
  deleteCase: (caseId: string) => void
  updateExecution: (caseId: string, patch: Partial<CaseExecution>) => void
  addStepComment: (caseId: string, stepId: string, body: string, author?: string) => void
  addGeneralComment: (caseId: string, body: string, author?: string) => void
  sealRun: () => void
  unsealRun: () => void
  setCurrentRun: (runId: string) => void
  createRun: (input: { name: string; description?: string }) => { runKey: string }
  duplicateRun: (runId: string) => { runKey: string } | null
  archiveRun: (runId: string) => void
  deleteRun: (runId: string) => void
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
  const currentRun = useMemo(() => getCurrentRun(state), [state])

  const getCase = useCallback(
    (caseId: string) => activeCases.find((c) => c.id === caseId),
    [activeCases],
  )

  const addCase = useCallback(
    (data: Omit<Case, 'id' | 'updatedAt' | 'projectId'>) => {
      const id = newId('case')
      const newCase: Case = {
        ...data,
        id,
        projectId: state.activeProjectId,
        updatedAt: new Date().toISOString(),
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
    (input: { name: string; description?: string }) => {
      const num = getActiveProjectNextRunNum(state)
      const runKey = formatRunKey(num)
      dispatch({ type: 'CREATE_RUN', name: input.name, description: input.description })
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

  const inviteAdminUser = useCallback(
    (payload: Omit<DemoState['adminSettings']['users'][number], 'id' | 'lastLoginAt' | 'twoFa' | 'status'>) => {
      dispatch({ type: 'admin/inviteUser', payload })
    },
    [],
  )

  const updateAdminUserRole = useCallback((id: string, role: DemoState['adminSettings']['users'][number]['role']) => {
    dispatch({ type: 'admin/updateUserRole', payload: { id, role } })
  }, [])

  const createAdminRole = useCallback(
    (payload: Omit<DemoState['adminSettings']['roles'][number], 'id' | 'userCount' | 'isBuiltIn'>) => {
      dispatch({ type: 'admin/createRole', payload })
    },
    [],
  )

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
      currentRun,
      getActiveProject: () => getActiveProject(state),
      listProjects: () => listProjects(state),
      listActiveProjectFolders: () => listActiveProjectFolders(state),
      listActiveProjectTestCases: () => listActiveProjectTestCases(state),
      listActiveProjectRuns: () => listActiveProjectRuns(state),
      getProjectByKey: getProjectByKeyFn,
      isProjectKeyUnique: isProjectKeyUniqueFn,
      adminSettings: state.adminSettings,
      saveAdminProfile,
      saveAdminAccount,
      toggleAdmin2FA,
      saveAdminOrganization,
      createAdminApiKey,
      deleteAdminApiKey,
      inviteAdminUser,
      updateAdminUserRole,
      createAdminRole,
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
      updateAdminUserRole,
      createAdminRole,
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
