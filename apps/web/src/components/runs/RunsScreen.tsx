'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  createRun,
  fetchRunDetail,
  fetchRunList,
  RelayApiError,
  updateCaseResult,
} from '@/lib/relay/api-client'
import {
  RELAY_CREATE_ACTOR_ID,
  RELAY_DEV_ACTOR_ID,
  RELAY_PROJECT_ID,
  RELAY_TEST_PLAN_ID,
} from '@/lib/relay/config'
import type {
  CaseResultStatusInput,
  RunDetail,
  RunDetailCase,
  RunListItem,
} from '@/lib/relay/types'

const STATUS_OPTIONS: { value: CaseResultStatusInput; label: string }[] = [
  { value: 'pass', label: 'Pass' },
  { value: 'fail', label: 'Fail' },
  { value: 'blocked', label: 'Blocked' },
  { value: 'skipped', label: 'Skipped' },
  { value: 'not_run', label: 'Not run' },
]

function statusPillClass(status: RunDetailCase['status']): string {
  if (status === 'skip') return 'pill p-skip'
  return `pill p-${status}`
}

function statusLabel(status: RunDetailCase['status']): string {
  if (status === 'skip') return 'Skipped'
  if (status === 'not_run') return 'Not run'
  return status.charAt(0).toUpperCase() + status.slice(1)
}

function isActiveStatus(
  current: RunDetailCase['status'],
  target: CaseResultStatusInput,
): boolean {
  if (target === 'skipped') return current === 'skip'
  return current === target
}

