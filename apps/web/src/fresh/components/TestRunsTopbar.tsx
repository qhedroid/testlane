'use client'

import { useEffect, useRef, useState } from 'react'
import type { DemoRun } from '../data/demo-model'

interface TestRunsTopbarProps {
  currentRun: DemoRun | undefined
  onSealToggle: () => void
  onDuplicate: () => void
  onDelete: () => void
  onCreateRun: () => void
  onEdit?: () => void
  hasCases?: boolean
}

export function TestRunsTopbar({
  currentRun,
  onSealToggle,
  onDuplicate,
  onDelete,
  onCreateRun,
  onEdit,
  hasCases = true,
}: TestRunsTopbarProps) {
  const [moreOpen, setMoreOpen] = useState(false)
  const moreRef = useRef<HTMLDivElement>(null)
  const hasRun = !!currentRun
  const sealed = currentRun?.sealed ?? false

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  function closeMore() {
    setMoreOpen(false)
  }

  function handleDuplicate() {
    closeMore()
    onDuplicate()
  }

  function handleDelete() {
    closeMore()
    onDelete()
  }

  function handleSealFromMenu() {
    closeMore()
    onSealToggle()
  }

  function handleEdit() {
    closeMore()
    onEdit?.()
  }

  return (
    <div className="ta tr-topbar-actions">
      <button
        type="button"
        className="btn tr-seal-btn"
        disabled={!hasRun}
        onClick={onSealToggle}
      >
        <i className={`ti ${sealed ? 'ti-lock-open' : 'ti-lock'}`} style={{ fontSize: 12 }} />
        {sealed ? 'Re-open test run' : 'Close test run'}
      </button>
      <button
        type="button"
        className="btn tr-icon-btn"
        disabled={!hasRun}
        title="Edit test run"
        aria-label="Edit test run"
        onClick={handleEdit}
      >
        <i className="ti ti-pencil" style={{ fontSize: 13 }} />
      </button>
      <button
        type="button"
        className="btn tr-icon-btn"
        disabled={!hasRun}
        title="Create report"
        aria-label="Create report"
      >
        <i className="ti ti-report-analytics" style={{ fontSize: 13 }} />
      </button>
      <div className="tr-more-wrap" ref={moreRef}>
        <button
          type="button"
          className="btn"
          onClick={() => setMoreOpen((v) => !v)}
        >
          More…
          <i className="ti ti-chevron-down" style={{ fontSize: 10, opacity: 0.6 }} />
        </button>
        {moreOpen ? (
          <div className="tr-more-dd open">
            <button type="button" className="tr-more-item" disabled={!hasRun} onClick={handleEdit}>Edit test run</button>
            <button type="button" className="tr-more-item" disabled={!hasRun} onClick={handleSealFromMenu}>
              {sealed ? 'Re-open test run' : 'Close test run'}
            </button>
            <button type="button" className="tr-more-item" disabled={!hasRun} onClick={handleDuplicate}>
              Duplicate test run
            </button>
            <button type="button" className="tr-more-item" disabled={!hasRun}>Show history</button>
            <div className="tr-more-sep" />
            <button type="button" className="tr-more-item" disabled={!hasRun || sealed}>Reset all results</button>
            <div className="tr-more-sep" />
            <button type="button" className="tr-more-item" disabled={!hasRun}>Create report</button>
            <button type="button" className="tr-more-item" disabled={!hasRun}>Export test run as CSV</button>
            <button type="button" className="tr-more-item" disabled={!hasRun}>Export test run as Excel</button>
            <div className="tr-more-sep" />
            <button type="button" className="tr-more-item tr-more-danger" disabled={!hasRun} onClick={handleDelete}>
              Delete test run
            </button>
            <div className="tr-more-sep" />
            <button type="button" className="tr-more-item tr-more-create" disabled={!hasCases} onClick={() => { closeMore(); onCreateRun() }}>
              Create new run…
            </button>
          </div>
        ) : null}
      </div>
    </div>
  )
}
