'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { RunStatusInfographic } from '../components/RunStatusInfographic'
import { DONUT_CHART_SIZE } from '../data/ui-utils'
import { FreshTopbar } from '../components/FreshTopbar'
import { PrototypeBanner } from '../components/PrototypeBanner'
import { useProjectHref } from '../hooks/useProjectHref'
import { useFresh } from '../data/FreshProvider'
import type { Case, CasePriority, DemoRun, Folder } from '../data/demo-model'
import {
  casesInFolder,
  formatRelativeTime,
  PRIORITY_TO_LEGACY,
  runSummary,
} from '../data/demo-model'
import { displayAssigneeName } from '../data/team-users'
import { PRI_MAP } from '../data/ui-utils'

type CardFilter = 'all' | 'critical'
type CardTab = 'overview' | 'assignees' | 'defects'

interface DashboardRunCard {
  id: string
  name: string
  plan: string
  pass: number
  fail: number
  blocked: number
  skipped: number
  notrun: number
  total: number
  assignees: string[]
  defects: string[]
}

interface UnlinkedFailure {
  key: string
  title: string
  priority: CasePriority
  runName: string
  testedBy?: string
  testedAt?: string
}

interface CoverageRow {
  label: string
  pct: number
  color: string
}

const ATTENTION_CAP = 6

const PRIORITY_STRIPE: Record<CasePriority, string> = {
  Critical: 'crit',
  High: 'high',
  Medium: 'med',
  Low: 'low',
}

function getDashboardActiveRuns(runs: DemoRun[]): DemoRun[] {
  return runs.filter((r) => !r.sealed && !r.archivedAt)
}

function collectUnlinkedFailures(runs: DemoRun[], cases: Case[]): UnlinkedFailure[] {
  const caseById = new Map(cases.map((c) => [c.id, c]))
  const items: UnlinkedFailure[] = []
  for (const run of runs) {
    for (const caseId of run.caseOrder) {
      const ex = run.executions[caseId]
      if (ex?.status === 'Failed' && (!ex.defects || ex.defects.length === 0)) {
        const c = caseById.get(caseId)
        if (c) {
          items.push({
            key: `${run.id}:${caseId}`,
            title: c.title,
            priority: c.priority,
            runName: run.name,
            testedBy: ex.testedBy,
            testedAt: ex.testedAt,
          })
        }
      }
    }
  }
  return items.sort((a, b) => {
    const aTime = a.testedAt ? new Date(a.testedAt).getTime() : 0
    const bTime = b.testedAt ? new Date(b.testedAt).getTime() : 0
    if (bTime !== aTime) return bTime - aTime
    return a.runName.localeCompare(b.runName)
  })
}

function defectIdsForRun(run: DemoRun): string[] {
  const ids = new Set<string>()
  for (const caseId of run.caseOrder) {
    for (const id of run.executions[caseId]?.defects ?? []) ids.add(id)
  }
  return [...ids]
}

function assigneesForRun(run: DemoRun): string[] {
  const names = new Set<string>()
  for (const caseId of run.caseOrder) {
    const assignee = run.executions[caseId]?.assignee
    if (assignee?.trim()) names.add(assignee.trim())
  }
  return [...names]
}

function runToCard(run: DemoRun): DashboardRunCard {
  const summary = runSummary(run)
  return {
    id: run.id,
    name: run.name,
    plan: run.planName ?? '—',
    pass: summary.passed,
    fail: summary.failed,
    blocked: summary.blocked,
    skipped: summary.skipped,
    notrun: summary.notRun,
    total: summary.total,
    assignees: assigneesForRun(run),
    defects: defectIdsForRun(run),
  }
}

function coverageColor(pct: number): string {
  if (pct >= 80) return 'var(--pass)'
  if (pct <= 50) return 'var(--fail)'
  return 'var(--accent)'
}

