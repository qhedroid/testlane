'use client'

import { useMemo, useState } from 'react'
import { useFresh } from '@/fresh/data/FreshProvider'
import { AdminPageShell } from '../AdminPageShell'
import {
  AdminCheck,
  AdminModal,
  AdminSearchInput,
  AdminTable,
  AdminToolbar,
} from '../admin-ui'

export function AdminRolesPageContent() {
  const { adminSettings, createAdminRole } = useFresh()
  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [nameError, setNameError] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return adminSettings.roles
    return adminSettings.roles.filter((r) => r.name.toLowerCase().includes(q))
  }, [adminSettings.roles, search])

  function handleCreate() {
    if (!name.trim()) {
      setNameError('Name is required')
      return
    }
    createAdminRole({ name: name.trim(), description: description.trim(), isOrgLevel: false })
    setCreateOpen(false)
    setName('')
    setDescription('')
    setNameError('')
  }

  return (
    <AdminPageShell title="Role management">
      <AdminToolbar
        left={<button type="button" className="btn btn-p admin-btn-fit" onClick={() => setCreateOpen(true)}>+ Create</button>}
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
            <tr key={r.id}>
              <td>{r.name}</td>
              <td>{r.description}</td>
              <td>{r.userCount}</td>
              <td><AdminCheck value={r.isOrgLevel} /></td>
              <td><AdminCheck value={r.isBuiltIn} /></td>
            </tr>
          ))}
        </tbody>
      </AdminTable>

      <AdminModal
        open={createOpen}
        title="Create role"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button type="button" className="btn btn-p" onClick={handleCreate}>Create</button>
          </>
        }
      >
        <div className="form-field">
          <label>Name</label>
          <input className="admin-inp" style={{ width: '100%' }} value={name} onChange={(e) => { setName(e.target.value); setNameError('') }} />
          {nameError ? <div className="admin-form-error">{nameError}</div> : null}
        </div>
        <div className="form-field">
          <label>Description</label>
          <textarea className="admin-inp" rows={3} style={{ width: '100%' }} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
      </AdminModal>
    </AdminPageShell>
  )
}
