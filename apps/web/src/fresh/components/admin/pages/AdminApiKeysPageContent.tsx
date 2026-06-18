'use client'

import { Key, List, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import { expirationLabel } from '@/fresh/data/admin-utils'
import { useFresh } from '@/fresh/data/FreshProvider'
import { AdminPageShell } from '../AdminPageShell'
import { AdminSection, AdminTable, formatTodayKey } from '../admin-ui'

export function AdminApiKeysPageContent() {
  const { projects, adminSettings, createAdminApiKey, deleteAdminApiKey } = useFresh()
  const [name, setName] = useState(`api-key-${formatTodayKey()}`)
  const [project, setProject] = useState('all')
  const [expiration, setExpiration] = useState('none')
  const [limitPerms, setLimitPerms] = useState(false)
  const [nameError, setNameError] = useState('')

  const sortedKeys = useMemo(
    () => [...adminSettings.apiKeys].sort((a, b) => b.createdAt - a.createdAt),
    [adminSettings.apiKeys],
  )

  const userNameById = useMemo(() => {
    const map = new Map(adminSettings.users.map((u) => [u.id, u.name]))
    return (id: string) => map.get(id) ?? 'Demo User'
  }, [adminSettings.users])

  function resetForm() {
    setName(`api-key-${formatTodayKey()}`)
    setProject('all')
    setExpiration('none')
    setLimitPerms(false)
    setNameError('')
  }

  function handleCreate() {
    if (!name.trim()) {
      setNameError('Name is required')
      return
    }
    const projectLabel = project === 'all' ? 'All Projects' : project
    createAdminApiKey({
      name: name.trim(),
      project: projectLabel,
      permissions: limitPerms ? 'limited' : 'comment, manage…',
      expiration: expirationLabel(expiration),
    })
    resetForm()
  }

  function handleDelete(id: string, keyName: string) {
    if (!window.confirm(`Delete API key "${keyName}"?`)) return
    deleteAdminApiKey(id)
  }

  return (
    <AdminPageShell title="API keys">
      <AdminSection icon={<Key size={16} />} title="Create API keys">
        <div className="admin-select-field">
          <span className="admin-select-lbl">Name of API key</span>
          <input className="admin-inp" value={name} onChange={(e) => { setName(e.target.value); setNameError('') }} />
          {nameError ? <div className="admin-form-error">{nameError}</div> : null}
        </div>
        <div className="admin-select-field">
          <span className="admin-select-lbl">Project</span>
          <select className="admin-select admin-select-fixed" value={project} onChange={(e) => setProject(e.target.value)}>
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.key}>{p.name} ({p.key})</option>
            ))}
          </select>
        </div>
        <div className="admin-select-field">
          <span className="admin-select-lbl">Expiration</span>
          <select className="admin-select admin-select-fixed" value={expiration} onChange={(e) => setExpiration(e.target.value)}>
            <option value="none">No expiration</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="365">1 year</option>
          </select>
        </div>
        <label className="admin-checkbox-row">
          <input type="checkbox" checked={limitPerms} onChange={(e) => setLimitPerms(e.target.checked)} />
          Limit API key permissions
        </label>
        <button type="button" className="btn btn-p admin-btn-fit" onClick={handleCreate}>Create</button>
        <p className="admin-desc">
          You can find the Relay API documentation <a href="#" className="admin-link">here</a>.
        </p>
      </AdminSection>

      <AdminSection icon={<List size={16} />} title="Manage API keys">
        <AdminTable>
          <thead>
            <tr>
              <th>User</th>
              <th>Name</th>
              <th>API key</th>
              <th>Project</th>
              <th>Permissions</th>
              <th>Expiration</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sortedKeys.map((row) => (
              <tr key={row.id}>
                <td>{userNameById(row.userId)}</td>
                <td>{row.name}</td>
                <td style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{row.maskedKey}</td>
                <td>{row.project}</td>
                <td>{row.permissions}</td>
                <td>{row.expiration}</td>
                <td>
                  <button type="button" className="admin-icon-btn" title="Delete" onClick={() => handleDelete(row.id, row.name)}>
                    <Trash2 size={13} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      </AdminSection>
    </AdminPageShell>
  )
}
