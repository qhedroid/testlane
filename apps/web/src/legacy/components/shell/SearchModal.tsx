'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useMemo, useState } from 'react'
import { useDemo } from '@/lib/demo/DemoProvider'

interface SearchModalProps {
  open: boolean
  onClose: () => void
}

export function SearchModal({ open, onClose }: SearchModalProps) {
  const { state } = useDemo()
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [focusIdx, setFocusIdx] = useState(-1)

  useEffect(() => {
    if (!open) {
      setQuery('')
      setFocusIdx(-1)
    }
  }, [open])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        if (open) onClose()
      }
      if (e.key === 'Escape' && open) onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) {
      return [
        { kind: 'case' as const, title: 'CTMS user role mapping preserves Viewer permission', meta: 'CTMS · High · Failed 1d ago', href: '/cases' },
        { kind: 'run' as const, title: 'CTMS Regression — Sprint 44', meta: 'Active · 132 cases · 77% complete', href: '/runs' },
        { kind: 'plan' as const, title: 'CTMS Module — Full Regression', meta: 'Plan · Active · 87 cases · 3 runs', href: '/plans' },
      ]
    }
    const items: { kind: string; title: string; meta: string; href: string }[] = []
    state.cases
      .filter((c) => !c.archived && (c.title.toLowerCase().includes(q) || c.id.toLowerCase().includes(q)))
      .slice(0, 5)
      .forEach((c) => items.push({ kind: 'case', title: c.title, meta: `${c.suite} · ${c.priority}`, href: '/cases' }))
    state.runs
      .filter((r) => r.name.toLowerCase().includes(q))
      .slice(0, 5)
      .forEach((r) => items.push({ kind: 'run', title: r.name, meta: `${r.status} · ${r.environment}`, href: '/runs' }))
    state.plans
      .filter((p) => p.title.toLowerCase().includes(q))
      .slice(0, 5)
      .forEach((p) => items.push({ kind: 'plan', title: p.title, meta: `${p.status} · ${p.cases} cases`, href: '/plans' }))
    return items
  }, [query, state])

  function go(href: string) {
    router.push(href)
    onClose()
  }

  if (!open) return null

  return (
    <div
      className="modal-backdrop"
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="search-dialog" role="dialog" aria-label="Search" onClick={(e) => e.stopPropagation()}>
        <div className="search-input-row">
          <span>⌕</span>
          <input
            type="text"
            autoFocus
            placeholder="Search test cases, runs, plans…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value)
              setFocusIdx(-1)
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault()
                setFocusIdx((i) => Math.min(i + 1, results.length - 1))
              } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setFocusIdx((i) => Math.max(i - 1, 0))
              } else if (e.key === 'Enter' && results[focusIdx >= 0 ? focusIdx : 0]) {
                go(results[focusIdx >= 0 ? focusIdx : 0].href)
              }
            }}
          />
          <span className="kbd">Esc</span>
        </div>
        <div className="search-results-wrap">
          {!query.trim() ? <div className="search-group-label">Recently viewed</div> : null}
          {results.length === 0 ? (
            <div className="search-empty">No results for &ldquo;{query}&rdquo;</div>
          ) : (
            results.map((r, i) => (
              <button
                key={`${r.kind}-${r.title}`}
                type="button"
                className={`search-result-item${i === focusIdx ? ' focused' : ''}`}
                onClick={() => go(r.href)}
              >
                <div className="search-result-icon">{r.kind === 'case' ? '📄' : r.kind === 'run' ? '▶' : '📋'}</div>
                <div className="search-result-info">
                  <div className="search-result-title">{r.title}</div>
                  <div className="search-result-meta">{r.meta}</div>
                </div>
              </button>
            ))
          )}
        </div>
        <div className="search-footer">
          <span className="search-footer-hint">
            <span className="kbd">↑</span>
            <span className="kbd">↓</span> navigate
          </span>
          <span className="search-footer-hint">
            <span className="kbd">↵</span> open
          </span>
          <span className="search-footer-hint" style={{ marginLeft: 'auto' }}>
            {results.length} results
          </span>
        </div>
      </div>
    </div>
  )
}
