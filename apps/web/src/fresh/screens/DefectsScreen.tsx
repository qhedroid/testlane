'use client'

import { useMemo, useState } from 'react'
import { PrototypeBanner } from '../components/PrototypeBanner'
import { FreshTopbar } from '../components/FreshTopbar'
import {
  MOCK_DEFECTS,
  type DefectSeverity,
  type DefectStatus,
  type MockDefect,
} from '@/lib/relay/mock-data'

const SEVERITY_CLASS: Record<DefectSeverity, string> = {
  critical: 'pri pr-crit',
  high: 'pri pr-high',
  medium: 'pri pr-med',
  low: 'pri pr-low',
}

const STATUS_CLASS: Record<DefectStatus, string> = {
  open: 'pill p-fail',
  in_progress: 'pill p-block',
  resolved: 'pill p-pass',
  closed: 'pill p-not_run',
}

const STATUS_LABEL: Record<DefectStatus, string> = {
  open: 'Open',
  in_progress: 'In progress',
  resolved: 'Resolved',
  closed: 'Closed',
}

type StatusFilter = 'all' | DefectStatus
type SeverityFilter = 'all' | DefectSeverity

export function DefectsScreen() {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(MOCK_DEFECTS[0]?.id ?? null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return MOCK_DEFECTS.filter((d) => {
      if (statusFilter !== 'all' && d.status !== statusFilter) return false
      if (severityFilter !== 'all' && d.severity !== severityFilter) return false
      if (!q) return true
      return (
        d.id.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        d.module.toLowerCase().includes(q) ||
        d.owner.toLowerCase().includes(q) ||
        (d.linkedCaseRef?.toLowerCase().includes(q) ?? false)
      )
    })
  }, [search, statusFilter, severityFilter])

  const selected = filtered.find((d) => d.id === selectedId) ?? filtered[0] ?? null

  return (
    <div className="view">
      <FreshTopbar
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Defects' },
        ]}
        searchPlaceholder="Search defects…"
        showSearch={false}
        actions={
          <button type="button" className="btn btn-p" disabled title="Prototype only">
            + New defect
          </button>
        }
      />
      <PrototypeBanner />

      <div className="defects-lay">
        <div className="defects-filters">
          <input
            className="inp"
            type="search"
            placeholder="Search ID, title, module, owner…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: 260 }}
          />
          <select
            className="inp"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
          >
            <option value="all">All statuses</option>
            <option value="open">Open</option>
            <option value="in_progress">In progress</option>
            <option value="resolved">Resolved</option>
            <option value="closed">Closed</option>
          </select>
          <select
            className="inp"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
          >
            <option value="all">All severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <span className="defects-count">{filtered.length} defects</span>
        </div>

        <div className="defects-split">
          <div className="panel defects-list-panel">
            <div className="pnl-hd">
              <i className="ti ti-bug" style={{ fontSize: 13, color: 'var(--accent)' }} />
              <span className="pnl-ttl">Defect list</span>
              <span className="pnl-ct">{filtered.length}</span>
            </div>
            <div className="pnl-body defects-table-wrap">
              <table className="defects-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Title</th>
                    <th>Severity</th>
                    <th>Status</th>
                    <th>Module</th>
                    <th>Owner</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="defects-empty">
                        No defects match filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((d) => (
                      <tr
                        key={d.id}
                        className={selected?.id === d.id ? 'on' : ''}
                        onClick={() => setSelectedId(d.id)}
                      >
                        <td className="mono">{d.id}</td>
                        <td>{d.title}</td>
                        <td>
                          <span className={SEVERITY_CLASS[d.severity]}>{d.severity}</span>
                        </td>
                        <td>
                          <span className={STATUS_CLASS[d.status]}>{STATUS_LABEL[d.status]}</span>
                        </td>
                        <td>{d.module}</td>
                        <td>{d.owner}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {selected ? <DefectDetail defect={selected} /> : null}
        </div>
      </div>
    </div>
  )
}

function DefectDetail({ defect }: { defect: MockDefect }) {
  return (
    <div className="panel defects-detail-panel">
      <div className="pnl-hd">
        <span className="pnl-ttl mono">{defect.id}</span>
        <span className={SEVERITY_CLASS[defect.severity]}>{defect.severity}</span>
        <span className={STATUS_CLASS[defect.status]}>{STATUS_LABEL[defect.status]}</span>
      </div>
      <div className="pnl-body defects-detail-body">
        <h3 className="defects-detail-title">{defect.title}</h3>
        <dl className="defects-meta">
          <div>
            <dt>Module</dt>
            <dd>{defect.module}</dd>
          </div>
          <div>
            <dt>Owner</dt>
            <dd>{defect.owner}</dd>
          </div>
          <div>
            <dt>Created</dt>
            <dd>{defect.createdAt}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{defect.updatedAt}</dd>
          </div>
          {defect.linkedCaseRef ? (
            <div>
              <dt>Linked case</dt>
              <dd className="mono">{defect.linkedCaseRef}</dd>
            </div>
          ) : null}
          {defect.linkedRunName ? (
            <div>
              <dt>Linked run</dt>
              <dd>{defect.linkedRunName}</dd>
            </div>
          ) : null}
        </dl>
        <p className="defects-detail-note">
          Create, edit, and Jira sync are placeholder actions in this prototype.
        </p>
      </div>
    </div>
  )
}
