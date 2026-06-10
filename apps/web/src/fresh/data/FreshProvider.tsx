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
import type { Case, CaseExecution, DemoRun, DemoState, ExecStatus, Folder } from './demo-model'
import { newId } from './demo-model'
import { nextCaseId } from './ui-utils'

const STORAGE_KEY = 'relay-demo-v2'

function loadState(): DemoState {
  if (typeof window === 'undefined') return buildInitialDemoState()
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return mergeSeedRuns(JSON.parse(raw) as DemoState)
  } catch {
    /* use seed */
  }
  return buildInitialDemoState()
}

function persistState(state: DemoState) {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

export type FreshAction =
  | { type: 'SET_MODULE'; module: string }
  | { type: 'ADD_CASE'; case: Case }
  | { type: 'UPDATE_CASE'; caseId: string; patch: Partial<Case> }
  | { type: 'REPLACE_CASE'; case: Case }
  | { type: 'UPDATE_RUN_EXECUTION'; runId: string; caseId: string; patch: Partial<CaseExecution> }
  | { type: 'ADD_STEP_COMMENT'; caseId: string; stepId: string; author: string; body: string }
  | { type: 'ADD_GENERAL_COMMENT'; caseId: string; author: string; body: string }
  | { type: 'SEAL_RUN'; runId: string }
  | { type: 'SET_CURRENT_RUN'; runId: string }
  | { type: 'ADD_FOLDER'; folder: Folder }
  | { type: 'HYDRATE'; state: DemoState }

function reducer(state: DemoState, action: FreshAction): DemoState {
  let next: DemoState
  switch (action.type) {
    case 'HYDRATE':
      return action.state
    case 'SET_MODULE':
      next = { ...state, module: action.module }
      break
    case 'ADD_CASE':
      next = { ...state, cases: [...state.cases, action.case], nextCaseNum: state.nextCaseNum + 1 }
      break
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
    case 'UPDATE_RUN_EXECUTION': {
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
    case 'SET_CURRENT_RUN':
      next = { ...state, currentRunId: action.runId }
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
  currentRun: DemoRun
  getCase: (caseId: string) => Case | undefined
  addCase: (data: Omit<Case, 'id' | 'updatedAt'>) => string
  updateCase: (caseId: string, patch: Partial<Case>) => void
  replaceCase: (caseData: Case) => void
  updateExecution: (caseId: string, patch: Partial<CaseExecution>) => void
  addStepComment: (caseId: string, stepId: string, body: string, author?: string) => void
  addGeneralComment: (caseId: string, body: string, author?: string) => void
  sealRun: () => void
  setCurrentRun: (runId: string) => void
  addFolder: (name: string, parentId?: string | null) => string
  isRunSealed: boolean
}

const FreshContext = createContext<FreshContextValue | null>(null)

export function FreshProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, loadState)

  const currentRun = useMemo(() => getCurrentRun(state), [state])

  const getCase = useCallback(
    (caseId: string) => state.cases.find((c) => c.id === caseId),
    [state.cases],
  )

  const addCase = useCallback(
    (data: Omit<Case, 'id' | 'updatedAt'>) => {
      const id = nextCaseId(state.nextCaseNum)
      const newCase: Case = { ...data, id, updatedAt: new Date().toISOString() }
      dispatch({ type: 'ADD_CASE', case: newCase })
      return id
    },
    [state.nextCaseNum],
  )

  const updateCase = useCallback((caseId: string, patch: Partial<Case>) => {
    dispatch({ type: 'UPDATE_CASE', caseId, patch })
  }, [])

  const replaceCase = useCallback((caseItem: Case) => {
    dispatch({ type: 'REPLACE_CASE', case: caseItem })
  }, [])

  const updateExecution = useCallback(
    (caseId: string, patch: Partial<CaseExecution>) => {
      dispatch({ type: 'UPDATE_RUN_EXECUTION', runId: state.currentRunId, caseId, patch })
    },
    [state.currentRunId],
  )

  const addStepComment = useCallback(
    (caseId: string, stepId: string, body: string, author = 'Shaun Sevume') => {
      dispatch({ type: 'ADD_STEP_COMMENT', caseId, stepId, author, body })
    },
    [],
  )

  const addGeneralComment = useCallback(
    (caseId: string, body: string, author = 'Shaun Sevume') => {
      dispatch({ type: 'ADD_GENERAL_COMMENT', caseId, author, body })
    },
    [],
  )

  const sealRun = useCallback(() => {
    dispatch({ type: 'SEAL_RUN', runId: state.currentRunId })
  }, [state.currentRunId])

  const setCurrentRun = useCallback((runId: string) => {
    dispatch({ type: 'SET_CURRENT_RUN', runId })
  }, [])

  const addFolder = useCallback((name: string, parentId?: string | null) => {
    const id = newId('folder')
    dispatch({ type: 'ADD_FOLDER', folder: { id, name, parentId: parentId ?? null } })
    return id
  }, [])

  const isRunSealed = currentRun.sealed

  const value = useMemo(
    () => ({
      state,
      dispatch,
      currentRun,
      getCase,
      addCase,
      updateCase,
      replaceCase,
      updateExecution,
      addStepComment,
      addGeneralComment,
      sealRun,
      setCurrentRun,
      addFolder,
      isRunSealed,
    }),
    [
      state,
      dispatch,
      currentRun,
      getCase,
      addCase,
      updateCase,
      replaceCase,
      updateExecution,
      addStepComment,
      addGeneralComment,
      sealRun,
      setCurrentRun,
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
