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
import { SEED_ADMIN_USER_ID } from './admin-initial-settings'
import { appendAuditEntry, auditByUser, generateMaskedApiKey } from './admin-utils'

export type AdminAction =
  | { type: 'admin/saveProfile'; payload: Partial<AdminSettings['profile']> }
  | { type: 'admin/saveAccount'; payload: Partial<AdminSettings['account']> }
  | { type: 'admin/toggle2FA'; payload: { method: string } }
  | { type: 'admin/saveOrganization'; payload: Partial<AdminSettings['organization']> }
  | { type: 'admin/createApiKey'; payload: Omit<AdminApiKey, 'id' | 'createdAt' | 'maskedKey' | 'userId'> }
  | { type: 'admin/deleteApiKey'; payload: { id: string } }
  | { type: 'admin/inviteUser'; payload: Omit<AdminUser, 'id' | 'lastLoginAt' | 'twoFa' | 'status'> }
  | { type: 'admin/updateUserRole'; payload: { id: string; role: AdminUser['role'] } }
  | { type: 'admin/createRole'; payload: Omit<AdminRole, 'id' | 'userCount' | 'isBuiltIn'> }
  | { type: 'admin/addCustomField'; payload: Omit<AdminCustomField, 'id'> }
  | { type: 'admin/deleteCustomField'; payload: { id: string } }
  | { type: 'admin/saveAutomationRetention'; payload: { retentionPeriod: string } }
  | { type: 'admin/updateAutomationSource'; payload: AdminAutomationSource }
  | { type: 'admin/deleteAutomationSource'; payload: { id: string } }
  | { type: 'admin/updateAutomationField'; payload: AdminAutomationField }
  | { type: 'admin/deleteAutomationField'; payload: { id: string } }
  | { type: 'admin/addAuditEntry'; payload: Omit<AuditLogEntry, 'id' | 'timestamp'> }

export function reduceAdminState(state: DemoState, action: AdminAction): DemoState {
  const byUser = auditByUser(state)
  let settings = state.adminSettings

  switch (action.type) {
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
        userId: SEED_ADMIN_USER_ID,
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
      const user: AdminUser = {
        ...action.payload,
        id: newId('admin-user-inv'),
        twoFa: false,
        status: 'Active',
        lastLoginAt: Date.now(),
      }
      settings = appendAuditEntry(settings, {
        area: 'Settings',
        byUser,
        operation: 'Create',
        details: `Invited user ${user.name} (${user.email})`,
      })
      return {
        ...state,
        adminSettings: {
          ...settings,
          users: [...settings.users, user],
        },
      }
    }

    case 'admin/updateUserRole': {
      const target = settings.users.find((u) => u.id === action.payload.id)
      if (!target) return state
      settings = appendAuditEntry(settings, {
        area: 'Settings',
        byUser,
        operation: 'Update',
        details: `Updated user role for ${target.name} to ${action.payload.role}`,
      })
      return {
        ...state,
        adminSettings: {
          ...settings,
          users: settings.users.map((u) =>
            u.id === action.payload.id ? { ...u, role: action.payload.role } : u,
          ),
        },
      }
    }

    case 'admin/createRole': {
      const role: AdminRole = {
        ...action.payload,
        id: newId('role'),
        userCount: 0,
        isBuiltIn: false,
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
