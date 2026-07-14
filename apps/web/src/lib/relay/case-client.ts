/**
 * case-client.ts
 *
 * Real-backend test case + folder CRUD for the Cases screen-wiring pass
 * (mvp-backend). Mirrors project-client.ts's pattern: nested
 * /api/projects/[projectId]/{cases,folders}/* routes, real NextAuth session
 * cookie auth (resolveSessionActor server-side) — no x-relay-user-id header.
 *
 * This file also owns the frontend<->backend model adapters the Phase 2
 * screen-wiring note in docs/claude/mvp-backend/progress.md called out:
 *
 *   - priority/type casing: DB enums are lowercase ('critical', 'functional');
 *     the fresh app's Case model uses Capitalized strings ('Critical',
 *     'Functional'). Converted both directions here.
 *   - assignee (free-text display name) <-> assignedTo (real users.id ULID):
 *     resolved via a static map of the 8 seed users (IDs from
 *     packages/db/src/seed/ids.ts — stable ULIDs, documented there as safe to
 *     reference). Names that aren't one of the 8 seed users are sent as null
 *     (the server has no matching users row to point at).
 *   - caseKey: the server's caseRef ('TC-1005', unpadded) is used directly as
 *     the frontend caseKey — deliberately NOT reformatted to the local
 *     prototype's zero-padded 'TC-00001' convention (see TestCaseService.ts's
 *     file header for why the DB convention wins).
 *   - temp local ids: the fresh app's optimistic creates use newId() ids like
 *     'case-1720000000-1', which fail the API's 26-char ULID validation.
 *     isRealId() lets callers (FreshProvider) detect and strip/remap them
 *     before a request goes out. Step ids that aren't ULIDs are silently
 *     omitted from write bodies (the server generates fresh ULIDs for them).
 */

import type { Case, CaseStep, Folder } from '@/fresh/data/demo-model'
import { LEGACY_TO_PRIORITY, PRIORITY_TO_LEGACY, type CasePriority, type Priority } from '@/fresh/data/demo-model'
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

// ---------------------------------------------------------------------------
// Server DTO shapes (JSON-serialised CaseDetail / FolderSummary from
// packages/db/services/TestCaseService.ts — Dates arrive as ISO strings)
// ---------------------------------------------------------------------------

export type RealCasePriority = 'critical' | 'high' | 'medium' | 'low'
export type RealCaseType = 'functional' | 'smoke' | 'regression' | 'integration' | 'security'

export interface RealFolder {
  id: string
  projectId: string
  parentId: string | null
  name: string
  description: string | null
  position: number
}

export interface RealCaseStep {
  id: string
  position: number
  action: string
  expectedResult: string | null
}

/**
 * A comment on a case definition (new-tables candidate, Phase C — JSON-
 * serialised CaseCommentIO from TestCaseService.ts; createdAt is an ISO string).
 * testCaseStepId null => general/case-level comment; non-null => step comment.
 */
export interface RealCaseComment {
  id: string
  testCaseStepId: string | null
  authorId: string | null
  body: string
  createdAt: string
}

export interface RealCase {
  id: string
  caseRef: string
  projectId: string
  folderId: string | null
  title: string
  priority: RealCasePriority
  type: RealCaseType
  assignedTo: string | null
  isArchived: boolean
  position: number
  stepCount: number
  createdAt: string
  updatedAt: string
  preconditions: string | null
  description: string | null
  automationStatus: 'manual' | 'automated' | 'semi_automated'
  tags: string[]
  createdBy: string | null
  steps: RealCaseStep[]
  comments: RealCaseComment[]
  /** Linked requirement ids (new-tables candidate, Phase D). */
  requirementIds: string[]
}

export interface CreateRealCaseBody {
  folderId?: string | null
  title: string
  priority?: RealCasePriority
  type?: RealCaseType
  preconditions?: string
  description?: string
  tags?: string[]
  assignedTo?: string | null
  steps?: Array<{ id?: string; action: string; expectedResult?: string | null }>
}

