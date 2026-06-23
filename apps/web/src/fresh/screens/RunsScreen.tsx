'use client'

import Link from 'next/link'
import { useParams, usePathname, useRouter } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useFresh } from '../data/FreshProvider'
import type { Case, DemoRun, ExecStatus, ExecutionLogEntry } from '../data/demo-model'
import { commentCount, EXEC_STATUS_LABEL, formatRelativeTime, runSummary } from '../data/demo-model'
import { DONUT_CHART_SIZE } from '../data/ui-utils'
import { RunStatusInfographic } from '../components/RunStatusInfographic'
import { CreateRunModal } from '../components/CreateRunModal'
import { AddCasesToRunModal } from '../components/AddCasesToRunModal'
import { EditRunModal } from '../components/EditRunModal'
import { TestRunsTopbar } from '../components/TestRunsTopbar'
import { DEFECT_NAMES, RUN_PICKER_LIST } from '../data/seed'
import { PRIORITY_TO_LEGACY } from '../data/demo-model'
import { EXEC_DOT_MAP, EXEC_PILL_LABEL, EXEC_PILL_MAP, PRI_MAP } from '../data/ui-utils'
import { displayAssigneeName, normalizeAssigneeName, TEAM_USERS } from '../data/team-users'
import { ProjectSwitcher } from '../components/ProjectSwitcher'
import { PrototypeBanner } from '../components/PrototypeBanner'
import { useProjectHref } from '../hooks/useProjectHref'
import { useFreshUI } from '../hooks/useFreshUI'
import { parseTestRunCaseKey, parseTestRunKey, slugToCaseKey, testCasePath, testRunCasePath, testRunPath } from '../lib/project-routes'

type FilterTab = 'all' | ExecStatus
type EdTab = 'details' | 'comments' | 'defects' | 'requirements' | 'history'

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
  { id: 'comments', label: 'Comments' },
  { id: 'defects', label: 'Defects' },
  { id: 'requirements', label: 'Requirements' },
  { id: 'history', label: 'History' },
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

interface RunFilter {
  result: ExecStatus | 'all'
  assignee: string
  priority: string
  type: string
}

const DEFAULT_ADV_FILTER: RunFilter = { result: 'all', assignee: '', priority: '', type: '' }

