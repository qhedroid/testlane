'use client'

import Link from 'next/link'
import { FreshTopbar } from '../components/FreshTopbar'
import { MOCK_WORKSPACE_MODULES } from '@/lib/relay/mock-data'
import { useFresh } from '../data/FreshProvider'
import { formatAdminUserName } from '../data/admin-initial-settings'
import { formatProjectAccess } from '../data/rbac'

export function SettingsScreen() {
  const { adminSettings } = useFresh()
  const previewUsers = adminSettings.users.slice(0, 5)

  return (
    <div className="view">
      <FreshTopbar
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings' },
        ]}
        showSearch={false}
      />

      <div className="settings-wrap">
        <section className="panel settings-section">
          <div className="pnl-hd">
            <i className="ti ti-settings" style={{ fontSize: 13, color: 'var(--accent)' }} />
            <span className="pnl-ttl">Organisation settings</span>
          </div>
          <div className="pnl-body settings-status">
            <p>
              Manage users, roles, organisation profile, and audit log in the{' '}
              <Link href="/admin/profile" className="admin-link">Relay settings area</Link>.
            </p>
            <p>
              <strong>{adminSettings.organization.fullName}</strong> — frontend prototype; changes persist in{' '}
              <code>relay-demo-v2</code> localStorage.
            </p>
          </div>
        </section>

        <section className="panel settings-section">
          <div className="pnl-hd">
            <i className="ti ti-box" style={{ fontSize: 13, color: 'var(--accent)' }} />
            <span className="pnl-ttl">Modules</span>
            <span className="pnl-ct">{MOCK_WORKSPACE_MODULES.length}</span>
          </div>
          <div className="pnl-body">
            <ul className="settings-module-list">
              {MOCK_WORKSPACE_MODULES.map((m) => (
                <li key={m.id}>
                  <span className="settings-module-name">{m.name}</span>
                  <span className="settings-module-meta">{m.cases} cases</span>
                  <span className={`pill ${m.active ? 'p-pass' : 'p-not_run'}`}>
                    {m.active ? 'Active' : 'Inactive'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="panel settings-section">
          <div className="pnl-hd">
            <i className="ti ti-users" style={{ fontSize: 13, color: 'var(--accent)' }} />
            <span className="pnl-ttl">Users &amp; roles</span>
            <Link href="/admin/users" className="btn btn-p" style={{ marginLeft: 'auto', fontSize: 11, padding: '4px 10px' }}>
              Open user management
            </Link>
          </div>
          <div className="pnl-body settings-table-wrap">
            <table className="tbl">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Project access</th>
                </tr>
              </thead>
              <tbody>
                {previewUsers.map((u) => (
                  <tr key={u.id}>
                    <td>{formatAdminUserName(u)}</td>
                    <td className="mono">{u.email}</td>
                    <td>{u.role}</td>
                    <td>{u.status}</td>
                    <td>{formatProjectAccess(u.projectAccess)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="panel settings-section">
          <div className="pnl-hd">
            <i className="ti ti-server" style={{ fontSize: 13, color: 'var(--accent)' }} />
            <span className="pnl-ttl">Local demo status</span>
          </div>
          <div className="pnl-body settings-status">
            <p>
              <strong>Frontend prototype</strong> — runs on <code>pnpm dev</code> (port 3000).
            </p>
            <p>
              <strong>API-backed /runs</strong> — requires Docker MySQL,{' '}
              <code>pnpm db:migrate</code>, and <code>pnpm db:seed</code>.
            </p>
            <p>
              <strong>Authentication</strong> — not implemented. API uses dev header{' '}
              <code>x-relay-user-id</code> only.
            </p>
          </div>
        </section>
      </div>
    </div>
  )
}
