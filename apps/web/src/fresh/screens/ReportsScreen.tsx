'use client'

import { useState } from 'react'
import { FreshTopbar } from '../components/FreshTopbar'
import { PrototypeBanner } from '../components/PrototypeBanner'

type ReportTab = 'run' | 'req' | 'failure' | 'flaky' | 'workload'

const REPORT_CHIPS: { id: ReportTab; label: string }[] = [
  { id: 'run', label: 'Run Summary' },
  { id: 'req', label: 'Requirements Coverage' },
  { id: 'failure', label: 'Failure Trends' },
  { id: 'flaky', label: 'Flaky Cases' },
  { id: 'workload', label: 'Tester Workload' },
]

const RUN_CHIPS = ['R-31', 'R-29', 'R-28', 'R-27', 'R-26']

function RunSummaryPanel() {
  return (
    <>
      <div className="reports-run-chips">
        <span className="reports-run-lbl">Run:</span>
        {RUN_CHIPS.map((id, i) => (
          <span key={id} className={`chip${i === 0 ? ' on' : ''}`}>
            {id}
          </span>
        ))}
      </div>

      <div className="kpi-strip reports-kpi">
        <div className="kpi-tile kpi-tile-wide">
          <div className="kpi-lbl">CTMS Regression — Sprint 44</div>
          <div className="kpi-val">54% executed</div>
          <div className="reports-kpi-meta">132 cases · UAT · due 12 May</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-lbl">Passed</div>
          <div className="kpi-val kpi-pass">71</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-lbl">Failed</div>
          <div className="kpi-val kpi-fail">24</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-lbl">Blocked</div>
          <div className="kpi-val kpi-warn">7</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-lbl">Not Run</div>
          <div className="kpi-val">30</div>
        </div>
      </div>

      <div className="reports-grid">
        <div className="panel">
          <h3 className="panel-h3">Results Distribution</h3>
          <div className="reports-donut-wrap">
            <div className="reports-donut">
              <svg width="120" height="120" viewBox="0 0 140 140" aria-hidden>
                <circle cx="70" cy="70" r="54" fill="none" stroke="var(--border)" strokeWidth="16" />
                <circle cx="70" cy="70" r="54" fill="none" stroke="var(--pass)" strokeWidth="16" strokeDasharray="170 339" strokeDashoffset="0" transform="rotate(-90 70 70)" />
                <circle cx="70" cy="70" r="54" fill="none" stroke="var(--fail)" strokeWidth="16" strokeDasharray="58 339" strokeDashoffset="-170" transform="rotate(-90 70 70)" />
                <circle cx="70" cy="70" r="54" fill="none" stroke="var(--block)" strokeWidth="16" strokeDasharray="17 339" strokeDashoffset="-228" transform="rotate(-90 70 70)" />
                <text x="70" y="68" textAnchor="middle" className="reports-donut-pct">54%</text>
                <text x="70" y="86" textAnchor="middle" className="reports-donut-sub">executed</text>
              </svg>
            </div>
            <div className="reports-legend">
              <div><span className="reports-dot" style={{ background: 'var(--pass)' }} />Passed<b>71</b></div>
              <div><span className="reports-dot" style={{ background: 'var(--fail)' }} />Failed<b>24</b></div>
              <div><span className="reports-dot" style={{ background: 'var(--block)' }} />Blocked<b>7</b></div>
              <div><span className="reports-dot" style={{ background: 'var(--border2)' }} />Not Run<b>30</b></div>
            </div>
          </div>
        </div>

        <div className="panel">
          <h3 className="panel-h3">Results by Priority</h3>
          <div className="panel-body-pad">
            {[
              { label: 'Critical', pass: 8, fail: 4, total: 14 },
              { label: 'High', pass: 22, fail: 9, total: 38 },
              { label: 'Medium', pass: 31, fail: 8, total: 52 },
              { label: 'Low', pass: 10, fail: 3, total: 28 },
            ].map((row) => (
              <div key={row.label} className="reports-pri-row">
                <span className="reports-pri-lbl">{row.label}</span>
                <div className="reports-pri-bar">
                  <span style={{ width: `${(row.pass / row.total) * 100}%`, background: 'var(--pass)' }} />
                  <span style={{ width: `${(row.fail / row.total) * 100}%`, background: 'var(--fail)' }} />
                </div>
                <span className="reports-pri-frac">{row.pass}/{row.total}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="panel">
          <h3 className="panel-h3">Top Failures</h3>
          <div className="panel-body-pad">
            {[
              { caseId: 'TC-1006', title: 'Audit trail entry on permission change', run: 'R-31' },
              { caseId: 'TC-1008', title: 'Export includes skipped rows', run: 'R-27' },
              { caseId: 'TC-103', title: 'SSO redirect preserves return URL', run: 'R-29' },
            ].map((item) => (
              <div key={item.caseId} className="screen-row reports-fail-row">
                <span className="mono-muted">{item.caseId}</span>
                <span className="reports-fail-title">{item.title}</span>
                <span className="chip">{item.run}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </>
  )
}

function PlaceholderReportPanel({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="panel reports-placeholder">
      <h3 className="panel-h3">{title}</h3>
      <p className="reports-placeholder-desc">{desc}</p>
      <div className="reports-placeholder-cards">
        {[1, 2, 3].map((n) => (
          <div key={n} className="reports-stat-card">
            <div className="reports-stat-val">—</div>
            <div className="reports-stat-lbl">Demo metric {n}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ReportsScreen() {
  const [tab, setTab] = useState<ReportTab>('run')

  return (
    <div className="view">
      <FreshTopbar breadcrumbs={[{ label: 'Reports' }]} showSearch={false} />
      <PrototypeBanner />

      <div className="screen-wrap">
        <div className="page-head">
          <div>
            <h1>Reports &amp; Analytics</h1>
            <div className="sub">Demo · live views over cases, runs and requirements</div>
          </div>
          <div className="actions">
            <button type="button" className="btn btn-neutral" disabled title="Prototype only">
              <i className="ti ti-upload" aria-hidden />
              Export
            </button>
          </div>
        </div>

        <div className="reports-chips">
          {REPORT_CHIPS.map((chip) => (
            <button
              key={chip.id}
              type="button"
              className={`chip${tab === chip.id ? ' on' : ''}`}
              onClick={() => setTab(chip.id)}
            >
              {chip.label}
            </button>
          ))}
        </div>

        {tab === 'run' ? <RunSummaryPanel /> : null}
        {tab === 'req' ? (
          <PlaceholderReportPanel
            title="Requirements Coverage"
            desc="Coverage heatmap and traceability gaps across approved requirements — demo placeholder."
          />
        ) : null}
        {tab === 'failure' ? (
          <PlaceholderReportPanel
            title="Failure Trends"
            desc="Failure rate over time by module and priority — demo placeholder."
          />
        ) : null}
        {tab === 'flaky' ? (
          <PlaceholderReportPanel
            title="Flaky Cases"
            desc="Cases with inconsistent pass/fail history across recent runs — demo placeholder."
          />
        ) : null}
        {tab === 'workload' ? (
          <PlaceholderReportPanel
            title="Tester Workload"
            desc="Assigned vs executed cases per tester for active runs — demo placeholder."
          />
        ) : null}
      </div>
    </div>
  )
}
