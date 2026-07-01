'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { CreateProjectModal } from '@/fresh/components/CreateProjectModal'
import { useFresh } from '@/fresh/data/FreshProvider'
import { projectPath } from '@/fresh/lib/project-routes'
import { AdminProjectPanel } from '../AdminProjectPanel'
import { AdminPageShell } from '../AdminPageShell'
import { AdminSearchInput, AdminTable, AdminTableFooter, AdminToolbar } from '../admin-ui'

const PAGE_SIZE = 20

export function AdminProjectsPageContent() {
  const { projects } = useFresh()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  const [panelMaximized, setPanelMaximized] = useState(false)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return projects
    return projects.filter(
      (p) => p.name.toLowerCase().includes(q) || p.key.toLowerCase().includes(q),
    )
  }, [projects, search])

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  const selectedProject = selectedProjectId
    ? projects.find((p) => p.id === selectedProjectId) ?? null
    : null

  function handleSearch(v: string) {
    setSearch(v)
    setPage(1)
  }

  function handleRowClick(projectId: string) {
    setSelectedProjectId((prev) => {
      if (prev === projectId) {
        setPanelMaximized(false)
        return null
      }
      if (prev === null) {
        setPanelMaximized(true)
      }
      return projectId
    })
  }

  function handleClosePanel() {
    setSelectedProjectId(null)
    setPanelMaximized(false)
  }

  return (
    <AdminPageShell title="Projects">
      <div className={`admin-projects-layout${selectedProject ? ' panel-open' : ''}${panelMaximized ? ' panel-maximized' : ''}`}>
        <div className="admin-projects-main">
          <AdminToolbar
            left={
              <button type="button" className="btn btn-p admin-btn-fit" onClick={() => setCreateOpen(true)}>
                + Create a new project
              </button>
            }
            right={<AdminSearchInput value={search} onChange={handleSearch} />}
          />

          <AdminTable>
            <thead>
              <tr>
                <th>Name</th>
                <th>Key</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {pageItems.map((p) => (
                <tr
                  key={p.id}
                  className={selectedProjectId === p.id ? 'sel' : ''}
                  onClick={() => handleRowClick(p.id)}
                  style={{ cursor: 'pointer' }}
                >
                  <td onClick={(e) => e.stopPropagation()}>
                    <Link href={projectPath(p.key, 'dashboard')}>{p.name}</Link>
                  </td>
                  <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{p.key}</td>
                  <td className="admin-muted">{p.description ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </AdminTable>

          <AdminTableFooter total={filtered.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />
        </div>

        {selectedProject ? (
          <AdminProjectPanel
            project={selectedProject}
            maximized={panelMaximized}
            onToggleMaximize={() => setPanelMaximized((m) => !m)}
            onClose={handleClosePanel}
          />
        ) : null}
      </div>

      <CreateProjectModal open={createOpen} onClose={() => setCreateOpen(false)} redirectOnCreate={false} />
    </AdminPageShell>
  )
}
