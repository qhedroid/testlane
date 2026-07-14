'use client'

import { useMemo, useState } from 'react'
import { TestlaneTopbar } from '@/components/shell/TestlaneTopbar'
import { useDemo } from '@/lib/demo/DemoProvider'
import { SUITE_TREE } from '@/lib/demo/seed'
import { nextId, priorityClass, statusPillClass } from '@/lib/demo/store'
import type { ResultStatus, TestCase } from '@/lib/demo/types'

type StatusFilter = 'all' | ResultStatus

export function CasesScreen() {
  const { state, dispatch } = useDemo()
  const [openSuites, setOpenSuites] = useState<Set<string>>(new Set(['s1']))
  const [selectedSection, setSelectedSection] = useState('Role & permissions')
  const [selectedSuite, setSelectedSuite] = useState('CTMS')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [detailId, setDetailId] = useState<string | null>(null)
  const [quickCreate, setQuickCreate] = useState(false)
  const [quickText, setQuickText] = useState('')
  const [detailTab, setDetailTab] = useState<'details' | 'history' | 'activity'>('details')
  const [showNewModal, setShowNewModal] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newSuite, setNewSuite] = useState('CTMS')
  const [newPriority, setNewPriority] = useState<TestCase['priority']>('medium')
  const [newPrecond, setNewPrecond] = useState('')
  const [newStep, setNewStep] = useState('')
  const [newExpected, setNewExpected] = useState('')

  const filteredCases = useMemo(() => {
    return state.cases.filter((c) => {
      if (c.archived) return false
      const suiteMatch =
        c.suite === selectedSuite ||
        selectedSuite.startsWith(c.suite) ||
        c.suite.startsWith(selectedSuite.split(' ')[0])
      if (!suiteMatch) return false
      if (c.section !== selectedSection) return false
      if (statusFilter !== 'all' && c.lastResult !== statusFilter) return false
      return true
    })
  }, [state.cases, selectedSuite, selectedSection, statusFilter])

  const showEmptyState = selectedSection === 'Import validation' || filteredCases.length === 0

  const detail = detailId ? state.cases.find((c) => c.id === detailId) : null

  function toggleSuite(id: string) {
    setOpenSuites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectSection(suite: string, section: string, empty?: boolean) {
    setSelectedSuite(suite)
    setSelectedSection(section)
    setDetailId(null)
    if (empty) setSelectedIds(new Set())
  }

  function toggleCase(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function addCase(fields: {
    title: string
    suite?: string
    section?: string
    priority?: TestCase['priority']
    preconditions?: string
    steps?: TestCase['steps']
  }) {
    const trimmed = fields.title.trim()
    if (!trimmed) return
    const id = nextId('TC', state.nextCaseNum)
    const suite = fields.suite ?? selectedSuite
    const newCase: TestCase = {
      id,
      suite,
      section: fields.section ?? selectedSection,
      title: trimmed,
      priority: fields.priority ?? 'medium',
      type: 'Functional',
      lastResult: 'not_run',
      assignedTo: 'Shaun Sevume',
      steps: fields.steps ?? [{ action: 'Execute test steps', expected: 'Expected result documented' }],
      preconditions: fields.preconditions ?? 'Demo case — add preconditions as needed.',
      tags: [suite.toLowerCase()],
      updatedAt: 'just now',
    }
    dispatch({ type: 'ADD_CASE', case: newCase })
    return id
  }

  function addQuickCases() {
    const titles = quickText.split('\n').map((t) => t.trim()).filter(Boolean)
    if (!titles.length) return
    let lastId = ''
    titles.forEach((title) => {
      const id = addCase({ title })
      if (id) lastId = id
    })
    setQuickText('')
    setQuickCreate(false)
    if (lastId) setDetailId(lastId)
  }

  function createFullCase() {
    const id = addCase({
      title: newTitle,
      suite: newSuite,
      priority: newPriority,
      preconditions: newPrecond || undefined,
      steps: newStep
        ? [{ action: newStep, expected: newExpected || 'Expected result documented' }]
        : undefined,
    })
    if (!id) return
    setNewTitle('')
    setNewPrecond('')
    setNewStep('')
    setNewExpected('')
    setShowNewModal(false)
    setDetailId(id)
  }

  return (
    <div className="view-screen">
      <TestlaneTopbar
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'TI-Core Platform' },
          { label: 'Test cases' },
        ]}
        actions={
          <>
            <button type="button" className="relay-btn" onClick={() => alert('Import dialog — demo stub')}>
              <i className="ti ti-upload" /> Import
            </button>
            <button type="button" className="relay-btn" onClick={() => setQuickCreate((v) => !v)}>
              <i className="ti ti-bolt" /> Quick create
            </button>
            <button type="button" className="relay-btn relay-btn-primary" onClick={() => setShowNewModal(true)}>
              <i className="ti ti-plus" /> New case
            </button>
          </>
        }
      />

      <div className="tc-lay">
        <aside className="suite-tree">
          <div className="st-hd">
            <i className="ti ti-folder" style={{ fontSize: 13, color: 'var(--relay-muted)' }} />
            <span className="st-ttl">Suites</span>
            <button type="button" className="relay-btn relay-btn-icon" title="Add suite"><i className="ti ti-plus" /></button>
          </div>
          <div className="st-body">
            {SUITE_TREE.map((suite) => (
              <div key={suite.id}>
                <button
                  type="button"
                  className="st-root"
                  onClick={() => toggleSuite(suite.id)}
                >
                  <span className={`st-tog${openSuites.has(suite.id) ? ' open' : ''}`}>▶</span>
                  {suite.name}
                  <span className="st-ct">{suite.count}</span>
                </button>
                {openSuites.has(suite.id) ? (
                  <div className="st-kids open">
                    {suite.sections.map((sec) => (
                      <button
                        key={sec.name}
                        type="button"
                        className={`st-sec${selectedSection === sec.name && selectedSuite === suite.name ? ' on' : ''}`}
                        onClick={() => selectSection(suite.name, sec.name, 'empty' in sec && sec.empty)}
                      >
                        {sec.name}
                        <span className="st-ct">{sec.count}</span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </aside>

        <div className="tc-main">
          <div className="tc-bar">
            {(['all', 'pass', 'fail', 'blocked', 'not_run'] as StatusFilter[]).map((f) => (
              <button
                key={f}
                type="button"
                className={`chip${statusFilter === f ? ' on' : ''}`}
                onClick={() => setStatusFilter(f)}
              >
                {f === 'all' ? 'All status' : f === 'not_run' ? 'Not run' : f.charAt(0).toUpperCase() + f.slice(1)}
              </button>
            ))}
            <span className="tc-count">{filteredCases.length} cases</span>
          </div>

          <div className={`bulk${selectedIds.size > 0 ? ' on' : ''}`}>
            <span className="bulk-n">{selectedIds.size} selected</span>
            <button type="button" className="relay-btn relay-btn-sm">Add to run</button>
            <button type="button" className="relay-btn relay-btn-sm">Clone</button>
            <button type="button" className="relay-btn relay-btn-sm">Move</button>
            <button type="button" className="relay-btn relay-btn-sm">Assign</button>
            <button
              type="button"
              className="relay-btn relay-btn-sm relay-btn-danger"
              onClick={() => {
                dispatch({ type: 'ARCHIVE_CASES', ids: [...selectedIds] })
                setSelectedIds(new Set())
              }}
            >
              Archive
            </button>
            <button type="button" className="relay-btn relay-btn-sm" style={{ marginLeft: 'auto' }} onClick={() => setSelectedIds(new Set())}>
              <i className="ti ti-x" /> Clear
            </button>
          </div>

          <div className={`quick-box${quickCreate ? ' on' : ''}`}>
            <textarea
              value={quickText}
              placeholder="One test case title per line. Details can be filled later."
              onChange={(e) => setQuickText(e.target.value)}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button type="button" className="relay-btn relay-btn-primary" onClick={addQuickCases}>
                <i className="ti ti-plus" /> Add
              </button>
              <button type="button" className="relay-btn" onClick={() => setQuickCreate(false)}>Cancel</button>
            </div>
          </div>

          <div className="tc-wrap">
            {!showEmptyState ? (
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 28 }}>
                      <input
                        type="checkbox"
                        checked={selectedIds.size === filteredCases.length && filteredCases.length > 0}
                        onChange={(e) => {
                          if (e.target.checked) setSelectedIds(new Set(filteredCases.map((c) => c.id)))
                          else setSelectedIds(new Set())
                        }}
                      />
                    </th>
                    <th style={{ width: 68 }}>ID</th>
                    <th>Title</th>
                    <th style={{ width: 72 }}>Priority</th>
                    <th style={{ width: 80 }}>Suite</th>
                    <th style={{ width: 88 }}>Type</th>
                    <th style={{ width: 80 }}>Last run</th>
                    <th style={{ width: 100 }}>Assigned</th>
                    <th style={{ width: 50, textAlign: 'center' }}>Steps</th>
                    <th style={{ width: 70 }}>Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredCases.map((c) => (
                    <tr
                      key={c.id}
                      className={detailId === c.id ? 'sel' : ''}
                      onClick={() => setDetailId(c.id)}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input type="checkbox" checked={selectedIds.has(c.id)} onChange={() => toggleCase(c.id)} />
                      </td>
                      <td className="tmono">{c.id}</td>
                      <td className="title-cell">{c.title}</td>
                      <td><span className={priorityClass(c.priority)}>{c.priority}</span></td>
                      <td>{c.suite}</td>
                      <td>{c.type}</td>
                      <td><span className={statusPillClass(c.lastResult)}>{c.lastResult}</span></td>
                      <td>{c.assignedTo}</td>
                      <td style={{ textAlign: 'center' }}>{c.steps.length}</td>
                      <td className="tmono">{c.updatedAt}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
            <div className={`empty-state${showEmptyState ? ' on' : ''}`}>
              <div className="empty-card">
                <i className="ti ti-folder-open" />
                <div className="empty-title">No test cases in this folder</div>
                <div className="empty-copy">Create a new case, quick add several titles, or import existing cases into the selected folder.</div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button type="button" className="relay-btn relay-btn-primary" onClick={() => setShowNewModal(true)}>
                    <i className="ti ti-plus" /> Create test case
                  </button>
                  <button type="button" className="relay-btn" onClick={() => setQuickCreate(true)}>
                    <i className="ti ti-bolt" /> Quick create
                  </button>
                  <button type="button" className="relay-btn" onClick={() => alert('Import dialog — demo stub')}>
                    <i className="ti ti-upload" /> Import existing cases
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="resizer-v detail-resizer" aria-hidden />
        <aside className={`dp${detail ? ' open' : ''}`}>
          {detail ? (
            <>
              <div className="dp-hd">
                <div style={{ flex: 1 }}>
                  <span className="dp-id">{detail.id}</span>
                  <div className="dp-ttl">{detail.title}</div>
                </div>
                <button type="button" className="relay-btn relay-btn-icon" onClick={() => setDetailId(null)}><i className="ti ti-x" /></button>
              </div>
              <div className="nav-tab-bar">
                {(['details', 'history', 'activity'] as const).map((t) => (
                  <button key={t} type="button" className={`nav-tab${detailTab === t ? ' on' : ''}`} onClick={() => setDetailTab(t)}>
                    {t.charAt(0).toUpperCase() + t.slice(1)}
                  </button>
                ))}
              </div>
              <div className="dp-body">
                {detailTab === 'details' ? (
                  <>
                    <div className="dp-sec">
                      <div className="dp-sl">Metadata</div>
                      <div className="dp-mg">
                        <div><div className="dp-ml">Priority</div><div className="dp-mv">{detail.priority}</div></div>
                        <div><div className="dp-ml">Type</div><div className="dp-mv">{detail.type}</div></div>
                        <div><div className="dp-ml">Assigned to</div><div className="dp-mv">{detail.assignedTo}</div></div>
                        <div><div className="dp-ml">Last result</div><div className="dp-mv"><span className={statusPillClass(detail.lastResult)}>{detail.lastResult}</span></div></div>
                        <div><div className="dp-ml">Suite</div><div className="dp-mv">{detail.suite}</div></div>
                        <div><div className="dp-ml">Automation</div><div className="dp-mv">Manual</div></div>
                      </div>
                    </div>
                    <div className="dp-sec">
                      <div className="dp-sl">Preconditions</div>
                      <p className="dp-precond">{detail.preconditions}</p>
                    </div>
                    <div className="dp-sec">
                      <div className="dp-sl">Steps</div>
                      {detail.steps.map((s, i) => (
                        <div key={i} className="step-i">
                          <span className="step-n">{i + 1}</span>
                          <div>
                            <div className="step-act">{s.action}</div>
                            <div className="step-exp">{s.expected}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="dp-sec">
                      <div className="dp-sl">Tags</div>
                      <div className="tag-row">
                        {detail.tags.map((t) => (
                          <span key={t} className="tag">{t}</span>
                        ))}
                      </div>
                    </div>
                  </>
                ) : null}
                {detailTab === 'history' ? (
                  <div className="dp-sec">
                    <div className="hist-item"><div className="hist-dot pass" /><div><div className="hist-label">Passed — Sprint 44</div><div className="hist-meta">2d ago</div></div></div>
                    <div className="hist-item"><div className="hist-dot fail" /><div><div className="hist-label">Failed — Sprint 43 Smoke</div><div className="hist-meta">15d ago</div></div></div>
                  </div>
                ) : null}
                {detailTab === 'activity' ? (
                  <div className="dp-sec">
                    <div className="act-item"><strong>You</strong> viewed test case<span className="act-time">just now</span></div>
                    <div className="act-item"><strong>{detail.assignedTo}</strong> last updated case<span className="act-time">{detail.updatedAt}</span></div>
                  </div>
                ) : null}
              </div>
              <div className="dp-foot">
                <button type="button" className="relay-btn relay-btn-primary" style={{ flex: 1 }}><i className="ti ti-edit" /> Edit case</button>
                <button type="button" className="relay-btn"><i className="ti ti-player-play" /> Add to run</button>
              </div>
            </>
          ) : null}
        </aside>
      </div>

      {showNewModal ? (
        <div className="modal-backdrop" onClick={() => setShowNewModal(false)}>
          <div className="create-dialog" onClick={(e) => e.stopPropagation()}>
            <div className="create-hd shortcuts-hd">
              <div className="shortcuts-title">Create test case</div>
              <button type="button" className="relay-btn relay-btn-icon" onClick={() => setShowNewModal(false)}><i className="ti ti-x" /></button>
            </div>
            <div className="create-body">
              <div className="form-field">
                <label htmlFor="new-case-title">Title</label>
                <input id="new-case-title" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="Describe the behavior to validate" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                <div className="form-field">
                  <label htmlFor="new-case-suite">Suite</label>
                  <select id="new-case-suite" value={newSuite} onChange={(e) => setNewSuite(e.target.value)}>
                    {SUITE_TREE.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
                  </select>
                </div>
                <div className="form-field">
                  <label htmlFor="new-case-pri">Priority</label>
                  <select id="new-case-pri" value={newPriority} onChange={(e) => setNewPriority(e.target.value as TestCase['priority'])}>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
              </div>
              <div className="form-field">
                <label htmlFor="new-case-precond">Preconditions</label>
                <textarea id="new-case-precond" rows={3} value={newPrecond} onChange={(e) => setNewPrecond(e.target.value)} placeholder="Data, role, tenant, or module setup required" />
              </div>
              <div className="form-field">
                <label htmlFor="new-case-step">First step</label>
                <textarea id="new-case-step" rows={2} value={newStep} onChange={(e) => setNewStep(e.target.value)} placeholder="Action to perform" />
              </div>
              <div className="form-field">
                <label htmlFor="new-case-expected">Expected result</label>
                <textarea id="new-case-expected" rows={2} value={newExpected} onChange={(e) => setNewExpected(e.target.value)} placeholder="Observable result" />
              </div>
            </div>
            <div className="create-foot">
              <button type="button" className="relay-btn" onClick={() => setShowNewModal(false)}>Cancel</button>
              <button type="button" className="relay-btn relay-btn-primary" onClick={createFullCase}><i className="ti ti-plus" /> Create case</button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
