import { initialAdminSettings, SEED_ADMIN_USER_ID } from './admin-initial-settings'
import { migrateUserAccessV12 } from './admin-reducer'
import { buildInitialDemoState } from './demo-seed'
import type { Case, DemoRun, DemoState, Folder, LegacyDemoState, Project } from './demo-model'
import { formatCaseKey } from './demo-model'
import {
  DEFAULT_SEED_PROJECT_ID,
  DEFAULT_SEED_PROJECT_KEY,
  DEMO_SCHEMA_VERSION,
  newId,
} from './demo-model'
import { migrateRunKeys } from './run-utils'
import { isProjectKeyUnique } from './project-selectors'
import { keyFromName } from '../lib/project-keys'
import { normalizeAssigneeName } from './team-users'

function mapAuthor(name: string): string {
  return normalizeAssigneeName(name) ?? name
}

/** One-time remap of legacy placeholder assignees in persisted demo state. */
function migrateAssignees(state: DemoState): DemoState {
  const cases = state.cases.map((c) => ({
    ...c,
    assignee: normalizeAssigneeName(c.assignee),
    steps: c.steps.map((s) => ({
      ...s,
      comments: s.comments.map((cm) => ({ ...cm, author: mapAuthor(cm.author) })),
    })),
    generalComments: c.generalComments.map((cm) => ({ ...cm, author: mapAuthor(cm.author) })),
  }))

  const runs = state.runs.map((r) => ({
    ...r,
    executions: Object.fromEntries(
      Object.entries(r.executions).map(([caseId, ex]) => [
        caseId,
        {
          ...ex,
          assignee: ex.assignee ? normalizeAssigneeName(ex.assignee) : ex.assignee,
        },
      ]),
    ),
  }))

  return { ...state, cases, runs }
}

function hasMultiProjectShape(state: LegacyDemoState): state is DemoState {
  return (
    !!state.projectsById &&
    !!state.activeProjectId &&
    !!state.currentRunIdByProject &&
    !!state.nextCaseNumByProject
  )
}

function ensureNextRunNumByProject(state: DemoState): DemoState {
  if (state.nextRunNumByProject) return state
  const nextRunNumByProject: Record<string, number> = {}
  for (const projectId of Object.keys(state.projectsById)) {
    nextRunNumByProject[projectId] = 1
  }
  return { ...state, nextRunNumByProject }
}

function migrateToMultiProject(raw: LegacyDemoState): DemoState {
  const projectId = newId('proj')
  const legacyName = raw.module?.trim()
  const isLegacySeedName = !legacyName || legacyName === 'TI-Core Platform'
  const projectName = isLegacySeedName ? 'Demo Project' : legacyName
  const project: Project = {
    id: projectId,
    name: projectName,
    key: isLegacySeedName ? DEFAULT_SEED_PROJECT_KEY : keyFromName(projectName),
    description: isLegacySeedName ? 'Default demo workspace with seed cases, folders, and runs.' : undefined,
    seedTemplate: isLegacySeedName ? 'demo' : undefined,
    activeCustomFieldIds: [],
    createdAt: new Date().toISOString(),
  }

  const folders: Folder[] = (raw.folders ?? []).map((f) => ({
    ...f,
    projectId: f.projectId ?? projectId,
  }))
  const cases: Case[] = (raw.cases ?? []).map((c) => ({
    ...c,
    projectId: c.projectId ?? projectId,
  }))
  const runs: DemoRun[] = (raw.runs ?? []).map((r) => ({
    ...r,
    projectId: r.projectId ?? projectId,
  }))

  const legacyRunId = raw.currentRunId ?? runs[0]?.id ?? ''
  const legacyNextCaseNum = raw.nextCaseNum ?? 1

  return {
    schemaVersion: DEMO_SCHEMA_VERSION,
    projectsById: { [projectId]: project },
    activeProjectId: projectId,
    folders,
    cases,
    runs,
    currentRunIdByProject: { [projectId]: legacyRunId },
    nextCaseNumByProject: { [projectId]: legacyNextCaseNum },
    nextRunNumByProject: { [projectId]: 1 },
    adminSettings: initialAdminSettings,
    currentActorUserId: SEED_ADMIN_USER_ID,
  }
}

