'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFresh } from '../data/FreshProvider'
import { testRunPath } from '../lib/project-routes'

interface CreateRunModalProps {
  open: boolean
  onClose: () => void
}

export function CreateRunModal({ open, onClose }: CreateRunModalProps) {
  const router = useRouter()
  const { activeProject, createRun, activeCases } = useFresh()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  const nameError = !name.trim() ? 'Name is required' : null
  const canSubmit = !nameError && !!name.trim() && activeCases.length > 0

  if (!open) return null

  function reset() {
    setName('')
    setDescription('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSubmit() {
    if (!canSubmit) return
    void createRun({
      name: name.trim(),
      description: description.trim() || undefined,
      caseIds: [],
    }).then((result) => {
      if (result) router.push(testRunPath(activeProject.key, result.runKey))
    })
    handleClose()
  }

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="create-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-hd">
          <div className="shortcuts-title">Create test run</div>
          <button type="button" className="btn" style={{ padding: '2px 6px' }} onClick={handleClose}>
            <i className="ti ti-x" style={{ fontSize: 13 }} />
          </button>
        </div>
        <div className="create-body">
          <div className="form-field">
            <label>Name</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Sprint 45 regression"
              autoFocus
            />
            {nameError && name.trim() === '' ? (
              <span className="form-error">{nameError}</span>
            ) : null}
          </div>
          <div className="form-field">
            <label>Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional run description"
            />
          </div>
          {activeCases.length === 0 && (
            <div style={{ fontSize: 11.5, color: 'var(--text3)', background: 'var(--hover)', borderRadius: 4, padding: '6px 10px' }}>
              This project has no test cases yet. Add test cases before creating a run.
            </div>
          )}
        </div>
        <div className="create-foot">
          <button type="button" className="btn" onClick={handleClose}>Cancel</button>
          <button type="button" className="btn btn-p" disabled={!canSubmit} onClick={handleSubmit}>
            <i className="ti ti-plus" style={{ fontSize: 12 }} /> Create run
          </button>
        </div>
      </div>
    </div>
  )
}
