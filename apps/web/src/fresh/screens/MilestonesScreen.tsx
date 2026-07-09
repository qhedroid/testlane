'use client'

import { FreshTopbar } from '../components/FreshTopbar'
import { PrototypeBanner } from '../components/PrototypeBanner'

const MILESTONES = [
  {
    name: 'UAT Sign-Off',
    status: 'In progress',
    statusClass: 'pill p-act',
    due: 'Due 18 Jul',
    desc: 'Gate release 2.4.1 — CTMS and viewer modules must pass regression with zero critical defects.',
    frac: '68%',
    segs: [
      { w: '52%', color: 'var(--pass)' },
      { w: '10%', color: 'var(--fail)' },
      { w: '6%', color: 'var(--block)' },
    ],
    runs: [
      { id: 'R-31', name: 'CTMS Regression — Sprint 44', status: 'Active', statusClass: 'pill p-act', pw: '54%', fw: '18%', bw: '5%', frac: '71/132' },
      { id: 'R-29', name: 'Login Hardening', status: 'Active', statusClass: 'pill p-act', pw: '50%', fw: '8%', bw: '0%', frac: '12/24' },
    ],
  },
  {
    name: 'eTMF Workflow Beta',
    status: 'On track',
    statusClass: 'pill p-pass',
    due: 'Due 25 Jul',
    desc: 'Document upload and classification flows ready for pilot sites.',
    frac: '80%',
    segs: [
      { w: '80%', color: 'var(--pass)' },
      { w: '5%', color: 'var(--fail)' },
    ],
    runs: [
      { id: 'R-28', name: 'eTMF Document Workflow Smoke — Pre-release', status: 'Active', statusClass: 'pill p-act', pw: '80%', fw: '10%', bw: '0%', frac: '32/40' },
    ],
  },
  {
    name: 'Reporting Integration',
    status: 'At risk',
    statusClass: 'pill p-block',
    due: 'Due 12 Jul',
    desc: 'Export and sync defects blocking sign-off — needs attention before milestone closes.',
    frac: '61%',
    segs: [
      { w: '45%', color: 'var(--pass)' },
      { w: '15%', color: 'var(--fail)' },
      { w: '3%', color: 'var(--block)' },
    ],
    runs: [
      { id: 'R-27', name: 'Reporting Module — Integration Suite', status: 'Active', statusClass: 'pill p-act', pw: '61%', fw: '15%', bw: '3%', frac: '49/80' },
    ],
  },
  {
    name: 'Sprint 43 Regression Archive',
    status: 'Complete',
    statusClass: 'pill p-pass',
    due: 'Closed 28 Apr',
    desc: 'Sealed regression run — reference baseline for Sprint 44 comparisons.',
    frac: '100%',
    segs: [{ w: '100%', color: 'var(--pass)' }],
    runs: [
      { id: 'R-26', name: 'Sprint 43 — Full Regression', status: 'Sealed', statusClass: 'pill p-notrun', pw: '100%', fw: '0%', bw: '0%', frac: '128/128' },
    ],
  },
]

export function MilestonesScreen() {
  return (
    <div className="view">
      <FreshTopbar breadcrumbs={[{ label: 'Milestones' }]} showSearch={false} />
      <PrototypeBanner />

      <div className="screen-wrap">
        <div className="page-head">
          <div>
            <h1>Milestones</h1>
            <div className="sub">Demo · 4 milestones · 1 overdue</div>
          </div>
        </div>

        {MILESTONES.map((m) => (
          <div key={m.name} className="panel milestones-card">
            <div className="milestones-card-hd">
              <i className="ti ti-flag milestones-flag" aria-hidden />
              <h3>{m.name}</h3>
              <span className={m.statusClass}>
                <span className="pill-dot" />
                {m.status}
              </span>
              <span style={{ flex: 1 }} />
              <span className="milestones-due">{m.due}</span>
            </div>
            <p className="milestones-desc">{m.desc}</p>
            <div className="milestones-prog-row">
              <div className="milestones-prog">
                {m.segs.map((seg, i) => (
                  <span key={i} style={{ width: seg.w, background: seg.color }} />
                ))}
              </div>
              <span className="milestones-prog-lbl">{m.frac} executed</span>
            </div>
            <div className="milestones-runs">
              {m.runs.map((run) => (
                <div key={run.id} className="screen-row milestones-run-row">
                  <span className="mono-muted milestones-run-id">{run.id}</span>
                  <span className="milestones-run-name">{run.name}</span>
                  <span className={run.statusClass}>
                    <span className="pill-dot" />
                    {run.status}
                  </span>
                  <div className="milestones-mini-bar">
                    <span style={{ width: run.pw, background: 'var(--pass)' }} />
                    <span style={{ width: run.fw, background: 'var(--fail)' }} />
                    <span style={{ width: run.bw, background: 'var(--block)' }} />
                  </div>
                  <span className="milestones-run-frac">{run.frac}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
