'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { PrototypeBanner } from '../components/PrototypeBanner'
import { FreshTopbar } from '../components/FreshTopbar'
import { MOCK_WORKSPACE_MODULES } from '@/lib/relay/mock-data'
import { useFresh } from '../data/FreshProvider'
import { formatAdminUserName } from '../data/admin-initial-settings'
import { BUILTIN_ROLE_PERMISSIONS, formatProjectAccess } from '../data/rbac'
import type { ProjectPolicyValue, ProjectSettings } from '../data/demo-model'
import { DEFAULT_PROJECT_SETTINGS } from '../data/demo-model'

const POLICY_OPTIONS: { value: Exclude<ProjectPolicyValue, 'inherit'>; label: string }[] = [
  { value: 'unlimited', label: 'Unlimited' },
  { value: 'never', label: 'Never' },
  { value: 'admins_only', label: 'Admins only' },
]

const POLICY_FIELDS = [
  { key: 'allowReopeningTestRuns' as const, label: 'Allow re-opening test runs' },
  { key: 'allowReopeningMilestones' as const, label: 'Allow re-opening milestones' },
  { key: 'allowEditingTestResults' as const, label: 'Allow editing test results' },
]

const POLICY_LABEL: Record<ProjectPolicyValue, string> = {
  inherit: 'Inherit (organisation default)',
  unlimited: 'Unlimited',
  never: 'Never',
  admins_only: 'Admins only',
}

/**
 * Area N — project-scoped editor for the ProjectSettings model that already
 * exists behind /admin/projects. Reuses the existing `updateProjectSettings`
 * store method and the existing `manageProjects` permission key from rbac.ts
 * (Owner / Administrator / Project Administrator). Actors without it get the
 * previous read-only behaviour.
 */
function ProjectSettingsSection() {
  const { activeProject, updateProjectSettings, currentActor } = useFresh()
  const canEdit = BUILTIN_ROLE_PERMISSIONS[currentActor.role]?.manageProjects === true

  const [draft, setDraft] = useState<ProjectSettings>(() => ({
    ...DEFAULT_PROJECT_SETTINGS,
    ...activeProject.projectSettings,
  }))
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    setDraft({ ...DEFAULT_PROJECT_SETTINGS, ...activeProject.projectSettings })
    setSaved(false)
  }, [activeProject.id, activeProject.projectSettings])

  function handleSave() {
    updateProjectSettings(activeProject.id, draft)
    setSaved(true)
    setTimeout(() => setSaved(false), 2500)
  }

  return (
    <section className="panel settings-section">
      <div className="pnl-hd">
        <i className="ti ti-adjustments" style={{ fontSize: 13, color: 'var(--accent)' }} />
        <span className="pnl-ttl">Project settings — {activeProject.name}</span>
        {canEdit ? (
          <span style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8 }}>
            {saved ? <span style={{ fontSize: 10.5, color: 'var(--pass)' }}>✓ Saved</span> : null}
            <button type="button" className="btn btn-p" style={{ fontSize: 11, padding: '3px 10px' }} onClick={handleSave}>
              Save settings
            </button>
          </span>
        ) : (
          <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--text3)' }}>
            Read-only — your demo role ({currentActor.role}) cannot manage projects
          </span>
        )}
      </div>
      <div className="pnl-body">
        <p style={{ fontSize: 11.5, color: 'var(--text3)', margin: '0 0 10px' }}>
          Per-project overrides of organisation policies. The same settings are editable org-wide under{' '}
          <Link href="/admin/projects" className="admin-link">Admin → Projects</Link>.
        </p>
        <div className="ps-grid">
          {POLICY_FIELDS.map(({ key, label }) => {
            const value = draft[key]
            return (
              <div key={key} className="ps-field">
                <div className="ps-lbl">{label}</div>
                {canEdit ? (
                  <select
                    className="rp-select"
                    value={value}
                    onChange={(e) =>
                      setDraft((prev) => ({ ...prev, [key]: e.target.value as ProjectPolicyValue }))
                    }
                  >
                    <option value="inherit">{POLICY_LABEL.inherit}</option>
                    {POLICY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                ) : (
                  <div className="ps-value">{POLICY_LABEL[value]}</div>
                )}
              </div>
            )
          })}
          <div className="ps-field">
            <div className="ps-lbl">Report logo</div>
            {canEdit ? (
              <select
                className="rp-select"
                value={draft.reportLogo}
                onChange={(e) =>
                  setDraft((prev) => ({ ...prev, reportLogo: e.target.value as ProjectSettings['reportLogo'] }))
                }
              >
                <option value="inherit">Inherit (organisation logo)</option>
                <option value="override">Override (project logo)</option>
              </select>
            ) : (
              <div className="ps-value">{draft.reportLogo === 'inherit' ? 'Inherit (organisation logo)' : 'Override (project logo)'}</div>
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

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
      <PrototypeBanner />

      <div className="settings-wrap">
        <ProjectSettingsSection />

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
            <table className="defects-table">
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