function ensureUniqueKey(state: DemoState, key: string, projectId: string): string {
  let candidate = key.toUpperCase()
  let n = 2
  while (!isProjectKeyUnique({ ...state, projectsById: { ...state.projectsById } }, candidate, projectId)) {
    candidate = `${key.toUpperCase()}_${n}`
    n += 1
  }
  return candidate
}

function isClonedDemoKey(key: string | undefined): boolean {
  return /^DP\d+$/i.test(key ?? '')
}

function isLegacyDemoKey(key: string | undefined): boolean {
  const k = (key ?? '').toUpperCase()
  return k === 'DEMO' || k === DEFAULT_SEED_PROJECT_KEY
}

function migrateProjectProperties(state: DemoState): DemoState {
  const projectsById: Record<string, Project> = {}

  for (const [id, project] of Object.entries(state.projectsById)) {
    const isInitialSeed =
      id === DEFAULT_SEED_PROJECT_ID ||
      project.name === 'TI-Core Platform' ||
      project.key?.toLowerCase() === 'ti-core' ||
      (project.name === 'Demo Project' && isLegacyDemoKey(project.key))

    let key = (isInitialSeed ? DEFAULT_SEED_PROJECT_KEY : project.key ?? keyFromName(project.name)).toUpperCase()
    if (!isInitialSeed && key === 'DEMO') {
      key = DEFAULT_SEED_PROJECT_KEY
    }

    const name =
      isInitialSeed || project.name === 'TI-Core Platform' ? 'Demo Project' : project.name

    const seedTemplate =
      project.seedTemplate ?? (isInitialSeed || isClonedDemoKey(key) ? ('demo' as const) : undefined)

    let next: Project = {
      ...project,
      name,
      key,
      description: project.description,
      seedTemplate,
    }

    if (isInitialSeed && !next.description) {
      next.description = 'Default demo workspace with seed cases, folders, and runs.'
    }

    next.key = ensureUniqueKey(state, next.key, id)
    projectsById[id] = next
  }

  return { ...state, schemaVersion: DEMO_SCHEMA_VERSION, projectsById }
}

function ensureActiveProject(state: DemoState): DemoState {
  if (state.projectsById[state.activeProjectId]) return state

  const ids = Object.keys(state.projectsById)
  if (ids.length > 0) {
    console.warn('[relay-demo] activeProjectId missing; falling back to first project')
    return { ...state, activeProjectId: ids[0] }
  }

  console.warn('[relay-demo] No projects in state; re-seeding default project')
  return buildInitialDemoState()
}

function ensureEntityProjectIds(state: DemoState): DemoState {
  const activeId = state.activeProjectId
  const folders = state.folders.map((f) => (f.projectId ? f : { ...f, projectId: activeId }))
  const cases = state.cases.map((c) => (c.projectId ? c : { ...c, projectId: activeId }))
  const runs = state.runs.map((r) => (r.projectId ? r : { ...r, projectId: activeId }))
  return { ...state, folders, cases, runs }
}

function migrateAdminSettings(state: DemoState): DemoState {
  if (state.adminSettings) return state
  return {
    ...state,
    adminSettings: initialAdminSettings,
    schemaVersion: DEMO_SCHEMA_VERSION,
  }
}

function migrateProjectCustomFields(state: DemoState): DemoState {
  const projectsById: Record<string, Project> = {}
  for (const [id, project] of Object.entries(state.projectsById)) {
    projectsById[id] = {
      ...project,
      activeCustomFieldIds: project.activeCustomFieldIds ?? [],
    }
  }
  return { ...state, projectsById, schemaVersion: 6 }
}

