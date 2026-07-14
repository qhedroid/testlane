'use client'

import { Building2, Lock, Settings, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFresh } from '@/fresh/data/FreshProvider'
import { AdminPageShell } from '../AdminPageShell'
import {
  AdminFormRow,
  AdminInfoIcon,
  AdminModal,
  AdminPageFooter,
  AdminSection,
  AdminToggle,
  useSavedFeedback,
} from '../admin-ui'

const REOPEN_OPTIONS = ['Unlimited', 'Never', 'Admins only'] as const

export function AdminOrganizationPageContent() {
  const { adminSettings, saveAdminOrganization } = useFresh()
  const { saved, showSaved } = useSavedFeedback()
  const [draft, setDraft] = useState(adminSettings.organization)
  const [ssoOpen, setSsoOpen] = useState(false)

  useEffect(() => {
    setDraft(adminSettings.organization)
  }, [adminSettings.organization])

  function handleCancel() {
    setDraft(adminSettings.organization)
  }

  function handleSave() {
    saveAdminOrganization(draft)
    showSaved()
  }

  return (
    <AdminPageShell title="Organization">
      <div className="admin-page-with-footer">
        <AdminSection icon={<Building2 size={16} />} title="General information">
          <AdminFormRow label="Short name">
            <span className="admin-static">main</span>
          </AdminFormRow>
          <AdminFormRow label="Full name">
            <input className="admin-inp" value={draft.fullName} onChange={(e) => setDraft({ ...draft, fullName: e.target.value })} />
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
            ['Allow re-opening test runs', 'allowReopeningTestRuns'],
            ['Allow re-opening milestones', 'allowReopeningMilestones'],
            ['Allow editing test results', 'allowEditingTestResults'],
          ] as const).map(([lbl, key]) => (
            <div key={key} className="admin-form-row">
              <div className="admin-form-row-label">
                <div className="admin-field-lbl">{lbl} <AdminInfoIcon /></div>
              </div>
              <div className="admin-form-row-control">
                <select
                  className="admin-select admin-select-fixed"
                  value={draft[key]}
                  onChange={(e) => setDraft({ ...draft, [key]: e.target.value })}
                >
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
              <button type="button" className="btn admin-btn-fit">Remove</button>
            </div>
          </div>
        </AdminSection>

        <AdminSection icon={<Shield size={16} />} title="Single sign-on">
          <p className="admin-desc">Log in using your corporate account.</p>
          <button type="button" className="btn admin-btn-fit" onClick={() => setSsoOpen(true)}>Configure single sign-on</button>
        </AdminSection>

        <AdminSection icon={<Lock size={16} />} title="External app access">
          <p className="admin-desc">Enable access from external apps at the organization level.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <AdminToggle
              checked={draft.oauthEnabled}
              onChange={(oauthEnabled) => setDraft({ ...draft, oauthEnabled })}
              label="Using OAuth2"
            />
            <AdminInfoIcon />
          </div>
          <p className="admin-desc">Provides AI-support through access to the Testlane API.</p>
        </AdminSection>

        <AdminPageFooter>
          {saved ? <span className="admin-saved">Saved</span> : null}
          <button type="button" className="btn" onClick={handleCancel}>Cancel</button>
          <button type="button" className="btn btn-p" onClick={handleSave}>Save</button>
        </AdminPageFooter>
      </div>

      <AdminModal open={ssoOpen} title="Single sign-on" onClose={() => setSsoOpen(false)} footer={
        <button type="button" className="btn btn-p" onClick={() => setSsoOpen(false)}>Close</button>
      }>
        <p className="admin-desc">Single sign-on configuration is not available in this demo.</p>
      </AdminModal>
    </AdminPageShell>
  )
}
