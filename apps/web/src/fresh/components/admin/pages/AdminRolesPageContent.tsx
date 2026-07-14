'use client'

import { useMemo, useState } from 'react'
import type { AdminRole } from '@/fresh/data/demo-model'
import { useFresh } from '@/fresh/data/FreshProvider'
import {
  emptyPermissions,
  PERMISSION_KEYS,
  PERMISSION_LABELS,
  type PermissionKey,
  type RolePermissions,
} from '@/fresh/data/rbac'
import { AdminPageShell } from '../AdminPageShell'
import { PermissionButton } from '../PermissionGate'
import { useActorRbac } from '../useActorRbac'
import {
  AdminCheck,
  AdminModal,
  AdminSearchInput,
  AdminTable,
  AdminToolbar,
} from '../admin-ui'

function PermissionMatrix({
  permissions,
  readOnly,
  onChange,
}: {
  permissions: RolePermissions
  readOnly?: boolean
  onChange?: (key: PermissionKey, value: boolean) => void
}) {
  return (
    <div className="admin-perm-matrix">
      {PERMISSION_KEYS.map((key) => (
        <label key={key} className={`admin-perm-row${readOnly ? ' readonly' : ''}`}>
          <input
            type="checkbox"
            checked={permissions[key]}
            disabled={readOnly}
            onChange={(e) => onChange?.(key, e.target.checked)}
          />
          <span>{PERMISSION_LABELS[key]}</span>
        </label>
      ))}
    </div>
  )
}

