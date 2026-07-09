'use client'

import Link from 'next/link'
import { FreshTopbar } from '../components/FreshTopbar'
import { useProjectHref } from '../hooks/useProjectHref'

const KPI = [
  { label: 'Assigned Cases', value: '9', tone: undefined },
  { label: 'Not Run Yet', value: '3', tone: undefined },
  { label: 'Blocked', value: '1', tone: 'warn' as const },
  { label: 'Defects to Verify', value: '1', tone: undefined },
]

const QUEUE_GROUPS = [
  {
    id: 'R-31',
    name: 'CTMS Regression — Sprint 44',
    frac: '4 / 9',
    items: [
      { tc: 'TC-1004', title: 'Role mapping persists after save', status: 'Not run', statusClass: 'pill p-notrun', dot: 'var(--text3)' },
      { tc: 'TC-1006', title: 'Audit trail entry on permission change', status: 'Failed', statusClass: 'pill p-fail', dot: 'var(--fail)' },
    ],
  },
  {
    id: 'R-29',
    name: 'Login Hardening',
    frac: '2 / 4',
    items: [
      { tc: 'TC-103', title: 'SSO redirect preserves return URL', status: 'Blocked', statusClass: 'pill p-block', dot: 'var(--block)' },
      { tc: 'TC-107', title: 'Session timeout warning modal', status: 'Not run', statusClass: 'pill p-notrun', dot: 'var(--text3)' },
    ],
  },
]

const DEFECTS = [
  {
    id: 'DEF-23',
    title: 'Viewer permission not persisted after role mapping',
    why: 'Assigned to you for verification',
    severity: 'Critical',
    sevClass: 'pri pr-crit',
  },
  {
    id: 'TI-4421',
    title: 'Run summary export omits skipped execution rows',
    why: 'You reported the original failure',
    severity: 'High',
    sevClass: 'pri pr-high',
  },
  {
    id: 'TI-4422',
    title: 'Reporting export blocked while run data is syncing',
    why: 'Watcher on linked run R-31',
    severity: 'High',
    sevClass: 'pri pr-high',
  },
]

export function MyWorkScreen() {
  const projectHref = useProjectHref()

  return (
    <div className="view">
      <FreshTopbar breadcrumbs={[{ label: 'My Work' }]} showSearch={false} />

      <div className="screen-wrap">
        <div className="page-head">
          <div>
            <h1>My Work</h1>
            <div className="sub">Everything waiting on you · 9 cases across 4 runs</div>
          </div>
        </div>

        <div className="kpi-strip">
          {KPI.map((tile) => (
            <div key={tile.label} className="kpi-tile">
              <div className="kpi-lbl">{tile.label}</div>
              <div className={`kpi-val${tile.tone === 'warn' ? ' kpi-warn' : ''}`}>{tile.value}</div>
            </div>
          ))}
        </div>

        <div className="mywork-grid">
          <div className="panel mywork-panel">
            <h3 className="panel-h3">Your Test Queue</h3>
            <div className="panel-body-pad">
              {QUEUE_GROUPS.map((group) => (
                <div key={group.id} className="mywork-run-group">
                  <div className="mywork-run-hd">
                    <span className="mono-muted">{group.id}</span>
                    <span className="mywork-run-name">{group.name}</span>
                    <span className="mywork-run-frac">{group.frac}</span>
                    <span style={{ flex: 1 }} />
                    <Link href={projectHref('testruns')} className="btn mywork-mini-btn">
                      <i className="ti ti-player-play" aria-hidden />
                      Continue
                    </Link>
                  </div>
                  {group.items.map((item) => (
                    <div key={item.tc} className="screen-row">
                      <span className="sdot" style={{ background: item.dot }} />
                      <span className="mono-muted mywork-tc">{item.tc}</span>
                      <span className="mywork-case-title">{item.title}</span>
                      <span className={item.statusClass}>
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
              ))}
            </div>
          </div>

          <div className="panel mywork-panel">
            <h3 className="panel-h3">Defects Involving You</h3>
            <div className="panel-body-pad">
              {DEFECTS.map((d) => (
                <div key={d.id} className="screen-row mywork-def-row">
                  <span className="mono-muted mywork-def-id">{d.id}</span>
                  <div className="mywork-def-body">
                    <div className="mywork-def-title">{d.title}</div>
                    <div className="mywork-def-why">{d.why}</div>
                  </div>
                  <span className={d.sevClass}>{d.severity}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
