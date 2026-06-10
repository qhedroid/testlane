'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FreshTopbar } from '../components/FreshTopbar'
import { useFresh } from '../data/FreshProvider'
import { DEFAULT_RUN, DEFECT_NAMES, RUN_CARDS } from '../data/seed'
import type { ExecCase, ResultStatus } from '../data/types'
import { DOT_MAP, GROUP_LABEL, GROUP_ORDER, PILL_LABEL, PILL_MAP, PRI_MAP } from '../data/ui-utils'
import { useFreshUI } from '../hooks/useFreshUI'

type FilterTab = 'all' | ResultStatus

const RMB_CLASS: Record<Exclude<ResultStatus, 'not_run'>, string> = {
  pass: 'rmb-p',
  fail: 'rmb-f',
  blocked: 'rmb-b',
  skip: 'rmb-s',
}

export function RunsScreen() {
  const { state, updateExecCase, isRunSealed, sealRun: sealRunAction, setCurrentRun } = useFresh()
  const { openShortcuts } = useFreshUI()
  const [filter, setFilter] = useState<FilterTab>('all')
  const [activeIdx, setActiveIdx] = useState(0)
  const [summaryCollapsed, setSummaryCollapsed] = useState(false)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const pickerRef = useRef<HTMLDivElement>(null)

  const run = RUN_CARDS.find((r) => r.id === state.currentRunId) ?? DEFAULT_RUN
  const execCases = state.execCases
  const active = execCases[activeIdx] ?? execCases[0]
  const sealed = isRunSealed

  const pctDone = Math.round(((run.total - run.notrun) / run.total) * 100)
  const passPct = Math.round((run.pass / run.total) * 100)
  const failPct = Math.round((run.fail / run.total) * 100)
  const blockPct = Math.round((run.blocked / run.total) * 100)

  const filteredGroups = useMemo(() => {
    return GROUP_ORDER.map((status) => ({
      status,
      cases: execCases
        .map((c, i) => ({ c, i }))
        .filter(({ c }) => {
          if (filter !== 'all' && filter !== status) return false
          return c.status === status
        }),
    })).filter((g) => g.cases.length > 0)
  }, [execCases, filter])

  const pickerRuns = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase()
    return q ? RUN_CARDS.filter((r) => r.name.toLowerCase().includes(q)) : RUN_CARDS
  }, [pickerQuery])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
        setPickerQuery('')
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const setResult = useCallback(
    (result: ResultStatus) => {
      if (sealed || result === 'not_run') return
      updateExecCase(activeIdx, { status: result })
    },
    [activeIdx, sealed, updateExecCase],
  )

  const clearResult = useCallback(() => {
    if (sealed) return
    updateExecCase(activeIdx, { status: 'not_run' })
  }, [activeIdx, sealed, updateExecCase])

  const setStepR = useCallback(
    (caseIdx: number, stepIdx: number, result: ResultStatus) => {
      if (sealed) return
      const c = execCases[caseIdx]
      const sr = [...c.sr]
      sr[stepIdx] = result
      updateExecCase(caseIdx, { sr })
    },
    [execCases, sealed, updateExecCase],
  )

  const linkDefect = useCallback(() => {
    if (sealed) return
    const c = execCases[activeIdx]
    const newId = `TI-${4420 + Math.floor(Math.random() * 80)}`
    updateExecCase(activeIdx, { defects: [...c.defects, newId] })
  }, [activeIdx, execCases, sealed, updateExecCase])

  const navCase = useCallback(
    (dir: number) => {
      let next = activeIdx + dir
      if (next < 0) next = 0
      if (next >= execCases.length) next = execCases.length - 1
      setActiveIdx(next)
    },
    [activeIdx, execCases.length],
  )

  const sealRun = useCallback(() => {
    if (isRunSealed) return
    sealRunAction()
  }, [isRunSealed, sealRunAction])

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return
      const k = e.key.toLowerCase()
      if (k === '?') {
        openShortcuts()
        return
      }
      const map: Record<string, ResultStatus> = { p: 'pass', f: 'fail', b: 'blocked', s: 'skip' }
      if (map[k]) setResult(map[k])
      if (k === 'j') navCase(1)
      if (k === 'k') navCase(-1)
      if (k === 'd') linkDefect()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [linkDefect, navCase, openShortcuts, setResult])

  if (!active) return null

  return (
    <div className="view">
      <FreshTopbar
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'TI-Core Platform' },
          { label: 'Test runs' },
        ]}
        showSearch={false}
        actions={
          <>
            <div className="autosave"><div className="as-dot" />Auto-saving</div>
            <div style={{ width: 1, height: 14, background: 'var(--border)' }} />
            <button type="button" className="btn"><i className="ti ti-filter" style={{ fontSize: 12 }} /> Filter</button>
            <button type="button" className="btn btn-p"><i className="ti ti-plus" style={{ fontSize: 12 }} /> New run</button>
          </>
        }
      />
      <div className="tr-lay">
        <div className="run-exec-toolbar">
          <div className="run-picker" ref={pickerRef}>
            <button type="button" className="run-picker-btn" onClick={() => setPickerOpen((v) => !v)}>
              <i className="ti ti-player-play" style={{ fontSize: 13, color: 'var(--accent)' }} />
              <span>{state.currentRunName}</span>
              <i className="ti ti-chevron-down" style={{ marginLeft: 'auto', color: 'var(--text3)' }} />
            </button>
            {pickerOpen ? (
              <div className="run-picker-menu open">
                <div className="run-picker-search">
                  <i className="ti ti-search" style={{ fontSize: 12, color: 'var(--text3)' }} />
                  <input
                    placeholder="Search runs..."
                    value={pickerQuery}
                    onChange={(e) => setPickerQuery(e.target.value)}
                    autoFocus
                  />
                </div>
                {pickerRuns.length === 0 ? (
                  <div style={{ padding: 14, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>No matching runs</div>
                ) : (
                  pickerRuns.map((r) => (
                    <div
                      key={r.id}
                      className={`run-choice${r.id === state.currentRunId ? ' on' : ''}`}
                      onClick={() => {
                        setCurrentRun(r.id, r.name)
                        setPickerOpen(false)
                        setPickerQuery('')
                      }}
                    >
                      <span className={`pill ${r.stalled ? 'p-block' : 'p-act'}`} style={{ fontSize: 10 }}>
                        {r.stalled ? 'Stalled' : 'Active'}
                      </span>
                      <div className="run-choice-main">
                        <div className="run-choice-title">{r.name}</div>
                        <div className="run-choice-meta">{r.plan} · {r.total} cases · {r.env}</div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            ) : null}
          </div>

          <div className="ec-ftab-bar" style={{ border: 0, padding: 0, background: 'transparent' }}>
            {(['all', 'not_run', 'fail', 'blocked'] as const).map((f) => (
              <div
                key={f}
                className={`ftab${filter === f ? ' on' : ''}`}
                onClick={() => setFilter(f)}
              >
                {f === 'all' ? 'All' : f === 'not_run' ? 'Not run' : f.charAt(0).toUpperCase() + f.slice(1)}
              </div>
            ))}
          </div>

          <div className={`run-summary-card${summaryCollapsed ? ' collapsed' : ''}`}>
            <button
              type="button"
              className="btn"
              style={{ padding: '2px 5px' }}
              title="Collapse summary"
              onClick={() => setSummaryCollapsed((v) => !v)}
            >
              <i className={`ti ${summaryCollapsed ? 'ti-chevron-down' : 'ti-chevron-up'}`} style={{ fontSize: 12 }} />
            </button>
            <div className="run-summary-details">
              <div className="summary-metric"><strong>{run.total - run.notrun}/{run.total}</strong><span>Executed</span></div>
              <div className="summary-metric" style={{ color: 'var(--pass)' }}><strong>{run.pass}</strong><span>Passed</span></div>
              <div className="summary-metric" style={{ color: 'var(--fail)' }}><strong>{run.fail}</strong><span>Failed</span></div>
              <div className="summary-metric" style={{ color: 'var(--block)' }}><strong>{run.blocked}</strong><span>Blocked</span></div>
              <div className="prog" style={{ width: 110, height: 6 }}>
                <div className="pg-p" style={{ width: `${passPct}%` }} />
                <div className="pg-f" style={{ width: `${failPct}%` }} />
                <div className="pg-b" style={{ width: `${blockPct}%` }} />
              </div>
            </div>
            {!sealed ? (
              <button type="button" className="seal-btn" onClick={sealRun}>
                <i className="ti ti-lock" style={{ fontSize: 12 }} /> Seal Run
              </button>
            ) : null}
          </div>
        </div>

        <div className="ec-pane">
          <div className="ec-run-hd">
            <div className="ec-rttl">{state.currentRunName}</div>
            <div className="ec-rmt">
              <span className={`pill ${sealed ? 'p-skip' : 'p-act'}`} style={{ fontSize: 10, padding: '1px 5px' }}>
                {sealed ? <><span className="pill-dot" />Sealed</> : <><span className="pill-dot" />Active</>}
              </span>
              <span>Due: {run.due}</span>
              <span>Plan: {run.plan}</span>
              {!sealed ? (
                <button type="button" className="seal-btn" style={{ marginLeft: 'auto' }} onClick={sealRun}>
                  <i className="ti ti-lock" style={{ fontSize: 12 }} /> Seal Run
                </button>
              ) : null}
            </div>
            <div className="ec-rpg" style={{ marginBottom: 3 }}>
              <span className="ec-rpt">{run.total - run.notrun} / {run.total}</span>
              <div className="prog" style={{ flex: 1, height: 4 }}>
                <div className="pg-p" style={{ width: `${passPct}%` }} />
                <div className="pg-f" style={{ width: `${failPct}%` }} />
                <div className="pg-b" style={{ width: `${blockPct}%` }} />
              </div>
              <span className="ec-rpt">{pctDone}%</span>
            </div>
            <div className="ec-rst">
              <span className="rst rst-p" style={{ fontSize: 10 }}>✓ {run.pass}</span>
              <span className="rst rst-f" style={{ fontSize: 10 }}>✗ {run.fail}</span>
              <span className="rst rst-b" style={{ fontSize: 10 }}>⊘ {run.blocked}</span>
              <span className="rst rst-n" style={{ fontSize: 10 }}>○ {run.notrun} Not run</span>
            </div>
          </div>
          <div className="ec-ftab-bar">
            {(['all', 'not_run', 'fail', 'blocked'] as const).map((f) => (
              <div key={f} className={`ftab${filter === f ? ' on' : ''}`} onClick={() => setFilter(f)}>
                {f === 'all' ? 'All' : f === 'not_run' ? 'Not run' : f.charAt(0).toUpperCase() + f.slice(1)}
              </div>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{run.total}</span>
          </div>
          <div className="ec-list">
            {filteredGroups.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>No cases match filter</div>
            ) : (
              filteredGroups.map((g) => (
                <div key={g.status}>
                  <div className="divider-lbl">{GROUP_LABEL[g.status]}</div>
                  {g.cases.map(({ c, i }) => (
                    <div
                      key={c.id}
                      className={`ec-case${activeIdx === i ? ' on' : ''}`}
                      onClick={() => setActiveIdx(i)}
                    >
                      <div className={`ec-dot ${DOT_MAP[c.status]}`} />
                      <div className="ec-info">
                        <div className="ec-cid">{c.id}</div>
                        <div className="ec-cnm">{c.title}</div>
                        <div className="ec-cby">{c.by}</div>
                      </div>
                      <span className={`pri ${PRI_MAP[c.pri]}`} style={{ fontSize: 9, padding: '1px 4px', marginTop: 3 }}>
                        {c.pri.slice(0, 4)}
                      </span>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="resizer-v" data-resize="run-list" data-min="380" data-max="760" />

        <div className="ed-pane">
          <ExecDetail
            c={active}
            caseIdx={activeIdx}
            sealed={sealed}
            showBanner={sealed}
            onNav={navCase}
            onResult={setResult}
            onClear={clearResult}
            onStepR={setStepR}
            onLinkDefect={linkDefect}
            onOpenShortcuts={openShortcuts}
          />
        </div>
      </div>
    </div>
  )
}

function ExecDetail({
  c,
  caseIdx,
  sealed,
  showBanner,
  onNav,
  onResult,
  onClear,
  onStepR,
  onLinkDefect,
  onOpenShortcuts,
}: {
  c: ExecCase
  caseIdx: number
  sealed: boolean
  showBanner: boolean
  onNav: (dir: number) => void
  onResult: (r: ResultStatus) => void
  onClear: () => void
  onStepR: (ci: number, si: number, r: ResultStatus) => void
  onLinkDefect: () => void
  onOpenShortcuts: () => void
}) {
  const statusClass = c.status === 'not_run' ? 'p-notrun' : PILL_MAP[c.status]
  const statusLabel = c.status === 'not_run' ? 'Not run' : PILL_LABEL[c.status]

  return (
    <>
      <div className="ed-hd">
        <div className="ed-top">
          <div>
            <div className="ed-id">{c.id}</div>
            <div className="ed-ttl">{c.title}</div>
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8 }}>
            <button type="button" className="btn" style={{ fontSize: 11, padding: '2px 7px' }} onClick={() => onNav(-1)}>
              <i className="ti ti-arrow-left" style={{ fontSize: 11 }} /> Prev
            </button>
            <button type="button" className="btn" style={{ fontSize: 11, padding: '2px 7px' }} onClick={() => onNav(1)}>
              Next <i className="ti ti-arrow-right" style={{ fontSize: 11 }} />
            </button>
          </div>
        </div>
        <div className="ed-mt">
          <span className={`pri ${PRI_MAP[c.pri]}`}>{c.pri.charAt(0).toUpperCase() + c.pri.slice(1)}</span>
          <span className="tag">ctms</span>
          <span className="tag">role-mapping</span>
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>Assigned: <strong>{c.by}</strong></span>
          <span style={{ marginLeft: 'auto' }}>
            <span className={`pill ${statusClass}`}><span className="pill-dot" />{statusLabel}</span>
          </span>
        </div>
      </div>
      <div className="ed-body">
        {showBanner ? (
          <div className="sealed-banner">
            <i className="ti ti-lock" />
            <div><strong>Run sealed</strong> — results are now immutable. Admins can reopen via Audit History with a recorded reason.</div>
          </div>
        ) : null}
        <div className="ed-precond">
          <div className="ed-sl">Preconditions</div>
          <div className="ed-pt">{c.precond}</div>
        </div>
        {c.steps.map((s, n) => {
          const sr = c.sr[n]
          return (
            <div key={n} className="esc">
              <div className="esc-hd">
                <span className="esc-n">Step {n + 1}</span>
                <span className="esc-ttl">{s.a.length > 52 ? `${s.a.slice(0, 52)}…` : s.a}</span>
                <div className="esc-btns">
                  {(['pass', 'fail', 'blocked', 'skip'] as const).map((r) => (
                    <div
                      key={r}
                      className={`srb srb-${r[0]}${sr === r ? ' on' : ''}`}
                      onClick={() => !sealed && onStepR(caseIdx, n, r)}
                      style={sealed ? { pointerEvents: 'none', opacity: 0.4 } : undefined}
                    >
                      {r[0].toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>
              <div className="esc-body">
                <div className="esc-act">{s.a}</div>
                <div className="esc-exp">Expected: {s.e}</div>
                <textarea
                  className="esc-cmt"
                  rows={1}
                  placeholder="Step comment… (optional)"
                  defaultValue={sr === 'fail' && n === 0 && caseIdx === 0 ? 'Viewer permission is saved on submit but reverts to previous value after profile reload.' : ''}
                  readOnly={sealed}
                />
              </div>
            </div>
          )
        })}
        <div className="ed-defects">
          <div className="ed-sl">Linked defects</div>
          {c.defects.map((d) => (
            <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span className="ed-dtag"><i className="ti ti-bug" style={{ fontSize: 10 }} />{d}</span>
              <span style={{ fontSize: 11, color: 'var(--text2)' }}>{DEFECT_NAMES[d] || 'Open defect'}</span>
              <button type="button" className="btn" style={{ fontSize: 10, padding: '1px 4px', marginLeft: 'auto', color: 'var(--text3)' }}>
                <i className="ti ti-x" style={{ fontSize: 10 }} />
              </button>
            </div>
          ))}
          <div className="ed-dlink" onClick={onLinkDefect} style={sealed ? { pointerEvents: 'none', opacity: 0.4 } : undefined}>
            <i className="ti ti-plus" style={{ fontSize: 12 }} /> Link defect <span className="kbd">D</span>
          </div>
        </div>
      </div>
      <div className="ed-foot">
        <span className="ed-rl">Result:</span>
        <div className="ed-rbs">
          {(['pass', 'fail', 'blocked', 'skip'] as const).map((r) => (
            <div
              key={r}
              className={`${RMB_CLASS[r]}${c.status === r ? ' on' : ''}`}
              onClick={() => !sealed && onResult(r)}
              style={sealed ? { pointerEvents: 'none', opacity: 0.4 } : undefined}
            >
              {r[0].toUpperCase()} {r === 'pass' ? 'Pass' : r === 'fail' ? 'Fail' : r === 'blocked' ? 'Blocked' : 'Skip'}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onClear}
          disabled={sealed}
          style={{
            padding: '3px 8px',
            border: '1px solid var(--border)',
            background: 'transparent',
            borderRadius: 4,
            fontSize: 11,
            color: 'var(--text3)',
            cursor: sealed ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            marginLeft: 4,
            opacity: sealed ? 0.4 : 1,
          }}
          title="Reset to Not run"
        >
          ↩ Clear
        </button>
      </div>
      <div className="sc-bar">
        <div className="sc-h"><span className="kbd">P</span>Pass</div>
        <div className="sc-h"><span className="kbd">F</span>Fail</div>
        <div className="sc-h"><span className="kbd">B</span>Blocked</div>
        <div className="sc-h"><span className="kbd">S</span>Skip</div>
        <div className="sc-h"><span className="kbd">D</span>Defect</div>
        <div className="sc-h"><span className="kbd">J/K</span>Navigate</div>
        <div className="sc-h" style={{ marginLeft: 'auto' }}>
          <span className="kbd" style={{ cursor: 'pointer' }} onClick={onOpenShortcuts}>?</span>&nbsp;Shortcuts
        </div>
      </div>
    </>
  )
}
