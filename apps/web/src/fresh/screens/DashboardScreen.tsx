'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { RunDonut } from '../components/RunDonut'
import { FreshTopbar } from '../components/FreshTopbar'
import { useProjectHref } from '../hooks/useProjectHref'
import { useFresh } from '../data/FreshProvider'
import type { CasePriority } from '../data/demo-model'
import { formatRelativeTime, PRIORITY_TO_LEGACY } from '../data/demo-model'
import { fetchRealDashboardSummary, type RealDashboardSummary } from '@/lib/relay/dashboard-client'
import {
  collectDashboardUnlinkedFailures,
  computeDashboardAssigneeBars,
  computeDashboardCoverageRows,
  computeDashboardKpis,
  computeDashboardOpenRuns,
  computeDashboardPassTrend,
  computeDashboardTimeSeries,
  dashboardCoverageColor,
  type DashboardWindow,
} from '../data/project-selectors'
import { displayAssigneeName } from '../data/team-users'
import { testRunPath } from '../lib/project-routes'
import { PRI_MAP } from '../data/ui-utils'

const ATTENTION_CAP = 3

const PRIORITY_STRIPE: Record<CasePriority, string> = {
  Critical: 'crit',
  High: 'high',
  Medium: 'med',
  Low: 'low',
}

const AVATAR_COLORS = ['#1976D2', '#00796B', '#5E35B1', '#C62828', '#EF6C00', '#455A64']

const DASHBOARD_MILESTONES = [
  { name: 'UAT Sign-Off', meta: '2 linked runs · due 18 Jul', badge: 'In progress', badgeClass: 'pill p-act' },
  { name: 'Reporting Integration', meta: '1 linked run · due 12 Jul', badge: 'At risk', badgeClass: 'pill p-block' },
  { name: 'eTMF Workflow Beta', meta: '1 linked run · due 25 Jul', badge: 'On track', badgeClass: 'pill p-pass' },
]

