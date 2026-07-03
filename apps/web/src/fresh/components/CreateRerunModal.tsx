'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFresh } from '../data/FreshProvider'
import type { DemoRun, ExecStatus } from '../data/demo-model'
import { runSummary } from '../data/demo-model'
import { runChainMembers, runChainRootId } from '../data/run-utils'
import { TEAM_USERS } from '../data/team-users'
import { testRunPath } from '../lib/project-routes'

export type RerunInclude = 'failed' | 'failedBlocked' | 'notPassed' | 'custom'

interface CreateRerunModalProps {
  open: boolean
  sourceRun: DemoRun | undefined
  initialInclude?: RerunInclude
  onClose: () => void
}

const INCLUDE_STATUSES: Record<Exclude<RerunInclude, 'custom'>, ExecStatus[]> = {
  failed: ['Failed'],
  failedBlocked: ['Failed', 'Blocked'],
  notPassed: ['Failed', 'Blocked', 'Skipped', 'Not run'],
}

export function CreateRerunModal({ open, sourceRun, initialInclude = 'failedBlocked', onClose }: CreateRerunModalProps) {
  const router = useRouter()
  const { state, activeProject, getCase, createRerun } = useFresh()
  const [include, setInclude] = useState<RerunInclude>(initialInclude)
  const [customIds, setCustomIds] = useState<Set<string>>(() => new Set())
  const [customSearch, setCustomSearch] = useState('')
  const [assignMode, setAssignMode] = useState<'keep' | 'reassign'>('keep')
  const [reassignTo, setReassignTo] = useState<string>(TEAM_USERS[0] ?? '')
  const [name, setName] = useState('')
  const [nameTouched, setNameTouched] = useState(false)

  const chain = useMemo(() => {
    if (!sourceRun) return []
    const projectRuns = state.runs.filter((r) => r.projectId === sourceRun.projectId)
    return runChainMembers(projectRuns, runChainRootId(projectRuns, sourceRun))
  }, [state.runs, sourceRun])

  const defaultName = sourceRun ? `${sourceRun.name} · Re-run ${chain.length}` : ''

  useEffect(() => {
    if (!open) return
    setInclude(initialInclude)
    setCustomIds(new Set())
    setCustomSearch('')
    setAssignMode('keep')
    setName('')
    setNameTouched(false)
  }, [open, initialInclude])

  const statusOf = useMemo(() => {
    const map = new Map<string, ExecStatus>()
    if (sourceRun) {
      for (const caseId of sourceRun.caseOrder) {
        map.set(caseId, sourceRun.executions[caseId]?.status ?? 'Not run')
      }
    }
    return map
  }, [sourceRun])

  const counts = useMemo(() => {
    const c = { Passed: 0, Failed: 0, Blocked: 0, Skipped: 0, 'Not run': 0 } as Record<ExecStatus, number>
    for (const s of statusOf.values()) c[s] += 1
    return c
  }, [statusOf])

  const countFor = (opt: Exclude<RerunInclude, 'custom'>) =>
    INCLUDE_STATUSES[opt].reduce((n, s) => n + counts[s], 0)

  const includedCaseIds = useMemo(() => {
    if (!sourceRun) return []
    if (include === 'custom') return sourceRun.caseOrder.filter((id) => customIds.has(id))
    const allowed = new Set(INCLUDE_STATUSES[include])
    return sourceRun.caseOrder.filter((id) => allowed.has(statusOf.get(id) ?? 'Not run'))
  }, [sourceRun, include, customIds, statusOf])

  if (!open || !sourceRun) return null

  const summary = runSummary(sourceRun)
  const effectiveName = nameTouched ? name : defaultName

  function handleCreate() {
    if (!sourceRun || includedCaseIds.length === 0) return
    const result = createRerun({
      sourceRunId: sourceRun.id,
      name: effectiveName.trim() || defaultName,
      caseIds: includedCaseIds,
      assignMode,
      reassignTo: assignMode === 'reassign' ? reassignTo : undefined,
    })
    onClose()
    if (result) router.push(testRunPath(activeProject.key, result.runKey))
  }

  const customCases = sourceRun.caseOrder
    .map((id) => ({ id, case: getCase(id), status: statusOf.get(id) ?? ('Not run' as ExecStatus) }))
    .filter((x) => x.case)
    .filter(
      (x) =>
        !customSearch.trim() ||
        x.case!.title.toLowerCase().includes(customSearch.toLowerCase()) ||
        (x.case!.caseKey ?? '').toLowerCase().includes(customSearch.toLowerCase()),
    )

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="create-dialog" style={{ width: 520, maxWidth: '94vw' }} onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-hd">
          <div className="shortcuts-title">Create re-run of {sourceRun.runKey} — {sourceRun.name}</div>
          <button type="button" className="btn" style={{ padding: '2px 6px' }} onClick={onClose}>
            <i className="ti ti-x" style={{ fontSize: 13 }} />
          </button>
        </div>
        <div className="create-body" style={{ maxHeight: '68vh', overflowY: 'auto' }}>
          <div className="rr-chips">
            <span className="pill p-pass" style={{ fontSize: 10, padding: '2px 7px' }}>✓ {summary.passed} Passed</span>
            <span className="pill p-fail" style={{ fontSize: 10, padding: '2px 7px' }}>✗ {summary.failed} Failed</span>
            <span className="pill p-block" style={{ fontSize: 10, padding: '2px 7px' }}>⊘ {summary.blocked} Blocked</span>
            <span className="pill p-notrun" style={{ fontSize: 10, padding: '2px 7px' }}>○ {summary.notRun} Not run</span>
          </div>

          <div className="form-field">
            <label>Cases to include</label>
            <label className="rr-radio">
              <input type="radio" name="rr-include" checked={include === 'failed'} onChange={() => setInclude('failed')} />
              <span>Failed only <span className="rr-count">({countFor('failed')})</span></span>
            </label>
            <label className="rr-radio">
              <input type="radio" name="rr-include" checked={include === 'failedBlocked'} onChange={() => setInclude('failedBlocked')} />
              <span>Failed + Blocked <span className="rr-count">({countFor('failedBlocked')})</span></span>
            </label>
            <label className="rr-radio">
              <input type="radio" name="rr-include" checked={include === 'notPassed'} onChange={() => setInclude('notPassed')} />
              <span>Everything except Passed <span className="rr-count">({countFor('notPassed')})</span></span>
            </label>
            <label className="rr-radio">
              <input type="radio" name="rr-include" checked={include === 'custom'} onChange={() => setInclude('custom')} />
              <span>Custom selection… <span className="rr-count">({customIds.size})</span></span>
            </label>
            {include === 'custom' ? (
              <div className="rr-custom">
                <input
                  className="rr-custom-search"
                  placeholder="Search cases in this run…"
                  value={customSearch}
                  onChange={(e) => setCustomSearch(e.target.value)}
                />
                <div className="rr-custom-list">
                  {customCases.map((x) => (
                    <label key={x.id} className="rr-custom-row">
                      <input
                        type="checkbox"
                        checked={customIds.has(x.id)}
                        onChange={() =>
                          setCustomIds((prev) => {
                            const next = new Set(prev)
                            if (next.has(x.id)) next.delete(x.id)
                            else next.add(x.id)
                            return next
                          })
                        }
                      />
                      <span className="rr-custom-key">{x.case!.caseKey ?? x.id}</span>
                      <span className="rr-custom-title">{x.case!.title}</span>
                      <span className="rr-custom-status">{x.status}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="form-field">
            <label>Assignment</label>
            <label className="rr-radio">
              <input type="radio" name="rr-assign" checked={assignMode === 'keep'} onChange={() => setAssignMode('keep')} />
              <span>Keep original assignees</span>
            </label>
            <label className="rr-radio" style={{ alignItems: 'center' }}>
              <input type="radio" name="rr-assign" checked={assignMode === 'reassign'} onChange={() => setAssignMode('reassign')} />
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Reassign all to
                <select
                  value={reassignTo}
                  disabled={assignMode !== 'reassign'}
                  onChange={(e) => setReassignTo(e.target.value)}
                  style={{ fontSize: 11.5 }}
                >
                  {TEAM_USERS.map((u) => (
                    <option key={u} value={u}>{u}</option>
                  ))}
                </select>
              </span>
            </label>
          </div>

          <div className="form-field">
            <label>Name</label>
            <input
              value={effectiveName}
              onChange={(e) => {
                setName(e.target.value)
                setNameTouched(true)
              }}
            />
          </div>

          <div className="rr-callout">
            <i className="ti ti-info-circle" style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }} />
            <span>
              The source run <strong>{sourceRun.runKey}</strong> stays {sourceRun.sealed ? 'closed' : 'as it is'} and untouched — its
              results are never overwritten. The re-run starts with all included cases at <em>Not run</em>.
            </span>
          </div>
        </div>
        <div className="create-foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-p" disabled={includedCaseIds.length === 0} onClick={handleCreate}>
            <i className="ti ti-repeat" style={{ fontSize: 12 }} /> Create re-run ({includedCaseIds.length} case{includedCaseIds.length === 1 ? '' : 's'})
          </button>
        </div>
      </div>
    </div>
  )
}
