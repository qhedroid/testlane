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
  { icon: 'ti-file-description', title: 'Test cases for REQ-016 notification digests', by: 'Shaun Sevume', when: '2h ago' },
  { icon: 'ti-chart-bar', title: 'Run summary — CTMS Regression Sprint 44', by: 'Noel Quadri', when: 'Yesterday' },
  { icon: 'ti-alert-triangle', title: 'Risk scan — Reporting module coverage', by: 'Jamil Khan', when: '3d ago' },
]

export function AiStudioScreen() {
  const [showDrafts, setShowDrafts] = useState(true)

  return (
    <div className="view">
      <FreshTopbar breadcrumbs={[{ label: 'AI Studio' }]} showSearch={false} />

      <div className="screen-wrap">
        <div className="page-head">
          <div>
            <h1 className="aistudio-title">
              <i className="ti ti-sparkles aistudio-title-icon" aria-hidden />
              AI Studio
            </h1>
            <div className="sub">
              Draft test assets, summarize results and spot risk. Drafts are suggestions — nothing is saved without your review.
            </div>
          </div>
        </div>

        <div className="panel aistudio-prompt-panel">
          <div className="aistudio-prompt-row">
            <input
              className="inp aistudio-prompt-inp"
              type="text"
              placeholder='Describe what to generate — e.g. "test cases for REQ-016 notification digests"'
            />
            <button type="button" className="btn aistudio-generate" onClick={() => setShowDrafts(true)}>
              <i className="ti ti-sparkles" aria-hidden />
              Generate
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
                <span className="aistudio-tag">3 test cases from REQ-016</span>
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
                      <button type="button" className="btn btn-p aistudio-draft-btn">Accept</button>
                      <button type="button" className="btn btn-neutral aistudio-draft-btn">Edit</button>
                      <button type="button" className="btn aistudio-draft-btn">Discard</button>
                    </div>
                  ))}
                  <p className="aistudio-footnote">
                    Accepted drafts land in the folder you choose, marked as AI-drafted until a reviewer approves them.
                  </p>
                </>
              ) : (
                <p className="aistudio-empty">Click Generate or a quick action to preview draft suggestions here.</p>
              )}
            </div>
          </div>

          <div className="panel aistudio-recent-panel">
            <h3 className="panel-h3">Recent Generations</h3>
            <div className="panel-body-pad">
              {RECENT.map((item) => (
                <div key={item.title} className="screen-row aistudio-recent-row">
                  <i className={`ti ${item.icon} aistudio-recent-icon`} aria-hidden />
                  <div className="aistudio-recent-body">
                    <div className="aistudio-recent-title">{item.title}</div>
                    <div className="aistudio-recent-meta">{item.by} · {item.when}</div>
                  </div>
                  <button type="button" className="btn aistudio-open-btn" aria-label="Open">
                    <i className="ti ti-arrow-up-right" aria-hidden />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
