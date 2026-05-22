import {
  RELAY_DEV_ACTOR_ID,
  RELAY_PROJECT_ID,
  RELAY_USER_HEADER,
} from './config'
import type { ApiErrorBody, ApiSuccessBody } from '@/lib/api/types'
import type { CaseResultStatusInput, RunDetail, RunListItem } from './types'

export class RelayApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'RelayApiError'
  }
}

async function parseResponse<T>(res: Response): Promise<T> {
  const json = (await res.json()) as ApiSuccessBody<T> | ApiErrorBody
  if (!res.ok) {
    const err = 'error' in json ? json.error : { code: 'UNKNOWN', message: res.statusText }
    throw new RelayApiError(err.code, err.message)
  }
  return (json as ApiSuccessBody<T>).data
}

function actorHeaders(): HeadersInit {
  return {
    [RELAY_USER_HEADER]: RELAY_DEV_ACTOR_ID,
  }
}

export async function fetchRunList(
  projectId = RELAY_PROJECT_ID,
  limit = 20,
): Promise<RunListItem[]> {
  const params = new URLSearchParams({
    projectId,
    limit: String(limit),
  })
  const data = await parseResponse<{ runs: RunListItem[] }>(
    await fetch(`/api/runs?${params}`, { headers: actorHeaders() }),
  )
  return data.runs
}

export async function fetchRunDetail(
  runId: string,
  projectId = RELAY_PROJECT_ID,
): Promise<RunDetail> {
  const params = new URLSearchParams({ projectId })
  return parseResponse<RunDetail>(
    await fetch(`/api/runs/${runId}?${params}`, { headers: actorHeaders() }),
  )
}

export async function updateCaseResult(
  runId: string,
  testRunCaseId: string,
  status: CaseResultStatusInput,
): Promise<void> {
  await parseResponse<unknown>(
    await fetch(`/api/runs/${runId}/cases/${testRunCaseId}/result`, {
      method: 'POST',
      headers: {
        ...actorHeaders(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ status }),
    }),
  )
}
