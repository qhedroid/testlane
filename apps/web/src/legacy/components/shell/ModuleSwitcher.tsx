'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useDemo } from '@/lib/demo/DemoProvider'
import { PROJECTS } from '@/lib/demo/seed'

export function ModuleSwitcher() {
  const { state, dispatch } = useDemo()
  const [open, setOpen] = useState(false)
  const [filter, setFilter] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setFilter('')
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const items = useMemo(() => {
    const q = filter.trim().toLowerCase()
    if (!q) return [...PROJECTS]
    return PROJECTS.filter((p) => p.toLowerCase().includes(q))
  }, [filter])

  return (
    <div className="module-switcher" ref={ref}>
      <button type="button" className="module-btn" onClick={() => setOpen((v) => !v)}>
        <i className="ti ti-layout-grid" />
        <span>{state.project}</span>
        <i className="ti ti-chevron-down module-chev" />
      </button>
      {open ? (
        <div className="module-menu open">
          <div className="module-search">
            <i className="ti ti-search" />
            <input
              type="text"
              placeholder="Switch project or module..."
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              autoFocus
            />
          </div>
          <div className="module-list">
            {items.map((name) => (
              <button
                key={name}
                type="button"
                className={`module-item${state.project === name ? ' on' : ''}`}
                onClick={() => {
                  dispatch({ type: 'SET_PROJECT', project: name })
                  setOpen(false)
                  setFilter('')
                }}
              >
                {name}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
