'use client'

import { useFresh } from '@/fresh/data/FreshProvider'
import {
  canManageRoles,
  canManageUsers,
  canViewUserManagement,
  PERMISSION_DENIED_MESSAGE,
  type AdminUserRole,
} from '@/fresh/data/rbac'

export function useActorRbac() {
  const { currentActor } = useFresh()
  const role = currentActor.role

  return {
    role,
    currentActor,
    canManageUsers: canManageUsers(role),
    canManageRoles: canManageRoles(role),
    canViewUserManagement: canViewUserManagement(role),
    permissionDeniedMessage: PERMISSION_DENIED_MESSAGE,
  }
}

export function usePermissionAction(role: AdminUserRole, action: 'manageUsers' | 'manageRoles') {
  const allowed =
    action === 'manageUsers' ? canManageUsers(role) : canManageRoles(role)
  return {
    allowed,
    message: PERMISSION_DENIED_MESSAGE,
  }
}