export function RunsScreen() {
  const [runs, setRuns] = useState<RunListItem[]>([])
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [detail, setDetail] = useState<RunDetail | null>(null)
  const [listLoading, setListLoading] = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [updatingCaseId, setUpdatingCaseId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [showCreateForm, setShowCreateForm] = useState(false)
  const [createName, setCreateName] = useState('')
  const [createEnvironment, setCreateEnvironment] = useState('')
  const [creating, setCreating] = useState(false)

  const loadDetail = useCallback(async (runId: string) => {
    setDetailLoading(true)
    setError(null)
    try {
      const data = await fetchRunDetail(runId)
      setDetail(data)
    } catch (err) {
      setDetail(null)
      setError(err instanceof RelayApiError ? err.message : 'Failed to load run detail')
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
      setError(err instanceof RelayApiError ? err.message : 'Failed to load runs')
    } finally {
      setListLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadList()
  }, [loadList])

  useEffect(() => {
    if (selectedRunId) {
      void loadDetail(selectedRunId)
    }
  }, [selectedRunId, loadDetail])

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
        err instanceof RelayApiError
          ? `${err.code}: ${err.message}`
          : 'Failed to create run'
      setError(message)
    } finally {
      setCreating(false)
    }
  }

  async function handleStatusUpdate(
    testRunCaseId: string,
    status: CaseResultStatusInput,
  ) {
    if (!selectedRunId) return
    setUpdatingCaseId(testRunCaseId)
    setError(null)
    try {
      await updateCaseResult(selectedRunId, testRunCaseId, status)
      await loadDetail(selectedRunId)
      const refreshed = await fetchRunList()
      setRuns(refreshed)
    } catch (err) {
      setError(
        err instanceof RelayApiError ? err.message : 'Failed to update case result',
      )
    } finally {
      setUpdatingCaseId(null)
    }
  }

  const selectedRun = runs.find((r) => r.id === selectedRunId)

  return (
    <div className="runs-page">
      <header className="runs-header">
        <div>
          <h1>Test Runs</h1>
          <div className="runs-header-meta">CTMS · integration screen</div>
        </div>
        <div className="runs-header-meta">
          project {RELAY_PROJECT_ID.slice(-6)} · actor {RELAY_DEV_ACTOR_ID.slice(-6)}
        </div>
      </header>

      {error ? <div className="runs-banner error">{error}</div> : null}

      <div className="runs-layout">
        <aside className="runs-list-panel">
          <div className="runs-list-toolbar">
            {!showCreateForm ? (
              <button
                type="button"
                className="runs-create-btn"
                disabled={listLoading || creating}
                onClick={() => {
                  setShowCreateForm(true)
                  setError(null)
                }}
              >
                Create run
              </button>
            ) : null}
          </div>

          {showCreateForm ? (
            <form className="runs-create-form" onSubmit={(e) => void handleCreateRun(e)}>
              <label>
                Run name (optional)
                <input
                  type="text"
                  value={createName}
                  onChange={(ev) => setCreateName(ev.target.value)}
                  placeholder="Defaults to plan title + date"
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
                  placeholder="e.g. staging"
                  maxLength={100}
                  disabled={creating}
                />
              </label>
              <p className="runs-create-hint">
                Spawns from PLAN-001 ({RELAY_TEST_PLAN_ID.slice(-6)}) as admin actor (
                {RELAY_CREATE_ACTOR_ID.slice(-6)}).
              </p>
              <div className="runs-create-actions">
                <button
                  type="button"
                  className="runs-create-cancel"
                  disabled={creating}
                  onClick={() => {
                    setShowCreateForm(false)
                    setCreateName('')
                    setCreateEnvironment('')
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="runs-create-submit" disabled={creating}>
                  {creating ? 'Creating…' : 'Create'}
                </button>
              </div>
            </form>
          ) : null}

          <h2>Runs</h2>
          {listLoading ? (
            <p style={{ padding: '0 14px', color: 'var(--relay-muted)' }}>Loading…</p>
          ) : runs.length === 0 ? (
            <p style={{ padding: '0 14px', color: 'var(--relay-muted)' }}>
              No runs yet. Use Create run above.
            </p>
          ) : (
            <ul className="runs-list">
              {runs.map((run) => (
                <li key={run.id}>
                  <button
                    type="button"
                    className={`runs-list-item${selectedRunId === run.id ? ' selected' : ''}`}
                    onClick={() => setSelectedRunId(run.id)}
                    style={{
                      width: '100%',
                      border: 'none',
                      background: 'transparent',
                      textAlign: 'left',
                      font: 'inherit',
                    }}
                  >
                    <div className="runs-list-ref">{run.runRef}</div>
                    <div className="runs-list-title">{run.title}</div>
                    <div style={{ marginTop: 6 }}>
                      <span className={`pill p-${run.status === 'active' ? 'active' : 'not_run'}`}>
                        {run.status}
                      </span>
                      <span
                        style={{
                          marginLeft: 8,
                          fontSize: 10.5,
                          color: 'var(--relay-muted)',
                        }}
                      >
                        {run.caseCounts.passed}/{run.caseCounts.total} pass
                      </span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </aside>

        <main className="runs-detail-panel">
          {!selectedRunId ? (
            <p className="runs-detail-empty">Select a run from the list.</p>
          ) : detailLoading && !detail ? (
            <p className="runs-detail-empty">Loading run…</p>
          ) : detail ? (
            <>
              <h2 style={{ margin: '0 0 4px', fontSize: 14, fontWeight: 600 }}>
                {detail.runRef}
              </h2>
              <p style={{ margin: '0 0 16px', color: 'var(--relay-muted)' }}>
                {detail.title}
              </p>

              <div className="runs-meta-grid">
                <div>
                  <div className="runs-meta-label">Status</div>
                  <div className="runs-meta-value">
                    <span className="pill p-active">{detail.status}</span>
                    {detail.isStalled ? ' (stalled)' : ''}
                  </div>
                </div>
                <div>
                  <div className="runs-meta-label">Environment</div>
                  <div className="runs-meta-value">
                    {detail.environment ?? '—'}
                  </div>
                </div>
                <div>
                  <div className="runs-meta-label">Created</div>
                  <div className="runs-meta-value" style={{ fontFamily: 'var(--relay-mono)' }}>
                    {new Date(detail.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="runs-meta-label" style={{ marginBottom: 8 }}>
                Case counts
              </div>
              <div className="runs-counts">
                <span className="runs-count-chip">total {detail.caseCounts.total}</span>
                <span className="runs-count-chip">pass {detail.caseCounts.passed}</span>
                <span className="runs-count-chip">fail {detail.caseCounts.failed}</span>
                <span className="runs-count-chip">blocked {detail.caseCounts.blocked}</span>
                <span className="runs-count-chip">skip {detail.caseCounts.skipped}</span>
                <span className="runs-count-chip">not run {detail.caseCounts.notRun}</span>
              </div>

              {detail.status !== 'active' ? (
                <div className="runs-banner info" style={{ margin: '0 0 16px' }}>
                  Run is {detail.status} — result updates may be rejected by the API.
                </div>
              ) : null}

              <div className="runs-meta-label" style={{ marginBottom: 8 }}>
                Test run cases
              </div>
              <table className="runs-cases-table">
                <thead>
                  <tr>
                    <th>Ref</th>
                    <th>Title</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Set result</th>
                  </tr>
                </thead>
                <tbody>
                  {detail.testRunCases.map((c) => (
                    <tr key={c.testRunCaseId}>
                      <td className="runs-case-ref">{c.caseRef}</td>
                      <td>{c.title}</td>
                      <td>{c.priority}</td>
                      <td>
                        <span className={statusPillClass(c.status)}>
                          {statusLabel(c.status)}
                        </span>
                      </td>
                      <td>
                        <div className="runs-status-actions">
                          {STATUS_OPTIONS.map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              className={`runs-status-btn${isActiveStatus(c.status, opt.value) ? ' active' : ''}`}
                              disabled={
                                updatingCaseId === c.testRunCaseId ||
                                detail.status !== 'active'
                              }
                              onClick={() =>
                                void handleStatusUpdate(c.testRunCaseId, opt.value)
                              }
                            >
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          ) : selectedRun ? (
            <p className="runs-detail-empty">
              {selectedRun.runRef} — could not load detail.
            </p>
          ) : null}
        </main>
      </div>
    </div>
  )
}
