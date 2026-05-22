import { NextResponse } from 'next/server'
import type { ApiErrorBody, ApiSuccessBody } from './types'

export function jsonSuccess<T>(data: T, status = 200): NextResponse<ApiSuccessBody<T>> {
  return NextResponse.json({ data }, { status })
}

export function jsonError(
  code: string,
  message: string,
  status: number,
  details?: unknown,
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    {
      error: {
        code,
        message,
        ...(details !== undefined ? { details } : {}),
      },
    },
    { status },
  )
}
