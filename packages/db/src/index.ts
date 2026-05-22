import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from '../schema'

export * from '../schema'

let pool: mysql.Pool | null = null
let dbInstance: MySql2Database<typeof schema> | null = null

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL environment variable is required')
  }
  return url
}

/** Lazily initialised Drizzle client backed by a mysql2 connection pool. */
export function getDb(): MySql2Database<typeof schema> {
  if (!dbInstance) {
    pool = mysql.createPool(getDatabaseUrl())
    dbInstance = drizzle(pool, { schema, mode: 'default' })
  }
  return dbInstance
}

/** Convenience export used by application code. */
export const db = new Proxy({} as MySql2Database<typeof schema>, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop)
  },
})

/** Verify MySQL connectivity without requiring migrated schema. */
export async function pingDatabase(): Promise<void> {
  const connection = await mysql.createConnection(getDatabaseUrl())
  try {
    await connection.query('SELECT 1')
  } finally {
    await connection.end()
  }
}

/** Close the shared pool (for graceful shutdown in tests or scripts). */
export { resolveUserById } from './auth/resolve-user'
export { getRunProjectId } from './runs/lookup'
export {
  getRunDetail,
  listProjectRuns,
  RunReadError,
  type CaseCountSummary,
  type RunDetail,
  type RunListItem,
} from './runs/read'

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end()
    pool = null
    dbInstance = null
  }
}
