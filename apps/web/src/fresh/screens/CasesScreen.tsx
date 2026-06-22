'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { FreshTopbar } from '../components/FreshTopbar'
import { PrototypeBanner } from '../components/PrototypeBanner'
import { useFresh } from '../data/FreshProvider'
import type { AdminCustomField, Case, CaseExecution, CasePriority, CaseStep, DemoRun, ExecStatus, Folder } from '../data/demo-model'
import {
  casesInFolder,
  EXEC_TO_LEGACY,
  folderLabel,
  formatRelativeTime,
  newId,
  PRIORITY_TO_LEGACY,
  TYPE_PLACEHOLDER_TAGS,
} from '../data/demo-model'
import { EXEC_PILL_LABEL, EXEC_PILL_MAP, PRI_MAP } from '../data/ui-utils'
import { displayAssigneeName, TEAM_USERS } from '../data/team-users'
import { useProjectHref } from '../hooks/useProjectHref'
import { useFreshUI } from '../hooks/useFreshUI'
import { parseTestCaseKey, slugToCaseKey, testCasePath } from '../lib/project-routes'

type StatusFilter = 'all' | 'pass' | 'fail' | 'blocked' | 'not_run'
type DetailTab = 'details' | 'attachments' | 'defects' | 'requirements' | 'runs' | 'history' | 'activity'

const STATUS_CHIPS: { label: string; value: StatusFilter }[] = [
  { label: 'All status', value: 'all' },
  { label: 'Pass', value: 'pass' },
  { label: 'Fail', value: 'fail' },
  { label: 'Blocked', value: 'blocked' },
  { label: 'Not run', value: 'not_run' },
]

const PRI_OPTIONS: CasePriority[] = ['Critical', 'High', 'Medium', 'Low']

const EXEC_COLOR: Record<ExecStatus, string> = {
  Passed:  'var(--pass)',
  Failed:  'var(--fail)',
  Blocked: 'var(--block)',
  Skipped: 'var(--text3)',
  'Not run': 'var(--text3)',
}

type FilterField = 'title' | 'priority' | 'type' | 'assignee' | 'status'
type FilterOperator = 'contains' | 'is'

interface FilterCondition {
  id: string
  field: FilterField
  operator: FilterOperator
  value: string
}

const FILTER_OPERATORS: Record<FilterField, FilterOperator[]> = {
  title:    ['contains'],
  priority: ['is'],
  type:     ['is'],
  assignee: ['contains'],
  status:   ['is'],
}

const FILTER_VALUE_OPTIONS: Partial<Record<FilterField, string[]>> = {
  priority: ['Critical', 'High', 'Medium', 'Low'],
  status:   ['pass', 'fail', 'blocked', 'not_run', 'skip'],
}

function caseLastStatus(runs: { executions: Record<string, { status: ExecStatus }> }[], caseId: string): ExecStatus {
  for (const run of runs) {
    const ex = run.executions[caseId]
    if (ex) return ex.status
  }
  return 'Not run'
}

/** Returns the last N execution statuses for a case, most recent first. */
function caseRecentStatuses(
  runs: { executions: Record<string, { status: ExecStatus }> }[],
  caseId: string,
  n = 5,
): ExecStatus[] {
  const results: ExecStatus[] = []
  for (let i = runs.length - 1; i >= 0; i--) {
    if (results.length >= n) break
    const ex = runs[i].executions[caseId]
    if (ex) results.push(ex.status)
  }
  return results
}

function caseBarRun(
  runs: DemoRun[],
  caseId: string,
  barIndex: number,
): { run: DemoRun; execution: CaseExecution } | null {
  let count = 0
  for (let i = runs.length - 1; i >= 0; i--) {
    const ex = runs[i].executions[caseId]
    if (ex) {
      if (count === barIndex) return { run: runs[i], execution: ex }
      count++
    }
  }
  return null
}

function folderAncestorIds(folders: Folder[], folderId: string): string[] {
  const ids: string[] = []
  let cur = folders.find((f) => f.id === folderId)
  while (cur?.parentId) {
    ids.push(cur.parentId)
    cur = folders.find((f) => f.id === cur!.parentId)
  }
  return ids
}

function FolderTreeNode({
  folder,
  depth,
  cases,
  folders,
  childFolders,
  openFolders,
  selectedFolderId,
  newFolderDraftParentId,
  newFolderInputRef,
  visibleFolderIds,
  onToggleFolder,
  onSelectFolder,
  onCommitNewFolder,
  onCancelNewFolder,
}: {
  folder: Folder
  depth: number
  cases: Case[]
  folders: Folder[]
  childFolders: (parentId: string) => Folder[]
  openFolders: Set<string>
  selectedFolderId: string | '__unfiled__'
  newFolderDraftParentId: string | null | undefined
  newFolderInputRef: RefObject<HTMLInputElement | null>
  visibleFolderIds: Set<string> | null
  onToggleFolder: (id: string) => void
  onSelectFolder: (id: string) => void
  onCommitNewFolder: (name: string) => void
  onCancelNewFolder: () => void
}) {
  if (visibleFolderIds && !visibleFolderIds.has(folder.id)) return null

  const kids = childFolders(folder.id)
  const hasKids = kids.length > 0
  const isOpen = openFolders.has(folder.id)
  const draftingHere = newFolderDraftParentId === folder.id
  const showKids = isOpen && (hasKids || draftingHere)
  const isRoot = depth === 0
  const rowClass = isRoot
    ? `st-root${selectedFolderId === folder.id ? ' on' : ''}`
    : `st-sec${selectedFolderId === folder.id ? ' on' : ''}`
  const rowStyle = !isRoot ? { paddingLeft: 10 + depth * 14 } : undefined

  return (
    <div>
      <div
        className={rowClass}
        style={rowStyle}
        onClick={() => {
          if (hasKids && !isOpen) onToggleFolder(folder.id)
          onSelectFolder(folder.id)
        }}
      >
        {hasKids ? (
          <span
            className={`st-tog${isOpen ? ' open' : ''}`}
            onClick={(e) => { e.stopPropagation(); onToggleFolder(folder.id) }}
          >
            ▶
          </span>
        ) : (
          <span className="st-tog" style={{ visibility: 'hidden' }}>▶</span>
        )}
        {isRoot ? (
          <i
            className="ti ti-folder"
            style={{ fontSize: 12, color: selectedFolderId === folder.id ? 'var(--accent)' : 'var(--text2)' }}
          />
        ) : null}
        {folder.name}
        <span className="st-ct" style={isRoot ? undefined : { marginLeft: 'auto' }}>
          {casesInFolder(cases, folders, folder.id).length}
        </span>
      </div>
      {showKids ? (
        <div className="st-kids open">
          {kids.map((child) => (
            <FolderTreeNode
              key={child.id}
              folder={child}
              depth={depth + 1}
              cases={cases}
              folders={folders}
              childFolders={childFolders}
              openFolders={openFolders}
              selectedFolderId={selectedFolderId}
              newFolderDraftParentId={newFolderDraftParentId}
              newFolderInputRef={newFolderInputRef}
              visibleFolderIds={visibleFolderIds}
              onToggleFolder={onToggleFolder}
              onSelectFolder={onSelectFolder}
              onCommitNewFolder={onCommitNewFolder}
              onCancelNewFolder={onCancelNewFolder}
            />
          ))}
          {draftingHere ? (
            <NewFolderInput
              inputRef={newFolderInputRef}
              onCommit={onCommitNewFolder}
              onCancel={onCancelNewFolder}
            />
          ) : null}
        </div>
      ) : null}
    </div>
  )
}

