'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { TestlaneTopbar } from '@/components/shell/TestlaneTopbar'
import { useDemo } from '@/lib/demo/DemoProvider'
import { DEFECT_NAMES } from '@/lib/demo/seed'
import { dotClass, makeSpawnedRun, priorityClass, runTotal, statusPillClass } from '@/lib/demo/store'
import type { ExecCase, ResultStatus, TestRun } from '@/lib/demo/types'

type CaseFilter = 'all' | ResultStatus

const STATUS_BTNS: { value: ResultStatus; label: string; cls: string }[] = [
  { value: 'pass', label: 'P Pass', cls: 'rmb-p' },
  { value: 'fail', label: 'F Fail', cls: 'rmb-f' },
  { value: 'blocked', label: 'B Blocked', cls: 'rmb-b' },
  { value: 'skip', label: 'S Skip', cls: 'rmb-s' },
]

const GROUP_ORDER: ResultStatus[] = ['fail', 'blocked', 'not_run', 'pass', 'skip']
const GROUP_LABELS: Record<ResultStatus, string> = {
  fail: 'Failing',
  blocked: 'Blocked',
  not_run: 'Not run',
  pass: 'Passed',
  skip: 'Skipped',
}

function pillLabel(status: ResultStatus): string {
  const map: Record<ResultStatus, string> = {
    pass: '✓ Pass',
    fail: '✗ Fail',
    blocked: '⊘ Blocked',
    skip: '→ Skip',
    not_run: '○ Not run',
  }
  return map[status]
}

