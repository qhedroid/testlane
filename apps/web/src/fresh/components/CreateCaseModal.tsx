'use client'

import { useState } from 'react'
import { useFresh } from '../data/FreshProvider'
import type { CasePriority } from '../data/demo-model'
import { newId, TYPE_PLACEHOLDER_TAGS } from '../data/demo-model'
import { TEAM_USERS } from '../data/team-users'
import { useFreshUI } from '../hooks/useFreshUI'

interface StepDraft {
  action: string
  expected: string
}

export function CreateCaseModal() {
  const { createCaseOpen, closeCreateCase } = useFreshUI()
  const { activeFolders, addCase } = useFresh()
  const [title, setTitle] = useState('')
  const [folderId, setFolderId] = useState<string>('')
  const [pri, setPri] = useState<CasePriority>('Medium')
  const [type, setType] = useState<string>(TYPE_PLACEHOLDER_TAGS[0])
  const [precond, setPrecond] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [tagInput, setTagInput] = useState('')
  const [assignee, setAssignee] = useState<string>(TEAM_USERS[1])
  const [steps, setSteps] = useState<StepDraft[]>([{ action: '', expected: '' }])

  if (!createCaseOpen) return null

  function addStep() {
    setSteps((prev) => [...prev, { action: '', expected: '' }])
  }

  function updateStep(idx: number, field: keyof StepDraft, value: string) {
    setSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, [field]: value } : s)))
  }

  function removeStep(idx: number) {
    if (steps.length <= 1) return
    setSteps((prev) => prev.filter((_, i) => i !== idx))
  }

  function submit() {
    const trimmed = title.trim()
    if (!trimmed) return
    const stepData = steps
      .filter((s) => s.action.trim())
      .map((s) => ({
        id: newId('step'),
        action: s.action.trim(),
        expected: s.expected.trim() || 'Expected result documented',
        comments: [],
      }))
    addCase({
      title: trimmed,
      folderId: folderId || null,
      priority: pri,
      type,
      preconditions: precond || '—',
      steps: stepData.length > 0 ? stepData : [{ id: newId('step'), action: 'Execute test steps', expected: 'Expected result documented', comments: [] }],
      generalComments: [],
      tags,
      assignee,
    })
    setTitle('')
    setFolderId('')
    setAssignee(TEAM_USERS[1])
    setPri('Medium')
    setType(TYPE_PLACEHOLDER_TAGS[0])
    setPrecond('')
    setTags([])
    setTagInput('')
    setSteps([{ action: '', expected: '' }])
    closeCreateCase()
  }

  const folderOptions = activeFolders

  return (
    <div className="modal-backdrop" onClick={closeCreateCase}>
      <div className="create-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-hd">
          <div className="shortcuts-title">Create test case</div>
          <button type="button" className="btn" style={{ padding: '2px 6px' }} onClick={closeCreateCase}>
            <i className="ti ti-x" style={{ fontSize: 13 }} />
          </button>
        </div>
        <div className="create-body">
          <div className="form-field">
            <label>Title</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Describe the behavior to validate" />
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
            <div className="form-field">
              <label>Folder</label>
              <select value={folderId} onChange={(e) => setFolderId(e.target.value)}>
                <option value="">Unfiled</option>
                {folderOptions.map((f) => (
                  <option key={f.id} value={f.id}>{f.name}</option>
                ))}
              </select>
            </div>
            <div className="form-field">
              <label>Priority</label>
              <select value={pri} onChange={(e) => setPri(e.target.value as CasePriority)}>
                <option value="Critical">Critical</option>
                <option value="High">High</option>
                <option value="Medium">Medium</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>
          <div className="form-field">
            <label>Type</label>
            <select value={type} onChange={(e) => setType(e.target.value)}>
              {TYPE_PLACEHOLDER_TAGS.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Assigned to</label>
            <select value={assignee} onChange={(e) => setAssignee(e.target.value)}>
              {TEAM_USERS.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label>Preconditions</label>
            <textarea rows={3} value={precond} onChange={(e) => setPrecond(e.target.value)} placeholder="Data, role, tenant, or module setup required" />
          </div>
          <div className="form-field">
            <label>Tags</label>
            <div className="tag-chip-field">
              <input
                className="tag-chip-input"
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault()
                    const trimmed = tagInput.trim()
                    if (!trimmed || tags.includes(trimmed)) return
                    setTags((prev) => [...prev, trimmed])
                    setTagInput('')
                  }
                }}
                placeholder="Type a tag and press Enter…"
              />
              {tags.length > 0 ? (
                <div className="tag-chip-list">
                  {tags.map((t) => (
                    <span key={t} className="tag-chip">
                      {t}
                      <button
                        type="button"
                        className="tag-chip-rm"
                        onClick={() => setTags((prev) => prev.filter((x) => x !== t))}
                        aria-label={`Remove ${t}`}
                      >
                        <i className="ti ti-x" />
                      </button>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          {steps.map((step, idx) => (
            <div key={idx} className="step-draft-block">
              <div className="step-draft-hd">
                <span>Step {idx + 1}</span>
                {steps.length > 1 ? (
                  <button type="button" className="btn" style={{ fontSize: 10, padding: '1px 5px' }} onClick={() => removeStep(idx)}>
                    Remove
                  </button>
                ) : null}
              </div>
              <div className="form-field">
                <label>Action</label>
                <textarea rows={2} value={step.action} onChange={(e) => updateStep(idx, 'action', e.target.value)} placeholder="Action to perform" />
              </div>
              <div className="form-field">
                <label>Expected result</label>
                <textarea rows={2} value={step.expected} onChange={(e) => updateStep(idx, 'expected', e.target.value)} placeholder="Observable result" />
              </div>
            </div>
          ))}
          <button type="button" className="add-step-btn" onClick={addStep}>
            <i className="ti ti-plus" style={{ fontSize: 12 }} /> Add Step
          </button>
        </div>
        <div className="create-foot">
          <button type="button" className="btn" onClick={closeCreateCase}>Cancel</button>
          <button type="button" className="btn btn-p" onClick={submit}>
            <i className="ti ti-plus" style={{ fontSize: 12 }} /> Create case
          </button>
        </div>
      </div>
    </div>
  )
}
