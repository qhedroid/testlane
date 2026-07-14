import { pingDatabase } from '@testlane/db'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

type HealthStatus = 'ok' | 'error'

interface HealthResponse {
  status: 'ok' | 'degraded'
  app: HealthStatus
  mysql: HealthStatus
  timestamp: string
  error?: string
}

export async function GET(): Promise<NextResponse<HealthResponse>> {
  const timestamp = new Date().toISOString()
  let mysql: HealthStatus = 'ok'
  let mysqlError: string | undefined

  try {
    await pingDatabase()
  } catch (err) {
    mysql = 'error'
    mysqlError = err instanceof Error ? err.message : 'MySQL connection failed'
  }

  const body: HealthResponse = {
    status: mysql === 'ok' ? 'ok' : 'degraded',
    app: 'ok',
    mysql,
    timestamp,
    ...(mysqlError ? { error: mysqlError } : {}),
  }

  return NextResponse.json(body, {
    status: mysql === 'ok' ? 200 : 503,
  })
}
