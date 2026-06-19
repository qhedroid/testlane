'use client'

import { Bot, Database, List, Pencil, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import type { AdminAutomationField, AdminAutomationSource } from '@/fresh/data/demo-model'
import { useFresh } from '@/fresh/data/FreshProvider'
import { AdminPageShell } from '../AdminPageShell'
import {
  AdminModal,
  AdminSearchInput,
  AdminSection,
  AdminTable,
  AdminTableFooter,
  AdminToolbar,
  useSavedFeedback,
} from '../admin-ui'

export function AdminAutomationPageContent() {
  const {
    adminSettings,
    saveAdminAutomationRetention,
    updateAdminAutomationSource,
    deleteAdminAutomationSource,
    updateAdminAutomationField,
    deleteAdminAutomationField,
  } = useFresh()
  const { saved, showSaved } = useSavedFeedback()
  const [retention, setRetention] = useState(adminSettings.automation.retentionPeriod)
  const [sourceSearch, setSourceSearch] = useState('')
  const [fieldSearch, setFieldSearch] = useState('')
  const [editSource, setEditSource] = useState<AdminAutomationSource | null>(null)
  const [editField, setEditField] = useState<AdminAutomationField | null>(null)

  const sources = useMemo(() => {
    const q = sourceSearch.trim().toLowerCase()
    if (!q) return adminSettings.automation.sources
    return adminSettings.automation.sources.filter((s) => s.name.toLowerCase().includes(q))
  }, [adminSettings.automation.sources, sourceSearch])

  const fields = useMemo(() => {
    const q = fieldSearch.trim().toLowerCase()
    if (!q) return adminSettings.automation.fields
    return adminSettings.automation.fields.filter(
      (f) => f.name.toLowerCase().includes(q) || f.displayName.toLowerCase().includes(q),
    )
  }, [adminSettings.automation.fields, fieldSearch])

  function handleSaveRetention() {
    saveAdminAutomationRetention(retention)
    showSaved()
  }

  return (
    <AdminPageShell title="Automation">
      <AdminSection icon={<Bot size={16} />} title="General">
        <p className="admin-desc">
          Automated runs older than the retention period will be automatically deleted. Can be overridden per source.
        </p>
        <div className="admin-select-field">
          <span className="admin-select-lbl">Retention period</span>
          <select className="admin-select admin-select-fixed" value={retention} onChange={(e) => setRetention(e.target.value)}>
            <option>30 days</option>
            <option>60 days</option>
            <option>90 days</option>
            <option>1 year</option>
          </select>
        </div>
        <div className="admin-inline-actions">
          {saved ? <span className="admin-saved">Saved</span> : null}
          <button type="button" className="btn btn-p admin-btn-fit" onClick={handleSaveRetention}>Save</button>
          <button type="button" className="btn admin-btn-fit" onClick={() => setRetention(adminSettings.automation.retentionPeriod)}>Cancel</button>
        </div>
      </AdminSection>

      <AdminSection icon={<Database size={16} />} title="Sources">
        <AdminToolbar
          left={null}
          right={
            <>
              <AdminSearchInput value={sourceSearch} onChange={setSourceSearch} placeholder="Search" />
              <button type="button" className="btn admin-btn-fit">Filter</button>
            </>
          }
        />
        <AdminTable>
          <thead>
            <tr>
              <th>Name</th>
              <th>Display name</th>
              <th>Project</th>
              <th>Retention period</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {sources.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.displayName || '—'}</td>
                <td>{row.project}</td>
                <td>{row.retentionPeriod}</td>
                <td>
                  <span className="admin-row-actions">
                    <button type="button" className="admin-icon-btn" title="Edit" onClick={() => setEditSource({ ...row })}>
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      className="admin-icon-btn"
                      title="Delete"
                      onClick={() => {
                        if (window.confirm(`Delete automation source "${row.name}"?`)) deleteAdminAutomationSource(row.id)
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
        <AdminTableFooter total={sources.length} page={1} pageSize={sources.length} showPerPage />
      </AdminSection>

      <AdminSection icon={<List size={16} />} title="Fields">
        <AdminToolbar
          left={null}
          right={
            <>
              <AdminSearchInput value={fieldSearch} onChange={setFieldSearch} placeholder="Search" />
              <button type="button" className="btn admin-btn-fit">Filter</button>
            </>
          }
        />
        <AdminTable>
          <thead>
            <tr>
              <th>Name</th>
              <th>Display name</th>
              <th>Projects</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {fields.map((row) => (
              <tr key={row.id}>
                <td>{row.name}</td>
                <td>{row.displayName}</td>
                <td>{row.projects}</td>
                <td>
                  <span className="admin-row-actions">
                    <button type="button" className="admin-icon-btn" title="Edit" onClick={() => setEditField({ ...row })}>
                      <Pencil size={13} />
                    </button>
                    <button
                      type="button"
                      className="admin-icon-btn"
                      title="Delete"
                      onClick={() => {
                        if (window.confirm(`Delete automation field "${row.name}"?`)) deleteAdminAutomationField(row.id)
                      }}
                    >
                      <Trash2 size={13} />
                    </button>
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
        <AdminTableFooter total={fields.length} page={1} pageSize={fields.length} showPerPage />
      </AdminSection>

      <AdminModal
        open={!!editSource}
        title="Edit automation source"
        onClose={() => setEditSource(null)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setEditSource(null)}>Cancel</button>
            <button
              type="button"
              className="btn btn-p"
              onClick={() => {
                if (editSource) updateAdminAutomationSource(editSource)
                setEditSource(null)
              }}
            >
              Save
            </button>
          </>
        }
      >
        {editSource ? (
          <>
            <div className="form-field">
              <label>Display name</label>
              <input
                className="admin-inp"
                style={{ width: '100%' }}
                value={editSource.displayName}
                onChange={(e) => setEditSource({ ...editSource, displayName: e.target.value })}
              />
            </div>
            <div className="form-field">
              <label>Retention period</label>
              <input
                className="admin-inp"
                style={{ width: '100%' }}
                value={editSource.retentionPeriod}
                onChange={(e) => setEditSource({ ...editSource, retentionPeriod: e.target.value })}
              />
            </div>
          </>
        ) : null}
      </AdminModal>

      <AdminModal
        open={!!editField}
        title="Edit automation field"
        onClose={() => setEditField(null)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setEditField(null)}>Cancel</button>
            <button
              type="button"
              className="btn btn-p"
              onClick={() => {
                if (editField) updateAdminAutomationField(editField)
                setEditField(null)
              }}
            >
              Save
            </button>
          </>
        }
      >
        {editField ? (
          <div className="form-field">
            <label>Display name</label>
            <input
              className="admin-inp"
              style={{ width: '100%' }}
              value={editField.displayName}
              onChange={(e) => setEditField({ ...editField, displayName: e.target.value })}
            />
          </div>
        ) : null}
      </AdminModal>
    </AdminPageShell>
  )
}
