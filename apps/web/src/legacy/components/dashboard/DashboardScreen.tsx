'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { RelayTopbar } from '@/components/shell/RelayTopbar'
import { useDemo } from '@/lib/demo/DemoProvider'
import { DEFECT_NAMES } from '@/lib/demo/seed'
import { priorityClass, runProgress, runTotal, statusPillClass } from '@/lib/demo/store'

type CardFilter = 'all' | 'critical' | 'stalled'
type CardTab = 'overview' | 'assignees' | 'defects'

const COVERAGE = [
  { label: 'CTMS', pct: 88, color: '#2E7D32' },
  { label: 'eTMF', pct: 75 },
  { label: 'User Management', pct: 62 },
  { label: 'Viewer', pct: 54, color: '#E65100' },
  { label: 'GlobalLearn', pct: 71 },
  { label: 'API Gateway', pct: 42, color: '#C62828' },
]

export function DashboardScreen() {
  const { state } = useDemo()
  const [cardFilter, setCardFilter] = useState<CardFilter>('all')
  const [expanded, setExpanded] = useState<Set<string>>(new Set(['R2']))
  const [cardTabs, setCardTabs] = useState<Record<string, CardTab>>({})

  const activeRuns = state.runs.filter((r) => r.status === 'active' || r.status === 'stalled')

  const filteredRuns = useMemo(() => {
    if (cardFilter === 'stalled') return activeRuns.filter((r) => r.stalled)
    if (cardFilter === 'critical') return activeRuns.filter((r) => r.fail > 10)
    return activeRuns
  }, [activeRuns, cardFilter])

  const metrics = useMemo(() => {
    const totalCases = state.runs.reduce((s, r) => s + runTotal(r), 0)
    const executed = state.runs.reduce((s, r) => s + r.pass + r.fail + r.blocked, 0)
    const passRate =
      executed > 0
        ? ((state.runs.reduce((s, r) => s + r.pass, 0) / executed) * 100).toFixed(1)
        : '0'
    return {
      activeRuns: activeRuns.length,
      passRate,
      openFailures: state.runs.reduce((s, r) => s + r.fail, 0),
      blocked: state.runs.reduce((s, r) => s + r.blocked, 0),
      coverage: totalCases > 0 ? Math.round((executed / totalCases) * 100) : 0,
      executed,
      totalCases,
    }
  }, [state.runs, activeRuns])

  function toggleCard(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="view-screen">
      <RelayTopbar
        breadcrumbs={[{ label: 'Dashboard' }]}
        subtitle="Sprint 44 · Release 2.4.1"
        actions={
          <>
            <button type="button" className="relay-btn">Export</button>
            <Link href="/runs" className="relay-btn relay-btn-primary">
              <i className="ti ti-plus" /> New Run
            </Link>
          </>
        }
      />
      <div className="dash-wrap">
        <div className="met-row">
          <div className="mc c-blue">
            <div className="mc-head">
              <div>
                <div className="mv accent">{metrics.activeRuns}</div>
                <div className="ml">Active Runs</div>
              </div>
              <div className="mc-ic"><i className="ti ti-player-play" /></div>
            </div>
            <div className="mt">3 critical path · 1 stalled</div>
          </div>
          <div className="mc c-green">
            <div className="mc-head">
              <div>
                <div className="mv pass">{metrics.passRate}%</div>
                <div className="ml">Pass Rate</div>
              </div>
              <div className="mc-ic"><i className="ti ti-trending-up" /></div>
            </div>
            <div className="mt mt-up">↑ 6.1 pp vs Sprint 43</div>
          </div>
          <div className="mc c-red">
            <div className="mc-head">
              <div>
                <div className="mv fail">{metrics.openFailures}</div>
                <div className="ml">Open Failures</div>
              </div>
              <div className="mc-ic"><i className="ti ti-alert-circle" /></div>
            </div>
            <div className="mt mt-dn">↑ 4 unlinked since yesterday</div>
          </div>
          <div className="mc c-amber">
            <div className="mc-head">
              <div>
                <div className="mv block">{metrics.blocked}</div>
                <div className="ml">Blocked Cases</div>
              </div>
              <div className="mc-ic"><i className="ti ti-ban" /></div>
            </div>
            <div className="mt">2 without defect · action needed</div>
          </div>
          <div className="mc c-grey">
            <div className="mc-head">
              <div>
                <div className="mv">{metrics.coverage}%</div>
                <div className="ml">Run Coverage</div>
              </div>
              <div className="mc-ic"><i className="ti ti-chart-donut" /></div>
            </div>
            <div className="mt mt-up">
              {metrics.executed} of {metrics.totalCases} cases executed
            </div>
          </div>
        </div>

        <div className="dash-body">
          <div className="runs-col">
            <div className="runs-col-hd">
              <i className="ti ti-player-play" style={{ fontSize: 13, color: 'var(--relay-accent)' }} />
              <span className="runs-col-ttl">Active runs</span>
              <span className="pnl-ct">{filteredRuns.length}</span>
              <div className="chip-row">
                {(['all', 'critical', 'stalled'] as CardFilter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`chip${cardFilter === f ? ' on' : ''}`}
                    onClick={() => setCardFilter(f)}
                  >
                    {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
                  </button>
                ))}
              </div>
              <Link href="/runs" className="relay-btn relay-btn-sm" style={{ marginLeft: 'auto' }}>
                All runs <i className="ti ti-arrow-right" style={{ fontSize: 11 }} />
              </Link>
            </div>
            <div className="run-cards-grid">
              {filteredRuns.map((run) => {
                const total = runTotal(run)
                const tab = cardTabs[run.id] ?? 'overview'
                const isExp = expanded.has(run.id)
                const pct = runProgress(run)
                return (
                  <div key={run.id} className={`run-card${run.stalled ? ' stalled' : ''}`}>
                    <button type="button" className="rct" onClick={() => toggleCard(run.id)}>
                      <div className="rct-donut">
                        <span className="donut-pct">{pct}%</span>
                        <span className="donut-lbl">done</span>
                      </div>
                      <div className="rct-info">
                        <div className="rct-name">{run.name}</div>
                        <div className="rct-ctx">
                          {run.planName} · {run.environment}
                        </div>
                        <div className="rct-counts">
                          <span className="rct-count pass">✓ {run.pass}</span>
                          <span className="rct-count fail">✗ {run.fail}</span>
                          {run.blocked > 0 ? <span className="rct-count block">⊘ {run.blocked}</span> : null}
                          <span className="rct-count muted">○ {run.notrun}</span>
                        </div>
                      </div>
                      <div className="rct-right">
                        <span className={statusPillClass(run.stalled ? 'stalled' : 'active')}>
                          <span className="pill-dot" />
                          {run.stalled ? 'Stalled' : 'Active'}
                        </span>
                        <span className={`expand-btn${isExp ? ' open' : ''}`}>{isExp ? '▴' : '▾'}</span>
                      </div>
                    </button>
                    {isExp ? (
                      <div className="rcd open">
                        <div className="rcd-tabs">
                          {(['overview', 'assignees', 'defects'] as CardTab[]).map((t) => (
                            <button
                              key={t}
                              type="button"
                              className={`rcd-tab${tab === t ? ' on' : ''}`}
                              onClick={() => setCardTabs((prev) => ({ ...prev, [run.id]: t }))}
                            >
                              {t === 'overview' ? 'Overview' : t === 'assignees' ? `Assignees (${run.assignees.length})` : `Defects${run.defects.length ? ` (${run.defects.length})` : ''}`}
                            </button>
                          ))}
                        </div>
                        <div className="rcd-body">
                          {tab === 'overview' ? (
                            <>
                              <div className="rcd-progress">
                                <span className="rcd-prog-label">Execution progress</span>
                                <span className="rl-pt">
                                  {run.pass + run.fail + run.blocked} / {total}
                                </span>
                                <div className="prog prog-tall">
                                  {run.pass > 0 ? <div className="pg-p" style={{ width: `${(run.pass / total) * 100}%` }} /> : null}
                                  {run.fail > 0 ? <div className="pg-f" style={{ width: `${(run.fail / total) * 100}%` }} /> : null}
                                  {run.blocked > 0 ? <div className="pg-b" style={{ width: `${(run.blocked / total) * 100}%` }} /> : null}
                                </div>
                              </div>
                              <div className="rcd-grid">
                                <div><div className="rcd-lbl">Due</div><div className="rcd-val">{run.due}</div></div>
                                <div><div className="rcd-lbl">Environment</div><div className="rcd-val">{run.environment}</div></div>
                                <div className="rcd-wide"><div className="rcd-lbl">Test plan</div><div className="rcd-val">{run.planName}</div></div>
                              </div>
                            </>
                          ) : null}
                          {tab === 'assignees'
                            ? run.assignees.map((a) => (
                                <div key={a.name} className="assignee-row">
                                  <div className="av-mini">{a.name.split(' ').map((x) => x[0]).join('').slice(0, 2)}</div>
                                  <span className="assignee-name">{a.name}</span>
                                  {a.cases ? <span className="assignee-cases">{a.cases} cases</span> : null}
                                </div>
                              ))
                            : null}
                          {tab === 'defects'
                            ? run.defects.length
                              ? run.defects.map((d) => (
                                  <div key={d} className="defect-row">
                                    <span className="ed-dtag">{d}</span>
                                    <span>{DEFECT_NAMES[d] ?? 'Open defect'}</span>
                                  </div>
                                ))
                              : <div className="rcd-empty">No defects linked to this run</div>
                            : null}
                        </div>
                      </div>
                    ) : null}
                  </div>
                )
              })}
            </div>
          </div>

          <div className="dash-right">
            <div className="panel panel-grow">
              <div className="pnl-hd">
                <span className="pnl-ttl">Needs attention</span>
                <span className="pnl-ct pnl-ct-alert">{state.attention.length}</span>
              </div>
              <div className="pnl-body">
                {state.attention.map((item) => (
                  <Link key={item.id} href="/runs" className="att-item">
                    <div className={`att-item-stripe ${item.priority}`} />
                    <div className="att-item-body">
                      <div className="att-title">{item.title}</div>
                      <div className="att-meta">
                        <span className={priorityClass(item.priority)}>{item.priority}</span>
                        <span className="att-run">{item.runName}</span>
                        <span className="att-actor">{item.actor}</span>
                      </div>
                    </div>
                    <div className="att-item-right">
                      {item.defectId ? (
                        <span className="defect-tag-sm">{item.defectId}</span>
                      ) : (
                        <span className="no-defect-tag">Link defect</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
              <div className="att-footer">
                <Link href="/runs">View all {state.attention.length} failures →</Link>
              </div>
            </div>

            <div className="panel">
              <div className="pnl-hd">
                <span className="pnl-ttl">Coverage — Sprint 44</span>
                <span className="cov-overall">{metrics.coverage}% overall</span>
              </div>
              <div className="cov-grid">
                {COVERAGE.map((c) => (
                  <div key={c.label}>
                    <div className="cov-lbl">{c.label}</div>
                    <div className="cov-bar">
                      <div className="cov-fill" style={{ width: `${c.pct}%`, background: c.color }} />
                    </div>
                    <div className="cov-pct">{c.pct}%</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
