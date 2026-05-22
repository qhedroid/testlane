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
  RELAY_TEST_PLAN_ID,
} from '@/lib/relay/config'
import type {
  CaseCounts,
  CaseResultStatusInput,
  RunDetail,
  RunDetailCase,
  RunListItem,
} from '@/lib/relay/types'
import { RunsAppShell } from './RunsAppShell'

const STATUS_OPTIONS: {
  value: CaseResultStatusInput
  label: string
  srb: string
}[] = [
  { value: 'pass', label: 'Pass', srb: 'srb-p' },
  { value: 'fail', label: 'Fail', srb: 'srb-f' },
  { value: 'blocked', label: 'Blocked', srb: 'srb-b' },
  { value: 'skipped', label: 'Skip', srb: 'srb-s' },
  { value: 'not_run', label: 'Not run', srb: 'srb-n' },
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

function runStatusPill(status: RunListItem['status']): string {
  if (status === 'active') return 'pill p-active'
  if (status === 'sealed' || status === 'archived') return 'pill p-sealed'
  return 'pill p-not_run'
}

function priorityClass(
  priority: RunDetailCase['priority'],
): string {
  const map = {
    critical: 'pri pr-crit',
    high: 'pri pr-high',
    medium: 'pri pr-med',
    low: 'pri pr-low',
  } as const
  return map[priority] ?? 'pri pr-low'
}

function isActiveStatus(
  current: RunDetailCase['status'],
  target: CaseResultStatusInput,
): boolean {
  if (target === 'skipped') return current === 'skip'
  return current === target
}

function progressSegments(counts: CaseCounts, total: number) {
  if (total === 0) return { pass: 0, fail: 0, blocked: 0, skip: 0 }
  return {
    pass: (counts.passed / total) * 100,
    fail: (counts.failed / total) * 100,
    blocked: (counts.blocked / total) * 100,
    skip: (counts.skipped / total) * 100,
  }
}

function CountCards({ counts }: { counts: CaseCounts }) {
  const cards = [
    { key: 'total', label: 'Total', value: counts.total, cls: '' },
    { key: 'pass', label: 'Pass', value: counts.passed, cls: 'mc-pass' },
    { key: 'fail', label: 'Fail', value: counts.failed, cls: 'mc-fail' },
    { key: 'blocked', label: 'Blocked', value: counts.blocked, cls: 'mc-blocked' },
    { key: 'skip', label: 'Skipped', value: counts.skipped, cls: 'mc-skip' },
    { key: 'notRun', label: 'Not run', value: counts.notRun, cls: 'mc-notrun' },
  ] as const

  return (
    <div className="met-row">
      {cards.map((c) => (
        <div key={c.key} className={`mc ${c.cls}`}>
          <div className="mv">{c.value}</div>
          <div className="ml">{c.label}</div>
        </div>
      ))}
    </div>
  )
}

function ProgressBar({ counts }: { counts: CaseCounts }) {
  const total = counts.total || 1
  const seg = progressSegments(counts, counts.total)
  const done = counts.passed + counts.failed + counts.blocked + counts.skipped
  const pct = counts.total ? Math.round((done / counts.total) * 100) : 0

  return (
    <div className="tr-run-progress">
      <span className="rl-pt">
        {done} / {counts.total}
      </span>
      <div className="prog">
        {seg.pass > 0 ? <div className="pg-p" style={{ width: `${seg.pass}%` }} /> : null}
        {seg.fail > 0 ? <div className="pg-f" style={{ width: `${seg.fail}%` }} /> : null}
        {seg.blocked > 0 ? (
          <div className="pg-b" style={{ width: `${seg.blocked}%` }} />
        ) : null}
        {seg.skip > 0 ? <div className="pg-s" style={{ width: `${seg.skip}%` }} /> : null}
      </div>
      <span className="rl-pt">{pct}%</span>
    </div>
  )
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
                    onClick={() => setSelectedRunId(run.id)}
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

        <section className="tr-detail">
          {!selectedRunId ? (
            <p className="tr-empty">Select a run from the list.</p>
          ) : detailLoading && !detail ? (
            <p className="tr-empty">Loading run…</p>
          ) : detail ? (
            <div className="tr-detail-scroll">
              <div className="tr-run-hd">
                <div className="tmono" style={{ marginBottom: 4 }}>
                  {detail.runRef}
                </div>
                <h2 className="tr-run-title">{detail.title}</h2>
                <div className="tr-run-meta">
                  <span className={runStatusPill(detail.status)}>
                    <span className="pill-dot" />
                    {detail.status}
                  </span>
                  {detail.isStalled ? <span>Stalled</span> : null}
                  <span>
                    Env: {detail.environment ?? '—'}
                  </span>
                  <span>
                    Created: {new Date(detail.createdAt).toLocaleString()}
                  </span>
                </div>
                <ProgressBar counts={detail.caseCounts} />
                <div className="tr-run-stats">
                  <span className="rst-p">✓ {detail.caseCounts.passed}</span>
                  <span className="rst-f">✗ {detail.caseCounts.failed}</span>
                  <span className="rst-b">⊘ {detail.caseCounts.blocked}</span>
                  <span className="rst-s">⊘ {detail.caseCounts.skipped}</span>
                  <span className="rst-n">○ {detail.caseCounts.notRun} not run</span>
                </div>
              </div>

              <CountCards counts={detail.caseCounts} />

              {detail.status !== 'active' ? (
                <div className="runs-banner info" style={{ margin: '0 0 12px' }}>
                  Run is {detail.status} — result updates may be rejected.
                </div>
              ) : null}

              <div className="panel">
                <div className="pnl-hd">
                  <span className="pnl-ttl">Test run cases</span>
                  <span className="pnl-ct">{detail.testRunCases.length}</span>
                </div>
                <table className="tbl">
                  <thead>
                    <tr>
                      <th>Ref</th>
                      <th>Title</th>
                      <th>Priority</th>
                      <th>Status</th>
                      <th>Result</th>
                    </tr>
                  </thead>
                  <tbody>
                    {detail.testRunCases.map((c) => (
                      <tr key={c.testRunCaseId}>
                        <td className="tmono">{c.caseRef}</td>
                        <td>{c.title}</td>
                        <td>
                          <span className={priorityClass(c.priority)}>
                            {c.priority}
                          </span>
                        </td>
                        <td>
                          <span className={statusPillClass(c.status)}>
                            <span className="pill-dot" />
                            {statusLabel(c.status)}
                          </span>
                        </td>
                        <td>
                          <div className="srb-row">
                            {STATUS_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                type="button"
                                className={`srb ${opt.srb}${isActiveStatus(c.status, opt.value) ? ' on' : ''}`}
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
              </div>
            </div>
          ) : (
            <p className="tr-empty">Could not load run detail.</p>
          )}
        </section>
      </div>
    </RunsAppShell>
  )
}
