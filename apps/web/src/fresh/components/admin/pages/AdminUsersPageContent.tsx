'use client'

import { useMemo, useState } from 'react'
import { AdminPageShell } from '../AdminPageShell'
import { ADMIN_USERS } from '../admin-seed'
import {
  AdminCross,
  AdminProgressStat,
  AdminSearchInput,
  AdminTable,
  AdminTableFooter,
  AdminToolbar,
} from '../admin-ui'

export function AdminUsersPageContent() {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return ADMIN_USERS
    return ADMIN_USERS.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    )
  }, [search])

  return (
    <AdminPageShell title="User management">
      <AdminProgressStat label="Number of users" current={4} total={10} />
      <AdminProgressStat label="Number of viewers" current={1} total={5} />

      <AdminToolbar
        left={<button type="button" className="btn btn-p">+ Invite</button>}
        right={<AdminSearchInput value={search} onChange={setSearch} placeholder="Search" />}
      />

      <AdminTable>
        <thead>
          <tr>
            <th>User</th>
            <th>Email address</th>
            <th>2FA</th>
            <th>Role</th>
            <th>Status</th>
            <th>Last login</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((u) => (
            <tr key={u.email}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td><AdminCross /></td>
              <td>{u.role}</td>
              <td className={u.status === 'Active' ? 'admin-status-active' : 'admin-status-inactive'}>{u.status}</td>
              <td>{u.lastLogin}</td>
            </tr>
          ))}
        </tbody>
      </AdminTable>

      <AdminTableFooter total={filtered.length} page={1} pageSize={filtered.length} />
    </AdminPageShell>
  )
}
