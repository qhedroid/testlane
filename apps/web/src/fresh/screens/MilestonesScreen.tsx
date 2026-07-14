'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { FreshTopbar } from '../components/FreshTopbar'
import { useFresh } from '../data/FreshProvider'

const STORAGE_KEY = 'testlane-milestones-v1'

type MilestoneStatus = 'Planned' | 'In progress' | 'On track' | 'At risk' | 'Complete'

interface Milestone {
  id: string
  projectId: string
  name: string
  description: string
  status: MilestoneStatus
  dueLabel: string
  linkedRunIds: string[]
  createdAt: string
}

const STATUS_CLASS: Record<MilestoneStatus, string> = {
  Planned: 'pill p-notrun',
  'In progress': 'pill p-act',
  'On track': 'pill p-pass',
  'At risk': 'pill p-block',
  Complete: 'pill p-pass',
}

function loadAll(): Milestone[] {
  if (typeof window === 'undefined') return []
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as Milestone[]
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function persistAll(items: Milestone[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
}

function newId(): string {
  return `ms-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function MilestonesScreen() {
  const { activeProject, activeRuns } = useFresh()
  const [items, setItems] = useState<Milestone[]>([])
  const [hydrated, setHydrated] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [dueLabel, setDueLabel] = useState('')
  const [status, setStatus] = useState<MilestoneStatus>('Planned')
  const [editingId, setEditingId] = useState<string | null>(null)

  useEffect(() => {
    setItems(loadAll())
    setHydrated(true)
  }, [])

  const projectMilestones = useMemo(
    () => items.filter((m) => m.projectId === activeProject.id),
    [items, activeProject.id],
  )

  const commit = useCallback(
    (next: Milestone[]) => {
      setItems(next)
      persistAll(next)
    },
    [],
  )

  function resetForm() {
    setName('')
    setDescription('')
    setDueLabel('')
    setStatus('Planned')
    setEditingId(null)
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (!trimmed) return

    if (editingId) {
      commit(
        items.map((m) =>
          m.id === editingId
            ? {
                ...m,
                name: trimmed,
                description: description.trim(),
                dueLabel: dueLabel.trim() || 'No due date',
                status,
              }
            : m,
        ),
      )
    } else {
      const created: Milestone = {
        id: newId(),
        projectId: activeProject.id,
        name: trimmed,
        description: description.trim(),
        status,
        dueLabel: dueLabel.trim() || 'No due date',
        linkedRunIds: [],
        createdAt: new Date().toISOString(),
      }
      commit([created, ...items])
    }
    resetForm()
  }

  function startEdit(m: Milestone) {
    setEditingId(m.id)
    setName(m.name)
    setDescription(m.description)
    setDueLabel(m.dueLabel === 'No due date' ? '' : m.dueLabel)
    setStatus(m.status)
  }

  function remove(id: string) {
    commit(items.filter((m) => m.id !== id))
    if (editingId === id) resetForm()
  }

  function toggleRun(milestoneId: string, runId: string) {
    commit(
      items.map((m) => {
        if (m.id !== milestoneId) return m
        const has = m.linkedRunIds.includes(runId)
        return {
          ...m,
          linkedRunIds: has
            ? m.linkedRunIds.filter((id) => id !== runId)
            : [...m.linkedRunIds, runId],
        }
      }),
    )
  }

  const openRuns = activeRuns.filter((r) => !r.archivedAt)

  return (
    <div className="view">
      <FreshTopbar breadcrumbs={[{ label: 'Milestones' }]} showSearch={false} />

      <div className="screen-wrap">
        <div className="page-head">
          <div>
            <h1>
              Milestones
              <span className="roadmap-badge">Local only</span>
            </h1>
            <div className="sub">
              Client-persisted in this browser · not stored in the database · {projectMilestones.length} for{' '}
              {activeProject.name}
            </div>
          </div>
        </div>

        <div className="panel" style={{ marginBottom: 14 }}>
          <form className="milestones-form" onSubmit={onSubmit}>
            <input
              className="inp"
              placeholder="Milestone name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <input
              className="inp"
              placeholder="Due label (e.g. Due 18 Jul)"
              value={dueLabel}
              onChange={(e) => setDueLabel(e.target.value)}
            />
            <select
              className="inp"
              value={status}
              onChange={(e) => setStatus(e.target.value as MilestoneStatus)}
              aria-label="Status"
            >
              {(Object.keys(STATUS_CLASS) as MilestoneStatus[]).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input
              className="inp"
              style={{ flex: 2 }}
              placeholder="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
            <div className="milestones-actions">
              {editingId ? (
                <button type="button" className="btn btn-neutral" onClick={resetForm}>
                  Cancel
                </button>
              ) : null}
              <button type="submit" className="btn btn-p" disabled={!hydrated}>
                {editingId ? 'Save' : 'Add milestone'}
              </button>
            </div>
          </form>
          <p className="milestones-local-note">
            Persisted under localStorage key <code>{STORAGE_KEY}</code>. Clearing site data removes milestones.
            No MySQL schema on purpose — portfolio scope stops at honest local persistence.
          </p>
        </div>

        {!hydrated ? null : projectMilestones.length === 0 ? (
          <div className="panel page-empty">
            <div className="page-empty-title">No milestones yet</div>
            <div className="page-empty-desc">
              Add a milestone above. Items stay in this browser only so the screen is real to use, without inventing a backend table.
            </div>
          </div>
        ) : (
          projectMilestones.map((m) => {
            const linked = openRuns.filter((r) => m.linkedRunIds.includes(r.id))
            return (
              <div key={m.id} className="panel milestones-card">
                <div className="milestones-card-hd">
                  <i className="ti ti-flag milestones-flag" aria-hidden />
                  <h3>{m.name}</h3>
                  <span className={STATUS_CLASS[m.status]}>
                    <span className="pill-dot" />
                    {m.status}
                  </span>
                  <span style={{ flex: 1 }} />
                  <span className="milestones-due">{m.dueLabel}</span>
                  <button type="button" className="btn btn-neutral btn-sm" onClick={() => startEdit(m)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-sm" onClick={() => remove(m.id)}>
                    Delete
                  </button>
                </div>
                {m.description ? <p className="milestones-desc">{m.description}</p> : null}
                <div className="milestones-runs">
                  <div className="milestones-local-note" style={{ paddingTop: 8 }}>
                    Link open runs (local association only):
                  </div>
                  {openRuns.length === 0 ? (
                    <p className="milestones-desc">No open runs in this project.</p>
                  ) : (
                    openRuns.map((run) => {
                      const on = m.linkedRunIds.includes(run.id)
                      return (
                        <div key={run.id} className="screen-row milestones-run-row">
                          <span className="mono-muted milestones-run-id">{run.runKey}</span>
                          <span className="milestones-run-name">{run.name}</span>
                          <span style={{ flex: 1 }} />
                          <button
                            type="button"
                            className={`btn btn-sm${on ? ' btn-p' : ' btn-neutral'}`}
                            onClick={() => toggleRun(m.id, run.id)}
                          >
                            {on ? 'Linked' : 'Link'}
                          </button>
                        </div>
                      )
                    })
                  )}
                  {linked.length > 0 ? (
                    <p className="milestones-desc">
                      {linked.length} run{linked.length === 1 ? '' : 's'} linked for tracking in this browser.
                    </p>
                  ) : null}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}
