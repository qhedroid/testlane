'use client'

import { useEffect, useMemo, useState } from 'react'
import { useFresh } from '../data/FreshProvider'
import type { Folder } from '../data/demo-model'

export type MoveCopySubject =
  | { kind: 'cases'; caseIds: string[] }
  | { kind: 'folder'; folderId: string }

interface MoveCopyDialogProps {
  open: boolean
  subject: MoveCopySubject | null
  initialMode?: 'move' | 'copy'
  onClose: () => void
  /** Called after a successful move/copy so callers can clear selection. */
  onDone?: () => void
}

interface DestOption {
  key: string
  label: string
  depth: number
  projectId: string
  folderId: string | null
  otherProject: boolean
}

export function MoveCopyDialog({ open, subject, initialMode = 'move', onClose, onDone }: MoveCopyDialogProps) {
  const { state, activeProject, projects, moveCases, copyCases, moveFolder, copyFolder } = useFresh()
  const [mode, setMode] = useState<'move' | 'copy'>(initialMode)
  const [destKey, setDestKey] = useState<string | null>(null)
  const [keepTags, setKeepTags] = useState(true)
  const [keepRequirements, setKeepRequirements] = useState(true)

  useEffect(() => {
    if (!open) return
    setMode(initialMode)
    setDestKey(null)
    setKeepTags(true)
    setKeepRequirements(true)
  }, [open, initialMode])

  const isFolderSubject = subject?.kind === 'folder'
  const excludedFolderIds = useMemo(() => {
    // Moving a folder into itself/descendants is invalid — exclude that subtree.
    if (!subject || subject.kind !== 'folder') return new Set<string>()
    const ids = new Set<string>([subject.folderId])
    let changed = true
    while (changed) {
      changed = false
      for (const f of state.folders) {
        if (f.parentId && ids.has(f.parentId) && !ids.has(f.id)) {
          ids.add(f.id)
          changed = true
        }
      }
    }
    return ids
  }, [subject, state.folders])

  const options = useMemo<DestOption[]>(() => {
    const result: DestOption[] = []
    const addFolderTree = (projectId: string, parentId: string | null, depth: number, otherProject: boolean) => {
      const children = state.folders
        .filter((f) => f.projectId === projectId && (f.parentId ?? null) === parentId && !f.archivedAt)
        .sort((a, b) => a.name.localeCompare(b.name))
      for (const f of children) {
        if (excludedFolderIds.has(f.id)) continue
        result.push({
          key: `${projectId}:${f.id}`,
          label: f.name,
          depth,
          projectId,
          folderId: f.id,
          otherProject,
        })
        addFolderTree(projectId, f.id, depth + 1, otherProject)
      }
    }
    result.push({
      key: `${activeProject.id}:__root__`,
      label: `${activeProject.name} (project root / unfiled)`,
      depth: 0,
      projectId: activeProject.id,
      folderId: null,
      otherProject: false,
    })
    addFolderTree(activeProject.id, null, 1, false)
    for (const p of projects) {
      if (p.id === activeProject.id) continue
      result.push({
        key: `${p.id}:__root__`,
        label: `${p.name} (${p.key}) — other project`,
        depth: 0,
        projectId: p.id,
        folderId: null,
        otherProject: true,
      })
    }
    return result
  }, [state.folders, activeProject, projects, excludedFolderIds])

  if (!open || !subject) return null

  const dest = options.find((o) => o.key === destKey) ?? null
  const subjectCount = subject.kind === 'cases' ? subject.caseIds.length : 1
  const subjectLabel =
    subject.kind === 'cases'
      ? `${subject.caseIds.length} case${subject.caseIds.length === 1 ? '' : 's'}`
      : `folder “${state.folders.find((f) => f.id === subject.folderId)?.name ?? ''}”`

  const crossProject = !!dest?.otherProject
  const moveBlocked = mode === 'move' && crossProject
  const folderCrossBlocked = isFolderSubject && crossProject
  const canSubmit = !!dest && !moveBlocked && !folderCrossBlocked && subjectCount > 0

  function handleSubmit() {
    if (!dest || !subject || !canSubmit) return
    if (subject.kind === 'cases') {
      if (mode === 'move') {
        moveCases(subject.caseIds, dest.folderId)
      } else {
        copyCases({
          caseIds: subject.caseIds,
          targetProjectId: dest.projectId,
          targetFolderId: dest.folderId,
          keepTags,
          keepRequirements: keepRequirements && !crossProject,
        })
      }
    } else {
      if (mode === 'move') moveFolder(subject.folderId, dest.folderId)
      else copyFolder(subject.folderId, dest.folderId)
    }
    onDone?.()
    onClose()
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="create-dialog" style={{ width: 480, maxWidth: '94vw' }} onClick={(e) => e.stopPropagation()}>
        <div className="shortcuts-hd">
          <div className="shortcuts-title">
            {mode === 'move' ? 'Move' : 'Copy'} {subjectLabel}
          </div>
          <button type="button" className="btn" style={{ padding: '2px 6px' }} onClick={onClose}>
            <i className="ti ti-x" style={{ fontSize: 13 }} />
          </button>
        </div>
        <div className="create-body" style={{ maxHeight: '64vh', overflowY: 'auto' }}>
          <div className="exd-seg" style={{ marginBottom: 4 }}>
            <button type="button" className={`exd-seg-btn${mode === 'move' ? ' on' : ''}`} onClick={() => setMode('move')}>
              Move
            </button>
            <button type="button" className={`exd-seg-btn${mode === 'copy' ? ' on' : ''}`} onClick={() => setMode('copy')}>
              Copy
            </button>
          </div>

          <div className="form-field">
            <label>Destination</label>
            <div className="mcd-tree">
              {options.map((o) => {
                const disabled = (mode === 'move' && o.otherProject) || (isFolderSubject && o.otherProject)
                return (
                  <label
                    key={o.key}
                    className={`mcd-row${destKey === o.key ? ' on' : ''}${disabled ? ' disabled' : ''}`}
                    style={{ paddingLeft: 8 + o.depth * 16 }}
                    title={disabled ? 'Cross-project moves are disabled in this MVP — use Copy for cases' : undefined}
                  >
                    <input
                      type="radio"
                      name="mcd-dest"
                      disabled={disabled}
                      checked={destKey === o.key}
                      onChange={() => setDestKey(o.key)}
                    />
                    <i className={`ti ${o.folderId ? 'ti-folder' : 'ti-stack'}`} style={{ fontSize: 11, color: 'var(--text3)' }} />
                    <span>{o.label}</span>
                  </label>
                )
              })}
            </div>
          </div>

          {subject.kind === 'cases' && mode === 'copy' ? (
            <div className="form-field">
              <label>Options</label>
              <label className="exd-check">
                <input type="checkbox" checked={keepTags} onChange={(e) => setKeepTags(e.target.checked)} />
                <span>Keep tags</span>
              </label>
              <label className={`exd-check${crossProject ? ' exd-disabled' : ''}`}>
                <input
                  type="checkbox"
                  disabled={crossProject}
                  checked={keepRequirements && !crossProject}
                  onChange={(e) => setKeepRequirements(e.target.checked)}
                />
                <span>Keep linked requirements{crossProject ? ' (requirements are project-scoped — dropped on cross-project copy)' : ''}</span>
              </label>
              <label className="exd-check exd-disabled" title="Run history is keyed to the original case ids — copies start with no history in this prototype">
                <input type="checkbox" disabled />
                <span>Keep run history — <em>not supported in prototype</em></span>
              </label>
            </div>
          ) : null}

          <div className="mcd-warn">
            <i className="ti ti-alert-triangle" style={{ fontSize: 12, flexShrink: 0, marginTop: 1 }} />
            <span>
              Cross-project <strong>moves</strong> are disabled in this MVP — copy only. Moved cases would receive new
              project-scoped IDs and drop their links to this project's runs.
              {isFolderSubject ? ' Folders can be moved/copied within this project only.' : ''}
            </span>
          </div>
        </div>
        <div className="create-foot">
          <button type="button" className="btn" onClick={onClose}>Cancel</button>
          <button type="button" className="btn btn-p" disabled={!canSubmit} onClick={handleSubmit}>
            {mode === 'move' ? 'Move' : 'Copy'} {subject.kind === 'cases' ? `${subjectCount} case${subjectCount === 1 ? '' : 's'}` : 'folder'}
            {dest ? ` to ${dest.folderId ? dest.label : 'project root'}` : ''}
          </button>
        </div>
      </div>
    </div>
  )
}
