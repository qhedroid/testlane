'use client'

import { useEffect, useMemo, useState } from 'react'
import { FreshTopbar } from '../components/FreshTopbar'
import { useFresh } from '../data/FreshProvider'
import { computeDashboardKpis } from '../data/project-selectors'
import { fetchRealDashboardSummary, type RealDashboardSummary } from '@/lib/relay/dashboard-client'

type ReportTab = 'run' | 'req' | 'failure' | 'flaky' | 'workload'

const REPORT_CHIPS: { id: ReportTab; label: string; roadmap?: boolean }[] = [
  { id: 'run', label: 'Run Summary' },
  { id: 'req', label: 'Requirements Coverage' },
  { id: 'failure', label: 'Failure Trends', roadmap: true },
  { id: 'flaky', label: 'Flaky Cases', roadmap: true },
  { id: 'workload', label: 'Tester Workload', roadmap: true },
]

function RunSummaryPanel({
  summary,
  projectName,
  loading,
}: {
  summary: RealDashboardSummary | null
  projectName: string
  loading: boolean
}) {
  const b = summary?.resultBreakdown
  const total = b ? b.pass + b.fail + b.blocked + b.skip + b.notRun : 0
  const executed = b ? total - b.notRun : 0
  const executedPct = total > 0 ? Math.round((executed / total) * 100) : 0
  const circ = 2 * Math.PI * 54
  const passLen = total > 0 && b ? (b.pass / total) * circ : 0
  const failLen = total > 0 && b ? (b.fail / total) * circ : 0
  const blockLen = total > 0 && b ? (b.blocked / total) * circ : 0

  return (
    <>
      <div className="kpi-strip reports-kpi">
        <div className="kpi-tile kpi-tile-wide">
          <div className="kpi-lbl">{projectName}</div>
          <div className="kpi-val">
            {loading && !summary ? 'Loading…' : `${executedPct}% executed`}
          </div>
          <div className="reports-kpi-meta">
            {summary
              ? `${summary.totalCaseCount} cases · ${summary.activeRunCount} open runs · pass rate ${summary.passRatePct}%`
              : 'Project-wide summary from the dashboard API'}
          </div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-lbl">Passed</div>
          <div className="kpi-val kpi-pass">{b?.pass ?? '—'}</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-lbl">Failed</div>
          <div className="kpi-val kpi-fail">{b?.fail ?? '—'}</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-lbl">Blocked</div>
          <div className="kpi-val kpi-warn">{b?.blocked ?? '—'}</div>
        </div>
        <div className="kpi-tile">
          <div className="kpi-lbl">Not Run</div>
          <div className="kpi-val">{b?.notRun ?? '—'}</div>
        </div>
      </div>

      <div className="reports-grid">
        <div className="panel">
          <h3 className="panel-h3">Results Distribution</h3>
          <div className="reports-donut-wrap">
            <div className="reports-donut">
              <svg width="120" height="120" viewBox="0 0 140 140" aria-hidden>
                <circle cx="70" cy="70" r="54" fill="none" stroke="var(--border)" strokeWidth="16" />
                <circle
                  cx="70"
                  cy="70"
                  r="54"
                  fill="none"
                  stroke="var(--pass)"
                  strokeWidth="16"
                  strokeDasharray={`${passLen} ${circ}`}
                  strokeDashoffset="0"
                  transform="rotate(-90 70 70)"
                />
                <circle
                  cx="70"
                  cy="70"
                  r="54"
                  fill="none"
                  stroke="var(--fail)"
                  strokeWidth="16"
                  strokeDasharray={`${failLen} ${circ}`}
                  strokeDashoffset={-passLen}
                  transform="rotate(-90 70 70)"
                />
                <circle
                  cx="70"
                  cy="70"
                  r="54"
                  fill="none"
                  stroke="var(--block)"
                  strokeWidth="16"
                  strokeDasharray={`${blockLen} ${circ}`}
                  strokeDashoffset={-(passLen + failLen)}
                  transform="rotate(-90 70 70)"
                />
                <text x="70" y="68" textAnchor="middle" className="reports-donut-pct">
                  {executedPct}%
                </text>
                <text x="70" y="86" textAnchor="middle" className="reports-donut-sub">
                  executed
                </text>
              </svg>
            </div>
            <div className="reports-legend">
              <div>
                <span className="reports-dot" style={{ background: 'var(--pass)' }} />
                Passed<b>{b?.pass ?? '—'}</b>
              </div>
              <div>
                <span className="reports-dot" style={{ background: 'var(--fail)' }} />
                Failed<b>{b?.fail ?? '—'}</b>
              </div>
              <div>
                <span className="reports-dot" style={{ background: 'var(--block)' }} />
                Blocked<b>{b?.blocked ?? '—'}</b>
              </div>
              <div>
                <span className="reports-dot" style={{ background: 'var(--border2)' }} />
                Not Run<b>{b?.notRun ?? '—'}</b>
              </div>
            </div>
          </div>
        </div>

        <div className="panel">
          <h3 className="panel-h3">Open failures</h3>
          <div className="panel-body-pad">
            <div className="kpi-tile" style={{ border: 'none', padding: 0 }}>
              <div className="kpi-lbl">Open failure count</div>
              <div className="kpi-val kpi-fail">{summary?.openFailureCount ?? '—'}</div>
            </div>
            <div className="kpi-tile" style={{ border: 'none', padding: '12px 0 0', marginTop: 8 }}>
              <div className="kpi-lbl">Unlinked failures</div>
              <div className="kpi-val">{summary?.unlinkedFailureCount ?? '—'}</div>
            </div>
            <p className="reports-placeholder-desc" style={{ marginTop: 12 }}>
              Live counts from <code>GET /api/projects/:id/dashboard</code>. Per-case failure lists stay on the Dashboard Needs Attention panel.
            </p>
          </div>
        </div>

        <div className="panel">
          <h3 className="panel-h3">Coverage</h3>
          <div className="panel-body-pad">
            <div className="kpi-lbl">Run coverage</div>
            <div className="kpi-val">{summary ? `${summary.runCoveragePct}%` : '—'}</div>
            <p className="reports-placeholder-desc" style={{ marginTop: 12 }}>
              Share of cases that have been exercised in at least one run for this project.
            </p>
          </div>
        </div>
      </div>
    </>
  )
}

