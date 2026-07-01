'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useFresh } from '../data/FreshProvider'
import { CreateProjectModal } from './CreateProjectModal'
import { DEFAULT_PROJECT_KEY, projectPath, switchProjectPath } from '../lib/project-routes'

export function ProjectSwitcher() {
  const {
    activeProject,
    projects,
    setActiveProject,
    updateProject,
    deleteProject,
    addDemoProject,
  } = useFresh()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
        setRenamingId(null)
        setDraftName('')
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [])

  useEffect(() => {
    if (open && renamingId && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [open, renamingId])

  function close() {
    setOpen(false)
    setRenamingId(null)
    setDraftName('')
  }

  function handleSelect(projectId: string) {
    const project = projects.find((p) => p.id === projectId)
    if (!project) return
    setActiveProject(projectId)
    router.push(switchProjectPath(pathname, project.key))
    close()
  }

  function handleRename(projectId: string) {
    const name = draftName.trim()
    if (!name) return
    updateProject(projectId, { name })
    close()
  }

  function handleDelete(projectId: string, projectName: string) {
    const msg =
      projects.length <= 1
        ? `Delete "${projectName}"? A new default project will be created because at least one project must exist.`
        : `Delete "${projectName}" and all its folders, cases, and runs? This cannot be undone.`
    if (!window.confirm(msg)) return
    const remaining = projects.filter((p) => p.id !== projectId)
    const wasActive = projectId === activeProject?.id
    deleteProject(projectId)
    close()
    if (wasActive) {
      router.push(switchProjectPath(pathname, remaining[0]?.key ?? DEFAULT_PROJECT_KEY))
    }
  }

  function startRename(projectId: string, currentName: string) {
    setRenamingId(projectId)
    setDraftName(currentName)
  }

  function handleAddDemoProject() {
    const { key } = addDemoProject()
    close()
    router.push(projectPath(key, 'dashboard'))
  }

  return (
    <>
      <div className="proj-switcher" ref={ref}>
        <button type="button" className="proj-btn" onClick={() => setOpen((v) => !v)}>
          <i className="ti ti-apps" style={{ fontSize: 14, color: 'var(--accent)' }} />
          <span className="pn">{activeProject?.name ?? 'Project'}</span>
          <i className="ti ti-chevron-down" style={{ fontSize: 10, opacity: 0.5 }} />
        </button>
        {open ? (
          <div className="proj-dd open">
            <div className="proj-dd-hd">Switch project</div>
            {projects.map((project) => (
              <div key={project.id} className="proj-row">
                {renamingId === project.id ? (
                  <div className="proj-form" style={{ flex: 1 }}>
                    <input
                      ref={inputRef}
                      className="proj-form-input"
                      value={draftName}
                      onChange={(e) => setDraftName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleRename(project.id)
                        if (e.key === 'Escape') close()
                      }}
                    />
                    <div className="proj-form-actions">
                      <button type="button" className="proj-form-btn" onClick={close}>Cancel</button>
                      <button type="button" className="proj-form-btn primary" onClick={() => handleRename(project.id)}>Save</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <button
                      type="button"
                      className={`proj-item${project.id === activeProject?.id ? ' active' : ''}`}
                      onClick={() => handleSelect(project.id)}
                    >
                      <i className={`ti ${project.id === activeProject?.id ? 'ti-check' : 'ti-square'}`} />
                      <span className="proj-item-name">{project.name}</span>
                    </button>
                    <div className="proj-row-actions">
                      <button
                        type="button"
                        className="proj-icon-btn"
                        title="Rename project"
                        onClick={(e) => { e.stopPropagation(); startRename(project.id, project.name) }}
                      >
                        <i className="ti ti-pencil" />
                      </button>
                      <button
                        type="button"
                        className="proj-icon-btn danger"
                        title="Delete project"
                        onClick={(e) => { e.stopPropagation(); handleDelete(project.id, project.name) }}
                      >
                        <i className="ti ti-trash" />
                      </button>
                    </div>
                  </>
                )}
              </div>
            ))}
            <div className="proj-divider" />
            <button
              type="button"
              className="proj-action"
              onClick={() => { setCreateOpen(true); close() }}
            >
              <i className="ti ti-plus" />
              Create project…
            </button>
            <button type="button" className="proj-action" onClick={handleAddDemoProject}>
              <i className="ti ti-copy" />
              Add demo project
            </button>
            <button type="button" className="proj-action muted" disabled title="Coming soon">
              <i className="ti ti-settings" />
              Project settings
            </button>
          </div>
        ) : null}
      </div>
      <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} />
    </>
  )
}
