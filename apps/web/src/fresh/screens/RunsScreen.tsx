'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFresh } from '../data/FreshProvider'
import { DEFAULT_RUN, DEFECT_NAMES, MODULES, RUN_CARDS, RUN_PICKER_LIST } from '../data/seed'
import type { ExecCase, ResultStatus } from '../data/types'
import { DOT_MAP, GROUP_LABEL, GROUP_ORDER, PILL_LABEL, PILL_MAP, PRI_MAP } from '../data/ui-utils'
import { useFreshUI } from '../hooks/useFreshUI'

type FilterTab = 'all' | ResultStatus
type EdTab = 'details' | 'steps' | 'activity' | 'history' | 'comments' | 'defects'

const RMB_CLASS: Record<Exclude<ResultStatus, 'not_run'>, string> = {
  pass: 'rmb-p',
  fail: 'rmb-f',
  blocked: 'rmb-b',
  skip: 'rmb-s',
}

const PICKER_PILL: Record<string, { cls: string; lbl: string }> = {
  act: { cls: 'p-act', lbl: 'Active' },
  stalled: { cls: 'p-block', lbl: 'Stalled' },
  sealed: { cls: 'p-pass', lbl: 'Sealed' },
}

const ED_TABS: { id: EdTab; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'steps', label: 'Steps' },
  { id: 'activity', label: 'Activity' },
  { id: 'history', label: 'History' },
  { id: 'comments', label: 'Comments' },
  { id: 'defects', label: 'Defects' },
]