export function RunsScreen() {
  const router = useRouter()
  const pathname = usePathname()
  const params = useParams()
  const {
    activeProject,
    activeCases,
    activeFolders,
    activeRuns,
    state,
    getCase,
    updateExecution,
    addStepComment,
    addGeneralComment,
    setCurrentRun,
    isRunSealed,
    sealRun,
    unsealRun,
    duplicateRun,
    deleteRun,
  } = useFresh()
  const { openShortcuts } = useFreshUI()
  const projectHref = useProjectHref()
  const hasCases = activeCases.length > 0

  const runKeyFromUrl = (params.runKey as string | undefined) ?? parseTestRunKey(pathname) ?? undefined
  const caseKeyFromUrl = (params.caseKey as string | undefined) ?? parseTestRunCaseKey(pathname) ?? undefined
  const currentRun: DemoRun | undefined = useMemo(() => {
    if (!runKeyFromUrl) return undefined
    return activeRuns.find((r) => r.runKey === runKeyFromUrl)
  }, [activeRuns, runKeyFromUrl])

  const urlProjectKey = pathname.split('/').filter(Boolean)[0]?.toUpperCase() ?? ''
  const projectMismatch = !!urlProjectKey && urlProjectKey !== activeProject.key.toUpperCase()

  const [createOpen, setCreateOpen] = useState(false)
  const [addCasesOpen, setAddCasesOpen] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const [filter, setFilter] = useState<FilterTab>('all')
  const [advFilter, setAdvFilter] = useState<RunFilter>(DEFAULT_ADV_FILTER)
  const [filterOpen, setFilterOpen] = useState(false)
  const [runSearch, setRunSearch] = useState('')
  const [activeCaseId, setActiveCaseId] = useState('')
  const [collapsedFolders, setCollapsedFolders] = useState<Set<string | null>>(new Set())
  const [pickerOpen, setPickerOpen] = useState(false)
  const [pickerQuery, setPickerQuery] = useState('')
  const [edTab, setEdTab] = useState<EdTab>('details')
  const [summaryOpen, setSummaryOpen] = useState(true)
  const [summaryTab, setSummaryTab] = useState<'team' | 'defects' | 'details'>('team')
  const [edVisible, setEdVisible] = useState(true)
  const [edFullscreen, setEdFullscreen] = useState(false)
  const [caseIdTooltip, setCaseIdTooltip] = useState<{
    caseId: string
    x: number
    y: number
  } | null>(null)
  const pickerRef = useRef<HTMLDivElement>(null)
  const filterRef = useRef<HTMLDivElement>(null)
  const caseIdHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (projectMismatch) return
    if (runKeyFromUrl && !currentRun) {
      router.replace(testRunPath(activeProject.key))
    }
  }, [projectMismatch, runKeyFromUrl, currentRun, activeProject.key, router])

  useEffect(() => {
    if (projectMismatch) return
    if (runKeyFromUrl) return
    if (activeRuns.length === 0) return

    const lastRunId = state.currentRunIdByProject?.[activeProject.id]
    const preferred = lastRunId
      ? activeRuns.find((r) => r.id === lastRunId)
      : undefined
    const target = preferred ?? activeRuns[0]
    router.push(testRunPath(activeProject.key, target.runKey))
  }, [projectMismatch, runKeyFromUrl, activeRuns, activeProject.key, activeProject.id, state.currentRunIdByProject, router])

  useEffect(() => {
    if (currentRun) setCurrentRun(currentRun.id)
  }, [currentRun?.id, setCurrentRun])

  const handleSealToggle = useCallback(() => {
    if (!currentRun) return
    if (currentRun.sealed) unsealRun()
    else sealRun()
  }, [currentRun, sealRun, unsealRun])

  const handleDuplicate = useCallback(() => {
    if (!currentRun) return
    const result = duplicateRun(currentRun.id)
    if (result) router.push(testRunPath(activeProject.key, result.runKey))
  }, [currentRun, duplicateRun, activeProject.key, router])

  const handleDelete = useCallback(() => {
    if (!currentRun) return
    if (!window.confirm(`Delete "${currentRun.name}" permanently? This cannot be undone.`)) return
    deleteRun(currentRun.id)
    router.push(testRunPath(activeProject.key))
  }, [currentRun, deleteRun, activeProject.key, router])

  const handleSelectRun = useCallback(
    (run: DemoRun) => {
      router.push(testRunPath(activeProject.key, run.runKey))
      setPickerOpen(false)
      setPickerQuery('')
    },
    [activeProject.key, router],
  )

  const summary = useMemo(() => (currentRun ? runSummary(currentRun) : null), [currentRun])

  const runRows: RunCaseRow[] = useMemo(() => {
    if (!currentRun) return []
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

  const resolvedCaseId = activeCaseId || currentRun?.caseOrder[0] || ''
  const active = getCase(resolvedCaseId)
  const activeEx = currentRun?.executions[resolvedCaseId]

  const pickerRuns = useMemo(() => {
    const q = pickerQuery.trim().toLowerCase()
    return activeRuns
      .map((run) => {
        const meta = RUN_PICKER_LIST.find((r) => r.id === run.id)
        const s = runSummary(run)
        const pct = s.total ? Math.round(((s.total - s.notRun) / s.total) * 100) : 0
        return {
          run,
          name: run.name,
          runKey: run.runKey,
          status: run.sealed ? 'sealed' as const : (meta?.status ?? 'act'),
          pct,
          cases: s.total,
        }
      })
      .filter((r) => !q || r.name.toLowerCase().includes(q) || r.runKey.includes(q))
  }, [activeRuns, pickerQuery])

  const filteredRows = useMemo(() => {
    const sq = runSearch.trim().toLowerCase()
    return runRows.filter((row) => {
      if (filter !== 'all' && row.status !== filter) return false
      if (advFilter.result !== 'all' && row.status !== advFilter.result) return false
      if (advFilter.assignee && row.assignee !== advFilter.assignee) return false
      if (advFilter.priority && row.case.priority !== advFilter.priority) return false
      if (advFilter.type && row.case.type !== advFilter.type) return false
      if (sq) {
        const caseKey = (row.case.caseKey ?? '').toLowerCase()
        if (
          !row.case.id.toLowerCase().includes(sq) &&
          !caseKey.includes(sq) &&
          !row.case.title.toLowerCase().includes(sq)
        ) {
          return false
        }
      }
      return true
    })
  }, [runRows, filter, runSearch, advFilter])

  const groupedRows = useMemo(() => {
    const folderMap = new Map(activeFolders.map((f) => [f.id, f]))
    const groups: { folderId: string | null; folderName: string; rows: RunCaseRow[] }[] = []
    const seen = new Map<string | null, number>()

    for (const row of filteredRows) {
      const folderId = row.case.folderId ?? null
      if (!seen.has(folderId)) {
        seen.set(folderId, groups.length)
        groups.push({
          folderId,
          folderName: folderId ? (folderMap.get(folderId)?.name ?? 'Unfiled') : 'Unfiled',
          rows: [],
        })
      }
      groups[seen.get(folderId)!].rows.push(row)
    }
    return groups
  }, [filteredRows, activeFolders])

  const uniqueAssignees = useMemo(
    () => [...new Set(runRows.map((r) => r.assignee).filter(Boolean))].sort(),
    [runRows],
  )

  const uniqueTypes = useMemo(
    () => [...new Set(runRows.map((r) => r.case.type).filter(Boolean))].sort(),
    [runRows],
  )

  const advFilterActive =
    advFilter.result !== 'all' ||
    advFilter.assignee !== '' ||
    advFilter.priority !== '' ||
    advFilter.type !== ''

  const teamSummary = useMemo(() => {
    if (!currentRun) return []
    const byAssignee = new Map<string, { passed: number; failed: number; blocked: number; notRun: number; skipped: number; total: number }>()
    for (const row of runRows) {
      const key = row.assignee || 'Unassigned'
      const prev = byAssignee.get(key) ?? { passed: 0, failed: 0, blocked: 0, notRun: 0, skipped: 0, total: 0 }
      prev.total += 1
      if (row.status === 'Passed') prev.passed += 1
      else if (row.status === 'Failed') prev.failed += 1
      else if (row.status === 'Blocked') prev.blocked += 1
      else if (row.status === 'Skipped') prev.skipped += 1
      else prev.notRun += 1
      byAssignee.set(key, prev)
    }
    return [...byAssignee.entries()].map(([name, counts]) => ({ name, ...counts }))
  }, [runRows, currentRun])

  useEffect(() => {
    if (!currentRun) return
    if (caseKeyFromUrl) {
      const key = slugToCaseKey(caseKeyFromUrl)
      const match = currentRun.caseOrder.find((cid) => {
        const c = getCase(cid)
        return c?.caseKey === key
      })
      if (match) {
        setActiveCaseId(match)
        return
      }
    }
    setActiveCaseId(currentRun.caseOrder[0] ?? '')
  }, [currentRun?.id])

  useEffect(() => {
    if (projectMismatch) return
    if (!currentRun) return
    const caseId = activeCaseId || currentRun.caseOrder[0] || ''
    if (!caseId) return
    const activeCase = getCase(caseId)
    if (!activeCase?.caseKey) return
    const target = testRunCasePath(activeProject.key, currentRun.runKey, activeCase.caseKey)
    if (pathname !== target) {
      window.history.replaceState(null, '', target)
    }
  }, [projectMismatch, activeCaseId, currentRun?.runKey, currentRun?.caseOrder, activeProject.key, pathname, getCase])

  useEffect(() => {
    if (!currentRun) return
    setFilter('all')
    setRunSearch('')
    setAdvFilter(DEFAULT_ADV_FILTER)
    setFilterOpen(false)
  }, [currentRun?.id])

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(e.target as Node)) {
        setPickerOpen(false)
        setPickerQuery('')
      }
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setFilterOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  const toggleFolder = useCallback((folderId: string | null) => {
    setCollapsedFolders((prev) => {
      const next = new Set(prev)
      if (next.has(folderId)) next.delete(folderId)
      else next.add(folderId)
      return next
    })
  }, [])

  const setResult = useCallback(
    (result: ExecStatus) => {
      if (result === 'Not run' || isRunSealed) return
      const caseId = activeCaseId || currentRun?.caseOrder[0] || ''
      if (!caseId) return
      updateExecution(caseId, { status: result })
    },
    [activeCaseId, currentRun, updateExecution, isRunSealed],
  )

  const clearResult = useCallback(() => {
    if (isRunSealed) return
    const caseId = activeCaseId || currentRun?.caseOrder[0] || ''
    if (!caseId) return
    updateExecution(caseId, { status: 'Not run' })
  }, [activeCaseId, currentRun, updateExecution, isRunSealed])

  const setStepR = useCallback(
    (caseId: string, stepId: string, result: ExecStatus) => {
      if (isRunSealed || !currentRun) return
      const ex = currentRun.executions[caseId] ?? { status: 'Not run' as ExecStatus, stepResults: {} }
      updateExecution(caseId, {
        stepResults: { ...ex.stepResults, [stepId]: result },
      })
    },
    [currentRun, updateExecution, isRunSealed],
  )

  const linkDefect = useCallback(() => {
    if (isRunSealed || !activeEx) return
    const caseId = activeCaseId || currentRun?.caseOrder[0] || ''
    if (!caseId) return
    const newId = `TI-${4420 + Math.floor(Math.random() * 80)}`
    updateExecution(caseId, { defects: [...(activeEx.defects ?? []), newId] })
    setEdTab('defects')
  }, [activeCaseId, currentRun, activeEx, updateExecution, isRunSealed])

  const navCase = useCallback(
    (dir: number) => {
      const caseId = activeCaseId || currentRun?.caseOrder[0] || ''
      const idx = filteredRows.findIndex((r) => r.caseId === caseId)
      const base = idx >= 0 ? idx : runRows.findIndex((r) => r.caseId === caseId)
      const list = filter === 'all' && !runSearch.trim() && !advFilterActive ? runRows : filteredRows
      const pos = list.findIndex((r) => r.caseId === caseId)
      const start = pos >= 0 ? pos : base
      let next = start + dir
      if (next < 0) next = 0
      if (next >= list.length) next = list.length - 1
      if (list[next]) setActiveCaseId(list[next].caseId)
      setEdVisible(true)
    },
    [activeCaseId, currentRun, filteredRows, runRows, filter, runSearch, advFilterActive],
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
      if (e.key === 'ArrowDown') { e.preventDefault(); navCase(1) }
      if (e.key === 'ArrowUp') { e.preventDefault(); navCase(-1) }
      if (k === 'd') linkDefect()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [linkDefect, navCase, openShortcuts, setResult, isRunSealed])

  const prototypeBanner = (
    <PrototypeBanner>
      <strong>Frontend prototype.</strong> Shaun&apos;s v1.2 execution UI — in-memory demo data
      (resets on reload). MySQL-backed workspace:{' '}
      <Link href="/runs/api" className="bc-link">/runs/api</Link>.
    </PrototypeBanner>
  )

  const breadcrumb = (
    <div className="bc">
      <Link href={projectHref('dashboard')} className="bc-link">Dashboard</Link>
      <span className="sep">/</span>
      <span style={{ color: 'var(--accent)', fontSize: 11.5 }}>{activeProject.name}</span>
      <span className="sep">/</span>
      <span className="cur">Test runs</span>
      {currentRun ? (
        <>
          <span className="sep">/</span>
          <span className="cur">{currentRun.runKey}</span>
        </>
      ) : null}
    </div>
  )

  const runPicker = (
    <div className="run-sel-bar" ref={pickerRef}>
      <button type="button" className="run-sel-btn" onClick={() => setPickerOpen((v) => !v)}>
        <i className="ti ti-player-play" style={{ fontSize: 11, color: 'var(--accent)' }} />
        <span className="run-sel-name">{currentRun?.name ?? 'Select a test run…'}</span>
        {currentRun ? (
          <span className="run-sel-key">{currentRun.runKey}</span>
        ) : null}
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
                  key={r.run.id}
                  className={`run-sel-item${r.run.id === currentRun?.id ? ' on' : ''}`}
                  onClick={() => handleSelectRun(r.run)}
                >
                  <span className={`pill ${pill.cls}`} style={{ fontSize: 9.5, padding: '1px 5px', flexShrink: 0 }}>{pill.lbl}</span>
                  <span className="rsi-key">{r.runKey}</span>
                  <span className="rsi-name">{r.name}</span>
                  <span className="rsi-meta">{r.pct}% · {r.cases}</span>
                </div>
              )
            })}
          </div>
          <button type="button" className="run-sel-create" disabled={!hasCases} onClick={() => { setPickerOpen(false); setCreateOpen(true) }}>
            <i className="ti ti-plus" style={{ fontSize: 11 }} /> Create new run…
          </button>
        </div>
      ) : null}
    </div>
  )

  if (activeRuns.length === 0) {
    return (
      <div className="view runs-v12">
        {prototypeBanner}
        <div className="topbar">
          <ProjectSwitcher />
          <div className="proj-sep" />
          {breadcrumb}
          <TestRunsTopbar
            currentRun={undefined}
            onSealToggle={handleSealToggle}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onCreateRun={() => setCreateOpen(true)}
            onEdit={() => setEditOpen(true)}
            hasCases={hasCases}
          />
        </div>
        <div className="empty-state on">
          <div className="empty-card">
            <i className="ti ti-player-play" />
            <div className="empty-title">No runs in this project</div>
            <div className="empty-copy">Create a test run to start executing cases in this project.</div>
            <button
              type="button"
              className="btn btn-p"
              style={{ marginTop: 12 }}
              disabled={!hasCases}
              title={!hasCases ? 'Add test cases to this project before creating a run' : undefined}
              onClick={() => setCreateOpen(true)}
            >
              <i className="ti ti-plus" style={{ fontSize: 12 }} /> Create test run
            </button>
          </div>
        </div>
        <CreateRunModal open={createOpen} onClose={() => setCreateOpen(false)} />
      </div>
    )
  }

  if (!currentRun) {
    return (
      <div className="view runs-v12">
        {prototypeBanner}
        <div className="topbar">
          <ProjectSwitcher />
          <div className="proj-sep" />
          {breadcrumb}
          <TestRunsTopbar
            currentRun={undefined}
            onSealToggle={handleSealToggle}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onCreateRun={() => setCreateOpen(true)}
            onEdit={() => setEditOpen(true)}
            hasCases={hasCases}
          />
        </div>
        <div className="tr-lay tr-lay-select">
          <div className="ec-pane">
            {runPicker}
            <div className="empty-state on" style={{ position: 'relative', flex: 1 }}>
              <div className="empty-card">
                <i className="ti ti-list-check" />
                <div className="empty-title">Select a test run</div>
                <div className="empty-copy">Choose a run from the picker above, or create a new one.</div>
                <button
                  type="button"
                  className="btn btn-p"
                  style={{ marginTop: 12 }}
                  disabled={!hasCases}
                  title={!hasCases ? 'Add test cases to this project before creating a run' : undefined}
                  onClick={() => setCreateOpen(true)}
                >
                  <i className="ti ti-plus" style={{ fontSize: 12 }} /> Create test run
                </button>
              </div>
            </div>
          </div>
        </div>
        <CreateRunModal open={createOpen} onClose={() => setCreateOpen(false)} />
      </div>
    )
  }

  if (currentRun.caseOrder.length === 0) {
    return (
      <div className="view runs-v12">
        {prototypeBanner}
        <div className="topbar">
          <ProjectSwitcher />
          <div className="proj-sep" />
          {breadcrumb}
          <TestRunsTopbar
            currentRun={currentRun}
            onSealToggle={handleSealToggle}
            onDuplicate={handleDuplicate}
            onDelete={handleDelete}
            onCreateRun={() => setCreateOpen(true)}
            onEdit={() => setEditOpen(true)}
            hasCases={hasCases}
          />
        </div>
        <div className="tr-lay tr-lay-select">
          <div className="ec-pane">
            {runPicker}
            <div className="empty-state on" style={{ position: 'relative', flex: 1 }}>
              <div className="empty-card">
                <i className="ti ti-clipboard-plus" style={{ fontSize: 36, color: 'var(--accent)', marginBottom: 10 }} />
                <div className="empty-title">Add test case to test run</div>
                <div className="empty-copy">Test runs contain test cases to be executed on your test target.</div>
                <button
                  type="button"
                  className="btn btn-p"
                  style={{ marginTop: 12 }}
                  onClick={() => setAddCasesOpen(true)}
                >
                  <i className="ti ti-plus" style={{ fontSize: 12 }} /> Add to test run
                </button>
              </div>
            </div>
          </div>
        </div>
        <CreateRunModal open={createOpen} onClose={() => setCreateOpen(false)} />
        <AddCasesToRunModal
          open={addCasesOpen}
          runId={currentRun?.id}
          onClose={() => setAddCasesOpen(false)}
        />
      </div>
    )
  }

  if (!active || !summary) return null

  const runMeta = RUN_PICKER_LIST.find((r) => r.id === currentRun.id)

  return (
    <div className="view runs-v12">
      {prototypeBanner}
      <div className="topbar">
        <ProjectSwitcher />
        <div className="proj-sep" />
        {breadcrumb}
        <TestRunsTopbar
          currentRun={currentRun}
          onSealToggle={handleSealToggle}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
          onCreateRun={() => setCreateOpen(true)}
          onEdit={() => setEditOpen(true)}
          hasCases={hasCases}
        />
      </div>

      <div className="tr-lay">
        <div className="ec-pane">
          {runPicker}

          <div className="ec-run-hd">
            <div className="ec-rttl">{currentRun.name}</div>
            <div className="ec-rmt">
              <span className="ec-run-key">{currentRun.runKey}</span>
              <span className={`pill ${isRunSealed ? 'p-pass' : 'p-act'}`} style={{ fontSize: 10, padding: '1px 5px' }}>{isRunSealed ? 'Sealed' : 'Active'}</span>
            </div>
            <div className="ec-summary-section">
              <div
                className="ec-summary-hd"
                onClick={() => setSummaryOpen((v) => !v)}
              >
                <i className={`ti ${summaryOpen ? 'ti-chevron-down' : 'ti-chevron-right'}`} style={{ fontSize: 10 }} />
                <span>Summary</span>
              </div>
              {summaryOpen && (
                <div className="ec-summary-body">
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
                      activeStatus={filter}
                      onStatusClick={(s) => setFilter((prev) => (prev === s ? 'all' : s))}
                    />
                  </div>
                  <div className="ec-summary-tabs-panel">
                    <div className="ec-summary-tab-bar">
                      {(['team', 'defects', 'details'] as const).map((t) => (
                        <div
                          key={t}
                          className={`ec-summary-tab${summaryTab === t ? ' on' : ''}`}
                          onClick={() => setSummaryTab(t)}
                        >
                          {t.charAt(0).toUpperCase() + t.slice(1)}
                        </div>
                      ))}
                    </div>
                    {summaryTab === 'team' && (
                      <div className="ec-summary-tab-content">
                        {teamSummary.length === 0 ? (
                          <div style={{ fontSize: 11, color: 'var(--text3)', padding: '4px 0' }}>0 users</div>
                        ) : (
                          teamSummary.map((m) => {
                            const isActive = advFilter.assignee === m.name
                            return (
                              <div
                                key={m.name}
                                className="ec-team-row"
                                style={{ cursor: 'pointer', borderRadius: 3, padding: '3px 4px', background: isActive ? 'rgba(25,118,210,.08)' : 'transparent' }}
                                onClick={() =>
                                  setAdvFilter((f) => ({
                                    ...f,
                                    assignee: f.assignee === m.name ? '' : m.name,
                                  }))
                                }
                              >
                                <div className="ec-team-av">
                                  {m.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                                </div>
                                <div className="ec-team-name" style={{ color: isActive ? 'var(--accent)' : undefined }}>
                                  {m.name}
                                </div>
                                <div style={{ marginLeft: 'auto', fontSize: 10, color: 'var(--text3)' }}>
                                  {m.total} {m.total === 1 ? 'case' : 'cases'} assigned
                                </div>
                              </div>
                            )
                          })
                        )}
                      </div>
                    )}
                    {summaryTab === 'defects' && (
                      <div className="ec-summary-tab-content">
                        <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6, fontWeight: 500 }}>Create defect</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>Test runs can be linked to defects from configured integrations.</div>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button type="button" className="btn" style={{ fontSize: 11, padding: '2px 8px' }} disabled>
                            <i className="ti ti-bug" style={{ fontSize: 11 }} /> Create defect
                          </button>
                          <button type="button" className="btn" style={{ fontSize: 11, padding: '2px 8px' }} disabled>
                            <i className="ti ti-link" style={{ fontSize: 11 }} /> Link defect
                          </button>
                        </div>
                      </div>
                    )}
                    {summaryTab === 'details' && (
                      <div className="ec-summary-tab-content">
                        {currentRun?.description ? (
                          <div style={{ display: 'flex', gap: 6, fontSize: 11, marginBottom: 4 }}>
                            <span style={{ color: 'var(--text3)', minWidth: 72 }}>Description:</span>
                            <span style={{ color: 'var(--text2)' }}>{currentRun.description}</span>
                          </div>
                        ) : null}
                        {currentRun?.due ? (
                          <div style={{ display: 'flex', gap: 6, fontSize: 11, marginBottom: 4 }}>
                            <span style={{ color: 'var(--text3)', minWidth: 72 }}>Due:</span>
                            <span style={{ color: 'var(--text2)' }}>{currentRun.due}</span>
                          </div>
                        ) : null}
                        {currentRun?.planName ? (
                          <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
                            <span style={{ color: 'var(--text3)', minWidth: 72 }}>Plan:</span>
                            <span style={{ color: 'var(--text2)' }}>{currentRun.planName}</span>
                          </div>
                        ) : null}
                        {!currentRun?.description && !currentRun?.due && !currentRun?.planName ? (
                          <div style={{ fontSize: 11, color: 'var(--text3)' }}>No additional details.</div>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="run-search-bar" ref={filterRef}>
            {!isRunSealed ? (
              <button
                type="button"
                className="btn btn-p"
                style={{ fontSize: 11, padding: '3px 8px', flexShrink: 0 }}
                onClick={() => setAddCasesOpen(true)}
              >
                <i className="ti ti-plus" style={{ fontSize: 11 }} /> Add cases
              </button>
            ) : null}
            <input className="run-search-input" type="text" placeholder="Search cases in this run…" value={runSearch} onChange={(e) => setRunSearch(e.target.value)} />
            <button
              type="button"
              className={`run-filter-btn${advFilterActive ? ' active' : ''}`}
              onClick={() => setFilterOpen((v) => !v)}
            >
              <i className="ti ti-filter" style={{ fontSize: 11 }} />
              Filter
              {advFilterActive ? <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--accent)' }} /> : null}
            </button>
            {filterOpen ? (
              <div className="run-filter-panel">
                <div className="run-filter-row">
                  <label>Result</label>
                  <select
                    value={advFilter.result}
                    onChange={(e) => setAdvFilter((f) => ({ ...f, result: e.target.value as ExecStatus | 'all' }))}
                  >
                    <option value="all">All</option>
                    <option value="Not run">Not run</option>
                    <option value="Passed">Passed</option>
                    <option value="Failed">Failed</option>
                    <option value="Blocked">Blocked</option>
                    <option value="Skipped">Skipped</option>
                  </select>
                </div>
                <div className="run-filter-row">
                  <label>Assignee</label>
                  <select
                    value={advFilter.assignee}
                    onChange={(e) => setAdvFilter((f) => ({ ...f, assignee: e.target.value }))}
                  >
                    <option value="">Any</option>
                    {uniqueAssignees.map((a) => (
                      <option key={a} value={a}>{a}</option>
                    ))}
                  </select>
                </div>
                <div className="run-filter-row">
                  <label>Priority</label>
                  <select
                    value={advFilter.priority}
                    onChange={(e) => setAdvFilter((f) => ({ ...f, priority: e.target.value }))}
                  >
                    <option value="">Any</option>
                    <option value="Critical">Critical</option>
                    <option value="High">High</option>
                    <option value="Medium">Medium</option>
                    <option value="Low">Low</option>
                  </select>
                </div>
                <div className="run-filter-row">
                  <label>Type</label>
                  <select
                    value={advFilter.type}
                    onChange={(e) => setAdvFilter((f) => ({ ...f, type: e.target.value }))}
                  >
                    <option value="">Any</option>
                    {uniqueTypes.map((t) => (
                      <option key={t} value={t}>{t}</option>
                    ))}
                  </select>
                </div>
                {advFilterActive ? (
                  <div
                    className="run-filter-clear"
                    onClick={() => setAdvFilter(DEFAULT_ADV_FILTER)}
                  >
                    Clear filters
                  </div>
                ) : null}
              </div>
            ) : null}
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
            {groupedRows.length === 0 ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--text3)', fontSize: 12 }}>No cases match filter</div>
            ) : (
              groupedRows.map((group) => {
                const collapsed = collapsedFolders.has(group.folderId)
                return (
                  <div key={group.folderId ?? '__unfiled__'} className="ec-folder-group">
                    <div className="ec-folder-hd" onClick={() => toggleFolder(group.folderId)}>
                      <i className={`ti ${collapsed ? 'ti-chevron-right' : 'ti-chevron-down'}`} style={{ fontSize: 10, opacity: 0.5 }} />
                      <span className="ec-folder-name">{group.folderName}</span>
                      <span className="ec-folder-count">{group.rows.length}</span>
                    </div>
                    {!collapsed && group.rows.map((row) => (
                      <div
                        key={row.caseId}
                        className={`ec-case${resolvedCaseId === row.caseId ? ' on' : ''}`}
                        onClick={() => { setActiveCaseId(row.caseId); setEdVisible(true) }}
                      >
                        <div className={`ec-dot ${EXEC_DOT_MAP[row.status]}`} />
                        <div className="ec-info">
                          <div
                            className="ec-cid"
                            onMouseEnter={(e) => {
                              if (caseIdHideTimer.current) clearTimeout(caseIdHideTimer.current)
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                              setCaseIdTooltip({ caseId: row.caseId, x: rect.left, y: rect.bottom + 6 })
                            }}
                            onMouseLeave={() => {
                              caseIdHideTimer.current = setTimeout(() => setCaseIdTooltip(null), 300)
                            }}
                          >
                            {row.case.caseKey ?? row.case.id}
                          </div>
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
                    ))}
                  </div>
                )
              })
            )}
          </div>
        </div>

        <div className="resizer-v" data-resize="run-list" data-min="475" data-max-half="true" />

        {edVisible ? (
          <div className={`ed-pane${edFullscreen ? ' fs' : ''}`}>
            <ExecDetailPane
              caseData={active}
              execution={activeEx}
              executionLog={currentRun.executionLog ?? []}
              tab={edTab}
              onTab={setEdTab}
              onNav={navCase}
              onResult={setResult}
              onClear={clearResult}
              onStepR={(stepId, r) => setStepR(resolvedCaseId, stepId, r)}
              onAddStepComment={(stepId, body) => addStepComment(resolvedCaseId, stepId, body)}
              onAddGeneralComment={(body) => addGeneralComment(resolvedCaseId, body)}
              onLinkDefect={linkDefect}
              onAssigneeChange={(name) => updateExecution(resolvedCaseId, { assignee: name })}
              onSaveResultNotes={(notes) => updateExecution(resolvedCaseId, { resultNotes: notes })}
              onOpenShortcuts={openShortcuts}
              onClose={() => setEdVisible(false)}
              onToggleFs={() => setEdFullscreen((v) => !v)}
              fullscreen={edFullscreen}
              sealed={isRunSealed}
            />
          </div>
        ) : null}
      </div>
      <CreateRunModal open={createOpen} onClose={() => setCreateOpen(false)} />
      <EditRunModal open={editOpen} run={currentRun} onClose={() => setEditOpen(false)} />
      <AddCasesToRunModal
        open={addCasesOpen}
        runId={currentRun?.id}
        onClose={() => setAddCasesOpen(false)}
      />
      {caseIdTooltip ? (() => {
        const c = getCase(caseIdTooltip.caseId)
        if (!c) return null
        const caseHref = testCasePath(activeProject.key, c.caseKey)
        return (
          <div
            style={{
              position: 'fixed',
              top: caseIdTooltip.y,
              left: caseIdTooltip.x,
              zIndex: 300,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              boxShadow: '0 4px 16px rgba(0,0,0,.18)',
              padding: '8px 10px',
              fontSize: 11.5,
              minWidth: 210,
              pointerEvents: 'auto',
            }}
            onMouseEnter={() => {
              if (caseIdHideTimer.current) clearTimeout(caseIdHideTimer.current)
            }}
            onMouseLeave={() => {
              caseIdHideTimer.current = setTimeout(() => setCaseIdTooltip(null), 300)
            }}
          >
            <div style={{ marginBottom: 6 }}>
              <span style={{ color: 'var(--text3)', fontSize: 11 }}>Go to test case: </span>
              <a
                href={caseHref}
                onClick={(e) => { e.preventDefault(); router.push(caseHref) }}
                style={{ color: 'var(--accent)', fontWeight: 600, fontSize: 11, textDecoration: 'none' }}
              >
                {c.caseKey ?? c.id}
              </a>
            </div>
            {c.createdAt ? (
              <div style={{ display: 'flex', gap: 6, fontSize: 11, marginBottom: 3 }}>
                <span style={{ color: 'var(--text3)', minWidth: 88 }}>Created:</span>
                <span style={{ color: 'var(--text2)' }}>{formatRelativeTime(c.createdAt)}</span>
              </div>
            ) : null}
            <div style={{ display: 'flex', gap: 6, fontSize: 11 }}>
              <span style={{ color: 'var(--text3)', minWidth: 88 }}>Last modified:</span>
              <span style={{ color: 'var(--text2)' }}>{formatRelativeTime(c.updatedAt)}</span>
            </div>
          </div>
        )
      })() : null}
    </div>
  )
}

function ExecDetailPane({
  caseData,
  execution,
  executionLog,
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
  onSaveResultNotes,
  onOpenShortcuts,
  onClose,
  onToggleFs,
  fullscreen,
  sealed,
}: {
  caseData: Case
  execution?: { status: ExecStatus; stepResults: Record<string, ExecStatus>; defects?: string[]; assignee?: string; resultNotes?: string }
  executionLog?: ExecutionLogEntry[]
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
  onSaveResultNotes: (notes: string) => void
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
  const [customFieldsOpen, setCustomFieldsOpen] = useState(true)
  const [notesOpen, setNotesOpen] = useState(false)
  const [notesDraft, setNotesDraft] = useState(execution?.resultNotes ?? '')
  const scrollToStepRef = useRef<string | null>(null)

  useEffect(() => {
    setNotesDraft(execution?.resultNotes ?? '')
    setNotesOpen(!!(execution?.resultNotes))
  }, [execution?.resultNotes, caseData.id])

  useEffect(() => {
    if (tab !== 'details') return
    const stepId = scrollToStepRef.current
    if (!stepId) return
    scrollToStepRef.current = null
    setTimeout(() => {
      document.getElementById(`step-${stepId}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }, 50)
  }, [tab])

  const allComments = useMemo(() => {
    const items: { kind: 'step' | 'general'; stepId?: string; stepNum?: number; stepTitle?: string; author: string; createdAt: string; body: string }[] = []
    caseData.steps.forEach((s, i) => {
      s.comments.forEach((c) => {
        items.push({ kind: 'step', stepId: s.id, stepNum: i + 1, stepTitle: s.action, author: c.author, createdAt: c.createdAt, body: c.body })
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
            <div className="ed-id">{caseData.caseKey ?? caseData.id}</div>
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
        <div style={{ marginBottom: 10 }}>
          <div className="ed-sl">Assigned to</div>
          {sealed ? (
            <div style={{ fontSize: 12, marginTop: 4 }}>{displayAssigneeName(execution?.assignee ?? caseData.assignee)}</div>
          ) : (
            <select
              value={currentAssignee}
              onChange={(e) => onAssigneeChange(e.target.value)}
              style={{ fontSize: 11.5, padding: '2px 4px', borderRadius: 3, border: '1px solid var(--border)', background: 'var(--surface)', color: 'var(--text)', maxWidth: '100%', marginTop: 4 }}
            >
              {TEAM_USERS.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          )}
        </div>
        <div className="ed-custom-fields">
          <div
            className="ed-custom-fields-hd"
            onClick={() => setCustomFieldsOpen((v) => !v)}
          >
            <i className={`ti ${customFieldsOpen ? 'ti-chevron-down' : 'ti-chevron-right'}`} style={{ fontSize: 10 }} />
            <span>Custom Fields</span>
          </div>
          {customFieldsOpen && (
            <div className="ed-custom-fields-body">
              <div className="ed-meta-grid">
                <div><div className="ed-ml">Priority</div><div className="ed-mv"><span className={`pri ${PRI_MAP[PRIORITY_TO_LEGACY[caseData.priority]]}`}>{caseData.priority}</span></div></div>
                <div><div className="ed-ml">Type</div><div className="ed-mv">{caseData.type}</div></div>
                <div><div className="ed-ml">Last result</div><div className="ed-mv">{statusLabel}</div></div>
              </div>
            </div>
          )}
        </div>
        <div className="ed-precond">
          <div className="ed-sl">Preconditions</div>
          <div className="ed-pt">{caseData.preconditions}</div>
        </div>
        {caseData.steps.map((s, n) => {
          const sr = execution?.stepResults[s.id] ?? 'Not run'
          return (
            <div key={s.id} id={`step-${s.id}`} className="esc">
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
                      rows={2}
                      style={{ resize: 'vertical' }}
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
        <div className="ed-result-info">
          <div
            className="ed-result-info-hd"
            onClick={() => setNotesOpen((v) => !v)}
          >
            <i className={`ti ${notesOpen ? 'ti-chevron-down' : 'ti-chevron-right'}`} style={{ fontSize: 10 }} />
            <span>Result information</span>
            {execution?.resultNotes ? <span className="ed-result-info-dot" /> : null}
          </div>
          {notesOpen && (
            <div className="ed-result-info-body">
              {sealed ? (
                <div className="ed-pt" style={{ whiteSpace: 'pre-wrap' }}>{execution?.resultNotes || <em style={{ color: 'var(--text3)' }}>No notes</em>}</div>
              ) : (
                <>
                  <textarea
                    className="esc-cmt"
                    rows={3}
                    placeholder="Add execution notes, observations, or evidence…"
                    value={notesDraft}
                    onChange={(e) => setNotesDraft(e.target.value)}
                  />
                  <button
                    type="button"
                    className="btn btn-p"
                    style={{ fontSize: 10, padding: '2px 6px', marginTop: 4 }}
                    onClick={() => onSaveResultNotes(notesDraft)}
                    disabled={notesDraft === (execution?.resultNotes ?? '')}
                  >
                    Save
                  </button>
                </>
              )}
            </div>
          )}
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
                {c.kind === 'step' && c.stepId ? (
                  <div
                    className="ed-cmt-step-lbl ed-cmt-step-link"
                    onClick={() => {
                      scrollToStepRef.current = c.stepId!
                      onTab('details')
                    }}
                    title="Go to step"
                  >
                    ↗ Step {c.stepNum}: {c.stepTitle && c.stepTitle.length > 40 ? `${c.stepTitle.slice(0, 40)}…` : c.stepTitle}
                  </div>
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
          {(execution?.defects ?? []).length === 0 ? (
            <>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6, fontWeight: 500 }}>Create defect</div>
              <div style={{ fontSize: 11, color: 'var(--text3)', marginBottom: 8 }}>Test runs can be linked to defects from configured integrations.</div>
            </>
          ) : (
            (execution?.defects ?? []).map((d) => (
              <div key={d} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                <span className="ed-dtag"><i className="ti ti-bug" style={{ fontSize: 10 }} />{d}</span>
                <span style={{ fontSize: 11, color: 'var(--text2)' }}>{DEFECT_NAMES[d] || 'Open defect'}</span>
              </div>
            ))
          )}
          <div style={{ display: 'flex', gap: 6, marginTop: (execution?.defects ?? []).length > 0 ? 8 : 0 }}>
            <button type="button" className="btn" style={{ fontSize: 11, padding: '2px 8px' }} disabled>
              <i className="ti ti-bug" style={{ fontSize: 11 }} /> Create defect
            </button>
            <button
              type="button"
              className="btn"
              style={{ fontSize: 11, padding: '2px 8px' }}
              disabled={sealed}
              onClick={() => !sealed && onLinkDefect()}
            >
              <i className="ti ti-link" style={{ fontSize: 11 }} /> Link defect
            </button>
          </div>
        </div>
      </div>

      <div className={`ed-tp${tab === 'requirements' ? ' on' : ''}`}>
        {caseData.references ? (
          <div style={{ padding: '8px 10px' }}>
            <div className="ed-sl" style={{ marginBottom: 6 }}>Linked requirements</div>
            <div className="ed-pt" style={{ whiteSpace: 'pre-wrap' }}>{caseData.references}</div>
          </div>
        ) : (
          <div style={{ padding: '8px 10px' }}>
            <div style={{ fontWeight: 600, fontSize: 13 }}>No requirements</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>No requirements have been linked.</div>
          </div>
        )}
      </div>

      <div className={`ed-tp${tab === 'history' ? ' on' : ''}`}>
        {(() => {
          const entries = (executionLog ?? [])
            .filter((e) => e.caseId === caseData.id)
            .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
          if (entries.length === 0) {
            return <div style={{ padding: 12, color: 'var(--text3)', fontSize: 12 }}>No execution history yet.</div>
          }
          return entries.map((e) => (
            <div key={e.id} className="ed-hist-item">
              <div
                className="ed-hist-dot"
                style={{
                  background:
                    e.event === 'created' ? 'var(--accent)' :
                    e.to === 'Passed' ? 'var(--pass)' :
                    e.to === 'Failed' ? 'var(--fail)' :
                    e.to === 'Blocked' ? 'var(--block)' :
                    'var(--text3)',
                }}
              />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 12, fontWeight: 500, color: 'var(--text)' }}>
                  {e.event === 'created' ? 'Record was created' : `${e.from} → ${e.to}`}
                </div>
                <div style={{ fontSize: 10.5, color: 'var(--text3)' }}>
                  {e.by} · {formatRelativeTime(e.at)}
                </div>
              </div>
            </div>
          ))
        })()}
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
        <div className="sc-h"><span className="kbd">↑/↓</span>Navigate</div>
        <div className="sc-h" style={{ marginLeft: 'auto' }}>
          <span className="kbd sc-kbd-btn" onClick={onOpenShortcuts}>?</span>&nbsp;Shortcuts
        </div>
      </div>
    </>
  )
}
