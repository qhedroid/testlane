'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useFresh } from '../data/FreshProvider'
import { CreateProjectModal } from './CreateProjectModal'
import { DEFAULT_PROJECT_KEY, projectPath, switchProjectPath } from '../lib/project-routes'
import { cloneRealProject, DEMO_PROJECT_SLUG, RelayApiError } from '@/lib/relay/project-client'

export function ProjectSwitcher() {
  const {
    activeProject,
    projects,
    setActiveProject,
    updateProject,
    deleteProject,
  } = useFresh()
  const router = useRouter()
  const pathname = usePathname()
  const [open, setOpen] = useState(false)
  const [createOpen, setCreateOpen] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')
  const [cloning, setCloning] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const demoProject = projects.find((p) => p.source === 'real' && p.key === DEMO_PROJECT_SLUG.toUpperCase())

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

  // "Add demo project" (clone-current-project, client-only) is gone — real
  // projects (mvp-backend "wire everything" session) replaced the old
  // client-only demo-project model. `addDemoProject()` itself is left in
  // FreshProvider unused rather than deleted, in case this needs reverting.
  // Its replacement, "Create Demo Project", deep-clones the real seeded Demo
  // Project via POST /api/projects/:id/clone (see ProjectCloneService.ts).
  async function handleCloneDemoProject() {
    if (!demoProject || cloning) return
    setCloning(true)
    close()
    try {
      const cloned = await cloneRealProject(demoProject.id)
      window.location.assign(projectPath(cloned.slug.toUpperCase(), 'dashboard'))
    } catch (err) {
      window.alert(err instanceof RelayApiError ? err.message : 'Failed to create demo project copy.')
      setCloning(false)
    }
  }

  return (
    <>
      <div className="proj-switcher" ref={ref}>
        <button type="button" className="proj-btn" onClick={() => setOpen((v) => !v)}>
          <i className="ti ti-folder" style={{ fontSize: 15, color: 'var(--text3)' }} />
          <span className="pn">{activeProject?.name ?? 'Project'}</span>
          <i className="ti ti-chevron-down" />
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
                    {project.source === 'real' ? null : (
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
                    )}
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
            {demoProject ? (
              <button
                type="button"
                className="proj-action"
                onClick={handleCloneDemoProject}
                disabled={cloning}
                title="Get a fresh copy of the Demo Project — folders, cases, plans, and runs included"
              >
                <i className="ti ti-copy" />
                {cloning ? 'Creating…' : 'Create Demo Project'}
              </button>
            ) : null}
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
