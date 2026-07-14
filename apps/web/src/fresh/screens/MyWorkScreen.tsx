'use client'

import Link from 'next/link'
import { useMemo } from 'react'
import { FreshTopbar } from '../components/FreshTopbar'
import { useProjectHref } from '../hooks/useProjectHref'
import { useFresh } from '../data/FreshProvider'
import { formatAdminUserName } from '../data/admin-initial-settings'
import type { Case, DemoRun, ExecStatus } from '../data/demo-model'
import { normalizeAssigneeName } from '../data/team-users'

function statusClass(status: ExecStatus): string {
  switch (status) {
    case 'Passed':
      return 'pill p-pass'
    case 'Failed':
      return 'pill p-fail'
    case 'Blocked':
      return 'pill p-block'
    case 'Skipped':
      return 'pill p-skip'
    default:
      return 'pill p-notrun'
  }
}

function statusDot(status: ExecStatus): string {
  switch (status) {
    case 'Passed':
      return 'var(--pass)'
    case 'Failed':
      return 'var(--fail)'
    case 'Blocked':
      return 'var(--block)'
    default:
      return 'var(--text3)'
  }
}

function isAssignedTo(name: string | undefined, me: string): boolean {
  const normalized = normalizeAssigneeName(name)
  if (normalized) return normalized === normalizeAssigneeName(me) || normalized === me
  return (name ?? '').trim() === me
}

interface QueueItem {
  caseId: string
  tc: string
  title: string
  status: ExecStatus
}

interface QueueGroup {
  runId: string
  runKey: string
  name: string
  items: QueueItem[]
  done: number
  total: number
}

function buildQueue(runs: DemoRun[], cases: Case[], me: string): QueueGroup[] {
  const caseById = new Map(cases.map((c) => [c.id, c]))
  const groups: QueueGroup[] = []

  for (const run of runs) {
    if (run.archivedAt || run.sealed) continue
    const items: QueueItem[] = []
    for (const caseId of run.caseOrder) {
      const c = caseById.get(caseId)
      if (!c) continue
      const ex = run.executions[caseId]
      const assignee = ex?.assignee ?? c.assignee
      if (!isAssignedTo(assignee, me)) continue
      const status = ex?.status ?? 'Not run'
      items.push({
        caseId,
        tc: c.caseKey ?? caseId.slice(0, 8),
        title: c.title,
        status,
      })
    }
    if (items.length === 0) continue
    const done = items.filter((i) => i.status !== 'Not run').length
    groups.push({
      runId: run.id,
      runKey: run.runKey,
      name: run.name,
      items,
      done,
      total: items.length,
    })
  }

  return groups
}

export function MyWorkScreen() {
  const projectHref = useProjectHref()
  const { currentActor, activeRuns, activeCases, activeDefects } = useFresh()
  const me = formatAdminUserName(currentActor)

  const queueGroups = useMemo(
    () => buildQueue(activeRuns, activeCases, me),
    [activeRuns, activeCases, me],
  )

  const assignedItems = useMemo(
    () => queueGroups.flatMap((g) => g.items),
    [queueGroups],
  )

  const kpis = useMemo(() => {
    const notRun = assignedItems.filter((i) => i.status === 'Not run').length
    const blocked = assignedItems.filter((i) => i.status === 'Blocked').length
    const myCaseIds = new Set(assignedItems.map((i) => i.caseId))
    const defectIds = new Set<string>()
    for (const run of activeRuns) {
      for (const caseId of run.caseOrder) {
        if (!myCaseIds.has(caseId)) continue
        for (const id of run.executions[caseId]?.defects ?? []) defectIds.add(id)
      }
    }
    const defectsToVerify = activeDefects.filter(
      (d) => defectIds.has(d.id) && (d.status === 'Open' || d.status === 'In progress' || d.status === 'Resolved'),
    )
    return {
      assigned: assignedItems.length,
      notRun,
      blocked,
      defects: defectsToVerify.length,
      defectRows: defectsToVerify,
    }
  }, [assignedItems, activeRuns, activeDefects])

  return (
    <div className="view">
      <FreshTopbar breadcrumbs={[{ label: 'My Work' }]} showSearch={false} />

      <div className="screen-wrap">
        <div className="page-head">
          <div>
            <h1>My Work</h1>
            <div className="sub">
              Assigned to {me} · {kpis.assigned} cases across {queueGroups.length} open runs
            </div>
          </div>
        </div>

        <div className="kpi-strip">
          <div className="kpi-tile">
            <div className="kpi-lbl">Assigned Cases</div>
            <div className="kpi-val">{kpis.assigned}</div>
          </div>
          <div className="kpi-tile">
            <div className="kpi-lbl">Not Run Yet</div>
            <div className="kpi-val">{kpis.notRun}</div>
          </div>
          <div className="kpi-tile">
            <div className="kpi-lbl">Blocked</div>
            <div className={`kpi-val${kpis.blocked > 0 ? ' kpi-warn' : ''}`}>{kpis.blocked}</div>
          </div>
          <div className="kpi-tile">
            <div className="kpi-lbl">Defects Involving You</div>
            <div className="kpi-val">{kpis.defects}</div>
          </div>
        </div>

        <div className="mywork-grid">
          <div className="panel mywork-panel">
            <h3 className="panel-h3">Your Test Queue</h3>
            <div className="panel-body-pad">
              {queueGroups.length === 0 ? (
                <p className="page-empty-desc" style={{ padding: 8 }}>
                  Nothing assigned to you in open runs. Assign cases or execution rows to {me} to build this queue.
                </p>
              ) : (
                queueGroups.map((group) => (
                  <div key={group.runId} className="mywork-run-group">
                    <div className="mywork-run-hd">
                      <span className="mono-muted">{group.runKey}</span>
                      <span className="mywork-run-name">{group.name}</span>
                      <span className="mywork-run-frac">
                        {group.done} / {group.total}
                      </span>
                      <span style={{ flex: 1 }} />
                      <Link href={projectHref('testruns')} className="btn mywork-mini-btn">
                        <i className="ti ti-player-play" aria-hidden />
                        Continue
                      </Link>
                    </div>
                    {group.items.map((item) => (
                      <div key={`${group.runId}-${item.caseId}`} className="screen-row">
                        <span className="sdot" style={{ background: statusDot(item.status) }} />
                        <span className="mono-muted mywork-tc">{item.tc}</span>
                        <span className="mywork-case-title">{item.title}</span>
                        <span className={statusClass(item.status)}>
                          <span className="pill-dot" />
                          {item.status}
                        </span>
                        <Link href={projectHref('testruns')} className="btn mywork-mini-btn">
                          <i className="ti ti-player-play" aria-hidden />
                          Run
                        </Link>
                      </div>
                    ))}
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="panel mywork-panel">
            <h3 className="panel-h3">Defects Involving You</h3>
            <div className="panel-body-pad">
              {kpis.defectRows.length === 0 ? (
                <p className="page-empty-desc" style={{ padding: 8 }}>
                  No open defects linked to your assigned executions.
                </p>
              ) : (
                kpis.defectRows.map((d) => (
                  <div key={d.id} className="screen-row mywork-def-row">
                    <span className="mono-muted mywork-def-id">{d.defectKey}</span>
                    <div className="mywork-def-body">
                      <div className="mywork-def-title">{d.title}</div>
                      <div className="mywork-def-why">Linked to a case assigned to you · {d.status}</div>
                    </div>
                    <span className="pri pr-med">local</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
