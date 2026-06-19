'use client'

import { Globe, Image, Palette, User } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useFresh } from '@/fresh/data/FreshProvider'
import { AdminPageShell } from '../AdminPageShell'
import {
  AdminFormRow,
  AdminPageFooter,
  AdminSection,
  getSampleFormats,
  useSavedFeedback,
  type Language,
  type RegionalFormat,
} from '../admin-ui'

export function AdminProfilePageContent() {
  const { adminSettings, saveAdminProfile } = useFresh()
  const { saved, showSaved } = useSavedFeedback()
  const [draft, setDraft] = useState(adminSettings.profile)

  useEffect(() => {
    setDraft(adminSettings.profile)
  }, [adminSettings.profile])

  const samples = getSampleFormats(
    draft.language as Language,
    draft.regionalFormat as RegionalFormat,
  )

  function handleCancel() {
    setDraft(adminSettings.profile)
  }

  function handleSave() {
    saveAdminProfile(draft)
    showSaved()
  }

  return (
    <AdminPageShell title="My profile">
      <div className="admin-page-with-footer">
        <AdminSection icon={<Image size={16} />} title="Profile photo">
          <div className="admin-avatar-row">
            <div className="admin-avatar"><User size={32} /></div>
            <div>
              <label className="btn admin-btn-fit" style={{ cursor: 'pointer' }}>
                Upload
                <input type="file" accept="image/*" hidden />
              </label>
              <p className="admin-field-desc" style={{ marginTop: 8 }}>
                Upload a profile picture for your account. Square pictures work best.
              </p>
            </div>
          </div>
        </AdminSection>

        <AdminSection icon={<User size={16} />} title="Display name">
          <AdminFormRow label="Display name" description="Change your display name within this organization.">
            <input
              className="admin-inp"
              type="text"
              value={draft.displayName}
              onChange={(e) => setDraft({ ...draft, displayName: e.target.value })}
            />
          </AdminFormRow>
        </AdminSection>

        <AdminSection icon={<Globe size={16} />} title="Region and language">
          <p className="admin-field-desc">Choose language and date format.</p>
          <div className="admin-select-row">
            <div className="admin-select-field">
              <span className="admin-select-lbl">Language</span>
              <select
                className="admin-select admin-select-fixed"
                value={draft.language}
                onChange={(e) => setDraft({ ...draft, language: e.target.value })}
              >
                <option>English</option>
                <option>French</option>
                <option>German</option>
                <option>Spanish</option>
              </select>
            </div>
            <div className="admin-select-field">
              <span className="admin-select-lbl">Regional format</span>
              <select
                className="admin-select admin-select-fixed"
                value={draft.regionalFormat}
                onChange={(e) => setDraft({ ...draft, regionalFormat: e.target.value })}
              >
                <option>Standard</option>
                <option>ISO</option>
              </select>
            </div>
          </div>
          <div className="admin-sample-box">
            <strong>Sample data in chosen format</strong>
            First day of week: {samples.firstDay}<br />
            Date: {samples.dateStr}<br />
            Date &amp; time: {samples.dateTimeStr}<br />
            Date &amp; time complete: {samples.dateTimeComplete}
          </div>
        </AdminSection>

        <AdminSection icon={<Palette size={16} />} title="UI theme">
          <div className="admin-select-field">
            <span className="admin-select-lbl">Theme</span>
            <select
              className="admin-select admin-select-fixed"
              value={draft.theme}
              onChange={(e) => setDraft({ ...draft, theme: e.target.value as typeof draft.theme })}
            >
              <option>Light</option>
              <option>Dark</option>
              <option>System</option>
            </select>
          </div>
        </AdminSection>

        <AdminPageFooter>
          {saved ? <span className="admin-saved">Saved</span> : null}
          <button type="button" className="btn" onClick={handleCancel}>Cancel</button>
          <button type="button" className="btn btn-p" onClick={handleSave}>Save</button>
        </AdminPageFooter>
      </div>
    </AdminPageShell>
  )
}
