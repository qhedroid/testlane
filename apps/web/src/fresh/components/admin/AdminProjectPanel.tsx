'use client'

import {
  FolderKanban,
  Link2,
  Maximize2,
  Minimize2,
  Puzzle,
  SlidersHorizontal,
  Users,
  X,
} from 'lucide-react'
import Link from 'next/link'
import { useEffect, useState } from 'react'
import {
  DEFAULT_PROJECT_SETTINGS,
  type Project,
  type ProjectPolicyValue,
  type ProjectSettings,
} from '@/fresh/data/demo-model'
import { useFresh } from '@/fresh/data/FreshProvider'
import { AdminInfoIcon, AdminTable, useSavedFeedback } from './admin-ui'

type PanelTab = 'details' | 'settings' | 'customFields' | 'users' | 'integrations'

const TABS: { id: PanelTab; label: string }[] = [
  { id: 'details', label: 'Details' },
  { id: 'settings', label: 'Settings' },
  { id: 'customFields', label: 'Custom fields' },
  { id: 'users', label: 'Users' },
  { id: 'integrations', label: 'Integrations' },
]

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

function resolveProjectSettings(project: Project): ProjectSettings {
  return { ...DEFAULT_PROJECT_SETTINGS, ...project.projectSettings }
}

function policyIsOverride(value: ProjectPolicyValue): boolean {
  return value !== 'inherit'
}

interface AdminProjectPanelProps {
  project: Project
  maximized: boolean
  onToggleMaximize: () => void
  onClose: () => void
}

