'use client'

import Link from 'next/link'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFresh } from '../data/FreshProvider'
import type { Case, ExecStatus } from '../data/demo-model'
import { commentCount, EXEC_STATUS_LABEL, formatRelativeTime, runSummary } from '../data/demo-model'
import { DONUT_CHART_SIZE } from '../data/ui-utils'
import { RunStatusInfographic } from '../components/RunStatusInfographic'
import { DEFECT_NAMES, MODULES, RUN_PICKER_LIST } from '../data/seed'
import { PRIORITY_TO_LEGACY } from '../data/demo-model'
import { EXEC_DOT_MAP, EXEC_PILL_LABEL, EXEC_PILL_MAP, PRI_MAP } from '../data/ui-utils'
import { displayAssigneeName, normalizeAssigneeName, TEAM_USERS } from '../data/team-users'
import { PrototypeBanner } from '../components/PrototypeBanner'
import { useFreshUI } from '../hooks/useFreshUI'

type FilterTab = 'all' | ExecStatus
type EdTab = 'details' | 'steps' | 'activity' | 'history' | 'comments' | 'defects'

const RMB_CLASS: Record<Exclude<ExecStatus, 'Not run'>, string> = {
  Passed: 'rmb-p',
  Failed: 'rmb-f',
  Blocked: 'rmb-b',
  Skipped: 'rmb-s',
}

const RMB_LABEL: Record<Exclude<ExecStatus, 'Not run'>, string> = {
  Passed: 'Pass',
  Failed: 'Fail',
  Blocked: 'Blocked',
  Skipped: 'Skipped',
}

function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) return true
  if (target.isContentEditable) return true
  return !!target.closest('input, textarea, select, [contenteditable="true"]')
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

const FILTER_TABS: { id: FilterTab; label: string }[] = [
  { id: 'all', label: 'All' },
  { id: 'Not run', label: 'Not run' },
  { id: 'Failed', label: 'Fail' },
  { id: 'Blocked', label: 'Blocked' },
]

interface RunCaseRow {
  caseId: string
  case: Case
  status: ExecStatus
  assignee: string
  comments: number
}

