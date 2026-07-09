'use client'

import { useMemo, useState } from 'react'
import { FreshTopbar } from '../components/FreshTopbar'
import { useFresh } from '../data/FreshProvider'
import type { Requirement, RequirementStatus } from '../data/demo-model'
import { formatRelativeTime } from '../data/demo-model'

type ReqFilter = 'all' | RequirementStatus

interface RequirementRow {
  id: string
  title: string
  source: string
  status: RequirementStatus
  caseCount: number
  updated: string
}

const STATIC_REQUIREMENTS: RequirementRow[] = [
  { id: 'REQ-00001', title: 'Users can authenticate via corporate SSO', source: 'Product spec · IAM', status: 'Approved', caseCount: 6, updated: '2d ago' },
  { id: 'REQ-00002', title: 'Role changes propagate within 60 seconds', source: 'Security review', status: 'Implemented', caseCount: 4, updated: '4d ago' },
  { id: 'REQ-00003', title: 'Audit log captures permission mutations', source: 'Compliance', status: 'Approved', caseCount: 3, updated: '1w ago' },
  { id: 'REQ-00004', title: 'Document upload validates MIME and size', source: 'eTMF module', status: 'Draft', caseCount: 0, updated: '3d ago' },
  { id: 'REQ-00005', title: 'Run summary export includes skipped rows', source: 'Reporting', status: 'Approved', caseCount: 2, updated: '5d ago' },
  { id: 'REQ-00006', title: 'Notification digests respect user timezone', source: 'Notifications', status: 'Draft', caseCount: 1, updated: '6d ago' },
  { id: 'REQ-00007', title: 'Viewer grid supports 10k row virtual scroll', source: 'Performance', status: 'Implemented', caseCount: 5, updated: '1w ago' },
  { id: 'REQ-00008', title: 'Sealed runs are read-only for executors', source: 'Test runs', status: 'Implemented', caseCount: 2, updated: '2w ago' },
]

const STATUS_CLASS: Record<RequirementStatus, string> = {
  Draft: 'pill p-notrun',
  Approved: 'pill p-act',
  Implemented: 'pill p-pass',
  Obsolete: 'pill p-notrun',
}

const FILTER_CHIPS: { id: ReqFilter; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'Draft', label: 'Draft' },
  { id: 'Approved', label: 'Approved' },
  { id: 'Implemented', label: 'Implemented' },
]

function coverageLabel(status: RequirementStatus, caseCount: number): string {
  if (caseCount === 0) return 'Uncovered'
  if (status === 'Implemented') return 'Covered'
  return caseCount >= 2 ? 'Partial' : 'Partial'
}

function coverageClass(status: RequirementStatus, caseCount: number): string {
  if (caseCount === 0) return 'pill p-fail'
  if (status === 'Implemented') return 'pill p-pass'
  return 'pill p-block'
}

export function RequirementsScreen() {
  const { activeRequirements, activeCases } = useFresh()
  const [filter, setFilter] = useState<ReqFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const rows = useMemo(() => {
    const live: RequirementRow[] = activeRequirements.map((req: Requirement) => {
      const caseCount = activeCases.filter((c) => (c.requirementIds ?? []).includes(req.id)).length
      return {
        id: req.requirementKey,
        title: req.title,
        source: req.description?.trim() ? req.description : 'Local requirement',
        status: req.status,
        caseCount,
        updated: formatRelativeTime(req.createdAt),
      }
    })
    const source = live.length > 0 ? live : STATIC_REQUIREMENTS
    return source.sort((a, b) => a.id.localeCompare(b.id))
  }, [activeRequirements, activeCases])

  const filtered = useMemo(() => {
    if (filter === 'all') return rows
    return rows.filter((r) => r.status === filter)
  }, [rows, filter])

  const selected = filtered.find((r) => r.id === selectedId) ?? filtered[0] ?? null
  const linkedCount = rows.filter((r) => r.caseCount > 0).length
  const dataSource = activeRequirements.length > 0 ? 'live' : 'static'

  return (
    <div className="view">
      <FreshTopbar breadcrumbs={[{ label: 'Requirements' }]} showSearch={false} />

      <div className="screen-wrap requirements-lay">
        <div className="page-head">
          <div>
            <h1>Requirements</h1>
            <div className="sub">
              Demo · {rows.length} requirements · {linkedCount} with linked cases
              {dataSource === 'static' ? ' · static demo list' : ''}
            </div>
          </div>
        </div>

        <div className="requirements-body">
          <div className="panel requirements-list">
            <div className="requirements-toolbar">
              <h3 className="panel-h3-inline">All Requirements</h3>
              <span className="requirements-shown">{filtered.length} shown</span>
              <div className="requirements-chips">
                {FILTER_CHIPS.map((chip) => (
                  <button
                    key={chip.id}
                    type="button"
                    className={`chip${filter === chip.id ? ' on' : ''}`}
                    onClick={() => setFilter(chip.id)}
                  >
                    {chip.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="requirements-table-wrap">
              <table className="tbl requirements-tbl">
                <thead>
                  <tr>
                    <th style={{ width: 90 }}>ID</th>
                    <th>Requirement</th>
                    <th style={{ width: 100 }}>Coverage</th>
                    <th style={{ width: 56, textAlign: 'right' }}>Cases</th>
                    <th style={{ width: 80 }}>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => (
                    <tr
                      key={row.id}
                      className={selected?.id === row.id ? 'sel' : undefined}
                      onClick={() => setSelectedId(row.id)}
                    >
                      <td className="mono-muted">{row.id}</td>
                      <td>
                        <div className="title-cell">{row.title}</div>
                        <div className="requirements-source">{row.source}</div>
                      </td>
                      <td>
                        <span className={coverageClass(row.status, row.caseCount)}>
                          <span className="pill-dot" />
                          {coverageLabel(row.status, row.caseCount)}
                        </span>
                      </td>
                      <td style={{ textAlign: 'right', fontFamily: 'var(--mono)', color: 'var(--text3)' }}>
                        {row.caseCount}
                      </td>
                      <td style={{ color: 'var(--text3)', whiteSpace: 'nowrap' }}>{row.updated}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {selected ? (
            <div className="panel requirements-detail">
              <div className="requirements-detail-hd">
                <span className="mono-muted">{selected.id}</span>
              </div>
              <h3 className="requirements-detail-title">{selected.title}</h3>
              <p className="requirements-detail-desc">{selected.source}</p>
              <div className="requirements-detail-meta">
                <div>
                  <div className="requirements-meta-lbl">Status</div>
                  <span className={STATUS_CLASS[selected.status]}>
                    <span className="pill-dot" />
                    {selected.status}
                  </span>
                </div>
                <div>
                  <div className="requirements-meta-lbl">Linked Cases</div>
                  <div className="requirements-meta-val">{selected.caseCount}</div>
                </div>
                <div>
                  <div className="requirements-meta-lbl">Updated</div>
                  <div className="requirements-meta-val">{selected.updated}</div>
                </div>
              </div>
              <p className="requirements-readonly-note">
                Read-only list view. Create and link requirements from Test Cases or view them during Test Runs execution.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
