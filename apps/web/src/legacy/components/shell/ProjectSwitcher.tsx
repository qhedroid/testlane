'use client'

import { useEffect, useRef, useState } from 'react'
import { useDemo } from '@/lib/demo/DemoProvider'
import { PROJECTS } from '@/lib/demo/seed'

export function ProjectSwitcher() {
  const { state, dispatch } = useDemo()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  return (
    <div className="proj-switcher" ref={ref}>
      <button type="button" className="proj-btn" onClick={() => setOpen((v) => !v)}>
        <i className="ti ti-apps proj-btn-icon" />
        <span className="pn">{state.project}</span>
        <i className="ti ti-chevron-down proj-chev" />
      </button>
      {open ? (
        <div className="proj-dd">
          <div className="proj-dd-hd">Switch project</div>
          {PROJECTS.map((name) => (
            <button
              key={name}
              type="button"
              className={`proj-item${state.project === name ? ' active' : ''}`}
              onClick={() => {
                dispatch({ type: 'SET_PROJECT', project: name })
                setOpen(false)
              }}
            >
              <i className={`ti ${state.project === name ? 'ti-check' : 'ti-square'}`} />
              {name}
            </button>
          ))}
          <div className="proj-divider" />
          <button type="button" className="proj-action" onClick={() => setOpen(false)}>
            <i className="ti ti-plus" />
            Create new project
          </button>
          <button type="button" className="proj-action muted" onClick={() => setOpen(false)}>
            <i className="ti ti-settings" />
            Project settings
          </button>
        </div>
      ) : null}
    </div>
  )
}
