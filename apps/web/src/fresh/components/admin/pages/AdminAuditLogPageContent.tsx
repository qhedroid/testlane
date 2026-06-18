'use client'

import { History } from 'lucide-react'
import { AdminPageShell } from '../AdminPageShell'
import { ADMIN_AUDIT_LOG } from '../admin-seed'
import {
  AdminProgressStat,
  AdminTable,
  AdminTableFooter,
  AdminToolbar,
} from '../admin-ui'

export function AdminAuditLogPageContent() {
  return (
    <AdminPageShell title="Audit log">
      <AdminProgressStat label="Number of entries" current={1250} total={1000000} rightLabel="1,250 of 1,000,000 entries" />
      <div className="admin-progress-stat-top" style={{ marginBottom: 14 }}>
        <span className="admin-progress-stat-label">Retention period</span>
        <span className="admin-progress-stat-val">366 days</span>
      </div>

      <AdminToolbar
        left={
          <>
            <button type="button" className="btn">Export all</button>
            <button type="button" className="btn">Refresh</button>
          </>
        }
        right={<button type="button" className="btn">Filter</button>}
      />

      <AdminTable>
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Area</th>
              <th>By user</th>
              <th>Operation</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {ADMIN_AUDIT_LOG.map((row, i) => (
              <tr key={`${row.timestamp}-${i}`}>
                <td>{row.timestamp}</td>
                <td>{row.area}</td>
                <td>{row.byUser}</td>
                <td>{row.operation}</td>
                <td>{row.details}</td>
              </tr>
            ))}
          </tbody>
        </AdminTable>
        <AdminTableFooter total={ADMIN_AUDIT_LOG.length} page={1} pageSize={ADMIN_AUDIT_LOG.length} showPerPage />
    </AdminPageShell>
  )
}
