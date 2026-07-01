'use client'

import { Building2, Monitor, Shield, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFresh } from '@/fresh/data/FreshProvider'
import { AdminPageShell } from '../AdminPageShell'
import {
  AdminBadge,
  AdminCard,
  AdminFormRow,
  AdminModal,
  AdminSection,
  formatLoginTimestamp,
  useSavedFeedback,
} from '../admin-ui'

export function AdminAccountPageContent() {
  const { adminSettings, saveAdminAccount, toggleAdmin2FA } = useFresh()
  const { saved, showSaved } = useSavedFeedback()
  const [draft, setDraft] = useState(adminSettings.account)
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [passwordMsg, setPasswordMsg] = useState('')
  const loginTs = formatLoginTimestamp()

  useEffect(() => {
    setDraft(adminSettings.account)
  }, [adminSettings.account])

  function handleSave() {
    saveAdminAccount({ firstName: draft.firstName, lastName: draft.lastName })
    showSaved()
  }

  return (
    <AdminPageShell title="My account">
      <AdminSection icon={<User size={16} />} title="Account data">
        <AdminFormRow label="Email address" description="Your login email address.">
          <div className="admin-inp-row">
            <input className="admin-inp" type="email" value="demo@relay.app" readOnly />
            <button type="button" className="btn admin-btn-fit">Change email address</button>
          </div>
        </AdminFormRow>
        <div className="admin-inp-pair">
          <div className="admin-select-field">
            <span className="admin-select-lbl">First name</span>
            <input className="admin-inp" value={draft.firstName} onChange={(e) => setDraft({ ...draft, firstName: e.target.value })} />
          </div>
          <div className="admin-select-field">
            <span className="admin-select-lbl">Last name</span>
            <input className="admin-inp" value={draft.lastName} onChange={(e) => setDraft({ ...draft, lastName: e.target.value })} />
          </div>
        </div>
        <div className="admin-inline-actions">
          {saved ? <span className="admin-saved">Saved</span> : null}
          <button type="button" className="btn btn-p admin-btn-fit" onClick={handleSave}>Save</button>
        </div>
      </AdminSection>

      <AdminSection icon={<Shield size={16} />} title="Security">
        <p className="admin-desc">Change your password and security settings here.</p>
        <button type="button" className="btn admin-btn-fit" onClick={() => setPasswordOpen(true)}>Change password</button>
        {passwordMsg ? <p className="admin-saved">{passwordMsg}</p> : null}
        <div className="admin-sub-hd">Two-factor authentication</div>
        {adminSettings.account.twoFactorMethods.map((m) => (
          <div key={m.method} className="admin-security-row">
            <div>
              <div className="admin-security-name">{m.method}</div>
              <div className="admin-security-status">{m.active ? 'Active' : 'Not active'}</div>
            </div>
            <button type="button" className="btn admin-btn-fit" onClick={() => toggleAdmin2FA(m.method)}>
              {m.active ? 'Deactivate' : 'Activate'}
            </button>
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

      <AdminModal
        open={passwordOpen}
        title="Change password"
        onClose={() => setPasswordOpen(false)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setPasswordOpen(false)}>Cancel</button>
            <button
              type="button"
              className="btn btn-p"
              onClick={() => {
                setPasswordOpen(false)
                setPasswordMsg('Password updated')
                window.setTimeout(() => setPasswordMsg(''), 2000)
              }}
            >
              Submit
            </button>
          </>
        }
      >
        <div className="form-field">
          <label>Current password</label>
          <input type="password" className="admin-inp" style={{ width: '100%' }} />
        </div>
        <div className="form-field">
          <label>New password</label>
          <input type="password" className="admin-inp" style={{ width: '100%' }} />
        </div>
        <div className="form-field">
          <label>Confirm new password</label>
          <input type="password" className="admin-inp" style={{ width: '100%' }} />
        </div>
      </AdminModal>
    </AdminPageShell>
  )
}
