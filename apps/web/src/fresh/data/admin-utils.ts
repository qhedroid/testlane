import type { AdminSettings, AuditLogEntry, DemoState } from './demo-model'
import { newId } from './demo-model'

const ALPHA = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
const ALPHANUM = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'

export function generateMaskedApiKey(): string {
  const a = ALPHA[Math.floor(Math.random() * ALPHA.length)]
  const b = ALPHA[Math.floor(Math.random() * ALPHA.length)]
  let mid = ''
  for (let i = 0; i < 4; i += 1) {
    mid += ALPHANUM[Math.floor(Math.random() * ALPHANUM.length)]
  }
  return `${a}${b}${mid}***`
}

export function auditByUser(state: DemoState): string {
  return state.adminSettings.profile.displayName
}

export function appendAuditEntry(
  settings: AdminSettings,
  entry: Omit<AuditLogEntry, 'id' | 'timestamp'>,
  byUser?: string,
): AdminSettings {
  const audit: AuditLogEntry = {
    ...entry,
    byUser: byUser ?? entry.byUser,
    id: newId('audit'),
    timestamp: Date.now(),
  }
  return {
    ...settings,
    auditLog: [audit, ...settings.auditLog],
  }
}

export function withAdminSettings(state: DemoState, settings: AdminSettings): DemoState {
  return { ...state, adminSettings: settings }
}

export function formatRelativeTimestamp(ts: number): string {
  const diff = Date.now() - ts
  const secs = Math.floor(diff / 1000)
  if (secs < 60) return secs < 10 ? 'Just now' : `${secs} seconds ago`
  const mins = Math.floor(secs / 60)
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'} ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? '' : 's'} ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  const weeks = Math.floor(days / 7)
  if (weeks < 5) return `${weeks} week${weeks === 1 ? '' : 's'} ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' })
}

export function formatUserLastLogin(ts: number): string {
  const diff = Date.now() - ts
  if (diff < 2 * 60_000) return 'Just now'
  return formatRelativeTimestamp(ts)
}

export function expirationLabel(value: string): string {
  switch (value) {
    case 'none': return 'No expiration'
    case '30': return '30 days'
    case '90': return '90 days'
    case '365': return '1 year'
    default: return value
  }
}
