'use client'

import type {
  CaseResultStatusInput,
  RunDetail,
  RunDetailCase,
} from '@/lib/relay/types'
import {
  caseToApiStatus,
  isActiveStatus,
  priorityClass,
  statusLabel,
  statusPillClass,
} from './run-case-utils'

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

interface CaseDetailPanelProps {
  detail: RunDetail
  selectedCase: RunDetailCase
  canMutate: boolean
  commentDraft: string
  saving: boolean
  onCommentDraftChange: (value: string) => void
  onStatusUpdate: (
    status: CaseResultStatusInput,
    comment?: string | null,
  ) => void
  onSaveComment: () => void
  onPrevCase: () => void
  onNextCase: () => void
  hasPrev: boolean
  hasNext: boolean
}

function lastUpdatedLabel(caseItem: RunDetailCase): string {
  const at = caseItem.executedAt ?? caseItem.updatedAt
  return at ? new Date(at).toLocaleString() : '—'
}

export function CaseDetailPanel({
  detail,
  selectedCase,
  canMutate,
  commentDraft,
  saving,
  onCommentDraftChange,
  onStatusUpdate,
  onSaveComment,
  onPrevCase,
  onNextCase,
  hasPrev,
  hasNext,
}: CaseDetailPanelProps) {
  const executable = detail.status === 'active' && canMutate
  const commentDirty =
    commentDraft.trim() !== (selectedCase.comment ?? '').trim()

  function includeComment(): string | null | undefined {
    const trimmed = commentDraft.trim()
    if (!trimmed && !selectedCase.comment) return undefined
    return trimmed || null
  }

  return (
    <div className="ed-pane">
      <div className="ed-hd">
        <div className="ed-top">
          <div>
            <div className="ed-id">{selectedCase.caseRef}</div>
            <div className="ed-ttl">{selectedCase.title}</div>
          </div>
          <div className="ed-nav">
            <button
              type="button"
              className="relay-btn"
              disabled={!hasPrev || saving}
              onClick={onPrevCase}
            >
              ← Prev
            </button>
            <button
              type="button"
              className="relay-btn"
              disabled={!hasNext || saving}
              onClick={onNextCase}
            >
              Next →
            </button>
          </div>
        </div>
        <div className="ed-mt">
          <span className={priorityClass(selectedCase.priority)}>
            {selectedCase.priority}
          </span>
          <span className="ed-tag">{selectedCase.type}</span>
          {selectedCase.module ? (
            <span className="ed-tag">{selectedCase.module}</span>
          ) : null}
          <span className="ed-meta-line">
            {selectedCase.assignedToName ?? 'Unassigned'}
          </span>
          <span className={statusPillClass(selectedCase.status)}>
            <span className="pill-dot" />
            {statusLabel(selectedCase.status)}
          </span>
        </div>
      </div>

      <div className="ed-body">
        <div className="ed-section">
          <div className="ed-sl">Metadata</div>
          <div className="ed-meta-grid">
            <div>
              <div className="ed-ml">Priority</div>
              <div className="ed-mv">{selectedCase.priority}</div>
            </div>
            <div>
              <div className="ed-ml">Type</div>
              <div className="ed-mv">{selectedCase.type}</div>
            </div>
            <div>
              <div className="ed-ml">Suite</div>
              <div className="ed-mv">{selectedCase.module ?? '—'}</div>
            </div>
            <div>
              <div className="ed-ml">Assignee</div>
              <div className="ed-mv">
                {selectedCase.assignedToName ?? 'Unassigned'}
              </div>
            </div>
            <div>
              <div className="ed-ml">Last updated</div>
              <div className="ed-mv">{lastUpdatedLabel(selectedCase)}</div>
            </div>
            <div>
              <div className="ed-ml">Executed by</div>
              <div className="ed-mv">
                {selectedCase.executedByName ?? '—'}
              </div>
            </div>
          </div>
        </div>

        <div className="ed-section">
          <div className="ed-sl">Result</div>
          <div className="srb-row ed-srb-row">
            {STATUS_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                className={`srb ${opt.srb}${isActiveStatus(selectedCase.status, opt.value) ? ' on' : ''}`}
                disabled={saving || !executable}
                onClick={() =>
                  onStatusUpdate(opt.value, includeComment())
                }
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <div className="ed-section">
          <div className="ed-sl">Execution comment</div>
          <textarea
            className="ed-comment-input"
            placeholder="Add a comment…"
            value={commentDraft}
            disabled={saving || !executable}
            onChange={(e) => onCommentDraftChange(e.target.value)}
          />
          <div className="ed-comment-actions">
            <button
              type="button"
              className="relay-btn relay-btn-primary"
              disabled={saving || !executable || !commentDirty}
              onClick={onSaveComment}
            >
              {saving ? 'Saving…' : 'Save comment'}
            </button>
          </div>
        </div>

        {!canMutate ? (
          <div className="ed-readonly-hint">
            Read-only access — status and comments cannot be changed.
          </div>
        ) : null}
      </div>

      <div className="ed-foot">
        <span className="ed-rl">Case result</span>
        <div className="ed-rbs">
          {STATUS_OPTIONS.filter((o) => o.value !== 'not_run').map((opt) => (
            <button
              key={opt.value}
              type="button"
              className={`rmb ${opt.srb}${isActiveStatus(selectedCase.status, opt.value) ? ' on' : ''}`}
              disabled={saving || !executable}
              onClick={() =>
                onStatusUpdate(opt.value, includeComment())
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}

/** Map UI status back to API when saving comment only. */
export function apiStatusForCase(caseItem: RunDetailCase): CaseResultStatusInput {
  return caseToApiStatus(caseItem.status)
}
