'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { FreshTopbar } from '../components/FreshTopbar'
import { PrototypeBanner } from '../components/PrototypeBanner'
import { RunStatusInfographic } from '../components/RunStatusInfographic'
import { useFresh } from '../data/FreshProvider'
import type { ExecStatus } from '../data/demo-model'
import { runSummary } from '../data/demo-model'
import { DONUT_CHART_SIZE, EXEC_PILL_MAP } from '../data/ui-utils'
import { displayAssigneeName, normalizeAssigneeName, TEAM_USERS } from '../data/team-users'
import { testRunCasePath } from '../lib/project-routes'

const DONE_STATUSES = new Set<ExecStatus>(['Passed', 'Skipped'])

/**
 * "My Work" (Area G) — read + navigate surface listing every run-case
 * execution assigned to the selected person, grouped by run. No editing here;
 * Continue deep-links into the run execution screen.
 *
 * Note: the admin demo-actor names (Alice Chen, Demo User, …) don't map 1:1
 * onto the demo team assignee names used on executions. When the current
 * actor's name doesn't map, the queue defaults to the first team member and
 * the picker makes the "viewing as" choice explicit.
 */
export function MyWorkScreen() {
  const router = useRouter()
  const { activeProject, activeRuns, getCase, currentActor } = useFresh()

  const actorTeamName = normalizeAssigneeName(currentActor?.name)
  const [person, setPerson] = useState<string>(actorTeamName ?? TEAM_USERS[1])
  const [hideCompleted, setHideCompleted] = useState(false)
  const [showClosed, setShowClosed] = useState(false)

  const groups = useMemo(() => {
    const result: {
      run: (typeof activeRuns)[number]
      rows: { caseId: string; caseKey: string; title: string; status: ExecStatus }[]
      counts: Record<'notRun' | 'failed' | 'blocked' | 'passed', number>
    }[] = []
    for (const run of activeRuns) {
      if (!showClosed && run.sealed) continue
      const rows: { caseId: string; caseKey: string; title: string; status: ExecStatus }[] = []
      const counts = { notRun: 0, failed: 0, blocked: 0, passed: 0 }
      for (const caseId of run.caseOrder) {
        const c = getCase(caseId)
        if (!c) continue
        const ex = run.executions[caseId]
        const assignee = displayAssigneeName(ex?.assignee ?? c.assignee)
        if (assignee !== person) continue
        const status = ex?.status ?? 'Not run'
        if (status === 'Passed') counts.passed += 1
        else if (status === 'Failed') counts.failed += 1
        else if (status === 'Blocked') counts.blocked += 1
        else if (status === 'Not run') counts.notRun += 1
        if (hideCompleted && DONE_STATUSES.has(status)) continue
        rows.push({ caseId, caseKey: c.caseKey ?? caseId, title: c.title, status })
      }
      if (rows.length > 0 || counts.passed + counts.failed + counts.blocked + counts.notRun > 0) {
        result.push({ run, rows, counts })
      }
    }
    return result
  }, [activeRuns, getCase, person, hideCompleted, showClosed])

  const totalAssigned = groups.reduce(
    (n, g) => n + g.counts.passed + g.counts.failed + g.counts.blocked + g.counts.notRun,
    0,
  )

  return (
    <div className="view">
      <FreshTopbar
        breadcrumbs={[{ label: 'My Work' }]}
        subtitle={activeProject.name}
        searchPlaceholder="Search everything…"
      />
      <PrototypeBanner />
      <div className="mw-wrap">
        <div className="mw-controls">
          <label className="mw-ctl">
            <span className="mw-ctl-lbl">Work queue for</span>
            <select className="rp-select" value={person} onChange={(e) => setPerson(e.target.value)}>
              {TEAM_USERS.map((u) => (
                <option key={u} value={u}>
                  {u}
                  {u === actorTeamName ? ' (current actor)' : ''}
                </option>
              ))}
            </select>
          </label>
          {!actorTeamName ? (
            <span className="mw-note" title="Admin demo-actor names don't map 1:1 onto demo team assignee names">
              Current actor “{currentActor?.name}” has no matching team assignee — pick a team member.
            </span>
          ) : null}
          <label className="mw-check">
            <input type="checkbox" checked={hideCompleted} onChange={(e) => setHideCompleted(e.target.checked)} />
            Hide completed
          </label>
          <label className="mw-check">
            <input type="checkbox" checked={showClosed} onChange={(e) => setShowClosed(e.target.checked)} />
            Include closed runs
          </label>
          <span className="mw-total">{totalAssigned} assigned execution{totalAssigned === 1 ? '' : 's'}</span>
        </div>

        {groups.length === 0 ? (
          <div className="panel rp-empty">
            <i className="ti ti-clipboard-check" style={{ fontSize: 30, color: 'var(--text3)', opacity: 0.6 }} />
            <div style={{ fontSize: 15, fontWeight: 600 }}>Nothing in this queue</div>
            <div style={{ fontSize: 12, color: 'var(--text3)', maxWidth: 380 }}>
              No {showClosed ? '' : 'open '}run executions in {activeProject.name} are assigned to {person}.
            </div>
          </div>
        ) : (
          groups.map(({ run, rows, counts }) => {
            const s = runSummary(run)
            return (
              <div key={run.id} className="panel mw-run">
                <div className="pnl-hd">
                  <RunStatusInfographic
                    pass={s.passed}
                    fail={s.failed}
                    blocked={s.blocked}
                    notrun={s.notRun}
                    skipped={s.skipped}
                    size={Math.round(DONUT_CHART_SIZE * 0.55)}
                    compact
                    showCompleteLabel={false}
                  />
                  <div style={{ minWidth: 0 }}>
                    <div className="mw-run-name">
                      <span className="rp-runkey">{run.runKey}</span> {run.name}
                      {run.sealed ? <span className="pill p-notrun" style={{ fontSize: 9, padding: '0 5px', marginLeft: 6 }}>Closed</span> : null}
                    </div>
                    <div className="mw-run-counts">
                      <span style={{ color: 'var(--text3)' }}>○ {counts.notRun} not run</span>
                      <span style={{ color: 'var(--fail)' }}>✗ {counts.failed} failed</span>
                      <span style={{ color: 'var(--block)' }}>⊘ {counts.blocked} blocked</span>
                      <span style={{ color: 'var(--pass)' }}>✓ {counts.passed} passed</span>
                    </div>
                  </div>
                </div>
                <div className="mw-rows">
                  {rows.length === 0 ? (
                    <div className="mw-empty-row">All assigned cases in this run are completed.</div>
                  ) : (
                    rows.map((row) => (
                      <div key={row.caseId} className="mw-row">
                        <span className={`pill ${EXEC_PILL_MAP[row.status]}`} style={{ fontSize: 9, padding: '1px 6px', flexShrink: 0, minWidth: 54, textAlign: 'center' }}>
                          {row.status}
                        </span>
                        <span className="rp-runkey">{row.caseKey}</span>
                        <span className="mw-row-title">{row.title}</span>
                        <button
                          type="button"
                          className="btn btn-p"
                          style={{ fontSize: 10.5, padding: '2px 9px', marginLeft: 'auto', flexShrink: 0 }}
                          onClick={() => router.push(testRunCasePath(activeProject.key, run.runKey, row.caseKey))}
                        >
                          Continue <i className="ti ti-arrow-right" style={{ fontSize: 10 }} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
