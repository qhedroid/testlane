'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

interface FreshUIContextValue {
  searchOpen: boolean
  openSearch: () => void
  closeSearch: () => void
  shortcutsOpen: boolean
  openShortcuts: () => void
  closeShortcuts: () => void
  createCaseOpen: boolean
  openCreateCase: () => void
  closeCreateCase: () => void
}

const FreshUIContext = createContext<FreshUIContextValue | null>(null)

export function FreshUIProvider({ children }: { children: ReactNode }) {
  const [searchOpen, setSearchOpen] = useState(false)
  const [shortcutsOpen, setShortcutsOpen] = useState(false)
  const [createCaseOpen, setCreateCaseOpen] = useState(false)

  const openSearch = useCallback(() => setSearchOpen(true), [])
  const closeSearch = useCallback(() => setSearchOpen(false), [])
  const openShortcuts = useCallback(() => setShortcutsOpen(true), [])
  const closeShortcuts = useCallback(() => setShortcutsOpen(false), [])
  const openCreateCase = useCallback(() => setCreateCaseOpen(true), [])
  const closeCreateCase = useCallback(() => setCreateCaseOpen(false), [])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setSearchOpen(true)
      }
      if (e.key === 'Escape') {
        setSearchOpen(false)
        setShortcutsOpen(false)
        setCreateCaseOpen(false)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const value = useMemo(
    () => ({
      searchOpen,
      openSearch,
      closeSearch,
      shortcutsOpen,
      openShortcuts,
      closeShortcuts,
      createCaseOpen,
      openCreateCase,
      closeCreateCase,
    }),
    [searchOpen, shortcutsOpen, createCaseOpen, openSearch, closeSearch, openShortcuts, closeShortcuts, openCreateCase, closeCreateCase],
  )

  return <FreshUIContext.Provider value={value}>{children}</FreshUIContext.Provider>
}

export function useFreshUI() {
  const ctx = useContext(FreshUIContext)
  if (!ctx) throw new Error('useFreshUI must be used within FreshUIProvider')
  return ctx
}
