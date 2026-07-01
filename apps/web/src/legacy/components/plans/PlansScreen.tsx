'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState } from 'react'
import { RelayTopbar } from '@/components/shell/RelayTopbar'
import { useDemo } from '@/lib/demo/DemoProvider'
import { makeSpawnedRun, nextId, statusPillClass } from '@/lib/demo/store'
import type { TestPlan } from '@/lib/demo/types'

type PlanTab = 'overview' | 'suites' | 'runs'

export function PlansScreen() {
  const { state, dispatch } = useDemo()
  const router = useRouter()
  const [selectedId, setSelectedId] = useState(state.plans[0]?.id ?? '')
  const [tab, setTab] = useState<PlanTab>('overview')
  const [showNewPlan, setShowNewPlan] = useState(false)
  const [newTitle, setNewTitle] = useState('')

  const plan = useMemo(
    () => state.plans.find((p) => p.id === selectedId) ?? state.plans[0],
    [state.plans, selectedId],
  )

  const activePlans = state.plans.filter((p) => p.status === 'active')
  const draftPlans = state.plans.filter((p) => p.status === 'draft')

  function spawnRun(p: TestPlan) {
    const run = makeSpawnedRun(p.id, state)
    dispatch({ type: 'SPAWN_RUN', planId: p.id, run })
    router.push('/runs')
  }

  function createPlan() {
    const title = newTitle.trim()
    if (!title) return
    const id = nextId('PLAN', state.nextPlanNum)
    const newPlan: TestPlan = {
      id,
      title,
      status: 'draft',
      cases: 0,
      description: 'New test plan — add description and suites.',
      environment: 'UAT',
      owner: 'Shaun Sevume',
      createdBy: 'Shaun Sevume',
      createdAt: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
      suiteCount: '0 suites',
      modules: [],
      spawnedRuns: [],
      runsSpawned: 0,
    }
    dispatch({ type: 'ADD_PLAN', plan: newPlan })
    setSelectedId(id)
    setShowNewPlan(false)
    setNewTitle('')
  }

  if (!plan) return null

  const avgPass = plan.modules.filter((m) => m.passRate !== null).map((m) => m.passRate as number)
  const avgPassRate = avgPass.length ? Math.round(avgPass.reduce((a, b) => a + b, 0) / avgPass.length) : null

  return (
    <div className="view-screen">
      <RelayTopbar
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'TI-Core Platform' },
          { label: 'Test plans' },
        ]}
        actions={
            <button type="button" className="relay-btn relay-btn-primary" onClick={() => setShowNewPlan(true)}>
              <i className="ti ti-plus" /> New plan
            </button>
        }
      />

      <div className="tp-lay">
        <aside className="tp-list-pane">
          <div className="tpl-hd">
            <i className="ti ti-clipboard-list" style={{ fontSize: 13, color: 'var(--relay-muted)' }} />
            <span className="st-ttl">Plans</span>
            <span className="pnl-ct">{state.plans.length}</span>
          </div>
          <div className="tpl-body">
            <div className="divider-lbl">Active</div>
            {activePlans.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`tpl-item${plan.id === p.id ? ' on' : ''}`}
                onClick={() => { setSelectedId(p.id); setTab('overview') }}
              >
                <div className="tpl-nm">{p.title}</div>
                <div className="tpl-mt">
                  <span className={statusPillClass('active')}>Active</span>
                  <span className="tmono muted">{p.cases} cases</span>
                </div>
                <div className="rl-pg">
                  <div className="prog prog-thin">
                    <div className="pg-p" style={{ width: `${avgPassRate ?? 70}%` }} />
                  </div>
                  <span className="rl-pt">{p.spawnedRuns.length} runs</span>
                </div>
              </button>
            ))}
            <div className="divider-lbl">Draft</div>
            {draftPlans.map((p) => (
              <button
                key={p.id}
                type="button"
                className={`tpl-item${plan.id === p.id ? ' on' : ''}`}
                onClick={() => { setSelectedId(p.id); setTab('overview') }}
              >
                <div className="tpl-nm">{p.title}</div>
                <div className="tpl-mt">
                  <span className={statusPillClass('draft')}>Draft</span>
                  <span className="tmono muted">{p.cases} cases</span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        <div className="tp-detail">
          <div className="tpd-hd">
            <div className="tpd-ttl">{plan.title}</div>
            <div className="tpd-meta">
              <span className={statusPillClass(plan.status === 'active' ? 'active' : 'draft')}>
                <span className="pill-dot" />
                {plan.status === 'active' ? 'Active' : 'Draft'}
              </span>
              <span>Environment: {plan.environment}</span>
              <span>Owner: {plan.owner}</span>
              <span className="tpd-cases-count">{plan.cases} cases · {plan.suiteCount}</span>
            </div>
            <p className="tpd-desc">{plan.description}</p>
          </div>
          <div className="nav-tab-bar">
            {([
              { id: 'overview' as PlanTab, label: 'Overview' },
              { id: 'suites' as PlanTab, label: 'Included suites' },
              { id: 'runs' as PlanTab, label: 'Run history' },
            ]).map((t) => (
              <button key={t.id} type="button" className={`nav-tab${tab === t.id ? ' on' : ''}`} onClick={() => setTab(t.id)}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="tpd-body">
            <div className={`tp-tab-pane${tab === 'overview' ? ' on' : ''}`}>
              <div className="tp-overview-grid">
                <div className="tp-stat"><strong>{plan.cases}</strong><span>Cases</span></div>
                <div className="tp-stat"><strong>{plan.modules.length}</strong><span>Suites</span></div>
                <div className="tp-stat"><strong>{avgPassRate ?? '—'}{avgPassRate ? '%' : ''}</strong><span>Avg pass</span></div>
                <div className="tp-stat"><strong>{plan.spawnedRuns.length}</strong><span>Runs</span></div>
              </div>
              <div className="tpd-panel">
                <div className="tpd-panel-hd">
                  <i className="ti ti-chart-donut" style={{ fontSize: 13, color: 'var(--relay-accent)' }} />
                  <span className="tpd-panel-title">Coverage / metrics</span>
                  <span style={{ fontSize: 10.5, color: 'var(--relay-muted)', marginLeft: 'auto' }}>Release validation readiness</span>
                </div>
                <div className="cov-grid">
                  {plan.modules.map((m) => (
                    <div key={m.name}>
                      <div className="cov-lbl">{m.name.split(' — ')[0]}</div>
                      <div className="cov-bar">
                        <div
                          className="cov-fill"
                          style={{
                            width: `${m.passRate ?? 0}%`,
                            background: m.passRate !== null && m.passRate < 75 ? '#C62828' : m.passRate !== null && m.passRate < 85 ? '#E65100' : '#2E7D32',
                          }}
                        />
                      </div>
                      <div className="cov-pct">{m.passRate ?? 0}%</div>
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
                  <i className="ti ti-folder" style={{ fontSize: 13, color: 'var(--relay-accent)' }} />
                  <span className="tpd-panel-title">Included suites</span>
                  <span className="pnl-ct">{plan.suiteCount}</span>
                </div>
                {plan.modules.map((m) => (
                  <div key={m.name} className="tp-module-row">
                    <span className="tp-mod-name">{m.name}</span>
                    <span className="tp-mod-count">{m.count} cases</span>
                    {m.passRate !== null ? (
                      <span className={statusPillClass(m.passRate >= 80 ? 'pass' : 'fail')}>{m.passRate}% pass</span>
                    ) : (
                      <span className="pill p-not_run">Not run</span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className={`tp-tab-pane${tab === 'runs' ? ' on' : ''}`}>
              <div className="tpd-panel">
                <div className="tpd-panel-hd">
                  <i className="ti ti-history" style={{ fontSize: 13, color: 'var(--relay-muted)' }} />
                  <span className="tpd-panel-title">Run history</span>
                  <span className="pnl-ct">{plan.spawnedRuns.length} runs</span>
                </div>
                {plan.spawnedRuns.length ? plan.spawnedRuns.map((r) => (
                  <div key={r.id} className="tp-run-row">
                    <span className={statusPillClass(r.status === 'active' ? 'active' : 'pass')}>
                      {r.status === 'active' ? 'Active' : 'Sealed'}
                    </span>
                    <span className="tp-run-name">{r.name}</span>
                    <span className="tp-run-date">{r.meta}</span>
                    {r.status === 'active' ? (
                      <Link href="/runs" className="relay-btn relay-btn-sm">Open →</Link>
                    ) : null}
                  </div>
                )) : (
                  <div className="tp-empty">No runs yet — spawn a run to begin execution.</div>
                )}
              </div>
            </div>
          </div>

          <div className="tpd-cta">
            <button type="button" className="relay-btn relay-btn-primary" onClick={() => spawnRun(plan)}>
              <i className="ti ti-player-play" /> Spawn new run from this plan
            </button>
            <button type="button" className="relay-btn"><i className="ti ti-edit" /> Edit plan</button>
            <button type="button" className="relay-btn"><i className="ti ti-copy" /> Clone plan</button>
          </div>
        </div>
      </div>

      {showNewPlan ? (
        <div className="modal-backdrop" onClick={() => setShowNewPlan(false)}>
          <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
            <h3>New test plan</h3>
            <label>
              Title
              <input value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Plan title" />
            </label>
            <div className="modal-actions">
              <button type="button" className="relay-btn" onClick={() => setShowNewPlan(false)}>Cancel</button>
              <button type="button" className="relay-btn relay-btn-primary" onClick={createPlan}>Create</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
