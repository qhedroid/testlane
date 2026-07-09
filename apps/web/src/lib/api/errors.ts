import { ZodError } from 'zod'
import {
  RunCreationError,
  type RunCreationErrorCode,
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

const RUN_READ_STATUS: Record<RunReadErrorCode, number> = {
  INSUFFICIENT_PERMISSIONS: 403,
  RUN_NOT_FOUND: 404,
}

const UPDATE_RESULT_STATUS: Record<UpdateCaseResultErrorCode, number> = {
  INSUFFICIENT_PERMISSIONS: 403,
  RUN_NOT_FOUND: 404,
  CASE_NOT_FOUND: 404,
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
