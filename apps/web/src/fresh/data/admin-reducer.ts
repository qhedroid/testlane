import type {
  AdminApiKey,
  AdminAutomationField,
  AdminAutomationSource,
  AdminCustomField,
  AdminRole,
  AdminSettings,
  AdminUser,
  AuditLogEntry,
  DemoState,
} from './demo-model'
import { newId } from './demo-model'
import {
  formatAdminUserName,
  SEED_ADMIN_USER_ID,
  syncRoleUserCounts,
} from './admin-initial-settings'
import { appendAuditEntry, auditByUser, generateMaskedApiKey } from './admin-utils'
import type { AdminUserRole, RolePermissions } from './rbac'
import { ADMIN_USER_ROLES, BUILTIN_ROLE_META, BUILTIN_ROLE_PERMISSIONS, emptyPermissions, isFinalEffectiveAdmin } from './rbac'

export type InviteUserPayload = {
  firstName: string
  lastName: string
  email: string
  role: AdminUserRole
  projectAccess: string[]
  silentInvite: boolean
}

export type UpdateUserPayload = {
  id: string
  firstName: string
  lastName: string
  email: string
  role: AdminUserRole
  projectAccess: string[]
}

export type AdminAction =
  | { type: 'admin/saveProfile'; payload: Partial<AdminSettings['profile']> }
  | { type: 'admin/saveAccount'; payload: Partial<AdminSettings['account']> }
  | { type: 'admin/toggle2FA'; payload: { method: string } }
  | { type: 'admin/saveOrganization'; payload: Partial<AdminSettings['organization']> }
  | { type: 'admin/createApiKey'; payload: Omit<AdminApiKey, 'id' | 'createdAt' | 'maskedKey' | 'userId'> }
  | { type: 'admin/deleteApiKey'; payload: { id: string } }
  | { type: 'admin/inviteUser'; payload: InviteUserPayload }
  | { type: 'admin/updateUser'; payload: UpdateUserPayload }
  | { type: 'admin/disableUser'; payload: { id: string } }
  | { type: 'admin/reactivateUser'; payload: { id: string } }
  | { type: 'admin/updateUserRole'; payload: { id: string; role: AdminUser['role'] } }
  | { type: 'admin/createRole'; payload: { name: string; description: string; isProjectLevel: boolean; permissions: RolePermissions } }
  | { type: 'admin/updateRole'; payload: { id: string; name: string; description: string; isProjectLevel: boolean; permissions: RolePermissions } }
  | { type: 'admin/deleteRole'; payload: { id: string } }
  | { type: 'admin/addCustomField'; payload: Omit<AdminCustomField, 'id'> }
  | { type: 'admin/deleteCustomField'; payload: { id: string } }
  | { type: 'admin/saveAutomationRetention'; payload: { retentionPeriod: string } }
  | { type: 'admin/updateAutomationSource'; payload: AdminAutomationSource }
  | { type: 'admin/deleteAutomationSource'; payload: { id: string } }
  | { type: 'admin/updateAutomationField'; payload: AdminAutomationField }
  | { type: 'admin/deleteAutomationField'; payload: { id: string } }
  | { type: 'admin/addAuditEntry'; payload: Omit<AuditLogEntry, 'id' | 'timestamp'> }
  | { type: 'admin/setCurrentActor'; payload: { userId: string } }

function withUsers(state: DemoState, users: AdminUser[], settings: AdminSettings): DemoState {
  const roles = syncRoleUserCounts(users, settings.roles)
  return {
    ...state,
    adminSettings: { ...settings, users, roles },
  }
}

function userStatusFromInvite(silentInvite: boolean): AdminUser['status'] {
  return silentInvite ? 'Silent created' : 'Pending invite'
}

