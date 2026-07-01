'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFresh } from '../data/FreshProvider'
import { normalizeProjectKeyInput, validateProjectKey } from '../lib/project-keys'
import { projectPath } from '../lib/project-routes'

interface CreateProjectModalProps {
  open: boolean
  onClose: () => void
  redirectOnCreate?: boolean
}

export function CreateProjectModal({ open, onClose, redirectOnCreate = true }: CreateProjectModalProps) {
  const router = useRouter()
  const { createProject, isProjectKeyUnique } = useFresh()
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [description, setDescription] = useState('')

  const keyError = useMemo(() => {
    const formatError = validateProjectKey(key)
    if (formatError) return formatError
    if (!isProjectKeyUnique(key)) return 'Key is already in use'
    return null
  }, [key, isProjectKeyUnique])

  const nameError = !name.trim() ? 'Name is required' : null
  const canSubmit = !nameError && !keyError && !!name.trim() && !!key.trim()

  if (!open) return null

  function reset() {
    setName('')
    setKey('')
    setDescription('')
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSubmit() {
    if (!canSubmit) return
    const trimmedName = name.trim()
    const trimmedKey = key.trim().toUpperCase()
    const trimmedDescription = description.trim()
    createProject({
      name: trimmedName,
      key: trimmedKey,
      description: trimmedDescription || undefined,
    })
    handleClose()
    if (redirectOnCreate) {
      router.push(projectPath(trimmedKey, 'dashboard'))
    }
  }

  return (
    <div className="modal-backdrop" onClick={handleClose}>
      <div className="create-dialog" onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-hd">
          <div className="shortcuts-title">Create project</div>
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
              placeholder="e.g. CTMS QA"
              autoFocus
            />
            {nameError && name.trim() === '' ? (
              <span className="form-error">{nameError}</span>
            ) : null}
          </div>
          <div className="form-field">
            <label>Key</label>
            <input
              value={key}
              onChange={(e) => setKey(normalizeProjectKeyInput(e.target.value))}
              placeholder="e.g. CTMS"
            />
            {keyError ? <span className="form-error">{keyError}</span> : null}
            <span className="form-hint">Uppercase letters, numbers, hyphens, and underscores only</span>
          </div>
          <div className="form-field">
            <label>Description</label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional workspace description"
            />
          </div>
        </div>
        <div className="create-foot">
          <button type="button" className="btn" onClick={handleClose}>Cancel</button>
          <button type="button" className="btn btn-p" disabled={!canSubmit} onClick={handleSubmit}>
            <i className="ti ti-plus" style={{ fontSize: 12 }} /> Create project
          </button>
        </div>
      </div>
    </div>
  )
}
