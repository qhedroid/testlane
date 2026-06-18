'use client'

import { Building2, Monitor, Shield, User } from 'lucide-react'
import { useState } from 'react'
import { AdminPageShell } from '../AdminPageShell'
import { AdminBadge, AdminCard, AdminFormRow, AdminSection, formatLoginTimestamp } from '../admin-ui'

const TWO_FA_METHODS = ['Authenticator', 'Email', 'Hardware key / Passkey'] as const

export function AdminAccountPageContent() {
  const [firstName, setFirstName] = useState('Demo')
  const [lastName, setLastName] = useState('User')
  const loginTs = formatLoginTimestamp()

  return (
    <AdminPageShell title="My account">
      <AdminSection icon={<User size={16} />} title="Account data">
        <AdminFormRow label="Email address" description="Your login email address.">
          <div className="admin-inp-row">
            <input className="admin-inp" type="email" value="demo@relay.app" readOnly />
            <button type="button" className="btn">Change email address</button>
          </div>
        </AdminFormRow>
        <div className="admin-inp-pair">
          <div className="admin-select-field">
            <span className="admin-select-lbl">First name</span>
            <input className="admin-inp" value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </div>
          <div className="admin-select-field">
            <span className="admin-select-lbl">Last name</span>
            <input className="admin-inp" value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </div>
        </div>
      </AdminSection>

      <AdminSection icon={<Shield size={16} />} title="Security">
        <p className="admin-desc">Change your password and security settings here.</p>
        <button type="button" className="btn">Change password</button>
        <div className="admin-sub-hd">Two-factor authentication</div>
        {TWO_FA_METHODS.map((method) => (
          <div key={method} className="admin-security-row">
            <div>
              <div className="admin-security-name">{method}</div>
              <div className="admin-security-status">Not active</div>
            </div>
            <button type="button" className="btn">Activate</button>
          </div>
        ))}
      </AdminSection>

      <AdminSection icon={<Building2 size={16} />} title="My organizations">
        <AdminCard>
          <div className="admin-card-main">
            <div className="admin-card-title">Demo Organization</div>
            <div className="admin-card-sub">main</div>
          </div>
          <div className="admin-card-meta">
            <span>Role: Administrator</span>
            <span className="admin-status-active">Status: Enabled</span>
          </div>
        </AdminCard>
      </AdminSection>

      <AdminSection icon={<Monitor size={16} />} title="Active logins">
        <AdminCard>
          <div className="admin-card-main">
            <div className="admin-card-title">Demo Organization</div>
            <div className="admin-card-sub">Chrome / macOS 10.15</div>
            <div className="admin-card-sub">{loginTs}</div>
          </div>
          <AdminBadge variant="success">Current</AdminBadge>
        </AdminCard>
      </AdminSection>
    </AdminPageShell>
  )
}
