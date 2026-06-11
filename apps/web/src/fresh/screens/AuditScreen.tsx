'use client'

import { useMemo, useState } from 'react'
import { FreshTopbar } from '../components/FreshTopbar'
import { PrototypeBanner } from '../components/PrototypeBanner'
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
          { label: 'TI-Core Platform' },
          { label: 'Audit History' },
        ]}
        searchPlaceholder="Search audit…"
        searchWidth={200}
        showSearch
      />
      <PrototypeBanner />
      <div className="audit-wrap">
        <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
          {FILTERS.map((label) => (
            <span
              key={label}
              className={`chip${activeFilter === label ? ' on' : ''}`}
              onClick={() => setActiveFilter(label)}
            >
              {label}
            </span>
          ))}
          <span style={{ marginLeft: 'auto', fontSize: 11, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
            {filteredEvents.length} events · mock data
          </span>
        </div>
        <div className="panel" style={{ flex: 1, overflow: 'hidden' }}>
          <div className="pnl-hd">
            <i className="ti ti-history" style={{ fontSize: 13, color: 'var(--accent)' }} />
            <span className="pnl-ttl">Audit log</span>
            <span className="pnl-ct">{filteredEvents.length}</span>
            <span style={{ fontSize: 10.5, color: 'var(--text3)', marginLeft: 'auto' }}>Append-only · mock timeline</span>
            <button type="button" className="btn" style={{ fontSize: 11, padding: '2px 8px', marginLeft: 6 }}>
              <i className="ti ti-download" style={{ fontSize: 11 }} /> Export
            </button>
          </div>
          <div className="pnl-body">
            {filteredEvents.length === 0 ? (
              <p className="audit-empty">No events match this filter.</p>
            ) : (
              filteredEvents.map((ev, i) => (
                <div key={i} className="audit-row">
                  <div className={`audit-ic ${ev.icon}`}>
                    <i className={`ti ${ev.iconClass}`} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="audit-desc" dangerouslySetInnerHTML={{ __html: ev.html }} />
                    <div className="audit-ctx">{ev.ctx}</div>
                  </div>
                  <div className="audit-time">{ev.time}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