export function AdminRolesPageContent() {
  const { adminSettings, createAdminRole, updateAdminRole, deleteAdminRole } = useFresh()
  const { canManageRoles, canViewUserManagement, permissionDeniedMessage } = useActorRbac()

  const [search, setSearch] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [detailRole, setDetailRole] = useState<AdminRole | null>(null)
  const [editRole, setEditRole] = useState<AdminRole | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isProjectLevel, setIsProjectLevel] = useState(true)
  const [permissions, setPermissions] = useState<RolePermissions>(emptyPermissions())
  const [nameError, setNameError] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return adminSettings.roles
    return adminSettings.roles.filter(
      (r) => r.name.toLowerCase().includes(q) || r.description.toLowerCase().includes(q),
    )
  }, [adminSettings.roles, search])

  function resetForm() {
    setName('')
    setDescription('')
    setIsProjectLevel(true)
    setPermissions(emptyPermissions())
    setNameError('')
  }

  function openCreate() {
    resetForm()
    setCreateOpen(true)
  }

  function openEdit(r: AdminRole) {
    setEditRole(r)
    setName(r.name)
    setDescription(r.description)
    setIsProjectLevel(r.isProjectLevel)
    setPermissions({ ...r.permissions })
    setNameError('')
  }

  function setPerm(key: PermissionKey, value: boolean) {
    setPermissions((prev) => ({ ...prev, [key]: value }))
  }

  function handleCreate() {
    if (!name.trim()) {
      setNameError('Name is required')
      return
    }
    createAdminRole({
      name: name.trim(),
      description: description.trim(),
      isProjectLevel,
      permissions,
    })
    setCreateOpen(false)
    resetForm()
  }

  function handleUpdate() {
    if (!editRole || !name.trim()) {
      setNameError('Name is required')
      return
    }
    updateAdminRole({
      id: editRole.id,
      name: name.trim(),
      description: description.trim(),
      isProjectLevel,
      permissions,
    })
    setEditRole(null)
    resetForm()
  }

  function handleDelete(r: AdminRole) {
    if (!window.confirm(`Delete custom role "${r.name}"?`)) return
    deleteAdminRole(r.id)
    if (detailRole?.id === r.id) setDetailRole(null)
  }

  if (!canViewUserManagement) {
    return (
      <AdminPageShell title="Role management">
        <p className="admin-readonly-note">{permissionDeniedMessage}</p>
      </AdminPageShell>
    )
  }

  return (
    <AdminPageShell title="Role management">
      <p className="admin-page-desc">
        Built-in roles mirror Testlane&apos;s TI QA capability model. Custom roles are frontend-only for this prototype.
      </p>

      <AdminToolbar
        left={
          <PermissionButton
            allowed={canManageRoles}
            message={permissionDeniedMessage}
            className="btn btn-p admin-btn-fit"
            onClick={openCreate}
          >
            + Create role
          </PermissionButton>
        }
        right={<AdminSearchInput value={search} onChange={setSearch} placeholder="Search roles" />}
      />

      <AdminTable>
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Users</th>
            <th>Project-level</th>
            <th>Built-in</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filtered.map((r) => (
            <tr key={r.id}>
              <td>{r.name}</td>
              <td>{r.description}</td>
              <td>{r.userCount}</td>
              <td><AdminCheck value={r.isProjectLevel} /></td>
              <td><AdminCheck value={r.isBuiltIn} /></td>
              <td>
                <span className="admin-row-actions-inline">
                  <button type="button" className="btn admin-btn-sm" onClick={() => setDetailRole(r)}>
                    View
                  </button>
                  {r.isBuiltIn ? null : (
                    <>
                      <PermissionButton
                        allowed={canManageRoles}
                        message={permissionDeniedMessage}
                        className="btn admin-btn-sm"
                        onClick={() => openEdit(r)}
                      >
                        Edit
                      </PermissionButton>
                      <PermissionButton
                        allowed={canManageRoles}
                        message={permissionDeniedMessage}
                        className="btn admin-btn-sm"
                        onClick={() => handleDelete(r)}
                      >
                        Delete
                      </PermissionButton>
                    </>
                  )}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </AdminTable>

      <AdminModal
        open={createOpen}
        title="Create custom role"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setCreateOpen(false)}>Cancel</button>
            <button type="button" className="btn btn-p" onClick={handleCreate}>Create</button>
          </>
        }
      >
        <div className="form-field">
          <label>Name</label>
          <input className="admin-inp" style={{ width: '100%' }} value={name} onChange={(e) => { setName(e.target.value); setNameError('') }} />
          {nameError ? <div className="admin-form-error">{nameError}</div> : null}
        </div>
        <div className="form-field">
          <label>Description</label>
          <textarea className="admin-inp" rows={2} style={{ width: '100%' }} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="form-field">
          <label className="admin-check-row">
            <input type="checkbox" checked={isProjectLevel} onChange={(e) => setIsProjectLevel(e.target.checked)} />
            Project-level role
          </label>
        </div>
        <div className="form-field">
          <label>Permissions</label>
          <PermissionMatrix permissions={permissions} onChange={setPerm} />
        </div>
      </AdminModal>

      <AdminModal
        open={!!editRole}
        title="Edit custom role"
        onClose={() => setEditRole(null)}
        footer={
          <>
            <button type="button" className="btn" onClick={() => setEditRole(null)}>Cancel</button>
            <button type="button" className="btn btn-p" onClick={handleUpdate}>Save</button>
          </>
        }
      >
        <div className="form-field">
          <label>Name</label>
          <input className="admin-inp" style={{ width: '100%' }} value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-field">
          <label>Description</label>
          <textarea className="admin-inp" rows={2} style={{ width: '100%' }} value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div className="form-field">
          <label className="admin-check-row">
            <input type="checkbox" checked={isProjectLevel} onChange={(e) => setIsProjectLevel(e.target.checked)} />
            Project-level role
          </label>
        </div>
        <PermissionMatrix permissions={permissions} onChange={setPerm} />
      </AdminModal>

      <AdminModal
        open={!!detailRole}
        title={detailRole ? `${detailRole.name} — permissions` : 'Role details'}
        onClose={() => setDetailRole(null)}
        footer={<button type="button" className="btn" onClick={() => setDetailRole(null)}>Close</button>}
      >
        {detailRole ? (
          <>
            <p className="admin-role-detail-desc">{detailRole.description}</p>
            {detailRole.isBuiltIn ? (
              <p className="admin-readonly-note">Built-in role — permissions are read-only in the demo.</p>
            ) : null}
            <PermissionMatrix permissions={detailRole.permissions} readOnly />
          </>
        ) : null}
      </AdminModal>
    </AdminPageShell>
  )
}
