'use client'

import { useMemo, useState } from 'react'
import { useFresh } from '@/fresh/data/FreshProvider'
import { AdminPageShell } from '../AdminPageShell'
import {
  AdminProgressStat,
  AdminTable,
  AdminTableFooter,
  AdminToolbar,
  formatRelativeTimestamp,
} from '../admin-ui'

function formatTodayKey() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function AdminAuditLogPageContent() {
  const { adminSettings } = useFresh()
  const [tick, setTick] = useState(0)

  const sorted = useMemo(() => {
    void tick
    return [...adminSettings.auditLog].sort((a, b) => b.timestamp - a.timestamp)
  }, [adminSettings.auditLog, tick])

  function handleRefresh() {
    setTick((n) => n + 1)
  }

  function handleExport() {
    const header = 'Timestamp,Area,By User,Operation,Details'
    const rows = sorted.map((row) => [
      new Date(row.timestamp).toISOString(),
      row.area,
      row.byUser,
      row.operation,
      `"${row.details.replace(/"/g, '""')}"`,
    ].join(','))
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `audit-log-${formatTodayKey()}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <AdminPageShell title="Audit log">
      <AdminProgressStat label="Number of entries" current={sorted.length} total={1000000} rightLabel={`${sorted.length.toLocaleString()} of 1,000,000 entries`} />
      <div className="admin-progress-stat-top" style={{ marginBottom: 14 }}>
        <span className="admin-progress-stat-label">Retention period</span>
        <span className="admin-progress-stat-val">366 days</span>
      </div>

      <AdminToolbar
        left={
          <>
            <button type="button" className="btn admin-btn-fit" onClick={handleExport}>Export all</button>
            <button type="button" className="btn admin-btn-fit" onClick={handleRefresh}>Refresh</button>
          </>
        }
        right={<button type="button" className="btn admin-btn-fit">Filter</button>}
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
          {sorted.map((row) => (
            <tr key={row.id}>
              <td>{formatRelativeTimestamp(row.timestamp)}</td>
              <td>{row.area}</td>
              <td>{row.byUser}</td>
              <td>{row.operation}</td>
              <td>{row.details}</td>
            </tr>
          ))}
        </tbody>
      </AdminTable>
      <AdminTableFooter total={sorted.length} page={1} pageSize={sorted.length} showPerPage />
    </AdminPageShell>
  )
}