export function DemoRunsScreen() {
  const { state, dispatch } = useDemo()
  const [selectedRunId, setSelectedRunId] = useState(state.runs[0]?.id ?? '')
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [caseFilter, setCaseFilter] = useState<CaseFilter>('all')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerSearch, setPickerSearch] = useState('')
  const [summaryCollapsed, setSummaryCollapsed] = useState(false)
  const [showNewRun, setShowNewRun] = useState(false)
  const [newRunName, setNewRunName] = useState('')
  const [sealedBanner, setSealedBanner] = useState(false)

  const run = useMemo(
    () => state.runs.find((r) => r.id === selectedRunId) ?? state.runs[0],
    [state.runs, selectedRunId],
  )

  const isSealed = run?.status === 'sealed'

  const filteredRuns = useMemo(() => {
    const q = pickerSearch.trim().toLowerCase()
    if (!q) return state.runs
    return state.runs.filter((r) => r.name.toLowerCase().includes(q))
  }, [state.runs, pickerSearch])

  const filteredCases = useMemo(() => {
    if (!run) return []
    return run.cases.filter((c) => caseFilter === 'all' || c.status === caseFilter)
  }, [run, caseFilter])

  const groupedCases = useMemo(() => {
    const groups: { status: ResultStatus; cases: ExecCase[] }[] = []
    for (const status of GROUP_ORDER) {
      const cases = filteredCases.filter((c) => c.status === status)
      if (cases.length) groups.push({ status, cases })
    }
    return groups
  }, [filteredCases])

  const selectedCase = useMemo(() => {
    if (!run || !selectedCaseId) return null
    return run.cases.find((c) => c.id === selectedCaseId) ?? null
  }, [run, selectedCaseId])

  const flatFiltered = useMemo(() => groupedCases.flatMap((g) => g.cases), [groupedCases])
  const selectedIndex = selectedCase
    ? flatFiltered.findIndex((c) => c.id === selectedCase.id)
    : -1

  const totals = run ? runTotal(run) : 0
  const executed = run ? run.pass + run.fail + run.blocked + (run.skipped ?? 0) : 0

  const updateCase = useCallback(
    (caseId: string, patch: Partial<ExecCase>) => {
      if (!run || isSealed) return
      dispatch({ type: 'UPDATE_RUN_CASE', runId: run.id, caseId, patch })
    },
    [dispatch, run, isSealed],
  )

  function setCaseStatus(status: ResultStatus) {
    if (!selectedCase || !run || isSealed) return
    dispatch({ type: 'SET_RUN_CASE_STATUS', runId: run.id, caseId: selectedCase.id, status })
  }

  function setStepResult(stepIndex: number, status: ResultStatus) {
    if (!selectedCase || !run || isSealed) return
    dispatch({ type: 'SET_STEP_RESULT', runId: run.id, caseId: selectedCase.id, stepIndex, status })
  }

  function linkDefect() {
    if (!selectedCase || !run || isSealed) return
    const id = `TI-${4400 + Math.floor(Math.random() * 99)}`
    dispatch({ type: 'LINK_DEFECT', runId: run.id, caseId: selectedCase.id, defectId: id })
  }

  function clearResult() {
    if (!selectedCase || !run || isSealed) return
    dispatch({ type: 'SET_RUN_CASE_STATUS', runId: run.id, caseId: selectedCase.id, status: 'not_run' })
  }

  function sealRun() {
    if (!run || isSealed) return
    dispatch({ type: 'SEAL_RUN', runId: run.id })
    setSealedBanner(true)
  }

  function createRun() {
    const plan = state.plans[0]
    if (!plan) return
    const spawned = makeSpawnedRun(plan.id, state, newRunName.trim() || undefined)
    dispatch({ type: 'SPAWN_RUN', planId: plan.id, run: spawned })
    setSelectedRunId(spawned.id)
    setShowNewRun(false)
    setNewRunName('')
    setSealedBanner(false)
  }

  function pickRun(r: TestRun) {
    setSelectedRunId(r.id)
    setSelectedCaseId(null)
    setPickerOpen(false)
    setSealedBanner(r.status === 'sealed')
  }

  useEffect(() => {
    setSealedBanner(run?.status === 'sealed')
  }, [run?.id, run?.status])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (!selectedCase || isSealed) return
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const key = e.key.toLowerCase()
      if (key === 'p') setCaseStatus('pass')
      if (key === 'f') setCaseStatus('fail')
      if (key === 'b') setCaseStatus('blocked')
      if (key === 's') setCaseStatus('skip')
      if (key === 'd') linkDefect()
      if (key === 'j' && selectedIndex < flatFiltered.length - 1) {
        setSelectedCaseId(flatFiltered[selectedIndex + 1].id)
      }
      if (key === 'k' && selectedIndex > 0) {
        setSelectedCaseId(flatFiltered[selectedIndex - 1].id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  if (!run) return <p className="tr-empty">No runs available.</p>

  return (
    <div className="view-screen">
      <TestlaneTopbar
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'TI-Core Platform' },
          { label: 'Test runs' },
        ]}
        showSearch={false}
        actions={
          <>
            <span className="autosave"><span className="as-dot" />Auto-saving</span>
            <span className="topbar-divider" />
            <button type="button" className="relay-btn">
              <i className="ti ti-filter" /> Filter
            </button>
            <button type="button" className="relay-btn relay-btn-primary" onClick={() => setShowNewRun(true)}>
              <i className="ti ti-plus" /> New run
            </button>
          </>
        }
      />

      <div className="tr-lay tr-lay-new">
        <div className="run-exec-toolbar">
          <div className="run-picker">
            <button type="button" className="run-picker-btn" onClick={() => setPickerOpen((v) => !v)}>
              <i className="ti ti-player-play" />
              <span id="run-picker-label">{run.name}</span>
              <i className="ti ti-chevron-down" />
            </button>
            {pickerOpen ? (
              <div className="run-picker-menu open">
                <div className="run-picker-search">
                  <i className="ti ti-search" />
                  <input
                    type="text"
                    placeholder="Search runs..."
                    value={pickerSearch}
                    onChange={(e) => setPickerSearch(e.target.value)}
                  />
                </div>
                <div id="run-picker-list">
                  {filteredRuns.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className={`run-choice${r.id === run.id ? ' on' : ''}`}
                      onClick={() => pickRun(r)}
                    >
                      <div className="run-choice-main">
                        <div className="run-choice-title">{r.name}</div>
                        <div className="run-choice-meta">{r.environment} · {r.status}</div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="ec-ftab-bar toolbar-ftabs">
            {(['all', 'not_run', 'fail', 'blocked'] as CaseFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                className={`ftab${caseFilter === f ? ' on' : ''}`}
                onClick={() => setCaseFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'not_run' ? 'Not run' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
          </div>

          <div className={`run-summary-card${summaryCollapsed ? ' collapsed' : ''}`}>
            <button type="button" className="relay-btn relay-btn-icon" onClick={() => setSummaryCollapsed((v) => !v)}>
              <i className={`ti ti-chevron-${summaryCollapsed ? 'down' : 'up'}`} />
            </button>
            <div className="run-summary-details">
              <div className="summary-metric">
                <strong>{executed}/{totals}</strong>
                <span>Executed</span>
              </div>
              <div className="summary-metric pass">
                <strong>{run.pass}</strong>
                <span>Passed</span>
              </div>
              <div className="summary-metric fail">
                <strong>{run.fail}</strong>
                <span>Failed</span>
              </div>
              <div className="summary-metric block">
                <strong>{run.blocked}</strong>
                <span>Blocked</span>
              </div>
              <div className="prog prog-thin" style={{ width: 110 }}>
                {run.pass > 0 ? <div className="pg-p" style={{ width: `${totals ? (run.pass / totals) * 100 : 0}%` }} /> : null}
                {run.fail > 0 ? <div className="pg-f" style={{ width: `${totals ? (run.fail / totals) * 100 : 0}%` }} /> : null}
                {run.blocked > 0 ? <div className="pg-b" style={{ width: `${totals ? (run.blocked / totals) * 100 : 0}%` }} /> : null}
              </div>
            </div>
            {!isSealed ? (
              <button type="button" className="seal-btn" onClick={sealRun}>
                <i className="ti ti-lock" /> Seal Run
              </button>
            ) : null}
          </div>
        </div>

        <div className="ec-pane ec-pane-new">
          <div className="ec-list">
            {groupedCases.length === 0 ? (
              <div className="ec-empty">No cases match filter</div>
            ) : (
              groupedCases.map((group) => (
                <div key={group.status}>
                  <div className="divider-lbl">{GROUP_LABELS[group.status]}</div>
                  {group.cases.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`ec-case${selectedCaseId === c.id ? ' on' : ''}`}
                      onClick={() => setSelectedCaseId(c.id)}
                    >
                      <span className={dotClass(c.status)} />
                      <div className="ec-info">
                        <div className="ec-cid">{c.id}</div>
                        <div className="ec-cnm">{c.title}</div>
                        <div className="ec-cby">{c.assignedTo}</div>
                      </div>
                      <span className={`ec-pri ${priorityClass(c.priority)}`}>{c.priority.slice(0, 4)}</span>
                    </button>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="resizer-v" aria-hidden />

        {selectedCase ? (
          <div className="ed-pane ed-pane-new">
            <div className="ed-hd">
              <div className="ed-top">
                <div>
                  <div className="ed-id">{selectedCase.id}</div>
                  <div className="ed-ttl">{selectedCase.title}</div>
                </div>
                <div className="ed-nav">
                  <button type="button" className="relay-btn" disabled={selectedIndex <= 0} onClick={() => setSelectedCaseId(flatFiltered[selectedIndex - 1]?.id ?? null)}>
                    <i className="ti ti-arrow-left" /> Prev
                  </button>
                  <button type="button" className="relay-btn" disabled={selectedIndex >= flatFiltered.length - 1} onClick={() => setSelectedCaseId(flatFiltered[selectedIndex + 1]?.id ?? null)}>
                    Next <i className="ti ti-arrow-right" />
                  </button>
                </div>
              </div>
              <div className="ed-mt">
                <span className={priorityClass(selectedCase.priority)}>{selectedCase.priority}</span>
                {selectedCase.tags?.map((t) => <span key={t} className="tag">{t}</span>)}
                <span>Assigned: <strong>{selectedCase.assignedTo}</strong></span>
                <span className={statusPillClass(selectedCase.status)} style={{ marginLeft: 'auto' }}>
                  <span className="pill-dot" />
                  {pillLabel(selectedCase.status)}
                </span>
              </div>
            </div>

            <div className="ed-body" id="ed-body">
              {sealedBanner ? (
                <div className="sealed-banner">
                  <i className="ti ti-lock" />
                  <div>
                    <strong>Run sealed</strong> — results are now immutable. Admins can reopen via Audit History with a recorded reason.
                  </div>
                </div>
              ) : null}

              <div className="ed-precond">
                <div className="ed-sl">Preconditions</div>
                <div className="ed-pt">{selectedCase.preconditions}</div>
              </div>

              <div className="ed-steps-wrap">
                {selectedCase.steps.map((step, i) => (
                  <div key={i} className="esc">
                    <div className="esc-hd">
                      <span className="esc-n">Step {i + 1}</span>
                      <span className="esc-ttl">{step.action}</span>
                      <div className="esc-btns">
                        {(['pass', 'fail', 'blocked', 'skip'] as ResultStatus[]).map((s) => (
                          <button
                            key={s}
                            type="button"
                            className={`srb srb-${s[0]}${selectedCase.stepResults[i] === s ? ' on' : ''}`}
                            disabled={isSealed}
                            onClick={() => setStepResult(i, s)}
                          >
                            {s[0].toUpperCase()}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="esc-body">
                      <div className="esc-act">{step.action}</div>
                      <div className="esc-exp">Expected: {step.expected}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="ed-defects">
                <div className="ed-sl">Linked defects</div>
                <div id="ed-defect-list">
                  {selectedCase.defects.map((d) => (
                    <div key={d} className="defect-link-row">
                      <span className="ed-dtag"><i className="ti ti-bug" />{d}</span>
                      <span>{DEFECT_NAMES[d] ?? 'Open defect'}</span>
                    </div>
                  ))}
                </div>
                {!isSealed ? (
                  <button type="button" className="ed-dlink" onClick={linkDefect}>
                    <i className="ti ti-plus" /> Link defect <span className="kbd">D</span>
                  </button>
                ) : null}
              </div>
            </div>

            <div className="ed-foot">
              <span className="ed-rl">Result:</span>
              <div className="ed-rbs">
                {STATUS_BTNS.map((btn) => (
                  <button
                    key={btn.value}
                    type="button"
                    className={`rmb ${btn.cls}${selectedCase.status === btn.value ? ' on' : ''}`}
                    disabled={isSealed}
                    onClick={() => setCaseStatus(btn.value)}
                  >
                    {btn.label}
                  </button>
                ))}
              </div>
              {!isSealed ? (
                <button type="button" className="clear-result-btn" onClick={clearResult} title="Reset to Not run">
                  ↩ Clear
                </button>
              ) : null}
            </div>

            <div className="sc-bar">
              <span className="sc-h"><span className="kbd">P</span>Pass</span>
              <span className="sc-h"><span className="kbd">F</span>Fail</span>
              <span className="sc-h"><span className="kbd">B</span>Blocked</span>
              <span className="sc-h"><span className="kbd">S</span>Skip</span>
              <span className="sc-h"><span className="kbd">D</span>Defect</span>
              <span className="sc-h"><span className="kbd">J/K</span>Navigate</span>
            </div>
          </div>
        ) : (
          <div className="ed-pane ed-pane-empty ed-pane-new">
            <p className="tr-empty">Select a case to view execution detail.</p>
          </div>
        )}
      </div>

      {showNewRun ? (
        <div className="modal-backdrop" onClick={() => setShowNewRun(false)}>
          <div className="create-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="create-hd"><strong>New test run</strong></div>
            <div className="create-body">
              <div className="form-field">
                <label htmlFor="new-run-name">Run name (optional)</label>
                <input id="new-run-name" value={newRunName} onChange={(e) => setNewRunName(e.target.value)} placeholder="Sprint 45 Regression" />
              </div>
              <p className="modal-hint">Spawns from {state.plans[0]?.title ?? 'first plan'}</p>
            </div>
            <div className="create-foot">
              <button type="button" className="relay-btn" onClick={() => setShowNewRun(false)}>Cancel</button>
              <button type="button" className="relay-btn relay-btn-primary" onClick={createRun}>Create run</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
