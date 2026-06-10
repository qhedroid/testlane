'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import type { DemoAction, DemoState } from './types'
import { createInitialState } from './seed'
import { demoReducer, loadPersistedState, persistState } from './store'

interface DemoContextValue {
  state: DemoState
  dispatch: (action: DemoAction) => void
  hydrated: boolean
  reset: () => void
}

const DemoContext = createContext<DemoContextValue | null>(null)

export function DemoProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<DemoState>(createInitialState)
  const [hydrated, setHydrated] = useState(false)

  useEffect(() => {
    setState(loadPersistedState())
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (!hydrated) return
    persistState(state)
  }, [state, hydrated])

  const dispatch = useCallback((action: DemoAction) => {
    setState((prev) => demoReducer(prev, action))
  }, [])

  const reset = useCallback(() => {
    const fresh = createInitialState()
    setState(fresh)
    persistState(fresh)
  }, [])

  const value = useMemo(
    () => ({ state, dispatch, hydrated, reset }),
    [state, dispatch, hydrated, reset],
  )

  return <DemoContext.Provider value={value}>{children}</DemoContext.Provider>
}

export function useDemo(): DemoContextValue {
  const ctx = useContext(DemoContext)
  if (!ctx) throw new Error('useDemo must be used within DemoProvider')
  return ctx
}
