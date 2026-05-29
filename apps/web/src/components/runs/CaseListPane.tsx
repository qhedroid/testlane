'use client'

import type { RunDetail, RunListItem } from '@/lib/relay/types'
import { CompactCountCards } from './CompactCountCards'
import {
  CASE_STATUS_FILTERS,
  filterCases,
  priorityClass,
  statusDotClass,
  type CaseStatusFilter,
} from './run-case-utils'

function progressSegments(
  counts: RunDetail['caseCounts'],
  total: number,
) {
  if (total === 0) return { pass: 0, fail: 0, blocked: 0, skip: 0 }
  return {
    pass: (counts.passed / total) * 100,
    fail: (counts.failed / total) * 100,
    blocked: (counts.blocked / total) * 100,
    skip: (counts.skipped / total) * 100,
  }
}

function runStatusPill(status: RunListItem['status']): string {
  if (status === 'active') return 'pill p-active'
  if (status === 'sealed' || status === 'archived') return 'pill p-sealed'
  return 'pill p-not_run'
}

interface CaseListPaneProps {
  detail: RunDetail
  statusFilter: CaseStatusFilter
  searchQuery: string
  selectedCaseId: string | null
  onStatusFilterChange: (filter: CaseStatusFilter) => void
  onSearchQueryChange: (query: string) => void
  onSelectCase: (testRunCaseId: string) => void
}

export function CaseListPane({
  detail,
  statusFilter,
  searchQuery,
  selectedCaseId,
  onStatusFilterChange,
  onSearchQueryChange,
  onSelectCase,
}: CaseListPaneProps) {
  const filtered = filterCases(
    detail.testRunCases,
    statusFilter,
    searchQuery,
  )
  const seg = progressSegments(detail.caseCounts, detail.caseCounts.total)
  const done =
    detail.caseCounts.passed +
    detail.caseCounts.failed +
    detail.caseCounts.blocked +
    detail.caseCounts.skipped
  const pct = detail.caseCounts.total
    ? Math.round((done / detail.caseCounts.total) * 100)
    : 0

  return (
    <div className="ec-pane">
      <div className="ec-run-hd">
        <div className="ec-rttl">{detail.title}</div>
        <div className="ec-rmt">
          <span className={runStatusPill(detail.status)}>
            <span className="pill-dot" />
            {detail.status}
          </span>
          {detail.isStalled ? <span>Stalled</span> : null}
          <span>Env: {detail.environment ?? '—'}</span>
        </div>
        <div className="tmono ec-rref">{detail.runRef}</div>
        <div className="ec-rpg">
          <span className="ec-rpt">
            {done} / {detail.caseCounts.total}
          </span>
          <div className="prog">
            {seg.pass > 0 ? (
              <div className="pg-p" style={{ width: `${seg.pass}%` }} />
            ) : null}
            {seg.fail > 0 ? (
              <div className="pg-f" style={{ width: `${seg.fail}%` }} />
            ) : null}
            {seg.blocked > 0 ? (
              <div className="pg-b" style={{ width: `${seg.blocked}%` }} />
            ) : null}
            {seg.skip > 0 ? (
              <div className="pg-s" style={{ width: `${seg.skip}%` }} />
            ) : null}
          </div>
          <span className="ec-rpt">{pct}%</span>
        </div>
        <div className="ec-rst">
          <span className="rst-p">✓ {detail.caseCounts.passed}</span>
          <span className="rst-f">✗ {detail.caseCounts.failed}</span>
          <span className="rst-b">⊘ {detail.caseCounts.blocked}</span>
          <span className="rst-s">⊘ {detail.caseCounts.skipped}</span>
          <span className="rst-n">○ {detail.caseCounts.notRun}</span>
        </div>
        <CompactCountCards counts={detail.caseCounts} />
      </div>

      {detail.status !== 'active' ? (
        <div className="ec-banner info">Run is {detail.status} — updates may be rejected.</div>
      ) : null}

      <div className="ec-search-bar">
        <input
          className="ec-search-input"
          type="search"
          placeholder="Search ref, title, assignee, suite…"
          value={searchQuery}
          onChange={(e) => onSearchQueryChange(e.target.value)}
        />
      </div>

      <div className="ec-ftab-bar">
        {CASE_STATUS_FILTERS.map((tab) => (
          <button
            key={tab.value}
            type="button"
            className={`ftab${statusFilter === tab.value ? ' on' : ''}`}
            onClick={() => onStatusFilterChange(tab.value)}
          >
            {tab.label}
          </button>
        ))}
        <span className="ec-ftab-count">{filtered.length}</span>
      </div>

      <div className="ec-list">
        {filtered.length === 0 ? (
          <p className="ec-empty">No cases match filter.</p>
        ) : (
          filtered.map((c) => (
            <button
              key={c.testRunCaseId}
              type="button"
              className={`ec-case${selectedCaseId === c.testRunCaseId ? ' on' : ''}`}
              onClick={() => onSelectCase(c.testRunCaseId)}
            >
              <span className={`ec-dot ${statusDotClass(c.status)}`} />
              <span className="ec-info">
                <span className="ec-cid">{c.caseRef}</span>
                <span className="ec-cnm">{c.title}</span>
                <span className="ec-cby">
                  {c.assignedToName ?? 'Unassigned'}
                  {c.module ? ` · ${c.module}` : ''}
                </span>
              </span>
              <span className={priorityClass(c.priority)}>{c.priority}</span>
            </button>
          ))
        )}
      </div>
    </div>
  )
}
