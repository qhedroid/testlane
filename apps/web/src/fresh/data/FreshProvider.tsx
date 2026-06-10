'use client'

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useReducer,
  type ReactNode,
} from 'react'
import { DEFAULT_RUN, INITIAL_CASES, INITIAL_EXEC_CASES } from './seed'
import type { DemoCase, ExecCase, FreshAction, FreshState } from './types'
import { nextCaseId } from './ui-utils'

const STORAGE_KEY = 'relay-fresh-cases'

function loadCases(): DemoCase[] {
  if (typeof window === 'undefined') return [...INITIAL_CASES]
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const extra: DemoCase[] = raw ? JSON.parse(raw) : []
    return [...INITIAL_CASES, ...extra]
  } catch {
    return [...INITIAL_CASES]
  }
}

function persistExtraCases(cases: DemoCase[]) {
  if (typeof window === 'undefined') return
  const extra = cases.filter((c) => !INITIAL_CASES.some((ic) => ic.id === c.id))
  localStorage.setItem(STORAGE_KEY, JSON.stringify(extra))
}

function reducer(state: FreshState, action: FreshAction): FreshState {
  switch (action.type) {
    case 'SET_MODULE':
      return { ...state, module: action.module }
    case 'ADD_CASE': {
      const cases = [...state.cases, action.case]
      persistExtraCases(cases)
      return { ...state, cases, nextCaseNum: state.nextCaseNum + 1 }
    }
    case 'SET_EXEC_CASES':
      return { ...state, execCases: action.cases }
    case 'UPDATE_EXEC_CASE': {
      const execCases = state.execCases.map((c, i) =>
        i === action.index ? { ...c, ...action.patch } : c,
      )
      return { ...state, execCases }
    }
    case 'SEAL_RUN':
      return {
        ...state,
        sealedRunIds: state.sealedRunIds.includes(action.runId)
          ? state.sealedRunIds
          : [...state.sealedRunIds, action.runId],
      }
    case 'SET_CURRENT_RUN':
      return { ...state, currentRunId: action.runId, currentRunName: action.name }
    default:
      return state
  }
}

function initState(): FreshState {
  return {
    module: 'TI-Core Platform',
    cases: loadCases(),
    execCases: INITIAL_EXEC_CASES.map((c) => ({
      ...c,
      sr: [...c.sr],
      defects: [...c.defects],
    })),
    sealedRunIds: [],
    currentRunId: DEFAULT_RUN.id,
    currentRunName: DEFAULT_RUN.name,
    nextCaseNum: 13,
  }
}

interface FreshContextValue {
  state: FreshState
  dispatch: React.Dispatch<FreshAction>
  addCase: (data: Omit<DemoCase, 'id'>) => string
  updateExecCase: (index: number, patch: Partial<ExecCase>) => void
  sealRun: () => void
  setCurrentRun: (runId: string, name: string) => void
  isRunSealed: boolean
}

const FreshContext = createContext<FreshContextValue | null>(null)

export function FreshProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, undefined, initState)

  const addCase = useCallback(
    (data: Omit<DemoCase, 'id'>) => {
      const id = nextCaseId(state.nextCaseNum)
      const newCase: DemoCase = { ...data, id }
      dispatch({ type: 'ADD_CASE', case: newCase })
      return id
    },
    [state.nextCaseNum],
  )

  const updateExecCase = useCallback((index: number, patch: Partial<ExecCase>) => {
    dispatch({ type: 'UPDATE_EXEC_CASE', index, patch })
  }, [])

  const sealRun = useCallback(() => {
    dispatch({ type: 'SEAL_RUN', runId: state.currentRunId })
  }, [state.currentRunId])

  const setCurrentRun = useCallback((runId: string, name: string) => {
    dispatch({ type: 'SET_CURRENT_RUN', runId, name })
  }, [])

  const isRunSealed = state.sealedRunIds.includes(state.currentRunId)

  const value = useMemo(
    () => ({ state, dispatch, addCase, updateExecCase, sealRun, setCurrentRun, isRunSealed }),
    [state, dispatch, addCase, updateExecCase, sealRun, setCurrentRun, isRunSealed],
  )

  return <FreshContext.Provider value={value}>{children}</FreshContext.Provider>
}

export function useFresh() {
  const ctx = useContext(FreshContext)
  if (!ctx) throw new Error('useFresh must be used within FreshProvider')
  return ctx
}
