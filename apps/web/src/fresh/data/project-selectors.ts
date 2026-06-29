import type { Case, DemoRun, DemoState, Folder, Project, TestPlan } from './demo-model'

export function listProjects(state: DemoState): Project[] {
  return Object.values(state.projectsById).sort((a, b) => a.name.localeCompare(b.name))
}

export function getActiveProject(state: DemoState): Project | undefined {
  return state.projectsById[state.activeProjectId]
}

export function getProjectByKey(state: DemoState, key: string): Project | undefined {
  const normalized = key.toUpperCase()
  return Object.values(state.projectsById).find((p) => p.key === normalized)
}

export function isProjectKeyUnique(state: DemoState, key: string, excludeProjectId?: string): boolean {
  const normalized = key.toUpperCase()
  return !Object.values(state.projectsById).some(
    (p) => p.key === normalized && p.id !== excludeProjectId,
  )
}

export function listActiveProjectFolders(state: DemoState): Folder[] {
  return state.folders.filter((f) => f.projectId === state.activeProjectId)
}

export function listActiveProjectTestCases(state: DemoState): Case[] {
  return state.cases.filter((c) => c.projectId === state.activeProjectId)
}

export function listActiveProjectRuns(state: DemoState): DemoRun[] {
  return state.runs.filter(
    (r) => r.projectId === state.activeProjectId && !r.archivedAt,
  )
}

export function listActiveProjectPlans(state: DemoState): TestPlan[] {
  return Object.values(state.plansById).filter(
    (p) => p.projectId === state.activeProjectId,
  ).sort((a, b) => a.planKey.localeCompare(b.planKey))
}

export function getActiveProjectNextRunNum(state: DemoState): number {
  return state.nextRunNumByProject[state.activeProjectId] ?? 1
}

export function listProjectFolders(state: DemoState, projectId: string): Folder[] {
  return state.folders.filter((f) => f.projectId === projectId)
}

export function listProjectTestCases(state: DemoState, projectId: string): Case[] {
  return state.cases.filter((c) => c.projectId === projectId)
}

export function listProjectRuns(state: DemoState, projectId: string): DemoRun[] {
  return state.runs.filter((r) => r.projectId === projectId)
}

export function getActiveProjectCurrentRunId(state: DemoState): string {
  return state.currentRunIdByProject[state.activeProjectId] ?? ''
}

export function getActiveProjectNextCaseNum(state: DemoState): number {
  return state.nextCaseNumByProject[state.activeProjectId] ?? 1
}
