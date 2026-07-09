'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { FreshTopbar } from '../components/FreshTopbar'
import { RunDonut } from '../components/RunDonut'
import { RunStatusInfographic } from '../components/RunStatusInfographic'
import { PrototypeBanner } from '../components/PrototypeBanner'
import { useProjectHref } from '../hooks/useProjectHref'
import { useFresh } from '../data/FreshProvider'
import type {
  Case,
  DemoRun,
  Folder,
  QueryCondition,
  QueryField,
  QueryOperator,
  TestPlan,
  TestQuery,
} from '../data/demo-model'
import {
  formatRelativeTime,
  newId,
  resolvePlanCases,
  runSummary,
} from '../data/demo-model'
import { parsePlanKey, planPath, testRunPath } from '../lib/project-routes'

function planRunsForPlan(runs: DemoRun[], planId: string): DemoRun[] {
  return runs.filter((r) => r.planId === planId)
}

function openRunForPlan(runs: DemoRun[], planId: string): DemoRun | undefined {
  return planRunsForPlan(runs, planId)
    .filter((r) => !r.sealed && !r.archivedAt)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
}

function lastRunForPlan(runs: DemoRun[], planId: string): DemoRun | undefined {
  return planRunsForPlan(runs, planId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
}

function openRunCount(runs: DemoRun[], planId: string): number {
  return planRunsForPlan(runs, planId).filter((r) => !r.sealed && !r.archivedAt).length
}

function RunResultBar({ run }: { run: DemoRun }) {
  const s = runSummary(run)
  const total = s.total || 1
  const segments = [
    { count: s.passed, color: 'var(--pass)' },
    { count: s.failed, color: 'var(--fail)' },
    { count: s.blocked, color: 'var(--block)' },
    { count: s.notRun, color: 'var(--border2)' },
  ]
  return (
    <div className="pl-run-bar">
      {segments.map((seg, i) =>
        seg.count > 0 ? (
          <div
            key={i}
            className="pl-run-bar-seg"
            style={{ width: `${(seg.count / total) * 100}%`, background: seg.color }}
          />
        ) : null,
      )}
    </div>
  )
}

const FIELD_OPTIONS: { value: QueryField; label: string }[] = [
  { value: 'title', label: 'Title' },
  { value: 'priority', label: 'Priority' },
  { value: 'type', label: 'Type' },
  { value: 'assignee', label: 'Assignee' },
  { value: 'tags', label: 'Tags' },
  { value: 'caseKey', label: 'Case key' },
]

const OPERATOR_OPTIONS: { value: QueryOperator; label: string }[] = [
  { value: 'equals', label: 'equals' },
  { value: 'not_equals', label: 'not equals' },
  { value: 'contains', label: 'contains' },
  { value: 'not_contains', label: 'not contains' },
]

const PRIORITY_CLASS: Record<Case['priority'], string> = {
  Critical: 'pri pr-crit',
  High: 'pri pr-high',
  Medium: 'pri pr-med',
  Low: 'pri pr-low',
}

function ConditionQueryBody({
  query,
  onUpdate,
}: {
  query: TestQuery
  onUpdate: (patch: Partial<TestQuery>) => void
}) {
  const conditions = query.conditions ?? []

  function updateCondition(i: number, patch: Partial<QueryCondition>) {
    const next = conditions.map((c, idx) => (idx === i ? { ...c, ...patch } : c))
    onUpdate({ conditions: next })
  }

  function removeCondition(i: number) {
    onUpdate({ conditions: conditions.filter((_, idx) => idx !== i) })
  }

  function addCondition() {
    onUpdate({ conditions: [...conditions, { field: 'priority', operator: 'equals', value: '' }] })
  }

  return (
    <>
      {conditions.map((cond, i) => (
        <div key={i} className="pl-cond-row">
          <select
            value={cond.field}
            onChange={(e) => updateCondition(i, { field: e.target.value as QueryField })}
          >
            {FIELD_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={cond.operator}
            onChange={(e) => updateCondition(i, { operator: e.target.value as QueryOperator })}
          >
            {OPERATOR_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <input
            type="text"
            placeholder="Value…"
            value={cond.value}
            onChange={(e) => updateCondition(i, { value: e.target.value })}
          />
          <button
            type="button"
            className="pl-cond-remove"
            title="Remove condition"
            onClick={() => removeCondition(i)}
          >
            <i className="ti ti-x" />
          </button>
        </div>
      ))}
      <button type="button" className="pl-add-cond" onClick={addCondition}>
        <i className="ti ti-plus" /> Add condition
      </button>
    </>
  )
}

function FolderQueryBody({
  query,
  activeFolders,
  onUpdate,
}: {
  query: TestQuery
  activeFolders: Folder[]
  onUpdate: (patch: Partial<TestQuery>) => void
}) {
  const selectedIds = new Set(query.folderIds ?? [])
  const unselectedFolders = activeFolders.filter((f) => !selectedIds.has(f.id))

  function addFolder(folderId: string) {
    if (!selectedIds.has(folderId)) {
      onUpdate({ folderIds: [...(query.folderIds ?? []), folderId] })
    }
  }

  function removeFolder(folderId: string) {
    onUpdate({ folderIds: (query.folderIds ?? []).filter((id) => id !== folderId) })
  }

  return (
    <>
      <div className="pl-folder-chips">
        {(query.folderIds ?? []).map((fid) => {
          const label =
            fid === '__unfiled__'
              ? 'Unfiled'
              : (activeFolders.find((f) => f.id === fid)?.name ?? fid)
          return (
            <span key={fid} className="pl-tagp">
              <i className="ti ti-folder" style={{ fontSize: 13 }} />
              {label}
              <button type="button" title="Remove folder" onClick={() => removeFolder(fid)}>
                <i className="ti ti-x" />
              </button>
            </span>
          )
        })}
      </div>
      {(unselectedFolders.length > 0 || !selectedIds.has('__unfiled__')) && (
        <select
          className="pl-folder-select"
          value=""
          onChange={(e) => {
            if (e.target.value) addFolder(e.target.value)
          }}
        >
          <option value="">+ Add folder…</option>
          {!selectedIds.has('__unfiled__') && <option value="__unfiled__">Unfiled</option>}
          {unselectedFolders.map((f) => (
            <option key={f.id} value={f.id}>
              {f.name}
            </option>
          ))}
        </select>
      )}
    </>
  )
}

function StaticQueryBody({
  query,
  activeCases,
  search,
  onSearch,
  onUpdate,
}: {
  query: TestQuery
  activeCases: Case[]
  search: string
  onSearch: (v: string) => void
  onUpdate: (patch: Partial<TestQuery>) => void
}) {
  const selected = new Set(query.caseIds ?? [])

  function toggle(caseId: string) {
    if (selected.has(caseId)) {
      onUpdate({ caseIds: (query.caseIds ?? []).filter((id) => id !== caseId) })
    } else {
      onUpdate({ caseIds: [...(query.caseIds ?? []), caseId] })
    }
  }

  const filtered = activeCases.filter((c) => {
    const q = search.toLowerCase()
    if (!q) return true
    return (
      c.title?.toLowerCase().includes(q) || (c.caseKey ?? '').toLowerCase().includes(q)
    )
  })

  return (
    <>
      <div className="pl-static-search">
        <input
          type="text"
          placeholder="Search cases…"
          value={search}
          onChange={(e) => onSearch(e.target.value)}
        />
      </div>
      <div className="pl-static-list">
        {filtered.map((c) => (
          <label key={c.id} className="pl-static-case-row">
            <input
              type="checkbox"
              checked={selected.has(c.id)}
              onChange={() => toggle(c.id)}
              style={{ flexShrink: 0 }}
            />
            <span className="pl-case-key">{c.caseKey ?? c.id}</span>
            <span
              style={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {c.title}
            </span>
          </label>
        ))}
        {filtered.length === 0 && (
          <div style={{ fontSize: 11, color: 'var(--text3)', padding: '4px 0' }}>
            No cases match.
          </div>
        )}
      </div>
    </>
  )
}

interface QueryGroupCardProps {
  query: TestQuery
  resolvedCount: number
  activeCases: Case[]
  activeFolders: Folder[]
  staticSearch: string
  onStaticSearch: (v: string) => void
  onUpdate: (patch: Partial<TestQuery>) => void
  onRemove: () => void
}

function QueryGroupCard({
  query,
  resolvedCount,
  activeCases,
  activeFolders,
  staticSearch,
  onStaticSearch,
  onUpdate,
  onRemove,
}: QueryGroupCardProps) {
  const typeLabel =
    query.type === 'condition' ? 'CONDITION' : query.type === 'folder' ? 'FOLDER' : 'STATIC'

  return (
    <div className="pl-qg-card">
      <div className="pl-qg-hd">
        <span className="pl-qg-type">{typeLabel}</span>
        <span className="pl-qg-title">{query.title}</span>
        <span className="pl-cpill">{resolvedCount}</span>
        <button
          type="button"
          className="pl-iconbtn pl-iconbtn-sm"
          title="Remove query group"
          onClick={onRemove}
        >
          <i className="ti ti-x" />
        </button>
      </div>
      <div className="pl-qg-bd">
        {query.type === 'condition' && (
          <ConditionQueryBody query={query} onUpdate={onUpdate} />
        )}
        {query.type === 'folder' && (
          <FolderQueryBody query={query} activeFolders={activeFolders} onUpdate={onUpdate} />
        )}
        {query.type === 'static' && (
          <StaticQueryBody
            query={query}
            activeCases={activeCases}
            search={staticSearch}
            onSearch={onStaticSearch}
            onUpdate={onUpdate}
          />
        )}
      </div>
    </div>
  )
}

export function PlansScreen() {
  const router = useRouter()
  const pathname = usePathname()
  const projectHref = useProjectHref()
  const {
    activeProject,
    activePlans,
    activeCases,
    activeFolders,
    activeRuns,
    addPlan,
    updatePlan,
    deletePlan,
    duplicatePlan,
    spawnRunFromPlan,
    resolveEntityId,
  } = useFresh()

  const planKeyFromUrl = parsePlanKey(pathname)
  const urlProjectKey = pathname.split('/').filter(Boolean)[0]?.toUpperCase() ?? ''
  const projectMismatch = !!urlProjectKey && urlProjectKey !== activeProject.key.toUpperCase()

  const selectedPlan = useMemo(
    () => activePlans.find((p) => p.planKey === planKeyFromUrl) ?? null,
    [activePlans, planKeyFromUrl],
  )

  const [tab, setTab] = useState<'overview' | 'testcases'>('overview')
  const [listSearch, setListSearch] = useState('')
  const [createPlanOpen, setCreatePlanOpen] = useState(false)
  const [createPlanTitle, setCreatePlanTitle] = useState('')
  const [createPlanDesc, setCreatePlanDesc] = useState('')
  const [editPlanOpen, setEditPlanOpen] = useState(false)
  const [editTitle, setEditTitle] = useState('')
  const [editDesc, setEditDesc] = useState('')
  const [spawnRunOpen, setSpawnRunOpen] = useState(false)
  const [spawnRunName, setSpawnRunName] = useState('')
  const [spawnRunDesc, setSpawnRunDesc] = useState('')
  const [moreMenuOpen, setMoreMenuOpen] = useState(false)
  const [rowMenuOpen, setRowMenuOpen] = useState<string | null>(null)
  const [rowMenuPos, setRowMenuPos] = useState<{ x: number; y: number } | null>(null)
  const moreMenuRef = useRef<HTMLDivElement>(null)
  const rowMenuRef = useRef<HTMLDivElement>(null)
  const addQueryRef = useRef<HTMLDivElement>(null)
  const runBarHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [pendingQueries, setPendingQueries] = useState<TestQuery[] | null>(null)
  const [addQueryMenuOpen, setAddQueryMenuOpen] = useState(false)
  const [staticSearch, setStaticSearch] = useState<Record<string, string>>({})
  const [runBarTooltip, setRunBarTooltip] = useState<{
    run: DemoRun
    x: number
    y: number
  } | null>(null)
  const [planMaximized, setPlanMaximized] = useState(false)

  const filteredPlans = useMemo(() => {
    const q = listSearch.trim().toLowerCase()
    if (!q) return activePlans
    return activePlans.filter(
      (p) => p.title.toLowerCase().includes(q) || p.planKey.toLowerCase().includes(q),
    )
  }, [activePlans, listSearch])

  const resolvedCases = useMemo(() => {
    if (!selectedPlan) return []
    return resolvePlanCases(selectedPlan, activeCases, activeFolders)
  }, [selectedPlan, activeCases, activeFolders])

  const planRunHistory = useMemo(() => {
    if (!selectedPlan) return []
    return planRunsForPlan(activeRuns, selectedPlan.id).sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt),
    )
  }, [selectedPlan, activeRuns])

  const queries = pendingQueries ?? selectedPlan?.queries ?? []

  const queryResolvedCases = useMemo(() => {
    if (!selectedPlan) return {}
    const fakePlan = { ...selectedPlan, queries }
    const result: Record<string, Case[]> = {}
    for (const q of queries) {
      const fakeSinglePlan = { ...fakePlan, queries: [q] }
      result[q.id] = resolvePlanCases(fakeSinglePlan, activeCases, activeFolders)
    }
    return result
  }, [selectedPlan, queries, activeCases, activeFolders])

  const resolvedCasesAll = useMemo(() => {
    if (!selectedPlan) return []
    const fakePlan = { ...selectedPlan, queries }
    return resolvePlanCases(fakePlan, activeCases, activeFolders)
  }, [selectedPlan, queries, activeCases, activeFolders])

  const commitQueries = useCallback(
    (next: TestQuery[]) => {
      setPendingQueries(next)
      if (selectedPlan) updatePlan(selectedPlan.id, { queries: next })
    },
    [selectedPlan, updatePlan],
  )

  const openRun = selectedPlan ? openRunForPlan(activeRuns, selectedPlan.id) : undefined

  useEffect(() => {
    setPendingQueries(null)
    setStaticSearch({})
    setPlanMaximized(false)
  }, [selectedPlan?.id])

  useEffect(() => {
    if (projectMismatch) return
    if (planKeyFromUrl && !selectedPlan) {
      // Follow optimistic-create key reconciliation (real projects): the URL
      // may still hold the temp TP-<n> key of a plan whose create just
      // resolved to its real PLAN-<n> ref (FreshProvider's RECONCILE_PLAN).
      const mapped = resolveEntityId(planKeyFromUrl)
      if (mapped !== planKeyFromUrl && activePlans.some((p) => p.planKey === mapped)) {
        router.replace(planPath(activeProject.key, mapped))
        return
      }
      router.replace(planPath(activeProject.key))
    }
  }, [projectMismatch, planKeyFromUrl, selectedPlan, activePlans, activeProject.key, router, resolveEntityId])

  useEffect(() => {
    if (!moreMenuOpen && !rowMenuOpen && !addQueryMenuOpen) return
    function onClick(e: MouseEvent) {
      if (moreMenuOpen && moreMenuRef.current && !moreMenuRef.current.contains(e.target as Node)) {
        setMoreMenuOpen(false)
      }
      if (rowMenuOpen && rowMenuRef.current && !rowMenuRef.current.contains(e.target as Node)) {
        setRowMenuOpen(null)
        setRowMenuPos(null)
      }
      if (
        addQueryMenuOpen &&
        addQueryRef.current &&
        !addQueryRef.current.contains(e.target as Node)
      ) {
        setAddQueryMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [moreMenuOpen, rowMenuOpen, addQueryMenuOpen])

  const navigateToPlan = useCallback(
    (plan: TestPlan) => {
      router.push(planPath(activeProject.key, plan.planKey))
    },
    [router, activeProject.key],
  )

  const navigateToPlansList = useCallback(() => {
    router.push(planPath(activeProject.key))
  }, [router, activeProject.key])

  const handleDeletePlan = useCallback(
    (plan: TestPlan) => {
      if (!window.confirm(`Delete plan "${plan.title}"? This cannot be undone.`)) return
      deletePlan(plan.id)
      if (selectedPlan?.id === plan.id) navigateToPlansList()
    },
    [deletePlan, selectedPlan?.id, navigateToPlansList],
  )

  const handleDuplicatePlan = useCallback(
    (planId: string) => {
      const result = duplicatePlan(planId)
      if (result) router.push(planPath(activeProject.key, result.planKey))
    },
    [duplicatePlan, router, activeProject.key],
  )

  const openEditModal = useCallback((plan: TestPlan) => {
    setEditTitle(plan.title)
    setEditDesc(plan.description ?? '')
    setEditPlanOpen(true)
    setRowMenuOpen(null)
    setMoreMenuOpen(false)
  }, [])

  const openSpawnModal = useCallback(() => {
    if (!selectedPlan) return
    const dateStr = new Date().toLocaleDateString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
    })
    setSpawnRunName(`${selectedPlan.title} ${dateStr}`)
    setSpawnRunDesc('')
    setSpawnRunOpen(true)
  }, [selectedPlan])

  const handleCreatePlan = useCallback(() => {
    const title = createPlanTitle.trim()
    if (!title) return
    const { planKey } = addPlan(title, createPlanDesc.trim() || undefined)
    setCreatePlanTitle('')
    setCreatePlanDesc('')
    setCreatePlanOpen(false)
    router.push(planPath(activeProject.key, planKey))
  }, [createPlanTitle, createPlanDesc, addPlan, router, activeProject.key])

  const handleEditPlan = useCallback(() => {
    if (!selectedPlan || !editTitle.trim()) return
    updatePlan(selectedPlan.id, {
      title: editTitle.trim(),
      description: editDesc.trim() || undefined,
    })
    setEditPlanOpen(false)
  }, [selectedPlan, editTitle, editDesc, updatePlan])

  const handleSpawnRun = useCallback(() => {
    if (!selectedPlan || !spawnRunName.trim()) return
    const result = spawnRunFromPlan(
      selectedPlan.id,
      spawnRunName.trim(),
      spawnRunDesc.trim() || undefined,
    )
    if (result) {
      setSpawnRunOpen(false)
      router.push(testRunPath(activeProject.key, result.runKey))
    }
  }, [selectedPlan, spawnRunName, spawnRunDesc, spawnRunFromPlan, router, activeProject.key])

  return (
    <div className="view">
      <FreshTopbar
        breadcrumbs={[
          { label: 'Dashboard', href: projectHref('dashboard') },
          { label: activeProject.name },
          { label: 'Test plans' },
        ]}
        searchPlaceholder="Search plans…"
        searchWidth={200}
      />
      <PrototypeBanner />

      <div className={`pl-lay${planMaximized ? ' pl-maximized' : ''}`}>
        <div className="pl-list-pane">
          <div className="pl-list-hd">
            <i className="ti ti-clipboard-list" style={{ fontSize: 17, color: 'var(--text3)' }} />
            <span className="pl-list-title">Plans</span>
            <span className="pl-cpill">{activePlans.length}</span>
            <span className="pl-list-hd-spacer" />
            <button
              type="button"
              className="btn btn-p btn-xs"
              onClick={() => setCreatePlanOpen(true)}
            >
              <i className="ti ti-plus" style={{ fontSize: 11 }} /> New plan
            </button>
          </div>
          <div className="pl-list-search">
            <input
              type="text"
              placeholder="Filter plans…"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
            />
          </div>
          <div className="pl-list-body">
            {filteredPlans.length === 0 ? (
              <div className="pl-empty-list">
                {activePlans.length === 0 ? 'No test plans yet.' : 'No plans match your search.'}
              </div>
            ) : (
              filteredPlans.map((plan) => (
                <div
                  key={plan.id}
                  className={`pl-item${selectedPlan?.id === plan.id ? ' on' : ''}`}
                  onClick={() => navigateToPlan(plan)}
                >
                  <div className="k">{plan.planKey}</div>
                  <div className="t">{plan.title}</div>
                  <div className="m">
                    <span>{openRunCount(activeRuns, plan.id)} open</span>
                    <span>
                      Last:{' '}
                      {(() => {
                        const lr = lastRunForPlan(activeRuns, plan.id)
                        return lr ? formatRelativeTime(lr.createdAt) : '—'
                      })()}
                    </span>
                  </div>
                  <div className="pl-item-actions">
                    <button
                      type="button"
                      className="btn"
                      style={{ padding: '2px 6px', fontSize: 11 }}
                      onClick={(e) => {
                        e.stopPropagation()
                        const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                        if (rowMenuOpen === plan.id) {
                          setRowMenuOpen(null)
                          setRowMenuPos(null)
                        } else {
                          setRowMenuOpen(plan.id)
                          setRowMenuPos({ x: rect.right, y: rect.bottom + 4 })
                        }
                      }}
                    >
                      <i className="ti ti-dots" />
                    </button>
                  </div>
                  {rowMenuOpen === plan.id && rowMenuPos ? (
                    <div
                      ref={rowMenuRef}
                      className="ctx-menu"
                      style={{
                        position: 'fixed',
                        top: rowMenuPos.y,
                        left: rowMenuPos.x - 160,
                        zIndex: 1000,
                        width: 160,
                      }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button type="button" className="ctx-item" onClick={() => openEditModal(plan)}>
                        <i className="ti ti-edit" /> Edit
                      </button>
                      <button
                        type="button"
                        className="ctx-item"
                        onClick={() => {
                          setRowMenuOpen(null)
                          setRowMenuPos(null)
                          handleDuplicatePlan(plan.id)
                        }}
                      >
                        <i className="ti ti-copy" /> Duplicate
                      </button>
                      <div className="ctx-sep" />
                      <button
                        type="button"
                        className="ctx-item ctx-item-danger"
                        onClick={() => {
                          setRowMenuOpen(null)
                          setRowMenuPos(null)
                          handleDeletePlan(plan)
                        }}
                      >
                        <i className="ti ti-trash" /> Delete
                      </button>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="resizer-v" data-resize="plan-list" data-min="220" data-max="420" />

        <div className="pl-detail">
          {!selectedPlan ? (
            <div className="pl-no-selection">Select a plan to view details</div>
          ) : (
            <>
              <div className="pl-detail-hd">
                <div className="pl-detail-top">
                  <div className="pl-detail-intro">
                    <span className="pl-detail-id">{selectedPlan.planKey}</span>
                    <h2 className="pl-detail-name">{selectedPlan.title}</h2>
                    <div className="pl-detail-meta-line">
                      Created by Shaun Sevume · Created {formatRelativeTime(selectedPlan.createdAt)}
                      {selectedPlan.description ? ` · ${selectedPlan.description}` : ''}
                    </div>
                  </div>
                  <div className="pl-detail-actions">
                    <button
                      type="button"
                      className="pl-iconbtn"
                      title={planMaximized ? 'Restore panel width' : 'Maximize panel'}
                      onClick={() => setPlanMaximized((v) => !v)}
                    >
                      <i
                        className={`ti ${planMaximized ? 'ti-arrows-minimize' : 'ti-arrows-maximize'}`}
                        style={{ fontSize: 15 }}
                      />
                    </button>
                    <button type="button" className="btn btn-p btn-sm" onClick={openSpawnModal}>
                      <i className="ti ti-player-play" style={{ fontSize: 12 }} /> Create test run
                    </button>
                    <button
                      type="button"
                      className="btn btn-neutral btn-sm"
                      onClick={() => openEditModal(selectedPlan)}
                    >
                      <i className="ti ti-edit" style={{ fontSize: 12 }} /> Edit
                    </button>
                    <div style={{ position: 'relative' }} ref={moreMenuRef}>
                      <button
                        type="button"
                        className="btn btn-neutral btn-sm"
                        onClick={() => setMoreMenuOpen((v) => !v)}
                      >
                        More…
                      </button>
                    {moreMenuOpen ? (
                      <div
                        className="ctx-menu"
                        style={{
                          position: 'absolute',
                          top: '100%',
                          right: 0,
                          marginTop: 4,
                          zIndex: 100,
                          width: 160,
                        }}
                      >
                        <button
                          type="button"
                          className="ctx-item"
                          onClick={() => {
                            setMoreMenuOpen(false)
                            handleDuplicatePlan(selectedPlan.id)
                          }}
                        >
                          <i className="ti ti-copy" /> Duplicate
                        </button>
                        <div className="ctx-sep" />
                        <button
                          type="button"
                          className="ctx-item ctx-item-danger"
                          onClick={() => {
                            setMoreMenuOpen(false)
                            handleDeletePlan(selectedPlan)
                          }}
                        >
                          <i className="ti ti-trash" /> Delete
                        </button>
                      </div>
                    ) : null}
                    </div>
                  </div>
                </div>
                <div className="pl-dtabs">
                  {(['overview', 'testcases'] as const).map((t) => (
                    <div
                      key={t}
                      className={`pl-dtab${tab === t ? ' on' : ''}`}
                      onClick={() => setTab(t)}
                    >
                      {t === 'overview' ? 'Overview' : 'Test cases'}
                      {t === 'testcases' ? <span className="n">{resolvedCases.length}</span> : null}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pl-detail-body">
                {tab === 'overview' ? (
                  <>
                    <div className="pl-overview-cards">
                      <div className="pl-ov-card">
                        <div className="pl-ov-card-hd">
                          <i className="ti ti-info-circle" style={{ fontSize: 15, color: 'var(--text3)' }} />
                          Test plan details
                        </div>
                        <div className="pl-ov-row">
                          <label>Created by</label>
                          <span>Shaun Sevume</span>
                        </div>
                        <div className="pl-ov-row">
                          <label>Created at</label>
                          <span>{formatRelativeTime(selectedPlan.createdAt)}</span>
                        </div>
                        <div className="pl-ov-row">
                          <label>Case count</label>
                          <span>{resolvedCases.length}</span>
                        </div>
                        <div className="pl-ov-row">
                          <label>Linked runs</label>
                          <span>{planRunHistory.length}</span>
                        </div>
                      </div>

                      <div className="pl-ov-card">
                        <div className="pl-ov-card-hd">
                          <i className="ti ti-player-play" style={{ fontSize: 15, color: 'var(--text3)' }} />
                          Open test run
                        </div>
                        <div className="pl-open-run">
                          {openRun ? (
                            <>
                              <Link
                                className="pl-open-run-key"
                                href={testRunPath(activeProject.key, openRun.runKey)}
                              >
                                TR-{openRun.runKey}
                              </Link>
                              <div className="pl-open-run-name">{openRun.name}</div>
                            </>
                          ) : (
                            <button type="button" className="btn btn-p btn-sm" onClick={openSpawnModal}>
                              <i className="ti ti-plus" style={{ fontSize: 12 }} /> Create test run
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="pl-ov-card">
                        <div className="pl-ov-card-hd">
                          <i className="ti ti-chart-donut" style={{ fontSize: 15, color: 'var(--text3)' }} />
                          Test case coverage
                        </div>
                        <div className="pl-coverage-donut">
                          <RunDonut
                            pass={resolvedCases.length}
                            fail={0}
                            blocked={0}
                            notrun={activeCases.length - resolvedCases.length}
                            notrunColor="var(--border2)"
                            size={68}
                            interactive={false}
                            showCompleteLabel={false}
                          />
                          <div className="pl-donut-label">
                            {resolvedCases.length} of {activeCases.length} test cases in this project
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="pl-gl-table pl-run-history">
                      <div className="pl-toolbar">
                        <i className="ti ti-history" style={{ fontSize: 15, color: 'var(--text3)' }} />
                        <h3>Run history</h3>
                      </div>
                      {planRunHistory.length === 0 ? (
                        <div className="pl-empty">No test runs created from this plan yet.</div>
                      ) : (
                        <table>
                          <thead>
                            <tr>
                              <th style={{ width: 64 }}>ID</th>
                              <th>Title</th>
                              <th style={{ width: 190 }}>Results</th>
                              <th style={{ width: 100 }}>Created</th>
                              <th style={{ width: 100 }}>Closed</th>
                            </tr>
                          </thead>
                          <tbody>
                            {planRunHistory.map((run) => (
                              <tr key={run.id}>
                                <td>
                                  <Link
                                    className="pl-run-key"
                                    href={testRunPath(activeProject.key, run.runKey)}
                                  >
                                    TR-{run.runKey}
                                  </Link>
                                </td>
                                <td>{run.name}</td>
                                <td
                                  onMouseEnter={(e) => {
                                    if (runBarHideTimer.current) clearTimeout(runBarHideTimer.current)
                                    setRunBarTooltip({ run, x: e.clientX + 6, y: e.clientY + 6 })
                                  }}
                                  onMouseLeave={() => {
                                    runBarHideTimer.current = setTimeout(() => setRunBarTooltip(null), 300)
                                  }}
                                >
                                  <RunResultBar run={run} />
                                </td>
                                <td style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                                  {formatRelativeTime(run.createdAt)}
                                </td>
                                <td style={{ fontSize: 12, color: 'var(--text3)', whiteSpace: 'nowrap' }}>
                                  {run.sealed
                                    ? formatRelativeTime(run.archivedAt ?? run.createdAt)
                                    : '—'}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="pl-tc-lay">
                    <div className="pl-tc-queries">
                      {queries.map((q) => (
                        <QueryGroupCard
                          key={q.id}
                          query={q}
                          resolvedCount={queryResolvedCases[q.id]?.length ?? 0}
                          activeCases={activeCases}
                          activeFolders={activeFolders}
                          staticSearch={staticSearch[q.id] ?? ''}
                          onStaticSearch={(v) =>
                            setStaticSearch((prev) => ({ ...prev, [q.id]: v }))
                          }
                          onUpdate={(patch) => {
                            commitQueries(
                              queries.map((x) => (x.id === q.id ? { ...x, ...patch } : x)),
                            )
                          }}
                          onRemove={() => {
                            commitQueries(queries.filter((x) => x.id !== q.id))
                          }}
                        />
                      ))}

                      <div style={{ position: 'relative' }} ref={addQueryRef}>
                        <button
                          type="button"
                          className="pl-add-query"
                          onClick={() => setAddQueryMenuOpen((v) => !v)}
                        >
                          <i className="ti ti-plus" /> Add query group
                        </button>
                        {addQueryMenuOpen ? (
                          <div className="pl-add-query-menu">
                            {[
                              {
                                type: 'condition' as const,
                                icon: 'ti-filter',
                                title: 'Condition query',
                                desc: 'Filter cases by field, operator, and value',
                              },
                              {
                                type: 'folder' as const,
                                icon: 'ti-folder',
                                title: 'Folder query',
                                desc: 'Include all cases in selected folders',
                              },
                              {
                                type: 'static' as const,
                                icon: 'ti-checklist',
                                title: 'Static selection',
                                desc: 'Hand-pick individual test cases',
                              },
                            ].map(({ type, icon, title, desc }) => (
                              <div
                                key={type}
                                className="pl-add-query-menu-item"
                                onClick={() => {
                                  const newQuery: TestQuery = {
                                    id: newId('tq'),
                                    title,
                                    type,
                                    ...(type === 'condition'
                                      ? {
                                          conditions: [
                                            { field: 'priority', operator: 'equals', value: '' },
                                          ],
                                        }
                                      : {}),
                                    ...(type === 'folder' ? { folderIds: [] } : {}),
                                    ...(type === 'static' ? { caseIds: [] } : {}),
                                  }
                                  commitQueries([...queries, newQuery])
                                  setAddQueryMenuOpen(false)
                                }}
                              >
                                <i className={`ti ${icon} pl-aqm-icon`} />
                                <div className="pl-aqm-body">
                                  <div className="pl-aqm-title">{title}</div>
                                  <div className="pl-aqm-desc">{desc}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="pl-tc-resolved">
                      <div className="pl-resolved-hd">
                      <i className="ti ti-list-check" style={{ fontSize: 16, color: 'var(--text3)' }} />
                      Resolved test cases
                      <span className="pl-resolved-count">{resolvedCasesAll.length} shown</span>
                    </div>
                    <div className="pl-gl-table">
                      {resolvedCasesAll.length === 0 ? (
                        <div className="pl-resolved-empty">
                          No test cases match the current query groups.
                        </div>
                      ) : (
                        <table>
                          <thead>
                            <tr>
                              <th style={{ width: 70 }}>Key</th>
                              <th>Title</th>
                              <th style={{ width: 84 }}>Priority</th>
                              <th style={{ width: 140 }}>Source</th>
                            </tr>
                          </thead>
                          <tbody>
                            {resolvedCasesAll.map((c) => {
                              const sourceQuery = queries.find((q) =>
                                queryResolvedCases[q.id]?.some((rc) => rc.id === c.id),
                              )
                              return (
                                <tr key={c.id}>
                                  <td>
                                    <span className="pl-resolved-case-key">
                                      {c.caseKey ?? c.id}
                                    </span>
                                  </td>
                                  <td>{c.title}</td>
                                  <td>
                                    <span className={PRIORITY_CLASS[c.priority]}>{c.priority}</span>
                                  </td>
                                  <td>
                                    <span className="pl-tagp pl-resolved-source">
                                      {sourceQuery?.title ?? '—'}
                                    </span>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      )}
                    </div>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {runBarTooltip ? (
        <div
          className="pl-run-bar-popup"
          style={{
            position: 'fixed',
            top: runBarTooltip.y,
            left: runBarTooltip.x,
            zIndex: 300,
          }}
          onMouseEnter={() => {
            if (runBarHideTimer.current) clearTimeout(runBarHideTimer.current)
          }}
          onMouseLeave={() => {
            runBarHideTimer.current = setTimeout(() => setRunBarTooltip(null), 300)
          }}
        >
          {(() => {
            const s = runSummary(runBarTooltip.run)
            return (
              <RunStatusInfographic
                pass={s.passed}
                fail={s.failed}
                blocked={s.blocked}
                notrun={s.notRun}
                skipped={s.skipped}
                size={92}
                compact
                interactive
                showCompleteLabel
              />
            )
          })()}
        </div>
      ) : null}

      {createPlanOpen ? (
        <div
          className="modal-backdrop"
          onClick={() => {
            setCreatePlanOpen(false)
            setCreatePlanTitle('')
            setCreatePlanDesc('')
          }}
        >
          <div
            className="create-dialog"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                setCreatePlanOpen(false)
                setCreatePlanTitle('')
                setCreatePlanDesc('')
              }
              if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
                e.preventDefault()
                handleCreatePlan()
              }
            }}
          >
            <div className="shortcuts-hd">
              <div className="shortcuts-title">New test plan</div>
              <button
                type="button"
                className="btn"
                style={{ padding: '2px 6px' }}
                onClick={() => {
                  setCreatePlanOpen(false)
                  setCreatePlanTitle('')
                  setCreatePlanDesc('')
                }}
              >
                <i className="ti ti-x" style={{ fontSize: 13 }} />
              </button>
            </div>
            <div className="create-body">
              <div className="form-field">
                <label>Title</label>
                <input
                  value={createPlanTitle}
                  onChange={(e) => setCreatePlanTitle(e.target.value)}
                  placeholder="e.g. Sprint regression"
                  autoFocus
                />
              </div>
              <div className="form-field">
                <label>Description</label>
                <textarea
                  rows={3}
                  value={createPlanDesc}
                  onChange={(e) => setCreatePlanDesc(e.target.value)}
                  placeholder="Optional plan description"
                />
              </div>
            </div>
            <div className="create-foot">
              <button
                type="button"
                className="btn"
                onClick={() => {
                  setCreatePlanOpen(false)
                  setCreatePlanTitle('')
                  setCreatePlanDesc('')
                }}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-p"
                disabled={!createPlanTitle.trim()}
                onClick={handleCreatePlan}
              >
                Create plan
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {editPlanOpen && selectedPlan ? (
        <div className="modal-backdrop" onClick={() => setEditPlanOpen(false)}>
          <div
            className="create-dialog"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setEditPlanOpen(false)
              if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
                e.preventDefault()
                handleEditPlan()
              }
            }}
          >
            <div className="shortcuts-hd">
              <div className="shortcuts-title">Edit test plan</div>
              <button
                type="button"
                className="btn"
                style={{ padding: '2px 6px' }}
                onClick={() => setEditPlanOpen(false)}
              >
                <i className="ti ti-x" style={{ fontSize: 13 }} />
              </button>
            </div>
            <div className="create-body">
              <div className="form-field">
                <label>Title</label>
                <input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-field">
                <label>Description</label>
                <textarea
                  rows={3}
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  placeholder="Optional plan description"
                />
              </div>
            </div>
            <div className="create-foot">
              <button type="button" className="btn" onClick={() => setEditPlanOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-p"
                disabled={!editTitle.trim()}
                onClick={handleEditPlan}
              >
                Save changes
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {spawnRunOpen && selectedPlan ? (
        <div className="modal-backdrop" onClick={() => setSpawnRunOpen(false)}>
          <div
            className="create-dialog"
            onClick={(e) => e.stopPropagation()}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setSpawnRunOpen(false)
              if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
                e.preventDefault()
                handleSpawnRun()
              }
            }}
          >
            <div className="shortcuts-hd">
              <div className="shortcuts-title">Create test run from plan</div>
              <button
                type="button"
                className="btn"
                style={{ padding: '2px 6px' }}
                onClick={() => setSpawnRunOpen(false)}
              >
                <i className="ti ti-x" style={{ fontSize: 13 }} />
              </button>
            </div>
            <div className="create-body">
              <div className="form-field">
                <label>Title</label>
                <input
                  value={spawnRunName}
                  onChange={(e) => setSpawnRunName(e.target.value)}
                  autoFocus
                />
              </div>
              <div className="form-field">
                <label>Description</label>
                <textarea
                  rows={3}
                  value={spawnRunDesc}
                  onChange={(e) => setSpawnRunDesc(e.target.value)}
                  placeholder="Optional run description"
                />
              </div>
              <div
                style={{
                  fontSize: 11.5,
                  color: 'var(--text3)',
                  background: 'var(--hover)',
                  borderRadius: 4,
                  padding: '6px 10px',
                }}
              >
                The test run will contain {resolvedCases.length} test cases.
              </div>
            </div>
            <div className="create-foot">
              <button type="button" className="btn" onClick={() => setSpawnRunOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-p"
                disabled={!spawnRunName.trim()}
                onClick={handleSpawnRun}
              >
                Create run
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
