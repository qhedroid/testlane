'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { RunStatusInfographic } from '../components/RunStatusInfographic'
import { DONUT_CHART_SIZE } from '../data/ui-utils'
import { FreshTopbar } from '../components/FreshTopbar'
import { ATTENTION_ITEMS, COVERAGE_ITEMS, DEFECT_NAMES, RUN_CARDS } from '../data/seed'
import type { RunCard } from '../data/types'
import { PRI_MAP } from '../data/ui-utils'

type CardFilter = 'all' | 'critical' | 'stalled'
type CardTab = 'overview' | 'assignees' | 'defects'

export function DashboardScreen() {
  const [cardFilter, setCardFilter] = useState<CardFilter>('all')
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [cardTabs, setCardTabs] = useState<Record<string, CardTab>>({})

  const filteredRuns = useMemo(() => {
    if (cardFilter === 'stalled') return RUN_CARDS.filter((r) => r.stalled)
    if (cardFilter === 'critical') return RUN_CARDS.filter((r) => r.fail > 10)
    return RUN_CARDS
  }, [cardFilter])

  const [leftRuns, rightRuns] = useMemo(() => {
    const left: RunCard[] = []
    const right: RunCard[] = []
    filteredRuns.forEach((run, i) => {
      if (i % 2 === 0) left.push(run)
      else right.push(run)
    })
    return [left, right]
  }, [filteredRuns])

  function toggleCard(id: string, e?: React.MouseEvent) {
    e?.stopPropagation()
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  return (
    <div className="view">
      <FreshTopbar
        breadcrumbs={[{ label: 'Dashboard' }]}
        subtitle="Sprint 44 · Release 2.4.1"
        searchPlaceholder="Search everything…"
        actions={
          <>
            <button type="button" className="btn"><i className="ti ti-download" style={{ fontSize: 12 }} /> Export</button>
            <Link href="/runs" className="btn btn-p"><i className="ti ti-plus" style={{ fontSize: 12 }} /> New Run</Link>
          </>
        }
      />
      <div className="dash-wrap">
        <div className="met-row">
          <div className="mc c-blue">
            <div className="mc-head">
              <div><div className="mv" style={{ color: 'var(--accent)' }}>8</div><div className="ml">Active Runs</div></div>
              <div className="mc-ic"><i className="ti ti-player-play" /></div>
            </div>
            <div className="mt">3 critical path &nbsp;·&nbsp; 1 stalled</div>
          </div>
          <div className="mc c-green">
            <div className="mc-head">
              <div><div className="mv" style={{ color: '#2E7D32' }}>74.2%</div><div className="ml">Pass Rate</div></div>
              <div className="mc-ic"><i className="ti ti-trending-up" /></div>
            </div>
            <div className="mt mt-up">↑ 6.1 pp vs Sprint 43</div>
          </div>
          <div className="mc c-red">
            <div className="mc-head">
              <div><div className="mv" style={{ color: '#C62828' }}>23</div><div className="ml">Open Failures</div></div>
              <div className="mc-ic"><i className="ti ti-alert-circle" /></div>
            </div>
            <div className="mt mt-dn">↑ 4 unlinked since yesterday</div>
          </div>
          <div className="mc c-amber">
            <div className="mc-head">
              <div><div className="mv" style={{ color: '#E65100' }}>7</div><div className="ml">Blocked Cases</div></div>
              <div className="mc-ic"><i className="ti ti-ban" /></div>
            </div>
            <div className="mt">2 without defect &nbsp;·&nbsp; action needed</div>
          </div>
          <div className="mc c-grey">
            <div className="mc-head">
              <div><div className="mv">68%</div><div className="ml">Run Coverage</div></div>
              <div className="mc-ic"><i className="ti ti-chart-donut" /></div>
            </div>
            <div className="mt mt-up">312 of 458 cases executed</div>
          </div>
        </div>

        <div className="dash-body" style={{ minHeight: 0, overflow: 'hidden' }}>
          <div className="runs-col">
            <div className="runs-col-hd">
              <i className="ti ti-player-play" style={{ fontSize: 13, color: 'var(--accent)' }} />
              <span className="runs-col-ttl">Active runs</span>
              <span className="pnl-ct">8</span>
              <div style={{ display: 'flex', gap: 3, marginLeft: 4 }}>
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
              <Link href="/runs" className="btn" style={{ fontSize: 10.5, padding: '2px 7px', marginLeft: 'auto' }}>
                All runs <i className="ti ti-arrow-right" style={{ fontSize: 11 }} />
              </Link>
            </div>
            <div className="run-cards-cols">
              <div className="run-cards-col">
                {leftRuns.map((run) => (
                  <RunCardItem
                    key={run.id}
                    run={run}
                    expanded={expanded.has(run.id)}
                    tab={cardTabs[run.id] ?? 'overview'}
                    onToggle={(e) => toggleCard(run.id, e)}
                    onTab={(t) => setCardTabs((prev) => ({ ...prev, [run.id]: t }))}
                  />
                ))}
              </div>
              <div className="run-cards-col">
                {rightRuns.map((run) => (
                  <RunCardItem
                    key={run.id}
                    run={run}
                    expanded={expanded.has(run.id)}
                    tab={cardTabs[run.id] ?? 'overview'}
                    onToggle={(e) => toggleCard(run.id, e)}
                    onTab={(t) => setCardTabs((prev) => ({ ...prev, [run.id]: t }))}
                  />
                ))}
              </div>
            </div>
          </div>

          <div className="dash-right">
            <div className="panel" style={{ flex: 1, minHeight: 0, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
              <div className="pnl-hd">
                <i className="ti ti-alert-triangle" style={{ fontSize: 13, color: 'var(--fail)' }} />
                <span className="pnl-ttl">Needs attention</span>
                <span className="pnl-ct" style={{ background: 'var(--fail-bg)', color: 'var(--fail)', borderColor: 'rgba(198,40,40,.2)' }}>11</span>
                <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 'auto' }}>unlinked failures</span>
              </div>
              <div className="pnl-body" style={{ flex: 1 }}>
                {ATTENTION_ITEMS.map((item) => (
                  <Link key={item.title} href="/runs" className="att-item">
                    <div className={`att-item-stripe ${item.stripe}`} />
                    <div className="att-item-body">
                      <div className="att-title">{item.title}</div>
                      <div className="att-meta">
                        <span className={`pri ${PRI_MAP[item.pri]}`}>{item.pri}</span>
                        <span className="att-run">{item.run}</span>
                        <span className="att-actor">{item.actor}</span>
                      </div>
                    </div>
                    <div className="att-item-right">
                      {item.defectId ? (
                        <span className="defect-tag-sm"><i className="ti ti-bug" style={{ fontSize: 9 }} />{item.defectId}</span>
                      ) : (
                        <span className="no-defect-tag"><i className="ti ti-link-off" style={{ fontSize: 9 }} /> Link defect</span>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
              <div className="att-footer"><Link href="/runs">View all 11 failures →</Link></div>
            </div>

            <div className="panel" style={{ flexShrink: 0 }}>
              <div className="pnl-hd">
                <i className="ti ti-chart-donut" style={{ fontSize: 13, color: 'var(--accent)' }} />
                <span className="pnl-ttl">Coverage — Sprint 44</span>
                <span style={{ fontSize: 10.5, color: 'var(--text3)', fontFamily: 'var(--mono)', marginLeft: 'auto' }}>68% overall</span>
              </div>
              <div className="cov-grid">
                {COVERAGE_ITEMS.map((c) => (
                  <div key={c.label}>
                    <div className="cov-lbl">{c.label}</div>
                    <div className="cov-bar">
                      <div className="cov-fill" style={{ width: `${c.pct}%`, background: c.color ?? 'var(--accent)' }} />
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

function RunCardItem({
  run,
  expanded,
  tab,
  onToggle,
  onTab,
}: {
  run: RunCard
  expanded: boolean
  tab: CardTab
  onToggle: (e?: React.MouseEvent) => void
  onTab: (t: CardTab) => void
}) {
  const passP = (run.pass / run.total) * 100
  const failP = (run.fail / run.total) * 100
  const blkP = (run.blocked / run.total) * 100

  return (
    <div className={`run-card${run.stalled ? ' stalled' : ''}`}>
      <div className="rct" onClick={() => onToggle()}>
        <RunStatusInfographic pass={run.pass} fail={run.fail} blocked={run.blocked} notrun={run.notrun} size={DONUT_CHART_SIZE} compact />
        <div className="rct-info">
          <div className="rct-name">{run.name}</div>
          <div className="rct-ctx">{run.plan} &nbsp;·&nbsp; {run.env}</div>
        </div>
        <div className="rct-right">
          <span className={`pill ${run.stalled ? 'p-block' : 'p-act'}`} style={{ fontSize: 9.5, padding: '1px 5px' }}>
            <span className="pill-dot" />
            {run.stalled ? 'Stalled' : 'Active'}
          </span>
          <button
            type="button"
            className={`expand-btn${expanded ? ' open' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggle(e) }}
            title={expanded ? 'Collapse' : 'Expand'}
          >
            <i className="ti ti-chevron-down" />
          </button>
        </div>
      </div>
      <div className={`rcd${expanded ? ' open' : ''}`}>
        <div className="rcd-tabs">
          {(['overview', 'assignees', 'defects'] as CardTab[]).map((t) => (
            <button
              key={t}
              type="button"
              className={`rcd-tab${tab === t ? ' on' : ''}`}
              onClick={(e) => { e.stopPropagation(); onTab(t) }}
            >
              {t === 'overview' ? 'Overview' : t === 'assignees' ? `Assignees (${run.assignees.length})` : `Defects${run.defects.length ? ` (${run.defects.length})` : ''}`}
            </button>
          ))}
        </div>
        <div className="rcd-body">
          <div className={`rcd-pane${tab === 'overview' ? ' on' : ''}`}>
            <div style={{ marginBottom: 9 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ fontSize: 9.5, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.05em', color: 'var(--text3)' }}>Execution progress</span>
                <span style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>{run.pass + run.fail + run.blocked} / {run.total}</span>
              </div>
              <div className="prog" style={{ height: 6, marginBottom: 5 }}>
                <div className="pg-p" style={{ width: `${passP}%` }} />
                <div className="pg-f" style={{ width: `${failP}%` }} />
                {run.blocked > 0 ? <div className="pg-b" style={{ width: `${blkP}%` }} /> : null}
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 10.5 }}>
                <span style={{ color: 'var(--pass)' }}>✓ {run.pass} passed</span>
                <span style={{ color: 'var(--fail)' }}>✗ {run.fail} failed</span>
                {run.blocked > 0 ? <span style={{ color: 'var(--block)' }}>⊘ {run.blocked} blocked</span> : null}
                <span style={{ color: 'var(--text3)' }}>○ {run.notrun} not run</span>
              </div>
            </div>
            <div className="rcd-grid">
              <div className="rcd-grid-item"><div className="rcd-lbl">Due</div><div className="rcd-val">{run.due}</div></div>
              <div className="rcd-grid-item"><div className="rcd-lbl">Environment</div><div className="rcd-val">{run.env}</div></div>
              <div className="rcd-grid-item" style={{ gridColumn: 'span 2' }}><div className="rcd-lbl">Test plan</div><div className="rcd-val">{run.plan}</div></div>
            </div>
          </div>
          <div className={`rcd-pane${tab === 'assignees' ? ' on' : ''}`}>
            {run.assignees.length > 0 ? run.assignees.map((a) => (
              <div key={a.n} className="assignee-row">
                <div className="av-mini">{a.n.split(' ').map((x) => x[0]).join('').slice(0, 2)}</div>
                <span style={{ color: 'var(--text)', fontWeight: 500 }}>{a.n}</span>
                <span style={{ color: 'var(--text3)', fontSize: 10.5, marginLeft: 'auto' }}>QA Team</span>
              </div>
            )) : (
              <div className="rcd-empty">No data — no assignees on this run.</div>
            )}
          </div>
          <div className={`rcd-pane${tab === 'defects' ? ' on' : ''}`}>
            {run.defects.length ? run.defects.map((d) => (
              <div key={d} className="defect-row">
                <span className="ed-dtag" style={{ fontSize: 10, padding: '1px 5px' }}><i className="ti ti-bug" style={{ fontSize: 9 }} />{d}</span>
                <span style={{ color: 'var(--text2)', fontSize: 11 }}>{DEFECT_NAMES[d] ?? 'Open defect'}</span>
              </div>
            )) : (
              <div style={{ padding: '10px 0', textAlign: 'center', color: 'var(--text3)', fontSize: 11.5 }}>
                <i className="ti ti-check" style={{ display: 'block', fontSize: 18, marginBottom: 4, color: 'var(--pass)' }} />
                No defects linked to this run
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