export function reduceAdminState(state: DemoState, action: AdminAction): DemoState {
  const byUser = auditByUser(state)
  let settings = state.adminSettings

  switch (action.type) {
    case 'admin/setCurrentActor': {
      const target = settings.users.find((u) => u.id === action.payload.userId)
      if (!target || target.status === 'Disabled') return state
      settings = appendAuditEntry(settings, {
        area: 'Settings',
        byUser,
        operation: 'Update',
        details: `Switched demo actor to ${formatAdminUserName(target)} (${target.role})`,
      })
      return { ...state, adminSettings: settings, currentActorUserId: action.payload.userId }
    }

    case 'admin/saveProfile':
      return {
        ...state,
        adminSettings: {
          ...settings,
          profile: { ...settings.profile, ...action.payload },
        },
      }

    case 'admin/saveAccount':
      return {
        ...state,
        adminSettings: {
          ...settings,
          account: { ...settings.account, ...action.payload },
        },
      }

    case 'admin/toggle2FA': {
      const twoFactorMethods = settings.account.twoFactorMethods.map((m) =>
        m.method === action.payload.method ? { ...m, active: !m.active } : m,
      )
      return {
        ...state,
        adminSettings: {
          ...settings,
          account: { ...settings.account, twoFactorMethods },
        },
      }
    }

    case 'admin/saveOrganization': {
      const organization = { ...settings.organization, ...action.payload }
      settings = appendAuditEntry(settings, {
        area: 'Settings',
        byUser,
        operation: 'Update',
        details: 'Updated organization settings',
      })
      return { ...state, adminSettings: { ...settings, organization } }
    }

    case 'admin/createApiKey': {
      const key: AdminApiKey = {
        ...action.payload,
        id: newId('apikey'),
        maskedKey: generateMaskedApiKey(),
        createdAt: Date.now(),
        userId: state.currentActorUserId ?? SEED_ADMIN_USER_ID,
      }
      settings = appendAuditEntry(settings, {
        area: 'Settings',
        byUser,
        operation: 'Create',
        details: `Created API key ${key.name}`,
      })
      return {
        ...state,
        adminSettings: {
          ...settings,
          apiKeys: [key, ...settings.apiKeys],
        },
      }
    }

    case 'admin/deleteApiKey': {
      const removed = settings.apiKeys.find((k) => k.id === action.payload.id)
      if (!removed) return state
      settings = appendAuditEntry(settings, {
        area: 'Settings',
        byUser,
        operation: 'Delete',
        details: `Deleted API key ${removed.name}`,
      })
      return {
        ...state,
        adminSettings: {
          ...settings,
          apiKeys: settings.apiKeys.filter((k) => k.id !== action.payload.id),
        },
      }
    }

    case 'admin/inviteUser': {
      const { firstName, lastName, email, role, projectAccess, silentInvite } = action.payload
      const status = userStatusFromInvite(silentInvite)
      const user: AdminUser = {
        id: newId('admin-user-inv'),
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        name: `${firstName.trim()} ${lastName.trim()}`,
        email: email.trim(),
        twoFa: false,
        role,
        status,
        lastLoginAt: silentInvite ? Date.now() : 0,
        projectAccess,
      }
      settings = appendAuditEntry(settings, {
        area: 'Settings',
        byUser,
        operation: 'Create',
        details: silentInvite
          ? `Silently created user ${user.name} (${user.email})`
          : `Invited user ${user.name} (${user.email})`,
      })
      return withUsers(state, [...settings.users, user], settings)
    }

    case 'admin/updateUser': {
      const { id, firstName, lastName, email, role, projectAccess } = action.payload
      const target = settings.users.find((u) => u.id === id)
      if (!target) return state
      settings = appendAuditEntry(settings, {
        area: 'Settings',
        byUser,
        operation: 'Update',
        details: `Updated user ${formatAdminUserName({ firstName, lastName, name: target.name })}`,
      })
      const users = settings.users.map((u) =>
        u.id === id
          ? {
              ...u,
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              name: `${firstName.trim()} ${lastName.trim()}`,
              email: email.trim(),
              role,
              projectAccess,
            }
          : u,
      )
      return withUsers(state, users, settings)
    }

    case 'admin/disableUser': {
      const target = settings.users.find((u) => u.id === action.payload.id)
      if (!target || target.status === 'Disabled') return state
      if (isFinalEffectiveAdmin(settings.users, action.payload.id)) return state
      settings = appendAuditEntry(settings, {
        area: 'Settings',
        byUser,
        operation: 'Update',
        details: `Disabled user ${formatAdminUserName(target)}`,
      })
      const users = settings.users.map((u) =>
        u.id === action.payload.id ? { ...u, status: 'Disabled' as const } : u,
      )
      let nextState = withUsers(state, users, settings)
      if (nextState.currentActorUserId === action.payload.id) {
        const fallback = users.find((u) => u.status !== 'Disabled')
        if (fallback) nextState = { ...nextState, currentActorUserId: fallback.id }
      }
      return nextState
    }

    case 'admin/reactivateUser': {
      const target = settings.users.find((u) => u.id === action.payload.id)
      if (!target || target.status !== 'Disabled') return state
      settings = appendAuditEntry(settings, {
        area: 'Settings',
        byUser,
        operation: 'Update',
        details: `Reactivated user ${formatAdminUserName(target)}`,
      })
      const users = settings.users.map((u) =>
        u.id === action.payload.id ? { ...u, status: 'Active' as const, lastLoginAt: Date.now() } : u,
      )
      return withUsers(state, users, settings)
    }

    case 'admin/updateUserRole': {
      const target = settings.users.find((u) => u.id === action.payload.id)
      if (!target) return state
      settings = appendAuditEntry(settings, {
        area: 'Settings',
        byUser,
        operation: 'Update',
        details: `Updated user role for ${formatAdminUserName(target)} to ${action.payload.role}`,
      })
      const users = settings.users.map((u) =>
        u.id === action.payload.id ? { ...u, role: action.payload.role } : u,
      )
      return withUsers(state, users, settings)
    }

    case 'admin/createRole': {
      const role: AdminRole = {
        id: newId('role'),
        name: action.payload.name,
        description: action.payload.description,
        userCount: 0,
        isProjectLevel: action.payload.isProjectLevel,
        isBuiltIn: false,
        permissions: action.payload.permissions,
      }
      settings = appendAuditEntry(settings, {
        area: 'Settings',
        byUser,
        operation: 'Create',
        details: `Created role ${role.name}`,
      })
      return {
        ...state,
        adminSettings: {
          ...settings,
          roles: [...settings.roles, role],
        },
      }
    }

    case 'admin/updateRole': {
      const existing = settings.roles.find((r) => r.id === action.payload.id)
      if (!existing || existing.isBuiltIn) return state
      settings = appendAuditEntry(settings, {
        area: 'Settings',
        byUser,
        operation: 'Update',
        details: `Updated role ${action.payload.name}`,
      })
      return {
        ...state,
        adminSettings: {
          ...settings,
          roles: settings.roles.map((r) =>
            r.id === action.payload.id
              ? {
                  ...r,
                  name: action.payload.name,
                  description: action.payload.description,
                  isProjectLevel: action.payload.isProjectLevel,
                  permissions: action.payload.permissions,
                }
              : r,
          ),
        },
      }
    }

    case 'admin/deleteRole': {
      const removed = settings.roles.find((r) => r.id === action.payload.id)
      if (!removed || removed.isBuiltIn) return state
      settings = appendAuditEntry(settings, {
        area: 'Settings',
        byUser,
        operation: 'Delete',
        details: `Deleted role ${removed.name}`,
      })
      return {
        ...state,
        adminSettings: {
          ...settings,
          roles: settings.roles.filter((r) => r.id !== action.payload.id),
        },
      }
    }

    case 'admin/addCustomField': {
      const field: AdminCustomField = { ...action.payload, id: newId('cf') }
      settings = appendAuditEntry(settings, {
        area: 'Settings',
        byUser,
        operation: 'Create',
        details: `Added custom field ${field.name}`,
      })
      return {
        ...state,
        adminSettings: {
          ...settings,
          customFields: [field, ...settings.customFields],
        },
      }
    }

    case 'admin/deleteCustomField': {
      const removed = settings.customFields.find((f) => f.id === action.payload.id)
      if (!removed) return state
      settings = appendAuditEntry(settings, {
        area: 'Settings',
        byUser,
        operation: 'Delete',
        details: `Deleted custom field ${removed.name}`,
      })
      return {
        ...state,
        adminSettings: {
          ...settings,
          customFields: settings.customFields.filter((f) => f.id !== action.payload.id),
        },
      }
    }

    case 'admin/saveAutomationRetention': {
      settings = appendAuditEntry(settings, {
        area: 'Settings',
        byUser,
        operation: 'Update',
        details: `Updated automation retention period to ${action.payload.retentionPeriod}`,
      })
      return {
        ...state,
        adminSettings: {
          ...settings,
          automation: {
            ...settings.automation,
            retentionPeriod: action.payload.retentionPeriod,
          },
        },
      }
    }

    case 'admin/updateAutomationSource': {
      settings = appendAuditEntry(settings, {
        area: 'Settings',
        byUser,
        operation: 'Update',
        details: `Updated automation source ${action.payload.name}`,
      })
      return {
        ...state,
        adminSettings: {
          ...settings,
          automation: {
            ...settings.automation,
            sources: settings.automation.sources.map((s) =>
              s.id === action.payload.id ? action.payload : s,
            ),
          },
        },
      }
    }

    case 'admin/deleteAutomationSource': {
      const removed = settings.automation.sources.find((s) => s.id === action.payload.id)
      if (!removed) return state
      settings = appendAuditEntry(settings, {
        area: 'Settings',
        byUser,
        operation: 'Delete',
        details: `Deleted automation source ${removed.name}`,
      })
      return {
        ...state,
        adminSettings: {
          ...settings,
          automation: {
            ...settings.automation,
            sources: settings.automation.sources.filter((s) => s.id !== action.payload.id),
          },
        },
      }
    }

    case 'admin/updateAutomationField': {
      settings = appendAuditEntry(settings, {
        area: 'Settings',
        byUser,
        operation: 'Update',
        details: `Updated automation field ${action.payload.name}`,
      })
      return {
        ...state,
        adminSettings: {
          ...settings,
          automation: {
            ...settings.automation,
            fields: settings.automation.fields.map((f) =>
              f.id === action.payload.id ? action.payload : f,
            ),
          },
        },
      }
    }

    case 'admin/deleteAutomationField': {
      const removed = settings.automation.fields.find((f) => f.id === action.payload.id)
      if (!removed) return state
      settings = appendAuditEntry(settings, {
        area: 'Settings',
        byUser,
        operation: 'Delete',
        details: `Deleted automation field ${removed.name}`,
      })
      return {
        ...state,
        adminSettings: {
          ...settings,
          automation: {
            ...settings.automation,
            fields: settings.automation.fields.filter((f) => f.id !== action.payload.id),
          },
        },
      }
    }

    case 'admin/addAuditEntry':
      return {
        ...state,
        adminSettings: appendAuditEntry(settings, action.payload, byUser),
      }

    default:
      return state
  }
}

