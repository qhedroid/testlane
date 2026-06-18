'use client'

import { Globe, Image, Palette, User } from 'lucide-react'
import { useState } from 'react'
import { AdminPageShell } from '../AdminPageShell'
import {
  AdminFormRow,
  AdminPageFooter,
  AdminSection,
  getSampleFormats,
  type Language,
  type RegionalFormat,
} from '../admin-ui'

export function AdminProfilePageContent() {
  const [displayName, setDisplayName] = useState('Demo User')
  const [language, setLanguage] = useState<Language>('English')
  const [regional, setRegional] = useState<RegionalFormat>('Standard')
  const [theme, setTheme] = useState('Light')
  const samples = getSampleFormats(language, regional)

  return (
    <AdminPageShell title="My profile">
      <div className="admin-page-with-footer">
        <AdminSection icon={<Image size={16} />} title="Profile photo">
          <div className="admin-avatar-row">
            <div className="admin-avatar"><User size={32} /></div>
            <div>
              <label className="btn" style={{ cursor: 'pointer' }}>
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
          <AdminFormRow
            label="Display name"
            description="Change your display name within this organization."
          >
            <input
              className="admin-inp"
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
            />
          </AdminFormRow>
        </AdminSection>

        <AdminSection icon={<Globe size={16} />} title="Region and language">
          <p className="admin-field-desc">Choose language and date format.</p>
          <div className="admin-select-row">
            <div className="admin-select-field">
              <span className="admin-select-lbl">Language</span>
              <select className="admin-select" value={language} onChange={(e) => setLanguage(e.target.value as Language)}>
                <option>English</option>
                <option>French</option>
                <option>German</option>
                <option>Spanish</option>
              </select>
            </div>
            <div className="admin-select-field">
              <span className="admin-select-lbl">Regional format</span>
              <select className="admin-select" value={regional} onChange={(e) => setRegional(e.target.value as RegionalFormat)}>
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
            <select className="admin-select" value={theme} onChange={(e) => setTheme(e.target.value)}>
              <option>Light</option>
              <option>Dark</option>
              <option>System</option>
            </select>
          </div>
        </AdminSection>

        <AdminPageFooter>
          <button type="button" className="btn">Cancel</button>
          <button type="button" className="btn btn-p">Save</button>
        </AdminPageFooter>
      </div>
    </AdminPageShell>
  )
}
