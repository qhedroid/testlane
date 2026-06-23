'use client'

import { useMemo, useState } from 'react'
import { useFresh } from '../data/FreshProvider'

interface AddCasesToRunModalProps {
  open: boolean
  runId: string | undefined
  onClose: () => void
}

export function AddCasesToRunModal({ open, runId, onClose }: AddCasesToRunModalProps) {
  const { activeCases, activeFolders, activeRuns, addCasesToRun } = useFresh()
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Set<string>>(new Set())

  const run = activeRuns.find((r) => r.id === runId)
  const inRun = useMemo(() => new Set(run?.caseOrder ?? []), [run])

  const available = useMemo(() => {
    const sq = query.trim().toLowerCase()
    return activeCases.filter((c) => {
      if (inRun.has(c.id)) return false
      if (!sq) return true
      return (
        c.title.toLowerCase().includes(sq) ||
        (c.caseKey ?? '').toLowerCase().includes(sq)
      )
    })
  }, [activeCases, inRun, query])

  const grouped = useMemo(() => {
    const map = new Map<string | null, typeof available>()
    for (const c of available) {
      const key = c.folderId ?? null
      if (!map.has(key)) map.set(key, [])
      map.get(key)!.push(c)
    }
    return [...map.entries()].map(([folderId, cases]) => ({
      folderId,
      label: folderId ? (activeFolders.find((f) => f.id === folderId)?.name ?? 'Unfiled') : 'Unfiled',
      cases,
    }))
  }, [available, activeFolders])

  function toggleCase(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleFolder(caseIds: string[]) {
    const allSelected = caseIds.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) caseIds.forEach((id) => next.delete(id))
      else caseIds.forEach((id) => next.add(id))
      return next
    })
  }

  function handleAdd() {
    if (!runId || selected.size === 0) return
    addCasesToRun(runId, [...selected])
    setSelected(new Set())
    setQuery('')
    onClose()
  }

  function handleClose() {
    setSelected(new Set())
    setQuery('')
    onClose()
  }

  if (!open) return null

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div
        className="create-dialog"
        style={{ width: 540, maxHeight: '80vh' }}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => { if (e.key === 'Escape') handleClose() }}
      >
        <div className="shortcuts-hd">
          <div className="shortcuts-title">Add cases to run</div>
          <button type="button" className="btn" style={{ padding: '2px 6px' }} onClick={handleClose}>
            <i className="ti ti-x" style={{ fontSize: 13 }} />
          </button>
        </div>

        <div style={{ padding: '8px 12px', borderBottom: '1px solid var(--border)' }}>
          <input
            autoFocus
            placeholder="Search cases…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            style={{ width: '100%', fontSize: 12, padding: '4px 8px', borderRadius: 4, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)' }}
          />
        </div>

        <div className="create-body" style={{ padding: 0 }}>
          {available.length === 0 ? (
            <div style={{ padding: 20, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>
              {query ? 'No cases match your search.' : 'All project cases are already in this run.'}
            </div>
          ) : (
            grouped.map((group) => {
              const groupIds = group.cases.map((c) => c.id)
              const allChecked = groupIds.every((id) => selected.has(id))
              const someChecked = groupIds.some((id) => selected.has(id))
              return (
                <div key={group.folderId ?? '__unfiled__'}>
                  <div
                    style={{
                      display: 'flex', alignItems: 'center', gap: 6,
                      padding: '5px 12px', background: 'var(--surface)',
                      borderBottom: '1px solid var(--border)',
                      position: 'sticky', top: 0, zIndex: 1,
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={allChecked}
                      ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked }}
                      onChange={() => toggleFolder(groupIds)}
                      style={{ cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--text2)' }}>{group.label}</span>
                    <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 'auto' }}>{group.cases.length}</span>
                  </div>
                  {group.cases.map((c) => (
                    <div
                      key={c.id}
                      style={{
                        display: 'flex', alignItems: 'flex-start', gap: 8,
                        padding: '6px 12px 6px 28px',
                        borderBottom: '1px solid var(--border)',
                        cursor: 'pointer',
                        background: selected.has(c.id) ? 'var(--hover)' : undefined,
                      }}
                      onClick={() => toggleCase(c.id)}
                    >
                      <input
                        type="checkbox"
                        checked={selected.has(c.id)}
                        onChange={() => toggleCase(c.id)}
                        onClick={(e) => e.stopPropagation()}
                        style={{ cursor: 'pointer', marginTop: 2, flexShrink: 0 }}
                      />
                      <div>
                        <div style={{ fontSize: 11, fontFamily: 'var(--mono)', color: 'var(--text3)', marginBottom: 1 }}>
                          {c.caseKey ?? c.id}
                        </div>
                        <div style={{ fontSize: 12, color: 'var(--text)' }}>{c.title}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            })
          )}
        </div>

        <div className="create-foot" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 11.5, color: 'var(--text3)' }}>
            {selected.size > 0 ? `${selected.size} case${selected.size === 1 ? '' : 's'} selected` : ''}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" className="btn" onClick={handleClose}>Cancel</button>
            <button
              type="button"
              className="btn btn-p"
              disabled={selected.size === 0}
              onClick={handleAdd}
            >
              <i className="ti ti-plus" style={{ fontSize: 12 }} />
              Add {selected.size > 0 ? selected.size : ''} case{selected.size !== 1 ? 's' : ''}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