function RequirementsCoveragePanel() {
  const { activeCases, activeRequirements } = useFresh()
  const rows = useMemo(() => {
    return activeRequirements
      .map((req) => {
        const linked = activeCases.filter((c) => (c.requirementIds ?? []).includes(req.id))
        const coveragePct = linked.length > 0 ? 100 : 0
        return {
          id: req.id,
          key: req.requirementKey,
          title: req.title,
          linkedCaseCount: linked.length,
          coveragePct,
        }
      })
      .sort((a, b) => a.linkedCaseCount - b.linkedCaseCount)
  }, [activeCases, activeRequirements])

  const covered = rows.filter((r) => r.linkedCaseCount > 0).length

  return (
    <div className="panel">
      <h3 className="panel-h3">Requirements Coverage</h3>
      <p className="reports-placeholder-desc" style={{ padding: '0 16px' }}>
        Derived client-side from live requirements and case links — {covered}/{rows.length} requirements have at least one linked case.
      </p>
      <div className="panel-body-pad">
        {rows.length === 0 ? (
          <p className="page-empty-desc">No requirements to report coverage against.</p>
        ) : (
          rows.slice(0, 12).map((row) => (
            <div key={row.id} className="reports-pri-row">
              <span className="reports-pri-lbl" title={row.title}>
                {row.key}
              </span>
              <div className="reports-pri-bar">
                <span
                  style={{
                    width: `${row.coveragePct}%`,
                    background: row.coveragePct === 0 ? 'var(--fail)' : 'var(--pass)',
                  }}
                />
              </div>
              <span className="reports-pri-frac">
                {row.linkedCaseCount} cases · {row.coveragePct === 100 ? 'linked' : 'uncovered'}
              </span>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

function RoadmapReportPanel({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="panel reports-placeholder">
      <h3 className="panel-h3">
        {title}
        <span className="roadmap-badge">Roadmap</span>
      </h3>
      <p className="reports-placeholder-desc">{desc}</p>
      <div className="reports-placeholder-cards">
        {[1, 2, 3].map((n) => (
          <div key={n} className="reports-stat-card">
            <div className="reports-stat-val">—</div>
            <div className="reports-stat-lbl">Roadmap metric {n}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function ReportsScreen() {
  const { activeProject, activeRuns } = useFresh()
  const [tab, setTab] = useState<ReportTab>('run')
  const [summary, setSummary] = useState<RealDashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    setSummary(null)
    fetchRealDashboardSummary(activeProject.id)
      .then((data) => {
        if (!cancelled) setSummary(data)
      })
      .catch((err) => {
        console.warn('[testlane] Reports summary fetch failed — falling back to client KPIs:', err)
        if (!cancelled) {
          const local = computeDashboardKpis(activeRuns)
          setSummary({
            activeRunCount: local.openRunCount,
            passRatePct:
              local.totalExecuted > 0
                ? Math.round((local.passed / local.totalExecuted) * 100)
                : 0,
            openFailureCount: local.failed,
            unlinkedFailureCount: 0,
            runCoveragePct: local.executedPct,
            totalCaseCount: local.totalCases,
            resultBreakdown: {
              pass: local.passed,
              fail: local.failed,
              blocked: local.blocked,
              skip: local.skipped,
              notRun: local.notRun,
            },
          })
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [activeProject.id, activeRuns])

  return (
    <div className="view">
      <FreshTopbar breadcrumbs={[{ label: 'Reports' }]} showSearch={false} />

      <div className="screen-wrap">
        <div className="page-head">
          <div>
            <h1>Reports &amp; Analytics</h1>
            <div className="sub">
              Run Summary uses the live dashboard API · other tabs are roadmap unless noted
            </div>
          </div>
          <div className="actions">
            <button type="button" className="btn btn-neutral" disabled title="Not implemented">
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
              {chip.roadmap ? ' · Roadmap' : ''}
            </button>
          ))}
        </div>

        {tab === 'run' ? (
          <RunSummaryPanel summary={summary} projectName={activeProject.name} loading={loading} />
        ) : null}
        {tab === 'req' ? <RequirementsCoveragePanel /> : null}
        {tab === 'failure' ? (
          <RoadmapReportPanel
            title="Failure Trends"
            desc="Failure rate over time by module and priority is not implemented yet — marked Roadmap rather than shown as live data."
          />
        ) : null}
        {tab === 'flaky' ? (
          <RoadmapReportPanel
            title="Flaky Cases"
            desc="Inconsistent pass/fail history across runs needs dedicated trend storage — Roadmap."
          />
        ) : null}
        {tab === 'workload' ? (
          <RoadmapReportPanel
            title="Tester Workload"
            desc="Assigned vs executed cases per tester as a dedicated report is Roadmap; see My Work for a personal queue derived from live assignees."
          />
        ) : null}
      </div>
    </div>
  )
}
