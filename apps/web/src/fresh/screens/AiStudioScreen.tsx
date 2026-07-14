'use client'

import { useState } from 'react'
import { FreshTopbar } from '../components/FreshTopbar'

const QUICK_ACTIONS = [
  { icon: 'ti-file-description', title: 'Generate Test Cases', desc: 'From a requirement or free-text spec' },
  { icon: 'ti-list-check', title: 'Summarize Run Results', desc: 'Executive summary of failures and blockers' },
  { icon: 'ti-alert-triangle', title: 'Spot Risk Areas', desc: 'Folders or modules with low coverage' },
  { icon: 'ti-bug', title: 'Draft Defect Reports', desc: 'Turn failed executions into defect drafts' },
]

const DRAFTS = [
  { title: 'Verify SSO redirect preserves deep link after session refresh', meta: '3 steps · Critical · links REQ-00001' },
  { title: 'Confirm session timeout warning appears at T-5 minutes', meta: '4 steps · High · links REQ-00001' },
  { title: 'Validate audit log entry when admin revokes role', meta: '5 steps · Medium · links REQ-00003' },
]

const RECENT = [
  { icon: 'ti-file-description', title: 'Test cases for REQ-016 notification digests', by: 'Concept sample', when: '—' },
  { icon: 'ti-chart-bar', title: 'Run summary — CTMS Regression Sprint 44', by: 'Concept sample', when: '—' },
  { icon: 'ti-alert-triangle', title: 'Risk scan — Reporting module coverage', by: 'Concept sample', when: '—' },
]

export function AiStudioScreen() {
  const [showDrafts, setShowDrafts] = useState(false)

  return (
    <div className="view">
      <FreshTopbar breadcrumbs={[{ label: 'AI Studio' }]} showSearch={false} />

      <div className="screen-wrap">
        <div className="page-head">
          <div>
            <h1 className="aistudio-title">
              <i className="ti ti-sparkles aistudio-title-icon" aria-hidden />
              AI Studio
              <span className="concept-badge">Concept preview</span>
            </h1>
            <div className="sub">
              Design exploration only — no AI generation is implemented in this codebase. Controls below are non-functional previews.
            </div>
          </div>
        </div>

        <div className="panel aistudio-prompt-panel">
          <div className="aistudio-prompt-row">
            <input
              className="inp aistudio-prompt-inp"
              type="text"
              placeholder='Concept UI — e.g. "test cases for REQ-016 notification digests"'
              disabled
              aria-disabled="true"
            />
            <button
              type="button"
              className="btn aistudio-generate"
              onClick={() => setShowDrafts(true)}
              title="Shows static concept drafts only"
            >
              <i className="ti ti-sparkles" aria-hidden />
              Preview drafts
            </button>
          </div>
          <div className="aistudio-actions">
            {QUICK_ACTIONS.map((action) => (
              <button
                key={action.title}
                type="button"
                className="aistudio-action-card"
                onClick={() => setShowDrafts(true)}
              >
                <i className={`ti ${action.icon} aistudio-action-icon`} aria-hidden />
                <div className="aistudio-action-title">{action.title}</div>
                <div className="aistudio-action-desc">{action.desc}</div>
              </button>
            ))}
          </div>
        </div>

        <div className="aistudio-results">
          <div className="panel aistudio-draft-panel">
            <div className="aistudio-draft-hd">
              <h3 className="panel-h3-inline">Draft Preview</h3>
              {showDrafts ? (
                <span className="aistudio-tag">Static concept samples</span>
              ) : null}
            </div>
            <div className="panel-body-pad">
              {showDrafts ? (
                <>
                  {DRAFTS.map((draft) => (
                    <div key={draft.title} className="screen-row aistudio-draft-row">
                      <i className="ti ti-file-text aistudio-draft-icon" aria-hidden />
                      <div className="aistudio-draft-body">
                        <div className="aistudio-draft-title">{draft.title}</div>
                        <div className="aistudio-draft-meta">{draft.meta}</div>
                      </div>
                      <button type="button" className="btn btn-p aistudio-draft-btn" disabled title="Concept only">
                        Accept
                      </button>
                      <button type="button" className="btn btn-neutral aistudio-draft-btn" disabled title="Concept only">
                        Edit
                      </button>
                      <button type="button" className="btn aistudio-draft-btn" disabled title="Concept only">
                        Discard
                      </button>
                    </div>
                  ))}
                  <p className="aistudio-footnote">
                    These rows are hard-coded mockups for the portfolio concept. Nothing is generated or saved.
                  </p>
                </>
              ) : (
                <p className="aistudio-empty">
                  Click Preview drafts or a quick action to show static concept samples. No model is called.
                </p>
              )}
            </div>
          </div>

          <div className="panel aistudio-recent-panel">
            <h3 className="panel-h3">
              Recent Generations
              <span className="roadmap-badge">Roadmap</span>
            </h3>
            <div className="panel-body-pad">
              {RECENT.map((item) => (
                <div key={item.title} className="screen-row aistudio-recent-row">
                  <i className={`ti ${item.icon} aistudio-recent-icon`} aria-hidden />
                  <div className="aistudio-recent-body">
                    <div className="aistudio-recent-title">{item.title}</div>
                    <div className="aistudio-recent-meta">
                      {item.by} · {item.when}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
