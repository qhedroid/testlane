'use client'

import { useEffect, useState } from 'react'
import { useFresh } from '../data/FreshProvider'
import type { ScheduleCadence, ScheduledRun, TestPlan } from '../data/demo-model'
import { TEAM_USERS } from '../data/team-users'

const CADENCE_LABEL: Record<ScheduleCadence, string> = {
  once: 'Once',
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
}

function toLocalInputValue(iso: string): string {
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export function SchedulePlanModal({
  open,
  plan,
  editSchedule,
  onClose,
}: {
  open: boolean
  plan: TestPlan | null
  editSchedule?: ScheduledRun | null
  onClose: () => void
}) {
  const { addScheduledRun, updateScheduledRun } = useFresh()
  const [name, setName] = useState('')
  const [cadence, setCadence] = useState<ScheduleCadence>('weekly')
  const [nextRunAt, setNextRunAt] = useState('')
  const [defaultAssignee, setDefaultAssignee] = useState('')

  useEffect(() => {
    if (!open) return
    if (editSchedule) {
      setName(editSchedule.name)
      setCadence(editSchedule.cadence)
      setNextRunAt(toLocalInputValue(editSchedule.nextRunAt))
      setDefaultAssignee(editSchedule.defaultAssignee ?? '')
    } else if (plan) {
      setName(`${plan.title} (scheduled)`)
      setCadence('weekly')
      const tomorrow = new Date(Date.now() + 86400000)
      tomorrow.setHours(9, 0, 0, 0)
      setNextRunAt(toLocalInputValue(tomorrow.toISOString()))
      setDefaultAssignee('')
    }
  }, [open, plan, editSchedule])

  if (!open || (!plan && !editSchedule)) return null

  const canSubmit = name.trim() && nextRunAt

  function handleSubmit() {
    if (!canSubmit) return
    const iso = new Date(nextRunAt).toISOString()
    if (editSchedule) {
      updateScheduledRun(editSchedule.id, {
        name: name.trim(),
        cadence,
        nextRunAt: iso,
        defaultAssignee: defaultAssignee || undefined,
      })
    } else if (plan) {
      addScheduledRun({
        name: name.trim(),
        planId: plan.id,
        cadence,
        nextRunAt: iso,
        defaultAssignee: defaultAssignee || undefined,
        active: true,
      })
    }
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="create-dialog" style={{ width: 420 }} onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-hd">
          <div className="shortcuts-title">{editSchedule ? 'Edit scheduled run' : `Schedule plan — ${plan?.planKey}`}</div>
          <button type="button" className="btn" style={{ padding: '2px 6px' }} onClick={onClose}>
            <i className="ti ti-x" style={{ fontSize: 13 }} />
          </button>
        </div>
        <div className="create-body">
          <div className="form-field">
            <label>Name</label>
            <input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Cadence</label>
            <select value={cadence} onChange={(e) => setCadence(e.target.value as ScheduleCadence)}>
              {(Object.keys(CADENCE_LABEL) as ScheduleCadence[]).map((c) => (
                <option key={c} value={c}>{CADENCE_LABEL[c]}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>{editSchedule ? 'Next run at' : 'First run at'}</label>
            <input type="datetime-local" value={nextRunAt} onChange={(e) => setNextRunAt(e.target.value)} />
          </div>
          <div className="form-field">
            <label>Default assignee (optional)</label>
            <select value={defaultAssignee} onChange={(e) => setDefaultAssignee(e.target.value)}>
              <option value="">— none —</option>
              {TEAM_USERS.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>
          <div className="rr-callout">
            <i className="ti ti-info-circle" style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }} />
            <span>
              <strong>Simulated</strong> — runs are created the next time you open the Plans screen or press
              “Check for due runs”, not by a real background job.
            </span>
          </div>
        </div>
        <div className="create-foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-p" disabled={!canSubmit} onClick={handleSubmit}>
            <i className="ti ti-clock-play" style={{ fontSize: 12 }} /> {editSchedule ? 'Save schedule' : 'Schedule runs'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function ScheduledRunsPanel({ onEdit }: { onEdit: (schedule: ScheduledRun) => void }) {
  const { state, activeScheduledRuns, updateScheduledRun, deleteScheduledRun, checkDueScheduledRuns } = useFresh()
  const [lastCheck, setLastCheck] = useState<string | null>(null)

  if (activeScheduledRuns.length === 0) return null

  const now = new Date().toISOString()

  return (
    <div className="sched-panel">
      <div className="sched-hd">
        <i className="ti ti-clock-play" style={{ fontSize: 12, color: 'var(--accent)' }} />
        <span className="sched-ttl">Scheduled runs</span>
        <span className="pnl-ct">{activeScheduledRuns.length}</span>
        <button
          type="button"
          className="btn"
          style={{ fontSize: 10, padding: '1px 7px', marginLeft: 'auto' }}
          title="Simulated — checks schedules against the clock and spawns due runs now"
          onClick={() => {
            const { dueCount } = checkDueScheduledRuns()
            setLastCheck(dueCount === 0 ? 'No due schedules' : `Created ${dueCount} run${dueCount === 1 ? '' : 's'}`)
          }}
        >
          Check for due runs
        </button>
      </div>
      <div className="sched-note">Simulated — no real background job. Due schedules fire on check or screen load.</div>
      {lastCheck ? <div className="sched-note" style={{ color: 'var(--accent)' }}>{lastCheck}</div> : null}
      <div className="sched-list">
        {activeScheduledRuns.map((s) => {
          const plan = state.plansById[s.planId]
          const overdue = s.active && s.nextRunAt <= now
          return (
            <div key={s.id} className="sched-row">
              <div style={{ flex: 1, minWidth: 0 }}>
                <div className="sched-name" title={s.name}>
                  {s.name}
                  {!s.active ? <span className="pill p-notrun" style={{ fontSize: 8.5, padding: '0 4px', marginLeft: 4 }}>Paused</span> : null}
                  {overdue ? <span className="pill p-block" style={{ fontSize: 8.5, padding: '0 4px', marginLeft: 4 }}>Due</span> : null}
                </div>
                <div className="sched-meta">
                  {plan?.planKey ?? '(plan deleted)'} · {CADENCE_LABEL[s.cadence]} · next {new Date(s.nextRunAt).toLocaleString()}
                  {s.spawnedRunIds.length > 0 ? ` · spawned ${s.spawnedRunIds.length}` : ''}
                </div>
              </div>
              <button
                type="button"
                className="sched-ic"
                title={s.active ? 'Pause' : 'Resume'}
                onClick={() => updateScheduledRun(s.id, { active: !s.active })}
              >
                <i className={`ti ${s.active ? 'ti-player-pause' : 'ti-player-play'}`} style={{ fontSize: 11 }} />
              </button>
              <button type="button" className="sched-ic" title="Edit" onClick={() => onEdit(s)}>
                <i className="ti ti-pencil" style={{ fontSize: 11 }} />
              </button>
              <button
                type="button"
                className="sched-ic"
                title="Delete"
                onClick={() => {
                  if (window.confirm(`Delete schedule “${s.name}”? Already-created runs are kept.`)) deleteScheduledRun(s.id)
                }}
              >
                <i className="ti ti-trash" style={{ fontSize: 11 }} />
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}
