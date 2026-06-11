'use client'

import { PrototypeBanner } from '../components/PrototypeBanner'
import { FreshTopbar } from '../components/FreshTopbar'
import { MOCK_WORKSPACE_MODULES, MOCK_WORKSPACE_USERS } from '@/lib/relay/mock-data'

export function SettingsScreen() {
  return (
    <div className="view">
      <FreshTopbar
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings' },
        ]}
        showSearch={false}
      />
      <PrototypeBanner />

      <div className="settings-wrap">
        <section className="panel settings-section">
          <div className="pnl-hd">
            <i className="ti ti-building" style={{ fontSize: 13, color: 'var(--accent)' }} />
            <span className="pnl-ttl">Workspace</span>
          </div>
          <div className="pnl-body settings-grid">
            <label className="settings-field">
              <span>Organisation</span>
              <input className="inp" type="text" value="relay-dev" readOnly />
            </label>
            <label className="settings-field">
              <span>Display name</span>
              <input className="inp" type="text" value="Relay QA Workspace" readOnly />
            </label>
            <label className="settings-field">
              <span>Default environment</span>
              <input className="inp" type="text" value="UAT" readOnly />
            </label>
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
            <span className="pnl-ttl">Users &amp; roles (preview)</span>
          </div>
          <div className="pnl-body settings-table-wrap">
            <table className="defects-table">
              <thead>
                <tr>
                  <th>User</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Modules</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_WORKSPACE_USERS.map((u) => (
                  <tr key={u.email}>
                    <td>
                      <span className="settings-user">
                        <span className="settings-av">{u.initials}</span>
                        {u.name}
                      </span>
                    </td>
                    <td className="mono">{u.email}</td>
                    <td>{u.role}</td>
                    <td>{u.modules.join(', ')}</td>
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
