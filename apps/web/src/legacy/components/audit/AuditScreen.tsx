'use client'

import { useState } from 'react'
import { TestlaneTopbar } from '@/components/shell/TestlaneTopbar'
import { statusPillClass } from '@/lib/demo/store'

type AuditFilter = 'all' | 'cases' | 'runs' | 'plans' | 'users'

const AUDIT_EVENTS = [
  { icon: 'result', iconClass: 'ti-x', actor: 'Priya Malhotra', desc: <>marked <span className="audit-ref">TC-1004</span> as <span className={statusPillClass('fail')}>Fail</span> <span style={{ color: 'var(--relay-muted)' }}>(was Not run)</span></>, ctx: 'CTMS Regression — Sprint 44 · execution result change', time: '1h ago' },
  { icon: 'link', iconClass: 'ti-bug', actor: 'Priya Malhotra', desc: <>linked defect <span className="audit-ref">TI-4419</span> to <span className="audit-ref">TC-2041</span></>, ctx: 'CTMS Regression — Sprint 44 · defect linked', time: '2h ago' },
  { icon: 'result', iconClass: 'ti-check', actor: 'Elena Voss', desc: <>marked <span className="audit-ref">TC-1012</span> as <span className={statusPillClass('pass')}>Pass</span> <span style={{ color: 'var(--relay-muted)' }}>(was Not run)</span></>, ctx: 'SSO/IAM Role Matrix — Permission Validation', time: '3h ago' },
  { icon: 'edit', iconClass: 'ti-edit', actor: 'Devon Reyes', desc: <>updated preconditions on <span className="audit-ref">TC-1008</span></>, ctx: 'CTMS · Reporting suite · content edit', time: '4h ago' },
  { icon: 'create', iconClass: 'ti-player-play', actor: 'Noel Quadri', desc: <>created run <span className="audit-ref">CTMS Regression — Sprint 44</span> from plan <span className="audit-ref">CTMS Module — Full Regression</span></>, ctx: '132 cases snapshotted · 3 assignees · UAT environment', time: '2d ago' },
  { icon: 'assign', iconClass: 'ti-user', actor: 'Noel Quadri', desc: <>assigned <span className="audit-ref">TC-1007</span> to <strong>Priya Malhotra</strong></>, ctx: 'Viewer suite · assignee change', time: '2d ago' },
  { icon: 'edit', iconClass: 'ti-edit', actor: 'Priya Malhotra', desc: <>changed priority of <span className="audit-ref">TC-1007</span> from <strong>High</strong> → <strong>Critical</strong></>, ctx: 'Viewer · Grid & filtering suite', time: '2d ago' },
  { icon: 'seal', iconClass: 'ti-lock', actor: 'Noel Quadri', desc: <>sealed run <span className="audit-ref">SSO/IAM Role Matrix — Permission Validation</span></>, ctx: '24 cases · 89% pass rate · sealed after sign-off', time: '5d ago' },
  { icon: 'create', iconClass: 'ti-file-plus', actor: 'Devon Reyes', desc: <>created test case <span className="audit-ref">TC-1013</span> <em style={{ color: 'var(--relay-muted)', fontSize: 11 }}>Viewer pagination resets on filter clear</em></>, ctx: 'Viewer · Grid & filtering suite', time: '5d ago' },
  { icon: 'edit', iconClass: 'ti-folders', actor: 'Noel Quadri', desc: <>moved <span className="audit-ref">TC-1006</span> from <strong>CTMS</strong> to <strong>Viewer</strong> suite</>, ctx: 'Folder / suite reassignment', time: '6d ago' },
  { icon: 'seal', iconClass: 'ti-lock-open', actor: 'Noel Quadri', desc: <>reopened sealed run <span className="audit-ref">eTMF Regression — Sprint 43</span></>, ctx: 'Reason: TC-1005 result was incorrect — 1 case re-executed and resealed', time: '6d ago' },
  { icon: 'create', iconClass: 'ti-clipboard-list', actor: 'Noel Quadri', desc: <>created test plan <span className="audit-ref">Viewer Module — Functional Regression</span></>, ctx: 'Draft · 29 cases across 2 suites · QA environment', time: '7d ago' },
] as const

export function AuditScreen() {
  const [filter, setFilter] = useState<AuditFilter>('all')

  return (
    <div className="view-screen">
      <TestlaneTopbar
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'TI-Core Platform' },
          { label: 'Audit History' },
        ]}
        searchPlaceholder="Search audit…"
      />

      <div className="audit-wrap">
        <div className="audit-filters">
          {([
            { id: 'all' as AuditFilter, label: 'All events' },
            { id: 'cases' as AuditFilter, label: 'Test Cases' },
            { id: 'runs' as AuditFilter, label: 'Test Runs' },
            { id: 'plans' as AuditFilter, label: 'Test Plans' },
            { id: 'users' as AuditFilter, label: 'Users' },
          ]).map((f) => (
            <button key={f.id} type="button" className={`chip${filter === f.id ? ' on' : ''}`} onClick={() => setFilter(f.id)}>
              {f.label}
            </button>
          ))}
          <span className="audit-meta">147 events · last 7 days</span>
        </div>

        <div className="panel panel-grow">
          <div className="pnl-hd">
            <i className="ti ti-history" style={{ fontSize: 13, color: 'var(--relay-accent)' }} />
            <span className="pnl-ttl">Audit log</span>
            <span className="pnl-ct">147</span>
            <span className="audit-append-note">Append-only · all mutations captured</span>
            <button type="button" className="relay-btn relay-btn-sm" style={{ marginLeft: 6 }}>
              <i className="ti ti-download" /> Export
            </button>
          </div>
          <div className="pnl-body">
            {AUDIT_EVENTS.map((ev, i) => (
              <div key={i} className="audit-row">
                <div className={`audit-ic ${ev.icon}`}>
                  <i className={`ti ${ev.iconClass}`} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="audit-desc">
                    <strong>{ev.actor}</strong> {ev.desc}
                  </div>
                  <div className="audit-ctx">{ev.ctx}</div>
                </div>
                <div className="audit-time">{ev.time}</div>
              </div>
            ))}
            <div className="audit-load-more">
              <button type="button" className="relay-btn">Load 135 older events</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
