'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { FreshTopbar } from '../components/FreshTopbar'
import { PLANS } from '../data/seed'
import type { DemoPlan } from '../data/types'

type PlanTab = 'overview' | 'suites' | 'runs'

function planStatusPill(status: DemoPlan['status']) {
  if (status === 'draft') return 'p-draft'
  return 'p-act'
}

function avgPass(modules: DemoPlan['modules']) {
  const passes = modules.map((m) => m.pass).filter((p): p is number => p !== null)
  if (!passes.length) return '-'
  return `${Math.round(passes.reduce((a, b) => a + b, 0) / passes.length)}%`
}

export function PlansScreen() {
  const [selIdx, setSelIdx] = useState(0)
  const [tab, setTab] = useState<PlanTab>('overview')
  const plan = PLANS[selIdx]

  const activePlans = PLANS.filter((p) => p.status === 'active')
  const draftPlans = PLANS.filter((p) => p.status === 'draft')

  const coverage = useMemo(
    () =>
      plan.modules.map((m) => {
        const short = m.name.replace(/^.*? — /, '')
        const color =
          m.pass === null
            ? 'var(--border2)'
            : m.pass >= 80
              ? '#2E7D32'
              : m.pass >= 70
                ? '#E65100'
                : '#C62828'
        return { short, pass: m.pass, color }
      }),
    [plan.modules],
  )

  return (
    <div className="view">
      <FreshTopbar
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'TI-Core Platform' },
          { label: 'Test plans' },
        ]}
        searchPlaceholder="Search plans…"
        searchWidth={200}
        actions={
          <button type="button" className="btn btn-p"><i className="ti ti-plus" style={{ fontSize: 12 }} /> New plan</button>
        }
      />
      <div className="tp-lay">
        <div className="tp-list-pane">
          <div className="tpl-hd">
            <i className="ti ti-clipboard-list" style={{ fontSize: 13, color: 'var(--text2)' }} />
            <span className="st-ttl">Plans</span>
            <span className="pnl-ct">{PLANS.length}</span>
          </div>
          <div className="tpl-body">
            <div className="divider-lbl">Active</div>
            {activePlans.map((p) => {
              const idx = PLANS.indexOf(p)
              const passPct = p.modules.find((m) => m.pass !== null)?.pass ?? 0
              return (
                <div
                  key={p.title}
                  className={`tpl-item${selIdx === idx ? ' on' : ''}`}
                  onClick={() => setSelIdx(idx)}
                >
                  <div className="tpl-nm">{p.title}</div>
                  <div className="tpl-mt">
                    <span className="pill p-act" style={{ fontSize: 10, padding: '1px 5px' }}>Active</span>
                    <span style={{ fontSize: 9.5, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{p.cases} cases</span>
                  </div>
                  <div className="rl-pg">
                    <div className="prog" style={{ flex: 1, height: 3 }}>
                      <div className="pg-p" style={{ width: `${passPct}%` }} />
                    </div>
                    <span className="rl-pt">{p.runs.length} runs</span>
                  </div>
                </div>
              )
            })}
            <div className="divider-lbl">Draft</div>
            {draftPlans.map((p) => {
              const idx = PLANS.indexOf(p)
              return (
                <div
                  key={p.title}
                  className={`tpl-item${selIdx === idx ? ' on' : ''}`}
                  onClick={() => setSelIdx(idx)}
                >
                  <div className="tpl-nm">{p.title}</div>
                  <div className="tpl-mt">
                    <span className="pill p-draft" style={{ fontSize: 10, padding: '1px 5px' }}>Draft</span>
                    <span style={{ fontSize: 9.5, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{p.cases} cases</span>
                  </div>
                  <div className="rl-pg">
                    <div className="prog" style={{ flex: 1, height: 3 }} />
                    <span className="rl-pt">{p.runs.length} runs</span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="resizer-v" data-resize="plan-list" data-min="190" data-max="360" />

        <div className="tp-detail">
          <div className="tpd-hd">
            <div className="tpd-ttl">{plan.title}</div>
            <div className="tpd-meta">
              <span className={`pill ${planStatusPill(plan.status)}`}>
                <span className="pill-dot" />
                {plan.status === 'draft' ? 'Draft' : 'Active'}
              </span>
              <span><i className="ti ti-server" style={{ fontSize: 12 }} /> Environment: {plan.env}</span>
              <span><i className="ti ti-user" style={{ fontSize: 12 }} /> Owner: {plan.owner}</span>
              <span style={{ marginLeft: 'auto', fontFamily: 'var(--mono)', fontSize: 11, color: 'var(--text3)' }}>
                {plan.cases} cases across {plan.suiteCt}
              </span>
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{plan.desc}</div>
          </div>

          <div className="nav-tab-bar">
            {(['overview', 'suites', 'runs'] as const).map((t) => (
              <div key={t} className={`nav-tab${tab === t ? ' on' : ''}`} onClick={() => setTab(t)}>
                {t === 'suites' ? 'Included suites' : t === 'runs' ? 'Run history' : 'Overview'}
              </div>
            ))}
          </div>

          <div className="tpd-body">
            <div className={`tp-tab-pane${tab === 'overview' ? ' on' : ''}`}>
              <div className="tp-overview-grid">
                <div className="tp-stat"><strong>{plan.cases}</strong><span>Cases</span></div>
                <div className="tp-stat"><strong>{plan.modules.length}</strong><span>Suites</span></div>
                <div className="tp-stat"><strong>{avgPass(plan.modules)}</strong><span>Avg pass</span></div>
                <div className="tp-stat"><strong>{plan.runs.length}</strong><span>Runs</span></div>
              </div>
              <div className="tpd-panel">
                <div className="tpd-panel-hd">
                  <i className="ti ti-chart-donut" style={{ fontSize: 13, color: 'var(--accent)' }} />
                  <span className="tpd-panel-title">Coverage / metrics</span>
                  <span style={{ fontSize: 10.5, color: 'var(--text3)', marginLeft: 'auto' }}>Release validation readiness</span>
                </div>
                <div className="cov-grid">
                  {coverage.map((c) => (
                    <div key={c.short}>
                      <div className="cov-lbl">{c.short}</div>
                      <div className="cov-bar">
                        <div className="cov-fill" style={{ width: `${c.pass ?? 0}%`, background: c.color }} />
                      </div>
                      <div className="cov-pct">{c.pass !== null ? `${c.pass}%` : 'Not run'}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="validation-note">
                <strong>Validation involvement:</strong> 2-3 QA users validate sample real workflows weekly, focused on execution, search, folders, run sealing, and clear acceptance criteria for MVP readiness.
              </div>
            </div>

            <div className={`tp-tab-pane${tab === 'suites' ? ' on' : ''}`}>
              <div className="tpd-panel">
                <div className="tpd-panel-hd">
                  <i className="ti ti-folder" style={{ fontSize: 13, color: 'var(--accent)' }} />
                  <span className="tpd-panel-title">Included suites</span>
                  <span className="pnl-ct">{plan.suiteCt}</span>
                </div>
                {plan.modules.map((m) => (
                  <div key={m.name} className="tp-module-row">
                    <span className="tp-mod-name">{m.name}</span>
                    <span className="tp-mod-count">{m.ct} cases</span>
                    {m.pass !== null ? (
                      <span className={`pill ${m.pass >= 80 ? 'p-pass' : 'p-fail'}`} style={{ fontSize: 10 }}>{m.pass}% pass</span>
                    ) : (
                      <span className="pill p-notrun" style={{ fontSize: 10 }}>Not run</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className={`tp-tab-pane${tab === 'runs' ? ' on' : ''}`}>
              <div className="tpd-panel">
                <div className="tpd-panel-hd">
                  <i className="ti ti-history" style={{ fontSize: 13, color: 'var(--text2)' }} />
                  <span className="tpd-panel-title">Run history</span>
                  <span className="pnl-ct">{plan.runs.length} runs</span>
                </div>
                {plan.runs.map((r) => (
                  <div key={r.name} className="tp-run-row">
                    <span className={`pill ${r.status === 'act' ? 'p-act' : 'p-pass'}`} style={{ fontSize: 10 }}>
                      {r.status === 'act' ? 'Active' : 'Sealed'}
                    </span>
                    <span className="tp-run-name">{r.name}</span>
                    <span className="tp-run-date">{r.meta}</span>
                    {r.status === 'act' ? (
                      <Link href="/runs" className="btn" style={{ fontSize: 10.5, padding: '2px 7px' }}>Open →</Link>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="tpd-cta">
            <Link href="/runs" className="btn btn-p"><i className="ti ti-player-play" style={{ fontSize: 13 }} /> Spawn new run from this plan</Link>
            <button type="button" className="btn"><i className="ti ti-edit" style={{ fontSize: 12 }} /> Edit plan</button>
            <button type="button" className="btn"><i className="ti ti-copy" style={{ fontSize: 12 }} /> Clone plan</button>
          </div>
        </div>
      </div>
    </div>
  )
}
