'use client'

import { useMemo, useState } from 'react'
import { FreshTopbar } from '../components/FreshTopbar'
import { useFresh } from '../data/FreshProvider'
import { SUITE_TREE } from '../data/seed'
import type { DemoCase } from '../data/types'
import { PILL_LABEL, PILL_MAP, PRI_MAP } from '../data/ui-utils'
import { useFreshUI } from '../hooks/useFreshUI'

type StatusFilter = 'all' | 'pass' | 'fail' | 'blocked' | 'not_run'

const STATUS_CHIPS: { label: string; value: StatusFilter }[] = [
  { label: 'All status', value: 'all' },
  { label: 'Pass', value: 'pass' },
  { label: 'Fail', value: 'fail' },
  { label: 'Blocked', value: 'blocked' },
  { label: 'Not run', value: 'not_run' },
]

export function CasesScreen() {
  const { state, addCase } = useFresh()
  const { openCreateCase } = useFreshUI()
  const [openSuites, setOpenSuites] = useState<Set<string>>(new Set(['s1']))
  const [selectedSection, setSelectedSection] = useState('Record management')
  const [folderEmpty, setFolderEmpty] = useState(false)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())
  const [detailIdx, setDetailIdx] = useState<number | null>(null)
  const [detailTab, setDetailTab] = useState<'details' | 'history' | 'activity'>('details')
  const [quickOpen, setQuickOpen] = useState(false)
  const [quickText, setQuickText] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all')

  const cases = state.cases
  const displayedCases = useMemo(() => {
    if (folderEmpty) return []
    if (statusFilter === 'all') return cases
    return cases.filter((c) => c.last === statusFilter)
  }, [cases, statusFilter, folderEmpty])
  const detail = detailIdx !== null ? displayedCases[detailIdx] : null

  function toggleSuite(id: string) {
    setOpenSuites((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function selectSection(name: string, empty?: boolean) {
    setSelectedSection(name)
    setFolderEmpty(!!empty)
    setDetailIdx(null)
    setSelectedIds(new Set())
  }

  function showImportState() {
    setFolderEmpty(true)
    setSelectedSection('Import validation')
  }

  function addQuickCases() {
    const titles = quickText.split('\n').map((t) => t.trim()).filter(Boolean)
    titles.forEach((title) => {
      addCase({
        suite: 'CTMS',
        title,
        pri: 'medium',
        type: 'Functional',
        last: 'not_run',
        by: 'You',
        steps: 1,
        upd: 'just now',
        precond: '—',
        stepList: [{ a: 'Execute test steps', e: 'Expected result documented' }],
      })
    })
    setQuickText('')
    setQuickOpen(false)
    setFolderEmpty(false)
  }

  return (
    <div className="view">
      <FreshTopbar
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'TI-Core Platform' },
          { label: 'Test cases' },
        ]}
        searchPlaceholder="Search cases…"
        searchWidth={200}
        actions={
          <>
            <button type="button" className="btn" onClick={showImportState}><i className="ti ti-upload" style={{ fontSize: 12 }} /> Import</button>
            <button type="button" className="btn" onClick={() => setQuickOpen((v) => !v)}><i className="ti ti-bolt" style={{ fontSize: 12 }} /> Quick create</button>
            <button type="button" className="btn btn-p" onClick={openCreateCase}><i className="ti ti-plus" style={{ fontSize: 12 }} /> New case</button>
          </>
        }
      />
      <div className="tc-lay">
        <div className="suite-tree">
          <div className="st-hd">
            <i className="ti ti-folder" style={{ fontSize: 13, color: 'var(--text2)' }} />
            <span className="st-ttl">Suites</span>
            <button type="button" className="btn" style={{ padding: '2px 5px', fontSize: 13, lineHeight: 1 }}><i className="ti ti-plus" /></button>
          </div>
          <div className="st-body">
            {SUITE_TREE.map((suite) => (
              <div key={suite.id}>
                <div className="st-root" onClick={() => toggleSuite(suite.id)}>
                  <span className={`st-tog${openSuites.has(suite.id) ? ' open' : ''}`}>▶</span>
                  <i className="ti ti-folder" style={{ fontSize: 12, color: openSuites.has(suite.id) ? 'var(--accent)' : 'var(--text2)' }} />
                  {suite.name}
                  <span className="st-ct">{suite.count}</span>
                </div>
                {openSuites.has(suite.id) ? (
                  <div className="st-kids open">
                    {suite.sections.map((sec) => (
                      <div
                        key={sec.name}
                        className={`st-sec${selectedSection === sec.name && !folderEmpty ? ' on' : ''}`}
                        onClick={() => selectSection(sec.name, sec.empty)}
                      >
                        {sec.name}
                        <span className="st-ct" style={{ marginLeft: 'auto' }}>{sec.count}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </div>

        <div className="resizer-v" data-resize="suite-tree" data-min="160" data-max="360" />

        <div className="tc-main">
          <div className="tc-bar">
            {STATUS_CHIPS.map(({ label, value }) => (
              <span
                key={label}
                className={`chip${statusFilter === value ? ' on' : ''}`}
                onClick={() => { setStatusFilter(value); setDetailIdx(null) }}
              >
                {label}
              </span>
            ))}
            <div style={{ width: 1, height: 14, background: 'var(--border)', margin: '0 2px' }} />
            <span className="chip">Priority <i className="ti ti-chevron-down" style={{ fontSize: 10 }} /></span>
            <span className="chip">Assignee <i className="ti ti-chevron-down" style={{ fontSize: 10 }} /></span>
            <span className="chip">Type <i className="ti ti-chevron-down" style={{ fontSize: 10 }} /></span>
            <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text3)', fontFamily: 'var(--mono)' }}>{folderEmpty ? 0 : displayedCases.length} cases</span>
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
            <textarea
              placeholder="One test case title per line. Details can be filled later."
              value={quickText}
              onChange={(e) => setQuickText(e.target.value)}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <button type="button" className="btn btn-p" onClick={addQuickCases}><i className="ti ti-plus" style={{ fontSize: 12 }} /> Add</button>
              <button type="button" className="btn" onClick={() => setQuickOpen(false)}>Cancel</button>
            </div>
          </div>

          <div className="tc-wrap">
            {!folderEmpty ? (
              <table className="tbl">
                <thead>
                  <tr>
                    <th style={{ width: 28 }}><input type="checkbox" onChange={(e) => {
                      if (e.target.checked) setSelectedIds(new Set(displayedCases.map((_, i) => i)))
                      else setSelectedIds(new Set())
                    }} /></th>
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
                  {displayedCases.map((c, i) => (
                    <tr
                      key={c.id}
                      className={detailIdx === i ? 'sel' : ''}
                      onClick={() => setDetailIdx(i)}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedIds.has(i)}
                          onChange={() => setSelectedIds((prev) => {
                            const next = new Set(prev)
                            if (next.has(i)) next.delete(i)
                            else next.add(i)
                            return next
                          })}
                        />
                      </td>
                      <td className="tmono">{c.id}</td>
                      <td className="title-cell" style={{ maxWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.title}</td>
                      <td><span className={`pri ${PRI_MAP[c.pri]}`}>{c.pri}</span></td>
                      <td style={{ color: 'var(--accent)', fontSize: 11.5, fontWeight: 500 }}>{c.suite}</td>
                      <td style={{ color: 'var(--text2)' }}>{c.type}</td>
                      <td><span className={`pill ${PILL_MAP[c.last]}`}>{PILL_LABEL[c.last]}</span></td>
                      <td style={{ color: 'var(--text2)' }}>{c.by}</td>
                      <td style={{ textAlign: 'center', fontFamily: 'var(--mono)', color: 'var(--text3)' }}>{c.steps}</td>
                      <td style={{ color: 'var(--text3)' }}>{c.upd}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : null}
            <div className={`empty-state${folderEmpty ? ' on' : ''}`}>
              <div className="empty-card">
                <i className="ti ti-folder-open" />
                <div className="empty-title">No test cases in this folder</div>
                <div className="empty-copy">Create a new case, quick add several titles, or import existing cases into the selected folder.</div>
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap' }}>
                  <button type="button" className="btn btn-p" onClick={openCreateCase}><i className="ti ti-plus" style={{ fontSize: 12 }} /> Create test case</button>
                  <button type="button" className="btn" onClick={() => setQuickOpen(true)}><i className="ti ti-bolt" style={{ fontSize: 12 }} /> Quick create</button>
                  <button type="button" className="btn" onClick={showImportState}><i className="ti ti-upload" style={{ fontSize: 12 }} /> Import existing cases</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="resizer-v detail-resizer" data-resize="case-detail" data-min="300" data-max="540" />
        <div className={`dp${detail ? ' open' : ''}`}>
          {detail ? <CaseDetail case={detail} tab={detailTab} onTab={setDetailTab} onClose={() => setDetailIdx(null)} /> : null}
        </div>
      </div>
    </div>
  )
}

function CaseDetail({
  case: c,
  tab,
  onTab,
  onClose,
}: {
  case: DemoCase
  tab: string
  onTab: (t: 'details' | 'history' | 'activity') => void
  onClose: () => void
}) {
  return (
    <>
      <div className="dp-hd">
        <div style={{ flex: 1, overflow: 'hidden' }}>
          <span className="dp-id">{c.id}</span>
          <div className="dp-ttl">{c.title}</div>
        </div>
        <button type="button" className="btn" style={{ padding: '2px 6px', flexShrink: 0 }} onClick={onClose}>
          <i className="ti ti-x" style={{ fontSize: 13 }} />
        </button>
      </div>
      <div className="nav-tab-bar">
        {(['details', 'history', 'activity'] as const).map((t) => (
          <div key={t} className={`nav-tab${tab === t ? ' on' : ''}`} onClick={() => onTab(t)}>{t.charAt(0).toUpperCase() + t.slice(1)}</div>
        ))}
      </div>
      <div className="dp-body">
        {tab === 'details' ? (
          <>
            <div className="dp-sec">
              <div className="dp-sl">Metadata</div>
              <div className="dp-mg">
                <div><div className="dp-ml">Priority</div><div className="dp-mv"><span className={`pri ${PRI_MAP[c.pri]}`}>{c.pri.charAt(0).toUpperCase() + c.pri.slice(1)}</span></div></div>
                <div><div className="dp-ml">Type</div><div className="dp-mv">{c.type}</div></div>
                <div><div className="dp-ml">Assigned to</div><div className="dp-mv">{c.by}</div></div>
                <div><div className="dp-ml">Last result</div><div className="dp-mv"><span className={`pill ${PILL_MAP[c.last]}`}>{PILL_LABEL[c.last]}</span></div></div>
                <div><div className="dp-ml">Suite</div><div className="dp-mv">{c.suite}</div></div>
                <div><div className="dp-ml">Automation</div><div className="dp-mv">Manual</div></div>
              </div>
            </div>
            <div className="dp-sec">
              <div className="dp-sl">Preconditions</div>
              <div style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.5 }}>{c.precond}</div>
            </div>
            <div className="dp-sec">
              <div className="dp-sl">Steps</div>
              {c.stepList.map((s, n) => (
                <div key={n} className="step-i">
                  <div className="step-n">{n + 1}</div>
                  <div><div className="step-act">{s.a}</div><div className="step-exp">→ {s.e}</div></div>
                </div>
              ))}
            </div>
            <div className="dp-sec" style={{ borderBottom: 'none' }}>
              <div className="dp-sl">Tags</div>
              <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                {(c.tags ?? [c.suite.toLowerCase()]).map((t) => <span key={t} className="tag">{t}</span>)}
              </div>
            </div>
          </>
        ) : null}
        {tab === 'history' ? (
          <>
            <div className="hist-item"><div className="hist-dot" style={{ background: 'var(--pass)' }} /><div><div className="hist-label">Passed — CTMS Regression · Sprint 44</div><div className="hist-meta">Aisha R. · 2d ago · all steps passed</div></div></div>
            <div className="hist-item"><div className="hist-dot" style={{ background: 'var(--fail)' }} /><div><div className="hist-label">Failed — Sprint 43 Smoke Test</div><div className="hist-meta">James O. · 15d ago · Step 2 failed · Defect TI-4401</div></div></div>
          </>
        ) : null}
        {tab === 'activity' ? (
          <>
            <div className="act-item"><strong>Aisha R.</strong> updated preconditions<span className="act-time">2d ago · 09:14</span></div>
            <div className="act-item"><strong>Marcus W.</strong> added step 4<span className="act-time">5d ago · 14:32</span></div>
          </>
        ) : null}
      </div>
      <div style={{ padding: '7px 10px', borderTop: '1px solid var(--border)', display: 'flex', gap: 5 }}>
        <button type="button" className="btn btn-p" style={{ flex: 1 }}><i className="ti ti-edit" style={{ fontSize: 12 }} /> Edit case</button>
        <button type="button" className="btn"><i className="ti ti-player-play" style={{ fontSize: 12 }} /> Add to run</button>
      </div>
    </>
  )
}
