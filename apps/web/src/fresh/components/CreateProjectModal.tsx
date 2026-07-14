'use client'

import { useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useFresh } from '../data/FreshProvider'
import { normalizeProjectKeyInput, validateProjectKey } from '../lib/project-keys'
import { projectPath } from '../lib/project-routes'
import { createRealProject, RelayApiError } from '@/lib/relay/project-client'

interface CreateProjectModalProps {
  open: boolean
  onClose: () => void
  redirectOnCreate?: boolean
}

// Calls the real POST /api/projects (mvp-backend "wire everything" session —
// replaces the old local-only createProject() dispatch). The Key field here
// doubles as the real project's `slug` (lowercased) and, uppercased, as the
// fresh app's routing key — same value, two representations, per
// project-routes.ts's convention.
export function CreateProjectModal({ open, onClose, redirectOnCreate = true }: CreateProjectModalProps) {
  const router = useRouter()
  const { isProjectKeyUnique } = useFresh()
  const [name, setName] = useState('')
  const [key, setKey] = useState('')
  const [description, setDescription] = useState('')
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const keyError = useMemo(() => {
    const formatError = validateProjectKey(key)
    if (formatError) return formatError
    if (!isProjectKeyUnique(key)) return 'Key is already in use'
    return null
  }, [key, isProjectKeyUnique])

  const nameError = !name.trim() ? 'Name is required' : null
  const canSubmit = !nameError && !keyError && !!name.trim() && !!key.trim() && !submitting

  if (!open) return null

  function reset() {
    setName('')
    setKey('')
    setDescription('')
    setSubmitError(null)
    setSubmitting(false)
  }

  function handleClose() {
    reset()
    onClose()
  }

  async function handleSubmit() {
    if (!canSubmit) return
    const trimmedName = name.trim()
    const trimmedKey = key.trim().toUpperCase()
    const trimmedDescription = description.trim()
    setSubmitError(null)
    setSubmitting(true)
    try {
      await createRealProject({
        slug: trimmedKey.toLowerCase(),
        name: trimmedName,
        description: trimmedDescription || undefined,
      })
      // Full reload (not router.push) so FreshProvider remounts and its
      // REGISTER_REAL_PROJECTS effect re-fetches /api/projects, picking up
      // the project we just created.
      const target = redirectOnCreate ? projectPath(trimmedKey, 'dashboard') : window.location.pathname
      window.location.assign(target)
    } catch (err) {
      setSubmitError(err instanceof RelayApiError ? err.message : 'Failed to create project.')
      setSubmitting(false)
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
          {submitError ? <span className="form-error">{submitError}</span> : null}
        </div>
        <div className="create-foot">
          <button type="button" className="btn" onClick={handleClose}>Cancel</button>
          <button type="button" className="btn btn-p" disabled={!canSubmit} onClick={handleSubmit}>
            <i className="ti ti-plus" style={{ fontSize: 12 }} /> {submitting ? 'Creating…' : 'Create project'}
          </button>
        </div>
      </div>
    </div>
  )
}
