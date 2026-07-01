'use client'

import { useState } from 'react'
import type { AdminCustomField } from '@/fresh/data/demo-model'
import { useFresh } from '@/fresh/data/FreshProvider'
import { AdminPageShell } from '../AdminPageShell'
import { AdminCheck, AdminDragHandle, AdminModal, AdminTable } from '../admin-ui'
import { Trash2 } from 'lucide-react'

const FIELD_TYPES: AdminCustomField['type'][] = [
  'Text', 'Multi-Line Text', 'Number (integer)', 'Boolean', 'Multi-Select', 'Date & Time',
]

export function AdminCustomFieldsPageContent() {
  const { adminSettings, addAdminCustomField, deleteAdminCustomField } = useFresh()
  const [open, setOpen] = useState(false)
  const [name, setName] = useState('')
  const [type, setType] = useState<AdminCustomField['type']>('Text')
  const [required, setRequired] = useState(false)
  const [enabled, setEnabled] = useState(true)
  const [inNewProjects, setInNewProjects] = useState(false)
  const [nameError, setNameError] = useState('')

  function handleAdd() {
    if (!name.trim()) {
      setNameError('Name is required')
      return
    }
    addAdminCustomField({
      name: name.trim(),
      type,
      required,
      enabled,
      inNewProjects,
      projects: 'All',
    })
    setOpen(false)
    setName('')
    setType('Text')
    setRequired(false)
    setEnabled(true)
    setInNewProjects(false)
    setNameError('')
  }

  function handleDelete(id: string, fieldName: string) {
    if (!window.confirm(`Delete custom field "${fieldName}"?`)) return
    deleteAdminCustomField(id)
  }

  return (
    <AdminPageShell title="Custom fields">
      <button type="button" className="btn btn-p admin-btn-fit" style={{ marginBottom: 14 }} onClick={() => setOpen(true)}>
        + Add custom field
      </button>

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
            <th />
          </tr>
        </thead>
        <tbody>
          {adminSettings.customFields.map((row) => (
            <tr key={row.id}>
              <td><AdminDragHandle /></td>
              <td>{row.name}</td>
              <td>{row.type}</td>
              <td><AdminCheck value={row.required} /></td>
              <td><AdminCheck value={row.enabled} /></td>
              <td><AdminCheck value={row.inNewProjects} /></td>
              <td>{row.projects}</td>
              <td>
                <button type="button" className="admin-icon-btn" title="Delete" onClick={() => handleDelete(row.id, row.name)}>
                  <Trash2 size={13} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </AdminTable>

      <AdminModal
        open={open}
        title="Add custom field"
        onClose={() => setOpen(false)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setOpen(false)}>Cancel</button>
            <button type="button" className="btn btn-p" onClick={handleAdd}>Add</button>
          </>
        }
      >
        <div className="form-field">
          <label>Name</label>
          <input className="admin-inp" style={{ width: '100%' }} value={name} onChange={(e) => { setName(e.target.value); setNameError('') }} />
          {nameError ? <div className="admin-form-error">{nameError}</div> : null}
        </div>
        <div className="form-field">
          <label>Type</label>
          <select className="admin-select admin-select-fixed" value={type} onChange={(e) => setType(e.target.value as AdminCustomField['type'])}>
            {FIELD_TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <label className="admin-checkbox-row"><input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} /> Required</label>
        <label className="admin-checkbox-row"><input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} /> Enabled</label>
        <label className="admin-checkbox-row"><input type="checkbox" checked={inNewProjects} onChange={(e) => setInNewProjects(e.target.checked)} /> In new projects</label>
      </AdminModal>
    </AdminPageShell>
  )
}