export function CasesScreen() {
  const { activeFolders, activeCases, activeRuns, activeProject, adminSettings, addCase, replaceCase, deleteCase, addFolder, createRun } = useFresh()
  const { openCreateCase } = useFreshUI()
  const projectHref = useProjectHref()
  const pathname = usePathname()
  const router = useRouter()
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set(['f-ctms', 'f-etmf', 'f-viewer']))
  const [selectedFolderId, setSelectedFolderId] = useState<string | '__unfiled__'>('f-rec')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [detailCaseId, setDetailCaseId] = useState<string | null>(null)
  const [detailTab, setDetailTab] = useState<DetailTab>('details')
  const [detailMaximized, setDetailMaximized] = useState(false)
  const savedDetailWidth = useRef('360px')
  const [quickOpen, setQuickOpen] = useState(false)
  const [quickText, setQuickText] = useState('')
  const quickInputRef = useRef<HTMLInputElement>(null)
  const newFolderInputRef = useRef<HTMLInputElement>(null)
  const [newFolderDraft, setNewFolderDraft] = useState<{ parentId: string | null } | null>(null)
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [filterConditions, setFilterConditions] = useState<FilterCondition[]>([])
  const [keywordSearch, setKeywordSearch] = useState('')
  const [filterPanelOpen, setFilterPanelOpen] = useState(false)
  const [draftFilter, setDraftFilter] = useState<{ field: FilterField; operator: FilterOperator; value: string }>({
    field: 'title',
    operator: 'contains',
    value: '',
  })
  const filterPanelRef = useRef<HTMLDivElement>(null)
  const [pageSize, setPageSize] = useState<number | 'all'>(25)
  const [currentPage, setCurrentPage] = useState(1)
  const [folderSearch, setFolderSearch] = useState('')
  const [contextMenu, setContextMenu] = useState<{ caseId: string; x: number; y: number } | null>(null)
  const [sparkTooltip, setSparkTooltip] = useState<{
    caseId: string
    barIndex: number
    x: number
    y: number
  } | null>(null)
  const sparkHideTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)
  const pendingEditRef = useRef<string | null>(null)
  const [createRunMenuOpen, setCreateRunMenuOpen] = useState(false)
  const createRunMenuRef = useRef<HTMLDivElement>(null)
  const [createRunModal, setCreateRunModal] = useState<{
    scope: 'folder' | 'all'
    name: string
  } | null>(null)

  useEffect(() => {
    const slug = parseTestCaseKey(pathname)
    if (!slug) return
    const key = slugToCaseKey(slug)
    const match = activeCases.find((c) => c.caseKey === key)
    if (match) setDetailCaseId(match.id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []) // intentionally run only once on mount

  useEffect(() => {
    if (!activeProject.key) return
    const detail = detailCaseId ? activeCases.find((c) => c.id === detailCaseId) : null
    const target = testCasePath(activeProject.key, detail?.caseKey)
    if (target !== pathname) window.history.replaceState(null, '', target)
  }, [detailCaseId]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!filterPanelOpen) return
    function handleClick(e: MouseEvent) {
      if (filterPanelRef.current && !filterPanelRef.current.contains(e.target as Node)) {
        setFilterPanelOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [filterPanelOpen])

  useEffect(() => {
    if (!contextMenu) return
    function handleClick(e: MouseEvent) {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
        setContextMenu(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [contextMenu])

  useEffect(() => {
    pendingEditRef.current = null
  }, [detailCaseId])

  useEffect(() => {
    const roots = activeFolders.filter((f) => !f.parentId)
    const firstFolder = roots[0]?.id ?? '__unfiled__'
    setSelectedFolderId(firstFolder)
    setSelectedIds(new Set())
    setDetailCaseId(null)
    setOpenFolders(new Set(roots.map((f) => f.id)))
    setCurrentPage(1)
  }, [activeProject.id])

  useEffect(() => { setCurrentPage(1) }, [selectedFolderId, statusFilter, filterConditions, keywordSearch])

  useEffect(() => {
    if (!createRunMenuOpen) return
    function handleClick(e: MouseEvent) {
      if (createRunMenuRef.current && !createRunMenuRef.current.contains(e.target as Node)) {
        setCreateRunMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [createRunMenuOpen])

  const rootFolders = useMemo(
    () => activeFolders.filter((f) => !f.parentId).sort((a, b) => a.name.localeCompare(b.name)),
    [activeFolders],
  )
  const childFolders = useCallback(
    (parentId: string) =>
      activeFolders.filter((f) => f.parentId === parentId).sort((a, b) => a.name.localeCompare(b.name)),
    [activeFolders],
  )

  const visibleFolderIds = useMemo(() => {
    if (!folderSearch.trim()) return null
    const term = folderSearch.toLowerCase()
    const matched = new Set(activeFolders.filter((f) => f.name.toLowerCase().includes(term)).map((f) => f.id))
    matched.forEach((id) => {
      folderAncestorIds(activeFolders, id).forEach((aid) => matched.add(aid))
    })
    return matched
  }, [folderSearch, activeFolders])

  const folderCases = useMemo(
    () => casesInFolder(activeCases, activeFolders, selectedFolderId),
    [activeCases, activeFolders, selectedFolderId],
  )

  const displayedCases = useMemo(() => {
    let result = folderCases

    // Legacy status chip filter
    if (statusFilter !== 'all') {
      result = result.filter((c) => EXEC_TO_LEGACY[caseLastStatus(activeRuns, c.id)] === statusFilter)
    }

    // Advanced filter conditions
    for (const cond of filterConditions) {
      result = result.filter((c) => {
        switch (cond.field) {
          case 'title':
            return c.title.toLowerCase().includes(cond.value.toLowerCase())
          case 'priority':
            return c.priority.toLowerCase() === cond.value.toLowerCase()
          case 'type':
            return c.type.toLowerCase() === cond.value.toLowerCase()
          case 'assignee':
            return (c.assignee ?? '').toLowerCase().includes(cond.value.toLowerCase())
          case 'status': {
            const last = EXEC_TO_LEGACY[caseLastStatus(activeRuns, c.id)]
            return last === cond.value
          }
          default:
            return true
        }
      })
    }

    if (keywordSearch.trim()) {
      const kw = keywordSearch.toLowerCase()
      result = result.filter((c) =>
        c.title.toLowerCase().includes(kw) ||
        (c.caseKey ?? '').toLowerCase().includes(kw)
      )
    }

    return result
  }, [folderCases, statusFilter, activeRuns, filterConditions, keywordSearch])

  const totalCases = displayedCases.length
  const pageSizeNum = pageSize === 'all' ? totalCases : pageSize
  const totalPages = Math.max(1, Math.ceil(totalCases / pageSizeNum))
  const safePage = Math.min(currentPage, totalPages)
  const pagedCases = pageSize === 'all'
    ? displayedCases
    : displayedCases.slice((safePage - 1) * pageSizeNum, safePage * pageSizeNum)

  const detail = detailCaseId ? activeCases.find((c) => c.id === detailCaseId) ?? null : null
  const detailIdx = detailCaseId
    ? displayedCases.findIndex((c) => c.id === detailCaseId)
    : -1

  useEffect(() => {
    if (!detail) return
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT') return
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        if (detailIdx > 0) setDetailCaseId(displayedCases[detailIdx - 1].id)
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        if (detailIdx < displayedCases.length - 1) setDetailCaseId(displayedCases[detailIdx + 1].id)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [detail, detailIdx, displayedCases])

  function toggleFolder(id: string) {
    setOpenFolders((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectFolder(id: string) {
    setSelectedFolderId(id)
    setDetailCaseId(null)
    setSelectedIds(new Set())
    if (id !== '__unfiled__') {
      const ancestors = folderAncestorIds(activeFolders, id)
      if (ancestors.length > 0) {
        setOpenFolders((prev) => {
          const next = new Set(prev)
          ancestors.forEach((aid) => next.add(aid))
          return next
        })
      }
    }
  }

  function toggleMaximize() {
    if (!detailMaximized) {
      const w = getComputedStyle(document.documentElement).getPropertyValue('--case-detail-width').trim()
      if (w) savedDetailWidth.current = w
      setDetailMaximized(true)
    } else {
      document.documentElement.style.setProperty('--case-detail-width', savedDetailWidth.current)
      setDetailMaximized(false)
    }
  }

  useEffect(() => {
    if (!detail) setDetailMaximized(false)
  }, [detail])

  useEffect(() => {
    if (quickOpen) quickInputRef.current?.focus()
  }, [quickOpen])

  const targetFolderId = selectedFolderId === '__unfiled__' ? null : selectedFolderId

  function addQuickCase(title: string) {
    const trimmed = title.trim()
    if (!trimmed) return
    addCase({
      title: trimmed,
      folderId: targetFolderId,
      priority: 'Medium',
      type: 'Functional',
      preconditions: '—',
      steps: [{ id: newId('step'), action: 'Execute test steps', expected: 'Expected result documented', comments: [] }],
      generalComments: [],
      tags: [],
      assignee: TEAM_USERS[1],
    })
    setQuickText('')
    requestAnimationFrame(() => quickInputRef.current?.focus())
  }

  const newFolderDraftParentId = newFolderDraft?.parentId ?? null

  useEffect(() => {
    if (!newFolderDraft) return
    if (newFolderDraft.parentId) {
      const ancestors = folderAncestorIds(activeFolders, newFolderDraft.parentId)
      setOpenFolders((prev) => {
        const next = new Set(prev)
        next.add(newFolderDraft.parentId!)
        ancestors.forEach((aid) => next.add(aid))
        return next
      })
    }
    requestAnimationFrame(() => {
      const el = newFolderInputRef.current
      if (el) {
        el.focus()
        el.select()
      }
    })
  }, [newFolderDraft, activeFolders])

  function startCreateFolder() {
    const parentId = selectedFolderId === '__unfiled__' ? null : selectedFolderId
    setNewFolderDraft({ parentId })
  }

  function commitNewFolder(name: string) {
    if (!newFolderDraft) return
    const trimmed = name.trim()
    if (!trimmed) {
      setNewFolderDraft(null)
      return
    }
    const parentId = newFolderDraft.parentId
    const id = addFolder(trimmed, parentId)
    setNewFolderDraft(null)
    if (parentId) {
      const ancestors = folderAncestorIds(activeFolders, parentId)
      setOpenFolders((prev) => {
        const next = new Set(prev)
        next.add(parentId)
        ancestors.forEach((aid) => next.add(aid))
        return next
      })
    }
    selectFolder(id)
  }

  function cancelNewFolder() {
    setNewFolderDraft(null)
  }

  const unfiledCount = activeCases.filter((c) => !c.folderId).length

  function openCreateRunModal(scope: 'folder' | 'all') {
    setCreateRunMenuOpen(false)
    setCreateRunModal({ scope, name: '' })
  }

  function doCreateRun() {
    if (!createRunModal?.name.trim()) return
    const caseIds =
      createRunModal.scope === 'folder'
        ? folderCases.map((c) => c.id)
        : undefined
    createRun({ name: createRunModal.name.trim(), caseIds })
    setCreateRunModal(null)
    router.push(projectHref('testruns'))
  }

  return (
    <div className="view">
      <FreshTopbar
        breadcrumbs={[
          { label: 'Dashboard', href: projectHref('dashboard') },
          { label: activeProject.name },
          { label: 'Test cases' },
        ]}
        searchPlaceholder="Search cases…"
        searchWidth={200}
        actions={
          <>
            <div style={{ position: 'relative' }} ref={createRunMenuRef}>
              <button
                type="button"
                className="btn"
                onClick={() => setCreateRunMenuOpen((v) => !v)}
              >
                <i className="ti ti-player-play" style={{ fontSize: 12 }} /> Create test run
                <i className="ti ti-chevron-down" style={{ fontSize: 10, marginLeft: 3 }} />
              </button>
              {createRunMenuOpen ? (
                <div
                  style={{
                    position: 'absolute',
                    top: '100%',
                    right: 0,
                    marginTop: 4,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    boxShadow: '0 4px 16px rgba(0,0,0,.18)',
                    zIndex: 200,
                    minWidth: 220,
                    padding: 4,
                  }}
                >
                  <button
                    type="button"
                    className="ctx-item"
                    onClick={() => openCreateRunModal('folder')}
                  >
                    <i className="ti ti-folder" /> Cases in current folder ({folderCases.length})
                  </button>
                  <button
                    type="button"
                    className="ctx-item"
                    onClick={() => openCreateRunModal('all')}
                  >
                    <i className="ti ti-stack" /> All project cases ({activeCases.length})
                  </button>
                </div>
              ) : null}
            </div>
            <button type="button" className="btn" onClick={() => selectFolder('f-import')}><i className="ti ti-upload" style={{ fontSize: 12 }} /> Import</button>
            <button type="button" className="btn" onClick={() => setQuickOpen((v) => !v)}><i className="ti ti-bolt" style={{ fontSize: 12 }} /> Quick create</button>
            <button type="button" className="btn btn-p" onClick={() => openCreateCase(targetFolderId)}><i className="ti ti-plus" style={{ fontSize: 12 }} /> New case</button>
          </>
        }
      />
      <PrototypeBanner />
      <div className={`tc-lay${detailMaximized ? ' dp-maximized' : ''}`}>
        <div className="suite-tree">
          <div className="st-hd">
            <i className="ti ti-folder" style={{ fontSize: 13, color: 'var(--text2)' }} />
            <span className="st-ttl">Folders</span>
            <button type="button" className="btn" style={{ padding: '2px 5px', fontSize: 13, lineHeight: 1 }} onClick={startCreateFolder} title="Add folder"><i className="ti ti-plus" /></button>
          </div>
          <div style={{ padding: '6px 8px', borderBottom: '1px solid var(--border)' }}>
            <input
              type="text"
              placeholder="Filter folders…"
              value={folderSearch}
              onChange={(e) => setFolderSearch(e.target.value)}
              style={{
                width: '100%',
                fontSize: 12,
                padding: '3px 7px',
                borderRadius: 4,
                border: '1px solid var(--border)',
                background: 'var(--surface)',
                color: 'var(--text1)',
                boxSizing: 'border-box',
              }}
            />
          </div>
          <div className="st-body">
            <div
              className={`st-sec${selectedFolderId === '__unfiled__' ? ' on' : ''}`}
              style={{ marginBottom: 4 }}
              onClick={() => selectFolder('__unfiled__')}
            >
              Unfiled
              <span className="st-ct" style={{ marginLeft: 'auto' }}>{unfiledCount}</span>
            </div>
            {rootFolders.map((folder) => (
              <FolderTreeNode
                key={folder.id}
                folder={folder}
                depth={0}
                cases={activeCases}
                folders={activeFolders}
                childFolders={childFolders}
                openFolders={openFolders}
                selectedFolderId={selectedFolderId}
                newFolderDraftParentId={newFolderDraftParentId}
                newFolderInputRef={newFolderInputRef}
                visibleFolderIds={visibleFolderIds}
                onToggleFolder={toggleFolder}
                onSelectFolder={selectFolder}
                onCommitNewFolder={commitNewFolder}
                onCancelNewFolder={cancelNewFolder}
              />
            ))}
            {newFolderDraft && newFolderDraftParentId === null ? (
              <NewFolderInput
                inputRef={newFolderInputRef}
                onCommit={commitNewFolder}
                onCancel={cancelNewFolder}
              />
            ) : null}
          </div>
        </div>

        <div className="resizer-v" data-resize="suite-tree" data-min="160" data-max="360" />

        <div className="tc-main">
          <div className="tc-bar">
            {STATUS_CHIPS.map(({ label, value }) => (
              <span
                key={label}
                className={`chip${statusFilter === value ? ' on' : ''}`}
                onClick={() => { setStatusFilter(value); setDetailCaseId(null) }}
              >
                {label}
              </span>
            ))}

            <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 2px' }} />

            <div style={{ position: 'relative' }}>
              <button
                type="button"
                className={`chip${filterConditions.length > 0 ? ' on' : ''}`}
                onClick={() => setFilterPanelOpen((v) => !v)}
              >
                <i className="ti ti-filter" style={{ fontSize: 11 }} /> Filter
                {filterConditions.length > 0 ? (
                  <span style={{
                    marginLeft: 4,
                    background: 'var(--accent)',
                    color: '#fff',
                    borderRadius: 8,
                    padding: '0 5px',
                    fontSize: 10,
                    fontWeight: 700,
                  }}>
                    {filterConditions.length}
                  </span>
                ) : null}
              </button>

              {filterPanelOpen ? (
                <div
                  ref={filterPanelRef}
                  style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    zIndex: 200,
                    marginTop: 4,
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: 6,
                    boxShadow: '0 4px 16px rgba(0,0,0,.18)',
                    padding: 10,
                    minWidth: 360,
                  }}
                >
                  {filterConditions.length > 0 ? (
                    <div style={{ marginBottom: 8, display: 'flex', flexDirection: 'column', gap: 4 }}>
                      {filterConditions.map((cond) => (
                        <div key={cond.id} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12 }}>
                          <span style={{ color: 'var(--text2)', minWidth: 60 }}>{cond.field}</span>
                          <span style={{ color: 'var(--text3)' }}>{cond.operator}</span>
                          <span style={{ fontWeight: 600 }}>{cond.value}</span>
                          <button
                            type="button"
                            className="btn"
                            style={{ padding: '1px 5px', marginLeft: 'auto', fontSize: 11 }}
                            onClick={() => setFilterConditions((prev) => prev.filter((c) => c.id !== cond.id))}
                          >
                            <i className="ti ti-x" style={{ fontSize: 10 }} />
                          </button>
                        </div>
                      ))}
                      <button
                        type="button"
                        style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 11, cursor: 'pointer', textAlign: 'left', padding: 0, marginTop: 2 }}
                        onClick={() => setFilterConditions([])}
                      >
                        Clear all
                      </button>
                    </div>
                  ) : null}

                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    <select
                      style={{ fontSize: 12, flex: '0 0 auto' }}
                      value={draftFilter.field}
                      onChange={(e) => {
                        const field = e.target.value as FilterField
                        const op = FILTER_OPERATORS[field][0]
                        setDraftFilter({ field, operator: op, value: '' })
                      }}
                    >
                      <option value="title">Title</option>
                      <option value="priority">Priority</option>
                      <option value="type">Type</option>
                      <option value="assignee">Assignee</option>
                      <option value="status">Status</option>
                    </select>
                    <span style={{ fontSize: 11, color: 'var(--text3)', flexShrink: 0 }}>{draftFilter.operator}</span>
                    {FILTER_VALUE_OPTIONS[draftFilter.field] ? (
                      <select
                        style={{ fontSize: 12, flex: 1 }}
                        value={draftFilter.value}
                        onChange={(e) => setDraftFilter((d) => ({ ...d, value: e.target.value }))}
                      >
                        <option value="">Select…</option>
                        {FILTER_VALUE_OPTIONS[draftFilter.field]!.map((v) => <option key={v} value={v}>{v}</option>)}
                      </select>
                    ) : (
                      <input
                        type="text"
                        style={{ fontSize: 12, flex: 1 }}
                        placeholder={`Filter by ${draftFilter.field}…`}
                        value={draftFilter.value}
                        onChange={(e) => setDraftFilter((d) => ({ ...d, value: e.target.value }))}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && draftFilter.value.trim()) {
                            setFilterConditions((prev) => [...prev, { ...draftFilter, id: newId('filter'), value: draftFilter.value.trim() }])
                            setDraftFilter((d) => ({ ...d, value: '' }))
                          }
                        }}
                      />
                    )}
                    <button
                      type="button"
                      className="btn btn-p"
                      style={{ fontSize: 12, padding: '2px 8px', flexShrink: 0 }}
                      disabled={!draftFilter.value.trim()}
                      onClick={() => {
                        if (!draftFilter.value.trim()) return
                        setFilterConditions((prev) => [...prev, { ...draftFilter, id: newId('filter'), value: draftFilter.value.trim() }])
                        setDraftFilter((d) => ({ ...d, value: '' }))
                      }}
                    >
                      Add
                    </button>
                  </div>
                </div>
              ) : null}
            </div>

            <div style={{ position: 'relative', marginLeft: 'auto' }}>
              <i
                className="ti ti-search"
                style={{
                  position: 'absolute', left: 7, top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: 12, color: 'var(--text3)', pointerEvents: 'none',
                }}
              />
              <input
                type="text"
                placeholder="Search cases…"
                value={keywordSearch}
                onChange={(e) => setKeywordSearch(e.target.value)}
                style={{
                  fontSize: 12,
                  padding: '3px 7px 3px 24px',
                  borderRadius: 4,
                  border: '1px solid var(--border)',
                  background: 'var(--surface)',
                  color: 'var(--text1)',
                  width: 180,
                }}
              />
            </div>
            <span style={{ fontSize: 10.5, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>
              {displayedCases.length} cases
            </span>
          </div>

          <div className={`bulk${selectedIds.size > 0 ? ' on' : ''}`}>
            <span className="bulk-n">{selectedIds.size} selected</span>
            <button type="button" className="btn" style={{ fontSize: 10.5, padding: '2px 7px' }}>Add to run</button>
            <button type="button" className="btn" style={{ fontSize: 10.5, padding: '2px 7px' }}>Clone</button>
            <button type="button" className="btn" style={{ fontSize: 10.5, padding: '2px 7px' }}>Move</button>
            <button type="button" className="btn" style={{ fontSize: 10.5, padding: '2px 7px' }}>Assign</button>
            <button type="button" className="btn" style={{ fontSize: 10.5, padding: '2px 7px', color: 'var(--fail)', borderColor: 'rgba(198,40,40,.3)' }}>Archive</button>
            <button type="button" className="btn" style={{ fontSize: 10.5, padding: '2px 7px', marginLeft: 'auto' }} onClick={() => setSelectedIds(new Set())}>
              <i className="ti ti-x" style={{ fontSize: 11 }} /> Clear
            </button>
          </div>

          <div className={`quick-box${quickOpen ? ' on' : ''}`}>
            <input
              ref={quickInputRef}
              className="quick-input"
              type="text"
              placeholder="Type a title and press Enter to add…"
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  addQuickCase(quickText)
                }
                if (e.key === 'Escape') setQuickOpen(false)
              }}
            />
            <button type="button" className="btn" onClick={() => setQuickOpen(false)}>Close</button>
          </div>

          <div className="tc-wrap">
            {displayedCases.length > 0 ? (
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 28 }}><input type="checkbox" onChange={(e) => {
                      if (e.target.checked) setSelectedIds(new Set(displayedCases.map((c) => c.id)))
                      else setSelectedIds(new Set())
                    }} /></th>
                    <th style={{ width: 68 }}>ID</th>
                    <th>Title</th>
                    <th style={{ width: 72 }}>Priority</th>
                    <th style={{ width: 100 }}>Folder</th>
                    <th style={{ width: 88 }}>Type</th>
                    <th style={{ width: 120 }}>Last results</th>
                    <th style={{ width: 100 }}>Assigned</th>
                    <th style={{ width: 50, textAlign: 'center' }}>Steps</th>
                    <th style={{ width: 70 }}>Updated</th>
                    <th style={{ width: 28 }} />
                  </tr>
                </thead>
                <tbody>
                  {pagedCases.map((c) => {
                    return (
                      <tr
                        key={c.id}
                        className={detailCaseId === c.id ? 'sel' : ''}
                        onClick={() => setDetailCaseId(c.id)}
                      >
                        <td onClick={(e) => e.stopPropagation()}>
                          <input
                            type="checkbox"
                            checked={selectedIds.has(c.id)}
                            onChange={() => setSelectedIds((prev) => {
                              const next = new Set(prev)
                              if (next.has(c.id)) next.delete(c.id)
                              else next.add(c.id)
                              return next
                            })}
                          />
                        </td>
                        <td className="tmono" style={{ color: 'var(--accent)', fontWeight: 500 }}>{c.caseKey ?? c.id}</td>
                        <td className="title-cell" style={{ maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</td>
                        <td><span className={`pri ${PRI_MAP[PRIORITY_TO_LEGACY[c.priority]]}`}>{c.priority}</span></td>
                        <td style={{ color: 'var(--accent)', fontSize: 11.5, fontWeight: 500 }}>{folderLabel(activeFolders, c.folderId)}</td>
                        <td style={{ color: 'var(--text2)' }}>{c.type}</td>
                        <td>
                          {(() => {
                            const last = caseLastStatus(activeRuns, c.id)
                            const recent = caseRecentStatuses(activeRuns, c.id, 5)
                            return (
                              <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                <span style={{
                                  display: 'inline-block',
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  background: EXEC_COLOR[last],
                                  flexShrink: 0,
                                }} title={last} />
                                <div style={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
                                  {Array.from({ length: 5 }).map((_, i) => {
                                    const s = recent[i]
                                    return (
                                      <div
                                        key={i}
                                        title={s ?? 'No data'}
                                        style={{
                                          width: 4,
                                          height: s ? 10 : 4,
                                          borderRadius: 1,
                                          background: s ? EXEC_COLOR[s] : 'var(--border)',
                                          opacity: s ? 1 : 0.4,
                                          outline: sparkTooltip?.caseId === c.id && sparkTooltip?.barIndex === i ? '1.5px solid #000' : 'none',
                                        }}
                                        onMouseEnter={s ? (e) => {
                                          if (sparkHideTimer.current) clearTimeout(sparkHideTimer.current)
                                          const rect = e.currentTarget.getBoundingClientRect()
                                          setSparkTooltip({ caseId: c.id, barIndex: i, x: rect.left, y: rect.bottom + 6 })
                                        } : undefined}
                                        onMouseLeave={s ? () => {
                                          sparkHideTimer.current = setTimeout(() => setSparkTooltip(null), 400)
                                        } : undefined}
                                      />
                                    )
                                  })}
                                </div>
                              </div>
                            )
                          })()}
                        </td>
                        <td style={{ color: 'var(--text2)' }}>{displayAssigneeName(c.assignee)}</td>
                        <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', color: 'var(--text3)' }}>{c.steps.length}</td>
                        <td style={{ color: 'var(--text3)' }}>{formatRelativeTime(c.updatedAt)}</td>
                        <td
                          style={{ width: 28, textAlign: 'center' }}
                          className="row-actions-cell"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            className="row-ctx-btn"
                            title="More options"
                            onClick={(e) => {
                              e.stopPropagation()
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect()
                              setContextMenu(contextMenu?.caseId === c.id ? null : { caseId: c.id, x: rect.right, y: rect.bottom + 4 })
                            }}
                          >
                            <i className="ti ti-dots" style={{ fontSize: 13 }} />
                          </button>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="empty-state on">
                <div className="empty-card">
                  <i className="ti ti-folder-open" />
                  <div className="empty-title">No test cases in this folder</div>
                  <div className="empty-copy">Create a new case, quick add several titles, or import existing cases into the selected folder.</div>
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button type="button" className="btn btn-p" onClick={() => openCreateCase(targetFolderId)}><i className="ti ti-plus" style={{ fontSize: 12 }} /> Create test case</button>
                    <button type="button" className="btn" onClick={() => setQuickOpen(true)}><i className="ti ti-bolt" style={{ fontSize: 12 }} /> Quick create</button>
                  </div>
                </div>
              </div>
            )}
          </div>
          {totalCases > 0 ? (
            <div className="tc-pagination">
              <span style={{ fontSize: 11, color: 'var(--text2)', marginRight: 8 }}>Rows per page:</span>
              <select
                style={{ fontSize: 11, padding: '1px 4px' }}
                value={pageSize}
                onChange={(e) => {
                  setPageSize(e.target.value === 'all' ? 'all' : Number(e.target.value))
                  setCurrentPage(1)
                }}
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value="all">All</option>
              </select>
              <span style={{ fontSize: 11, color: 'var(--text2)', margin: '0 12px' }}>
                {pageSize === 'all' || totalCases === 0
                  ? `${totalCases} cases`
                  : `${(safePage - 1) * pageSizeNum + 1}–${Math.min(safePage * pageSizeNum, totalCases)} of ${totalCases}`}
              </span>
              <button
                type="button"
                className="btn"
                style={{ padding: '1px 6px', fontSize: 12 }}
                disabled={safePage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              >
                <i className="ti ti-chevron-left" style={{ fontSize: 13 }} />
              </button>
              <button
                type="button"
                className="btn"
                style={{ padding: '1px 6px', fontSize: 12 }}
                disabled={safePage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              >
                <i className="ti ti-chevron-right" style={{ fontSize: 13 }} />
              </button>
            </div>
          ) : null}
        </div>

        <div className="resizer-v detail-resizer" data-resize="case-detail" data-min="540" data-max="720" />
        <div className={`dp${detail ? ' open' : ''}${detailMaximized ? ' maximized' : ''}`}>
          {detail ? (
            <CaseDetail
              caseData={detail}
              folders={activeFolders}
              tab={detailTab}
              onTab={setDetailTab}
              onClose={() => setDetailCaseId(null)}
              onSave={replaceCase}
              maximized={detailMaximized}
              onToggleMaximize={toggleMaximize}
              activeCustomFieldIds={activeProject.activeCustomFieldIds}
              allCustomFields={adminSettings.customFields}
              startEditOnMount={pendingEditRef.current === detailCaseId}
              caseIndex={detailIdx}
              totalCases={displayedCases.length}
              onPrevCase={() => {
                if (detailIdx > 0) setDetailCaseId(displayedCases[detailIdx - 1].id)
              }}
              onNextCase={() => {
                if (detailIdx < displayedCases.length - 1)
                  setDetailCaseId(displayedCases[detailIdx + 1].id)
              }}
            />
          ) : null}
        </div>
      </div>
      {contextMenu ? (() => {
        const menuCase = activeCases.find((c) => c.id === contextMenu.caseId)
        if (!menuCase) return null
        return (
          <div
            ref={contextMenuRef}
            className="ctx-menu"
            style={{ position: 'fixed', top: contextMenu.y, left: contextMenu.x - 160, zIndex: 1000, width: 160 }}
          >
            <button type="button" className="ctx-item" onClick={() => {
              const { id: _id, updatedAt: _updatedAt, projectId: _projectId, ...copyData } = menuCase
              const copyId = addCase(copyData)
              setDetailCaseId(copyId)
              setContextMenu(null)
            }}>
              <i className="ti ti-copy" /> Duplicate
            </button>
            <button type="button" className="ctx-item" onClick={() => {
              setDetailCaseId(menuCase.id)
              setDetailTab('details')
              pendingEditRef.current = menuCase.id
              setContextMenu(null)
            }}>
              <i className="ti ti-edit" /> Edit
            </button>
            <div className="ctx-sep" />
            <button type="button" className="ctx-item" onClick={() => {
              alert('Copy to… — coming soon')
              setContextMenu(null)
            }}>
              <i className="ti ti-copy-plus" /> Copy to…
            </button>
            <button type="button" className="ctx-item" onClick={() => {
              alert('Move to… — coming soon')
              setContextMenu(null)
            }}>
              <i className="ti ti-arrows-move" /> Move to…
            </button>
            <button type="button" className="ctx-item" onClick={() => {
              if (menuCase.folderId) selectFolder(menuCase.folderId)
              setContextMenu(null)
            }}>
              <i className="ti ti-folder" /> Open folder
            </button>
            <div className="ctx-sep" />
            <button type="button" className="ctx-item ctx-item-danger" onClick={() => {
              if (window.confirm('Delete this test case?')) {
                if (detailCaseId === menuCase.id) setDetailCaseId(null)
                deleteCase(menuCase.id)
              }
              setContextMenu(null)
            }}>
              <i className="ti ti-trash" /> Delete
            </button>
          </div>
        )
      })() : null}
      {sparkTooltip ? (() => {
        const lr = caseBarRun(activeRuns, sparkTooltip.caseId, sparkTooltip.barIndex)
        if (!lr) return null
        return (
          <div
            style={{
              position: 'fixed',
              top: sparkTooltip.y,
              left: sparkTooltip.x,
              zIndex: 300,
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 6,
              boxShadow: '0 4px 16px rgba(0,0,0,.18)',
              padding: '8px 10px',
              fontSize: 11.5,
              minWidth: 190,
              pointerEvents: 'auto',
            }}
            onMouseEnter={() => {
              if (sparkHideTimer.current) clearTimeout(sparkHideTimer.current)
            }}
            onMouseLeave={() => {
              sparkHideTimer.current = setTimeout(() => setSparkTooltip(null), 400)
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 5, color: 'var(--text1)' }}>
              {lr.run.name}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <div>
                <span style={{ color: 'var(--text3)' }}>Result: </span>
                <span style={{ color: EXEC_COLOR[lr.execution.status], fontWeight: 600 }}>
                  {lr.execution.status}
                </span>
              </div>
              {lr.execution.assignee ? (
                <div>
                  <span style={{ color: 'var(--text3)' }}>Tested by: </span>
                  <span>{displayAssigneeName(lr.execution.assignee)}</span>
                </div>
              ) : null}
              <div style={{ color: 'var(--text3)', fontSize: 10.5, marginTop: 1 }}>
                Run {lr.run.runKey}
              </div>
            </div>
          </div>
        )
      })() : null}
      {createRunModal ? (
        <div
          style={{
            position: 'fixed', inset: 0, zIndex: 400,
            background: 'rgba(0,0,0,.25)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          onClick={() => setCreateRunModal(null)}
        >
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 8,
              padding: 20,
              width: 340,
              boxShadow: '0 8px 32px rgba(0,0,0,.22)',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ fontWeight: 600, fontSize: 14, marginBottom: 10 }}>
              Create test run
            </div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 10 }}>
              {createRunModal.scope === 'folder'
                ? `${folderCases.length} cases from "${folderLabel(activeFolders, selectedFolderId === '__unfiled__' ? null : selectedFolderId)}"`
                : `${activeCases.length} cases (all project cases)`}
            </div>
            <input
              // eslint-disable-next-line jsx-a11y/no-autofocus
              autoFocus
              type="text"
              placeholder="Run name…"
              value={createRunModal.name}
              onChange={(e) =>
                setCreateRunModal((m) => (m ? { ...m, name: e.target.value } : m))
              }
              onKeyDown={(e) => {
                if (e.key === 'Enter') doCreateRun()
                if (e.key === 'Escape') setCreateRunModal(null)
              }}
              style={{
                width: '100%',
                fontSize: 13,
                padding: '6px 8px',
                borderRadius: 4,
                border: '1px solid var(--border)',
                background: 'var(--surface2, var(--surface))',
                color: 'var(--text1)',
                boxSizing: 'border-box',
                marginBottom: 14,
              }}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn"
                onClick={() => setCreateRunModal(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-p"
                disabled={!createRunModal.name.trim()}
                onClick={doCreateRun}
              >
                <i className="ti ti-player-play" style={{ fontSize: 12 }} /> Create
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function NewFolderInput({
  inputRef,
  onCommit,
  onCancel,
}: {
  inputRef: React.RefObject<HTMLInputElement | null>
  onCommit: (name: string) => void
  onCancel: () => void
}) {
  const [name, setName] = useState('New folder')
  const committedRef = useRef(false)

  return (
    <div className="st-new-folder" onClick={(e) => e.stopPropagation()}>
      <i className="ti ti-folder" style={{ fontSize: 12, color: 'var(--accent)', flexShrink: 0 }} />
      <input
        ref={inputRef}
        className="st-new-folder-input"
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault()
            committedRef.current = true
            onCommit(name)
          }
          if (e.key === 'Escape') {
            e.preventDefault()
            committedRef.current = true
            onCancel()
          }
        }}
        onBlur={() => {
          if (committedRef.current) return
          if (!name.trim()) onCancel()
          else onCommit(name)
        }}
      />
    </div>
  )
}

function CaseDetail({
  caseData,
  folders,
  tab,
  onTab,
  onClose,
  onSave,
  maximized,
  onToggleMaximize,
  activeCustomFieldIds,
  allCustomFields,
  startEditOnMount,
  caseIndex,
  totalCases,
  onPrevCase,
  onNextCase,
}: {
  caseData: Case
  folders: Folder[]
  tab: DetailTab
  onTab: (t: DetailTab) => void
  onClose: () => void
  onSave: (c: Case) => void
  maximized: boolean
  onToggleMaximize: () => void
  activeCustomFieldIds: string[]
  allCustomFields: AdminCustomField[]
  startEditOnMount?: boolean
  caseIndex: number
  totalCases: number
  onPrevCase: () => void
  onNextCase: () => void
}) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(caseData)
  const [tagInput, setTagInput] = useState('')
  const tagInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setDraft(caseData)
    setEditing(false)
    setTagInput('')
  }, [caseData])

  function addTag(value: string) {
    const trimmed = value.trim()
    if (!trimmed) return
    setDraft((d) => {
      const existing = d.tags ?? []
      if (existing.includes(trimmed)) return d
      return { ...d, tags: [...existing, trimmed] }
    })
    setTagInput('')
    requestAnimationFrame(() => tagInputRef.current?.focus())
  }

  function removeTag(tag: string) {
    setDraft((d) => ({ ...d, tags: (d.tags ?? []).filter((t) => t !== tag) }))
  }

  function startEdit() {
    setDraft({ ...caseData, steps: caseData.steps.map((s) => ({ ...s, comments: [...s.comments] })) })
    setEditing(true)
  }

  useEffect(() => {
    if (startEditOnMount) startEdit()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [startEditOnMount])

  function saveEdit() {
    onSave({ ...draft, updatedAt: new Date().toISOString() })
    setEditing(false)
  }

  function updateStep(idx: number, patch: Partial<CaseStep>) {
    setDraft((d) => ({
      ...d,
      steps: d.steps.map((s, i) => (i === idx ? { ...s, ...patch } : s)),
    }))
  }

  function addStep() {
    setDraft((d) => ({
      ...d,
      steps: [...d.steps, { id: newId('step'), action: '', expected: '', comments: [] }],
    }))
  }

  function removeStep(idx: number) {
    if (draft.steps.length <= 1) return
    setDraft((d) => ({ ...d, steps: d.steps.filter((_, i) => i !== idx) }))
  }

  const c = editing ? draft : caseData
  const activeFields = allCustomFields.filter((f) => activeCustomFieldIds.includes(f.id) && f.enabled)

  return (
    <>
      <div className="dp-hd">
        <button type="button" className="dp-max-btn" title={maximized ? 'Restore panel width' : 'Maximize panel'} onClick={onToggleMaximize}>
          <i className={`ti ${maximized ? 'ti-arrows-minimize' : 'ti-arrows-maximize'}`} />
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
          <button
            type="button"
            className="btn"
            style={{ padding: '1px 5px' }}
            disabled={caseIndex <= 0}
            onClick={onPrevCase}
            title="Previous case"
          >
            <i className="ti ti-chevron-up" style={{ fontSize: 12 }} />
          </button>
          <span style={{
            fontFamily: 'var(--mono)',
            fontSize: 10.5,
            color: 'var(--text2)',
            minWidth: 44,
            textAlign: 'center',
          }}>
            {caseIndex >= 0 ? `${caseIndex + 1} / ${totalCases}` : ''}
          </span>
          <button
            type="button"
            className="btn"
            style={{ padding: '1px 5px' }}
            disabled={caseIndex >= totalCases - 1}
            onClick={onNextCase}
            title="Next case"
          >
            <i className="ti ti-chevron-down" style={{ fontSize: 12 }} />
          </button>
        </div>
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <span className="dp-id">{c.caseKey ?? c.id}</span>
          {editing ? (
            <input className="dp-edit-title" value={draft.title} onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))} />
          ) : (
            <div className="dp-ttl">{c.title}</div>
          )}
        </div>
        <button type="button" className="btn" style={{ padding: '2px 6px', flexShrink: 0 }} onClick={onClose}>
          <i className="ti ti-x" style={{ fontSize: 13 }} />
        </button>
      </div>
      <div className="nav-tab-bar">
        {(['details', 'attachments', 'defects', 'requirements', 'runs', 'history', 'activity'] as const).map((t) => (
          <div key={t} className={`nav-tab${tab === t ? ' on' : ''}`} onClick={() => onTab(t)}>
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </div>
        ))}
      </div>
      <div className="dp-body">
        {tab === 'details' ? (
          <>
            <div className="dp-sec">
              <div className="dp-sl">Metadata</div>
              {editing ? (
                <div className="dp-edit-grid">
                  <div className="form-field" style={{ gridColumn: 'span 2' }}>
                    <label>Assigned to</label>
                    <select
                      value={draft.assignee ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, assignee: e.target.value || undefined }))}
                    >
                      <option value="">Unassigned</option>
                      {TEAM_USERS.map((name) => (
                        <option key={name} value={name}>{name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Template</label>
                    <select
                      value={draft.template ?? 'text'}
                      onChange={(e) => setDraft((d) => ({ ...d, template: e.target.value as 'text' | 'bdd' }))}
                    >
                      <option value="text">Text (Action / Expected)</option>
                      <option value="bdd">BDD (Given / When / Then)</option>
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Priority</label>
                    <select value={draft.priority} onChange={(e) => setDraft((d) => ({ ...d, priority: e.target.value as CasePriority }))}>
                      {PRI_OPTIONS.map((p) => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div className="form-field" style={{ gridColumn: 'span 2' }}>
                    <label>Type</label>
                    <select value={draft.type} onChange={(e) => setDraft((d) => ({ ...d, type: e.target.value }))}>
                      <option value="">Select type…</option>
                      {TYPE_PLACEHOLDER_TAGS.map((t) => (
                        <option key={t} value={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-field">
                    <label>Folder</label>
                    <select value={draft.folderId ?? ''} onChange={(e) => setDraft((d) => ({ ...d, folderId: e.target.value || null }))}>
                      <option value="">Unfiled</option>
                      {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                  </div>
                  <div className="form-field" style={{ gridColumn: 'span 2' }}>
                    <label>References</label>
                    <input
                      type="text"
                      value={draft.references ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, references: e.target.value }))}
                      placeholder="e.g. JIRA-123, https://…"
                    />
                  </div>
                  <div className="form-field" style={{ gridColumn: 'span 2' }}>
                    <label>Summary</label>
                    <input
                      type="text"
                      value={draft.summary ?? ''}
                      onChange={(e) => setDraft((d) => ({ ...d, summary: e.target.value }))}
                      placeholder="One-line summary…"
                    />
                  </div>
                  {activeFields.map((field) => (
                    <div key={field.id} className="form-field" style={{ gridColumn: field.type === 'Multi-Line Text' ? 'span 2' : undefined }}>
                      <label>{field.name}{field.required ? ' *' : ''}</label>
                      {field.type === 'Boolean' ? (
                        <select
                          value={String(draft.customFieldValues?.[field.id] ?? false)}
                          onChange={(e) => setDraft((d) => ({
                            ...d,
                            customFieldValues: { ...d.customFieldValues, [field.id]: e.target.value === 'true' },
                          }))}
                        >
                          <option value="false">No</option>
                          <option value="true">Yes</option>
                        </select>
                      ) : field.type === 'Multi-Line Text' ? (
                        <textarea
                          rows={3}
                          className="dp-edit-area"
                          value={String(draft.customFieldValues?.[field.id] ?? '')}
                          onChange={(e) => setDraft((d) => ({
                            ...d,
                            customFieldValues: { ...d.customFieldValues, [field.id]: e.target.value },
                          }))}
                        />
                      ) : (
                        <input
                          type={field.type === 'Number (integer)' ? 'number' : 'text'}
                          value={String(draft.customFieldValues?.[field.id] ?? '')}
                          onChange={(e) => setDraft((d) => ({
                            ...d,
                            customFieldValues: { ...d.customFieldValues, [field.id]: e.target.value },
                          }))}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="dp-mg">
                  <div><div className="dp-ml">Assigned to</div><div className="dp-mv">{displayAssigneeName(c.assignee)}</div></div>
                  <div>
                    <div className="dp-ml">Template</div>
                    <div className="dp-mv">{c.template === 'bdd' ? 'BDD (Given/When/Then)' : 'Text (Action/Expected)'}</div>
                  </div>
                  <div><div className="dp-ml">Priority</div><div className="dp-mv"><span className={`pri ${PRI_MAP[PRIORITY_TO_LEGACY[c.priority]]}`}>{c.priority}</span></div></div>
                  <div><div className="dp-ml">Type</div><div className="dp-mv">{c.type}</div></div>
                  <div><div className="dp-ml">Folder</div><div className="dp-mv">{folderLabel(folders, c.folderId)}</div></div>
                  <div><div className="dp-ml">Automation</div><div className="dp-mv">Manual</div></div>
                  <div>
                    <div className="dp-ml">References</div>
                    <div className="dp-mv" style={{ fontFamily: c.references ? 'var(--mono)' : undefined, fontSize: c.references ? 11 : undefined }}>
                      {c.references || <span style={{ color: 'var(--text3)' }}>—</span>}
                    </div>
                  </div>
                  <div style={{ gridColumn: 'span 2' }}>
                    <div className="dp-ml">Summary</div>
                    <div className="dp-mv" style={{ whiteSpace: 'pre-wrap' }}>
                      {c.summary || <span style={{ color: 'var(--text3)' }}>—</span>}
                    </div>
                  </div>
                  {activeFields.map((field) => {
                    const val = c.customFieldValues?.[field.id]
                    const display = val === undefined || val === '' || val === null
                      ? <span style={{ color: 'var(--text3)' }}>—</span>
                      : field.type === 'Boolean'
                      ? (val ? 'Yes' : 'No')
                      : String(val)
                    return (
                      <div key={field.id} style={field.type === 'Multi-Line Text' ? { gridColumn: 'span 2' } : undefined}>
                        <div className="dp-ml">{field.name}</div>
                        <div className="dp-mv">{display}</div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
            <div className="dp-sec">
              <div className="dp-sl">Preconditions</div>
              {editing ? (
                <textarea className="dp-edit-area" rows={3} value={draft.preconditions ?? ''} onChange={(e) => setDraft((d) => ({ ...d, preconditions: e.target.value }))} />
              ) : (
                <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{c.preconditions}</div>
              )}
            </div>
            <div className="dp-sec">
              <div className="dp-sl">Steps</div>
              {c.steps.map((s, n) => (
                <div key={s.id} className="step-i">
                  <div className="step-n">{n + 1}</div>
                  <div style={{ flex: 1 }}>
                    {editing ? (
                      <>
                        <textarea className="dp-edit-area" rows={2} value={draft.steps[n]?.action ?? ''} onChange={(e) => updateStep(n, { action: e.target.value })} placeholder="Action" />
                        <textarea className="dp-edit-area" rows={2} value={draft.steps[n]?.expected ?? ''} onChange={(e) => updateStep(n, { expected: e.target.value })} placeholder="Expected" style={{ marginTop: 4 }} />
                        {draft.steps.length > 1 ? (
                          <button type="button" className="btn" style={{ fontSize: 10, marginTop: 4 }} onClick={() => removeStep(n)}>Remove step</button>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <div className="step-act">{s.action}</div>
                        <div className="step-exp">→ {s.expected}</div>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {editing ? (
                <button type="button" className="add-step-btn" onClick={addStep}><i className="ti ti-plus" style={{ fontSize: 12 }} /> Add Step</button>
              ) : null}
            </div>
            <div className="dp-sec">
              <div className="dp-sl">Tags</div>
              {editing ? (
                <div className="tag-chip-field">
                  <input
                    ref={tagInputRef}
                    className="dp-edit-area tag-chip-input"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault()
                        addTag(tagInput)
                      }
                    }}
                    placeholder="Type a tag and press Enter…"
                  />
                  {(draft.tags ?? []).length > 0 ? (
                    <div className="tag-chip-list">
                      {(draft.tags ?? []).map((t) => (
                        <span key={t} className="tag-chip">
                          {t}
                          <button type="button" className="tag-chip-rm" onClick={() => removeTag(t)} aria-label={`Remove ${t}`}>
                            <i className="ti ti-x" />
                          </button>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                  {(c.tags ?? []).map((t) => <span key={t} className="tag">{t}</span>)}
                </div>
              )}
            </div>
          </>
        ) : null}
        {tab === 'attachments' ? (
          <div className="dp-empty-tab">
            <i className="ti ti-paperclip" style={{ fontSize: 28, color: 'var(--text3)', marginBottom: 8 }} />
            <div style={{ fontWeight: 600, fontSize: 13 }}>No attachments</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
              Drag and drop files here, or click to upload.
            </div>
            <button type="button" className="btn" style={{ marginTop: 10, fontSize: 12 }}>
              <i className="ti ti-upload" style={{ fontSize: 12 }} /> Add attachment
            </button>
          </div>
        ) : null}
        {tab === 'defects' ? (
          <div className="dp-empty-tab">
            <i className="ti ti-bug" style={{ fontSize: 28, color: 'var(--text3)', marginBottom: 8 }} />
            <div style={{ fontWeight: 600, fontSize: 13 }}>No defects linked</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
              No defects have yet been linked to this test case in a test run.
            </div>
          </div>
        ) : null}
        {tab === 'requirements' ? (
          <div className="dp-empty-tab">
            <i className="ti ti-list-check" style={{ fontSize: 28, color: 'var(--text3)', marginBottom: 8 }} />
            <div style={{ fontWeight: 600, fontSize: 13 }}>No requirements linked</div>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
              Link this test case to a requirement to track coverage.
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
              <button type="button" className="btn btn-p" style={{ fontSize: 12 }}>
                <i className="ti ti-plus" style={{ fontSize: 12 }} /> Create requirement
              </button>
              <button type="button" className="btn" style={{ fontSize: 12 }}>
                <i className="ti ti-link" style={{ fontSize: 12 }} /> Link requirement
              </button>
            </div>
          </div>
        ) : null}
        {tab === 'runs' ? (
          <div style={{ padding: '10px 12px' }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--text2)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              Recent results
            </div>
            <table className="tbl" style={{ fontSize: 11.5 }}>
              <thead>
                <tr>
                  <th>Run</th>
                  <th style={{ width: 80 }}>By</th>
                  <th style={{ width: 90 }}>At</th>
                  <th style={{ width: 72, textAlign: 'center' }}>Result</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td style={{ color: 'var(--accent)' }}>Sprint 44 Regression</td>
                  <td style={{ color: 'var(--text2)' }}>Nadim Sharif</td>
                  <td style={{ color: 'var(--text3)' }}>2d ago</td>
                  <td style={{ textAlign: 'center' }}><span className="pill pill-pass">Passed</span></td>
                </tr>
                <tr>
                  <td style={{ color: 'var(--accent)' }}>Sprint 43 Smoke</td>
                  <td style={{ color: 'var(--text2)' }}>Jamil Khan</td>
                  <td style={{ color: 'var(--text3)' }}>15d ago</td>
                  <td style={{ textAlign: 'center' }}><span className="pill pill-fail">Failed</span></td>
                </tr>
              </tbody>
            </table>
          </div>
        ) : null}
        {tab === 'history' ? (
          <>
            <div className="hist-item"><div className="hist-dot" style={{ background: 'var(--pass)' }} /><div><div className="hist-label">Passed — CTMS Regression · Sprint 44</div><div className="hist-meta">Nadim Sharif · 2d ago · all steps passed</div></div></div>
            <div className="hist-item"><div className="hist-dot" style={{ background: 'var(--fail)' }} /><div><div className="hist-label">Failed — Sprint 43 Smoke Test</div><div className="hist-meta">Jamil Khan · 15d ago · Step 2 failed · Defect TI-4401</div></div></div>
          </>
        ) : null}
        {tab === 'activity' ? (
          <>
            <div className="act-item"><strong>Nadim Sharif</strong> updated preconditions<span className="act-time">2d ago · 09:14</span></div>
            <div className="act-item"><strong>Nasir Dipto</strong> added step 4<span className="act-time">5d ago · 14:32</span></div>
          </>
        ) : null}
      </div>
      <div style={{ padding: '7px 10px', borderTop: '1px solid var(--border)', display: 'flex', gap: 5 }}>
        {editing ? (
          <>
            <button type="button" className="btn btn-p" style={{ flex: 1 }} onClick={saveEdit}><i className="ti ti-check" style={{ fontSize: 12 }} /> Save changes</button>
            <button type="button" className="btn" onClick={() => { setEditing(false); setDraft(caseData) }}>Cancel</button>
          </>
        ) : (
          <>
            <button type="button" className="btn btn-p" style={{ flex: 1 }} onClick={startEdit}><i className="ti ti-edit" style={{ fontSize: 12 }} /> Edit case</button>
            <button type="button" className="btn"><i className="ti ti-player-play" style={{ fontSize: 12 }} /> Add to run</button>
          </>
        )}
      </div>
    </>
  )
}