export interface UpdateRealCaseBody {
  folderId?: string | null
  title?: string
  priority?: RealCasePriority
  type?: RealCaseType
  preconditions?: string | null
  description?: string | null
  tags?: string[]
  assignedTo?: string | null
  isArchived?: boolean
  steps?: Array<{ id?: string; action: string; expectedResult?: string | null }>
}

// ---------------------------------------------------------------------------
// Fetch functions
// ---------------------------------------------------------------------------

export async function fetchRealFolders(projectId: string): Promise<RealFolder[]> {
  const data = await parseResponse<{ folders: RealFolder[] }>(
    await fetch(`/api/projects/${projectId}/folders`, { credentials: 'same-origin' }),
  )
  return data.folders
}

/** Archived cases are excluded by default — matches the local model, where
 * deleteCase() removes the case from state entirely (the server archives). */
export async function fetchRealCases(projectId: string): Promise<RealCase[]> {
  const data = await parseResponse<{ cases: RealCase[] }>(
    await fetch(`/api/projects/${projectId}/cases`, { credentials: 'same-origin' }),
  )
  return data.cases
}

export async function createRealCase(projectId: string, body: CreateRealCaseBody): Promise<RealCase> {
  return parseResponse<RealCase>(
    await fetch(`/api/projects/${projectId}/cases`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

export async function updateRealCase(
  projectId: string,
  caseId: string,
  body: UpdateRealCaseBody,
): Promise<RealCase> {
  return parseResponse<RealCase>(
    await fetch(`/api/projects/${projectId}/cases/${caseId}`, {
      method: 'PATCH',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

/** Server-side this archives (is_archived = true) rather than hard-deleting —
 * see TestCaseService.ts. The local reducer still removes the case from state. */
export async function archiveRealCase(projectId: string, caseId: string): Promise<void> {
  await parseResponse<{ ok: boolean }>(
    await fetch(`/api/projects/${projectId}/cases/${caseId}`, {
      method: 'DELETE',
      credentials: 'same-origin',
    }),
  )
}

export async function createRealFolder(
  projectId: string,
  body: { name: string; parentId?: string | null; description?: string },
): Promise<RealFolder> {
  return parseResponse<RealFolder>(
    await fetch(`/api/projects/${projectId}/folders`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

/**
 * Add a comment to a case definition (new-tables candidate, Phase C).
 * `stepId` null/omitted => a general/case-level comment; a step id => a step
 * comment. The author is the session actor server-side — never sent here.
 * Returns the created RealCaseComment (real id + resolved createdAt/authorId).
 */
export async function addRealCaseComment(
  projectId: string,
  caseId: string,
  body: { stepId?: string | null; body: string },
): Promise<RealCaseComment> {
  return parseResponse<RealCaseComment>(
    await fetch(`/api/projects/${projectId}/cases/${caseId}/comments`, {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }),
  )
}

// ---------------------------------------------------------------------------
// Seed user id <-> display name map
//
// Static by design (per the screen-wiring plan): the fresh app models
// assignees as free-text display names (team-users.ts's 8-name roster), the
// DB models them as users.id FKs. A real name->id lookup endpoint is future
// work (Admin unification / Phase 7); until then this map covers exactly the
// seeded roster. IDs are the stable seed ULIDs from packages/db/src/seed/ids.ts
// (keyed there as noel/shaun/priya/marcus/james/viewer/nadim/syed — the
// key names predate the 2026-07-09 seed-user rename; the display names below
// are the *current* names from packages/db/src/seed/insert.ts).
// ---------------------------------------------------------------------------

export const SEED_USER_NAME_BY_ID: Record<string, string> = {
  '01SEED00000000000000000002': 'Noel Quadri',
  '01SEED00000000000000000003': 'Shaun Sevume',
  '01SEED00000000000000000004': 'Monica Dayalani',
  '01SEED00000000000000000005': 'Nasir Dipto',
  '01SEED00000000000000000006': 'Jamil Khan',
  '01SEED00000000000000000007': 'Arvindh Chandran',
  '01SEED00000000000000000008': 'Nadim Sharif',
  '01SEED00000000000000000009': 'Syed Ahmed',
}

const SEED_USER_ID_BY_NAME: Record<string, string> = Object.fromEntries(
  Object.entries(SEED_USER_NAME_BY_ID).map(([id, name]) => [name.toLowerCase(), id]),
)

export function assigneeNameToUserId(name: string | undefined | null): string | null {
  if (!name) return null
  return SEED_USER_ID_BY_NAME[name.trim().toLowerCase()] ?? null
}

export function userIdToAssigneeName(userId: string | null): string | undefined {
  if (!userId) return undefined
  return SEED_USER_NAME_BY_ID[userId]
}

// ---------------------------------------------------------------------------
// Adapters
// ---------------------------------------------------------------------------

/** True if `id` looks like a real 26-char DB ULID (vs a local newId() temp id
 * like 'case-1720000000000-1'). Matches the API's zod `ulid` check (length 26;
 * temp ids always contain '-' separators so they can never be 26 plain chars). */
export function isRealId(id: string | null | undefined): id is string {
  return typeof id === 'string' && /^[0-9A-Za-z]{26}$/.test(id)
}

const REAL_CASE_TYPES: readonly RealCaseType[] = [
  'functional',
  'smoke',
  'regression',
  'integration',
  'security',
]

/** Frontend Case.type is a free-form Capitalized string ('Functional', …);
 * the DB enum is lowercase and closed. Unknown values fall back to
 * 'functional' rather than failing the request. */
export function toRealCaseType(type: string | undefined): RealCaseType {
  const lower = (type ?? '').trim().toLowerCase()
  return (REAL_CASE_TYPES as readonly string[]).includes(lower)
    ? (lower as RealCaseType)
    : 'functional'
}

export function toLocalCaseType(type: RealCaseType): string {
  return type.charAt(0).toUpperCase() + type.slice(1)
}

export function toRealPriority(priority: CasePriority | undefined): RealCasePriority {
  return PRIORITY_TO_LEGACY[priority ?? 'Medium'] ?? 'medium'
}

export function toLocalPriority(priority: RealCasePriority): CasePriority {
  return LEGACY_TO_PRIORITY[priority as Priority] ?? 'Medium'
}

export function realFolderToLocal(f: RealFolder): Folder {
  return {
    id: f.id,
    projectId: f.projectId,
    name: f.name,
    parentId: f.parentId,
  }
}

/** Map a server case comment onto the local StepComment/CaseComment shape
 * (identical structure). authorId -> display name via the seed-user map;
 * an author outside the seeded roster (or a null FK after user deletion)
 * falls back to 'Unknown'. */
function realCommentToLocal(cm: RealCaseComment): { id: string; author: string; createdAt: string; body: string } {
  return {
    id: cm.id,
    author: userIdToAssigneeName(cm.authorId) ?? 'Unknown',
    createdAt: cm.createdAt,
    body: cm.body,
  }
}

/** Server CaseDetail -> frontend Case. Comments (general + per-step, Phase C)
 * and requirement links (Phase D) are now server-backed and mapped here. The
 * remaining local-only fields (custom field values, references, template) come
 * back empty — FreshProvider's sync reducer merges those in from any existing
 * local copy of the same case. */
export function realCaseToLocal(c: RealCase): Case {
  const commentsByStep = new Map<string, ReturnType<typeof realCommentToLocal>[]>()
  const generalComments: ReturnType<typeof realCommentToLocal>[] = []
  for (const cm of c.comments) {
    if (cm.testCaseStepId == null) {
      generalComments.push(realCommentToLocal(cm))
    } else {
      const list = commentsByStep.get(cm.testCaseStepId) ?? []
      list.push(realCommentToLocal(cm))
      commentsByStep.set(cm.testCaseStepId, list)
    }
  }
  return {
    id: c.id,
    caseKey: c.caseRef,
    projectId: c.projectId,
    title: c.title,
    folderId: c.folderId,
    priority: toLocalPriority(c.priority),
    type: toLocalCaseType(c.type),
    preconditions: c.preconditions ?? undefined,
    summary: c.description ?? undefined,
    steps: c.steps.map(
      (s): CaseStep => ({
        id: s.id,
        action: s.action,
        expected: s.expectedResult ?? '',
        comments: commentsByStep.get(s.id) ?? [],
      }),
    ),
    generalComments,
    tags: c.tags,
    updatedAt: c.updatedAt,
    createdAt: c.createdAt,
    assignee: userIdToAssigneeName(c.assignedTo),
    requirementIds: c.requirementIds ?? [],
  }
}

/** Map local steps to the API step shape. Non-ULID (temp) step ids are
 * omitted so the server generates fresh ones; steps with an empty action are
 * dropped from the request entirely (the API rejects them with a 400 — they
 * stay local-only until given an action). */
function localStepsToReal(steps: CaseStep[]): Array<{ id?: string; action: string; expectedResult?: string | null }> {
  return steps
    .filter((s) => s.action.trim().length > 0)
    .map((s) => ({
      ...(isRealId(s.id) ? { id: s.id } : {}),
      action: s.action,
      expectedResult: s.expected.trim().length > 0 ? s.expected : null,
    }))
}

function cleanTags(tags: string[] | undefined): string[] {
  return (tags ?? []).map((t) => t.trim()).filter(Boolean)
}

/**
 * Build the POST /cases body from the local optimistic-create data.
 * `resolveFolderId` maps a (possibly temp) local folder id to its real ULID,
 * returning undefined when it can't — in which case the case is created
 * Unfiled server-side (the folder reference heals on the next full save/sync).
 */
export function localCaseToCreateBody(
  data: Pick<Case, 'title' | 'folderId' | 'priority' | 'type' | 'preconditions' | 'steps'> &
    Partial<Pick<Case, 'tags' | 'assignee' | 'summary'>>,
  resolveFolderId: (id: string) => string | undefined,
): CreateRealCaseBody {
  const realFolderId = data.folderId ? resolveFolderId(data.folderId) : undefined
  return {
    ...(realFolderId ? { folderId: realFolderId } : {}),
    title: data.title,
    priority: toRealPriority(data.priority),
    type: toRealCaseType(data.type),
    ...(data.preconditions?.trim() ? { preconditions: data.preconditions } : {}),
    ...(data.summary?.trim() ? { description: data.summary } : {}),
    tags: cleanTags(data.tags),
    assignedTo: assigneeNameToUserId(data.assignee),
    steps: localStepsToReal(data.steps ?? []),
  }
}

/**
 * Build a PATCH /cases/[caseId] body from a partial local patch (also used
 * for replaceCase's whole-object save — a full Case is just a patch with
 * every key present). Returns null when the patch touches only local-only
 * fields (comments, custom fields, requirement links, …) so callers can skip
 * the request entirely.
 */
export function localCasePatchToUpdateBody(
  patch: Partial<Case>,
  resolveFolderId: (id: string) => string | undefined,
): UpdateRealCaseBody | null {
  const body: UpdateRealCaseBody = {}
  if (patch.title !== undefined && patch.title.trim().length > 0) body.title = patch.title
  if ('folderId' in patch) {
    if (patch.folderId == null) {
      body.folderId = null
    } else {
      const real = resolveFolderId(patch.folderId)
      // Unresolvable temp folder id: leave folderId out of the request rather
      // than mis-filing the case — heals on the next save/sync.
      if (real) body.folderId = real
    }
  }
  if (patch.priority !== undefined) body.priority = toRealPriority(patch.priority)
  if (patch.type !== undefined) body.type = toRealCaseType(patch.type)
  if ('preconditions' in patch) body.preconditions = patch.preconditions?.trim() ? patch.preconditions : null
  if ('summary' in patch) body.description = patch.summary?.trim() ? patch.summary : null
  if ('tags' in patch) body.tags = cleanTags(patch.tags)
  if ('assignee' in patch) body.assignedTo = assigneeNameToUserId(patch.assignee)
  if (patch.steps !== undefined) body.steps = localStepsToReal(patch.steps)
  return Object.keys(body).length > 0 ? body : null
}
