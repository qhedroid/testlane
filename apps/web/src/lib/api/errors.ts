import { ZodError } from 'zod'
import {
  RunCreationError,
  type RunCreationErrorCode,
} from '@relay/db/services/test-run'
import {
  UpdateCaseResultError,
  type UpdateCaseResultErrorCode,
} from '@relay/db/services/execution'
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

const UPDATE_RESULT_STATUS: Record<UpdateCaseResultErrorCode, number> = {
  INSUFFICIENT_PERMISSIONS: 403,
  RUN_NOT_FOUND: 404,
  CASE_NOT_FOUND: 404,
  RUN_NOT_EXECUTABLE: 409,
  INVALID_STATUS: 400,
  TRANSACTION_FAILED: 500,
}

export function handleRouteError(err: unknown) {
  if (err instanceof ZodError) {
    return jsonError('VALIDATION_ERROR', 'Request validation failed', 400, err.flatten())
  }

  if (err instanceof RunCreationError) {
    const status = RUN_CREATION_STATUS[err.code] ?? 500
    return jsonError(err.code, err.message, status)
  }

  if (err instanceof UpdateCaseResultError) {
    const status = UPDATE_RESULT_STATUS[err.code] ?? 500
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
