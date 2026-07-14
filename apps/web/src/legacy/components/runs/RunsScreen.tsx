'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  createRun,
  fetchRunDetail,
  fetchRunList,
  TestlaneApiError,
  updateCaseResult,
} from '@/lib/relay/api-client'
import {
  RELAY_CREATE_ACTOR_ID,
  RELAY_DEV_ACTOR_ID,
  relayCanMutate,
} from '@/lib/relay/config'
import type {
  CaseCounts,
  CaseResultStatusInput,
  RunDetail,
  RunListItem,
} from '@/lib/relay/types'
import { RunsAppShell } from './RunsAppShell'
import { CaseDetailPanel, apiStatusForCase } from './CaseDetailPanel'
import { CaseListPane } from './CaseListPane'
import {
  filterCases,
  type CaseStatusFilter,
} from './run-case-utils'

function progressSegments(counts: CaseCounts, total: number) {
  if (total === 0) return { pass: 0, fail: 0, blocked: 0, skip: 0 }
  return {
    pass: (counts.passed / total) * 100,
    fail: (counts.failed / total) * 100,
    blocked: (counts.blocked / total) * 100,
    skip: (counts.skipped / total) * 100,
  }
}

function runStatusPill(status: RunListItem['status']): string {
  if (status === 'active') return 'pill p-active'
  if (status === 'sealed' || status === 'archived') return 'pill p-sealed'
  return 'pill p-not_run'
}

