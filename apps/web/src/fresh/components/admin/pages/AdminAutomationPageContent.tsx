'use client'

import { Bot, Database, List } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AdminPageShell } from '../AdminPageShell'
import { ADMIN_AUTOMATION_FIELDS, ADMIN_AUTOMATION_SOURCES } from '../admin-seed'
import {
  AdminRowActions,
  AdminSearchInput,
  AdminSection,
  AdminTable,
  AdminTableFooter,
  AdminToolbar,
} from '../admin-ui'

export function AdminAutomationPageContent() {
  const [retention, setRetention] = useState('90')
  const [sourceSearch, setSourceSearch] = useState('')
  const [fieldSearch, setFieldSearch] = useState('')

  const sources = useMemo(() => {
    const q = sourceSearch.trim().toLowerCase()
    if (!q) return ADMIN_AUTOMATION_SOURCES
    return ADMIN_AUTOMATION_SOURCES.filter((s) => s.name.toLowerCase().includes(q))
  }, [sourceSearch])

  const fields = useMemo(() => {
    const q = fieldSearch.trim().toLowerCase()
    if (!q) return ADMIN_AUTOMATION_FIELDS
    return ADMIN_AUTOMATION_FIELDS.filter(
      (f) => f.name.toLowerCase().includes(q) || f.displayName.toLowerCase().includes(q),
    )
  }, [fieldSearch])

  return (
    <AdminPageShell title="Automation">
      <AdminSection icon={<Bot size={16} />} title="General">
        <p className="admin-desc">
          Automated runs older than the retention period will be automatically deleted. Can be overridden per source.
        </p>
        <div className="admin-select-field">
          <span className="admin-select-lbl">Retention period</span>
          <select className="admin-select" value={retention} onChange={(e) => setRetention(e.target.value)}>
            <option value="30">30 days</option>
            <option value="60">60 days</option>
            <option value="90">90 days</option>
            <option value="365">1 year</option>
          </select>
        </div>
        <div className="admin-inline-actions">
          <button type="button" className="btn btn-p">Save</button>
          <button type="button" className="btn">Cancel</button>
        </div>
      </AdminSection>

      <AdminSection icon={<Database size={16} />} title="Sources">
        <AdminToolbar
          left={null}
          right={
            <>
              <AdminSearchInput value={sourceSearch} onChange={setSourceSearch} placeholder="Search" />
              <button type="button" className="btn">Filter</button>
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
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.displayName || '—'}</td>
                <td>{row.project}</td>
                <td>{row.retention}</td>
                <td><AdminRowActions /></td>
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
              <button type="button" className="btn">Filter</button>
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
              <tr key={row.name}>
                <td>{row.name}</td>
                <td>{row.displayName}</td>
                <td>{row.projects}</td>
                <td><AdminRowActions /></td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
        <AdminTableFooter total={fields.length} page={1} pageSize={fields.length} showPerPage />
      </AdminSection>
    </AdminPageShell>
  )
}
