'use client'

import { useMemo, useState } from 'react'
import { FreshTopbar } from '../components/FreshTopbar'
import { useFresh } from '../data/FreshProvider'
import { formatRelativeTime } from '../data/demo-model'
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

const STATUS_CHIPS: { label: string; value: StatusFilter }[] = [
  { label: 'All', value: 'all' },
  { label: 'Open', value: 'open' },
  { label: 'In progress', value: 'in_progress' },
  { label: 'Resolved', value: 'resolved' },
  { label: 'Closed', value: 'closed' },
]

const AVATAR_COLORS = ['#1976D2', '#00796B', '#5E35B1', '#C62828', '#EF6C00', '#455A64']

type StatusFilter = 'all' | DefectStatus
type SeverityFilter = 'all' | DefectSeverity

function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function avatarInitials(name: string): string {
  return name
    .split(' ')
    .map((x) => x[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function runLabel(linkedRunName?: string): string {
  if (!linkedRunName) return '—'
  const match = linkedRunName.match(/R\d+|#\d+|\d+/)
  return match?.[0] ?? linkedRunName.slice(0, 8)
}

export function DefectsScreen() {
  const { activeDefects, activeProject } = useFresh()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all')
  const [detailOpen, setDetailOpen] = useState(true)

  const allDefects = useMemo(() => {
    const local: MockDefect[] = activeDefects.map((d) => ({
      id: d.defectKey,
      title: d.title,
      severity: 'medium' as DefectSeverity,
      status: (d.status === 'In progress' ? 'in_progress' : d.status.toLowerCase()) as DefectStatus,
      module: activeProject.name,
      owner: 'Local demo',
      createdAt: formatRelativeTime(d.createdAt),
      updatedAt: formatRelativeTime(d.createdAt),
    }))
    return [...local, ...MOCK_DEFECTS]
  }, [activeDefects, activeProject.name])

  const [selectedId, setSelectedId] = useState<string | null>(allDefects[0]?.id ?? null)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return allDefects.filter((d) => {
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
  }, [search, statusFilter, severityFilter, allDefects])

  const selected = filtered.find((d) => d.id === selectedId) ?? filtered[0] ?? null

  function selectDefect(id: string) {
    setSelectedId(id)
    setDetailOpen(true)
  }

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

      <div className="def-lay">
        <div className={`def-split${detailOpen && selected ? ' def-split-open' : ''}`}>
          <div className="def-gl-table">
            <div className="def-toolbar">
              <h3>All defects</h3>
              <span className="def-shown">{filtered.length} shown</span>
              <div className="def-toolbar-right">
                <input
                  className="inp def-search"
                  type="search"
                  placeholder="Search ID, title, module…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <select
                  className="inp def-severity-select"
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value as SeverityFilter)}
                  aria-label="Severity filter"
                >
                  <option value="all">All severities</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                {STATUS_CHIPS.map((chip) => (
                  <span
                    key={chip.value}
                    className={`chip${statusFilter === chip.value ? ' on' : ''}`}
                    onClick={() => setStatusFilter(chip.value)}
                  >
                    {chip.label}
                  </span>
                ))}
                {!detailOpen && selected ? (
                  <button
                    type="button"
                    className="btn btn-neutral btn-sm"
                    onClick={() => setDetailOpen(true)}
                  >
                    <i className="ti ti-layout-sidebar-right" style={{ fontSize: 14 }} />
                    Details
                  </button>
                ) : null}
              </div>
            </div>
            <div className="def-table-scroll">
              <table className="tbl def-tbl">
                <thead>
                  <tr>
                    <th style={{ width: 64 }}>ID</th>
                    <th>Defect</th>
                    <th style={{ width: 84 }}>Severity</th>
                    <th style={{ width: 110 }}>Status</th>
                    <th style={{ width: 150 }}>Assignee</th>
                    <th style={{ width: 70 }}>Case</th>
                    <th style={{ width: 64 }}>Run</th>
                    <th style={{ width: 76 }}>Opened</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="def-empty">
                        No defects match filters.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((d) => (
                      <tr
                        key={d.id}
                        className={selected?.id === d.id ? 'sel' : ''}
                        onClick={() => selectDefect(d.id)}
                      >
                        <td className="def-id">{d.id}</td>
                        <td className="def-title">{d.title}</td>
                        <td>
                          <span className={SEVERITY_CLASS[d.severity]}>{d.severity}</span>
                        </td>
                        <td>
                          <span className={STATUS_CLASS[d.status]}>{STATUS_LABEL[d.status]}</span>
                        </td>
                        <td>
                          <div className="def-assignee">
                            <span
                              className="def-av"
                              style={{ background: avatarColor(d.owner) }}
                            >
                              {avatarInitials(d.owner)}
                            </span>
                            <span className="def-assignee-name">{d.owner}</span>
                          </div>
                        </td>
                        <td className="def-id">{d.linkedCaseRef ?? '—'}</td>
                        <td className="def-id">{runLabel(d.linkedRunName)}</td>
                        <td className="def-opened">{d.createdAt}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {detailOpen && selected ? <DefectDetail defect={selected} onClose={() => setDetailOpen(false)} /> : null}
        </div>
      </div>
    </div>
  )
}

function DefectDetail({ defect, onClose }: { defect: MockDefect; onClose: () => void }) {
  return (
    <div className="panel def-detail-panel">
      <div className="def-detail-hd">
        <span className="def-id">{defect.id}</span>
        <span style={{ flex: 1 }} />
        <button type="button" className="def-icon-btn" onClick={onClose} aria-label="Close panel">
          <i className="ti ti-x" style={{ fontSize: 16 }} />
        </button>
      </div>
      <div className="def-detail-intro">
        <h3 className="def-detail-title">{defect.title}</h3>
        <div className="def-detail-badges">
          <span className={SEVERITY_CLASS[defect.severity]}>{defect.severity}</span>
          <span className={STATUS_CLASS[defect.status]}>{STATUS_LABEL[defect.status]}</span>
          <span className="def-detail-owner">
            <span className="def-av" style={{ background: avatarColor(defect.owner) }}>
              {avatarInitials(defect.owner)}
            </span>
            {defect.owner}
          </span>
        </div>
      </div>
      <div className="def-detail-body">
        <div className="def-sec-label">Module</div>
        <div className="def-sec-val">{defect.module}</div>

        {defect.linkedCaseRef ? (
          <>
            <div className="def-sec-label">Linked test case</div>
            <div className="def-sec-val def-id">{defect.linkedCaseRef}</div>
          </>
        ) : null}

        {defect.linkedRunName ? (
          <>
            <div className="def-sec-label">Linked run</div>
            <div className="def-sec-val">{defect.linkedRunName}</div>
          </>
        ) : null}

        <div className="def-sec-label">Timeline</div>
        <dl className="def-meta">
          <div>
            <dt>Created</dt>
            <dd>{defect.createdAt}</dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{defect.updatedAt}</dd>
          </div>
        </dl>

        <p className="def-detail-note">
          Local demo defects (DEF-*) are created from failed/blocked test run executions. Mock TI-* rows remain static. No Jira sync in this prototype.
        </p>
      </div>
    </div>
  )
}