export function isAdminAction(action: { type: string }): action is AdminAction {
  return action.type.startsWith('admin/')
}

/** v11 → v12: user access model, roles permissions, current actor. */
export function migrateUserAccessV12(state: DemoState): DemoState {
  const users = settingsUsersMigrate(state.adminSettings.users)
  const roles = migrateRoles(state.adminSettings.roles, users)
  const syncedRoles = syncRoleUserCounts(users, roles)

  return {
    ...state,
    currentActorUserId: state.currentActorUserId ?? SEED_ADMIN_USER_ID,
    adminSettings: {
      ...state.adminSettings,
      users,
      roles: syncedRoles,
    },
    schemaVersion: 12,
  }
}

function settingsUsersMigrate(raw: AdminUser[]): AdminUser[] {
  return raw.map((u) => {
    const legacy = u as AdminUser & { status?: string }
    const parts = (legacy.name ?? '').trim().split(/\s+/)
    const firstName = u.firstName ?? parts[0] ?? 'User'
    const lastName = u.lastName ?? parts.slice(1).join(' ') ?? ''
    let status = u.status ?? 'Active'
    if ((status as string) === 'Inactive') status = 'Disabled'
    return {
      ...u,
      firstName,
      lastName,
      name: u.name ?? `${firstName} ${lastName}`.trim(),
      projectAccess: u.projectAccess ?? ['__all__'],
      status,
    }
  })
}

function migrateRoles(existing: AdminRole[], _users: AdminUser[]): AdminRole[] {
  const legacy = existing as (AdminRole & { isOrgLevel?: boolean })[]
  const custom = legacy.filter((r) => !r.isBuiltIn && !ADMIN_USER_ROLES.includes(r.name as AdminUserRole))

  const builtIn = ADMIN_USER_ROLES.map((roleName, i) => {
    const meta = BUILTIN_ROLE_META[roleName]
    return {
      id: `admin-role-builtin-${i + 1}`,
      name: roleName,
      description: meta.description,
      userCount: 0,
      isProjectLevel: meta.isProjectLevel,
      isBuiltIn: true,
      permissions: { ...BUILTIN_ROLE_PERMISSIONS[roleName] },
    }
  })

  const migratedCustom = custom.map((r) => ({
    ...r,
    isProjectLevel: r.isProjectLevel ?? !(r.isOrgLevel ?? false),
    permissions: r.permissions ?? emptyPermissions(),
  }))

  return [...builtIn, ...migratedCustom]
}
