import { ZodError } from 'zod'
import {
  RunCreationError,
  RunUpdateError,
  type RunCreationErrorCode,
  type RunUpdateErrorCode,
} from '@relay/db/services/test-run'
import {
  UpdateCaseResultError,
  type UpdateCaseResultErrorCode,
} from '@relay/db/services/execution'
import { RunReadError, type RunReadErrorCode } from '@relay/db/services/run-read'
import { UserServiceError, type UserServiceErrorCode } from '@relay/db/services/user'
import {
  ProjectServiceError,
  type ProjectServiceErrorCode,
} from '@relay/db/services/project'
import {
  TestCaseServiceError,
  type TestCaseServiceErrorCode,
} from '@relay/db/services/test-case'
import {
  RequirementServiceError,
  type RequirementServiceErrorCode,
} from '@relay/db/services/requirement'
import {
  TestPlanServiceError,
  type TestPlanServiceErrorCode,
} from '@relay/db/services/test-plan'
import {
  DashboardServiceError,
  type DashboardServiceErrorCode,
} from '@relay/db/services/dashboard'
import {
  DefectServiceError,
  type DefectServiceErrorCode,
} from '@relay/db/services/defect'
import {
  ProjectCloneError,
  type ProjectCloneErrorCode,
} from '@relay/db/services/project-clone'
import {
  AdminApiKeyServiceError,
  AdminRoleServiceError,
  type AdminApiKeyServiceErrorCode,
  type AdminRoleServiceErrorCode,
} from '@relay/db/services/admin-settings'
import { InsufficientPermissionsError } from '@relay/db/rbac/assert-min-role'
import { jsonError } from './response'

const RUN_CREATION_STATUS: Record<RunCreationErrorCode, number> = {
  INSUFFICIENT_PERMISSIONS: 403,
  PLAN_NOT_FOUND: 404,
  PLAN_ARCHIVED: 409,
  PLAN_EMPTY: 400,
  CASES_NOT_IN_PLAN: 400,
  CASES_UNAVAILABLE: 400,
  INVALID_ASSIGNEES: 400,
  DUPLICATE_RUN_REF: 409,
  REF_COUNTER_TIMEOUT: 503,
  TRANSACTION_FAILED: 500,
}

const RUN_UPDATE_STATUS: Record<RunUpdateErrorCode, number> = {
  RUN_NOT_FOUND: 404,
  TRANSACTION_FAILED: 500,
}

const RUN_READ_STATUS: Record<RunReadErrorCode, number> = {
  INSUFFICIENT_PERMISSIONS: 403,
  RUN_NOT_FOUND: 404,
}

const UPDATE_RESULT_STATUS: Record<UpdateCaseResultErrorCode, number> = {
  INSUFFICIENT_PERMISSIONS: 403,
  RUN_NOT_FOUND: 404,
  CASE_NOT_FOUND: 404,
  STEP_NOT_FOUND: 404,
  RUN_NOT_EXECUTABLE: 409,
  INVALID_STATUS: 400,
  TRANSACTION_FAILED: 500,
}

const USER_SERVICE_STATUS: Record<UserServiceErrorCode, number> = {
  INSUFFICIENT_PERMISSIONS: 403,
  EMAIL_TAKEN: 409,
  USER_NOT_FOUND: 404,
  LAST_ADMIN: 409,
}

const PROJECT_SERVICE_STATUS: Record<ProjectServiceErrorCode, number> = {
  INSUFFICIENT_PERMISSIONS: 403,
  DUPLICATE_SLUG: 409,
  PROJECT_NOT_FOUND: 404,
}

// Note: TestCaseService relies on the shared assertMinProjectRole() for RBAC
// (throws InsufficientPermissionsError, handled generically below) rather than
// its own INSUFFICIENT_PERMISSIONS code — every operation is project-scoped.
const TEST_CASE_SERVICE_STATUS: Record<TestCaseServiceErrorCode, number> = {
  PROJECT_NOT_FOUND: 404,
  FOLDER_NOT_FOUND: 404,
  CASE_NOT_FOUND: 404,
  STEP_NOT_FOUND: 404,
  DUPLICATE_CASE_REF: 409,
  REF_COUNTER_TIMEOUT: 503,
  TRANSACTION_FAILED: 500,
}

// Note: RequirementService relies on the shared assertMinProjectRole() for RBAC
// (throws InsufficientPermissionsError, handled generically below), same as
// TestCaseService/TestPlanService.
const REQUIREMENT_SERVICE_STATUS: Record<RequirementServiceErrorCode, number> = {
  PROJECT_NOT_FOUND: 404,
  CASE_NOT_FOUND: 404,
  REQUIREMENT_NOT_FOUND: 404,
  DUPLICATE_REQUIREMENT_REF: 409,
  REF_COUNTER_TIMEOUT: 503,
  TRANSACTION_FAILED: 500,
}

const TEST_PLAN_SERVICE_STATUS: Record<TestPlanServiceErrorCode, number> = {
  PROJECT_NOT_FOUND: 404,
  PLAN_NOT_FOUND: 404,
  CASES_UNAVAILABLE: 400,
  DUPLICATE_PLAN_REF: 409,
  REF_COUNTER_TIMEOUT: 503,
  TRANSACTION_FAILED: 500,
}

