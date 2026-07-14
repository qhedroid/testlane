import { drizzle, type MySql2Database } from 'drizzle-orm/mysql2'
import mysql from 'mysql2/promise'
import * as schema from '../schema'

export * from '../schema'

/**
 * The mysql2 pool + Drizzle client are stashed on globalThis so they survive
 * Next.js dev hot-reloads. Without this, every HMR re-evaluation of this module
 * would call mysql.createPool() again and leak the previous pool's open
 * connections, eventually exhausting MySQL's max_connections ("Too many
 * connections"). In production the module is evaluated once, so the global is
 * just a single shared instance.
 */
const globalForDb = globalThis as unknown as {
  __relayPool?: mysql.Pool
  __relayDb?: MySql2Database<typeof schema>
}

function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL
  if (!url) {
    throw new Error('DATABASE_URL environment variable is required')
  }
  return url
}

/** Lazily initialised Drizzle client backed by a single shared mysql2 pool. */
export function getDb(): MySql2Database<typeof schema> {
  if (!globalForDb.__relayDb) {
    const pool = mysql.createPool(getDatabaseUrl())
    globalForDb.__relayPool = pool
    globalForDb.__relayDb = drizzle(pool, { schema, mode: 'default' })
  }
  return globalForDb.__relayDb
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
  if (globalForDb.__relayPool) {
    await globalForDb.__relayPool.end()
    globalForDb.__relayPool = undefined
    globalForDb.__relayDb = undefined
  }
}