export function AdminProjectPanel({
  project,
  maximized,
  onToggleMaximize,
  onClose,
}: AdminProjectPanelProps) {
  const { adminSettings, updateProject, updateActiveCustomFields, updateProjectSettings } = useFresh()
  const { saved, showSaved } = useSavedFeedback()
  const [tab, setTab] = useState<PanelTab>('details')

  const [detailsDraft, setDetailsDraft] = useState({
    name: project.name,
    key: project.key,
    description: project.description ?? '',
  })
  const [settingsDraft, setSettingsDraft] = useState<ProjectSettings>(() => resolveProjectSettings(project))
  const [activeFieldDraft, setActiveFieldDraft] = useState<string[]>(project.activeCustomFieldIds)

  useEffect(() => {
    setDetailsDraft({
      name: project.name,
      key: project.key,
      description: project.description ?? '',
    })
    setSettingsDraft(resolveProjectSettings(project))
    setActiveFieldDraft(project.activeCustomFieldIds)
    setTab('details')
  }, [project.id])

  useEffect(() => {
    setDetailsDraft({
      name: project.name,
      key: project.key,
      description: project.description ?? '',
    })
    setSettingsDraft(resolveProjectSettings(project))
    setActiveFieldDraft(project.activeCustomFieldIds)
  }, [project.name, project.key, project.description, project.activeCustomFieldIds, project.projectSettings])

  function resetDetails() {
    setDetailsDraft({
      name: project.name,
      key: project.key,
      description: project.description ?? '',
    })
  }

  function resetSettings() {
    setSettingsDraft(resolveProjectSettings(project))
  }

  function resetCustomFields() {
    setActiveFieldDraft(project.activeCustomFieldIds)
  }

  function handleSaveDetails() {
    if (!detailsDraft.name.trim()) return
    updateProject(project.id, {
      name: detailsDraft.name.trim(),
      key: detailsDraft.key.trim().toUpperCase(),
      description: detailsDraft.description.trim() || undefined,
    })
    showSaved()
  }

  function handleSaveSettings() {
    updateProjectSettings(project.id, settingsDraft)
    showSaved()
  }

  function handleSaveCustomFields() {
    updateActiveCustomFields(project.id, activeFieldDraft)
    showSaved()
  }

  function toggleActiveField(fieldId: string) {
    setActiveFieldDraft((prev) =>
      prev.includes(fieldId) ? prev.filter((id) => id !== fieldId) : [...prev, fieldId],
    )
  }

  function setPolicyMode(
    key: 'allowReopeningTestRuns' | 'allowReopeningMilestones' | 'allowEditingTestResults',
    mode: 'inherit' | 'override',
  ) {
    setSettingsDraft((prev) => ({
      ...prev,
      [key]: mode === 'inherit' ? 'inherit' : prev[key] === 'inherit' ? 'unlimited' : prev[key],
    }))
  }

  function setReportLogoMode(mode: 'inherit' | 'override') {
    setSettingsDraft((prev) => ({
      ...prev,
      reportLogo: mode === 'inherit' ? 'inherit' : 'override',
    }))
  }

  const showFooter = tab === 'details' || tab === 'settings' || tab === 'customFields'

  return (
    <aside className={`admin-project-panel${maximized ? ' maximized' : ''}`}>
      <div className="admin-project-panel-hd">
        <button
          type="button"
          className="admin-icon-btn"
          title={maximized ? 'Restore panel width' : 'Maximize panel'}
          onClick={onToggleMaximize}
        >
          {maximized ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
        </button>
        <div className="admin-project-panel-title">
          <span className="admin-project-key-badge">{project.key}</span>
          <span className="admin-project-name">{project.name}</span>
        </div>
        <div className="admin-project-type">
          <FolderKanban size={14} />
          <span>Project</span>
        </div>
        <button type="button" className="admin-icon-btn" title="Close" onClick={onClose}>
          <X size={14} />
        </button>
      </div>

      <div className="nav-tab-bar">
        {TABS.map((t) => (
          <div
            key={t.id}
            className={`nav-tab${tab === t.id ? ' on' : ''}`}
            onClick={() => setTab(t.id)}
            role="tab"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') setTab(t.id)
            }}
          >
            {t.label}
          </div>
        ))}
      </div>

      <div className="admin-project-panel-body">
        {tab === 'details' ? (
          <>
            <div className="admin-project-fields">
              <label className="admin-project-field">
                <span className="admin-field-lbl">Name <span className="admin-required">*</span></span>
                <input
                  className="admin-inp"
                  value={detailsDraft.name}
                  onChange={(e) => setDetailsDraft((d) => ({ ...d, name: e.target.value }))}
                />
              </label>
              <label className="admin-project-field">
                <span className="admin-field-lbl">Project key</span>
                <input
                  className="admin-inp"
                  value={detailsDraft.key}
                  onChange={(e) => setDetailsDraft((d) => ({ ...d, key: e.target.value.toUpperCase() }))}
                  style={{ fontFamily: 'var(--mono)' }}
                />
              </label>
              <label className="admin-project-field">
                <span className="admin-field-lbl">Description</span>
                <textarea
                  className="admin-inp"
                  rows={4}
                  value={detailsDraft.description}
                  onChange={(e) => setDetailsDraft((d) => ({ ...d, description: e.target.value }))}
                />
              </label>
            </div>

            <div className="admin-project-further">
              <div className="admin-project-further-title">Further settings on project level</div>
              <button type="button" className="admin-project-link-row" onClick={() => setTab('customFields')}>
                <SlidersHorizontal size={14} />
                <span>
                  <strong>Custom fields</strong>
                  <span>Configure visibility of a custom field for this project.</span>
                </span>
              </button>
              <button type="button" className="admin-project-link-row" onClick={() => setTab('users')}>
                <Users size={14} />
                <span>
                  <strong>User management</strong>
                  <span>Configure roles of users within this project.</span>
                </span>
              </button>
              <button type="button" className="admin-project-link-row" onClick={() => setTab('integrations')}>
                <Puzzle size={14} />
                <span>
                  <strong>Integrations</strong>
                  <span>Configure availability of an integration for this project.</span>
                </span>
              </button>
            </div>
          </>
        ) : null}

        {tab === 'settings' ? (
          <div className="admin-project-settings">
            {POLICY_FIELDS.map(({ key, label }) => {
              const value = settingsDraft[key]
              const mode = policyIsOverride(value) ? 'override' : 'inherit'
              return (
                <div key={key} className="admin-project-setting">
                  <div className="admin-field-lbl">
                    {label.toUpperCase()} <AdminInfoIcon />
                  </div>
                  <div className="admin-inherit-row">
                    <label className="admin-radio">
                      <input
                        type="radio"
                        name={`${project.id}-${key}`}
                        checked={mode === 'inherit'}
                        onChange={() => setPolicyMode(key, 'inherit')}
                      />
                      <span>Inherit (Unlimited)</span>
                    </label>
                    <label className="admin-radio">
                      <input
                        type="radio"
                        name={`${project.id}-${key}`}
                        checked={mode === 'override'}
                        onChange={() => setPolicyMode(key, 'override')}
                      />
                      <span>Override</span>
                    </label>
                  </div>
                  {mode === 'override' ? (
                    <select
                      className="admin-select admin-select-fixed"
                      value={value === 'inherit' ? 'unlimited' : value}
                      onChange={(e) =>
                        setSettingsDraft((prev) => ({
                          ...prev,
                          [key]: e.target.value as Exclude<ProjectPolicyValue, 'inherit'>,
                        }))
                      }
                    >
                      {POLICY_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  ) : null}
                </div>
              )
            })}

            <div className="admin-project-setting">
              <div className="admin-field-lbl">
                REPORT LOGO <AdminInfoIcon />
              </div>
              <div className="admin-inherit-row">
                <label className="admin-radio">
                  <input
                    type="radio"
                    name={`${project.id}-reportLogo`}
                    checked={settingsDraft.reportLogo === 'inherit'}
                    onChange={() => setReportLogoMode('inherit')}
                  />
                  <span>Inherit (Unlimited)</span>
                </label>
                <label className="admin-radio">
                  <input
                    type="radio"
                    name={`${project.id}-reportLogo`}
                    checked={settingsDraft.reportLogo === 'override'}
                    onChange={() => setReportLogoMode('override')}
                  />
                  <span>Override</span>
                </label>
              </div>
              {settingsDraft.reportLogo === 'override' ? (
                <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginTop: 8 }}>
                  <div className="admin-logo-box">Logo</div>
                  <button type="button" className="btn admin-btn-fit">
                    Remove
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {tab === 'customFields' ? (
          <AdminTable>
            <thead>
              <tr>
                <th>Name</th>
                <th>Type</th>
                <th style={{ width: 72, textAlign: 'center' }}>Active</th>
              </tr>
            </thead>
            <tbody>
              {adminSettings.customFields.map((field) => (
                <tr key={field.id}>
                  <td>{field.name}</td>
                  <td className="admin-muted">{field.type}</td>
                  <td style={{ textAlign: 'center' }}>
                    <input
                      type="checkbox"
                      checked={activeFieldDraft.includes(field.id)}
                      onChange={() => toggleActiveField(field.id)}
                      aria-label={`Active: ${field.name}`}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </AdminTable>
        ) : null}

        {tab === 'users' ? (
          <div className="admin-project-placeholder">
            <Users size={28} strokeWidth={1.5} className="admin-project-placeholder-icon" />
            <p>User management for individual projects is configured via the User management settings.</p>
            <Link href="/admin/users" className="btn admin-btn-fit">
              Go to User management
            </Link>
          </div>
        ) : null}

        {tab === 'integrations' ? (
          <div className="admin-project-placeholder">
            <Link2 size={28} strokeWidth={1.5} className="admin-project-placeholder-icon" />
            <p>Project-level integrations are configured via the Integrations settings.</p>
            <Link href="/admin/integrations" className="btn admin-btn-fit">
              Go to Integrations
            </Link>
          </div>
        ) : null}
      </div>

      {showFooter ? (
        <div className="admin-project-panel-foot">
          {saved ? <span className="admin-saved">Saved</span> : null}
          <button
            type="button"
            className="btn"
            onClick={() => {
              if (tab === 'details') resetDetails()
              else if (tab === 'settings') resetSettings()
              else resetCustomFields()
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            className="btn btn-p"
            disabled={tab === 'details' && !detailsDraft.name.trim()}
            onClick={() => {
              if (tab === 'details') handleSaveDetails()
              else if (tab === 'settings') handleSaveSettings()
              else handleSaveCustomFields()
            }}
          >
            Save
          </button>
        </div>
      ) : null}
    </aside>
  )
}
