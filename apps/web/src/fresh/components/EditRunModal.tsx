'use client'

import { useCallback, useEffect, useState } from 'react'
import type { DemoRun } from '../data/demo-model'
import { useFresh } from '../data/FreshProvider'

interface EditRunModalProps {
  open: boolean
  run: DemoRun | undefined
  onClose: () => void
}

function parseDueForInput(due: string | undefined): string {
  if (!due) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(due)) return due
  return ''
}

export function EditRunModal({ open, run, onClose }: EditRunModalProps) {
  const { editRun } = useFresh()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [due, setDue] = useState('')

  useEffect(() => {
    if (!open || !run) return
    setName(run.name)
    setDescription(run.description ?? '')
    setDue(parseDueForInput(run.due))
  }, [open, run])

  const nameError = !name.trim() ? 'Name is required' : null
  const canSubmit = !nameError && !!name.trim()

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  const handleSubmit = useCallback(() => {
    if (!canSubmit || !run) return
    editRun(run.id, {
      name: name.trim(),
      description: description.trim() || undefined,
      due: due || undefined,
    })
    handleClose()
  }, [canSubmit, run, editRun, name, description, due, handleClose])

  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
      if (e.key === 'Enter' && !(e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault()
        handleSubmit()
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, handleClose, handleSubmit])

  if (!open || !run) return null

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="create-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-hd">
          <div className="shortcuts-title">Edit test run</div>
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
          <div className="form-field">
            <label>Due date</label>
            <input
              type="date"
              value={due}
              onChange={(e) => setDue(e.target.value)}
            />
          </div>
        </div>
        <div className="create-foot">
          <button type="button" className="btn" onClick={handleClose}>Cancel</button>
          <button type="button" className="btn btn-p" disabled={!canSubmit} onClick={handleSubmit}>
            Save changes
          </button>
        </div>
      </div>
    </div>
  )
}
