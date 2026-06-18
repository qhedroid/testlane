'use client'

import { useMemo, useState } from 'react'
import { AdminPageShell } from '../AdminPageShell'
import { ADMIN_ROLES } from '../admin-seed'
import { AdminCheck, AdminSearchInput, AdminTable, AdminToolbar } from '../admin-ui'

export function AdminRolesPageContent() {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return ADMIN_ROLES
    return ADMIN_ROLES.filter((r) => r.name.toLowerCase().includes(q))
  }, [search])

  return (
    <AdminPageShell title="Role management">
      <AdminToolbar
        left={<button type="button" className="btn btn-p">+ Create</button>}
        right={<AdminSearchInput value={search} onChange={setSearch} placeholder="Search" />}
      />

      <AdminTable>
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Users</th>
            <th>Organization</th>
            <th>Built-in</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.name}>
              <td>{r.name}</td>
              <td>{r.description}</td>
              <td>{r.users}</td>
              <td><AdminCheck value={r.organization} /></td>
              <td><AdminCheck value={r.builtIn} /></td>
            </tr>
          ))}
        </tbody>
      </AdminTable>
    </AdminPageShell>
  )
}