export function RunsScreen() {
  const { state, updateExecCase, setCurrentRun } = useFresh()
  const { openShortcuts } = useFreshUI()
  const [module, setModule] = useState(state.module)
  const [projOpen, setProjOpen] = useState(false)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [runSearch, setRunSearch] = useState('')
  const [activeIdx, setActiveIdx] = useState(0)
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const [priHidden, setPriHidden] = useState(false)
  const [edTab, setEdTab] = useState<EdTab>('details')
  const [edVisible, setEdVisible] = useState(true)
  const [edFullscreen, setEdFullscreen] = useState(false)
  const projRef = useRef<HTMLDivElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const ecPaneRef = useRef<HTMLDivElement>(null)

  const run = RUN_CARDS.find((r) => r.id === state.currentRunId) ?? DEFAULT_RUN
  const execCases = state.execCases
  const active = execCases[activeIdx] ?? execCases[0]

  const passPct = Math.round((run.pass / run.total) * 100)
  const failPct = Math.round((run.fail / run.total) * 100)
  const blockPct = Math.round((run.blocked / run.total) * 100)
  const pctDone = Math.round(((run.total - run.notrun) / run.total) * 100)

  const pickerRuns = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase()
    return q ? RUN_PICKER_LIST.filter((r) => r.name.toLowerCase().includes(q)) : RUN_PICKER_LIST
  }, [pickerQuery])

  const filteredGroups = useMemo(() => {
    const sq = runSearch.trim().toLowerCase()
    return GROUP_ORDER.map((status) => ({
      status,
      cases: execCases
        .map((c, i) => ({ c, i }))
        .filter(({ c }) => {
          if (filter !== 'all' && filter !== status) return false
          if (sq && !c.id.toLowerCase().includes(sq) && !c.title.toLowerCase().includes(sq)) return false
          return c.status === status
        }),
    })).filter((g) => g.cases.length > 0)
  }, [execCases, filter, runSearch])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (projRef.current && !projRef.current.contains(e.target as Node)) setProjOpen(false)
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
        setPickerQuery('')
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    const handle = document.getElementById('rh-ec')
    const pane = ecPaneRef.current
    if (!handle || !pane) return

    function onDown(e: MouseEvent) {
      if (e.target !== handle && !handle!.contains(e.target as Node)) return
      e.preventDefault()
      handle!.classList.add('dragging')
      const startX = e.clientX
      const startW = pane!.getBoundingClientRect().width

      function onMove(ev: MouseEvent) {
        const w = Math.max(220, Math.min(420, startW + (ev.clientX - startX)))
        pane!.style.width = `${w}px`
      }

      function onUp() {
        handle!.classList.remove('dragging')
        document.removeEventListener('mousemove', onMove)
        document.removeEventListener('mouseup', onUp)
      }

      document.addEventListener('mousemove', onMove)
      document.addEventListener('mouseup', onUp)
    }

    handle.addEventListener('mousedown', onDown)
    return () => handle.removeEventListener('mousedown', onDown)
  }, [])

  const setResult = useCallback(
    (result: ResultStatus) => {
      if (result === 'not_run') return
      updateExecCase(activeIdx, { status: result })
    },
    [activeIdx, updateExecCase],
  )

  const clearResult = useCallback(() => {
    updateExecCase(activeIdx, { status: 'not_run' })
  }, [activeIdx, updateExecCase])

  const setStepR = useCallback(
    (caseIdx: number, stepIdx: number, result: ResultStatus) => {
      const c = execCases[caseIdx]
      const sr = [...c.sr]
      sr[stepIdx] = result
      updateExecCase(caseIdx, { sr })
    },
    [execCases, updateExecCase],
  )

  const linkDefect = useCallback(() => {
    const c = execCases[activeIdx]
    const newId = `TI-${4420 + Math.floor(Math.random() * 80)}`
    updateExecCase(activeIdx, { defects: [...c.defects, newId] })
    setEdTab('defects')
  }, [activeIdx, execCases, updateExecCase])

  const navCase = useCallback(
    (dir: number) => {
      let next = activeIdx + dir
      if (next < 0) next = 0
      if (next >= execCases.length) next = execCases.length - 1
      setActiveIdx(next)
      setEdVisible(true)
    },
    [activeIdx, execCases.length],
  )

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
    <div className={`view runs-v12${priHidden ? ' pri-hidden' : ''}`}>
      <div className="topbar">
        <div className="proj-switcher" ref={projRef}>
          <button type="button" className="proj-btn" onClick={() => setProjOpen((v) => !v)}>
            <i className="ti ti-apps" style={{ fontSize: 14, color: 'var(--accent)' }} />
            <span className="pn">{module}</span>
            <i className="ti ti-chevron-down" style={{ fontSize: 10, opacity: 0.5 }} />
          </button>
          {projOpen ? (
            <div className="proj-dd open">
              <div className="proj-dd-hd">Switch project</div>
              {MODULES.map((name) => (
                <button
                  key={name}
                  type="button"
                  className={`proj-item${module === name ? ' active' : ''}`}
                  onClick={() => { setModule(name); setProjOpen(false) }}
                >
                  <i className={`ti ${module === name ? 'ti-check' : 'ti-square'}`} />
                  {name}
                </button>
              ))}
              <div className="proj-divider" />
              <div className="proj-action"><i className="ti ti-plus" style={{ fontSize: 13 }} />Create new project</div>
              <div className="proj-action" style={{ color: 'var(--text2)' }}>
                <i className="ti ti-settings" style={{ fontSize: 13, color: 'var(--text3)' }} />Project settings
              </div>
            </div>
          ) : null}
        </div>
        <div className="proj-sep" />
        <div className="bc">
          <Link href="/dashboard" className="bc-link">Dashboard</Link>
          <span className="sep">/</span>
          <span style={{ color: 'var(--accent)', fontSize: 11.5 }}>TI Platform</span>
          <span className="sep">/</span>
          <span className="cur">Test runs</span>
        </div>
        <div className="ta">
          <div className="autosave"><div className="as-dot" />Auto-saving</div>
          <div style={{ width: 1, height: 14, background: 'var(--border)' }} />
          <div
            className={`pri-toggle${priHidden ? ' off' : ' on'}`}
            onClick={() => setPriHidden((v) => !v)}
            title="Toggle priority labels"
          >
            <div className="pri-toggle-dot" />
            <span>Priorities</span>
          </div>
          <button type="button" className="btn"><i className="ti ti-filter" style={{ fontSize: 12 }} /> Filter</button>
          <button type="button" className="btn btn-p"><i className="ti ti-plus" style={{ fontSize: 12 }} /> New run</button>
        </div>
      </div>

      <div className="tr-lay">
        <div className="resize-handle" id="rh-ec" title="Drag to resize" />
        <div className="ec-pane" ref={ecPaneRef}>
          <div className="run-sel-bar" ref={pickerRef}>
            <button type="button" className="run-sel-btn" onClick={() => setPickerOpen((v) => !v)}>
              <i className="ti ti-player-play" style={{ fontSize: 11, color: 'var(--accent)' }} />
              <span className="run-sel-name">{state.currentRunName}</span>
              <i className="ti ti-chevron-down" style={{ fontSize: 10, opacity: 0.5, flexShrink: 0 }} />
            </button>
            {pickerOpen ? (
              <div className="run-sel-dd open">
                <div className="run-sel-search">
                  <i className="ti ti-search" />
                  <input
                    type="text"
                    placeholder="Search runs…"
                    value={pickerQuery}
                    onChange={(e) => setPickerQuery(e.target.value)}
                    autoFocus
                  />
                </div>
                <div className="run-sel-list">
                  {pickerRuns.map((r) => {
                    const pill = PICKER_PILL[r.status] ?? PICKER_PILL.act
                    return (
                      <div
                        key={r.id}
                        className={`run-sel-item${r.id === state.currentRunId ? ' on' : ''}`}
                        onClick={() => {
                          setCurrentRun(r.id, r.name)
                          setPickerOpen(false)
                          setPickerQuery('')
                        }}
                      >
                        <span className={`pill ${pill.cls}`} style={{ fontSize: 9.5, padding: '1px 5px', flexShrink: 0 }}>
                          {pill.lbl}
                        </span>
                        <span className="rsi-name">{r.name}</span>
                        <span className="rsi-meta">{r.pct}% · {r.cases}</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>

          <div className="ec-run-hd">
            <div className="ec-rttl">{state.currentRunName}</div>
            <div className="ec-rmt">
              <span className="pill p-act" style={{ fontSize: 10, padding: '1px 5px' }}>Active</span>
              <span>Due: {run.due}</span>
              <span>Plan: {run.plan}</span>
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

          <div className="run-search-bar">
            <input
              className="run-search-input"
              type="text"
              placeholder="Search cases in this run…"
              value={runSearch}
              onChange={(e) => setRunSearch(e.target.value)}
            />
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
                      onClick={() => { setActiveIdx(i); setEdVisible(true) }}
                    >
                      <div className={`ec-dot ${DOT_MAP[c.status]}`} />
                      <div className="ec-info">
                        <div className="ec-cid">{c.id}</div>
                        <div className="ec-cnm">{c.title}</div>
                        <div className="ec-cby">{c.by}</div>
                      </div>
                      <span className={`pri ec-pri ${PRI_MAP[c.pri]}`} style={{ fontSize: 9, padding: '1px 4px', marginTop: 3 }}>
                        {c.pri.slice(0, 4)}
                      </span>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </div>

        {edVisible ? (
          <div className={`ed-pane${edFullscreen ? ' fs' : ''}`}>
            <ExecDetailPane
              c={active}
              caseIdx={activeIdx}
              tab={edTab}
              onTab={setEdTab}
              onNav={navCase}
              onResult={setResult}
              onClear={clearResult}
              onStepR={setStepR}
              onLinkDefect={linkDefect}
              onOpenShortcuts={openShortcuts}
              onClose={() => setEdVisible(false)}
              onToggleFs={() => setEdFullscreen((v) => !v)}
              fullscreen={edFullscreen}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ExecDetailPane({
  c,
  caseIdx,
  tab,
  onTab,
  onNav,
  onResult,
  onClear,
  onStepR,
  onLinkDefect,
  onOpenShortcuts,
  onClose,
  onToggleFs,
  fullscreen,
}: {
  c: ExecCase
  caseIdx: number
  tab: EdTab
  onTab: (t: EdTab) => void
  onNav: (dir: number) => void
  onResult: (r: ResultStatus) => void
  onClear: () => void
  onStepR: (ci: number, si: number, r: ResultStatus) => void
  onLinkDefect: () => void
  onOpenShortcuts: () => void
  onClose: () => void
  onToggleFs: () => void
  fullscreen: boolean
}) {
  const statusClass = c.status === 'not_run' ? 'p-notrun' : PILL_MAP[c.status]
  const statusLabel = c.status === 'not_run' ? 'Not run' : PILL_LABEL[c.status]
  const lastLbl: Record<ResultStatus, string> = {
    pass: 'Passed', fail: 'Failed', blocked: 'Blocked', not_run: 'Not run', skip: 'Skipped',
  }

  return (
    <>
      <div className="ed-hd">
        <div className="ed-top">
          <div>
            <div className="ed-id">{c.id}</div>
            <div className="ed-ttl">{c.title}</div>
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0, marginLeft: 8, alignItems: 'center' }}>
            <button type="button" className="btn" style={{ fontSize: 11, padding: '2px 7px' }} onClick={() => onNav(-1)}>
              <i className="ti ti-arrow-left" style={{ fontSize: 11 }} /> Prev
            </button>
            <button type="button" className="btn" style={{ fontSize: 11, padding: '2px 7px' }} onClick={() => onNav(1)}>
              Next <i className="ti ti-arrow-right" style={{ fontSize: 11 }} />
            </button>
            <button type="button" className="ed-fs-btn" onClick={onToggleFs} title="Toggle fullscreen">
              <i className={`ti ${fullscreen ? 'ti-minimize' : 'ti-maximize'}`} />
            </button>
            <button type="button" className="ed-close-btn" onClick={onClose} title="Close panel">
              <i className="ti ti-x" />
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

      <div className="ed-tab-bar">
        {ED_TABS.map((t) => (
          <div key={t.id} className={`ed-tab${tab === t.id ? ' on' : ''}`} onClick={() => onTab(t.id)}>
            {t.label}
          </div>
        ))}
      </div>

      <div className={`ed-tp${tab === 'details' ? ' on' : ''}`}>
        <div className="ed-precond">
          <div className="ed-sl">Preconditions</div>
          <div className="ed-pt">{c.precond}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 5, padding: '8px 10px' }}>
          <div className="ed-sl" style={{ marginBottom: 7 }}>Metadata</div>
          <div className="ed-meta-grid">
            <div><div className="ed-ml">Priority</div><div className="ed-mv"><span className={`pri ${PRI_MAP[c.pri]}`}>{c.pri}</span></div></div>
            <div><div className="ed-ml">Type</div><div className="ed-mv">Functional</div></div>
            <div><div className="ed-ml">Assigned to</div><div className="ed-mv">{c.by}</div></div>
            <div><div className="ed-ml">Suite</div><div className="ed-mv">CTMS</div></div>
            <div><div className="ed-ml">Automation</div><div className="ed-mv">Manual</div></div>
            <div><div className="ed-ml">Last result</div><div className="ed-mv">{lastLbl[c.status]}</div></div>
          </div>
        </div>
      </div>

      <div className={`ed-tp${tab === 'steps' ? ' on' : ''}`}>
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
                      onClick={() => onStepR(caseIdx, n, r)}
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
                />
              </div>
            </div>
          )
        })}
      </div>

      <div className={`ed-tp${tab === 'activity' ? ' on' : ''}`}>
        <div className="ed-act-item">
          <div className="ed-act-av" style={{ background: '#185FA5' }}>AR</div>
          <div className="ed-act-body">
            <strong>Aisha Rahman</strong> marked Step 1 as <span style={{ color: 'var(--fail)' }}>Failed</span>
            <div className="ed-act-time">Today at 14:32 · CTMS Regression — Sprint 44</div>
          </div>
        </div>
        <div className="ed-act-item">
          <div className="ed-act-av" style={{ background: '#2E7D32' }}>SS</div>
          <div className="ed-act-body">
            <strong>Shaun Sevume</strong> added comment: &ldquo;Reproduced on both UAT and staging. Role sync delay suspected.&rdquo;
            <div className="ed-act-time">Today at 13:58</div>
          </div>
        </div>
      </div>

      <div className={`ed-tp${tab === 'history' ? ' on' : ''}`}>
        <div className="ed-hist-item">
          <div className="ed-hist-dot" style={{ background: 'var(--fail)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>Result: Failed</div>
            <div style={{ fontSize: 10.5, color: 'var(--text3)' }}>Sprint 44 · Aisha Rahman · Today</div>
          </div>
        </div>
        <div className="ed-hist-item">
          <div className="ed-hist-dot" style={{ background: 'var(--pass)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>Result: Passed</div>
            <div style={{ fontSize: 10.5, color: 'var(--text3)' }}>Sprint 43 · Marcus Webb · 16d ago</div>
          </div>
        </div>
      </div>

      <div className={`ed-tp${tab === 'comments' ? ' on' : ''}`}>
        <div className="ed-act-item">
          <div className="ed-act-av" style={{ background: '#2E7D32' }}>SS</div>
          <div className="ed-act-body">
            <strong>Shaun Sevume</strong>: &ldquo;Reproduced on both UAT and staging. Role sync delay suspected after the permission mapper update.&rdquo;
            <div className="ed-act-time">Today at 13:58</div>
          </div>
        </div>
        <div style={{ marginTop: 8 }}>
          <textarea className="ed-comment-input" placeholder="Add a comment…" />
          <div style={{ marginTop: 4, textAlign: 'right' }}>
            <button type="button" className="btn btn-p" style={{ fontSize: 11, padding: '2px 8px' }}>Save comment</button>
          </div>
        </div>
      </div>

      <div className={`ed-tp${tab === 'defects' ? ' on' : ''}`}>
        <div className="ed-defects">
          {c.defects.map((d) => (
            <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span className="ed-dtag"><i className="ti ti-bug" style={{ fontSize: 10 }} />{d}</span>
              <span style={{ fontSize: 11, color: 'var(--text2)' }}>{DEFECT_NAMES[d] || 'Open defect'}</span>
            </div>
          ))}
          <div className="ed-dlink" onClick={onLinkDefect}>
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
              onClick={() => onResult(r)}
            >
              {r[0].toUpperCase()} {r === 'pass' ? 'Pass' : r === 'fail' ? 'Fail' : r === 'blocked' ? 'Blocked' : 'Skip'}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={onClear}
          style={{
            padding: '3px 8px',
            border: '1px solid var(--border)',
            background: 'transparent',
            borderRadius: 4,
            fontSize: 11,
            color: 'var(--text3)',
            cursor: 'pointer',
            whiteSpace: 'nowrap',
            marginLeft: 4,
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
