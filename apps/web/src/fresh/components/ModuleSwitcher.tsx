'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useFresh } from '../data/FreshProvider'
import { MODULES } from '../data/seed'

export function ModuleSwitcher() {
  const { state, dispatch } = useFresh()
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
    return q ? MODULES.filter((m) => m.toLowerCase().includes(q)) : [...MODULES]
  }, [filter])

  return (
    <div className="module-switcher" ref={ref}>
      <button type="button" className="module-btn" onClick={() => setOpen((v) => !v)}>
        <i className="ti ti-layout-grid" />
        <span className="module-current-label">{state.module}</span>
        <i className="ti ti-chevron-down" style={{ marginLeft: 'auto', color: 'var(--text3)' }} />
      </button>
      {open ? (
        <div className="module-menu open">
          <div className="module-search">
            <i className="ti ti-search" style={{ fontSize: 12, color: 'var(--text3)' }} />
            <input
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
                className={`module-item${state.module === name ? ' on' : ''}`}
                onClick={() => {
                  dispatch({ type: 'SET_MODULE', module: name })
                  setOpen(false)
                  setFilter('')
                }}
              >
                <i className={`ti ${name === 'TI-Core Platform' ? 'ti-building' : 'ti-box'}`} style={{ fontSize: 13 }} />
                <span>{name}</span>
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  )
}