export function RunsScreen() {
  const {
    state,
    currentRun,
    getCase,
    updateExecution,
    addStepComment,
    addGeneralComment,
    setCurrentRun,
    isRunSealed,
  } = useFresh()
  const { openShortcuts } = useFreshUI()
  const [module, setModule] = useState(state.module)
  const [projOpen, setProjOpen] = useState(false)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [runSearch, setRunSearch] = useState('')
  const [activeCaseId, setActiveCaseId] = useState(currentRun.caseOrder[0] ?? '')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const [priHidden, setPriHidden] = useState(false)
  const [edTab, setEdTab] = useState<EdTab>('details')
  const [edVisible, setEdVisible] = useState(true)
  const [edFullscreen, setEdFullscreen] = useState(false)
  const projRef = useRef<HTMLDivElement>(null)
  const pickerRef = useRef<HTMLDivElement>(null)

  const summary = useMemo(() => runSummary(currentRun), [currentRun])

  const runRows: RunCaseRow[] = useMemo(() => {
    return currentRun.caseOrder
      .map((caseId) => {
        const caseData = getCase(caseId)
        if (!caseData) return null
        const ex = currentRun.executions[caseId]
        return {
          caseId,
          case: caseData,
          status: ex?.status ?? 'Not run',
          assignee: displayAssigneeName(ex?.assignee ?? caseData.assignee),
          comments: commentCount(caseData),
        }
      })
      .filter((r): r is RunCaseRow => r !== null)
  }, [currentRun, getCase])

  const active = getCase(activeCaseId)
  const activeEx = currentRun.executions[activeCaseId]

  const pickerRuns = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase()
    return state.runs
      .map((run) => {
        const meta = RUN_PICKER_LIST.find((r) => r.id === run.id)
        const s = runSummary(run)
        const pct = s.total ? Math.round(((s.total - s.notRun) / s.total) * 100) : 0
        return {
          id: run.id,
          name: run.name,
          status: run.sealed ? 'sealed' as const : (meta?.status ?? 'act'),
          pct,
          cases: s.total,
        }
      })
      .filter((r) => !q || r.name.toLowerCase().includes(q))
  }, [state.runs, pickerQuery])

  const filteredRows = useMemo(() => {
    const sq = runSearch.trim().toLowerCase()
    return runRows.filter((row) => {
      if (filter !== 'all' && row.status !== filter) return false
      if (sq && !row.case.id.toLowerCase().includes(sq) && !row.case.title.toLowerCase().includes(sq)) return false
      return true
    })
  }, [runRows, filter, runSearch])

  useEffect(() => {
    if (!currentRun.caseOrder.includes(activeCaseId)) {
      setActiveCaseId(currentRun.caseOrder[0] ?? '')
    }
  }, [currentRun, activeCaseId])

  useEffect(() => {
    setActiveCaseId(currentRun.caseOrder[0] ?? '')
    setFilter('all')
    setRunSearch('')
  }, [currentRun.id])

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

  const setResult = useCallback(
    (result: ExecStatus) => {
      if (result === 'Not run' || isRunSealed) return
      updateExecution(activeCaseId, { status: result })
    },
    [activeCaseId, updateExecution, isRunSealed],
  )

  const clearResult = useCallback(() => {
    if (isRunSealed) return
    updateExecution(activeCaseId, { status: 'Not run' })
  }, [activeCaseId, updateExecution, isRunSealed])

  const setStepR = useCallback(
    (caseId: string, stepId: string, result: ExecStatus) => {
      if (isRunSealed) return
      const ex = currentRun.executions[caseId] ?? { status: 'Not run' as ExecStatus, stepResults: {} }
      updateExecution(caseId, {
        stepResults: { ...ex.stepResults, [stepId]: result },
      })
    },
    [currentRun.executions, updateExecution, isRunSealed],
  )

  const linkDefect = useCallback(() => {
    if (isRunSealed || !activeEx) return
    const newId = `TI-${4420 + Math.floor(Math.random() * 80)}`
    updateExecution(activeCaseId, { defects: [...(activeEx.defects ?? []), newId] })
    setEdTab('defects')
  }, [activeCaseId, activeEx, updateExecution, isRunSealed])

  const navCase = useCallback(
    (dir: number) => {
      const idx = filteredRows.findIndex((r) => r.caseId === activeCaseId)
      const base = idx >= 0 ? idx : runRows.findIndex((r) => r.caseId === activeCaseId)
      const list = filter === 'all' && !runSearch.trim() ? runRows : filteredRows
      const pos = list.findIndex((r) => r.caseId === activeCaseId)
      const start = pos >= 0 ? pos : base
      let next = start + dir
      if (next < 0) next = 0
      if (next >= list.length) next = list.length - 1
      if (list[next]) setActiveCaseId(list[next].caseId)
      setEdVisible(true)
    },
    [activeCaseId, filteredRows, runRows, filter, runSearch],
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (isTypingTarget(e.target)) return
      if (isRunSealed) return
      const k = e.key.toLowerCase()
      if (k === '?') {
        openShortcuts()
        return
      }
      const map: Record<string, ExecStatus> = { p: 'Passed', f: 'Failed', b: 'Blocked', s: 'Skipped' }
      if (map[k]) setResult(map[k])
      if (k === 'j') navCase(1)
      if (k === 'k') navCase(-1)
      if (k === 'd') linkDefect()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [linkDefect, navCase, openShortcuts, setResult, isRunSealed])

  if (!active) return null

  const runMeta = RUN_PICKER_LIST.find((r) => r.id === currentRun.id)

  return (
    <div className={`view runs-v12${priHidden ? ' pri-hidden' : ''}`}>
      <PrototypeBanner>
        <strong>Frontend prototype.</strong> Shaun&apos;s v1.2 execution UI — in-memory demo data
        (resets on reload). MySQL-backed workspace:{' '}
        <Link href="/runs/api" className="bc-link">
          /runs/api
        </Link>
        .
      </PrototypeBanner>
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
          <div className={`pri-toggle${priHidden ? ' off' : ' on'}`} onClick={() => setPriHidden((v) => !v)} title="Toggle priority labels">
            <div className="pri-toggle-dot" />
            <span>Priorities</span>
          </div>
          <button type="button" className="btn"><i className="ti ti-filter" style={{ fontSize: 12 }} /> Filter</button>
          <button type="button" className="btn btn-p"><i className="ti ti-plus" style={{ fontSize: 12 }} /> New run</button>
        </div>
      </div>

      <div className="tr-lay">
        <div className="ec-pane">
          <div className="run-sel-bar" ref={pickerRef}>
            <button type="button" className="run-sel-btn" onClick={() => setPickerOpen((v) => !v)}>
              <i className="ti ti-player-play" style={{ fontSize: 11, color: 'var(--accent)' }} />
              <span className="run-sel-name">{currentRun.name}</span>
              <i className="ti ti-chevron-down" style={{ fontSize: 10, opacity: 0.5, flexShrink: 0 }} />
            </button>
            {pickerOpen ? (
              <div className="run-sel-dd open">
                <div className="run-sel-search">
                  <i className="ti ti-search" />
                  <input type="text" placeholder="Search runs…" value={pickerQuery} onChange={(e) => setPickerQuery(e.target.value)} autoFocus />
                </div>
                <div className="run-sel-list">
                  {pickerRuns.map((r) => {
                    const pill = PICKER_PILL[r.status] ?? PICKER_PILL.act
                    return (
                      <div
                        key={r.id}
                        className={`run-sel-item${r.id === currentRun.id ? ' on' : ''}`}
                        onClick={() => {
                          setCurrentRun(r.id)
                          setPickerOpen(false)
                          setPickerQuery('')
                        }}
                      >
                        <span className={`pill ${pill.cls}`} style={{ fontSize: 9.5, padding: '1px 5px', flexShrink: 0 }}>{pill.lbl}</span>
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
            <div className="ec-rttl">{currentRun.name}</div>
            <div className="ec-rmt">
              <span className={`pill ${isRunSealed ? 'p-pass' : 'p-act'}`} style={{ fontSize: 10, padding: '1px 5px' }}>{isRunSealed ? 'Sealed' : 'Active'}</span>
              {currentRun.due ? <span>Due: {currentRun.due}</span> : null}
              {currentRun.planName ? <span>Plan: {currentRun.planName}</span> : null}
            </div>
            <div className="ec-run-summary">
              <RunStatusInfographic
                pass={summary.passed}
                fail={summary.failed}
                blocked={summary.blocked}
                notrun={summary.notRun}
                skipped={summary.skipped}
                size={DONUT_CHART_SIZE}
                compact
                showCompleteLabel
                interactive
              />
            </div>
          </div>

          <div className="run-search-bar">
            <input className="run-search-input" type="text" placeholder="Search cases in this run…" value={runSearch} onChange={(e) => setRunSearch(e.target.value)} />
          </div>

          <div className="ec-ftab-bar">
            {FILTER_TABS.map((f) => (
              <div key={f.id} className={`ftab${filter === f.id ? ' on' : ''}`} onClick={() => setFilter(f.id)}>
                {f.label}
              </div>
            ))}
            <span style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{runMeta?.cases ?? summary.total}</span>
          </div>

          <div className="ec-list">
            {filteredRows.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>No cases match filter</div>
            ) : (
              filteredRows.map((row) => (
                <div
                  key={row.caseId}
                  className={`ec-case${activeCaseId === row.caseId ? ' on' : ''}`}
                  onClick={() => { setActiveCaseId(row.caseId); setEdVisible(true) }}
                >
                  <div className={`ec-dot ${EXEC_DOT_MAP[row.status]}`} />
                  <div className="ec-info">
                    <div className="ec-cid">{row.case.id}</div>
                    <div className="ec-cnm">{row.case.title}</div>
                    <div className="ec-cby">{row.assignee}</div>
                  </div>
                  <div className="ec-case-right">
                    <span className={`pill ec-status-pill ${EXEC_PILL_MAP[row.status]}`} style={{ fontSize: 9, padding: '1px 5px' }}>
                      {EXEC_PILL_LABEL[row.status].replace(/^[✓✗⊘○→]\s*/, '')}
                    </span>
                    {row.comments > 0 ? <span className="ec-cmt-badge">{row.comments}</span> : null}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="resizer-v" data-resize="run-list" data-min="220" data-max-half="true" />

        {edVisible ? (
          <div className={`ed-pane${edFullscreen ? ' fs' : ''}`}>
            <ExecDetailPane
              caseData={active}
              execution={activeEx}
              tab={edTab}
              onTab={setEdTab}
              onNav={navCase}
              onResult={setResult}
              onClear={clearResult}
              onStepR={(stepId, r) => setStepR(activeCaseId, stepId, r)}
              onAddStepComment={(stepId, body) => addStepComment(activeCaseId, stepId, body)}
              onAddGeneralComment={(body) => addGeneralComment(activeCaseId, body)}
              onLinkDefect={linkDefect}
              onAssigneeChange={(name) => updateExecution(activeCaseId, { assignee: name })}
              onOpenShortcuts={openShortcuts}
              onClose={() => setEdVisible(false)}
              onToggleFs={() => setEdFullscreen((v) => !v)}
              fullscreen={edFullscreen}
              sealed={isRunSealed}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}

function ExecDetailPane({
  caseData,
  execution,
  tab,
  onTab,
  onNav,
  onResult,
  onClear,
  onStepR,
  onAddStepComment,
  onAddGeneralComment,
  onLinkDefect,
  onAssigneeChange,
  onOpenShortcuts,
  onClose,
  onToggleFs,
  fullscreen,
  sealed,
}: {
  caseData: Case
  execution?: { status: ExecStatus; stepResults: Record<string, ExecStatus>; defects?: string[]; assignee?: string }
  tab: EdTab
  onTab: (t: EdTab) => void
  onNav: (dir: number) => void
  onResult: (r: ExecStatus) => void
  onClear: () => void
  onStepR: (stepId: string, r: ExecStatus) => void
  onAddStepComment: (stepId: string, body: string) => void
  onAddGeneralComment: (body: string) => void
  onLinkDefect: () => void
  onAssigneeChange: (name: string) => void
  onOpenShortcuts: () => void
  onClose: () => void
  onToggleFs: () => void
  fullscreen: boolean
  sealed: boolean
}) {
  const status = execution?.status ?? 'Not run'
  const statusClass = EXEC_PILL_MAP[status]
  const statusLabel = EXEC_STATUS_LABEL[status]
  const currentAssignee =
    normalizeAssigneeName(execution?.assignee ?? caseData.assignee) ?? TEAM_USERS[1]
  const [generalDraft, setGeneralDraft] = useState('')
  const [stepDrafts, setStepDrafts] = useState<Record<string, string>>({})

  const allComments = useMemo(() => {
    const items: { kind: 'step' | 'general'; stepNum?: number; stepTitle?: string; author: string; createdAt: string; body: string }[] = []
    caseData.steps.forEach((s, i) => {
      s.comments.forEach((c) => {
        items.push({ kind: 'step', stepNum: i + 1, stepTitle: s.action, author: c.author, createdAt: c.createdAt, body: c.body })
      })
    })
    caseData.generalComments.forEach((c) => {
      items.push({ kind: 'general', author: c.author, createdAt: c.createdAt, body: c.body })
    })
    return items.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
  }, [caseData])

  function saveGeneralComment() {
    const body = generalDraft.trim()
    if (!body) return
    onAddGeneralComment(body)
    setGeneralDraft('')
  }

  function saveStepComment(stepId: string) {
    const body = (stepDrafts[stepId] ?? '').trim()
    if (!body) return
    onAddStepComment(stepId, body)
    setStepDrafts((d) => ({ ...d, [stepId]: '' }))
  }

  return (
    <>
      <div className="ed-hd">
        <div className="ed-top">
          <div>
            <div className="ed-id">{caseData.id}</div>
            <div className="ed-ttl">{caseData.title}</div>
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
          <span className={`pri ${PRI_MAP[PRIORITY_TO_LEGACY[caseData.priority]]}`}>{caseData.priority}</span>
          {(caseData.tags ?? []).slice(0, 2).map((t) => <span key={t} className="tag">{t}</span>)}
          <span style={{ fontSize: 11, color: 'var(--text2)' }}>Assigned: <strong>{displayAssigneeName(execution?.assignee ?? caseData.assignee)}</strong></span>
          <span style={{ marginLeft: 'auto' }}>
            <span className={`pill ${statusClass}`}><span className="pill-dot" />{statusLabel}</span>
          </span>
        </div>
      </div>

      <div className="ed-tab-bar">
        {ED_TABS.map((t) => (
          <div key={t.id} className={`ed-tab${tab === t.id ? ' on' : ''}`} onClick={() => onTab(t.id)}>
            {t.label}
            {t.id === 'comments' && commentCount(caseData) > 0 ? <span className="ed-tab-badge">{commentCount(caseData)}</span> : null}
          </div>
        ))}
      </div>

      <div className={`ed-tp${tab === 'details' ? ' on' : ''}`}>
        <div className="ed-precond">
          <div className="ed-sl">Preconditions</div>
          <div className="ed-pt">{caseData.preconditions}</div>
        </div>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 5, padding: '8px 10px' }}>
          <div className="ed-sl" style={{ marginBottom: 7 }}>Metadata</div>
          <div className="ed-meta-grid">
            <div><div className="ed-ml">Priority</div><div className="ed-mv"><span className={`pri ${PRI_MAP[PRIORITY_TO_LEGACY[caseData.priority]]}`}>{caseData.priority}</span></div></div>
            <div><div className="ed-ml">Type</div><div className="ed-mv">{caseData.type}</div></div>
            <div>
              <div className="ed-ml">Assigned to</div>
              <div className="ed-mv">
                {sealed ? (
                  displayAssigneeName(execution?.assignee ?? caseData.assignee)
                ) : (
                  <select
                    value={currentAssignee}
                    onChange={(e) => onAssigneeChange(e.target.value)}
                    style={{ fontSize: 11.5, padding: '2px 4px', borderRadius: 3, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', maxWidth: '100%' }}
                  >
                    {TEAM_USERS.map((name) => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            <div><div className="ed-ml">Last result</div><div className="ed-mv">{statusLabel}</div></div>
          </div>
        </div>
      </div>

      <div className={`ed-tp${tab === 'steps' ? ' on' : ''}`}>
        {caseData.steps.map((s, n) => {
          const sr = execution?.stepResults[s.id] ?? 'Not run'
          return (
            <div key={s.id} className="esc">
              <div className="esc-hd">
                <span className="esc-n">Step {n + 1}</span>
                <span className="esc-ttl">{s.action.length > 52 ? `${s.action.slice(0, 52)}…` : s.action}</span>
                <div className="esc-btns">
                  {(['Passed', 'Failed', 'Blocked', 'Skipped'] as const).map((r) => (
                    <div
                      key={r}
                      className={`srb srb-${r[0].toLowerCase()}${sr === r ? ' on' : ''}${sealed ? ' disabled' : ''}`}
                      onClick={() => !sealed && onStepR(s.id, r)}
                    >
                      {r[0].toUpperCase()}
                    </div>
                  ))}
                </div>
              </div>
              <div className="esc-body">
                <div className="esc-act">{s.action}</div>
                <div className="esc-exp">Expected: {s.expected}</div>
                {s.comments.map((c) => (
                  <div key={c.id} className="esc-cmt-item">
                    <strong>{c.author}</strong>: {c.body}
                    <span className="esc-cmt-time">{formatRelativeTime(c.createdAt)}</span>
                  </div>
                ))}
                {!sealed ? (
                  <div className="esc-cmt-add">
                    <textarea
                      className="esc-cmt"
                      rows={1}
                      placeholder="Add step comment…"
                      value={stepDrafts[s.id] ?? ''}
                      onChange={(e) => setStepDrafts((d) => ({ ...d, [s.id]: e.target.value }))}
                    />
                    <button type="button" className="btn btn-p" style={{ fontSize: 10, padding: '2px 6px', marginTop: 4 }} onClick={() => saveStepComment(s.id)}>
                      Save
                    </button>
                  </div>
                ) : null}
              </div>
            </div>
          )
        })}
      </div>

      <div className={`ed-tp${tab === 'activity' ? ' on' : ''}`}>
        <div className="ed-act-item">
          <div className="ed-act-av" style={{ background: '#185FA5' }}>NS</div>
          <div className="ed-act-body">
            <strong>Nadim Sharif</strong> marked Step 1 as <span style={{ color: 'var(--fail)' }}>Failed</span>
            <div className="ed-act-time">Today at 14:32 · CTMS Regression — Sprint 44</div>
          </div>
        </div>
      </div>

      <div className={`ed-tp${tab === 'history' ? ' on' : ''}`}>
        <div className="ed-hist-item">
          <div className="ed-hist-dot" style={{ background: 'var(--fail)' }} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>Result: Failed</div>
            <div style={{ fontSize: 10.5, color: 'var(--text3)' }}>Sprint 44 · Nadim Sharif · Today</div>
          </div>
        </div>
      </div>

      <div className={`ed-tp${tab === 'comments' ? ' on' : ''}`}>
        {allComments.length === 0 ? (
          <div style={{ padding: 12, color: 'var(--text3)', fontSize: 12 }}>No comments yet.</div>
        ) : (
          allComments.map((c, i) => (
            <div key={i} className="ed-act-item">
              <div className="ed-act-av" style={{ background: '#2E7D32' }}>{c.author.slice(0, 2).toUpperCase()}</div>
              <div className="ed-act-body">
                {c.kind === 'step' ? (
                  <div className="ed-cmt-step-lbl">Step {c.stepNum}: {c.stepTitle && c.stepTitle.length > 40 ? `${c.stepTitle.slice(0, 40)}…` : c.stepTitle}</div>
                ) : (
                  <div className="ed-cmt-step-lbl">General comment</div>
                )}
                <strong>{c.author}</strong>: {c.body}
                <div className="ed-act-time">{formatRelativeTime(c.createdAt)}</div>
              </div>
            </div>
          ))
        )}
        {!sealed ? (
          <div style={{ marginTop: 8, padding: '0 4px' }}>
            <textarea className="ed-comment-input" placeholder="Add a general comment…" value={generalDraft} onChange={(e) => setGeneralDraft(e.target.value)} />
            <div style={{ marginTop: 4, textAlign: 'right' }}>
              <button type="button" className="btn btn-p" style={{ fontSize: 11, padding: '2px 8px' }} onClick={saveGeneralComment}>Save comment</button>
            </div>
          </div>
        ) : null}
      </div>

      <div className={`ed-tp${tab === 'defects' ? ' on' : ''}`}>
        <div className="ed-defects">
          {(execution?.defects ?? []).map((d) => (
            <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
              <span className="ed-dtag"><i className="ti ti-bug" style={{ fontSize: 10 }} />{d}</span>
              <span style={{ fontSize: 11, color: 'var(--text2)' }}>{DEFECT_NAMES[d] || 'Open defect'}</span>
            </div>
          ))}
          {!sealed ? (
            <div className="ed-dlink" onClick={onLinkDefect}>
              <i className="ti ti-plus" style={{ fontSize: 12 }} /> Link defect <span className="kbd">D</span>
            </div>
          ) : null}
        </div>
      </div>

      <div className="ed-foot">
        <span className="ed-rl">Result:</span>
        <div className="ed-rbs">
          {(['Passed', 'Failed', 'Blocked', 'Skipped'] as const).map((r) => (
            <div
              key={r}
              className={`rmb ${RMB_CLASS[r]}${status === r ? ' on' : ''}${sealed ? ' disabled' : ''}`}
              onClick={() => !sealed && onResult(r)}
            >
              {RMB_LABEL[r]}
            </div>
          ))}
        </div>
        {!sealed ? (
          <button type="button" onClick={onClear} className="ed-clear-btn" title="Reset to Not run">↩ Clear</button>
        ) : null}
      </div>
      <div className="sc-bar">
        <div className="sc-h"><span className="kbd">P</span>Pass</div>
        <div className="sc-h"><span className="kbd">F</span>Fail</div>
        <div className="sc-h"><span className="kbd">B</span>Blocked</div>
        <div className="sc-h"><span className="kbd">S</span>Skipped</div>
        <div className="sc-h"><span className="kbd">D</span>Defect</div>
        <div className="sc-h"><span className="kbd">J/K</span>Navigate</div>
        <div className="sc-h" style={{ marginLeft: 'auto' }}>
          <span className="kbd sc-kbd-btn" onClick={onOpenShortcuts}>?</span>&nbsp;Shortcuts
        </div>
      </div>
    </>
  )
}