function avatarColor(name: string): string {
  let h = 0
  for (let i = 0; i < name.length; i += 1) h = (h * 31 + name.charCodeAt(i)) | 0
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

function avatarInitials(name: string): string {
  return displayAssigneeName(name)
    .split(' ')
    .map((x) => x[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()
}

function formatRunId(runKey: string): string {
  const n = parseInt(runKey, 10)
  return Number.isNaN(n) ? runKey : String(n)
}

function sparklinePoints(values: number[], width: number, height: number): string {
  if (values.length === 0) return ''
  const max = Math.max(...values, 1)
  const min = Math.min(...values, 0)
  const range = Math.max(max - min, 1)
  const step = values.length > 1 ? width / (values.length - 1) : 0
  return values
    .map((v, i) => {
      const x = i * step
      const y = height - 6 - ((v - min) / range) * (height - 12)
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')
}

function areaPoints(linePoints: string, width: number, height: number): string {
  const first = linePoints.split(' ')[0] ?? `0,${height}`
  const last = linePoints.split(' ').slice(-1)[0] ?? `${width},${height}`
  return `0,${height} ${first} ${linePoints} ${last} ${width},${height}`
}

export function DashboardScreen() {
  const { activeProject, activeCases } = useFresh()

  if (activeCases.length === 0) {
    return <DashboardEmptyCases projectName={activeProject?.name ?? 'Project'} />
  }

  return <DashboardView />
}

function DashboardEmptyCases({ projectName }: { projectName: string }) {
  const projectHref = useProjectHref()

  return (
    <div className="view">
      <FreshTopbar
        breadcrumbs={[{ label: 'Dashboard' }]}
        subtitle={projectName}
        searchPlaceholder="Search everything…"
        actions={
          <Link href={projectHref('cases')} className="btn btn-p">
            <i className="ti ti-plus" style={{ fontSize: 12 }} /> Add test cases
          </Link>
        }
      />
      <div className="dash-wrap">
        <div className="panel dash-empty-panel">
          <i className="ti ti-layout-dashboard dash-empty-icon" />
          <div className="dash-empty-title">Add your first test cases</div>
          <div className="dash-empty-desc">
            Metrics and run insights for {projectName} will appear here once you add test cases and start runs.
          </div>
          <Link href={projectHref('cases')} className="btn btn-p" style={{ marginTop: 8 }}>
            Go to Test Cases
          </Link>
        </div>
      </div>
    </div>
  )
}

function DashboardView() {
  const projectHref = useProjectHref()
  const { activeProject, activeRuns, activeCases, activeFolders } = useFresh()
  const [timeWindow, setTimeWindow] = useState<DashboardWindow>(30)

  // Server-computed summary (data-layer refactor): the KPI strip and donut
  // prefer SQL-aggregated numbers from GET /api/projects/:id/dashboard,
  // falling back to the client-side computation until the fetch resolves.
  // The richer widgets below still derive from synced reducer state.
  const [serverSummary, setServerSummary] = useState<RealDashboardSummary | null>(null)
  useEffect(() => {
    let cancelled = false
    setServerSummary(null)
    fetchRealDashboardSummary(activeProject.id)
      .then((summary) => {
        if (!cancelled) setServerSummary(summary)
      })
      .catch((err) => {
        console.warn('[relay] Dashboard summary fetch failed — using client-side numbers:', err)
      })
    return () => {
      cancelled = true
    }
  }, [activeProject.id])

  const kpis = useMemo(() => {
    const local = computeDashboardKpis(activeRuns)
    if (!serverSummary) return local
    const b = serverSummary.resultBreakdown
    const total = b.pass + b.fail + b.blocked + b.skip + b.notRun
    const executed = total - b.notRun
    return {
      ...local,
      executedPct: total > 0 ? Math.round((executed / total) * 100) : 0,
      totalExecuted: executed,
      totalCases: total,
      passed: b.pass,
      failed: b.fail,
      blocked: b.blocked,
      skipped: b.skip,
      notRun: b.notRun,
      openRunCount: serverSummary.activeRunCount,
    }
  }, [activeRuns, serverSummary])
  const openRuns = useMemo(
    () => computeDashboardOpenRuns(activeRuns, activeCases),
    [activeRuns, activeCases],
  )
  const assigneeBars = useMemo(
    () => computeDashboardAssigneeBars(activeRuns, activeCases),
    [activeRuns, activeCases],
  )
  const unlinkedFailures = useMemo(
    () => collectDashboardUnlinkedFailures(activeRuns, activeCases),
    [activeRuns, activeCases],
  )
  const coverageRows = useMemo(
    () => computeDashboardCoverageRows(activeCases, activeFolders, activeRuns),
    [activeCases, activeFolders, activeRuns],
  )
  const timeSeries = useMemo(
    () => computeDashboardTimeSeries(activeRuns, timeWindow),
    [activeRuns, timeWindow],
  )
  const passTrend = useMemo(() => computeDashboardPassTrend(activeRuns), [activeRuns])

  const lowCoverage = coverageRows.slice(0, 3)
  const visibleAttention = unlinkedFailures.slice(0, ATTENTION_CAP)

  const chartMax = Math.max(...timeSeries.map((p) => Math.max(p.passed, p.failed)), 1)
  const chartW = 640
  const chartH = 170
  const chartPadL = 36

  const passedLine = timeSeries
    .map((p, i) => {
      const x = chartPadL + (i / Math.max(timeSeries.length - 1, 1)) * (chartW - chartPadL)
      const y = 145 - (p.passed / chartMax) * 120
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const failedLine = timeSeries
    .map((p, i) => {
      const x = chartPadL + (i / Math.max(timeSeries.length - 1, 1)) * (chartW - chartPadL)
      const y = 145 - (p.failed / chartMax) * 120
      return `${x.toFixed(1)},${y.toFixed(1)}`
    })
    .join(' ')

  const sparkW = 200
  const sparkH = 44
  const sparkLine = sparklinePoints(passTrend.values, sparkW, sparkH)

  return (
    <div className="view">
      <FreshTopbar
        breadcrumbs={[{ label: 'Dashboard' }]}
        subtitle={activeProject?.name ?? 'Project'}
        searchPlaceholder="Search everything…"
        actions={
          <>
            <button type="button" className="btn btn-neutral">
              <i className="ti ti-download" style={{ fontSize: 12 }} /> Export
            </button>
            <Link href={projectHref('testruns')} className="btn btn-p">
              <i className="ti ti-plus" style={{ fontSize: 12 }} /> New Run
            </Link>
          </>
        }
      />
      <div className="dash-wrap">
        <div className="kpi-strip dash-kpi-strip">
          <div className="kpi-tile">
            <div className="kpi-lbl">Executed</div>
            <div className="kpi-val dash-kpi-val">{kpis.executedPct}%</div>
            <div className="dash-kpi-meta">
              {kpis.totalExecuted} of {kpis.totalCases} in open runs
            </div>
          </div>
          <div className="kpi-tile">
            <div className="kpi-lbl">Passed</div>
            <div className="kpi-val dash-kpi-val kpi-pass">{kpis.passed}</div>
            <div className={`dash-kpi-delta${kpis.passedThisWeek != null && kpis.passedThisWeek > 0 ? ' dash-kpi-delta-up' : ''}`}>
              {kpis.passedThisWeek != null ? `+${kpis.passedThisWeek} this week` : 'As of today'}
            </div>
          </div>
          <div className="kpi-tile">
            <div className="kpi-lbl">Failed</div>
            <div className="kpi-val dash-kpi-val kpi-fail">{kpis.failed}</div>
            <div className={`dash-kpi-delta${kpis.failedThisWeek != null && kpis.failedThisWeek > 0 ? ' dash-kpi-delta-dn' : ''}`}>
              {kpis.failedThisWeek != null ? `+${kpis.failedThisWeek} this week` : 'As of today'}
            </div>
          </div>
          <div className="kpi-tile">
            <div className="kpi-lbl">Blocked</div>
            <div className="kpi-val dash-kpi-val kpi-warn">{kpis.blocked}</div>
            <div className="dash-kpi-meta">
              {kpis.blockedWithDefects} waiting on defects
            </div>
          </div>
          <div className="kpi-tile">
            <div className="kpi-lbl">Open runs</div>
            <div className="kpi-val dash-kpi-val">{kpis.openRunCount}</div>
            <div className="dash-kpi-meta">
              {kpis.runsDueThisWeek > 0
                ? `${kpis.runsDueThisWeek} close this week`
                : 'No runs due this week'}
            </div>
          </div>
          <div className="kpi-tile kpi-tile-wide">
            <div className="kpi-lbl">Pass trend · 30 days</div>
            <svg viewBox={`0 0 ${sparkW} ${sparkH}`} preserveAspectRatio="none" className="dash-sparkline" aria-hidden>
              {sparkLine ? (
                <>
                  <polyline points={sparkLine} fill="none" stroke="var(--pass)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                  <polyline points={areaPoints(sparkLine, sparkW, sparkH)} fill="var(--pass)" fillOpacity="0.08" stroke="none" />
                </>
              ) : null}
            </svg>
            {passTrend.isFlatFallback && !kpis.hasExecutionHistory ? (
              <div className="dash-kpi-meta">Current pass rate (no history yet)</div>
            ) : null}
          </div>
        </div>

        <div className="dash-charts-grid">
          <div className="panel">
            <h3 className="panel-h3">Completion</h3>
            <div className="dash-completion-wrap">
              <RunDonut
                pass={kpis.passed}
                fail={kpis.failed}
                blocked={kpis.blocked}
                notrun={kpis.notRun}
                skipped={kpis.skipped}
                size={128}
                interactive
              />
              <div className="dash-legend">
                <div><span className="dash-dot" style={{ background: 'var(--pass)' }} />Passed<b>{kpis.passed}</b></div>
                <div><span className="dash-dot" style={{ background: 'var(--fail)' }} />Failed<b>{kpis.failed}</b></div>
                <div><span className="dash-dot" style={{ background: 'var(--block)' }} />Blocked<b>{kpis.blocked}</b></div>
                <div><span className="dash-dot" style={{ background: 'var(--border2)' }} />Not run<b>{kpis.notRun}</b></div>
              </div>
            </div>
            {lowCoverage.length > 0 ? (
              <div className="dash-coverage-note">
                <div style={{ fontWeight: 600, color: 'var(--text2)', marginBottom: 4 }}>Lowest coverage by folder</div>
                {lowCoverage.map((row) => (
                  <div key={row.label} className="dash-coverage-row">
                    <span className="dash-coverage-lbl">{row.label}</span>
                    <div className="dash-coverage-bar">
                      <div className="dash-coverage-fill" style={{ width: `${row.pct}%`, background: dashboardCoverageColor(row.pct) }} />
                    </div>
                    <span className="mono-muted">{row.pct}%</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="panel dash-chart-panel">
            <div className="dash-panel-hd">
              <h3 className="panel-h3-inline">Results over time</h3>
              <div className="chip-row">
                {([7, 30, 90] as DashboardWindow[]).map((d) => (
                  <button
                    key={d}
                    type="button"
                    className={`chip${timeWindow === d ? ' on' : ''}`}
                    onClick={() => setTimeWindow(d)}
                  >
                    {d}d
                  </button>
                ))}
              </div>
            </div>
            <svg viewBox={`0 0 ${chartW} ${chartH}`} preserveAspectRatio="none" className="dash-line-chart" aria-hidden>
              {[10, 55, 100, 145].map((y) => (
                <line key={y} x1={chartPadL} y1={y} x2={chartW} y2={y} stroke="var(--border)" strokeWidth="1" />
              ))}
              <text x={30} y={14} textAnchor="end" className="dash-chart-axis">{Math.round(chartMax)}</text>
              <text x={30} y={59} textAnchor="end" className="dash-chart-axis">{Math.round(chartMax * 0.67)}</text>
              <text x={30} y={104} textAnchor="end" className="dash-chart-axis">{Math.round(chartMax * 0.33)}</text>
              <text x={30} y={149} textAnchor="end" className="dash-chart-axis">0</text>
              {passedLine ? (
                <polyline points={passedLine} fill="none" stroke="var(--pass)" strokeWidth="2" strokeLinejoin="round" />
              ) : null}
              {failedLine ? (
                <polyline points={failedLine} fill="none" stroke="var(--fail)" strokeWidth="2" strokeLinejoin="round" />
              ) : null}
            </svg>
            <div className="dash-chart-legend">
              <span><span className="dash-legend-line dash-legend-pass" />Passed (cumulative)</span>
              <span><span className="dash-legend-line dash-legend-fail" />Failed (cumulative)</span>
              {!kpis.hasExecutionHistory ? (
                <span style={{ marginLeft: 'auto' }}>Snapshot — no dated execution history in seed data</span>
              ) : null}
            </div>
          </div>

          <div className="panel">
            <h3 className="panel-h3">Results by assignee</h3>
            <div className="dash-assignee-block">
              {assigneeBars.length === 0 ? (
                <div className="dash-empty-inline">No executed cases with assignees yet.</div>
              ) : (
                assigneeBars.map((bar) => (
                  <div key={bar.name}>
                    <div className="dash-assignee-hd">
                      <span className="dash-assignee-name">{displayAssigneeName(bar.name)}</span>
                      <span className="dash-assignee-total">{bar.total}</span>
                    </div>
                    <div className="dash-assignee-bar">
                      <span style={{ width: `${bar.total > 0 ? (bar.passed / bar.total) * 100 : 0}%`, background: 'var(--pass)' }} />
                      <span style={{ width: `${bar.total > 0 ? (bar.failed / bar.total) * 100 : 0}%`, background: 'var(--fail)' }} />
                      <span style={{ width: `${bar.total > 0 ? (bar.blocked / bar.total) * 100 : 0}%`, background: 'var(--block)' }} />
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="dash-lists-grid">
          <div className="panel">
            <div className="dash-list-hd">
              <h3>Open test runs</h3>
              <Link href={projectHref('testruns')} className="dash-list-link">
                See all {kpis.openRunCount} →
              </Link>
            </div>
            {openRuns.length === 0 ? (
              <div className="dash-empty-inline panel-body-pad">No active runs</div>
            ) : (
              openRuns.map((run) => (
                <Link
                  key={run.runId}
                  href={testRunPath(activeProject.key, run.runKey)}
                  className="screen-row dash-open-run"
                >
                  <span className="dash-run-id">{formatRunId(run.runKey)}</span>
                  <div className="dash-run-body">
                    <div className="dash-run-title">{run.name}</div>
                    <div className="dash-run-meta">{run.meta}</div>
                  </div>
                  <div
                    className="dash-avatar"
                    style={{ background: avatarColor(run.assignee) }}
                    title={displayAssigneeName(run.assignee)}
                  >
                    {avatarInitials(run.assignee)}
                  </div>
                  <div className="dash-run-bar">
                    <span style={{ width: `${run.total > 0 ? (run.pass / run.total) * 100 : 0}%`, background: 'var(--pass)' }} />
                    <span style={{ width: `${run.total > 0 ? (run.fail / run.total) * 100 : 0}%`, background: 'var(--fail)' }} />
                    <span style={{ width: `${run.total > 0 ? (run.blocked / run.total) * 100 : 0}%`, background: 'var(--block)' }} />
                  </div>
                  <span className="dash-run-frac">{run.executed}/{run.total}</span>
                </Link>
              ))
            )}
          </div>

          <div className="panel">
            <div className="dash-list-hd">
              <h3>Milestones</h3>
              <Link href={projectHref('milestones')} className="dash-list-link">
                All {DASHBOARD_MILESTONES.length} →
              </Link>
            </div>
            {DASHBOARD_MILESTONES.map((m) => (
              <div key={m.name} className="screen-row dash-milestone-row">
                <div className="dash-run-body">
                  <div className="dash-run-title">{m.name}</div>
                  <div className="dash-run-meta">{m.meta}</div>
                </div>
                <span className={m.badgeClass}>
                  <span className="pill-dot" />
                  {m.badge}
                </span>
              </div>
            ))}
          </div>

          <div className="panel">
            <div className="dash-list-hd">
              <h3>Needs attention</h3>
              {unlinkedFailures.length > 0 ? (
                <span className="dash-att-count">{unlinkedFailures.length} unlinked</span>
              ) : null}
              <Link href={projectHref('testruns')} className="dash-list-link">
                {unlinkedFailures.length > ATTENTION_CAP ? `View all ${unlinkedFailures.length} →` : 'Open runs →'}
              </Link>
            </div>
            {unlinkedFailures.length === 0 ? (
              <div className="dash-empty-inline panel-body-pad">No unlinked failures — nice work.</div>
            ) : (
              visibleAttention.map((item) => (
                <Link key={item.key} href={projectHref('testruns')} className="screen-row dash-att-row">
                  <div className={`att-item-stripe ${PRIORITY_STRIPE[item.priority]}`} />
                  <div className="dash-run-body">
                    <div className="dash-run-title">{item.title}</div>
                    <div className="dash-run-meta">
                      <span className={`pri ${PRI_MAP[PRIORITY_TO_LEGACY[item.priority]]}`}>{item.priority}</span>
                      {' · '}
                      {item.runName}
                      {item.testedBy ? ` · ${displayAssigneeName(item.testedBy)}` : ''}
                      {item.testedAt ? ` · ${formatRelativeTime(item.testedAt)}` : ''}
                    </div>
                  </div>
                  <span className="dash-att-tag">
                    <i className="ti ti-link-off" style={{ fontSize: 10 }} /> Link defect
                  </span>
                </Link>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