function computeCoverageRows(
  activeCases: Case[],
  activeFolders: Folder[],
  dashboardActiveRuns: DemoRun[],
): CoverageRow[] {
  const coveredCaseIds = new Set<string>()
  for (const run of dashboardActiveRuns) {
    for (const caseId of run.caseOrder) {
      const status = run.executions[caseId]?.status ?? 'Not run'
      if (status !== 'Not run') coveredCaseIds.add(caseId)
    }
  }

  const rows: CoverageRow[] = []
  const rootFolders = activeFolders
    .filter((f) => f.parentId == null)
    .sort((a, b) => a.name.localeCompare(b.name))

  for (const folder of rootFolders) {
    const folderCases = casesInFolder(activeCases, activeFolders, folder.id)
    if (folderCases.length === 0) continue
    const covered = folderCases.filter((c) => coveredCaseIds.has(c.id)).length
    const pct = Math.round((covered / folderCases.length) * 100)
    rows.push({ label: folder.name, pct, color: coverageColor(pct) })
  }

  const unfiledCases = casesInFolder(activeCases, activeFolders, '__unfiled__')
  if (unfiledCases.length > 0) {
    const covered = unfiledCases.filter((c) => coveredCaseIds.has(c.id)).length
    const pct = Math.round((covered / unfiledCases.length) * 100)
    rows.push({ label: 'Cases in no folder', pct, color: coverageColor(pct) })
  }

  return rows.sort((a, b) => a.pct - b.pct)
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
      <PrototypeBanner />
      <div className="dash-wrap">
        <div
          className="panel"
          style={{
            marginTop: 16,
            padding: '48px 24px',
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <i className="ti ti-layout-dashboard" style={{ fontSize: 32, color: 'var(--text3)', opacity: 0.6 }} />
          <div style={{ fontSize: 16, fontWeight: 600, color: 'var(--text)' }}>Add your first test cases</div>
          <div style={{ fontSize: 12.5, color: 'var(--text3)', maxWidth: 360 }}>
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
  const { activeProject, activeRuns, activeCases, activeFolders, getDefect } = useFresh()
  const [cardFilter, setCardFilter] = useState<CardFilter>('all')
  const [expanded, setExpanded] = useState<Set<string>>(() => new Set())
  const [cardTabs, setCardTabs] = useState<Record<string, CardTab>>({})

  const dashboardActiveRuns = useMemo(() => getDashboardActiveRuns(activeRuns), [activeRuns])

  const unlinkedFailures = useMemo(
    () => collectUnlinkedFailures(dashboardActiveRuns, activeCases),
    [dashboardActiveRuns, activeCases],
  )

  const metrics = useMemo(() => {
    let totalPassed = 0
    let totalFailed = 0
    let totalBlocked = 0
    let totalSkipped = 0
    let totalExecuted = 0
    let totalCases = 0
    let blockedCount = 0

    for (const run of dashboardActiveRuns) {
      const s = runSummary(run)
      totalPassed += s.passed
      totalFailed += s.failed
      totalBlocked += s.blocked
      totalSkipped += s.skipped
      totalExecuted += s.passed + s.failed + s.blocked + s.skipped
      totalCases += s.total
      blockedCount += s.blocked
    }

    const executedForPassRate = totalPassed + totalFailed + totalBlocked + totalSkipped
    const passRate =
      executedForPassRate > 0 ? `${((totalPassed / executedForPassRate) * 100).toFixed(1)}%` : '—'
    const runCoveragePct = totalCases > 0 ? Math.round((totalExecuted / totalCases) * 100) : 0

    return {
      activeRunCount: dashboardActiveRuns.length,
      passRate,
      openFailures: unlinkedFailures.length,
      blockedCases: blockedCount,
      runCoveragePct,
      totalExecuted,
      totalCases,
    }
  }, [dashboardActiveRuns, unlinkedFailures.length])

  const runCards = useMemo(
    () => dashboardActiveRuns.map(runToCard),
    [dashboardActiveRuns],
  )

  const filteredRuns = useMemo(() => {
    if (cardFilter === 'critical') return runCards.filter((r) => r.fail > 0)
    return runCards
  }, [cardFilter, runCards])

  const [leftRuns, rightRuns] = useMemo(() => {
    const left: DashboardRunCard[] = []
    const right: DashboardRunCard[] = []
    filteredRuns.forEach((run, i) => {
      if (i % 2 === 0) left.push(run)
      else right.push(run)
    })
    return [left, right]
  }, [filteredRuns])

  const coverageRows = useMemo(
    () => computeCoverageRows(activeCases, activeFolders, dashboardActiveRuns),
    [activeCases, activeFolders, dashboardActiveRuns],
  )

  const visibleAttention = unlinkedFailures.slice(0, ATTENTION_CAP)
  const attentionTotal = unlinkedFailures.length
  const showAttentionFooter = attentionTotal > ATTENTION_CAP

  function toggleCard(id: string, e?: React.MouseEvent) {
    e?.stopPropagation()
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const criticalRunCount = runCards.filter((r) => r.fail > 0).length
  const activeRunCaption =
    metrics.activeRunCount === 0
      ? 'No active runs yet'
      : criticalRunCount > 0
        ? `${criticalRunCount} with failures`
        : `${metrics.totalCases} cases across active runs`

  return (
    <div className="view">
      <FreshTopbar
        breadcrumbs={[{ label: 'Dashboard' }]}
        subtitle={activeProject?.name ?? 'Project'}
        searchPlaceholder="Search everything…"
        actions={
          <>
            <button type="button" className="btn btn-neutral"><i className="ti ti-download" style={{ fontSize: 12 }} /> Export</button>
            <Link href={projectHref('testruns')} className="btn btn-p"><i className="ti ti-plus" style={{ fontSize: 12 }} /> New Run</Link>
          </>
        }
      />
      <PrototypeBanner />
      <div className="dash-wrap">
        <div className="met-row">
          <div className="mc c-blue">
            <div className="mc-head">
              <div><div className="mv" style={{ color: 'var(--accent)' }}>{metrics.activeRunCount}</div><div className="ml">Active Runs</div></div>
              <div className="mc-ic"><i className="ti ti-player-play" /></div>
            </div>
            <div className="mt">{activeRunCaption}</div>
          </div>
          <div className="mc c-green">
            <div className="mc-head">
              <div><div className="mv" style={{ color: 'var(--pass)' }}>{metrics.passRate}</div><div className="ml">Pass Rate</div></div>
              <div className="mc-ic"><i className="ti ti-trending-up" /></div>
            </div>
            <div className="mt">{metrics.passRate === '—' ? 'No execution data' : 'Of executed cases'}</div>
          </div>
          <div className="mc c-red">
            <div className="mc-head">
              <div><div className="mv" style={{ color: 'var(--fail)' }}>{metrics.openFailures}</div><div className="ml">Open Failures</div></div>
              <div className="mc-ic"><i className="ti ti-alert-circle" /></div>
            </div>
            <div className="mt">{metrics.openFailures === 0 ? 'No unlinked failures' : 'Unlinked failed executions'}</div>
          </div>
          <div className="mc c-amber">
            <div className="mc-head">
              <div><div className="mv" style={{ color: 'var(--block)' }}>{metrics.blockedCases}</div><div className="ml">Blocked Cases</div></div>
              <div className="mc-ic"><i className="ti ti-ban" /></div>
            </div>
            <div className="mt">{metrics.blockedCases === 0 ? 'No blocked cases' : 'Across active runs'}</div>
          </div>
          <div className="mc c-grey">
            <div className="mc-head">
              <div><div className="mv">{metrics.runCoveragePct}%</div><div className="ml">Run Coverage</div></div>
              <div className="mc-ic"><i className="ti ti-chart-donut" /></div>
            </div>
            <div className="mt">{metrics.totalExecuted} of {metrics.totalCases} cases executed</div>
          </div>
        </div>

        <div className="dash-body" style={{ minHeight: 0, overflow: 'hidden' }}>
          <div className="runs-col">
            <div className="runs-col-hd">
              <i className="ti ti-player-play" style={{ fontSize: 13, color: 'var(--accent)' }} />
              <span className="runs-col-ttl">Active runs</span>
              <span className="pnl-ct">{metrics.activeRunCount}</span>
              <div style={{ display: 'flex', gap: 3, marginLeft: 4 }}>
                {(['all', 'critical'] as CardFilter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    className={`chip${cardFilter === f ? ' on' : ''}`}
                    onClick={() => setCardFilter(f)}
                  >
                    {f === 'all' ? 'All' : 'Critical'}
                  </button>
                ))}
              </div>
              <Link href={projectHref('testruns')} className="btn" style={{ fontSize: 10.5, padding: '2px 7px', marginLeft: 'auto' }}>
                All runs <i className="ti ti-arrow-right" style={{ fontSize: 11 }} />
              </Link>
            </div>
            <div className="run-cards-cols">
              <div className="run-cards-col">
                {leftRuns.length === 0 && rightRuns.length === 0 ? (
                  <div className="rcd-empty" style={{ padding: 16 }}>No active runs</div>
                ) : (
                  leftRuns.map((run) => (
                    <RunCardItem
                      key={run.id}
                      run={run}
                      expanded={expanded.has(run.id)}
                      tab={cardTabs[run.id] ?? 'overview'}
                      onToggle={(e) => toggleCard(run.id, e)}
                      onTab={(t) => setCardTabs((prev) => ({ ...prev, [run.id]: t }))}
                      getDefect={getDefect}
                    />
                  ))
                )}
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
                    getDefect={getDefect}
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
                {attentionTotal > 0 ? (
                  <span className="pnl-ct" style={{ background: 'var(--fail-bg)', color: 'var(--fail)', borderColor: 'rgba(198,40,40,.2)' }}>{attentionTotal}</span>
                ) : null}
                <span style={{ fontSize: 10, color: 'var(--text3)', marginLeft: 'auto' }}>unlinked failures</span>
              </div>
              <div className="pnl-body" style={{ flex: 1 }}>
                {attentionTotal === 0 ? (
                  <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text3)', fontSize: 12.5 }}>
                    No unlinked failures — nice work.
                  </div>
                ) : (
                  visibleAttention.map((item) => (
                    <Link key={item.key} href={projectHref('testruns')} className="att-item">
                      <div className={`att-item-stripe ${PRIORITY_STRIPE[item.priority]}`} />
                      <div className="att-item-body">
                        <div className="att-title">{item.title}</div>
                        <div className="att-meta">
                          <span className={`pri ${PRI_MAP[PRIORITY_TO_LEGACY[item.priority]]}`}>{item.priority}</span>
                          <span className="att-run">{item.runName}</span>
                          {item.testedBy ? (
                            <span className="att-actor">{displayAssigneeName(item.testedBy)}</span>
                          ) : null}
                          {item.testedAt ? (
                            <span className="att-actor">{formatRelativeTime(item.testedAt)}</span>
                          ) : null}
                        </div>
                      </div>
                      <div className="att-item-right">
                        <span className="no-defect-tag"><i className="ti ti-link-off" style={{ fontSize: 9 }} /> Link defect</span>
                      </div>
                    </Link>
                  ))
                )}
              </div>
              {showAttentionFooter ? (
                <div className="att-footer">
                  <Link href={projectHref('testruns')}>View all {attentionTotal} failures →</Link>
                </div>
              ) : null}
            </div>

            <div className="panel" style={{ flexShrink: 0 }}>
              <div className="pnl-hd">
                <i className="ti ti-chart-donut" style={{ fontSize: 13, color: 'var(--accent)' }} />
                <span className="pnl-ttl">Coverage by folder</span>
                <span style={{ fontSize: 10.5, color: 'var(--text3)', fontFamily: 'var(--mono)', marginLeft: 'auto' }}>{metrics.runCoveragePct}% overall</span>
              </div>
              {coverageRows.length === 0 ? (
                <div style={{ padding: '16px', color: 'var(--text3)', fontSize: 12 }}>No folders with cases yet</div>
              ) : (
                <div className="cov-grid">
                  {coverageRows.map((c) => (
                    <div key={c.label}>
                      <div className="cov-lbl">{c.label}</div>
                      <div className="cov-bar">
                        <div className="cov-fill" style={{ width: `${c.pct}%`, background: c.color ?? 'var(--accent)' }} />
                      </div>
                      <div className="cov-pct">{c.pct}%</div>
                    </div>
                  ))}
                </div>
              )}
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
  getDefect,
}: {
  run: DashboardRunCard
  expanded: boolean
  tab: CardTab
  onToggle: (e?: React.MouseEvent) => void
  onTab: (t: CardTab) => void
  getDefect: (defectId: string) => { defectKey: string; title: string } | undefined
}) {
  const passP = run.total > 0 ? (run.pass / run.total) * 100 : 0
  const failP = run.total > 0 ? (run.fail / run.total) * 100 : 0
  const blkP = run.total > 0 ? (run.blocked / run.total) * 100 : 0
  const skipP = run.total > 0 ? (run.skipped / run.total) * 100 : 0
  const executed = run.pass + run.fail + run.blocked + run.skipped

  return (
    <div className="run-card">
      <div className="rct" onClick={() => onToggle()}>
        <RunStatusInfographic
          pass={run.pass}
          fail={run.fail}
          blocked={run.blocked}
          notrun={run.notrun}
          skipped={run.skipped}
          size={DONUT_CHART_SIZE}
          compact
          interactive
        />
        <div className="rct-info">
          <div className="rct-name">{run.name}</div>
          <div className="rct-ctx">{run.plan}</div>
        </div>
        <div className="rct-right">
          <span className="pill p-act" style={{ fontSize: 9.5, padding: '1px 5px' }}>
            <span className="pill-dot" />
            Active
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
                <span style={{ fontSize: 10.5, fontFamily: 'var(--mono)', color: 'var(--text3)' }}>{executed} / {run.total}</span>
              </div>
              <div className="prog" style={{ height: 6, marginBottom: 5 }}>
                <div className="pg-p" style={{ width: `${passP}%` }} />
                <div className="pg-f" style={{ width: `${failP}%` }} />
                {run.blocked > 0 ? <div className="pg-b" style={{ width: `${blkP}%` }} /> : null}
                {run.skipped > 0 ? <div className="pg-s" style={{ width: `${skipP}%` }} /> : null}
              </div>
              <div style={{ display: 'flex', gap: 10, fontSize: 10.5 }}>
                <span style={{ color: 'var(--pass)' }}>✓ {run.pass} passed</span>
                <span style={{ color: 'var(--fail)' }}>✗ {run.fail} failed</span>
                {run.blocked > 0 ? <span style={{ color: 'var(--block)' }}>⊘ {run.blocked} blocked</span> : null}
                {run.skipped > 0 ? <span style={{ color: 'var(--skip)' }}>→ {run.skipped} skipped</span> : null}
                <span style={{ color: 'var(--text3)' }}>○ {run.notrun} not run</span>
              </div>
            </div>
            <div className="rcd-grid">
              <div className="rcd-grid-item" style={{ gridColumn: 'span 2' }}><div className="rcd-lbl">Test plan</div><div className="rcd-val">{run.plan}</div></div>
            </div>
          </div>
          <div className={`rcd-pane${tab === 'assignees' ? ' on' : ''}`}>
            {run.assignees.length > 0 ? run.assignees.map((name) => (
              <div key={name} className="assignee-row">
                <div className="av-mini">{displayAssigneeName(name).split(' ').map((x) => x[0]).join('').slice(0, 2)}</div>
                <span style={{ color: 'var(--text)', fontWeight: 500 }}>{displayAssigneeName(name)}</span>
              </div>
            )) : (
              <div className="rcd-empty">No assignees on this run.</div>
            )}
          </div>
          <div className={`rcd-pane${tab === 'defects' ? ' on' : ''}`}>
            {run.defects.length ? run.defects.map((d) => {
              const defect = getDefect(d)
              return (
                <div key={d} className="defect-row">
                  <span className="ed-dtag" style={{ fontSize: 10, padding: '1px 5px' }}><i className="ti ti-bug" style={{ fontSize: 9 }} />{defect?.defectKey ?? d}</span>
                  <span style={{ color: 'var(--text2)', fontSize: 11 }}>{defect?.title ?? 'Open defect'}</span>
                </div>
              )
            }) : (
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
