/**
 * admin-api-key-client.ts
 *
 * Real-backend Admin API keys for the Admin panel wiring (new-tables candidate,
 * Phase G). Targets /api/admin/api-keys/* (real NextAuth session cookie auth,
 * global-admin-gated server-side — the panel falls back to the local mock on a
 * 403, same as user-client.ts). API keys are org-scoped, not project-scoped.
 *
 * Faithful round-trip of the frontend AdminApiKey model (demo-model.ts):
 *   - maskedKey <-> the server's key_masked column. The stored value is the same
 *     already-masked display string the frontend generates (generateMaskedApiKey)
 *     — NOT a real secret. Real API-key secret management (hashing / one-time
 *     reveal) is out of scope for this branch.
 *   - project / permissions / expiration are display strings, stored verbatim.
 *   - createdAt: server Date (ISO string) <-> local epoch-ms number.
 *   - userId <-> created_by (a real users.id). After the user sync, the current
 *     actor's id is a real ULID, so newly-created keys carry a resolvable userId;
 *     server keys with a null created_by fall back to SEED_ADMIN_USER_ID (the
 *     local "Demo User"), same best-effort as the assignee mapping elsewhere.
 */

import type { AdminApiKey } from '@/fresh/data/demo-model'
import { SEED_ADMIN_USER_ID } from '@/fresh/data/admin-initial-settings'
import type { ApiErrorBody, ApiSuccessBody } from '@/lib/api/types'
import { RelayApiError } from './project-client'

async function parseResponse<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiSuccessBody<T> | ApiErrorBody
  if (!res.ok) {
    const err = 'error' in json ? json.error : { code: 'UNKNOWN', message: res.statusText }
    throw new RelayApiError(err.code, err.message)
  }
  return (json as ApiSuccessBody<T>).data
}

/** JSON-serialised ApiKeySummary from AdminSettingsService.ts. */
export interface RealApiKey {
  id: string
  name: string
  keyMasked: string
  project: string
  permissions: string
  expiration: string
  createdBy: string | null
  createdAt: string
}

export interface CreateRealApiKeyBody {
  name: string
  keyMasked: string
  project: string
  permissions: string
  expiration: string
  createdBy?: string | null
}

export async function fetchRealApiKeys(): Promise<RealApiKey[]> {
  const data = await parseResponse<{ apiKeys: RealApiKey[] }>(
    await fetch('/api/admin/api-keys', { credentials: 'same-origin' }),
  )
  return data.apiKeys
}

export async function createRealApiKey(body: CreateRealApiKeyBody): Promise<RealApiKey> {
  return parseResponse<RealApiKey>(
    await fetch('/api/admin/api-keys', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

export async function deleteRealApiKey(keyId: string): Promise<void> {
  await parseResponse<{ id: string }>(
    await fetch(`/api/admin/api-keys/${keyId}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    }),
  )
}

// ---------------------------------------------------------------------------
// Adapters
// ---------------------------------------------------------------------------

/** Server ApiKeySummary -> frontend AdminApiKey. */
export function realApiKeyToLocal(k: RealApiKey): AdminApiKey {
  return {
    id: k.id,
    name: k.name,
    maskedKey: k.keyMasked,
    project: k.project,
    permissions: k.permissions,
    expiration: k.expiration,
    createdAt: new Date(k.createdAt).getTime(),
    userId: k.createdBy ?? SEED_ADMIN_USER_ID,
  }
}