const DASHBOARD_SERVICE_STATUS: Record<DashboardServiceErrorCode, number> = {
  PROJECT_NOT_FOUND: 404,
}

// Note: DefectService relies on the shared assertMinProjectRole() for RBAC
// (throws InsufficientPermissionsError, handled generically below), same as
// TestCaseService/TestPlanService.
const DEFECT_SERVICE_STATUS: Record<DefectServiceErrorCode, number> = {
  PROJECT_NOT_FOUND: 404,
  RUN_NOT_FOUND: 404,
  CASE_NOT_FOUND: 404,
  LINK_NOT_FOUND: 404,
  ALREADY_UNLINKED: 409,
  DEFECT_NOT_FOUND: 404,
  DUPLICATE_DEFECT_REF: 409,
  REF_COUNTER_TIMEOUT: 503,
  TRANSACTION_FAILED: 500,
}

const PROJECT_CLONE_STATUS: Record<ProjectCloneErrorCode, number> = {
  PROJECT_NOT_FOUND: 404,
  INSUFFICIENT_PERMISSIONS: 403,
  DUPLICATE_SLUG: 409,
}

const ADMIN_ROLE_SERVICE_STATUS: Record<AdminRoleServiceErrorCode, number> = {
  INSUFFICIENT_PERMISSIONS: 403,
  ROLE_NOT_FOUND: 404,
  DUPLICATE_ROLE_NAME: 409,
  BUILT_IN_IMMUTABLE: 409,
}

const ADMIN_API_KEY_SERVICE_STATUS: Record<AdminApiKeyServiceErrorCode, number> = {
  INSUFFICIENT_PERMISSIONS: 403,
  API_KEY_NOT_FOUND: 404,
}

export function handleRouteError(err: unknown) {
  if (err instanceof ZodError) {
    return jsonError('VALIDATION_ERROR', 'Request validation failed', 400, err.flatten())
  }

  if (err instanceof RunReadError) {
    const status = RUN_READ_STATUS[err.code] ?? 500
    return jsonError(err.code, err.message, status)
  }

  if (err instanceof RunCreationError) {
    const status = RUN_CREATION_STATUS[err.code] ?? 500
    return jsonError(err.code, err.message, status)
  }

  if (err instanceof RunUpdateError) {
    const status = RUN_UPDATE_STATUS[err.code] ?? 500
    return jsonError(err.code, err.message, status)
  }

  if (err instanceof UpdateCaseResultError) {
    const status = UPDATE_RESULT_STATUS[err.code] ?? 500
    return jsonError(err.code, err.message, status)
  }

  if (err instanceof UserServiceError) {
    const status = USER_SERVICE_STATUS[err.code] ?? 500
    return jsonError(err.code, err.message, status)
  }

  if (err instanceof ProjectServiceError) {
    const status = PROJECT_SERVICE_STATUS[err.code] ?? 500
    return jsonError(err.code, err.message, status)
  }

  if (err instanceof TestCaseServiceError) {
    const status = TEST_CASE_SERVICE_STATUS[err.code] ?? 500
    return jsonError(err.code, err.message, status)
  }

  if (err instanceof RequirementServiceError) {
    const status = REQUIREMENT_SERVICE_STATUS[err.code] ?? 500
    return jsonError(err.code, err.message, status)
  }

  if (err instanceof TestPlanServiceError) {
    const status = TEST_PLAN_SERVICE_STATUS[err.code] ?? 500
    return jsonError(err.code, err.message, status)
  }

  if (err instanceof DashboardServiceError) {
    const status = DASHBOARD_SERVICE_STATUS[err.code] ?? 500
    return jsonError(err.code, err.message, status)
  }

  if (err instanceof DefectServiceError) {
    const status = DEFECT_SERVICE_STATUS[err.code] ?? 500
    return jsonError(err.code, err.message, status)
  }

  if (err instanceof ProjectCloneError) {
    const status = PROJECT_CLONE_STATUS[err.code] ?? 500
    return jsonError(err.code, err.message, status)
  }

  if (err instanceof AdminRoleServiceError) {
    const status = ADMIN_ROLE_SERVICE_STATUS[err.code] ?? 500
    return jsonError(err.code, err.message, status)
  }

  if (err instanceof AdminApiKeyServiceError) {
    const status = ADMIN_API_KEY_SERVICE_STATUS[err.code] ?? 500
    return jsonError(err.code, err.message, status)
  }

  // Fix (Phase 2): assertMinProjectRole() (reused directly by several services,
  // e.g. ProjectService.assignProjectRole, TestCaseService) throws this plain
  // error class, which previously had no branch here and fell through to a
  // misleading 500 INTERNAL_ERROR instead of a 403.
  if (err instanceof InsufficientPermissionsError) {
    return jsonError('INSUFFICIENT_PERMISSIONS', err.message, 403)
  }

  if (err instanceof Error && err.message === 'UNAUTHORIZED') {
    return jsonError(
      'UNAUTHORIZED',
      'Missing or invalid x-relay-user-id header',
      401,
    )
  }

  const message = err instanceof Error ? err.message : 'Internal server error'
  return jsonError('INTERNAL_ERROR', message, 500)
}
