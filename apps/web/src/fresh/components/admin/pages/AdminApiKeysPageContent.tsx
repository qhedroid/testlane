'use client'

import { Key, List } from 'lucide-react'
import { useState } from 'react'
import { useFresh } from '@/fresh/data/FreshProvider'
import { AdminPageShell } from '../AdminPageShell'
import { ADMIN_API_KEYS } from '../admin-seed'
import { AdminSection, AdminTable, formatTodayKey } from '../admin-ui'

export function AdminApiKeysPageContent() {
  const { projects } = useFresh()
  const [name, setName] = useState(`api-key-${formatTodayKey()}`)
  const [project, setProject] = useState('all')
  const [expiration, setExpiration] = useState('none')
  const [limitPerms, setLimitPerms] = useState(false)

  return (
    <AdminPageShell title="API keys">
      <AdminSection icon={<Key size={16} />} title="Create API keys">
        <div className="admin-select-field">
          <span className="admin-select-lbl">Name of API key</span>
          <input className="admin-inp" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="admin-select-field">
          <span className="admin-select-lbl">Project</span>
          <select className="admin-select" value={project} onChange={(e) => setProject(e.target.value)}>
            <option value="all">All Projects</option>
            {projects.map((p) => (
              <option key={p.id} value={p.key}>{p.name} ({p.key})</option>
            ))}
          </select>
        </div>
        <div className="admin-select-field">
          <span className="admin-select-lbl">Expiration</span>
          <select className="admin-select" value={expiration} onChange={(e) => setExpiration(e.target.value)}>
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
        <button type="button" className="btn btn-p">Create</button>
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
            </tr>
          </thead>
          <tbody>
            {ADMIN_API_KEYS.map((row) => (
              <tr key={row.name}>
                <td>{row.user}</td>
                <td>{row.name}</td>
                <td className="mono" style={{ fontFamily: 'var(--mono)', fontSize: 11 }}>{row.apiKey}</td>
                <td>{row.project}</td>
                <td>{row.permissions}</td>
                <td>{row.expiration}</td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
      </AdminSection>
    </AdminPageShell>
  )
}
