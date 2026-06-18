'use client'

import { useMemo, useState } from 'react'
import type { AdminUser } from '@/fresh/data/demo-model'
import { isInvitedUser } from '@/fresh/data/admin-initial-settings'
import { useFresh } from '@/fresh/data/FreshProvider'
import { AdminPageShell } from '../AdminPageShell'
import {
  AdminCross,
  AdminModal,
  AdminProgressStat,
  AdminSearchInput,
  AdminTable,
  AdminTableFooter,
  AdminToolbar,
  formatUserLastLogin,
} from '../admin-ui'

const INVITE_ROLES: AdminUser['role'][] = ['Administrator', 'Editor', 'Viewer']

export function AdminUsersPageContent() {
  const { adminSettings, inviteAdminUser, updateAdminUserRole } = useFresh()
  const [search, setSearch] = useState('')
  const [inviteOpen, setInviteOpen] = useState(false)
  const [inviteName, setInviteName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<AdminUser['role']>('Editor')
  const [inviteError, setInviteError] = useState('')

  const viewerCount = adminSettings.users.filter((u) => u.role === 'Viewer').length

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return adminSettings.users
    return adminSettings.users.filter(
      (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
    )
  }, [adminSettings.users, search])

  function handleInvite() {
    if (!inviteName.trim() || !inviteEmail.trim()) {
      setInviteError('Name and email are required')
      return
    }
    inviteAdminUser({ name: inviteName.trim(), email: inviteEmail.trim(), role: inviteRole })
    setInviteOpen(false)
    setInviteName('')
    setInviteEmail('')
    setInviteRole('Editor')
    setInviteError('')
  }

  return (
    <AdminPageShell title="User management">
      <AdminProgressStat label="Number of users" current={adminSettings.users.length} total={10} />
      <AdminProgressStat label="Number of viewers" current={viewerCount} total={5} />

      <AdminToolbar
        left={<button type="button" className="btn btn-p admin-btn-fit" onClick={() => setInviteOpen(true)}>+ Invite</button>}
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
            <tr key={u.id}>
              <td>{u.name}</td>
              <td>{u.email}</td>
              <td>{u.twoFa ? '✓' : <AdminCross />}</td>
              <td>
                {isInvitedUser(u) ? (
                  <select
                    className="admin-select"
                    value={u.role}
                    onChange={(e) => updateAdminUserRole(u.id, e.target.value as AdminUser['role'])}
                  >
                    {INVITE_ROLES.map((r) => <option key={r}>{r}</option>)}
                  </select>
                ) : (
                  u.role
                )}
              </td>
              <td className={u.status === 'Active' ? 'admin-status-active' : 'admin-status-inactive'}>{u.status}</td>
              <td>{formatUserLastLogin(u.lastLoginAt)}</td>
            </tr>
          ))}
        </tbody>
      </AdminTable>

      <AdminTableFooter total={filtered.length} page={1} pageSize={filtered.length} />

      <AdminModal
        open={inviteOpen}
        title="Invite user"
        onClose={() => setInviteOpen(false)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setInviteOpen(false)}>Cancel</button>
            <button type="button" className="btn btn-p" onClick={handleInvite}>Invite</button>
          </>
        }
      >
        <div className="form-field">
          <label>Name</label>
          <input className="admin-inp" style={{ width: '100%' }} value={inviteName} onChange={(e) => { setInviteName(e.target.value); setInviteError('') }} />
        </div>
        <div className="form-field">
          <label>Email</label>
          <input className="admin-inp" style={{ width: '100%' }} type="email" value={inviteEmail} onChange={(e) => { setInviteEmail(e.target.value); setInviteError('') }} />
        </div>
        <div className="form-field">
          <label>Role</label>
          <select className="admin-select admin-select-fixed" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as AdminUser['role'])}>
            {INVITE_ROLES.map((r) => <option key={r}>{r}</option>)}
          </select>
        </div>
        {inviteError ? <div className="admin-form-error">{inviteError}</div> : null}
      </AdminModal>
    </AdminPageShell>
  )
}