export function RunsScreen() {
  const [runs, setRuns] = useState<RunListItem[]>([])
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(null)
  const [detail, setDetail] = useState<RunDetail | null>(null)
  const [statusFilter, setStatusFilter] = useState<CaseStatusFilter>('all')
  const [caseSearchQuery, setCaseSearchQuery] = useState('')
  const [commentDraft, setCommentDraft] = useState('')
  const [listLoading, setListLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [savingCase, setSavingCase] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createEnvironment, setCreateEnvironment] = useState('')
  const [creating, setCreating] = useState(false)

  const filteredCases = useMemo(() => {
    if (!detail) return []
    return filterCases(detail.testRunCases, statusFilter, caseSearchQuery)
  }, [detail, statusFilter, caseSearchQuery])

  const selectedCase = useMemo(() => {
    if (!detail || !selectedCaseId) return null
    return (
      detail.testRunCases.find((c) => c.testRunCaseId === selectedCaseId) ??
      null
    )
  }, [detail, selectedCaseId])

  const selectedIndex = selectedCase
    ? filteredCases.findIndex((c) => c.testRunCaseId === selectedCase.testRunCaseId)
    : -1

  const canMutate = relayCanMutate(RELAY_DEV_ACTOR_ID)

  const loadDetail = useCallback(async (runId: string) => {
    setDetailLoading(true)
    setError(null)
    try {
      const data = await fetchRunDetail(runId)
      setDetail(data)
    } catch (err) {
      setDetail(null)
      setError(err instanceof TestlaneApiError ? err.message : 'Failed to load run detail')
    } finally {
      setDetailLoading(false)
    }
  }, [])

  const loadList = useCallback(async () => {
    setListLoading(true)
    setError(null)
    try {
      const data = await fetchRunList()
      setRuns(data)
      if (data.length > 0) {
        setSelectedRunId((prev) => prev ?? data[0].id)
      } else {
        setSelectedRunId(null)
        setDetail(null)
      }
    } catch (err) {
      setRuns([])
      setError(err instanceof TestlaneApiError ? err.message : 'Failed to load runs')
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadList()
  }, [loadList])

  useEffect(() => {
    if (selectedRunId) {
      setSelectedCaseId(null)
      setStatusFilter('all')
      setCaseSearchQuery('')
      setCommentDraft('')
      void loadDetail(selectedRunId)
    }
  }, [selectedRunId, loadDetail])

  useEffect(() => {
    if (selectedCase) {
      setCommentDraft(selectedCase.comment ?? '')
    } else {
      setCommentDraft('')
    }
  }, [selectedCase?.testRunCaseId, selectedCase?.comment])

  useEffect(() => {
    if (!selectedCaseId || !detail) return
    const stillVisible = filteredCases.some(
      (c) => c.testRunCaseId === selectedCaseId,
    )
    if (!stillVisible) {
      setSelectedCaseId(null)
    }
  }, [filteredCases, selectedCaseId, detail])

  async function handleCreateRun(e: React.FormEvent) {
    e.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const created = await createRun({
        name: createName,
        environment: createEnvironment,
      })
      const refreshed = await fetchRunList()
      setRuns(refreshed)
      setSelectedRunId(created.id)
      setShowCreateForm(false)
      setCreateName('')
      setCreateEnvironment('')
    } catch (err) {
      const message =
        err instanceof TestlaneApiError
          ? `${err.code}: ${err.message}`
          : 'Failed to create run'
      setError(message)
    } finally {
      setCreating(false)
    }
  }

  async function refreshAfterCaseUpdate(runId: string) {
    await loadDetail(runId)
    const refreshed = await fetchRunList()
    setRuns(refreshed)
  }

  async function handleCaseUpdate(
    testRunCaseId: string,
    status: CaseResultStatusInput,
    comment?: string | null,
  ) {
    if (!selectedRunId) return
    setSavingCase(true)
    setError(null)
    try {
      await updateCaseResult(selectedRunId, testRunCaseId, status, { comment })
      await refreshAfterCaseUpdate(selectedRunId)
    } catch (err) {
      setError(
        err instanceof TestlaneApiError ? err.message : 'Failed to update case result',
      )
    } finally {
      setSavingCase(false)
    }
  }

  function handleSaveComment() {
    if (!selectedCase || !selectedRunId) return
    const trimmed = commentDraft.trim()
    void handleCaseUpdate(
      selectedCase.testRunCaseId,
      apiStatusForCase(selectedCase),
      trimmed || null,
    )
  }

  function selectRun(runId: string) {
    if (runId === selectedRunId) return
    setSelectedRunId(runId)
  }

  const topbarActions = (
    <>
      {!showCreateForm ? (
        <button
          type="button"
          className="relay-btn relay-btn-primary"
          disabled={listLoading || creating}
          onClick={() => {
            setShowCreateForm(true)
            setError(null)
          }}
        >
          + New run
        </button>
      ) : null}
    </>
  )

  return (
    <RunsAppShell topbarActions={topbarActions}>
      {error ? <div className="runs-banner error">{error}</div> : null}
      {!canMutate ? (
        <div className="runs-banner info">
          Viewing as reader — execution updates are disabled. Set{' '}
          <code>NEXT_PUBLIC_RELAY_USER_ID</code> to a contributor/admin seed user
          to execute.
        </div>
      ) : null}

      <div className="tr-lay">
        <aside className="rl-pane">
          {showCreateForm ? (
            <form className="rl-create-form" onSubmit={(e) => void handleCreateRun(e)}>
              <label>
                Run name (optional)
                <input
                  type="text"
                  value={createName}
                  onChange={(ev) => setCreateName(ev.target.value)}
                  placeholder="Plan title + date"
                  maxLength={500}
                  disabled={creating}
                />
              </label>
              <label>
                Environment (optional)
                <input
                  type="text"
                  value={createEnvironment}
                  onChange={(ev) => setCreateEnvironment(ev.target.value)}
                  placeholder="e.g. UAT"
                  maxLength={100}
                  disabled={creating}
                />
              </label>
              <p className="rl-create-hint">
                PLAN-001 · spawn as admin ({RELAY_CREATE_ACTOR_ID.slice(-6)})
              </p>
              <div className="rl-create-actions">
                <button
                  type="button"
                  className="relay-btn"
                  disabled={creating}
                  onClick={() => {
                    setShowCreateForm(false)
                    setCreateName('')
                    setCreateEnvironment('')
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="relay-btn relay-btn-primary"
                  disabled={creating}
                >
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          ) : (
            <div className="rl-create-wrap">
              <button
                type="button"
                className="relay-btn relay-btn-primary"
                style={{ width: '100%', justifyContent: 'center' }}
                disabled={listLoading || creating}
                onClick={() => {
                  setShowCreateForm(true)
                  setError(null)
                }}
              >
                + Create run
              </button>
            </div>
          )}

          <div className="rl-hd">
            <span className="rl-hd-title">Runs</span>
            <span className="rl-hd-count">{runs.length}</span>
          </div>

          <div className="rl-body">
            {listLoading ? (
              <p className="tr-empty">Loading…</p>
            ) : runs.length === 0 ? (
              <p className="tr-empty">No runs yet.</p>
            ) : (
              runs.map((run) => {
                const seg = progressSegments(run.caseCounts, run.caseCounts.total)
                return (
                  <button
                    key={run.id}
                    type="button"
                    className={`rl-item${selectedRunId === run.id ? ' on' : ''}`}
                    onClick={() => selectRun(run.id)}
                  >
                    <div className="rl-ref">{run.runRef}</div>
                    <div className="rl-nm">{run.title}</div>
                    <div className="rl-mt">
                      <span className={runStatusPill(run.status)}>
                        <span className="pill-dot" />
                        {run.status}
                      </span>
                    </div>
                    <div className="rl-pg">
                      <div className="prog">
                        {seg.pass > 0 ? (
                          <div className="pg-p" style={{ width: `${seg.pass}%` }} />
                        ) : null}
                        {seg.fail > 0 ? (
                          <div className="pg-f" style={{ width: `${seg.fail}%` }} />
                        ) : null}
                      </div>
                      <span className="rl-pt">
                        {run.caseCounts.passed}/{run.caseCounts.total}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </aside>

        {!selectedRunId ? (
          <p className="tr-empty tr-empty-grow">Select a run from the list.</p>
        ) : detailLoading && !detail ? (
          <p className="tr-empty tr-empty-grow">Loading run…</p>
        ) : detail ? (
          <>
            <CaseListPane
              detail={detail}
              statusFilter={statusFilter}
              searchQuery={caseSearchQuery}
              selectedCaseId={selectedCaseId}
              onStatusFilterChange={setStatusFilter}
              onSearchQueryChange={setCaseSearchQuery}
              onSelectCase={setSelectedCaseId}
            />
            {selectedCase ? (
              <CaseDetailPanel
                detail={detail}
                selectedCase={selectedCase}
                canMutate={canMutate}
                commentDraft={commentDraft}
                saving={savingCase}
                onCommentDraftChange={setCommentDraft}
                onStatusUpdate={(status, comment) =>
                  void handleCaseUpdate(selectedCase.testRunCaseId, status, comment)
                }
                onSaveComment={handleSaveComment}
                onPrevCase={() => {
                  if (selectedIndex > 0) {
                    setSelectedCaseId(
                      filteredCases[selectedIndex - 1].testRunCaseId,
                    )
                  }
                }}
                onNextCase={() => {
                  if (
                    selectedIndex >= 0 &&
                    selectedIndex < filteredCases.length - 1
                  ) {
                    setSelectedCaseId(
                      filteredCases[selectedIndex + 1].testRunCaseId,
                    )
                  }
                }}
                hasPrev={selectedIndex > 0}
                hasNext={
                  selectedIndex >= 0 && selectedIndex < filteredCases.length - 1
                }
              />
            ) : (
              <div className="ed-pane ed-pane-empty">
                <p className="tr-empty">Select a case to view execution detail.</p>
              </div>
            )}
          </>
        ) : (
          <p className="tr-empty tr-empty-grow">Could not load run detail.</p>
        )}
      </div>
    </RunsAppShell>
  )
}
