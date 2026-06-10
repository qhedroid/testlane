'use client'

import { useState } from 'react'
import { FreshTopbar } from '../components/FreshTopbar'
import { AUDIT_EVENTS } from '../data/seed'

const FILTERS = ['All events', 'Test Cases', 'Test Runs', 'Test Plans', 'Users'] as const

export function AuditScreen() {
  const [activeFilter, setActiveFilter] = useState<string>('All events')

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
            147 events · last 7 days
          </span>
        </div>
        <div className="panel" style={{ flex: 1, overflow: 'hidden' }}>
          <div className="pnl-hd">
            <i className="ti ti-history" style={{ fontSize: 13, color: 'var(--accent)' }} />
            <span className="pnl-ttl">Audit log</span>
            <span className="pnl-ct">147</span>
            <span style={{ fontSize: 10.5, color: 'var(--text3)', marginLeft: 'auto' }}>Append-only · all mutations captured</span>
            <button type="button" className="btn" style={{ fontSize: 11, padding: '2px 8px', marginLeft: 6 }}>
              <i className="ti ti-download" style={{ fontSize: 11 }} /> Export
            </button>
          </div>
          <div className="pnl-body">
            {AUDIT_EVENTS.map((ev, i) => (
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
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