/** Migrate persisted localStorage state to the current schema. Never throws. */
export function migrateDemoState(raw: unknown): DemoState {
  try {
    const legacy = raw as LegacyDemoState
    let state: DemoState = hasMultiProjectShape(legacy) ? (legacy as DemoState) : migrateToMultiProject(legacy)
    state = migrateAssignees(state)
    state = migrateProjectProperties(state)
    state = ensureEntityProjectIds(state)
    state = ensureActiveProject(state)
    state = ensureNextRunNumByProject(state)
    if (state.schemaVersion < DEMO_SCHEMA_VERSION || state.runs.some((r) => !r.runKey)) {
      state = migrateRunKeys(state)
    }
    state = migrateAdminSettings(state)
    if (state.schemaVersion < 6) {
      state = migrateProjectCustomFields(state)
    }
    // v6 → v7: add template, references, summary, customFieldValues to existing cases
    if (state.schemaVersion < 7) {
      state = {
        ...state,
        cases: state.cases.map((c) => ({
          ...c,
          template: c.template ?? 'text',
          references: c.references ?? '',
          summary: c.summary ?? '',
          customFieldValues: c.customFieldValues ?? {},
        })),
        schemaVersion: 7,
      }
    }
    // v7 → v8: assign caseKey to cases that are missing it
    if (state.schemaVersion < 8) {
      const counterByProject: Record<string, number> = { ...state.nextCaseNumByProject }
      state = {
        ...state,
        cases: state.cases.map((c) => {
          if (c.caseKey) return c
          const num = counterByProject[c.projectId] ?? 1
          counterByProject[c.projectId] = num + 1
          return { ...c, caseKey: formatCaseKey(num) }
        }),
        nextCaseNumByProject: counterByProject,
        schemaVersion: 8,
      }
    }
    // v8 → v9: replace collision-prone TC-NNNN case ids with globally unique ids.
    // nextCaseId() used TC-${1000+num} — always exactly 4 digits, e.g. TC-1001.
    // Multiple projects starting at counter 1 all produce the same ids, causing
    // REPLACE_CASE to corrupt cases across projects. Reassign with newId('case').
    if (state.schemaVersion < 9) {
      const idMap = new Map<string, string>()
      const cases = state.cases.map((c) => {
        if (/^TC-\d{4}$/.test(c.id)) {
          const freshId = newId('case')
          idMap.set(c.id, freshId)
          return { ...c, id: freshId }
        }
        return c
      })
      const runs = idMap.size === 0 ? state.runs : state.runs.map((r) => ({
        ...r,
        caseOrder: r.caseOrder.map((id) => idMap.get(id) ?? id),
        executions: Object.fromEntries(
          Object.entries(r.executions).map(([caseId, ex]) => [idMap.get(caseId) ?? caseId, ex]),
        ),
      }))
      state = { ...state, cases, runs, schemaVersion: 9 }
    }
    // v9 → v10: add executionLog to runs; add resultNotes/testedAt/testedBy to executions
    if (state.schemaVersion < 10) {
      state = {
        ...state,
        runs: state.runs.map((r) => ({
          ...r,
          executionLog: r.executionLog ?? [],
          executions: Object.fromEntries(
            Object.entries(r.executions).map(([caseId, ex]) => [
              caseId,
              {
                ...ex,
                resultNotes: ex.resultNotes ?? '',
                testedAt: ex.testedAt ?? undefined,
                testedBy: ex.testedBy ?? undefined,
              },
            ]),
          ),
        })),
        schemaVersion: 10,
      }
    }
    // v10 → v11: add createdAt to cases (proxy from updatedAt for existing cases)
    if (state.schemaVersion < 11) {
      state = {
        ...state,
        cases: state.cases.map((c) => ({
          ...c,
          createdAt: c.createdAt ?? c.updatedAt,
        })),
        schemaVersion: 11,
      }
    }
    // v11 → v12: user/role access MVP — permissions, actor, silent invite statuses
    if (state.schemaVersion < 12) {
      state = migrateUserAccessV12(state)
    }
    if (state.schemaVersion < DEMO_SCHEMA_VERSION) {
      state = { ...state, schemaVersion: DEMO_SCHEMA_VERSION }
    }
    return state
  } catch (err) {
    console.error('[relay-demo] Migration failed; resetting to seeded default state:', err)
    return buildInitialDemoState()
  }
}
