'use client'

import { useMemo, useState } from 'react'
import type { AdminUser } from '@/fresh/data/demo-model'
import { formatAdminUserName } from '@/fresh/data/admin-initial-settings'
import { useFresh } from '@/fresh/data/FreshProvider'
import { ADMIN_USER_ROLES, formatProjectAccess, FINAL_ADMIN_DISABLE_MESSAGE, FINAL_ADMIN_REMOVE_MESSAGE, isFinalEffectiveAdmin } from '@/fresh/data/rbac'
import { AdminPageShell } from '../AdminPageShell'
import { PermissionButton } from '../PermissionGate'
import { useActorRbac } from '../useActorRbac'
import {
  AdminCross,
  AdminModal,
  AdminSearchInput,
  AdminTable,
  AdminTableFooter,
  AdminToolbar,
  formatUserLastLogin,
} from '../admin-ui'

const PAGE_SIZE = 20

function statusClass(status: AdminUser['status']): string {
  switch (status) {
    case 'Active': return 'admin-status-active'
    case 'Pending invite': return 'admin-status-pending'
    case 'Silent created': return 'admin-status-silent'
    case 'Disabled': return 'admin-status-disabled'
    default: return ''
  }
}

function UserFormFields({
  firstName,
  lastName,
  email,
  role,
  projectAccess,
  allProjects,
  projectKeys,
  silentInvite,
  showSilentInvite,
  onFirstName,
  onLastName,
  onEmail,
  onRole,
  onToggleProject,
  onAllProjects,
  onSilentInvite,
}: {
  firstName: string
  lastName: string
  email: string
  role: AdminUser['role']
  projectAccess: string[]
  allProjects: boolean
  projectKeys: string[]
  silentInvite: boolean
  showSilentInvite?: boolean
  onFirstName: (v: string) => void
  onLastName: (v: string) => void
  onEmail: (v: string) => void
  onRole: (v: AdminUser['role']) => void
  onToggleProject: (key: string) => void
  onAllProjects: (v: boolean) => void
  onSilentInvite: (v: boolean) => void
}) {
  return (
    <>
      <div className="admin-form-grid">
        <div className="form-field">
          <label>First name</label>
          <input className="admin-inp" value={firstName} onChange={(e) => onFirstName(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Last name</label>
          <input className="admin-inp" value={lastName} onChange={(e) => onLastName(e.target.value)} />
        </div>
      </div>
      <div className="form-field">
        <label>Email</label>
        <input className="admin-inp" type="email" value={email} onChange={(e) => onEmail(e.target.value)} />
      </div>
      <div className="form-field">
        <label>Role</label>
        <select className="admin-select admin-select-fixed" value={role} onChange={(e) => onRole(e.target.value as AdminUser['role'])}>
          {ADMIN_USER_ROLES.map((r) => <option key={r} value={r}>{r}</option>)}
        </select>
      </div>
      <div className="form-field">
        <label>Project access</label>
        <label className="admin-check-row">
          <input type="checkbox" checked={allProjects} onChange={(e) => onAllProjects(e.target.checked)} />
          All projects
        </label>
        {!allProjects ? (
          <div className="admin-project-checks">
            {projectKeys.map((key) => (
              <label key={key} className="admin-check-row">
                <input
                  type="checkbox"
                  checked={projectAccess.includes(key)}
                  onChange={() => onToggleProject(key)}
                />
                {key}
              </label>
            ))}
          </div>
        ) : null}
      </div>
      {showSilentInvite ? (
        <div className="form-field">
          <label className="admin-check-row">
            <input type="checkbox" checked={silentInvite} onChange={(e) => onSilentInvite(e.target.checked)} />
            Silent invite (no email — creates dummy/internal account immediately)
          </label>
        </div>
      ) : null}
    </>
  )
}

export function AdminUsersPageContent() {
  const {
    adminSettings,
    projects,
    inviteAdminUser,
    updateAdminUser,
    disableAdminUser,
    removeAdminUser,
    reactivateAdminUser,
  } = useFresh()
  const { canManageUsers, canViewUserManagement, permissionDeniedMessage } = useActorRbac()

  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [inviteOpen, setInviteOpen] = useState(false)
  const [editUser, setEditUser] = useState<AdminUser | null>(null)
  const [removeUser, setRemoveUser] = useState<AdminUser | null>(null)
  const [formError, setFormError] = useState('')

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<AdminUser['role']>('Editor')
  const [allProjects, setAllProjects] = useState(true)
  const [projectAccess, setProjectAccess] = useState<string[]>([])
  const [silentInvite, setSilentInvite] = useState(false)

  const projectKeys = useMemo(() => projects.map((p) => p.key).sort(), [projects])

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return adminSettings.users
    return adminSettings.users.filter(
      (u) =>
        formatAdminUserName(u).toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        u.role.toLowerCase().includes(q),
    )
  }, [adminSettings.users, search])

  const pageItems = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE
    return filtered.slice(start, start + PAGE_SIZE)
  }, [filtered, page])

  function resetForm() {
    setFirstName('')
    setLastName('')
    setEmail('')
    setRole('Editor')
    setAllProjects(true)
    setProjectAccess([])
    setSilentInvite(false)
    setFormError('')
  }

  function openInvite() {
    resetForm()
    setInviteOpen(true)
  }

  function openEdit(u: AdminUser) {
    setEditUser(u)
    setFirstName(u.firstName)
    setLastName(u.lastName)
    setEmail(u.email)
    setRole(u.role)
    const all = u.projectAccess.includes('__all__')
    setAllProjects(all)
    setProjectAccess(all ? [] : [...u.projectAccess])
    setFormError('')
  }

  function resolveProjectAccess(): string[] {
    return allProjects ? ['__all__'] : projectAccess
  }

  function validateForm(): boolean {
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setFormError('First name, last name, and email are required')
      return false
    }
    if (!allProjects && projectAccess.length === 0) {
      setFormError('Select at least one project or choose All projects')
      return false
    }
    setFormError('')
    return true
  }

  function handleInvite() {
    if (!validateForm()) return
    inviteAdminUser({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      role,
      projectAccess: resolveProjectAccess(),
      silentInvite,
    })
    setInviteOpen(false)
    resetForm()
  }

  function handleEditSave() {
    if (!editUser || !validateForm()) return
    updateAdminUser({
      id: editUser.id,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      role,
      projectAccess: resolveProjectAccess(),
    })
    setEditUser(null)
    resetForm()
  }

  if (!canViewUserManagement) {
    return (
      <AdminPageShell title="User management">
        <p className="admin-readonly-note">{permissionDeniedMessage}</p>
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell title="User management">
      <p className="admin-page-desc">
        Invite colleagues, create silent dummy accounts, and manage project access. No emails are sent in this prototype.
      </p>

      <AdminToolbar
        left={
          <PermissionButton
            allowed={canManageUsers}
            message={permissionDeniedMessage}
            className="btn btn-p admin-btn-fit"
            onClick={openInvite}
          >
            + Invite user
          </PermissionButton>
        }
        right={<AdminSearchInput value={search} onChange={(v) => { setSearch(v); setPage(1) }} placeholder="Search users" />}
      />

      <AdminTable>
        <thead>
          <tr>
            <th>User</th>
            <th>Email address</th>
            <th>2FA</th>
            <th>Role</th>
            <th>Status</th>
            <th>Last login</th>
            <th>Project access</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pageItems.map((u) => (
            <tr key={u.id}>
              <td>{formatAdminUserName(u)}</td>
              <td>{u.email}</td>
              <td>{u.twoFa ? '✓' : <AdminCross />}</td>
              <td>{u.role}</td>
              <td className={statusClass(u.status)}>{u.status}</td>
              <td>{u.lastLoginAt ? formatUserLastLogin(u.lastLoginAt) : '—'}</td>
              <td>{formatProjectAccess(u.projectAccess)}</td>
              <td>
                <span className="admin-row-actions-inline">
                  <PermissionButton
                    allowed={canManageUsers}
                    message={permissionDeniedMessage}
                    className="btn admin-btn-sm"
                    onClick={() => openEdit(u)}
                  >
                    Edit
                  </PermissionButton>
                  {u.status === 'Disabled' ? (
                    <PermissionButton
                      allowed={canManageUsers}
                      message={permissionDeniedMessage}
                      className="btn admin-btn-sm"
                      onClick={() => reactivateAdminUser(u.id)}
                    >
                      Reactivate
                    </PermissionButton>
                  ) : isFinalEffectiveAdmin(adminSettings.users, u.id) ? (
                    <button
                      type="button"
                      className="btn admin-btn-sm"
                      disabled
                      title={FINAL_ADMIN_DISABLE_MESSAGE}
                    >
                      Disable
                    </button>
                  ) : (
                    <PermissionButton
                      allowed={canManageUsers}
                      message={permissionDeniedMessage}
                      className="btn admin-btn-sm"
                      onClick={() => disableAdminUser(u.id)}
                    >
                      Disable
                    </PermissionButton>
                  )}
                  {isFinalEffectiveAdmin(adminSettings.users, u.id) ? (
                    <button
                      type="button"
                      className="btn admin-btn-sm"
                      disabled
                      title={FINAL_ADMIN_REMOVE_MESSAGE}
                    >
                      Remove
                    </button>
                  ) : (
                    <PermissionButton
                      allowed={canManageUsers}
                      message={permissionDeniedMessage}
                      className="btn admin-btn-sm admin-btn-danger"
                      onClick={() => setRemoveUser(u)}
                    >
                      Remove
                    </PermissionButton>
                  )}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </AdminTable>

      <AdminTableFooter total={filtered.length} page={page} pageSize={PAGE_SIZE} onPageChange={setPage} />

      <AdminModal
        open={inviteOpen}
        title="Invite user"
        onClose={() => setInviteOpen(false)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setInviteOpen(false)}>Cancel</button>
            <button type="button" className="btn btn-p" onClick={handleInvite}>Invite</button>
          </>
        }
      >
        <UserFormFields
          firstName={firstName}
          lastName={lastName}
          email={email}
          role={role}
          projectAccess={projectAccess}
          allProjects={allProjects}
          projectKeys={projectKeys}
          silentInvite={silentInvite}
          showSilentInvite
          onFirstName={setFirstName}
          onLastName={setLastName}
          onEmail={setEmail}
          onRole={setRole}
          onAllProjects={(v) => { setAllProjects(v); if (v) setProjectAccess([]) }}
          onToggleProject={(key) => {
            setProjectAccess((prev) =>
              prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
            )
          }}
          onSilentInvite={setSilentInvite}
        />
        {formError ? <div className="admin-form-error">{formError}</div> : null}
      </AdminModal>

      <AdminModal
        open={!!editUser}
        title="Edit user"
        onClose={() => setEditUser(null)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setEditUser(null)}>Cancel</button>
            <button type="button" className="btn btn-p" onClick={handleEditSave}>Save</button>
          </>
        }
      >
        <UserFormFields
          firstName={firstName}
          lastName={lastName}
          email={email}
          role={role}
          projectAccess={projectAccess}
          allProjects={allProjects}
          projectKeys={projectKeys}
          silentInvite={false}
          onFirstName={setFirstName}
          onLastName={setLastName}
          onEmail={setEmail}
          onRole={setRole}
          onAllProjects={(v) => { setAllProjects(v); if (v) setProjectAccess([]) }}
          onToggleProject={(key) => {
            setProjectAccess((prev) =>
              prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key],
            )
          }}
          onSilentInvite={() => {}}
        />
        {formError ? <div className="admin-form-error">{formError}</div> : null}
      </AdminModal>

      <AdminModal
        open={!!removeUser}
        title={`Remove ${removeUser ? formatAdminUserName(removeUser) : 'user'}?`}
        onClose={() => setRemoveUser(null)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setRemoveUser(null)}>Cancel</button>
            <button
              type="button"
              className="btn"
              style={{ background: 'var(--fail)', color: '#fff', border: 'none' }}
              onClick={() => {
                if (removeUser) removeAdminUser(removeUser.id)
                setRemoveUser(null)
              }}
            >
              Remove permanently
            </button>
          </>
        }
      >
        <p style={{ fontSize: 12.5, color: 'var(--text2)', lineHeight: 1.55, marginBottom: 10 }}>
          This <strong>permanently deletes</strong> the user record — unlike Disable, it cannot be re-enabled later.
        </p>
        <p style={{ fontSize: 12, color: 'var(--text2)', lineHeight: 1.55, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 5, padding: '8px 10px' }}>
          <strong>Prototype limitation:</strong> historical records are not cascaded or reassigned. Anywhere this
          person appears in past runs, results (assignee / tested-by), or the audit log, their name remains as an
          orphaned display name no longer linked to a user account.
        </p>
      </AdminModal>
    </AdminPageShell>
  )
}
