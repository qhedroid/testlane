'use client'

import { AdminPageShell } from '../AdminPageShell'
import { ADMIN_CUSTOM_FIELDS } from '../admin-seed'
import { AdminCheck, AdminDragHandle, AdminTable } from '../admin-ui'

export function AdminCustomFieldsPageContent() {
  return (
    <AdminPageShell title="Custom fields">
      <button type="button" className="btn btn-p" style={{ marginBottom: 14 }}>+ Add custom field</button>

      <AdminTable>
        <thead>
          <tr>
            <th style={{ width: 32 }} />
            <th>Name</th>
            <th>Type</th>
            <th>Required</th>
            <th>Enabled</th>
            <th>In new projects</th>
            <th>Projects</th>
          </tr>
        </thead>
        <tbody>
          {ADMIN_CUSTOM_FIELDS.map((row) => (
            <tr key={row.name}>
              <td><AdminDragHandle /></td>
              <td>{row.name}</td>
              <td>{row.type}</td>
              <td><AdminCheck value={row.required} /></td>
              <td><AdminCheck value={row.enabled} /></td>
              <td><AdminCheck value={row.inNewProjects} /></td>
              <td>{row.projects}</td>
            </tr>
          ))}
        </tbody>
      </AdminTable>
    </AdminPageShell>
  )
}
