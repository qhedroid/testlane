'use client'

import { Building2, Lock, Settings, Shield } from 'lucide-react'
import { useState } from 'react'
import { AdminPageShell } from '../AdminPageShell'
import { AdminFormRow, AdminInfoIcon, AdminPageFooter, AdminSection, AdminToggle } from '../admin-ui'

const REOPEN_OPTIONS = ['Unlimited', 'Never', 'Admins only'] as const

export function AdminOrganizationPageContent() {
  const [fullName, setFullName] = useState('Demo Organization')
  const [reopenRuns, setReopenRuns] = useState<string>('Unlimited')
  const [reopenMilestones, setReopenMilestones] = useState<string>('Unlimited')
  const [editResults, setEditResults] = useState<string>('Unlimited')
  const [oauth2, setOauth2] = useState(false)

  return (
    <AdminPageShell title="Organization">
      <div className="admin-page-with-footer">
        <AdminSection icon={<Building2 size={16} />} title="General information">
          <AdminFormRow label="Short name">
            <span className="admin-static">main</span>
          </AdminFormRow>
          <AdminFormRow label="Full name">
            <input className="admin-inp" value={fullName} onChange={(e) => setFullName(e.target.value)} />
          </AdminFormRow>
          <AdminFormRow label="Owner">
            <span className="admin-static">Demo User (demo@relay.app)</span>
          </AdminFormRow>
          <AdminFormRow label="Created at">
            <span className="admin-static">1/1/2025, 12:00 PM</span>
          </AdminFormRow>
        </AdminSection>

        <AdminSection icon={<Settings size={16} />} title="Settings">
          {([
            ['Allow re-opening test runs', reopenRuns, setReopenRuns],
            ['Allow re-opening milestones', reopenMilestones, setReopenMilestones],
            ['Allow editing test results', editResults, setEditResults],
          ] as const).map(([lbl, val, setter]) => (
            <div key={lbl} className="admin-form-row">
              <div className="admin-form-row-label">
                <div className="admin-field-lbl">{lbl} <AdminInfoIcon /></div>
              </div>
              <div className="admin-form-row-control">
                <select className="admin-select" value={val} onChange={(e) => setter(e.target.value)}>
                  {REOPEN_OPTIONS.map((o) => <option key={o}>{o}</option>)}
                </select>
              </div>
            </div>
          ))}
          <div className="admin-form-row">
            <div className="admin-form-row-label">
              <div className="admin-field-lbl">Report logo</div>
            </div>
            <div className="admin-form-row-control" style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
              <div className="admin-logo-box">Logo</div>
              <button type="button" className="btn">Remove</button>
            </div>
          </div>
        </AdminSection>

        <AdminSection icon={<Shield size={16} />} title="Single sign-on">
          <p className="admin-desc">Log in using your corporate account.</p>
          <button type="button" className="btn">Configure single sign-on</button>
        </AdminSection>

        <AdminSection icon={<Lock size={16} />} title="External app access">
          <p className="admin-desc">Enable access from external apps at the organization level.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <AdminToggle checked={oauth2} onChange={setOauth2} label="Using OAuth2" />
            <AdminInfoIcon />
          </div>
          <p className="admin-desc">Provides AI-support through access to the Relay API.</p>
        </AdminSection>

        <AdminPageFooter>
          <button type="button" className="btn">Cancel</button>
          <button type="button" className="btn btn-p">Save</button>
        </AdminPageFooter>
      </div>
    </AdminPageShell>
  )
}
