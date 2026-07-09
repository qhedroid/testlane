'use client'

import { useMemo, useState } from 'react'
import { FreshTopbar } from '../components/FreshTopbar'
import { PrototypeBanner } from '../components/PrototypeBanner'
import { useFresh } from '../data/FreshProvider'
import { AUDIT_EVENTS } from '../data/seed'
import type { AuditEvent } from '../data/types'

const FILTERS = ['All events', 'Test Cases', 'Test Runs', 'Test Plans', 'Users'] as const
type AuditFilter = (typeof FILTERS)[number]

function matchesFilter(ev: AuditEvent, filter: AuditFilter): boolean {
  if (filter === 'All events') return true
  const text = `${ev.html} ${ev.ctx}`.toLowerCase()
  if (filter === 'Test Cases') {
    return /test case|tc-|precondition|folder \/ suite|content edit/.test(text)
  }
  if (filter === 'Test Runs') {
    return /run|execution result|sealed|reopened|snapshotted/.test(text)
  }
  if (filter === 'Test Plans') {
    return /test plan|from plan/.test(text)
  }
  if (filter === 'Users') {
    return /assign|assigned|priority of/.test(text)
  }
  return true
}

export function AuditScreen() {
  const { activeProject } = useFresh()
  const [activeFilter, setActiveFilter] = useState<AuditFilter>('All events')

  const filteredEvents = useMemo(
    () => AUDIT_EVENTS.filter((ev) => matchesFilter(ev, activeFilter)),
    [activeFilter],
  )

  return (
    <div className="view">
      <FreshTopbar
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: activeProject.name },
          { label: 'Audit History' },
        ]}
        searchPlaceholder="Search audit…"
        searchWidth={200}
        showSearch
      />
      <PrototypeBanner />

      <div className="screen-wrap audit-screen-wrap">
        <div className="page-head">
          <div>
            <h1>Audit History</h1>
            <div className="sub">Demo · append-only event log across all modules</div>
          </div>
          <div className="actions">
            <button type="button" className="btn btn-neutral">
              <i className="ti ti-download" style={{ fontSize: 13 }} />
              Export CSV
            </button>
          </div>
        </div>

        <div className="audit-filter-row">
          {FILTERS.map((label) => (
            <span
              key={label}
              className={`chip${activeFilter === label ? ' on' : ''}`}
              onClick={() => setActiveFilter(label)}
            >
              {label}
            </span>
          ))}
          <span className="audit-count">{filteredEvents.length} events</span>
        </div>

        <div className="panel audit-panel">
          {filteredEvents.length === 0 ? (
            <p className="audit-empty">No events match this filter.</p>
          ) : (
            filteredEvents.map((ev, i) => (
              <div key={i} className="aud-row">
                <div className={`aud-ic aud-ic-${ev.icon}`}>
                  <i className={`ti ${ev.iconClass}`} />
                </div>
                <div className="aud-main">
                  <div className="aud-desc" dangerouslySetInnerHTML={{ __html: ev.html }} />
                  <div className="aud-ctx">{ev.ctx}</div>
                </div>
                <div className="aud-time">{ev.time}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
