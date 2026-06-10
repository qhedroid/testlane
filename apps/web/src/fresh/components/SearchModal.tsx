'use client'

import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { useFresh } from '../data/FreshProvider'
import { PLANS, RUN_CARDS } from '../data/seed'
import { useFreshUI } from '../hooks/useFreshUI'

export function SearchModal() {
  const { searchOpen, closeSearch } = useFreshUI()
  const { state } = useFresh()
  const router = useRouter()
  const [q, setQ] = useState('')
  const [focusIdx, setFocusIdx] = useState(-1)

  const results = useMemo(() => {
    const ql = q.trim().toLowerCase()
    if (!ql) return []
    const items: { type: string; title: string; meta: string; href: string }[] = []
    state.cases
      .filter((c) => c.id.toLowerCase().includes(ql) || c.title.toLowerCase().includes(ql))
      .slice(0, 5)
      .forEach((c) => items.push({ type: 'Test Case', title: `${c.id} · ${c.title}`, meta: c.suite, href: '/cases' }))
    RUN_CARDS.filter((r) => r.name.toLowerCase().includes(ql))
      .slice(0, 5)
      .forEach((r) => items.push({ type: 'Test Run', title: r.name, meta: r.plan, href: '/runs' }))
    PLANS.filter((p) => p.title.toLowerCase().includes(ql))
      .slice(0, 5)
      .forEach((p) => items.push({ type: 'Test Plan', title: p.title, meta: `${p.cases} cases`, href: '/plans' }))
    return items
  }, [q, state.cases])

  if (!searchOpen) return null

  function go(href: string) {
    closeSearch()
    setQ('')
    router.push(href)
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setFocusIdx((i) => Math.min(i + 1, results.length - 1))
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault()
      setFocusIdx((i) => Math.max(i - 1, 0))
    }
    if (e.key === 'Enter' && focusIdx >= 0 && results[focusIdx]) {
      go(results[focusIdx].href)
    }
  }

  return (
    <div className="modal-backdrop" onClick={closeSearch}>
      <div className="search-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="search-input-row">
          <i className="ti ti-search" />
          <input
            type="text"
            placeholder="Search test cases, runs, plans…"
            value={q}
            onChange={(e) => { setQ(e.target.value); setFocusIdx(0) }}
            onKeyDown={onKey}
            autoFocus
          />
          <span className="kbd">Esc</span>
        </div>
        <div className="search-results-wrap">
          {q && results.length === 0 ? (
            <div className="search-empty">
              <i className="ti ti-search" />
              No results for &quot;{q}&quot;
            </div>
          ) : null}
          {results.map((r, i) => (
            <button
              key={`${r.type}-${r.title}`}
              type="button"
              className={`search-result-item${focusIdx === i ? ' focused' : ''}`}
              onClick={() => go(r.href)}
            >
              <div className="search-result-icon">
                <i className={`ti ${r.type === 'Test Case' ? 'ti-file-description' : r.type === 'Test Run' ? 'ti-player-play' : 'ti-clipboard-list'}`} />
              </div>
              <div className="search-result-info">
                <div className="search-result-title">{r.title}</div>
                <div className="search-result-meta">{r.type} · {r.meta}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="search-footer">
          <div className="search-footer-hint"><span className="kbd">↑</span><span className="kbd">↓</span>&nbsp;navigate</div>
          <div className="search-footer-hint"><span className="kbd">↵</span>&nbsp;open</div>
          <div className="search-footer-hint"><span className="kbd">Esc</span>&nbsp;close</div>
          <span style={{ fontSize: 10.5, color: 'var(--text3)' }}>Cases · Runs · Plans</span>
          <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text3)' }}>{results.length} results</span>
        </div>
      </div>
    </div>
  )
}
