'use client'

import { Plug } from 'lucide-react'
import { AdminPageShell } from '../AdminPageShell'
import {
  ADMIN_CONFIGURED_INTEGRATIONS,
  ADMIN_NATIVE_INTEGRATIONS,
  ADMIN_OTHER_INTEGRATIONS,
  INTEGRATION_COLORS,
} from '../admin-seed'
import { AdminCheck, AdminSection, AdminTable } from '../admin-ui'

function logoAbbr(name: string) {
  return name.split(/[\s(]/)[0].slice(0, 2).toUpperCase()
}

export function AdminIntegrationsPageContent() {
  return (
    <AdminPageShell title="Integrations">
      <AdminSection icon={<Plug size={16} />} title="Configure integrations">
        <div className="admin-sub-hd">Configured integrations</div>
        <AdminTable>
          <thead>
            <tr>
              <th>Type</th>
              <th>Name</th>
              <th>Active</th>
              <th>Projects</th>
              <th>Item types</th>
            </tr>
          </thead>
          <tbody>
            {ADMIN_CONFIGURED_INTEGRATIONS.map((row) => (
              <tr key={row.name}>
                <td>{row.type}</td>
                <td>{row.name}</td>
                <td><AdminCheck value={row.active} /></td>
                <td>{row.projects}</td>
                <td>{row.itemTypes}</td>
              </tr>
            ))}
          </tbody>
        </AdminTable>

        <div className="admin-sub-hd">Available integrations</div>
        <div className="admin-field-lbl" style={{ marginBottom: 8 }}>Native integrations</div>
        <div className="admin-int-grid">
          {ADMIN_NATIVE_INTEGRATIONS.map((name) => (
            <div key={name} className="admin-int-card">
              <div
                className="admin-int-logo"
                style={{ background: INTEGRATION_COLORS[name] ?? '#888' }}
              >
                {logoAbbr(name)}
              </div>
              <div className="admin-int-name">{name}</div>
              <button type="button" className="btn">+ Add integration</button>
            </div>
          ))}
        </div>

        <div className="admin-field-lbl" style={{ marginTop: 20, marginBottom: 8 }}>Other integrations</div>
        <div className="admin-int-list">
          {ADMIN_OTHER_INTEGRATIONS.map((name) => (
            <div key={name} className="admin-int-list-row">
              <div
                className="admin-int-list-logo"
                style={{ background: INTEGRATION_COLORS[name] ?? '#888' }}
              >
                {logoAbbr(name)}
              </div>
              <span className="admin-int-list-name">{name}</span>
              <button type="button" className="btn" style={{ padding: '2px 8px' }}>+</button>
            </div>
          ))}
        </div>
      </AdminSection>
    </AdminPageShell>
  )
}
