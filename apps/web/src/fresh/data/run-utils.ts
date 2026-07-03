import type { DemoRun, DemoState } from './demo-model'
import { formatRunKey } from './demo-model'
import { RUN_PICKER_LIST } from './seed'

/** Seed demo runs (R1–R6) map to 00001–00006 in picker list order. */
const SEED_RUN_ID_ORDER = RUN_PICKER_LIST.map((r) => r.id)

export function findRunByKey(state: DemoState, projectId: string, runKey: string): DemoRun | undefined {
  return state.runs.find((r) => r.projectId === projectId && r.runKey === runKey)
}

export function findRunById(state: DemoState, runId: string): DemoRun | undefined {
  return state.runs.find((r) => r.id === runId)
}

/** Walk `rerunOf` pointers to the chain origin run id. */
export function runChainRootId(runs: DemoRun[], run: DemoRun): string {
  const byId = new Map(runs.map((r) => [r.id, r]))
  let cur = run
  let guard = 0
  while (cur.rerunOf && byId.has(cur.rerunOf) && guard < 50) {
    cur = byId.get(cur.rerunOf)!
    guard += 1
  }
  return cur.id
}

/** All members of a re-run chain (origin first, then re-runs by creation date). */
export function runChainMembers(runs: DemoRun[], rootId: string): DemoRun[] {
  const members = runs.filter((r) => {
    if (r.id === rootId) return true
    return r.rerunOf != null && runChainRootId(runs, r) === rootId
  })
  return members.sort((a, b) => {
    if (a.id === rootId) return -1
    if (b.id === rootId) return 1
    return a.createdAt.localeCompare(b.createdAt)
  })
}
export function assignRunKeysForProject(runs: DemoRun[], projectId: string): { runs: DemoRun[]; nextNum: number } {
  const projectRuns = runs.filter((r) => r.projectId === projectId)
  const otherRuns = runs.filter((r) => r.projectId !== projectId)

  const seedOrder = new Map(SEED_RUN_ID_ORDER.map((id, i) => [id, i + 1]))
  const withSeedKeys = projectRuns.filter((r) => seedOrder.has(r.id))
  const withoutSeedKeys = projectRuns.filter((r) => !seedOrder.has(r.id))

  withSeedKeys.sort((a, b) => (seedOrder.get(a.id) ?? 0) - (seedOrder.get(b.id) ?? 0))
  withoutSeedKeys.sort((a, b) => {
    const t = a.createdAt.localeCompare(b.createdAt)
    return t !== 0 ? t : a.id.localeCompare(b.id)
  })

  let counter = 1
  const keyById = new Map<string, string>()

  for (const run of [...withSeedKeys, ...withoutSeedKeys]) {
    keyById.set(run.id, formatRunKey(counter))
    counter += 1
  }

  const updatedProjectRuns = projectRuns.map((r) =>
    keyById.has(r.id) ? { ...r, runKey: keyById.get(r.id)! } : r,
  )

  return {
    runs: [...otherRuns, ...updatedProjectRuns],
    nextNum: counter,
  }
}

/** Migrate all projects to have runKey on every run and nextRunNumByProject counters. */
export function migrateRunKeys(state: DemoState): DemoState {
  const projectIds = [...new Set(state.runs.map((r) => r.projectId))]
  let runs = state.runs
  const nextRunNumByProject: Record<string, number> = { ...state.nextRunNumByProject }

  for (const projectId of projectIds) {
    const needsKeys = runs.some((r) => r.projectId === projectId && !r.runKey)
    if (needsKeys) {
      const result = assignRunKeysForProject(runs, projectId)
      runs = result.runs
      nextRunNumByProject[projectId] = result.nextNum
    } else if (nextRunNumByProject[projectId] == null) {
      const max = runs
        .filter((r) => r.projectId === projectId && r.runKey)
        .reduce((m, r) => Math.max(m, parseInt(r.runKey, 10) || 0), 0)
      nextRunNumByProject[projectId] = max + 1
    }
  }

  for (const projectId of Object.keys(state.projectsById)) {
    if (nextRunNumByProject[projectId] == null) {
      nextRunNumByProject[projectId] = 1
    }
  }

  return { ...state, runs, nextRunNumByProject }
}
